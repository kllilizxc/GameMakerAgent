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

  applyPatch: (patch: FilePatch) => void
  applyPatches: (patches: FilePatch[]) => void
  setSnapshot: (files: Record<string, string | { content: string, encoding: "utf-8" | "base64" }>) => void
  selectFile: (path: string | null) => void
  getFileContent: (path: string) => string | undefined
  getFileEntry: (path: string) => FileEntry | undefined
  getFileList: () => string[]
  reset: () => void
}

export const useFilesStore = create<FilesState>()(
  devtools(
    (set, get) => ({
      files: new Map(),
      selectedFile: null,
      pendingPatches: [],

      applyPatch: (patch: FilePatch) => {
        set((state) => {
          const files = new Map(state.files)

          switch (patch.op) {
            case "write":
              if (patch.content !== undefined) {
                files.set(patch.path, {
                  content: patch.content,
                  encoding: patch.encoding || "utf-8"
                })
              }
              break
            case "delete":
              files.delete(patch.path)
              break
            case "mkdir":
              // Directories are implicit in the file map
              break
          }

          return { files }
        })
      },

      applyPatches: (patches: FilePatch[]) => {
        patches.forEach((patch) => get().applyPatch(patch))
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
        set({ files, selectedFile })
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
        set({ files: new Map(), selectedFile: null, pendingPatches: [] })
      },
    })))
