import { MessageItem } from "./MessageItem"
import { ActivityGroup } from "../activities/ActivityGroup"
import { TodoList } from "./TodoList"
import { useSessionStore } from "@/stores/session"
import { Loader2 } from "lucide-react"
import type { Message } from "@/types/session"
import { useMessageTimeline } from "@/hooks/useMessageTimeline"

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
  const activities = useSessionStore((s) => s.activities)
  const status = useSessionStore((s) => s.status)
  const hasMoreMessages = useSessionStore((s) => s.hasMoreMessages)

  // Timeline Management - merges messages and activities
  const timeline = useMessageTimeline(messages, activities)

  if (timeline.length === 0) {
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
      {timeline.map((item, idx) => {
        switch (item.type) {
          case "message":
            return <MessageItem key={item.data.id} message={item.data} />
          case "activity_group":
            return <ActivityGroup key={`group-${idx}`} activities={item.data} />
          case "todo_list":
            return item.data ? (
              <div key={`todo-${idx}`}>
                <TodoList todos={item.data} />
              </div>
            ) : null
          default:
            return null
        }
      })}

      {status === "running" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 pl-4">
          <Loader2 size={14} className="animate-spin" />
          <span>Working...</span>
        </div>
      )}
    </div>
  )
}
