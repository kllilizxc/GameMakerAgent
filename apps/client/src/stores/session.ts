import { create } from "zustand"
import { useFilesStore } from "./files"
import type { Message, Activity, FsPatch } from "@/types/session"

interface SessionState {
  sessionId: string | null
  engineId: string
  status: "idle" | "connecting" | "running" | "error"
  messages: Message[]
  activities: Activity[]
  error: string | null
  ws: WebSocket | null

  connect: (serverUrl: string, engineId?: string) => void
  disconnect: () => void
  sendPrompt: (prompt: string) => void
  addMessage: (message: Message) => void
  addActivity: (activity: Omit<Activity, "id" | "timestamp">) => void
  clearActivities: () => void
  setStatus: (status: SessionState["status"]) => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessionId: null,
  engineId: "phaser-2d",
  status: "idle",
  messages: [],
  activities: [],
  error: null,
  ws: null,

  connect: (serverUrl: string, engineId = "phaser-2d") => {
    const { ws } = get()
    if (ws) ws.close()

    set({ status: "connecting", engineId, error: null })

    const socket = new WebSocket(`${serverUrl}/ws`)

    socket.onopen = () => {
      set({ ws: socket, status: "idle" })
      console.log("[ws] connected to server")
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
    
    console.log("[ws] sendPrompt called", { ws: !!ws, status, prompt })
    
    if (!ws) {
      console.error("[ws] No WebSocket connection")
      return
    }
    if (status === "running") {
      console.log("[ws] Already running, ignoring prompt")
      return
    }

    // Add user message
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
    }
    set((s) => ({ messages: [...s.messages, userMsg] }))

    // Send to server
    const message = {
      type: "run/start",
      sessionId,
      engineId,
      prompt,
    }
    console.log("[ws] Sending message:", message)
    ws.send(JSON.stringify(message))
  },

  addMessage: (message: Message) => {
    set((s) => ({ messages: [...s.messages, message] }))
  },

  addActivity: (activity) => {
    set((s) => ({
      activities: [
        ...s.activities,
        {
          ...activity,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        },
      ],
    }))
  },

  clearActivities: () => set({ activities: [] }),

  setStatus: (status) => set({ status }),
}))

function handleServerMessage(
  msg: Record<string, unknown>,
  set: (fn: Partial<SessionState> | ((s: SessionState) => Partial<SessionState>)) => void,
  _get: () => SessionState
) {
  console.log("[ws] handleServerMessage:", msg.type, msg)
  
  switch (msg.type) {
    case "run/started":
      set({
        sessionId: msg.sessionId as string,
        status: "running",
      })
      useSessionStore.getState().clearActivities()
      break

    case "agent/event": {
      const event = msg.event as { type: string; data?: { text?: string; tool?: string; title?: string } } | undefined
      if (event?.type === "text" && event.data?.text) {
        const agentMsg: Message = {
          id: crypto.randomUUID(),
          role: "agent",
          content: event.data.text,
        }
        set((s) => ({ messages: [...s.messages, agentMsg] }))
        useSessionStore.getState().addActivity({
          type: "text",
          data: { text: event.data.text },
        })
      } else if (event?.type === "tool" && event.data?.tool) {
        useSessionStore.getState().addActivity({
          type: "tool",
          data: { tool: event.data.tool, title: event.data.title },
        })
      }
      break
    }

    case "run/finished":
      set({ status: "idle" })
      break

    case "run/error":
      set({
        status: "error",
        error: (msg.message as string) || "Unknown error",
      })
      break

    case "fs/patch": {
      const ops = msg.ops as FsPatch[] | undefined
      if (ops) {
        console.log("[ws] applying fs patches:", ops.length)
        const filesStore = useFilesStore.getState()
        ops.forEach((patch) => {
          filesStore.applyPatch(patch)
          useSessionStore.getState().addActivity({
            type: "file",
            data: { path: patch.path },
          })
        })
      }
      break
    }

    case "fs/snapshot": {
      const files = msg.files as Record<string, string> | undefined
      if (files) {
        console.log("[ws] received snapshot:", Object.keys(files).length, "files")
        useFilesStore.getState().setSnapshot(files)
      }
      break
    }
  }
}
