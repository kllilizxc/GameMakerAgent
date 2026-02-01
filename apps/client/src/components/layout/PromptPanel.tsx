import { useState } from "react"
import { useSessionStore } from "@/stores/session"
import { usePromptSubmit } from "@/hooks/usePromptSubmit"
import { PromptHeader } from "@/components/prompt/PromptHeader"
import { PromptInput } from "@/components/prompt/PromptInput"
import { MobilePromptPanel } from "@/components/prompt/MobilePromptPanel"
import { MessageList } from "@/components/messages/MessageList"
import { useScrollToBottom } from "@/hooks/useScrollToBottom"

interface PromptPanelProps {
  mobile?: boolean
}

export function PromptPanel({ mobile }: PromptPanelProps) {
  const [expanded, setExpanded] = useState(!mobile)
  const { status, messages, activities, sendPrompt } = useSessionStore()

  const isLoading = status === "running"

  const { input, setInput, handleSubmit } = usePromptSubmit({
    onSubmit: sendPrompt,
    isDisabled: isLoading,
  })

  const { scrollRef, bottomRef, handleScroll, isInitialScrollDone } = useScrollToBottom({ messages, activities })

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

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 custom-scrollbar"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        <MessageList messages={messages} isReady={isInitialScrollDone} />
        <div ref={bottomRef} className="h-px" />
      </div>

      {/* Input */}
      <PromptInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}
