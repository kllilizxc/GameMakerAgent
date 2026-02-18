import { initConfig } from "./config"

// Initialize programmatic configuration
initConfig()

import { Elysia, t } from "elysia"

import { cors } from "@elysiajs/cors"
import { ensureWorkspacesDir } from "./session/workspace"
import { listEngines, getEngine } from "./engine/registry"
import { initSessionManager, transformMessages } from "./session/manager"
import { Perf } from "@game-agent/perf"
import { staticPlugin } from "@elysiajs/static"

const PORT = Number(process.env.PORT) || 3001
const HOST = process.env.HOST || "0.0.0.0"

await ensureWorkspacesDir()
initSessionManager()

const app = new Elysia()
  .use(cors())
  .use(staticPlugin({
    assets: "workspaces",
    prefix: "/workspaces",
  }))
  .get("/", () => "Game Agent Server")
  .get("/health", () => ({ status: "ok", engines: listEngines() }))
  .get("/engines", () => ({ engines: listEngines() }))
  .get("/templates", () => {
    const engine = getEngine("phaser-2d")
    return { templates: engine.getTemplates ? engine.getTemplates() : [] }
  })
  .get("/perf", () => Perf.getSummary())
  .post("/perf/reset", () => { Perf.reset(); return { ok: true } })
  .delete("/sessions/:id", async ({ params: { id } }) => {
    const manager = await import("./session/manager")
    await manager.destroySession(id)
    return { success: true }
  })
  // .ws("/ws", wsHandler) // Legacy WebSocket handler removed
  .post("/api/config/provider", async ({ body }) => {
    const { getConfig, saveConfig } = await import("./config")
    const config = getConfig()
    if (!config.provider) config.provider = {}

    // Merge or overwrite provider config
    config.provider[body.providerId] = body.config
    saveConfig(config)
    return { success: true }
  }, {
    body: t.Object({
      providerId: t.String(),
      config: t.Any()
    })
  })
  .get("/api/config/models", async () => {
    const { getModels, getActiveModel } = await import("./config")
    return {
      models: getModels(),
      activeModel: getActiveModel()
    }
  })
  .post("/api/config/model", async ({ body }) => {
    const { setActiveModel } = await import("./config")
    setActiveModel(body.modelId)
    return { success: true }
  }, {
    body: t.Object({
      modelId: t.Optional(t.String())
    })
  })
  .post("/api/generate-image", async ({ body }) => {
    const { generateImage } = await import("@game-agent/common")

    const content = await generateImage({
      type: body.type as any || "chat",
      prompt: body.prompt,
      model: body.model,
      size: body.size
    })

    return { content }
  }, {
    body: t.Object({
      prompt: t.String(),
      size: t.Optional(t.String()),
      model: t.Optional(t.String()),
      type: t.Optional(t.String())
    })
  })
  .post("/api/save-image", async ({ body }: { body: { imageUrl: string, type: string, sessionId: string } }) => {
    const { join, dirname } = await import("node:path")
    const { existsSync, mkdirSync, writeFileSync } = await import("node:fs")
    const { loadSession, broadcast, nextSeq } = await import("./session/manager")
    const { workspacePath } = await import("./session/workspace")

    // Validate session
    const session = await loadSession(body.sessionId)
    if (!session) {
      throw new Error(`Session not found: ${body.sessionId}`)
    }

    const rootDir = workspacePath(body.sessionId)
    // Assets under "assets/{type}" relative to workspace root
    const relativeDir = join("assets", body.type || "misc")
    const targetDir = join(rootDir, relativeDir)

    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true })
    }

    const fileName = `asset-${Date.now()}.png`
    const filePath = join(targetDir, fileName)
    const relativePath = join(relativeDir, fileName)

    // Fetch image
    const imageResponse = await fetch(body.imageUrl)
    const arrayBuffer = await imageResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    writeFileSync(filePath, buffer)

    // Broadcast change to client
    const base64Content = buffer.toString("base64")

    broadcast(session, {
      type: "fs/patch",
      sessionId: session.id,
      runId: session.currentRunId || "", // runId might be needed by protocol? checking protocol... yes, RunStarted/AgentEvent needs it. FsPatch needs it?
      // checking FsPatchMessage definition: type: "fs/patch", sessionId: string, runId: string, seq: number, ops: FsPatchOp[]
      // Let's use session.currentRunId or empty string if not running.
      seq: nextSeq(session),
      ops: [{
        op: "write",
        path: relativePath,
        content: base64Content,
        encoding: "base64"
      }]
    })

    return { success: true, path: `/${relativePath}` }
  }, {
    body: t.Object({
      imageUrl: t.String(),
      type: t.String(),
      sessionId: t.String()
    })
  })
  .post("/api/fs/save", async ({ body }: { body: { sessionId: string, changes: Array<{ path: string, content: string }> } }) => {
    const { join, dirname } = await import("node:path")
    const { existsSync, mkdirSync, writeFileSync } = await import("node:fs")
    const { loadSession } = await import("./session/manager")
    const { workspacePath } = await import("./session/workspace")

    const session = await loadSession(body.sessionId)
    if (!session) {
      throw new Error(`Session not found: ${body.sessionId}`)
    }

    const rootDir = workspacePath(body.sessionId)

    for (const change of body.changes) {
      const filePath = join(rootDir, change.path)
      const dir = dirname(filePath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(filePath, change.content)
    }

    return { success: true }
  }, {
    body: t.Object({
      sessionId: t.String(),
      changes: t.Array(t.Object({
        path: t.String(),
        content: t.String()
      }))
    })
  })
  .post("/api/session/create", async ({ body }) => {
    const { createSession, getSnapshot, nextSeq, transformMessages } = await import("./session/manager")
    const { Todo, Session } = await import("@game-agent/agent")
    const { MSG_PAGE_SIZE_INITIAL } = await import("@game-agent/common")

    const session = await createSession(body.engineId as any, body.templateId, body.sessionId)

    // Fetch persisted todos if they exist
    let todos: any[] = []
    if (session.opencodeSessionId) {
      try {
        todos = await Todo.get(session.opencodeSessionId)
      } catch (e) {
        console.error(`[api] Failed to load todos for ${session.opencodeSessionId}:`, e)
      }
    }

    const files = await getSnapshot(session)

    // Send initial messages from OpenCode session
    let messages: any[] = []
    if (session.opencodeSessionId) {
      const ocMessages = await Session.messages({
        sessionID: session.opencodeSessionId,
        limit: MSG_PAGE_SIZE_INITIAL
      })
      messages = transformMessages(ocMessages)
    }

    return {
      type: "session/created",
      sessionId: session.id,
      engineId: session.engineId,
      templateId: session.templateId,
      todos,
      snapshot: {
        files,
        seq: nextSeq(session)
      },
      messages: {
        list: messages,
        hasMore: messages.length === MSG_PAGE_SIZE_INITIAL
      }
    }
  }, {
    body: t.Object({
      engineId: t.String(),
      templateId: t.Optional(t.String()),
      sessionId: t.Optional(t.String())
    })
  })
  .post("/api/run/start", async ({ body, set }) => {
    const { getSession, startRun, addClient, removeClient } = await import("./session/manager")
    const { executeRun } = await import("./agent/runner")

    const session = getSession(body.sessionId)
    if (!session) {
      set.status = 404
      return { error: "Session not found" }
    }

    if (session.currentRunId) {
      set.status = 400
      return { error: "A run is already in progress" }
    }

    const runId = startRun(session)

    let client: any
    let keepAlive: any

    return new Response(new ReadableStream({
      start(controller: ReadableStreamDefaultController) {
        const encoder = new TextEncoder()

        // SSE synchronization events
        controller.enqueue(encoder.encode("retry: 3000\n"))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "run/started", sessionId: session.id, runId })}\n\n`))

        let isClosed = false
        client = {
          send: (data: string) => {
            if (isClosed) return
            try {
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            } catch (e) {
              console.error(`[sse] Error sending to ${session.id}:`, e)
              client.close()
            }
          },
          close: () => {
            if (isClosed) return
            isClosed = true
            if (keepAlive) clearInterval(keepAlive)
            try {
              controller.close()
            } catch (e) {
              // Ignore if already closed
            }
            if (session && client) {
              removeClient(session, client)
            }
          }
        }

        addClient(session, client)

        // Keep-alive to prevent timeout
        keepAlive = setInterval(() => {
          if (isClosed) {
            clearInterval(keepAlive)
            return
          }
          try {
            controller.enqueue(encoder.encode(": keep-alive\n\n"))
          } catch (e) {
            client.close()
          }
        }, 15000)

        // Start agent run
        executeRun(session, runId, body.prompt, body.attachments, body.model)
          .catch(err => {
            if (isClosed) return
            console.error(`[run] Execution failed for ${runId}:`, err)
            client.send(JSON.stringify({ type: "run/error", message: err.message }))
            client.close()
          })
      },
      cancel() {
        if (client) {
          client.close()
        }
      }
    }), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
      }
    })
  }, {
    body: t.Object({
      sessionId: t.String(),
      prompt: t.String(),
      attachments: t.Optional(t.Array(t.String())),
      model: t.Optional(t.Any())
    })
  })
  .post("/api/run/cancel", async ({ body, set }) => {
    const { getSession, broadcast } = await import("./session/manager")
    const { cancelRun } = await import("./agent/runner")

    const session = getSession(body.sessionId)
    if (!session) {
      set.status = 404
      return { error: "Session not found" }
    }

    if (cancelRun(body.runId, session)) {
      broadcast(session, {
        type: "run/finished",
        sessionId: session.id,
        runId: body.runId,
        finishReason: "cancelled",
      } as any)

      // Close all SSE streams for this session on cancellation
      for (const client of session.clients) {
        client.close()
      }

      return { success: true }
    }

    return { success: false, error: "Run not found or already finished" }
  }, {
    body: t.Object({
      sessionId: t.String(),
      runId: t.String()
    })
  })
  .post("/api/fs/ack", async ({ body }) => {
    const { getSession, ackSeq } = await import("./session/manager")
    const session = getSession(body.sessionId)
    if (session) {
      ackSeq(session, body.seq)
    }
    return { success: true }
  }, {
    body: t.Object({
      sessionId: t.String(),
      seq: t.Number()
    })
  })
  .post("/api/messages/list", async ({ body, set }) => {
    const { getSession, transformMessages } = await import("./session/manager")
    const { Session } = await import("@game-agent/agent")

    const session = getSession(body.sessionId)
    if (!session) {
      set.status = 404
      return { error: "Session not found" }
    }

    let result: any[] = []
    if (session.opencodeSessionId) {
      const ocMessages = await Session.messages({
        sessionID: session.opencodeSessionId,
        limit: body.limit,
        offset: body.skip,
      })
      result = transformMessages(ocMessages)
    }

    return {
      type: "messages/list",
      sessionId: session.id,
      messages: result,
      hasMore: result.length === body.limit,
    }
  }, {
    body: t.Object({
      sessionId: t.String(),
      limit: t.Number(),
      skip: t.Number()
    })
  })
  .post("/api/session/rewind", async ({ body, set }) => {
    const { getSession, getSnapshot, nextSeq, transformMessages } = await import("./session/manager")
    const { Session, SessionRevert, Instance } = await import("@game-agent/agent")

    const session = getSession(body.sessionId)
    if (!session?.opencodeSessionId) {
      set.status = 404
      return { error: "Session not found or not initialized" }
    }

    let targetMessageID = body.messageId

    const { messages, files } = await Instance.provide({
      directory: session.workspaceDir,
      fn: async () => {
        if (body.edit) {
          const ocMsgsForEdit = await Session.messages({ sessionID: session.opencodeSessionId! })
          const targetMsg = ocMsgsForEdit.find((m: any) => m.info.id === targetMessageID)

          if (targetMsg?.info.role === "assistant" && (targetMsg.info as any).parentID) {
            targetMessageID = (targetMsg.info as any).parentID
          }
        }

        const revertedSession = await SessionRevert.revert({
          sessionID: session.opencodeSessionId!,
          messageID: targetMessageID
        })

        if (revertedSession?.revert) {
          await SessionRevert.cleanup(revertedSession)
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        const ocMessages = await Session.messages({ sessionID: session.opencodeSessionId! })
        const messages = transformMessages(ocMessages)
        const files = await getSnapshot(session)
        return { messages, files }
      }
    })

    return {
      messages: {
        list: messages,
        hasMore: false,
        replace: true,
      },
      snapshot: {
        files,
        seq: nextSeq(session),
      }
    }
  }, {
    body: t.Object({
      sessionId: t.String(),
      messageId: t.String(),
      edit: t.Optional(t.Boolean())
    })
  })
  .listen({ port: PORT, hostname: HOST })

console.log(`🎮 Game Agent Server v2.0`)
console.log(`   Available engines: ${listEngines().join(", ")}`)
console.log(`   HTTP: http://${HOST}:${PORT}`)
console.log(`   SSE: http://${HOST}:${PORT}/api/events/:sessionId`)
console.log(`   Ready!`)
