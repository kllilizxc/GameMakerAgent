import { useState } from "react"
import { useSessionStore } from "@/stores/session"
import { useAutoScroll } from "@/hooks/useAutoScroll"
import { usePromptSubmit } from "@/hooks/usePromptSubmit"
import { PromptHeader } from "@/components/prompt/PromptHeader"
import { PromptInput } from "@/components/prompt/PromptInput"
import { MobilePromptPanel } from "@/components/prompt/MobilePromptPanel"
import { MessageList } from "@/components/messages/MessageList"
import { ActivityFeed } from "@/components/activities/ActivityFeed"

interface PromptPanelProps {
  mobile?: boolean
}

export function PromptPanel({ mobile }: PromptPanelProps) {
  const [expanded, setExpanded] = useState(!mobile)
  const { status, messages, activities, sendPrompt } = useSessionStore()

  const isLoading = status === "running"
  const scrollRef = useAutoScroll([messages, activities])

  const { input, setInput, handleSubmit } = usePromptSubmit({
    onSubmit: sendPrompt,
    isDisabled: isLoading,
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <MessageList messages={messages} />
        {isLoading && <ActivityFeed activities={activities} />}
        <div ref={scrollRef} />
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
