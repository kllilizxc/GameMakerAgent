import { Elysia, t } from "elysia"
import { getSession, startRun, addClient, removeClient, broadcast, loadSession } from "../session/manager"
import { executeRun, cancelRun } from "../agent/runner"

export const runRoutes = new Elysia({ prefix: "/api/run" })
    .post("/start", async ({ body, set }) => {
        const session = await getSession(body.sessionId)
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
    .post("/cancel", async ({ body, set }) => {
        const session = await getSession(body.sessionId)
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
