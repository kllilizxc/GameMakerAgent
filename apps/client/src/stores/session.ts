import { create } from "zustand"

interface Message {
  id: string
  role: "user" | "agent"
  content: string
}

interface SessionState {
  sessionId: string | null
  engineId: string
  status: "idle" | "connecting" | "running" | "error"
  messages: Message[]
  error: string | null
  ws: WebSocket | null

  connect: (serverUrl: string, engineId?: string) => void
  disconnect: () => void
  sendPrompt: (prompt: string) => void
  addMessage: (message: Message) => void
  setStatus: (status: SessionState["status"]) => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessionId: null,
  engineId: "phaser-2d",
  status: "idle",
  messages: [],
  error: null,
  ws: null,

  connect: (serverUrl: string, engineId = "phaser-2d") => {
    const { ws } = get()
    if (ws) ws.close()

    set({ status: "connecting", engineId, error: null })

    const socket = new WebSocket(`${serverUrl}/ws`)

    socket.onopen = () => {
      set({ ws: socket })
    }

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        handleServerMessage(msg, set, get)
      } catch (e) {
        console.error("Failed to parse message:", e)
      }
    }

    socket.onerror = () => {
      set({ status: "error", error: "Connection failed" })
    }

    socket.onclose = () => {
      set({ ws: null, status: "idle" })
    }
  },

  disconnect: () => {
    const { ws } = get()
    if (ws) {
      ws.close()
      set({ ws: null, sessionId: null, status: "idle" })
    }
  },

  sendPrompt: (prompt: string) => {
    const { ws, sessionId, engineId, status } = get()
    if (!ws || status === "running") return

    // Add user message
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
    }
    set((s) => ({ messages: [...s.messages, userMsg] }))

    // Send to server
    ws.send(
      JSON.stringify({
        type: "run/start",
        sessionId,
        engineId,
        prompt,
      })
    )
  },

  addMessage: (message: Message) => {
    set((s) => ({ messages: [...s.messages, message] }))
  },

  setStatus: (status) => set({ status }),
}))

function handleServerMessage(
  msg: Record<string, unknown>,
  set: (fn: Partial<SessionState> | ((s: SessionState) => Partial<SessionState>)) => void,
  get: () => SessionState
) {
  switch (msg.type) {
    case "run/started":
      set({
        sessionId: msg.sessionId as string,
        status: "running",
      })
      break

    case "agent/event":
      if (msg.eventType === "text" && msg.text) {
        const agentMsg: Message = {
          id: crypto.randomUUID(),
          role: "agent",
          content: msg.text as string,
        }
        set((s) => ({ messages: [...s.messages, agentMsg] }))
      }
      break

    case "run/finished":
      set({ status: "idle" })
      break

    case "run/error":
      set({
        status: "error",
        error: (msg.message as string) || "Unknown error",
      })
      break
  }
}
