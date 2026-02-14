import { memo, useState } from "react"
import { cn } from "@/lib/utils"
import { Code, Play, RefreshCw, Image as ImageIcon } from "lucide-react"
import { GamePreview } from "@/components/preview/GamePreview"
import { CodeEditor } from "@/components/editor/CodeEditor"
import { AssetGenerator } from "@/components/assets/AssetGenerator"
import { usePreviewStore } from "@/stores/preview"
import { ThemeToggle } from "../ui/ThemeToggle"
import { IconButton } from "@/components/ui/IconButton"
import { Tabs } from "@heroui/react"

type View = "preview" | "editor" | "assets"

export const WorkspaceArea = memo(function WorkspaceArea() {
  const [view, setView] = useState<View>("preview")
  const refresh = usePreviewStore((s) => s.refresh)
  const status = usePreviewStore((s) => s.status)

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="h-12 flex items-center justify-between px-4 flex-shrink-0">
        {/* View toggle using HeroUI Tabs */}
        <div className="flex items-center">
          <Tabs
            aria-label="Workspace view"
            variant="primary"
            selectedKey={view}
            onSelectionChange={(key) => setView(key as View)}
          >
            <Tabs.ListContainer>
              <Tabs.List>
                <Tabs.Tab id="preview">
                  <div className="flex items-center gap-2 px-2">
                    <Play size={14} />
                    <span>Preview</span>
                    <Tabs.Indicator />
                  </div>
                </Tabs.Tab>
                <Tabs.Tab id="editor">
                  <div className="flex items-center gap-2 px-2">
                    <Code size={14} />
                    <span>Code</span>
                    <Tabs.Indicator />
                  </div>
                </Tabs.Tab>
                <Tabs.Tab id="assets">
                  <div className="flex items-center gap-2 px-2">
                    <ImageIcon size={14} />
                    <span>Assets</span>
                    <Tabs.Indicator />
                  </div>
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {view === "preview" && (
            <>
              <ThemeToggle />
              <IconButton
                onClick={refresh}
                disabled={status !== "running"}
                title="Refresh preview"
                size="md"
                className="h-9 w-9"
                icon={<RefreshCw size={18} />}
              />
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
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-200 bg-background",
            view === "assets" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          )}
        >
          <AssetGenerator />
        </div>
      </div>
    </div>
  )
})
