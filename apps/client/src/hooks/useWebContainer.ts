import { useEffect, useRef, useState, useCallback } from "react"
import { WebContainer } from "@webcontainer/api"
import { usePreviewStore } from "@/stores/preview"

let webcontainerInstance: WebContainer | null = null
let bootPromise: Promise<WebContainer> | null = null

export async function getWebContainer(): Promise<WebContainer> {
  if (webcontainerInstance) return webcontainerInstance

  if (!bootPromise) {
    bootPromise = WebContainer.boot()
  }

  webcontainerInstance = await bootPromise
  return webcontainerInstance
}

// Eagerly start booting as soon as the module is imported.
// This runs in parallel with React rendering and file loading,
// shaving ~2-3s off the perceived startup time.
getWebContainer()

export function useWebContainer() {
  const [isReady, setIsReady] = useState(false)
  const serverProcessRef = useRef<{ kill: () => void } | null>(null)
  const installProcessRef = useRef<{ kill: () => void } | null>(null)

  // Only subscribe to actions — they are stable refs and won't cause re-renders
  const setUrl = usePreviewStore((s) => s.setUrl)
  const setStatus = usePreviewStore((s) => s.setStatus)
  const setError = usePreviewStore((s) => s.setError)
  const addLog = usePreviewStore((s) => s.addLog)

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

    // Try npm ci first (fast, lockfile-based), fall back to npm install
    const strategies = [
      { cmd: "ci", args: ["ci"], label: "npm ci" },
      { cmd: "install", args: ["install", "--prefer-offline"], label: "npm install --prefer-offline" },
    ]

    for (const { args, label } of strategies) {
      addLog("log", `Running ${label}...`)

      const installProcess = await wc.spawn("npm", args, {
        env: {
          CI: "true",
          npm_config_progress: "false",
          TERM: "dumb",
        },
      })
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

      if (exitCode === 0) {
        addLog("log", "Dependencies installed")
        return true
      }

      addLog("log", `${label} failed (exit ${exitCode}), trying next strategy...`)
    }

    setError("Failed to install dependencies")
    addLog("error", "All install strategies failed")
    return false
  }, [setStatus, setError, addLog])

  const startDevServer = useCallback(async () => {
    const wc = await getWebContainer()
    if (!wc) return

    addLog("log", "Starting dev server...")

    // Kill existing server if any
    if (serverProcessRef.current) {
      serverProcessRef.current.kill()
    }

    const serverProcess = await wc.spawn("npm", ["run", "dev"], {
      env: {
        CI: "true",
        npm_config_progress: "false",
        TERM: "dumb",
      },
    })
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
    async (patch: { op: "write" | "delete" | "mkdir"; path: string; content?: string; encoding?: "utf-8" | "base64" }) => {
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

              if (patch.encoding === "base64") {
                // Convert base64 to Uint8Array
                const binaryString = atob(patch.content)
                const bytes = new Uint8Array(binaryString.length)
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i)
                }
                await wc.fs.writeFile(patch.path, bytes)
              } else {
                await wc.fs.writeFile(patch.path, patch.content)
              }
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
        // useFilesStore.getState().applyPatch(patch) -- REMOVED to avoid loop with useFileSync
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to apply patch"
        addLog("error", message)
      }
    },
    [addLog]
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
