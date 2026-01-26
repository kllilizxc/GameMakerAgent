import { MessageItem } from "./MessageItem"
import type { Message } from "@/types/session"

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
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
        <MessageItem key={msg.id} message={msg} />
      ))}
    </div>
  )
}
