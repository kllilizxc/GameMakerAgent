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
import { Perf } from "@game-agent/perf"

interface WsContext {
  id: string
  data: Record<string, unknown>
  send: (data: unknown) => void
  raw: { send: (data: string) => void }
}

async function handleMessage(ws: WsContext, message: string): Promise<void> {
  const msgTimer = Perf.time("ws", "message-handle")
  console.log("[ws] raw message type:", typeof message, "value:", message)

  let parsed: unknown
  try {
    parsed = JSON.parse(message)
    console.log("[ws] parsed:", parsed)
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
    case "run/start": {
      // Session should already exist from connection
      const wsSessionId = ws.data.sessionId as string
      const msgSessionId = msg.sessionId
      console.log("[ws] run/start - ws.data.sessionId:", wsSessionId, "msg.sessionId:", msgSessionId)

      const session = getSession(msgSessionId || wsSessionId)
      console.log("[ws] getSession result:", session ? `found (${session.id})` : "not found")

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

      ws.send({
        type: "run/started",
        sessionId: session.id,
        runId,
        engineId: session.engineId,
      })

      executeRun(session, runId, msg.prompt)
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
    console.log(`[ws] client connected`)

    // Create session and send initial snapshot immediately
    const session = await createSession("phaser-2d")
    ws.data.sessionId = session.id
    addSocket(session, ws.raw)

    const files = await getSnapshot(session)
    ws.send({
      type: "fs/snapshot",
      sessionId: session.id,
      seq: nextSeq(session),
      files,
    })
    console.log(`[ws] sent initial snapshot with ${Object.keys(files).length} files`)
  },

  message(ws: WsContext, message: unknown) {
    console.log(`[ws] message type:`, typeof message, message)

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
    console.log(`[ws] client disconnected`)
    handleClose(ws)
  },
}
