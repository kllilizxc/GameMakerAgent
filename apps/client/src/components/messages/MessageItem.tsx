import { cn } from "@/lib/utils"
import type { Message } from "@/types/session"
import { NodeRenderer } from "markstream-react"
import "markstream-react/index.css"
import "./MessageItem.scss"

import { TaskSteps } from "./TaskSteps"

interface MessageItemProps {
  message: Message
}

export function MessageItem({ message }: MessageItemProps) {
  const isAgent = message.role === "agent"

  return (
    <div
      className={cn(
        "message-item",
        "rounded-lg px-4 py-3 text-sm",
        message.role === "user"
          ? "bg-primary text-primary-foreground ml-8"
          : "bg-secondary mr-8 prose prose-sm prose-invert max-w-none"
      )}
    >
      <div className="flex flex-col gap-2">
        {message.metadata?.summary && (
          <TaskSteps steps={message.metadata.summary} />
        )}
        {isAgent ? (
          <NodeRenderer
            content={message.content}
            final={!message.streaming}
          />
        ) : (
          message.content
        )}
      </div>
    </div>
  )
}

