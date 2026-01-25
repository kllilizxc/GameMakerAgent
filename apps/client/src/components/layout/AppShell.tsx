import { useState } from "react"
import { cn } from "@/lib/utils"
import { PromptPanel } from "./PromptPanel"
import { WorkspaceArea } from "./WorkspaceArea"

export function AppShell() {
  const [isMobile, setIsMobile] = useState(false)

  // Check for mobile on mount and resize
  if (typeof window !== "undefined") {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    if (!isMobile && window.innerWidth < 768) checkMobile()
    window.addEventListener("resize", checkMobile)
  }

  return (
    <div
      className={cn(
        "h-dvh w-full flex",
        isMobile ? "flex-col" : "flex-row"
      )}
    >
      {/* Desktop: Left panel | Mobile: rendered at bottom */}
      {!isMobile && (
        <aside className="w-80 border-r border-border flex-shrink-0 flex flex-col">
          <PromptPanel />
        </aside>
      )}

      {/* Main workspace area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <WorkspaceArea />

        {/* Mobile: Bottom prompt panel */}
        {isMobile && (
          <div className="absolute bottom-0 left-0 right-0 safe-bottom">
            <PromptPanel mobile />
          </div>
        )}
      </main>
    </div>
  )
}
