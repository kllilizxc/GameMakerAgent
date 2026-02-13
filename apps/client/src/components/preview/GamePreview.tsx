import React, { useEffect, useRef } from "react"
import { usePreviewStore } from "@/stores/preview"
import { Loader2, AlertCircle, Gamepad2 } from "lucide-react"

interface GamePreviewProps {
  width?: number
  height?: number
}

export function GamePreview({ width = 800, height = 600 }: GamePreviewProps) {
  const { url, status, error, refreshKey } = usePreviewStore()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (iframeRef.current && url) {
      iframeRef.current.src = url
    }
  }, [url, refreshKey])

  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState(1)

  useEffect(() => {
    if (!containerRef.current) return

    const updateScale = () => {
      if (!containerRef.current) return
      const container = containerRef.current
      const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect()

      // Calculate scale to fit
      const scaleX = containerWidth / width
      const scaleY = containerHeight / height
      const newScale = Math.min(scaleX, scaleY)

      setScale(newScale)
    }

    const observer = new ResizeObserver(updateScale)
    observer.observe(containerRef.current)

    // Initial calculation
    updateScale()

    return () => observer.disconnect()
  }, [width, height, containerRef.current])

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
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden bg-black relative"
    >
      <div
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className="shrink-0"
      >
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0 bg-white"
          title="Game Preview"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
    </div>
  )
}
