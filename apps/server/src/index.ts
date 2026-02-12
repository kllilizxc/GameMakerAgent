import { initConfig } from "./config"

// Initialize programmatic configuration
initConfig()

import { Elysia, t } from "elysia"

import { cors } from "@elysiajs/cors"
import { ensureWorkspacesDir } from "./session/workspace"
import { listEngines, getEngine } from "./engine/registry"
import { wsHandler } from "./protocol/handler"
import { initSessionManager } from "./session/manager"
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
  .ws("/ws", wsHandler)
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
    const { OpenAI } = await import("openai")
    const client = new OpenAI({
      baseURL: process.env.NANOBANANA_BASE_URL || "http://127.0.0.1:8045/v1",
      apiKey: process.env.NANOBANANA_API_KEY || "sk-0c30858760cf47fe9d6e438da54d3808"
    })

    const response = await client.chat.completions.create({
      model: body.model || "gemini-3-pro-image",
      messages: [{
        "role": "user",
        "content": body.prompt
      }]
    } as any)

    return { content: response.choices[0].message.content }
  }, {
    body: t.Object({
      prompt: t.String(),
      size: t.Optional(t.String()),
      model: t.Optional(t.String())
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
  .listen({ port: PORT, hostname: HOST })

console.log(`🎮 Game Agent Server v2.0`)
console.log(`   Available engines: ${listEngines().join(", ")}`)
console.log(`   HTTP: http://${HOST}:${PORT}`)
console.log(`   WebSocket: ws://${HOST}:${PORT}/ws`)
console.log(`   Ready!`)
