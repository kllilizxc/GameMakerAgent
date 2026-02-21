import { useRef } from "react"
import { cn } from "@/lib/utils"
import { PromptPanel } from "./PromptPanel"
import { WorkspaceArea } from "./WorkspaceArea"
import { usePromptPanelAnimation } from "@/hooks/usePromptPanelAnimation"
import { useResizable } from "@/hooks/useResizable"
import { useFileSync } from "@/hooks/useFileSync"

export function AppShell() {
  const { layoutMode, isHiding, isEntering } = usePromptPanelAnimation()

  // Sync files store → WebContainer
  useFileSync()

  // Sidebar resize logic
  const { width: sidebarWidth, isResizing, startResizing } = useResizable({
    initialWidth: 320,
    minWidth: 260,
    maxWidth: 600,
    storageKey: "sidebar-width",
  })

  const sidebarRef = useRef<HTMLElement>(null)

  return (
    <div className="h-dvh w-full flex flex-row overflow-hidden relative">
      {/* Sidebar/PromptPanel Container (Desktop) */}
      <aside
        ref={sidebarRef}
        className={cn(
          "rounded-r-[16px] ease-in-out flex-shrink-0 flex flex-col z-50 overflow-visible shadow-lg relative",
          isResizing ? "transition-none duration-0" : "transition-all duration-300",
          (isHiding || isEntering) ? "-translate-x-full" : "translate-x-0",
          (layoutMode === 'mobile')
            ? "w-0 border-r-0"
            : "border-r border-border" // Width handled by style
        )}
      >
        {layoutMode === 'desktop' && (
          <>
            <div
              className={cn(
                "h-full flex flex-col"
              )}
              style={{ width: sidebarWidth }}
            >
              <PromptPanel mobile={false} />
            </div>

            {/* Resize Handle */}
            <div
              className={cn(
                "absolute top-[45%] -right-[8px] w-[16px] h-[10%] rounded-[8px] bg-secondary border border-border shadow-sm cursor-col-resize z-50",
              )}
              onMouseDown={startResizing}
              onTouchStart={startResizing}
            />
          </>
        )}
      </aside>

      {/* Main workspace area */}
      <main
        className={cn(
          "flex-1 flex flex-col min-w-0 relative bg-background",
          isResizing && "pointer-events-none select-none" // Prevent iframe capture during resize
        )}
      >
        <WorkspaceArea />

        {/* Mobile Prompt Panel */}
        {layoutMode === 'mobile' && (
          <div
            className={cn(
              "fixed bottom-0 left-0 right-0 h-auto max-h-[85vh] bg-background border-t border-border rounded-t-xl shadow-2xl z-50 safe-bottom transition-all duration-500 ease-in-out",
              (isHiding || isEntering) ? "translate-y-full" : "translate-y-0"
            )}
          >
            <PromptPanel mobile={true} />
          </div>
        )}
      </main>
    </div>
  )
}

