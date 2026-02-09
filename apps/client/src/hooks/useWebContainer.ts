import { useEffect, useRef, useState, useCallback } from "react"
import { WebContainer } from "@webcontainer/api"
import { useFilesStore } from "@/stores/files"
import { usePreviewStore } from "@/stores/preview"

let webcontainerInstance: WebContainer | null = null
let bootPromise: Promise<WebContainer> | null = null

async function getWebContainer(): Promise<WebContainer> {
  if (webcontainerInstance) return webcontainerInstance

  if (!bootPromise) {
    bootPromise = WebContainer.boot()
  }

  webcontainerInstance = await bootPromise
  return webcontainerInstance
}

export function useWebContainer() {
  const [isReady, setIsReady] = useState(false)
  const serverProcessRef = useRef<{ kill: () => void } | null>(null)
  const installProcessRef = useRef<{ kill: () => void } | null>(null)
  const { files: _files, applyPatch } = useFilesStore()
  const { setUrl, setStatus, setError, addLog } = usePreviewStore()

  const boot = useCallback(async () => {
    try {
      setStatus("booting")
      addLog("log", "Booting WebContainer...")

      const wc = await getWebContainer()

      addLog("log", "WebContainer ready")
      setIsReady(true)

      return wc
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to boot WebContainer"
      setError(message)
      addLog("error", message)
      return null
    }
  }, [setStatus, setError, addLog])

  const writeFiles = useCallback(
    async (fileMap: Record<string, string>) => {
      const wc = await getWebContainer()
      if (!wc) return

      for (const [path, content] of Object.entries(fileMap)) {
        const parts = path.split("/")
        parts.pop() // Remove filename, keep directory parts
        const dir = parts.join("/")

        if (dir) {
          await wc.fs.mkdir(dir, { recursive: true })
        }

        await wc.fs.writeFile(path, content)
      }

      addLog("log", `Wrote ${Object.keys(fileMap).length} files`)
    },
    [addLog]
  )

  const installDeps = useCallback(async () => {
    const wc = await getWebContainer()
    if (!wc) return false

    setStatus("installing")
    addLog("log", "Installing dependencies...")

    const installProcess = await wc.spawn("npm", ["install"])
    installProcessRef.current = installProcess

    installProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          addLog("log", data)
        },
      })
    )

    const exitCode = await installProcess.exit
    installProcessRef.current = null

    if (exitCode !== 0) {
      setError("Failed to install dependencies")
      addLog("error", `npm install failed with exit code ${exitCode}`)
      return false
    }

    addLog("log", "Dependencies installed")
    return true
  }, [setStatus, setError, addLog])

  const startDevServer = useCallback(async () => {
    const wc = await getWebContainer()
    if (!wc) return

    addLog("log", "Starting dev server...")

    // Kill existing server if any
    if (serverProcessRef.current) {
      serverProcessRef.current.kill()
    }

    const serverProcess = await wc.spawn("npm", ["run", "dev"])
    serverProcessRef.current = serverProcess

    serverProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          addLog("log", data)
        },
      })
    )

    // Wait for server-ready event
    wc.on("server-ready", (_port, url) => {
      addLog("log", `Dev server ready at ${url}`)
      setUrl(url)
      setStatus("running")
    })
  }, [setUrl, setStatus, addLog])

  const applyFilePatch = useCallback(
    async (patch: { op: "write" | "delete" | "mkdir"; path: string; content?: string }) => {
      const wc = await getWebContainer()
      if (!wc) return

      try {
        switch (patch.op) {
          case "write":
            if (patch.content !== undefined) {
              const parts = patch.path.split("/")
              parts.pop()
              const dir = parts.join("/")
              if (dir) {
                await wc.fs.mkdir(dir, { recursive: true })
              }
              await wc.fs.writeFile(patch.path, patch.content)
            }
            break
          case "delete":
            await wc.fs.rm(patch.path, { recursive: true })
            break
          case "mkdir":
            await wc.fs.mkdir(patch.path, { recursive: true })
            break
        }

        // Also update local store
        applyPatch(patch)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to apply patch"
        addLog("error", message)
      }
    },
    [applyPatch, addLog]
  )

  const teardown = useCallback(() => {
    if (serverProcessRef.current) {
      serverProcessRef.current.kill()
      serverProcessRef.current = null
    }
    if (installProcessRef.current) {
      installProcessRef.current.kill()
      installProcessRef.current = null
    }
    setUrl(null)
    setStatus("idle")
  }, [setUrl, setStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      teardown()
    }
  }, [teardown])

  return {
    isReady,
    boot,
    writeFiles,
    installDeps,
    startDevServer,
    applyFilePatch,
    teardown,
  }
}
