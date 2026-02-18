import { initConfig } from "./config"
import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"
import { staticPlugin } from "@elysiajs/static"
import { ensureWorkspacesDir } from "./session/workspace"
import { listEngines, getEngine } from "./engine/registry"
import { initSessionManager } from "./session/manager"
import { Perf } from "@game-agent/perf"

// Modular Routes
import { configRoutes } from "./routes/config"
import { imageRoutes } from "./routes/image"
import { fsRoutes } from "./routes/fs"
import { sessionRoutes } from "./routes/session"
import { runRoutes } from "./routes/run"

// Initialize programmatic configuration
initConfig()

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

  // Use Modular Routes
  .use(configRoutes)
  .use(imageRoutes)
  .use(fsRoutes)
  .use(sessionRoutes)
  .use(runRoutes)

  .listen({ port: PORT, hostname: HOST })

console.log(`🎮 Game Agent Server v2.0`)
console.log(`   Available engines: ${listEngines().join(", ")}`)
console.log(`   HTTP: http://${HOST}:${PORT}`)
console.log(`   Ready!`)
