import { memo, useEffect, useRef } from "react"
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

export const CodeEditor = memo(function CodeEditor() {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const selectedFile = useFilesStore((s) => s.selectedFile)
  const files = useFilesStore((s) => s.files)

  const isImage = selectedFile ? isImageFile(selectedFile) : false

  useEffect(() => {
    if (!editorRef.current || isImage) return

    const content = selectedFile ? (useFilesStore.getState().getFileContent(selectedFile) || "") : ""
    const langExt = selectedFile ? getLanguageExtension(selectedFile) : []

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
        EditorState.readOnly.of(true),
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
      viewRef.current?.destroy()
      viewRef.current = null
    }
  }, [selectedFile, files, isImage])

  if (files.size === 0) {
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
        {isImage ? (
          <ImagePreview />
        ) : (
          <div ref={editorRef} className="h-full w-full overflow-hidden" />
        )}
      </div>
    </div>
  )
})
