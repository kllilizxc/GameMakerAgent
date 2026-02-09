import { useRef, useState, useEffect, useCallback, useMemo } from "react"
import { throttle } from "lodash"
import type { Message, Activity } from "@/types/session"

interface UseMessageScrollOptions {
    messages: Message[]
    activities: Activity[]
    onLoadMore: () => void
    hasMore: boolean
    isLoadingMore: boolean
}

interface UseMessageScrollReturn {
    scrollContainerRef: React.RefObject<HTMLDivElement>
    contentRef: React.RefObject<HTMLDivElement>
    scrollToBottom: (behavior?: ScrollBehavior) => void
    isAtBottom: boolean
}

const BOTTOM_THRESHOLD = 100 // px from bottom to consider "at bottom"
const LOAD_MORE_THRESHOLD = 50 // px from top to trigger load more
const SCROLL_THROTTLE_MS = 500 // throttle scroll handler

/**
 * Hook to detect message list changes - prepended items, new messages at end, etc.
 * Returns current state and update functions to track changes.
 */
export function useMessageChangeDetection(messages: Message[]) {
    const prevFirstMsgIdRef = useRef<string | null>(null)
    const prevLastMsgIdRef = useRef<string | null>(null)

    const lastMsg = messages[messages.length - 1]
    const firstMsg = messages[0]

    // Detect if items were prepended (load more)
    const itemsPrepended = firstMsg &&
        prevFirstMsgIdRef.current !== null &&
        prevFirstMsgIdRef.current !== firstMsg.id

    // Detect new message at the end
    const newMessageAtEnd = lastMsg &&
        prevLastMsgIdRef.current !== null &&
        prevLastMsgIdRef.current !== lastMsg.id

    // Is it a user message (they just sent it)
    const isNewUserMessage = newMessageAtEnd && lastMsg?.role === "user"

    // Is it an assistant/agent message
    const isNewAgentMessage = newMessageAtEnd && lastMsg?.role === "agent"

    // Update tracking refs - call this after you've handled the change
    const updateRefs = useCallback(() => {
        prevFirstMsgIdRef.current = firstMsg?.id ?? null
        prevLastMsgIdRef.current = lastMsg?.id ?? null
    }, [firstMsg?.id, lastMsg?.id])

    return {
        itemsPrepended,
        newMessageAtEnd,
        isNewUserMessage,
        isNewAgentMessage,
        lastMsg,
        firstMsg,
        updateRefs,
    }
}

export function useMessageScroll({
    messages,
    activities,
    onLoadMore,
    hasMore,
    isLoadingMore,
}: UseMessageScrollOptions): UseMessageScrollReturn {
    const scrollContainerRef = useRef<HTMLDivElement | null>(null)
    const contentRef = useRef<HTMLDivElement | null>(null)

    // Scroll state
    const [isAtBottom, setIsAtBottom] = useState(true)

    // Refs for tracking scroll position
    const prevScrollBottomRef = useRef(0)

    // Use the message change detection hook
    const {
        itemsPrepended,
        newMessageAtEnd,
        isNewUserMessage,
        updateRefs,
    } = useMessageChangeDetection(messages)

    // Scroll to bottom helper
    const scrollToBottom = useCallback((behavior: ScrollBehavior = "instant") => {
        const container = scrollContainerRef.current
        if (!container) return

        if (behavior === "instant") {
            container.scrollTop = container.scrollHeight
        } else {
            container.scrollTo({
                top: container.scrollHeight,
                behavior,
            })
        }
    }, [])

    // Handle scroll event - track if at bottom & trigger load more (throttled with lodash)
    const handleScroll = useMemo(
        () =>
            throttle(() => {
                const container = scrollContainerRef.current
                if (!container) return

                const { scrollTop, scrollHeight, clientHeight } = container

                // Check if at bottom (within threshold)
                const distanceFromBottom = scrollHeight - clientHeight - scrollTop
                setIsAtBottom(distanceFromBottom < BOTTOM_THRESHOLD)

                // Trigger load more when near top
                if (scrollTop < LOAD_MORE_THRESHOLD && hasMore && !isLoadingMore) {
                    onLoadMore()
                }
            }, SCROLL_THROTTLE_MS),
        [hasMore, isLoadingMore, onLoadMore]
    )

    // Cleanup throttle on unmount
    useEffect(() => {
        return () => handleScroll.cancel()
    }, [handleScroll])

    // Attach scroll listener
    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return

        container.addEventListener("scroll", handleScroll)
        return () => container.removeEventListener("scroll", handleScroll)
    }, [handleScroll])

    // BEHAVIOR 1: Scroll preservation after loading more
    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return

        // Check if loading just finished
        if (!isLoadingMore && itemsPrepended) {
            // Calculate new scroll height and adjust position
            const newScrollHeight = container.scrollHeight
            container.scrollTop = newScrollHeight - prevScrollBottomRef.current
        } else {
            prevScrollBottomRef.current = container.scrollHeight - container.scrollTop
        }
    }, [isLoadingMore, messages])

    // BEHAVIOR 2 & 3: Auto-scroll on new messages & sticky scroll
    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return

        if (itemsPrepended) {
            // Update refs but don't scroll
            updateRefs()
            return
        }

        if (newMessageAtEnd) {
            // BEHAVIOR 2: Always scroll to bottom for user messages (they just sent it)
            if (isNewUserMessage) {
                scrollToBottom("smooth")
            }
            // BEHAVIOR 3: Sticky scroll - if at bottom, scroll to bottom
            else if (isAtBottom) {
                scrollToBottom("instant")
            }
        }
        // Handle content updates (streaming) - sticky scroll
        else if (isAtBottom) {
            scrollToBottom("instant")
        }

        updateRefs()
    }, [messages, activities, isAtBottom, scrollToBottom, itemsPrepended, newMessageAtEnd, isNewUserMessage, updateRefs])

    // ResizeObserver for content size changes (images loading, etc.)
    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return

        const observer = new ResizeObserver(() => {
            // Only auto-scroll if at bottom
            if (isAtBottom) {
                scrollToBottom("instant")
            }
        })

        observer.observe(container)
        if (container.firstElementChild) {
            observer.observe(container.firstElementChild)
        }

        return () => observer.disconnect()
    }, [isAtBottom, scrollToBottom])

    return {
        scrollContainerRef,
        contentRef,
        scrollToBottom,
        isAtBottom,
    }
}
