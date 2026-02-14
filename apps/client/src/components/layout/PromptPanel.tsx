import { memo, useState, useEffect } from "react"
import { useSessionStore } from "@/stores/session"
import { usePromptSubmit } from "@/hooks/usePromptSubmit"
import { PromptHeader } from "@/components/prompt/PromptHeader"
import { PromptInput } from "@/components/prompt/PromptInput"
import { MessageList } from "@/components/messages/MessageList"
import { useMessageScroll } from "@/hooks/useMessageScroll"
import { ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollShadow } from "@heroui/react"

interface PromptPanelProps {
  mobile?: boolean
}

export const PromptPanel = memo(function PromptPanel({ mobile }: PromptPanelProps) {
  const [expanded, setExpanded] = useState(!mobile)

  // Sync expanded state when screen size changes
  useEffect(() => {
    if (!mobile) {
      setExpanded(true)
    } else {
      // Optional: collapse when switching TO mobile
      // setExpanded(false)
    }
  }, [mobile])
  const status = useSessionStore((s) => s.status)
  const messages = useSessionStore((s) => s.messages)
  const activities = useSessionStore((s) => s.activities)
  const sendPrompt = useSessionStore((s) => s.sendPrompt)
  const interrupt = useSessionStore((s) => s.interrupt)
  const loadMoreMessages = useSessionStore((s) => s.loadMoreMessages)
  const hasMoreMessages = useSessionStore((s) => s.hasMoreMessages)
  const isLoadingMore = useSessionStore((s) => s.isLoadingMore)

  const isLoading = status === "running"

  const { input, setInput, handleSubmit } = usePromptSubmit({
    onSubmit: sendPrompt,
    isDisabled: isLoading,
  })

  const { scrollContainerRef } = useMessageScroll({
    messages,
    activities,
    onLoadMore: loadMoreMessages,
    hasMore: hasMoreMessages,
    isLoadingMore,
    expanded
    // isMobile not supported by hook, layout handles it
  })

  // Main render - unified for both mobile and desktop
  return (
    <div
      className={cn(
        "flex flex-col bg-gradient-to-b from-surface-tertiary via-surface-secondary to-surface",
        mobile
          ? "shadow-lg rounded-t-lg overflow-hidden h-auto"
          : "h-full rounded-r-[16px]"
      )}
    >
      {/* Desktop Header */}
      <div className={cn(
        "overflow-hidden",
        mobile ? "h-0 opacity-0" : "h-auto opacity-100"
      )}>
        <PromptHeader />
      </div>

      {/* Mobile Toggle Handle */}
      {mobile && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full h-8 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 my-2"
        >
          <ChevronUp
            size={20}
            className={cn("transition-transform duration-300", expanded ? "rotate-180" : "rotate-0")}
          />
        </button>
      )}

      {/* Messages Area - Scrollable */}
      <ScrollShadow
        className={cn(
          "overflow-y-auto overflow-x-hidden custom-scrollbar transition-height ease-in-out duration-300",
          mobile ? "px-4" : "p-4 flex-1",
          mobile && (expanded ? "h-[40vh] py-2" : "h-0 pointer-events-none p-0")
        )}
        ref={scrollContainerRef}
        hideScrollBar
      >
        <MessageList messages={messages} />
      </ScrollShadow>

      {/* Input Area */}
      <div className="shrink-0">
        <PromptInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          onInterrupt={interrupt}
        />
      </div>
    </div>
  )
})
