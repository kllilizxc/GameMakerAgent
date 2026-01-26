import { Send, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { FormEvent } from "react"
import { cn } from "@/lib/utils"
import { MessageList } from "@/components/messages/MessageList"
import type { Message } from "@/types/session"

interface MobilePromptPanelProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
  isLoading?: boolean
  messages: Message[]
  expanded: boolean
  onToggleExpanded: () => void
}

export function MobilePromptPanel({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  messages,
  expanded,
  onToggleExpanded,
}: MobilePromptPanelProps) {
  return (
    <div
      className={cn(
        "bg-background border-t border-border transition-all duration-300",
        expanded ? "h-[50vh]" : "h-16"
      )}
    >
      {/* Drag handle / toggle */}
      <button
        onClick={onToggleExpanded}
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
      <form onSubmit={onSubmit} className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Describe your game..."
            className="flex-1 bg-secondary rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !value.trim()}
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
