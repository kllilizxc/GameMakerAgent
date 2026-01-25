import { useState } from "react"
import { cn } from "@/lib/utils"
import { Send, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { useSessionStore } from "@/stores/session"

interface PromptPanelProps {
  mobile?: boolean
}

export function PromptPanel({ mobile }: PromptPanelProps) {
  const [input, setInput] = useState("")
  const [expanded, setExpanded] = useState(!mobile)
  const { status, messages, sendPrompt } = useSessionStore()

  const isLoading = status === "running"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendPrompt(input.trim())
    setInput("")
  }

  if (mobile) {
    return (
      <div
        className={cn(
          "bg-background border-t border-border transition-all duration-300",
          expanded ? "h-[50vh]" : "h-16"
        )}
      >
        {/* Drag handle / toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full h-8 flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>

        {/* Messages (only when expanded) */}
        {expanded && (
          <div className="flex-1 overflow-y-auto px-4 pb-2 h-[calc(50vh-8rem)]">
            <MessageList messages={messages} />
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your game..."
              className="flex-1 bg-secondary rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // Desktop layout
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-semibold">Game Agent</h1>
        <p className="text-sm text-muted-foreground">Describe your game idea</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <MessageList messages={messages} />
      </div>

      {/* Status indicator */}
      {isLoading && (
        <div className="px-4 py-2 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" />
          Agent is working...
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your game..."
            className="flex-1 bg-secondary rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-3 disabled:opacity-50 transition-colors hover:bg-primary/90"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

interface Message {
  id: string
  role: "user" | "agent"
  content: string
}

function MessageList({ messages }: { messages: Message[] }) {
  if (messages.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>No messages yet.</p>
        <p className="text-sm mt-1">Start by describing your game!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={cn(
            "rounded-lg px-4 py-3 text-sm",
            msg.role === "user"
              ? "bg-primary text-primary-foreground ml-8"
              : "bg-secondary mr-8"
          )}
        >
          {msg.content}
        </div>
      ))}
    </div>
  )
}
