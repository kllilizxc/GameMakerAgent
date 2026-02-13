import { useState } from "react"
import { useSessionStore } from "@/stores/session"
import { usePromptSubmit } from "@/hooks/usePromptSubmit"
import { PromptHeader } from "@/components/prompt/PromptHeader"
import { PromptInput } from "@/components/prompt/PromptInput"
import { MessageList } from "@/components/messages/MessageList"
import { useMessageScroll } from "@/hooks/useMessageScroll"
import { ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface PromptPanelProps {
  mobile?: boolean
}

export function PromptPanel({ mobile }: PromptPanelProps) {
  const [expanded, setExpanded] = useState(!mobile)
  const {
    status,
    messages,
    activities,
    sendPrompt,
    interrupt,
    loadMoreMessages,
    hasMoreMessages,
    isLoadingMore,
  } = useSessionStore()

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
        "flex flex-col transition-all duration-300 ease-in-out",
        mobile
          ? "bg-background border-t border-border rounded-t-lg overflow-hidden h-auto"
          : "h-full"
      )}
    >
      {/* Desktop Header */}
      {!mobile && <PromptHeader />}

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
      <div
        className={cn(
          "overflow-y-auto overflow-x-hidden custom-scrollbar transition-all duration-300 ease-in-out",
          mobile ? "px-4" : "p-4 flex-1",
          mobile && (expanded ? "h-[40vh] opacity-100 py-2" : "h-0 opacity-0 pointer-events-none p-0")
        )}
        ref={scrollContainerRef}
      >
        <MessageList messages={messages} />
      </div>

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
}
