import { create } from "zustand"
import { devtools } from "zustand/middleware"

// ... imports

interface FilePatch {
  op: "write" | "delete" | "mkdir"
  path: string
  content?: string
  encoding?: "utf-8" | "base64"
}

interface FileEntry {
  content: string
  encoding: "utf-8" | "base64"
}

interface FilesState {
  files: Map<string, FileEntry>
  selectedFile: string | null
  pendingPatches: FilePatch[]
  unsynced: Set<string>

  applyPatch: (patch: FilePatch, isRemote?: boolean) => void
  applyPatches: (patches: FilePatch[], isRemote?: boolean) => void
  setSnapshot: (files: Record<string, string | { content: string, encoding: "utf-8" | "base64" }>) => void
  selectFile: (path: string | null) => void
  getFileContent: (path: string) => string | undefined
  getFileEntry: (path: string) => FileEntry | undefined
  getFileList: () => string[]
  reset: () => void
  markSynced: (paths: string[]) => void
  syncFiles: () => Promise<void>
  hasUnsynced: () => boolean
}

export const useFilesStore = create<FilesState>()(
  devtools(
    (set, get) => ({
      files: new Map(),
      selectedFile: null,
      pendingPatches: [],
      unsynced: new Set(),

      applyPatch: (patch: FilePatch, isRemote = false) => {
        set((state) => {
          const files = new Map(state.files)
          const unsynced = new Set(state.unsynced)

          switch (patch.op) {
            case "write":
              if (patch.content !== undefined) {
                files.set(patch.path, {
                  content: patch.content,
                  encoding: patch.encoding || "utf-8"
                })
                if (!isRemote) {
                  unsynced.add(patch.path)
                }
              }
              break
            case "delete":
              files.delete(patch.path)
              if (!isRemote) {
                unsynced.delete(patch.path)
              }
              break
            case "mkdir":
              // Directories are implicit in the file map
              break
          }

          return { files, unsynced }
        })
      },

      applyPatches: (patches: FilePatch[], isRemote = false) => {
        patches.forEach((patch) => get().applyPatch(patch, isRemote))
      },

      setSnapshot: (snapshot: Record<string, string | { content: string, encoding: "utf-8" | "base64" }>) => {
        const entries: [string, FileEntry][] = Object.entries(snapshot).map(([path, data]) => {
          if (typeof data === 'string') {
            return [path, { content: data, encoding: "utf-8" }]
          }
          return [path, data]
        })
        const files = new Map(entries)
        const selectedFile = files.size > 0 ? Array.from(files.keys())[0] : null
        set({ files, selectedFile, unsynced: new Set() })
      },

      selectFile: (path: string | null) => {
        set({ selectedFile: path })
      },

      getFileContent: (path: string) => {
        return get().files.get(path)?.content
      },

      getFileEntry: (path: string) => {
        return get().files.get(path)
      },

      getFileList: () => {
        return Array.from(get().files.keys()).sort()
      },

      reset: () => {
        set({ files: new Map(), selectedFile: null, pendingPatches: [], unsynced: new Set() })
      },

      markSynced: (paths: string[]) => {
        set((state) => {
          const unsynced = new Set(state.unsynced)
          paths.forEach(p => unsynced.delete(p))
          return { unsynced }
        })
      },

      syncFiles: async () => {
        const { useSessionStore } = await import("@/stores/session")
        const { saveFiles } = await import("@/lib/api")

        const sessionId = useSessionStore.getState().sessionId
        if (!sessionId) return

        const { unsynced, files, markSynced } = get()
        if (unsynced.size === 0) return

        const changes = Array.from(unsynced).map(path => {
          const entry = files.get(path)
          return { path, content: entry?.content || "" }
        })

        try {
          await saveFiles(sessionId, changes)
          markSynced(Array.from(unsynced))
          console.log(`[sync] Synced ${changes.length} files to server`)
        } catch (e) {
          console.error("[sync] Failed to sync files:", e)
        }
      },

      hasUnsynced: () => {
        return get().unsynced.size > 0
      }
    })))
