import { useEffect, useCallback } from "react"
import { useSessionStore } from "@/stores/session"
import { useFilesStore } from "@/stores/files"
import { useWebContainer } from "./useWebContainer"
import { SERVER_URL } from "@/lib/constants"

export function useSession() {
  const session = useSessionStore()
  const { setSnapshot } = useFilesStore()
  const webContainer = useWebContainer()

  const initialize = useCallback(async () => {
    // Boot WebContainer first
    await webContainer.boot()

    // Connect to server
    session.connect(SERVER_URL.replace(/^http/, "ws"))
  }, [session, webContainer])

  // Handle incoming server messages for file patches
  useEffect(() => {
    const ws = session.ws
    if (!ws) return

    const handleMessage = async (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data)

        switch (msg.type) {
          case "fs/snapshot":
            // Initial file snapshot
            setSnapshot(msg.files)
            await webContainer.writeFiles(msg.files)
            await webContainer.installDeps()
            await webContainer.startDevServer()
            break

          case "fs/patch":
            // File patch from agent
            for (const patch of msg.patches) {
              await webContainer.applyFilePatch(patch)
            }
            break
        }
      } catch (e) {
        console.error("Failed to handle message:", e)
      }
    }

    ws.addEventListener("message", handleMessage)
    return () => ws.removeEventListener("message", handleMessage)
  }, [session.ws, setSnapshot, webContainer])

  return {
    ...session,
    initialize,
    webContainer,
  }
}
