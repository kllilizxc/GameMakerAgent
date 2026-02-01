import { useRef, useCallback } from "react"
import { throttle } from "lodash"

interface UseInfiniteLoaderOptions {
    threshold?: number
    throttleMs?: number
}

export function useInfiniteLoader(
    callback: () => void,
    shouldLoad: boolean,
    options: UseInfiniteLoaderOptions = {}
) {
    const { threshold = 0.1, throttleMs = 1000 } = options

    const observerRef = useRef<IntersectionObserver>()
    const scrollParentRef = useRef<HTMLElement | null>(null)

    // Memoize the throttled callback
    const throttledCallback = useCallback(
        throttle((entries: IntersectionObserverEntry[]) => {
            if (entries[0].isIntersecting && shouldLoad) {
                callback()
            }
        }, throttleMs),
        [callback, shouldLoad, throttleMs]
    )

    const setTarget = useCallback(
        (node: HTMLElement | null, scrollContainer = node?.parentElement?.parentElement) => {
            if (observerRef.current) {
                observerRef.current.disconnect()
            }

            // Capture scroll container reference (parent of parent usually for this list structure)
            if (scrollContainer) {
                scrollParentRef.current = scrollContainer
            }

            if (node && shouldLoad) {
                observerRef.current = new IntersectionObserver(throttledCallback, {
                    threshold,
                })
                observerRef.current.observe(node)
            }
        },
        [shouldLoad, throttledCallback, threshold]
    )

    // Return the scroll parent ref so it can be shared with scroll restoration
    return { setTarget, scrollParentRef }
}
