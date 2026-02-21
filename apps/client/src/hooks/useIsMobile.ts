import { useState, useEffect } from "react"

/**
 * Hook to detect if the screen is mobile based on a breakpoint
 */
export function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(
        typeof window !== "undefined" ? window.innerWidth < breakpoint : false
    )

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < breakpoint)
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [breakpoint])

    return isMobile
}
