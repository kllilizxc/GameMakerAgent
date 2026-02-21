import { Elysia, t } from "elysia"
import { generateImage } from "@game-agent/common"
import { join } from "node:path"
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { loadSession, broadcast, nextSeq } from "../session/manager"
import { workspacePath } from "../session/workspace"

export const imageRoutes = new Elysia({ prefix: "/api" })
    .post("/generate-image", async ({ body }) => {
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
    .post("/save-image", async ({ body }) => {
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
            runId: session.currentRunId || "",
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
