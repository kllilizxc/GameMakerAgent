import { create } from "zustand"
import { useFilesStore } from "./files"
import type { Message, Activity, FsPatch, TemplateInfo } from "@/types/session"
import { fetchTemplates } from "@/lib/api"
import { storage, type SessionHistoryItem } from "@/lib/storage"
import { devtools } from "zustand/middleware"
import { MSG_PAGE_SIZE_DEFAULT } from "@game-agent/common"

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
  currentRunId: string | null
  templates: TemplateInfo[]
  serverUrl: string | null
  history: SessionHistoryItem[]
  isLoadingMore: boolean
  hasMoreMessages: boolean
  todos: Array<{ id: string; content: string; status: string; priority?: string }>
  draftPrompt: string | null

  connect: (serverUrl: string, engineId?: string) => void
  loadMoreMessages: () => void
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
  interrupt: () => void
  rewind: (messageId: string, edit?: boolean, content?: string) => void
  setDraftPrompt: (prompt: string | null) => void
}

export const useSessionStore = create<SessionState>()(
  devtools(
    (set, get) => ({
      sessionId: null,
      engineId: "phaser-2d",
      status: "idle",
      messages: [],
      activities: [],
      streamingMessageId: null,
      sequence: 0,
      error: null,
      ws: null,
      currentRunId: null,
      templates: [],
      serverUrl: null,

      history: [],
      isLoadingMore: false,
      hasMoreMessages: false,
      todos: [],
      draftPrompt: null,

      connect: (serverUrl: string, engineId = "phaser-2d") => {
        const { ws } = get()
        if (ws) ws.close()

        set({ status: "connecting", engineId, error: null, serverUrl })

        const socket = new WebSocket(`${serverUrl}/ws`)

        socket.onopen = () => {
          set({ ws: socket, status: "idle" })
        }

        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)
            if (msg.type === "fs/snapshot" || msg.type === "session/created") {

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
        connect(useSessionStore.getState().serverUrl || "ws://127.0.0.1:3001")

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
        connect(useSessionStore.getState().serverUrl || "ws://127.0.0.1:3001")

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

        if (!ws) {
          console.error("[ws] No WebSocket connection")
          return
        }
        if (status === "running") {

          return
        }
        if (!sessionId) {
          console.error("[ws] No sessionId available. Session not initialized.")
          return
        }

        // Add user message - DEPRECATED: Rely on server broadcast for ID consistency
        set({ status: "running" })


        // Send to server
        const message = {
          type: "run/start",
          sessionId,
          engineId,
          prompt,
        }
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

      loadMoreMessages: () => {

        const { ws, messages, isLoadingMore, hasMoreMessages, sessionId } = get()
        if (!ws || isLoadingMore || !hasMoreMessages || !sessionId || messages.length === 0) return

        set({ isLoadingMore: true })
        ws.send(JSON.stringify({
          type: "messages/list",
          sessionId,
          limit: MSG_PAGE_SIZE_DEFAULT,
          skip: messages.length,
        }))
      },

      interrupt: () => {
        const { ws, sessionId, status, currentRunId } = get()
        if (!ws || !sessionId || status !== "running" || !currentRunId) return


        ws.send(JSON.stringify({
          type: "run/cancel",
          sessionId,
          runId: currentRunId
        }))
      },

      rewind: (messageId: string, edit = false, content?: string) => {
        const { ws, sessionId, status } = get()
        if (!ws || !sessionId) return
        if (status === "running") {
          console.warn("Cannot rewind while running")
          return
        }


        ws.send(JSON.stringify({
          type: "session/rewind",
          sessionId,
          messageId,
          edit
        }))

        if (edit && content) {
          set({ draftPrompt: content })
        }

        // Optimistically clear later messages
        set((s) => {
          // If editing, we remove the target message itself from view (it will be in input)
          // If just rewinding (viewing), we keep it.
          // Actually, if we rewind history to Parent, the target message effectively disappears from history.
          // So in both cases (if edit=true, or if we supported non-edit rewind to parent), it disappears.
          // But here edit=true means "rewind to parent".
          // If edit=false, we rewind TO the message (so it stays).

          let index = s.messages.findIndex(m => m.id === messageId)
          if (index !== -1) {
            // If edit=true, we slice BEFORE this message.
            // If edit=false, we slice INCLUDING this message.
            const sliceEnd = edit ? index : index + 1
            return {
              messages: s.messages.slice(0, sliceEnd),
              activities: s.activities.filter(a => a.timestamp <= s.messages[index].timestamp)
            }
          }
          return {}
        })
      },

      setDraftPrompt: (prompt) => set({ draftPrompt: prompt }),
    }),
    { name: "SessionStore" }
  ))

// Helper to process server messages into client format
function processLoadedMessages(messages: any[]): Message[] {
  return messages.map((pm, idx) => ({
    id: pm.id || `restored-${pm.timestamp}-${idx}`,
    role: pm.role,
    content: pm.content,
    streaming: false,
    timestamp: pm.timestamp,
    metadata: pm.metadata,
    activities: pm.activities,
  }))
}


function handleServerMessage(
  msg: Record<string, unknown>,
  set: (fn: Partial<SessionState> | ((s: SessionState) => Partial<SessionState>)) => void,
  _get: () => SessionState
) {


  switch (msg.type) {
    case "run/started":
      set({
        sessionId: msg.sessionId as string,
        currentRunId: msg.runId as string,
        status: "running",
      })
      break


    case "session/created":
      set((state) => ({
        sessionId: msg.sessionId as string,
        // Load initial todos if present
        todos: (msg.todos as any[]) || state.todos
      }))
      useSessionStore.getState().addToHistory(msg.sessionId as string, msg.templateId as string | undefined)
      break

    case "agent/event": {
      const event = msg.event as { type: string; data?: { text?: string; id?: string; messageID?: string; tool?: string; title?: string; callId?: string } } | undefined

      if (event?.type === "text-delta" && event.data?.text) {
        // Streaming text chunk - use messageID for consistency with persistence
        const id = event.data.messageID || event.data.id
        if (id) {
          useSessionStore.getState().updateStreamingMessage(id, event.data.text)
        }
      } else if (event?.type === "text" && event.data?.text) {
        // Final complete text
        useSessionStore.getState().finalizeStreamingMessage()
      } else if (event?.type === "tool-start" && event.data?.tool) {
        const { tool, title } = event.data
        const callId = event.data.callId || crypto.randomUUID()

        set((s) => {
          const existingIndex = s.activities.findIndex((a) => a.callId === callId)
          const newActivity = {
            id: callId,
            type: "tool" as const,
            completed: false,
            callId,
            timestamp: existingIndex !== -1 ? s.activities[existingIndex].timestamp : Date.now(),
            data: { tool, title },
          }

          if (existingIndex !== -1) {
            const activities = [...s.activities]
            activities[existingIndex] = newActivity
            return { activities }
          }

          return {
            activities: [...s.activities, newActivity],
            sequence: s.sequence + 1,
          }
        })
      } else if (event?.type === "tool" && event.data?.tool) {
        const { tool, title } = event.data
        const callId = event.data.callId || crypto.randomUUID()

        set((s) => {
          const existingIndex = s.activities.findIndex((a) => a.callId === callId)

          if (existingIndex !== -1) {
            const activities = [...s.activities]
            activities[existingIndex] = {
              ...activities[existingIndex],
              completed: true,
              data: { tool, title },
            }

            // Extract todos from todowrite tool
            const updates: Partial<SessionState> = { activities }
            const metadata = (event.data as any)?.metadata
            if (tool === "todowrite" && metadata?.todos) {
              updates.todos = metadata.todos
            }
            return updates
          }

          return {
            activities: [
              ...s.activities,
              {
                id: callId,
                type: "tool" as const,
                completed: true,
                callId,
                timestamp: Date.now(),
                data: { tool, title },
              },
            ],
            sequence: s.sequence + 1,
          }
        })
      }
      break
    }

    case "message/updated": {
      // This comes from our manual broadcast in session/manager.ts
      const msgUpdate = msg as any
      const incoming = processLoadedMessages([msgUpdate.message])[0]

      set((s) => {
        const messageMap = new Map(s.messages.map((m) => [m.id, m]))

        // Ensure the incoming message keeps the streaming flag if it was indeed the one being streamed
        if (incoming.id === s.streamingMessageId) {
          incoming.streaming = true
        }

        messageMap.set(incoming.id, incoming)

        const mergedMessages = Array.from(messageMap.values())
        mergedMessages.sort((a, b) => a.timestamp - b.timestamp)
        return {
          messages: mergedMessages,
        }
      })
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
        // Store sessionId from snapshot
        set({ sessionId: receivedSessionId })
        useFilesStore.getState().setSnapshot(snapshot)
      }
      break
    }

    case "messages/list": {
      const msgs = msg.messages as Array<{ role: "user" | "agent"; content: string; timestamp: number; metadata?: any; activities?: any[] }>
      const hasMore = msg.hasMore as boolean
      const shouldReplace = msg.replace as boolean | undefined

      if (msgs && msgs.length > 0) {
        const serverMessages = msg.messages as any[]
        const incomingMessages = processLoadedMessages(serverMessages)
        const incomingActivities = serverMessages.flatMap(m => m.activities || [])

        if (shouldReplace) {
          // Replace mode (for rewind): completely replace messages and activities
          // Logic for replace...
          incomingMessages.sort((a, b) => a.timestamp - b.timestamp)
          const activities = incomingActivities.map((a: any) => ({
            id: a.id,
            type: a.type,
            timestamp: a.timestamp,
            data: a.data,
            completed: a.completed,
            callId: a.callId
          }))
          activities.sort((a: any, b: any) => a.timestamp - b.timestamp)
          set({
            messages: incomingMessages,
            activities,
            hasMoreMessages: hasMore,
            isLoadingMore: false,
          })
        } else {
          // Merge mode (for load more or udpates): merge with existing messages
          set((s) => {
            const messageMap = new Map(s.messages.map((m) => [m.id, m]))

            // Deduplicate logic removed - simply update/add messages
            incomingMessages.forEach((incoming) => {
              messageMap.set(incoming.id, incoming)
            })

            const mergedMessages = Array.from(messageMap.values())
            mergedMessages.sort((a, b) => a.timestamp - b.timestamp)

            const activityMap = new Map(s.activities.map((a) => [a.id, a]))
            incomingActivities.forEach((a) => {
              activityMap.set(a.id, {
                id: a.id,
                type: a.type,
                timestamp: a.timestamp,
                data: a.data,
                completed: a.completed,
                callId: a.callId
              })
            })
            const mergedActivities = Array.from(activityMap.values())
            mergedActivities.sort((a, b) => a.timestamp - b.timestamp)
            return {
              messages: mergedMessages,
              activities: mergedActivities,
              hasMoreMessages: hasMore,
              isLoadingMore: false,
            }
          })
        }

      } else {
        // No messages returned - still need to update loading state
        if (shouldReplace) {
          set({
            messages: [],
            activities: [],
            hasMoreMessages: hasMore,
            isLoadingMore: false,
          })
        } else {
          set({
            hasMoreMessages: hasMore,
            isLoadingMore: false,
          })
        }
      }
      break
    }
  }
}
