import { watch } from "chokidar"
import { readFile } from "node:fs/promises"
import { relative } from "node:path"
import type { Session } from "../session/manager"
import { broadcast, nextSeq, getWorkspacePath, finishRun } from "../session/manager"
import { getEngine } from "../engine/registry"
import type { FsPatchOp, AgentEventMessage, FsPatchMessage } from "../protocol/messages"
import { appendMessage, type ActivityItem } from "../session/workspace"
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

  // Collect agent response text
  let agentResponseText = ""

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
    const { run } = await import("@game-agent/agent")

    const systemPrompt = engine.systemPrompt?.() ?? ""

    const agentTimer = Perf.time("agent", "llm-execute")
    // Pass opencode session ID if we have one from a previous run
    const { result } = await run(workspaceDir, { prompt, system: systemPrompt, sessionId: session.opencodeSessionId }, (event) => {
      if (ctx.aborted) return

      // Capture opencode session ID when it's created/resumed
      if (event.type === "session" && event.sessionId) {
        session.opencodeSessionId = event.sessionId
      }

      // Collect text for persistence
      if (event.type === "text" && (event.data as { text?: string })?.text) {
        agentResponseText += (event.data as { text: string }).text
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

    // Extract metadata and activities from result
    const metadata: any = {}
    const activities: ActivityItem[] = []

    if (result && result.parts) {
      for (const part of result.parts) {
        if (part.type === "tool") {
          // Merge metadata if present
          if (part.metadata) {
            Object.assign(metadata, part.metadata)
          }
          if (part.state.status === "completed" && part.state.metadata) {
            Object.assign(metadata, part.state.metadata)
          }

          // Create activity item
          activities.push({
            id: part.id,
            type: "tool",
            timestamp: part.state.status === "completed" ? part.state.time.end : part.state.time.start,
            completed: part.state.status === "completed",
            callId: part.callID,
            data: {
              tool: part.tool,
              title: part.state.status === "running" || part.state.status === "completed" ? part.state.title : undefined,
            }
          })
        }
      }
    }

    // Persist agent response
    if (agentResponseText.trim() || Object.keys(metadata).length > 0 || activities.length > 0) {
      await appendMessage(session.id, {
        role: "agent",
        content: agentResponseText,
        timestamp: Date.now(),
        metadata,
        activities
      })
    }

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
