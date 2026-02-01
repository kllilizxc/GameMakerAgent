import { useRef, useLayoutEffect, DependencyList } from "react"

export function useScrollRestoration(dependencies: DependencyList) {
    const scrollContainerRef = useRef<HTMLElement | null>(null)
    const prevScrollHeightRef = useRef<number>(0)
    const isRestoringRef = useRef(false)

    const captureScroll = () => {
        const container = scrollContainerRef.current
        if (container) {
            prevScrollHeightRef.current = container.scrollHeight
            isRestoringRef.current = true
        }
    }

    const setScrollContainer = (element: HTMLElement | null) => {
        scrollContainerRef.current = element
    }

    useLayoutEffect(() => {
        if (isRestoringRef.current && scrollContainerRef.current) {
            const container = scrollContainerRef.current
            const newScrollHeight = container.scrollHeight
            const diff = newScrollHeight - prevScrollHeightRef.current

            if (diff > 0) {
                container.scrollTop += diff
            }
            isRestoringRef.current = false
        }
    }, dependencies)

    return { setScrollContainer, captureScroll }
}
