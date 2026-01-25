import { create } from "zustand"

interface FilePatch {
  op: "write" | "delete" | "mkdir"
  path: string
  content?: string
}

interface FilesState {
  files: Map<string, string>
  selectedFile: string | null
  pendingPatches: FilePatch[]

  applyPatch: (patch: FilePatch) => void
  applyPatches: (patches: FilePatch[]) => void
  setSnapshot: (files: Record<string, string>) => void
  selectFile: (path: string | null) => void
  getFileContent: (path: string) => string | undefined
  getFileList: () => string[]
}

export const useFilesStore = create<FilesState>((set, get) => ({
  files: new Map(),
  selectedFile: null,
  pendingPatches: [],

  applyPatch: (patch: FilePatch) => {
    set((state) => {
      const files = new Map(state.files)

      switch (patch.op) {
        case "write":
          if (patch.content !== undefined) {
            files.set(patch.path, patch.content)
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

  setSnapshot: (snapshot: Record<string, string>) => {
    const files = new Map(Object.entries(snapshot))
    const selectedFile = files.size > 0 ? Array.from(files.keys())[0] : null
    set({ files, selectedFile })
  },

  selectFile: (path: string | null) => {
    set({ selectedFile: path })
  },

  getFileContent: (path: string) => {
    return get().files.get(path)
  },

  getFileList: () => {
    return Array.from(get().files.keys()).sort()
  },
}))
