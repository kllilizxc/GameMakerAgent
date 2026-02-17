import { memo, useState } from "react"
import { cn } from "@/lib/utils"
import { GamePreview } from "@/components/preview/GamePreview"
import { PreviewTerminal } from "@/components/preview/PreviewTerminal"
import { CodeEditor } from "@/components/editor/CodeEditor"
import { AssetGenerator } from "@/components/assets/AssetGenerator"
import { WorkspaceToolbar, type View } from "./WorkspaceToolbar"

export const WorkspaceArea = memo(function WorkspaceArea() {
  const [view, setView] = useState<View>("preview")

  return (
    <div className="flex flex-col h-full">
      <WorkspaceToolbar
        view={view}
        onViewChange={setView}
      />

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
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-200 bg-background",
            view === "assets" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          )}
        >
          <AssetGenerator />
        </div>
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-200 bg-background",
            view === "terminal" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          )}
        >
          <PreviewTerminal />
        </div>
      </div>
    </div>
  )
})
