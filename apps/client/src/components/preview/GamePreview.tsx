import React, { memo, useEffect, useRef, useCallback } from "react"
import { usePreviewStore } from "@/stores/preview"
import { useIsMobile } from "@/hooks/useIsMobile"
import { cn } from "@/lib/utils"
import { Loader2, AlertCircle, Gamepad2 } from "lucide-react"

interface GamePreviewProps {
  width?: number
  height?: number
}

export const GamePreview = memo(function GamePreview({ width = 800, height = 600 }: GamePreviewProps) {
  const url = usePreviewStore((s) => s.url)
  const status = usePreviewStore((s) => s.status)
  const error = usePreviewStore((s) => s.error)
  const refreshKey = usePreviewStore((s) => s.refreshKey)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (iframeRef.current && url) {
      iframeRef.current.src = url
    }
  }, [url, refreshKey])

  // Listen for runtime errors from the iframe (injected script)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Debug log to trace messages
      if (event.data?.type?.startsWith('preview-')) {
        console.log("[GamePreview] Received message:", event.data);
      }

      if (typeof event.data === "object") {
        if (event.data?.type === "preview-error") {
          usePreviewStore.getState().addLog("error", event.data.message)
        } else if (event.data?.type === "preview-warn") {
          usePreviewStore.getState().addLog("warn", event.data.message)
        } else if (event.data?.type === "preview-log") {
          usePreviewStore.getState().addLog("log", event.data.message)
        }
      }
    }
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState(1)
  const rafRef = useRef<number>(0)

  const updateScale = useCallback(() => {
    if (!containerRef.current) return
    const { width: containerWidth, height: containerHeight } = containerRef.current.getBoundingClientRect()
    const scaleX = containerWidth / width
    const scaleY = containerHeight / height
    setScale(Math.min(scaleX, scaleY))
  }, [width, height])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updateScale)
    })
    observer.observe(el)
    updateScale()

    return () => {
      observer.disconnect()
      cancelAnimationFrame(rafRef.current)
    }
  }, [updateScale, status, url]) // Re-run when status/url changes so observer is set up after early returns

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
      className={cn(
        "w-full h-full flex justify-center overflow-hidden bg-black relative",
        isMobile ? "items-start pt-8" : "items-center"
      )}
    >
      <div
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: isMobile ? 'top center' : 'center center',
        }}
        className="shrink-0"
      >
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          title="Game Preview"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
    </div>
  )
})
