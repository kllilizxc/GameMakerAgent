import { useEffect, useRef } from "react"
import { usePreviewStore } from "@/stores/preview"
import { Loader2, AlertCircle, Gamepad2 } from "lucide-react"

export function GamePreview() {
  const { url, status, error, refreshKey } = usePreviewStore()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (iframeRef.current && url) {
      iframeRef.current.src = url
    }
  }, [url, refreshKey])

  if (status === "booting" || status === "installing") {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 size={32} className="animate-spin mb-4" />
        <p className="text-sm">
          {status === "booting" ? "Starting environment..." : "Installing dependencies..."}
        </p>
      </div>
    )
  }

  if (status === "error" && error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-destructive">
        <AlertCircle size={32} className="mb-4" />
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (!url) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <Gamepad2 size={48} className="mb-4 opacity-50" />
        <p className="text-sm">No preview available</p>
        <p className="text-xs mt-1">Send a prompt to start building your game</p>
      </div>
    )
  }

  return (
    <iframe
      ref={iframeRef}
      className="w-full h-full border-0 bg-black"
      title="Game Preview"
      sandbox="allow-scripts allow-same-origin allow-forms"
    />
  )
}
