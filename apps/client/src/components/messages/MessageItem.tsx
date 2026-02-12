import { cn } from "@/lib/utils"
import type { Message } from "@/types/session"
import { useSessionStore } from "@/stores/session"
import { NodeRenderer } from "markstream-react"
import { Undo2 } from "lucide-react"
import { TaskSteps } from "./TaskSteps"
import { TodoList } from "./TodoList"
import { renderUIPart } from "../ui-parts/UIRegistry"
import "./MessageItem.scss"

interface MessageItemProps {
  message: Message
}

export function MessageItem({ message }: MessageItemProps) {
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
        <div className={cn("flex flex-col gap-2", message.role === "user" && "prose prose-sm prose-invert max-w-none")}>
          {message.parts && message.parts.length > 0 ? (
            message.parts.map((part, i) => (
              <div key={i}>
                {part.type === "text" && part.text && (
                  <NodeRenderer content={part.text} final={!message.streaming} />
                )}
                {part.type === "image" && part.url && (
                  <img
                    src={part.url}
                    alt="attachment"
                    className="max-w-full rounded-md border border-border shadow-sm my-1"
                    loading="lazy"
                  />
                )}
                {part.type === "ui" && part.ui && (
                  renderUIPart(part.ui.name, part.ui.props)
                )}
              </div>
            ))
          ) : (
            // Fallback for old messages
            message.role === "agent" ? (
              <NodeRenderer content={message.content} final={!message.streaming} />
            ) : (
              message.content
            )
          )}
        </div>
      </div>

      <div className="absolute top-3 -left-6 opacity-0 group-hover:opacity-100 transition-opacity">
        {message.role === "user" && (
          <button
            onClick={() => rewind(message.id, true, message.content)}
            className="p-1 hover:bg-secondary rounded-full text-xs flex items-center gap-1"
            title="Rewind to this prompt"
          >
            <Undo2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

