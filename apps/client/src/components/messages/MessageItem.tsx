import { cn } from "@/lib/utils"
import type { Message } from "@/types/session"

interface MessageItemProps {
  message: Message
}

export function MessageItem({ message }: MessageItemProps) {
  return (
    <div
      className={cn(
        "rounded-lg px-4 py-3 text-sm",
        message.role === "user"
          ? "bg-primary text-primary-foreground ml-8"
          : "bg-secondary mr-8"
      )}
    >
      {message.content}
    </div>
  )
}
