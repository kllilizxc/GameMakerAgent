import { memo, useMemo } from "react"
import { cn } from "@/lib/utils"
import type { Message } from "@/types/session"
import { useSessionStore } from "@/stores/session"
import { NodeRenderer } from "markstream-react"
import { Undo2 } from "lucide-react"
import { Button } from "@heroui/react"
import { TaskSteps } from "./TaskSteps"
import { TodoList } from "./TodoList"
import { useConfirm } from "@/hooks/useConfirm"
import { renderUIPart } from "../ui-parts/UIRegistry"
import "./MessageItem.scss"

interface MessageItemProps {
  message: Message
}

/** Isolated rewind button — subscribes to status independently so streaming updates don't re-render the message bubble */
function RewindButton({ messageId }: { messageId: string }) {
  const rewind = useSessionStore((s) => s.rewind)
  const isRunning = useSessionStore((s) => s.status === "running")
  const { confirm } = useConfirm()

  const handleRewind = async () => {
    const ok = await confirm({
      title: "Rewind Session?",
      description: "This will remove all subsequent messages and activities. Your current draft will be replaced with this prompt.",
      confirmText: "Rewind",
      cancelText: "Cancel",
      variant: "destructive"
    })
    if (ok) {
      rewind(messageId, true)
    }
  }

  return (
    <Button
      onPress={handleRewind}
      isDisabled={isRunning}
      isIconOnly
      variant="secondary"
      size="sm"
      className="rounded-full shadow-sm border border-border"
      title={isRunning ? "Rewind disabled during generation" : "Rewind to this prompt"}
    >
      <Undo2 className="w-4 h-4 text-foreground" />
    </Button>
  )
}

export const MessageItem = memo(function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user"
  const isAgent = message.role === "agent"

  const bubbleClass = useMemo(() => cn(
    "rounded-lg py-3 text-sm w-fit max-w-full",
    isUser
      ? "bg-primary px-4 text-primary-foreground ml-8"
      : "bg-transparent prose prose-sm prose-invert max-w-none"
  ), [isUser])

  const imageBlockClass = useMemo(() => cn(
    "rounded-lg overflow-hidden w-fit max-w-full",
    isUser ? "ml-8" : ""
  ), [isUser])

  return (
    <div className={cn("message-item group relative flex flex-col gap-2", isUser ? "items-end" : "items-start")}>
      <div className={cn("flex flex-col gap-2 w-full overflow-x-auto", isUser ? "items-end" : "items-start")}>
        {/* Main content block: metadata and text parts */}
        <div className={bubbleClass}>
          {message.metadata?.summary && (
            <TaskSteps steps={message.metadata.summary} />
          )}
          {message.metadata?.todos && (
            <TodoList todos={message.metadata.todos} />
          )}
          <div className={cn("flex flex-col gap-2", isUser && "prose prose-sm prose-invert max-w-none overflow-x-auto")}>
            {message.parts && message.parts.length > 0 ? (
              message.parts
                .filter(part => part.type === "text")
                .map((part, i) => (
                  <div key={i}>
                    {part.text && (
                      <NodeRenderer content={part.text} final={!message.streaming} />
                    )}
                  </div>
                ))
            ) : (
              // Fallback for old messages
              isAgent ? (
                <NodeRenderer content={message.content} final={!message.streaming} />
              ) : (
                message.content
              )
            )}
          </div>
        </div>

        {/* Separate blocks for images and UI */}
        {message.parts && message.parts.length > 0 && message.parts.map((part, i) => (
          <div key={i}>
            {part.type === "image" && part.url && (
              <div className={imageBlockClass}>
                <img
                  src={part.url}
                  alt="attachment"
                  className="max-w-full rounded-md border border-border shadow-sm"
                  loading="lazy"
                />
              </div>
            )}
            {part.type === "ui" && part.ui && (
              <div className={isAgent ? "mr-8" : "ml-8"}>
                {renderUIPart(part.ui.name, part.ui.props)}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={cn("absolute", "-top-2 -right-2")}>
        {isUser && <RewindButton messageId={message.id} />}
      </div>
    </div>
  )
})

