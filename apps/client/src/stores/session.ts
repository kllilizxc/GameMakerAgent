import { create } from "zustand"
import { useFilesStore } from "./files"
import type { Message, Activity, FsPatch, TemplateInfo } from "@/types/session"
import { fetchTemplates, deleteSession, createSession, cancelRun, fetchMessages, rewindSession, startRun } from "@/lib/api"

import { storage, type SessionHistoryItem } from "@/lib/storage"
import { devtools } from "zustand/middleware"
import { MSG_PAGE_SIZE_DEFAULT } from "@game-agent/common"
import { useSettingsStore } from "./settings"
import { parseSseStream } from "@/lib/sse"

interface SessionState {
  sessionId: string | null
  engineId: string
  status: "idle" | "connecting" | "running" | "error"
  messages: Message[]
  activities: Activity[]
  streamingMessageId: string | null
  sequence: number
  error: string | null
  currentRunId: string | null
  templates: TemplateInfo[]
  serverUrl: string | null
  history: SessionHistoryItem[]
  isLoadingMore: boolean
  hasMoreMessages: boolean
  todos: Array<{ id: string; content: string; status: string; priority?: string }>
  draftPrompt: string | null
  draftAttachments: string[] | null
  reconnectTimer: ReturnType<typeof setTimeout> | null

  loadMoreMessages: () => void
  fetchTemplates: () => void
  createSession: (templateId: string) => Promise<any>
  resumeSession: (sessionId: string) => Promise<any>
  addToHistory: (sessionId: string, templateId?: string) => void
  updateSessionName: (sessionId: string, name: string) => void
  loadHistory: () => void
  deleteSession: (sessionId: string) => Promise<void>
  leaveSession: () => void

  sendPrompt: (prompt: string, attachments?: string[]) => void
  addMessage: (message: Message) => void
  updateStreamingMessage: (textId: string, text: string) => void
  finalizeStreamingMessage: () => void
  addActivity: (activity: Omit<Activity, "id" | "timestamp">) => void
  clearActivities: () => void
  setStatus: (status: SessionState["status"]) => void
  interrupt: () => void
  rewind: (messageId: string, edit?: boolean) => void
  setDraftPrompt: (prompt: string | null) => void
  setDraftAttachments: (attachments: string[] | null) => void
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
      currentRunId: null,
      templates: [],
      serverUrl: null,
      history: [],
      isLoadingMore: false,
      hasMoreMessages: false,
      todos: [],
      draftPrompt: null,
      draftAttachments: null,
      reconnectTimer: null,

      fetchTemplates: async () => {
        try {
          const templates = await fetchTemplates()
          set({ templates })
        } catch (e) {
          console.error("Failed to fetch templates:", e)
        }
      },

      createSession: async (templateId: string) => {
        const { engineId } = get()
        try {
          const data = await createSession(engineId, templateId)
          if (data.sessionId) {
            set({ sessionId: data.sessionId, todos: data.todos || [] })
            if (data.snapshot) {
              useFilesStore.getState().setSnapshot(data.snapshot.files)
            }
            if (data.messages) {
              const messages = processLoadedMessages(data.messages.list)
              const activities = messages.flatMap(m => m.activities || [])
              set({
                messages,
                activities,
                hasMoreMessages: data.messages.hasMore
              })
            }
            get().addToHistory(data.sessionId, data.templateId)
          }
          return data
        } catch (e) {
          console.error("Failed to create session:", e)
          set({ status: "error", error: "Failed to create session" })
          throw e
        }
      },

      resumeSession: async (sessionId: string) => {
        const state = get()
        // If already in memory and session matches, skip
        if (state.sessionId === sessionId && state.messages.length > 0) {
          return { sessionId }
        }

        const { engineId } = get()
        try {
          const data = await createSession(engineId, undefined, sessionId)
          if (data.sessionId) {
            set({ sessionId: data.sessionId, todos: data.todos || [] })
            if (data.snapshot) {
              useFilesStore.getState().setSnapshot(data.snapshot.files)
            }
            if (data.messages) {
              const messages = processLoadedMessages(data.messages.list)
              const activities = messages.flatMap(m => m.activities || [])
              set({
                messages,
                activities,
                hasMoreMessages: data.messages.hasMore
              })
            }
            get().addToHistory(data.sessionId, data.templateId)
          }
          return data
        } catch (e) {
          console.error("Failed to resume session:", e)
          set({ status: "error", error: "Failed to resume session" })
          throw e
        }
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

          newHistory.sort((a, b) => b.lastActive - a.lastActive)
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

      deleteSession: async (sessionId: string) => {
        try {
          await deleteSession(sessionId)
          set((state) => {
            const newHistory = state.history.filter((h) => h.id !== sessionId)
            storage.saveHistory(newHistory)
            return { history: newHistory }
          })
        } catch (e) {
          console.error("Failed to delete session:", e)
        }
      },

      leaveSession: () => {
        useFilesStore.getState().reset()
        set({ sessionId: null, messages: [], activities: [], streamingMessageId: null, sequence: 0, status: "idle" })
      },

      sendPrompt: async (prompt: string, attachments?: string[]) => {
        const state = get()
        const { sessionId, status } = state

        if (status === "running") return
        if (!sessionId) {
          console.error("[api] No sessionId available")
          return
        }

        set({ status: "running", error: null })

        try {
          const model = useSettingsStore.getState().activeModel
          const response = await startRun(sessionId, prompt, attachments, model)

          if (!response.ok) throw new Error(`Failed to start run: ${response.statusText}`)

          const reader = response.body?.getReader()
          if (!reader) throw new Error("No response body")

          await parseSseStream(reader, (msg) => {
            handleServerMessage(msg, set, get)
          })
        } catch (e) {
          console.error("Failed to send prompt:", e)
          set({ status: "error", error: e instanceof Error ? e.message : "Failed to send prompt" })
        } finally {
          set((s) => (s.status === "running" ? { status: "idle" } : {}))
        }
      },

      addMessage: (message: Message) => {
        set((s) => ({ messages: [...s.messages, message] }))
      },

      updateStreamingMessage: (textId: string, text: string) => {
        set((s) => {
          const existingIndex = s.messages.findIndex((m) => m.id === textId)

          if (existingIndex !== -1) {
            // Only create a new array if the target message actually changed
            const existing = s.messages[existingIndex]
            if (existing.content === text && existing.streaming) {
              return {} // No change needed
            }
            const messages = s.messages.map((m, i) =>
              i === existingIndex ? { ...m, content: text, streaming: true } : m
            )
            return {
              messages,
              streamingMessageId: textId,
            }
          }

          const newMessage: Message = {
            id: textId,
            role: "agent",
            content: text,
            streaming: true,
            timestamp: Date.now(),
          }

          return {
            messages: [...s.messages, newMessage],
            streamingMessageId: textId,
          }
        })
      },

      finalizeStreamingMessage: () => {
        set((s) => {
          if (!s.streamingMessageId) return {}
          const messages = s.messages.map((m) =>
            m.id === s.streamingMessageId ? { ...m, streaming: false } : m
          )
          return { messages, streamingMessageId: null }
        })
      },

      addActivity: (activity: Omit<Activity, "id" | "timestamp">) => {
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

      loadMoreMessages: async () => {
        const { sessionId, messages, isLoadingMore, hasMoreMessages } = get()
        if (!sessionId || isLoadingMore || !hasMoreMessages) return

        set({ isLoadingMore: true })
        try {
          const data = await fetchMessages(sessionId, MSG_PAGE_SIZE_DEFAULT, messages.length)
          if (data && data.messages) {
            handleServerMessage({
              type: "messages/list",
              messages: data.messages,
              hasMore: data.hasMore,
              replace: false
            }, set, get)
          }
        } catch (e) {
          console.error("Failed to load more messages:", e)
        } finally {
          set({ isLoadingMore: false })
        }
      },

      interrupt: async () => {
        const { sessionId, currentRunId } = get()
        if (!sessionId || !currentRunId) return
        try {
          await cancelRun(sessionId, currentRunId)
        } catch (e) {
          console.error("Failed to interrupt:", e)
        }
      },

      rewind: async (messageId: string, edit?: boolean) => {
        const { sessionId, messages } = get()
        if (!sessionId) return
        try {
          if (edit) {
            const msg = messages.find(m => m.id === messageId)
            if (msg) {
              set({ draftPrompt: msg.content })
              const attachments = msg.parts
                ?.filter(p => p.type === "image" && p.url)
                .map(p => p.url!) || []
              if (attachments.length > 0) {
                set({ draftAttachments: attachments })
              }
            }
          }

          const data = await rewindSession(sessionId, messageId, edit)
          if (data && data.messages) {
            if (data.snapshot) {
              useFilesStore.getState().setSnapshot(data.snapshot.files)
            }
            handleServerMessage({
              type: "messages/list",
              messages: data.messages.list,
              hasMore: data.messages.hasMore,
              replace: true
            }, set, get)
          }
        } catch (e) {
          console.error("Failed to rewind session:", e)
        }
      },

      setDraftPrompt: (prompt) => set({ draftPrompt: prompt }),
      setDraftAttachments: (attachments) => set({ draftAttachments: attachments }),
    }),
    { name: "SessionStore" }
  )
)

// Helper to process server messages into client format
function processLoadedMessages(messages: any[]): Message[] {
  return messages.map((pm, idx) => ({
    id: pm.id || `restored-${pm.timestamp} -${idx} `,
    role: pm.role,
    content: pm.content,
    parts: pm.parts,
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
          const activities = s.activities || []
          const existingIndex = activities.findIndex((a: any) => a.callId === callId)
          const newActivity = {
            id: callId,
            type: "tool" as const,
            completed: false,
            callId,
            timestamp: existingIndex !== -1 ? activities[existingIndex].timestamp : Date.now(),
            data: { tool, title },
          }

          if (existingIndex !== -1) {
            const nextActivities = [...activities]
            nextActivities[existingIndex] = newActivity
            return { activities: nextActivities }
          }

          return {
            activities: [...activities, newActivity],
            sequence: s.sequence + 1,
          }
        })
      } else if (event?.type === "tool" && event.data?.tool) {
        const { tool, title } = event.data
        const callId = event.data.callId || crypto.randomUUID()

        set((s) => {
          const activities = s.activities || []
          const existingIndex = activities.findIndex((a: any) => a.callId === callId)

          if (existingIndex !== -1) {
            const nextActivities = [...activities]
            nextActivities[existingIndex] = {
              ...nextActivities[existingIndex],
              completed: true,
              data: { tool, title },
            }

            // Extract todos from todowrite tool
            const updates: Partial<SessionState> = { activities: nextActivities }
            const metadata = (event.data as any)?.metadata
            if (tool === "todowrite" && metadata?.todos) {
              updates.todos = metadata.todos
            }
            return updates
          }

          return {
            activities: [
              ...activities,
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
        const messages = s.messages || []
        const messageMap = new Map(messages.map((m: any) => [m.id, m]))

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
        // Handle sync store updates strictly synchronously
        const filesStore = useFilesStore.getState()

          // Trigger async WebContainer sync
          ; (async () => {
            try {
              const { getWebContainer } = await import("@/hooks/useWebContainer")
              const wc = await getWebContainer()

              for (const patch of ops) {
                // Store update (sync)
                filesStore.applyPatch(patch, true)
                // useSessionStore.getState().addActivity({
                //   type: "file",
                //   data: { path: patch.path },
                // })

                // WebContainer update (async)
                if (wc) {
                  if (patch.op === "write" && patch.content !== undefined) {
                    const parts = patch.path.split("/")
                    parts.pop()
                    const dir = parts.join("/")
                    if (dir) {
                      await wc.fs.mkdir(dir, { recursive: true })
                    }

                    if (patch.encoding === "base64") {
                      const binaryString = atob(patch.content)
                      const bytes = new Uint8Array(binaryString.length)
                      for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i)
                      }
                      await wc.fs.writeFile(patch.path, bytes)
                    } else {
                      await wc.fs.writeFile(patch.path, patch.content)
                    }
                  } else if (patch.op === "delete") {
                    await wc.fs.rm(patch.path, { recursive: true }).catch(() => { })
                  } else if (patch.op === "mkdir") {
                    await wc.fs.mkdir(patch.path, { recursive: true }).catch(() => { })
                  }
                }
              }
            } catch (e) {
              console.error("Failed to sync files to WebContainer:", e)
            }
          })()
      }
      break
    }

    case "fs/snapshot": {
      const snapshot = msg.files as Record<string, string | { content: string, encoding: "utf-8" | "base64" }> | undefined

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

      if (shouldReplace || (msgs && msgs.length > 0)) {
        const serverMessages = (msg.messages || []) as any[]
        const incomingMessages = processLoadedMessages(serverMessages)
        const incomingActivities = serverMessages.flatMap(m => m.activities || [])

        if (shouldReplace) {
          // Replace mode (for rewind): completely replace messages and activities
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
          // Merge mode (for load more or updates): merge with existing messages
          set((s) => {
            const currentMessages = s.messages || []
            const messageMap = new Map(currentMessages.map((m: any) => [m.id, m]))

            incomingMessages.forEach((incoming) => {
              messageMap.set(incoming.id, incoming)
            })

            const mergedMessages = Array.from(messageMap.values())
            mergedMessages.sort((a, b) => a.timestamp - b.timestamp)

            const currentActivities = s.activities || []
            const activityMap = new Map(currentActivities.map((a: any) => [a.id, a]))
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
