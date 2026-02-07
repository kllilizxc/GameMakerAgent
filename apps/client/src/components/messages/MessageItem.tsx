import { cn } from "@/lib/utils"
import type { Message } from "@/types/session"
import { useSessionStore } from "@/stores/session"
import { NodeRenderer } from "markstream-react"
import { Undo2 } from "lucide-react"
import { TaskSteps } from "./TaskSteps"
import { TodoList } from "./TodoList"
import "./MessageItem.scss"

interface MessageItemProps {
  message: Message
}

export function MessageItem({ message }: MessageItemProps) {
  const isAgent = message.role === "agent"

  const rewind = useSessionStore((state) => state.rewind)

  return (
    <div
      className={cn(
        "message-item group relative",
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
        {message.metadata?.todos && (
          <TodoList todos={message.metadata.todos} />
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

      <div className="absolute top-2 -left-12 opacity-0 group-hover:opacity-100 transition-opacity">
        {message.role === "user" && (
          <button
            onClick={() => rewind(message.id, true, message.content)}
            className="p-1 hover:bg-black/20 rounded text-xs flex items-center gap-1"
            title="Edit this prompt"
          >
            <Undo2 className="w-3 h-3" />
            Edit
          </button>
        )}
      </div>
    </div>
  )
}

