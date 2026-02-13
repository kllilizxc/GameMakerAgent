import { useState, useEffect } from "react"

interface UseResizableOptions {
    initialWidth?: number
    minWidth?: number
    maxWidth?: number
    direction?: "horizontal" | "vertical" // For future extensibility
}

export function useResizable({
    initialWidth = 320,
    minWidth = 260,
    maxWidth = 600,
}: UseResizableOptions = {}) {
    const [width, setWidth] = useState(initialWidth)
    const [isResizing, setIsResizing] = useState(false)

    const startResizing = (e: React.MouseEvent) => {
        e.preventDefault()
        setIsResizing(true)
    }

    useEffect(() => {
        if (!isResizing) return

        const handleMouseMove = (e: MouseEvent) => {
            e.preventDefault()
            const newWidth = Math.max(minWidth, Math.min(e.clientX, maxWidth))
            setWidth(newWidth)
        }

        const handleMouseUp = () => {
            setIsResizing(false)
            document.body.style.cursor = "default"
        }

        document.addEventListener("mousemove", handleMouseMove)
        document.addEventListener("mouseup", handleMouseUp)
        document.body.style.cursor = "col-resize"

        return () => {
            document.removeEventListener("mousemove", handleMouseMove)
            document.removeEventListener("mouseup", handleMouseUp)
            document.body.style.cursor = "default"
        }
    }, [isResizing, minWidth, maxWidth])

    return {
        width,
        isResizing,
        startResizing,
        setWidth, // Expose setter if needed
    }
}
