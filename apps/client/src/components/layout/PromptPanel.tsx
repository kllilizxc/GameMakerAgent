import { useEffect, useState, useRef } from "react"
import { useSessionStore } from "@/stores/session"
import { usePromptSubmit } from "@/hooks/usePromptSubmit"
import { PromptHeader } from "@/components/prompt/PromptHeader"
import { PromptInput } from "@/components/prompt/PromptInput"
import { MobilePromptPanel } from "@/components/prompt/MobilePromptPanel"
import { MessageList } from "@/components/messages/MessageList"

interface PromptPanelProps {
  mobile?: boolean
}

export function PromptPanel({ mobile }: PromptPanelProps) {
  const [expanded, setExpanded] = useState(!mobile)
  const { status, messages, activities, sendPrompt, setMessagesFirstLoaded } = useSessionStore()

  const isLoading = status === "running"

  const { input, setInput, handleSubmit } = usePromptSubmit({
    onSubmit: sendPrompt,
    isDisabled: isLoading,
  })

  const scrollRef = useRef<HTMLDivElement>(null)
  const [latestMessageTimestamp, setLatestMessageTimestamp] = useState(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const container = el.parentElement
    if (!container) return

    const latestMessage = messages[messages.length - 1]
    if (latestMessage && latestMessage.timestamp > latestMessageTimestamp) {
      setLatestMessageTimestamp(latestMessage.timestamp)
      el.scrollIntoView({ behavior: "instant" })
      setMessagesFirstLoaded()
    }
  }, [messages, activities])

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
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 custom-scrollbar">
        <MessageList messages={messages} />
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
