import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { PromptPanel } from "./PromptPanel"
import { WorkspaceArea } from "./WorkspaceArea"
import { useWebContainer } from "@/hooks/useWebContainer"
import { useFilesStore } from "@/stores/files"
import { usePreviewStore } from "@/stores/preview"

export function AppShell() {
  const [isMobile, setIsMobile] = useState(false)
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
      {/* Loading overlay */}
      {/* <LoadingOverlay /> */}

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
          <div className="absolute bottom-0 left-0 right-0 safe-bottom z-50">
            <PromptPanel mobile />
          </div>
        )}
      </main>
    </div>
  )
}

