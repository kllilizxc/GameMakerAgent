import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { Send, ChevronDown, ChevronUp, Loader2, Wrench, FileEdit, MessageSquare } from "lucide-react"
import { useSessionStore } from "@/stores/session"

interface PromptPanelProps {
  mobile?: boolean
}

export function PromptPanel({ mobile }: PromptPanelProps) {
  const [input, setInput] = useState("")
  const [expanded, setExpanded] = useState(!mobile)
  const { status, messages, activities, sendPrompt } = useSessionStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isLoading = status === "running"

  // Auto-scroll to bottom when new messages/activities arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, activities])

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
        {isLoading && <ActivityFeed activities={activities} />}
        <div ref={messagesEndRef} />
      </div>

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

interface Activity {
  id: string
  type: "tool" | "text" | "file"
  timestamp: number
  data: {
    tool?: string
    title?: string
    path?: string
    text?: string
  }
}

function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <div className="mt-6 p-4 bg-secondary/50 rounded-lg border border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          <span>Starting agent...</span>
        </div>
      </div>
    )
  }

  // Show last 5 activities
  const recentActivities = activities.slice(-5)

  return (
    <div className="mt-6 space-y-2">
      <div className="text-xs font-medium text-muted-foreground mb-2">Agent Activity</div>
      {recentActivities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-2 p-2 bg-secondary/50 rounded text-xs text-muted-foreground"
        >
          {activity.type === "tool" && (
            <>
              <Wrench size={14} className="mt-0.5 flex-shrink-0 text-blue-500" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-foreground">{activity.data.tool}</span>
                {activity.data.title && (
                  <div className="truncate opacity-75">{activity.data.title}</div>
                )}
              </div>
            </>
          )}
          {activity.type === "file" && (
            <>
              <FileEdit size={14} className="mt-0.5 flex-shrink-0 text-green-500" />
              <div className="flex-1 min-w-0 truncate">
                <span className="text-foreground">Modified:</span> {activity.data.path}
              </div>
            </>
          )}
          {activity.type === "text" && (
            <>
              <MessageSquare size={14} className="mt-0.5 flex-shrink-0 text-purple-500" />
              <div className="flex-1 min-w-0 truncate opacity-75">
                {activity.data.text}
              </div>
            </>
          )}
        </div>
      ))}
      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
        <Loader2 size={12} className="animate-spin" />
        <span>Working...</span>
      </div>
    </div>
  )
}
