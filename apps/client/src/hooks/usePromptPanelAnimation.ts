import { useState, useEffect } from "react"
import { useIsMobile } from "./useIsMobile"

export type LayoutMode = "desktop" | "mobile"

interface UsePromptPanelAnimationOptions {
    mobileBreakpoint?: number
}

/**
 * Hook to manage sequenced transitions between desktop and mobile layouts for the PromptPanel
 */
export function usePromptPanelAnimation({
    mobileBreakpoint = 768,
}: UsePromptPanelAnimationOptions = {}) {
    const isMobile = useIsMobile(mobileBreakpoint)
    const [layoutMode, setLayoutMode] = useState<LayoutMode>(isMobile ? "mobile" : "desktop")
    const [isHiding, setIsHiding] = useState(false)
    const [isEntering, setIsEntering] = useState(false)

    // Sequence the transition: Hide -> Swap -> Enter
    useEffect(() => {
        // If current mode matches target, do nothing
        if (isMobile === (layoutMode === "mobile")) return

        setIsHiding(true)
        const hideTimer = setTimeout(() => {
            setLayoutMode(isMobile ? "mobile" : "desktop")
            setIsHiding(false)
            setIsEntering(true)

            // Short delay to let the DOM update before starting the "enter" animation
            const enterTimer = setTimeout(() => {
                setIsEntering(false)
            }, 50)

            return () => clearTimeout(enterTimer)
        }, 400)

        return () => clearTimeout(hideTimer)
    }, [isMobile, layoutMode])

    const isTransitioning = isHiding || isEntering

    return {
        isMobile,
        layoutMode,
        isTransitioning,
        isHiding,
        isEntering,
    }
}
