import { ClientMessage } from "./messages"
import {
  createSession,
  getSession,
  addSocket,
  removeSocket,
  startRun,
  ackSeq,
  getSnapshot,
  nextSeq,
  broadcast,
} from "../session/manager"
import { executeRun, cancelRun } from "../agent/runner"
import { transformMessages } from "../session/transform"
import { Perf } from "@game-agent/perf"
import { MSG_PAGE_SIZE_INITIAL } from "@game-agent/common"

import { Todo, Session, SessionRevert, Instance } from "@game-agent/agent"

interface WsContext {

  id: string
  data: Record<string, unknown>
  send: (data: unknown) => void
  raw: { send: (data: string) => void }
}


async function handleMessage(ws: WsContext, message: string): Promise<void> {
  const msgTimer = Perf.time("ws", "message-handle")


  let parsed: unknown
  try {
    parsed = JSON.parse(message)

  } catch (e) {
    console.error("[ws] JSON parse error:", e, "message was:", message)
    ws.send({ type: "error", message: "Invalid JSON" })
    msgTimer.stop({ error: "parse-error" })
    return
  }

  const result = ClientMessage.safeParse(parsed)
  if (!result.success) {
    ws.send({
      type: "error",
      message: "Invalid message format",
      errors: result.error.errors,
    })
    msgTimer.stop({ error: "validation-error" })
    return
  }

  const msg = result.data
  msgTimer.stop({ messageType: msg.type })

  switch (msg.type) {

    case "session/create": {
      const session = await createSession(msg.engineId, msg.templateId, msg.sessionId)
      ws.data.sessionId = session.id
      addSocket(session, ws.raw)

      // Fetch persisted todos if they exist
      let todos: any[] = []
      if (session.opencodeSessionId) {
        try {
          todos = await Todo.get(session.opencodeSessionId)
        } catch (e) {
          console.error(`[ws] Failed to load todos for ${session.opencodeSessionId}:`, e)
        }
      }

      ws.send({
        type: "session/created",
        sessionId: session.id,
        engineId: msg.engineId,
        templateId: msg.templateId,
        todos,
      })

      const files = await getSnapshot(session)

      // Send filesystem snapshot
      ws.send({
        type: "fs/snapshot",
        sessionId: session.id,
        seq: nextSeq(session),
        files,
      })

      // Send initial messages from OpenCode session
      let messages: ReturnType<typeof transformMessages> = []
      if (session.opencodeSessionId) {
        const ocMessages = await Session.messages({
          sessionID: session.opencodeSessionId,
          limit: MSG_PAGE_SIZE_INITIAL
        })
        messages = transformMessages(ocMessages)
      }
      ws.send({
        type: "messages/list",
        sessionId: session.id,
        messages,
        hasMore: messages.length === MSG_PAGE_SIZE_INITIAL,
      })


      break
    }


    case "run/start": {
      // Session should already exist from connection
      const wsSessionId = ws.data.sessionId as string
      const msgSessionId = msg.sessionId


      const session = getSession(msgSessionId || wsSessionId)


      if (!session) {
        ws.send({
          type: "run/error",
          message: "No session found. Please reconnect.",
        })
        return
      }

      if (session.currentRunId) {
        ws.send({
          type: "run/error",
          sessionId: session.id,
          message: "A run is already in progress",
        })
        return
      }

      const runId = startRun(session)

      // Note: User message is stored by OpenCode agent when run executes

      ws.send({
        type: "run/started",
        sessionId: session.id,
        runId,
        engineId: session.engineId,
      })

      executeRun(session, runId, msg.prompt, msg.attachments)
      break
    }

    case "run/cancel": {
      const session = getSession(msg.sessionId)
      if (!session) {
        ws.send({
          type: "run/error",
          sessionId: msg.sessionId,
          message: "Session not found",
        })
        return
      }

      if (cancelRun(msg.runId)) {
        broadcast(session, {
          type: "run/finished",
          sessionId: session.id,
          runId: msg.runId,
          finishReason: "cancelled",
        })
      }
      break
    }

    case "fs/ack": {
      const session = getSession(msg.sessionId)
      if (session) {
        ackSeq(session, msg.seq)
      }
      break
    }

    case "fs/snapshot-request": {
      const session = getSession(msg.sessionId)
      if (!session) {
        ws.send({
          type: "run/error",
          sessionId: msg.sessionId,
          message: "Session not found",
        })
        return
      }

      const files = await getSnapshot(session)
      ws.send({
        type: "fs/snapshot",
        sessionId: session.id,
        seq: nextSeq(session),
        files,
      })
      break
    }
    case "messages/list": {
      const session = getSession(msg.sessionId)
      if (!session) return

      // Load messages from OpenCode session
      let result: ReturnType<typeof transformMessages> = []
      if (session.opencodeSessionId) {
        const ocMessages = await Session.messages({
          sessionID: session.opencodeSessionId,
          limit: msg.limit,
          offset: msg.skip,
        })
        result = transformMessages(ocMessages)
      }

      ws.send({
        type: "messages/list",
        sessionId: session.id,
        messages: result,
        hasMore: result.length === msg.limit,
      })
      break
    }

    case "session/rewind": {
      const session = getSession(msg.sessionId)
      if (!session?.opencodeSessionId) {
        ws.send({
          type: "run/error",
          sessionId: msg.sessionId,
          message: "Session not found or not initialized",
        })
        return
      }

      let targetMessageID = msg.messageId

      // Wrap ALL operations in a single Instance.provide() to ensure consistent context
      const { messages, files } = await Instance.provide({
        directory: session.workspaceDir,
        fn: async () => {
          // Edit mode: find parent message to revert to
          if (msg.edit) {
            const ocMsgsForEdit = await Session.messages({ sessionID: session.opencodeSessionId! })
            const targetMsg = ocMsgsForEdit.find((m: { info: { id: string } }) => m.info.id === targetMessageID)

            if (targetMsg?.info.role === "assistant" && (targetMsg.info as any).parentID) {
              targetMessageID = (targetMsg.info as any).parentID
            }
          }

          const revertedSession = await SessionRevert.revert({
            sessionID: session.opencodeSessionId!,
            messageID: targetMessageID
          })

          // Call cleanup() to actually delete messages after the revert point
          if (revertedSession?.revert) {
            await SessionRevert.cleanup(revertedSession)

            // Add a small delay to ensure storage consistency
            await new Promise(resolve => setTimeout(resolve, 100))
          }

          // Reload messages after revert
          const ocMessages = await Session.messages({ sessionID: session.opencodeSessionId! })

          const messages = transformMessages(ocMessages)

          // Get snapshot within the same context

          const files = await getSnapshot(session)
          return { messages, files }
        }
      })

      ws.send({
        type: "messages/list",
        sessionId: session.id,
        messages,
        hasMore: false,
        replace: true,  // Signal client to replace messages instead of merge
      })


      ws.send({
        type: "fs/snapshot",
        sessionId: session.id,
        seq: nextSeq(session),
        files,
      })
      break
    }


  }
}

function handleClose(ws: WsContext): void {
  const sessionId = ws.data?.sessionId as string | undefined
  if (!sessionId) return

  const session = getSession(sessionId)
  if (session) {
    removeSocket(session, ws.raw)
  }
}

export const wsHandler = {
  async open(ws: WsContext) {
    ws.data = { sessionId: "" }

  },

  message(ws: WsContext, message: unknown) {


    // Elysia may pass string, Buffer, or already-parsed object
    let text: string
    if (typeof message === "string") {
      text = message
    } else if (typeof message === "object" && message !== null) {
      // Already parsed by Elysia
      text = JSON.stringify(message)
    } else {
      text = String(message)
    }

    handleMessage(ws, text)
  },

  close(ws: WsContext) {

    handleClose(ws)
  },
}
