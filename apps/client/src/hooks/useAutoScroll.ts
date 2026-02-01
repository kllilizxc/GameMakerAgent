import { useEffect, useRef } from "react"

/**
 * Hook to automatically scroll to top when dependencies change (for Latest at Top view)
 */
export function useAutoScroll(dependencies: unknown[]) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const container = el.parentElement
    if (!container) return

    // Stick to top logic (Latest at Top):
    // If we are already near top (within 200px), scroll to top.

    // Check if near top
    const isNearTop = container.scrollTop < 200

    // Force scroll if it looks like an initial load
    // For Latest at Top, initial load scrollTop is 0, which matches isNearTop.

    if (isNearTop) {
      el.scrollIntoView({ behavior: "instant" })
    }
  }, dependencies)

  return scrollRef
}
