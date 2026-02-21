import { memo, useEffect, useRef, useCallback } from "react"
import { EditorView, basicSetup } from "codemirror"
import { EditorState } from "@codemirror/state"
import { javascript } from "@codemirror/lang-javascript"
import { html } from "@codemirror/lang-html"
import { css } from "@codemirror/lang-css"
import { json } from "@codemirror/lang-json"
import { oneDark } from "@codemirror/theme-one-dark"
import { useFilesStore } from "@/stores/files"
import { FileTree } from "./FileTree"
import { isImageFile } from "@/lib/utils"

function getLanguageExtension(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
      return javascript({ jsx: true, typescript: ext.includes("ts") })
    case "html":
      return html()
    case "css":
      return css()
    case "json":
      return json()
    default:
      return []
  }
}

import { ImagePreview } from "./ImagePreview"

// Internal component for the actual editor instance
const ActiveEditor = memo(function ActiveEditor({ file, active }: { file: string, active: boolean }) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const dirtyRef = useRef(false)
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null)

  // Save changes helper
  const saveChanges = useCallback(() => {
    if (dirtyRef.current && viewRef.current) {
      const content = viewRef.current.state.doc.toString()
      useFilesStore.getState().applyPatch({
        op: "write",
        path: file,
        content: content
      })
      dirtyRef.current = false
    }
  }, [file])

  // Save when becoming inactive
  useEffect(() => {
    if (!active) {
      saveChanges()
    }
  }, [active, saveChanges])

  useEffect(() => {
    if (!editorRef.current) return

    const content = useFilesStore.getState().getFileContent(file) || ""
    const langExt = getLanguageExtension(file)

    // Reset dirty state on init
    dirtyRef.current = false

    const state = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        langExt,
        oneDark,
        EditorView.theme({
          "&": { height: "100%" },
          ".cm-scroller": { overflow: "auto" },
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            dirtyRef.current = true

            // Reset 5min auto-save timer on every change
            if (autoSaveRef.current) {
              clearTimeout(autoSaveRef.current)
            }
            autoSaveRef.current = setTimeout(() => {
              saveChanges()
            }, 5 * 60 * 1000)
          }
        }),
        EditorView.domEventHandlers({
          blur: () => {
            saveChanges()
          },
        }),
      ],
    })

    if (viewRef.current) {
      viewRef.current.destroy()
    }

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    })

    return () => {
      // If there are unsaved changes, save them on unmount
      saveChanges()

      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current)
      }

      viewRef.current?.destroy()
      viewRef.current = null
    }
  }, [file]) // Re-init ONLY when file path changes

  return <div ref={editorRef} className="h-full w-full overflow-hidden" />
})

export const CodeEditor = memo(function CodeEditor({ active = true }: { active?: boolean }) {
  const selectedFile = useFilesStore((s) => s.selectedFile)
  const hasFiles = useFilesStore((s) => s.files.size > 0)
  const syncFiles = useFilesStore((s) => s.syncFiles)

  const isImage = selectedFile ? isImageFile(selectedFile) : false

  // Sync on tab switch (active -> false)
  useEffect(() => {
    // console.log("[CodeEditor] active:", active)
    if (!active) {
      console.log("[CodeEditor] Tab inactive, triggering syncFiles")
      syncFiles()
    }
  }, [active, syncFiles])

  if (!hasFiles) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p className="text-sm">No files yet. Send a prompt to start!</p>
      </div>
    )
  }

  return (
    <div className="h-full flex">
      {/* File tree sidebar */}
      <div className="w-48 border-r ml-4 border-border overflow-y-auto flex-shrink-0">
        <FileTree />
      </div>

      {/* Editor or Preview */}
      <div className="flex-1 overflow-hidden relative">
        {selectedFile && !isImage && (
          <ActiveEditor file={selectedFile} active={active} />
        )}
        {selectedFile && isImage && (
          <ImagePreview />
        )}
        {!selectedFile && (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <p className="text-sm">Select a file to edit</p>
          </div>
        )}
      </div>
    </div>
  )
})
