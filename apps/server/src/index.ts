import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"
import { ensureWorkspacesDir } from "./session/workspace"
import { listEngines, getEngine } from "./engine/registry"
import { wsHandler } from "./protocol/handler"
import { Perf } from "@game-agent/perf"

const PORT = Number(process.env.PORT) || 3001
const HOST = process.env.HOST || "0.0.0.0"

await ensureWorkspacesDir()

const app = new Elysia()
  .use(cors())
  .get("/", () => "Game Agent Server")
  .get("/health", () => ({ status: "ok", engines: listEngines() }))
  .get("/engines", () => ({ engines: listEngines() }))
  .get("/templates", () => {
    const engine = getEngine("phaser-2d")
    return { templates: engine.getTemplates ? engine.getTemplates() : [] }
  })
  .get("/perf", () => Perf.getSummary())
  .post("/perf/reset", () => { Perf.reset(); return { ok: true } })
  .ws("/ws", wsHandler)
  .listen({ port: PORT, hostname: HOST })

console.log(`🎮 Game Agent Server v2.0`)
console.log(`   Available engines: ${listEngines().join(", ")}`)
console.log(`   HTTP: http://${HOST}:${PORT}`)
console.log(`   WebSocket: ws://${HOST}:${PORT}/ws`)
console.log(`   Ready!`)
