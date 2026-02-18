import { Elysia, t } from "elysia"
import { join, dirname } from "node:path"
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { loadSession, getSession, ackSeq } from "../session/manager"
import { workspacePath } from "../session/workspace"

export const fsRoutes = new Elysia({ prefix: "/api/fs" })
    .post("/save", async ({ body }) => {
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
    .post("/ack", async ({ body }) => {
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
