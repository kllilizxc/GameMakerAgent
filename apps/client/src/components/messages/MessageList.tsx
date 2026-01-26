import { MessageItem } from "./MessageItem"
import { ActivityItem } from "../activities/ActivityItem"
import { useSessionStore } from "@/stores/session"
import { Loader2 } from "lucide-react"
import type { Message, Activity } from "@/types/session"

interface MessageListProps {
  messages: Message[]
}

type TimelineItem = 
  | { type: "message"; data: Message }
  | { type: "activity"; data: Activity }

export function MessageList({ messages }: MessageListProps) {
  const activities = useSessionStore((s) => s.activities)
  const status = useSessionStore((s) => s.status)
  const validMessages = messages.filter((msg) => msg.content.trim().length > 0)

  if (validMessages.length === 0 && activities.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>No messages yet.</p>
        <p className="text-sm mt-1">Start by describing your game!</p>
      </div>
    )
  }

  // Merge messages and activities, sort by timestamp to interleave them
  const timeline: TimelineItem[] = [
    ...validMessages.map((m) => ({ type: "message" as const, data: m })),
    ...activities.map((a) => ({ type: "activity" as const, data: a })),
  ].sort((a, b) => {
    const aTime = a.type === "message" ? a.data.timestamp : a.data.timestamp
    const bTime = b.type === "message" ? b.data.timestamp : b.data.timestamp
    return aTime - bTime
  })

  return (
    <div className="space-y-4">
      {timeline.map((item) => 
        item.type === "message" ? (
          <MessageItem key={item.data.id} message={item.data} />
        ) : (
          <ActivityItem key={item.data.id} activity={item.data} />
        )
      )}
      {status === "running" && activities.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          <span>Starting agent...</span>
        </div>
      )}
    </div>
  )
}
