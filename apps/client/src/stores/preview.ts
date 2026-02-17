import { create } from "zustand"

interface LogEntry {
  id: string
  type: "log" | "error" | "warn"
  message: string
  timestamp: number
}

interface PreviewState {
  url: string | null
  status: "idle" | "booting" | "installing" | "running" | "error"
  error: string | null
  logs: LogEntry[]
  refreshKey: number

  setUrl: (url: string | null) => void
  setStatus: (status: PreviewState["status"]) => void
  setError: (error: string | null) => void
  addLog: (type: LogEntry["type"], message: string) => void
  clearLogs: () => void
  refresh: () => void
}

export const usePreviewStore = create<PreviewState>((set) => ({
  url: null,
  status: "idle",
  error: null,
  logs: [],
  refreshKey: 0,

  setUrl: (url) => set({ url }),

  setStatus: (status) => set({ status }),

  setError: (error) => set({ error, status: error ? "error" : "idle" }),

  addLog: (type, message) => {
    // Strip ANSI escape codes
    const cleanMessage = message.replace(
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      ""
    )

    const entry: LogEntry = {
      id: crypto.randomUUID(),
      type,
      message: cleanMessage,
      timestamp: Date.now(),
    }
    set((state) => ({ logs: [...state.logs.slice(-99), entry] }))
  },

  clearLogs: () => set({ logs: [] }),

  refresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
}))
