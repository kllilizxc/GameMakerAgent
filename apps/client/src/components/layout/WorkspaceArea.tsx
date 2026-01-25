import { useState } from "react"
import { cn } from "@/lib/utils"
import { Code, Play, RefreshCw, Maximize2 } from "lucide-react"
import { GamePreview } from "@/components/preview/GamePreview"
import { CodeEditor } from "@/components/editor/CodeEditor"
import { usePreviewStore } from "@/stores/preview"

type View = "preview" | "editor"

export function WorkspaceArea() {
  const [view, setView] = useState<View>("preview")
  const { refresh, status } = usePreviewStore()

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4 flex-shrink-0">
        {/* View toggle */}
        <div className="flex bg-secondary rounded-lg p-1">
          <button
            onClick={() => setView("preview")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
              view === "preview"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Play size={16} />
            Preview
          </button>
          <button
            onClick={() => setView("editor")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
              view === "editor"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Code size={16} />
            Code
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {view === "preview" && (
            <>
              <button
                onClick={refresh}
                disabled={status !== "running"}
                className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-50"
                title="Refresh preview"
              >
                <RefreshCw size={18} />
              </button>
              <button
                className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                title="Fullscreen"
              >
                <Maximize2 size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-200",
            view === "preview" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          )}
        >
          <GamePreview />
        </div>
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-200",
            view === "editor" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          )}
        >
          <CodeEditor />
        </div>
      </div>
    </div>
  )
}
