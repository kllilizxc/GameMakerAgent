import { randomUUID } from "node:crypto"
import { watch } from "chokidar"
import { readFile } from "node:fs/promises"
import { relative } from "node:path"
import type { Session } from "../session/manager"
import { broadcast, nextSeq, getWorkspacePath, finishRun } from "../session/manager"
import { getEngine } from "../engine/registry"
import type { FsPatchOp, AgentEventMessage, FsPatchMessage } from "../protocol/messages"
import { appendMessage, type ActivityItem, type PersistedMessage, loadMessages, saveMessages } from "../session/workspace"
import { Perf } from "@game-agent/perf"

interface RunContext {
  session: Session
  runId: string
  aborted: boolean
}

const activeRuns = new Map<string, RunContext>()

export async function executeRun(
  session: Session,
  runId: string,
  prompt: string
): Promise<void> {
  const ctx: RunContext = { session, runId, aborted: false }
  activeRuns.set(runId, ctx)

  const workspaceDir = getWorkspacePath(session)
  const engine = getEngine(session.engineId)

  // Collect agent response text and activities
  const collectedActivities: ActivityItem[] = []

  // Buffer for interleaved messages (text vs activities)
  const runMessages: PersistedMessage[] = []
  let currentTextMessage: PersistedMessage | null = null

  function getOrCreateTextMessage(): PersistedMessage {
    if (!currentTextMessage) {
      currentTextMessage = {
        role: "agent",
        content: "",
        timestamp: Date.now(),
        activities: []
      }
      runMessages.push(currentTextMessage)
    }
    return currentTextMessage
  }

  const watcher = watch(workspaceDir, {
    ignored: /(^|[\/\\])(\.|node_modules|\.git)/,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
  })

  const pendingOps: FsPatchOp[] = []
  let flushTimeout: ReturnType<typeof setTimeout> | null = null

  function flushPatches() {
    if (pendingOps.length === 0) return
    const ops = [...pendingOps]
    pendingOps.length = 0

    const msg: FsPatchMessage = {
      type: "fs/patch",
      sessionId: session.id,
      runId,
      seq: nextSeq(session),
      ops,
    }
    broadcast(session, msg)

    // Capture file activities for persistence
    // We only care about distinct file paths touched
    const touchedFiles = new Set<string>()
    for (const op of ops) {
      if (!touchedFiles.has(op.path)) {
        touchedFiles.add(op.path)
        collectedActivities.push({
          id: randomUUID(),
          type: "file",
          timestamp: Date.now(),
          data: { path: op.path }
        })
      }
    }
  }

  function queuePatch(op: FsPatchOp) {
    pendingOps.push(op)
    if (flushTimeout) clearTimeout(flushTimeout)
    flushTimeout = setTimeout(flushPatches, 100)
  }

  watcher.on("add", async (path: string) => {
    if (ctx.aborted) return
    const rel = relative(workspaceDir, path)
    const content = await readFile(path, "utf-8").catch(() => null)
    if (content !== null) {
      queuePatch({ op: "write", path: rel, content })
    }
  })

  watcher.on("change", async (path: string) => {
    if (ctx.aborted) return
    const rel = relative(workspaceDir, path)
    const content = await readFile(path, "utf-8").catch(() => null)
    if (content !== null) {
      queuePatch({ op: "write", path: rel, content })
    }
  })

  watcher.on("unlink", (path: string) => {
    if (ctx.aborted) return
    const rel = relative(workspaceDir, path)
    queuePatch({ op: "delete", path: rel })
  })

  watcher.on("addDir", (path: string) => {
    if (ctx.aborted) return
    const rel = relative(workspaceDir, path)
    if (rel) {
      queuePatch({ op: "mkdir", path: rel })
    }
  })

  try {
    // Dynamic import to avoid cycles if any
    const { run } = await import("@game-agent/agent")

    const systemPrompt = engine.systemPrompt?.() ?? ""

    const agentTimer = Perf.time("agent", "llm-execute")
    console.log("[runner] executeRun started for runId:", runId)
    // Pass opencode session ID if we have one from a previous run
    const { result } = await run(workspaceDir, { prompt, system: systemPrompt, sessionId: session.opencodeSessionId }, (event) => {
      if (ctx.aborted) return

      // Log ALL events to debug missing tools
      console.log(`[runner] RAW EVENT: type=${event.type}`, JSON.stringify(event.data || {}))

      // Capture opencode session ID when it's created/resumed
      if (event.type === "session" && event.sessionId) {
        session.opencodeSessionId = event.sessionId
      }

      // Capture tool activities from stream (redundancy for robust persistence)
      if (event.type === "text") {
        const msg = getOrCreateTextMessage()
        const textContent = typeof event.data === 'string' ? event.data : (event.data as any)?.text || ""
        msg.content += textContent
        msg.timestamp = Date.now() // Keep updating timestamp to latest text
      } else if (event.type === "tool" && event.data) {
        // If we have an active text message with content, end it.
        if (currentTextMessage && currentTextMessage.content.trim()) {
          currentTextMessage = null
        }

        const { tool, title, callId } = event.data as any

        // Create a dedicated message for this tool activity
        // This ensures it sits chronologically in the timeline
        const activityMsg: PersistedMessage = {
          role: "agent",
          content: "",
          timestamp: Date.now(),
          activities: [{
            id: callId || randomUUID(),
            type: "tool",
            timestamp: Date.now(),
            completed: true,
            callId,
            data: { tool, title }
          }]
        }
        runMessages.push(activityMsg)

        // Also capture in global collectedActivities for safety/metadata extraction later if needed
        const existingIdx = collectedActivities.findIndex(a => a.callId === callId)
        if (existingIdx === -1) {
          collectedActivities.push(activityMsg.activities![0])
        }
      }

      const msg: AgentEventMessage = {
        type: "agent/event",
        sessionId: session.id,
        runId,
        event: {
          type: event.type,
          sessionId: event.sessionId,
          data: event.data,
        },
      }
      broadcast(session, msg)
    })
    agentTimer.stop()

    flushPatches()

    // Extract metadata 
    const metadata: any = {}
    if (result && result.parts) {
      for (const part of result.parts) {
        if (part.metadata) Object.assign(metadata, part.metadata)
        if (part.state?.status === 'completed' && part.state.metadata) Object.assign(metadata, part.state.metadata)
      }
    }

    // Handle file activities from collectedActivities that were NOT in the stream (from watcher)
    const watcherActivities = collectedActivities.filter(a => a.type === 'file')
    if (watcherActivities.length > 0) {
      runMessages.push({
        role: "agent",
        content: "",
        timestamp: Date.now(),
        activities: watcherActivities
      })
    }

    // Ensure we have at least one message if everything was empty
    if (runMessages.length === 0) {
      runMessages.push({
        role: "agent",
        content: result?.text || "",
        timestamp: Date.now(),
      })
    }

    // Attach metadata to the last message
    if (runMessages.length > 0) {
      const last = runMessages[runMessages.length - 1]
      last.metadata = metadata
      // Also ensure the last message has the final text if we missed it?
      // But since we built it from stream, it should be complete.
    }

    // Batch save
    const existingMessages = await loadMessages(session.id)
    await saveMessages(session.id, [...existingMessages, ...runMessages])

    broadcast(session, {
      type: "run/finished",
      sessionId: session.id,
      runId,
      finishReason: "completed",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    broadcast(session, {
      type: "run/error",
      sessionId: session.id,
      runId,
      message,
    })
  } finally {
    await watcher.close()
    if (flushTimeout) clearTimeout(flushTimeout)
    activeRuns.delete(runId)
    finishRun(session)
  }
}

export function cancelRun(runId: string): boolean {
  const ctx = activeRuns.get(runId)
  if (!ctx) return false
  ctx.aborted = true
  return true
}
