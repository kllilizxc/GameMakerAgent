import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { PromptPanel } from "./PromptPanel"
import { WorkspaceArea } from "./WorkspaceArea"
import { useWebContainer } from "@/hooks/useWebContainer"
import { useFilesStore } from "@/stores/files"
import { usePreviewStore } from "@/stores/preview"
import { usePromptPanelAnimation } from "@/hooks/usePromptPanelAnimation"

export function AppShell() {
  const { layoutMode, isHiding, isEntering } = usePromptPanelAnimation()
  const files = useFilesStore((s) => s.files)
  const wcStatus = usePreviewStore((s) => s.status)
  const hasBooted = useRef(false)
  const prevFilesRef = useRef<Map<string, { content: string; encoding: "utf-8" | "base64" }>>(new Map())

  const { boot, writeFiles, installDeps, startDevServer, applyFilePatch } = useWebContainer()

  // Check if WebContainer is fully ready
  const isWcReady = wcStatus === "running"

  // Boot WebContainer and sync files
  useEffect(() => {
    // Only boot if we have files (snapshot received)
    if (files.size === 0) return

    // Don't apply patches until WC is fully ready
    if (!isWcReady && hasBooted.current) {
      console.log("[wc] Skipping patch - not ready yet")
      return
    }

    const syncFiles = async () => {
      // First time - boot and write all files
      if (!hasBooted.current) {
        hasBooted.current = true
        console.log("[wc] Booting WebContainer...")
        await boot()

        const fileObj: Record<string, string> = {}
        const binaryFiles: Record<string, string> = {}

        files.forEach((entry, path) => {
          if (entry.encoding === "base64") {
            // We can't batch write binary files easily with writeFiles if it only takes string
            // But useWebContainer writeFiles writes everything with fs.writeFile
            // If we pass strings, it writes strings. 
            // We need to handle binary batch writing? 
            // Actually useWebContainer.writeFiles is simple loop. 
            // Let's just use manual loop here for binary or update writeFiles.
            // useWebContainer.writeFiles takes Record<string, string>.
            // We can't pass byte arrays. 
            // So we should iterate manually or rely on applyFilePatch?
            // No, writeFiles is for batch init.
            // Let's iterate here.
            binaryFiles[path] = entry.content
          } else {
            fileObj[path] = entry.content
          }
        })

        console.log("[wc] Writing initial files:", Object.keys(fileObj).length)
        if (Object.keys(fileObj).length > 0) {
          await writeFiles(fileObj)
        }

        // Handle binary files
        for (const [path, content] of Object.entries(binaryFiles)) {
          await applyFilePatch({
            op: "write",
            path,
            content,
            encoding: "base64"
          })
        }

        console.log("[wc] Installing deps...")
        await installDeps()

        console.log("[wc] Starting dev server...")
        await startDevServer()

        prevFilesRef.current = new Map(files)
        return
      }

      // Subsequent changes - apply patches
      const prev = prevFilesRef.current

      for (const [path, entry] of files) {
        const prevEntry = prev.get(path)
        if (!prevEntry || prevEntry.content !== entry.content) {
          console.log("[wc] Applying patch:", path)
          await applyFilePatch({
            op: "write",
            path,
            content: entry.content,
            encoding: entry.encoding
          })
        }
      }

      for (const path of prev.keys()) {
        if (!files.has(path)) {
          console.log("[wc] Deleting:", path)
          await applyFilePatch({ op: "delete", path })
        }
      }

      prevFilesRef.current = new Map(files)
    }

    syncFiles()
  }, [files, isWcReady, boot, writeFiles, installDeps, startDevServer, applyFilePatch])

  return (
    <div className="h-dvh w-full flex flex-row overflow-hidden relative">
      {/* Sidebar/PromptPanel Container (Desktop) */}
      <aside
        className={cn(
          "transition-all duration-500 ease-in-out flex-shrink-0 flex flex-col z-50 overflow-hidden",
          (layoutMode === 'mobile' || isHiding || isEntering)
            ? "w-0 border-r-0"
            : "w-80 border-r border-border"
        )}
      >
        {layoutMode === 'desktop' && (
          <div
            className={cn(
              "transition-all duration-500 ease-in-out h-full flex flex-col w-80",
              (isHiding || isEntering) ? "-translate-x-full" : "translate-x-0"
            )}
          >
            <PromptPanel mobile={false} />
          </div>
        )}
      </aside>

      {/* Main workspace area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
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

