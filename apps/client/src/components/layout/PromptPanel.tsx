import { useState } from "react"
import { useSessionStore } from "@/stores/session"
import { usePromptSubmit } from "@/hooks/usePromptSubmit"
import { PromptHeader } from "@/components/prompt/PromptHeader"
import { PromptInput } from "@/components/prompt/PromptInput"
import { MobilePromptPanel } from "@/components/prompt/MobilePromptPanel"
import { MessageList } from "@/components/messages/MessageList"
import { useMessageScroll } from "@/hooks/useMessageScroll"

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
  })

  // Mobile layout
  if (mobile) {
    return (
      <MobilePromptPanel
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        messages={messages}
        expanded={expanded}
        onToggleExpanded={() => setExpanded(!expanded)}
      />
    )
  }

  // Desktop layout
  return (
    <div className="flex flex-col h-full">
      <PromptHeader />

      {/* Messages - scroll container */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 custom-scrollbar"
        ref={scrollContainerRef}
      >
        <MessageList messages={messages} />
      </div>

      {/* Input */}
      <PromptInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        onInterrupt={interrupt}
      />
    </div>
  )
}
