import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react"
import { Message, Activity } from "@/types/session"

interface UseScrollToBottomOptions {
    messages: Message[]
    activities: Activity[]
}

export function useScrollToBottom({ messages, activities }: UseScrollToBottomOptions) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const bottomRef = useRef<HTMLDivElement>(null)
    const [isAtBottom, setIsAtBottom] = useState(true)

    // Track the last message ID to detect new messages
    const lastMessageIdRef = useRef<string | null>(null)


    const scrollToBottom = useCallback((behavior: ScrollBehavior = "instant") => {
        // If we have the scroll container, setting scrollTop is more reliable for "instant"
        // and avoids some browser quirks with scrollIntoView
        if (scrollRef.current && behavior === "instant") {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        } else if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior })
        }
    }, [])

    // Handle scroll events to track if user is at bottom
    const handleScroll = useCallback(() => {
        const el = scrollRef.current
        if (!el) return

        const { scrollTop, scrollHeight, clientHeight } = el
        // Tolerance of 50px
        const isBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50
        setIsAtBottom(isBottom)
    }, [])

    const [isInitialScrollDone, setIsInitialScrollDone] = useState(false)

    // Initial load scroll - useLayoutEffect to run before paint
    useLayoutEffect(() => {
        // Scroll to bottom on mount if there is content
        if (messages.length > 0 || activities.length > 0) {
            // Immediate scroll attempt
            scrollToBottom("instant")

            // Double check after layout/paint to handle any shifts (re-mounting scenarios)
            requestAnimationFrame(() => {
                scrollToBottom("instant")
                // One more frame for good measure in complex layouts
                requestAnimationFrame(() => {
                    scrollToBottom("instant")
                    setIsInitialScrollDone(true)
                })
            })
        } else {
            setIsInitialScrollDone(true)
        }
        // We only want this to run on mount (empty dependency array for the effect itself would be ideal, 
        // but we need the data). 
        // However, react-hooks/exhaustive-deps will complain if we don't include them.
        // We use a ref to track if we've done the "mount" scroll.
    }, []) // Run only on mount

    // We need a separate effect that runs when data *becomes* available if it wasn't there on mount
    useEffect(() => {
        if (!isInitialScrollDone && (messages.length > 0 || activities.length > 0)) {
            scrollToBottom("instant")
            setIsInitialScrollDone(true)
        }
    }, [messages.length, activities.length, isInitialScrollDone, scrollToBottom])

    // Handle new messages and content updates
    useEffect(() => {
        const lastMessage = messages[messages.length - 1]

        // Check if new message
        if (lastMessage && lastMessageIdRef.current !== lastMessage.id) {
            lastMessageIdRef.current = lastMessage.id
            const isUserMessage = lastMessage.role === "user"
            // Always scroll to bottom for new user messages
            if (isUserMessage) {
                scrollToBottom("smooth")
                return
            }
        }

        // Sticky scroll logic
        if (isAtBottom) {
            scrollToBottom("instant")
        }
    }, [messages, activities, isAtBottom, scrollToBottom])

    // Use ResizeObserver to keep detecting bottom when content size changes (e.g. images loading)
    useEffect(() => {
        const el = scrollRef.current
        if (!el) return

        const observer = new ResizeObserver(() => {
            if (isAtBottom) {
                scrollToBottom("instant")
            }
        })

        observer.observe(el)
        // Also observe the bottom ref's parent (the messages list) if possible, 
        // but observing the scroll container's content (first child) is usually better.
        // Since PromptPanel structure is: div.scrollRef > [MessageList, div.bottomRef]
        // We essentially want to observe the scrollHeight changing.
        // ResizeObserver on the container fires when its size changes, but we want CONTENT size changes.
        // Observing the first child (MessageList wrapper) would be ideal.
        if (el.firstElementChild) {
            observer.observe(el.firstElementChild)
        }

        return () => observer.disconnect()
    }, [isAtBottom, scrollToBottom])

    return {
        scrollRef,
        bottomRef,
        scrollToBottom,
        handleScroll,
        isAtBottom,
        isInitialScrollDone
    }
}
