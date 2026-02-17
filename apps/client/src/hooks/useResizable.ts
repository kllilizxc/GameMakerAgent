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
            // Prevent default to stop scrolling while resizing
            if (e.type === 'touchmove') {
                // Passive listener issue might occur if we preventDefault in some browsers, 
                // but for resizing we usually want to stop scroll.
                // However, React's synthetic event wrapper might be passive by default? 
                // We are adding native listener here.
            }
            // e.preventDefault() 

            const clientX = getClientX(e)
            const newWidth = Math.max(minWidth, Math.min(clientX, maxWidth))
            setWidth(newWidth)
        }

        const handleEnd = () => {
            setIsResizing(false)
            document.body.style.cursor = "default"
            document.body.style.userSelect = "auto"
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
    }, [isResizing, minWidth, maxWidth])

    return {
        width,
        isResizing,
        startResizing,
        setWidth, // Expose setter if needed
    }
}
