import { MessageItem } from "./MessageItem"
import { ActivityGroup } from "../activities/ActivityGroup"
import { TodoList } from "./TodoList"
import { useSessionStore } from "@/stores/session"
import { Loader2, AlertCircle } from "lucide-react"
import type { Message } from "@/types/session"
import { useMessageTimeline } from "@/hooks/useMessageTimeline"

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
  const activities = useSessionStore((s) => s.activities)
  const status = useSessionStore((s) => s.status)
  const error = useSessionStore((s) => s.error)
  const todos = useSessionStore((s) => s.todos)
  const hasMoreMessages = useSessionStore((s) => s.hasMoreMessages)

  // Timeline Management - merges messages and activities
  const timeline = useMessageTimeline(messages, activities)

  const validMessages = messages.filter((msg) => msg.content.trim().length > 0)

  if (validMessages.length === 0 && activities.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>No messages yet.</p>
        <p className="text-sm mt-1">Start by describing your game!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Loading indicator at top when loading more messages */}
      {hasMoreMessages && (
        <div className="flex justify-center py-2">
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Timeline items */}
      {timeline.map((item) =>
        item.type === "message" ? (
          <MessageItem key={item.data.id} message={item.data} />
        ) : (
          <ActivityGroup key={`group-${item.data[0].id}`} activities={item.data} />
        )
      )}

      {/* Display todos from session store */}
      {todos && todos.length > 0 && (
        <TodoList todos={todos} />
      )}

      {status === "running" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 pl-4">
          <Loader2 size={14} className="animate-spin" />
          <span>Working...</span>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-2 text-sm text-red-500 p-2 pl-4">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
