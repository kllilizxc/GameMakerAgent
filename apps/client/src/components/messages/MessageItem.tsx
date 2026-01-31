import { cn } from "@/lib/utils"
import type { Message } from "@/types/session"
import { NodeRenderer } from "markstream-react"
import "markstream-react/index.css"

interface MessageItemProps {
  message: Message
}

export function MessageItem({ message }: MessageItemProps) {
  const isAgent = message.role === "agent"

  return (
    <div
      className={cn(
        "rounded-lg px-4 py-3 text-sm",
        message.role === "user"
          ? "bg-primary text-primary-foreground ml-8"
          : "mr-8 prose prose-sm prose-invert max-w-none"
      )}
    >
      {isAgent ? (
        <NodeRenderer
          content={message.content}
          final={!message.streaming}
        />
      ) : (
        message.content
      )}
    </div>
  )
}
