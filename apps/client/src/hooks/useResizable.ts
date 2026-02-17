import { useState, useEffect, useRef } from "react"

interface UseResizableOptions {
    initialWidth?: number
    minWidth?: number
    maxWidth?: number
    direction?: "horizontal" | "vertical" // For future extensibility
    storageKey?: string
}

export function useResizable({
    initialWidth = 320,
    minWidth = 260,
    maxWidth = 600,
    storageKey,
}: UseResizableOptions = {}) {
    const [width, setWidth] = useState(() => {
        if (storageKey) {
            try {
                const stored = localStorage.getItem(storageKey)
                if (stored) {
                    const parsed = parseInt(stored, 10)
                    if (!isNaN(parsed)) {
                        return Math.max(minWidth, Math.min(parsed, maxWidth))
                    }
                }
            } catch (e) {
                console.error("Failed to load resize width from storage:", e)
            }
        }
        return initialWidth
    })
    const [isResizing, setIsResizing] = useState(false)
    const widthRef = useRef(width)

    // Keep ref in sync with state for event handlers
    useEffect(() => {
        widthRef.current = width
    }, [width])

    const startResizing = (e: React.MouseEvent | React.TouchEvent) => {
        // Prevent text selection on start for mouse
        if ('button' in e) {
            e.preventDefault()
        }
        setIsResizing(true)
    }

    useEffect(() => {
        if (!isResizing) return

        const getClientX = (e: MouseEvent | TouchEvent) => {
            if ('touches' in e) {
                return e.touches[0]?.clientX || 0
            }
            return (e as MouseEvent).clientX
        }

        const handleMove = (e: MouseEvent | TouchEvent) => {
            const clientX = getClientX(e)
            const newWidth = Math.max(minWidth, Math.min(clientX, maxWidth))
            setWidth(newWidth)
        }

        const handleEnd = () => {
            setIsResizing(false)
            document.body.style.cursor = "default"
            document.body.style.userSelect = "auto"

            if (storageKey) {
                try {
                    localStorage.setItem(storageKey, widthRef.current.toString())
                } catch (e) {
                    console.error("Failed to save resize width to storage:", e)
                }
            }
        }

        document.addEventListener("mousemove", handleMove)
        document.addEventListener("mouseup", handleEnd)
        document.addEventListener("touchmove", handleMove)
        document.addEventListener("touchend", handleEnd)

        document.body.style.cursor = "col-resize"
        document.body.style.userSelect = "none" // Prevent text selection during resize

        return () => {
            document.removeEventListener("mousemove", handleMove)
            document.removeEventListener("mouseup", handleEnd)
            document.removeEventListener("touchmove", handleMove)
            document.removeEventListener("touchend", handleEnd)
            document.body.style.cursor = "default"
            document.body.style.userSelect = "auto"
        }
    }, [isResizing, minWidth, maxWidth, storageKey])

    return {
        width,
        isResizing,
        startResizing,
        setWidth, // Expose setter if needed
    }
}
