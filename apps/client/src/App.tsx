import { useEffect, useRef } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { TemplateSelector } from "@/components/layout/TemplateSelector"
import { useSessionStore } from "@/stores/session"
import { useFilesStore } from "@/stores/files"
import { useWebContainer } from "@/hooks/useWebContainer"

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "ws://localhost:3001"

export function App() {
  const connect = useSessionStore((s) => s.connect)
  const fetchTemplates = useSessionStore((s) => s.fetchTemplates)
  const sessionId = useSessionStore((s) => s.sessionId)
  const ws = useSessionStore((s) => s.ws)
  const files = useFilesStore((s) => s.files)
  const hasConnected = useRef(false)
  const hasBooted = useRef(false)
  const prevFilesRef = useRef<Map<string, string>>(new Map())

  const { boot, writeFiles, installDeps, startDevServer, applyFilePatch } = useWebContainer()

  // Connect to server
  useEffect(() => {
    // Fetch templates immediately
    fetchTemplates()
  }, [fetchTemplates])

  // Boot WebContainer and sync files
  useEffect(() => {
    // Only boot if we have files (snapshot received)
    if (files.size === 0) return

    const syncFiles = async () => {
      // First time - boot and write all files
      if (!hasBooted.current) {
        hasBooted.current = true
        console.log("[wc] Booting WebContainer...")
        await boot()

        const fileObj: Record<string, string> = {}
        files.forEach((content, path) => {
          fileObj[path] = content
        })

        console.log("[wc] Writing initial files:", Object.keys(fileObj).length)
        await writeFiles(fileObj)

        console.log("[wc] Installing deps...")
        await installDeps()

        console.log("[wc] Starting dev server...")
        await startDevServer()

        prevFilesRef.current = new Map(files)
        return
      }

      // Subsequent changes - apply patches
      const prev = prevFilesRef.current

      for (const [path, content] of files) {
        if (prev.get(path) !== content) {
          console.log("[wc] Applying patch:", path)
          await applyFilePatch({ op: "write", path, content })
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
  }, [files, boot, writeFiles, installDeps, startDevServer, applyFilePatch])

  if (!sessionId) {
    return <TemplateSelector />
  }

  return <AppShell />
}
