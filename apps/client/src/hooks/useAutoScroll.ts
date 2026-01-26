import { useEffect, useRef } from "react"

/**
 * Hook to automatically scroll to bottom when dependencies change
 */
export function useAutoScroll(dependencies: unknown[]) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, dependencies)

  return scrollRef
}
