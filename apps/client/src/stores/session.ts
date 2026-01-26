import { create } from "zustand"
import { useFilesStore } from "./files"
import type { Message, Activity, FsPatch } from "@/types/session"

interface SessionState {
  sessionId: string | null
  engineId: string
  status: "idle" | "connecting" | "running" | "error"
  messages: Message[]
  activities: Activity[]
  streamingMessageId: string | null
  sequence: number
  error: string | null
  ws: WebSocket | null

  connect: (serverUrl: string, engineId?: string) => void
  disconnect: () => void
  sendPrompt: (prompt: string) => void
  addMessage: (message: Message) => void
  updateStreamingMessage: (textId: string, text: string) => void
  finalizeStreamingMessage: () => void
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
  streamingMessageId: null,
  sequence: 0,
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
    const state = get()
    const { ws, sessionId, engineId, status } = state
    
    console.log("[ws] sendPrompt called", { ws: !!ws, status, sessionId, prompt })
    
    if (!ws) {
      console.error("[ws] No WebSocket connection")
      return
    }
    if (status === "running") {
      console.log("[ws] Already running, ignoring prompt")
      return
    }
    if (!sessionId) {
      console.error("[ws] No sessionId available. Session not initialized.")
      return
    }

    // Add user message
    set((s) => {
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: prompt,
        timestamp: s.sequence,
      }
      return {
        messages: [...s.messages, userMsg],
        sequence: s.sequence + 1,
      }
    })

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

  updateStreamingMessage: (textId: string, text: string) => {
    set((s) => {
      // Check if message with this textId already exists
      const existing = s.messages.find((m) => m.id === textId)
      if (existing) {
        return {
          messages: s.messages.map((m) =>
            m.id === textId ? { ...m, content: text, streaming: true } : m
          ),
          streamingMessageId: textId,
        }
      }
      // Create new message
      const newMsg: Message = {
        id: textId,
        role: "agent",
        content: text,
        streaming: true,
        timestamp: s.sequence,
      }
      return {
        messages: [...s.messages, newMsg],
        streamingMessageId: textId,
        sequence: s.sequence + 1,
      }
    })
  },

  finalizeStreamingMessage: () => {
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === s.streamingMessageId ? { ...m, streaming: false } : m
      ),
      streamingMessageId: null,
    }))
  },

  addActivity: (activity) => {
    set((s) => ({
      activities: [
        ...s.activities,
        {
          ...activity,
          id: crypto.randomUUID(),
          timestamp: s.sequence,
        },
      ],
      sequence: s.sequence + 1,
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
      break

    case "agent/event": {
      const event = msg.event as { type: string; data?: { text?: string; id?: string; tool?: string; title?: string } } | undefined
      
      if (event?.type === "text-delta" && event.data?.text && event.data?.id) {
        // Streaming text chunk
        useSessionStore.getState().updateStreamingMessage(event.data.id, event.data.text)
      } else if (event?.type === "text" && event.data?.text) {
        // Final complete text
        useSessionStore.getState().finalizeStreamingMessage()
      } else if (event?.type === "tool-start" && event.data?.tool) {
        // Tool started
        useSessionStore.getState().addActivity({
          type: "tool",
          data: { tool: event.data.tool, title: event.data.title },
        })
      } else if (event?.type === "tool" && event.data?.tool) {
        // Tool completed
        useSessionStore.getState().addActivity({
          type: "tool",
          data: { tool: event.data.tool, title: event.data.title },
        })
      }
      break
    }

    case "run/finished":
      useSessionStore.getState().finalizeStreamingMessage()
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
      const snapshot = msg.files as Record<string, string> | undefined
      if (snapshot) {
        const receivedSessionId = msg.sessionId as string
        console.log("[ws] received snapshot:", Object.keys(snapshot).length, "files, sessionId:", receivedSessionId)
        // Store sessionId from snapshot
        set({ sessionId: receivedSessionId })
        useFilesStore.getState().setSnapshot(snapshot)
      }
      break
    }
  }
}
