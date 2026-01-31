import { create } from "zustand"
import { useFilesStore } from "./files"
import type { Message, Activity, FsPatch, TemplateInfo } from "@/types/session"
import { fetchTemplates } from "@/lib/api"
import { storage, type SessionHistoryItem } from "@/lib/storage"

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
  templates: TemplateInfo[]
  serverUrl: string | null
  history: SessionHistoryItem[]

  connect: (serverUrl: string, engineId?: string) => void
  disconnect: () => void
  fetchTemplates: () => void
  createSession: (templateId: string) => void
  resumeSession: (sessionId: string) => void
  addToHistory: (sessionId: string, templateId?: string) => void
  updateSessionName: (sessionId: string, name: string) => void
  loadHistory: () => void
  leaveSession: () => void
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
  templates: [],
  serverUrl: null,

  history: [],

  connect: (serverUrl: string, engineId = "phaser-2d") => {
    const { ws } = get()
    if (ws) ws.close()

    set({ status: "connecting", engineId, error: null, serverUrl })

    const socket = new WebSocket(`${serverUrl}/ws`)

    socket.onopen = () => {
      set({ ws: socket, status: "idle" })
      console.log("[ws] connected to server")
    }

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === "fs/snapshot" || msg.type === "session/created") {
          console.log("[store] Received session-setting message:", msg.type, msg)
        }
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

  fetchTemplates: async () => {
    try {
      const templates = await fetchTemplates()
      set({ templates })
    } catch (e) {
      console.error("Failed to fetch templates:", e)
    }
  },

  createSession: (templateId: string) => {
    const { connect } = get()
    connect(useSessionStore.getState().serverUrl || "ws://localhost:3001")

    const checkConnection = setInterval(() => {
      const { ws } = get()
      if (ws && ws.readyState === WebSocket.OPEN) {
        clearInterval(checkConnection)
        ws.send(JSON.stringify({ type: "session/create", engineId: "phaser-2d", templateId }))
      }
    }, 100)
  },

  resumeSession: (sessionId: string) => {
    const { connect } = get()
    connect(useSessionStore.getState().serverUrl || "ws://localhost:3001")

    const checkConnection = setInterval(() => {
      const { ws } = get()
      if (ws && ws.readyState === WebSocket.OPEN) {
        clearInterval(checkConnection)
        ws.send(JSON.stringify({ type: "session/create", engineId: "phaser-2d", sessionId }))
      }
    }, 100)
  },

  addToHistory: (sessionId: string, templateId?: string) => {
    set((state) => {
      const existing = state.history.find((h) => h.id === sessionId)
      let newHistory

      if (existing) {
        newHistory = state.history.map((h) =>
          h.id === sessionId
            ? { ...h, lastActive: Date.now() }
            : h
        )
      } else {
        const template = state.templates.find(t => t.id === templateId)
        const name = template ? `${template.name} Session` : `Session ${sessionId.slice(0, 6)}`

        newHistory = [
          {
            id: sessionId,
            name,
            lastActive: Date.now(),
            templateId
          },
          ...state.history
        ].slice(0, 10) // Keep last 10
      }

      // Sort by recency
      newHistory.sort((a, b) => b.lastActive - a.lastActive)

      // Save via storage protocol
      storage.saveHistory(newHistory)

      return { history: newHistory }
    })
  },

  loadHistory: async () => {
    try {
      const history = await storage.getHistory()
      set({ history })
    } catch (e) {
      console.error("Failed to load history", e)
    }
  },

  updateSessionName: (sessionId: string, name: string) => {
    set((state) => {
      const newHistory = state.history.map((h) =>
        h.id === sessionId ? { ...h, name } : h
      )
      storage.saveHistory(newHistory)
      return { history: newHistory }
    })
  },

  leaveSession: () => {
    get().disconnect()
    useFilesStore.getState().reset()
    // Clear session state to prevent duplicates on re-entry
    set({ messages: [], activities: [], streamingMessageId: null, sequence: 0 })
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
        timestamp: Date.now(),
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
        timestamp: Date.now(),
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
          timestamp: Date.now(),
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


    case "session/created":
      set({ sessionId: msg.sessionId as string })
      useSessionStore.getState().addToHistory(msg.sessionId as string, msg.templateId as string | undefined)
      break

    case "agent/event": {
      const event = msg.event as { type: string; data?: { text?: string; id?: string; tool?: string; title?: string; callId?: string } } | undefined

      if (event?.type === "text-delta" && event.data?.text && event.data?.id) {
        // Streaming text chunk
        useSessionStore.getState().updateStreamingMessage(event.data.id, event.data.text)
      } else if (event?.type === "text" && event.data?.text) {
        // Final complete text
        useSessionStore.getState().finalizeStreamingMessage()
      } else if (event?.type === "tool-start" && event.data?.tool && event.data?.callId) {
        // Tool started - replace existing activity with same callId
        const { tool, title, callId } = event.data
        console.log("[ws] tool-start:", tool, "callId:", callId)
        set((s) => {
          const existingIndex = s.activities.findIndex((a) => a.callId === callId)
          const newActivity = {
            id: callId,
            type: "tool" as const,
            completed: false,
            callId,
            timestamp: existingIndex !== -1 ? s.activities[existingIndex].timestamp : s.sequence,
            data: { tool, title },
          }

          if (existingIndex !== -1) {
            console.log("[ws] replacing existing activity at index:", existingIndex)
            const activities = [...s.activities]
            activities[existingIndex] = newActivity
            return { activities }
          }

          return {
            activities: [...s.activities, newActivity],
            sequence: s.sequence + 1,
          }
        })
      } else if (event?.type === "tool" && event.data?.tool && event.data?.callId) {
        // Tool completed - replace existing activity with completed version
        const { tool, title, callId } = event.data
        console.log("[ws] tool completed:", tool, "callId:", callId)
        set((s) => {
          const existingIndex = s.activities.findIndex((a) => a.callId === callId)

          if (existingIndex !== -1) {
            console.log("[ws] marking tool complete at index:", existingIndex)
            const activities = [...s.activities]
            activities[existingIndex] = {
              ...activities[existingIndex],
              completed: true,
              data: { tool, title },
            }
            return { activities }
          }

          console.log("[ws] tool completed but no matching start found, creating new activity")
          return {
            activities: [
              ...s.activities,
              {
                id: callId,
                type: "tool" as const,
                completed: true,
                callId,
                timestamp: s.sequence,
                data: { tool, title },
              },
            ],
            sequence: s.sequence + 1,
          }
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
      const persistedMessages = msg.messages as Array<{ role: "user" | "agent"; content: string; timestamp: number }> | undefined

      if (snapshot) {
        const receivedSessionId = msg.sessionId as string
        console.log("[ws] received snapshot:", Object.keys(snapshot).length, "files, sessionId:", receivedSessionId)
        // Store sessionId from snapshot
        set({ sessionId: receivedSessionId })
        useFilesStore.getState().setSnapshot(snapshot)
      }

      // Load persisted messages - prepend to any existing messages
      if (persistedMessages && persistedMessages.length > 0) {
        console.log("[ws] loading", persistedMessages.length, "persisted messages")
        const loadedMessages = persistedMessages.map((pm, idx) => ({
          id: `restored-${idx}`,
          role: pm.role,
          content: pm.content,
          streaming: false,
          timestamp: pm.timestamp,
        }))
        // Get current messages and filter out any that were sent before snapshot arrived
        const currentMessages = useSessionStore.getState().messages
        // Prepend history to any new messages that may have been added
        set({ messages: [...loadedMessages, ...currentMessages] })
      }
      break
    }
  }
}
