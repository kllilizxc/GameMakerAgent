import { watch } from "chokidar"
import { readFile } from "node:fs/promises"
import { relative } from "node:path"
import type { Session } from "../session/manager"
import { broadcast, nextSeq, getWorkspacePath, finishRun } from "../session/manager"
import { getEngine } from "../engine/registry"
import type { FsPatchOp, AgentEventMessage, FsPatchMessage } from "../protocol/messages"

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
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\nUser request: ${prompt}` : prompt

    await run(workspaceDir, { prompt: fullPrompt }, (event) => {
      if (ctx.aborted) return

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

    flushPatches()

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
