import { useEffect, useRef, useState, useCallback } from "react"
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

    // We need a separate effect that runs when data *becomes* available if it wasn't there on mount
    useEffect(() => {
        if (!isInitialScrollDone && (messages.length > 0 || activities.length > 0)) {
            requestAnimationFrame(() => {
                scrollToBottom("instant")
                setIsInitialScrollDone(true)
            })
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
        isAtBottom
    }
}
