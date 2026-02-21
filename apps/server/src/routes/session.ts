import { Elysia, t } from "elysia"
import { destroySession, createSession, getSnapshot, nextSeq, transformMessages, getSession } from "../session/manager"
import { Todo, Session, SessionRevert, Instance } from "@game-agent/agent"
import { MSG_PAGE_SIZE_INITIAL } from "@game-agent/common"

export const sessionRoutes = new Elysia()
    .delete("/sessions/:id", async ({ params: { id } }) => {
        await destroySession(id)
        return { success: true }
    })
    .post("/api/session/create", async ({ body }) => {
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
            const hasMore = ocMessages.length === MSG_PAGE_SIZE_INITIAL

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
                    hasMore
                }
            }
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
                hasMore: false
            }
        }
    }, {
        body: t.Object({
            engineId: t.String(),
            templateId: t.Optional(t.String()),
            sessionId: t.Optional(t.String())
        })
    })
    .post("/api/messages/list", async ({ body, set }) => {
        const session = await getSession(body.sessionId)
        if (!session) {
            set.status = 404
            return { error: "Session not found" }
        }

        let result: any[] = []
        let hasMore = false
        if (session.opencodeSessionId) {
            const ocMessages = await Session.messages({
                sessionID: session.opencodeSessionId,
                limit: body.limit,
                offset: body.skip,
            })
            result = transformMessages(ocMessages)
            hasMore = ocMessages.length === body.limit
        }

        return {
            type: "messages/list",
            sessionId: session.id,
            messages: result,
            hasMore,
        }
    }, {
        body: t.Object({
            sessionId: t.String(),
            limit: t.Number(),
            skip: t.Number()
        })
    })
    .post("/api/session/rewind", async ({ body, set }) => {
        const session = await getSession(body.sessionId)
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
