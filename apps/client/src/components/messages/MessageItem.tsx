import { memo, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import type { Message } from "@/types/session"
import { useSessionStore } from "@/stores/session"
import { NodeRenderer } from "markstream-react"
import { Undo2 } from "lucide-react"
import { Button } from "@heroui/react"
import { TaskSteps } from "./TaskSteps"
import { useConfirm } from "@/hooks/useConfirm"
import { renderUIPart } from "../ui-parts/UIRegistry"
import { ChevronDown, Brain } from "lucide-react"
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
    >
      <Undo2 className="w-4 h-4 text-foreground" />
    </Button>
  )
}

function ReasoningBlock({ text }: { text: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const previewText = text.replace(/\n/g, " ").slice(0, 80).trim() + (text.length > 80 ? "..." : "")

  return (
    <div className="reasoning-block border-l-2 border-primary/30 px-3 py-2 bg-muted/30 rounded-r-md">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Brain className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="font-medium italic flex-shrink-0">Thinking</span>
          {!isExpanded && (
            <span className="text-[10px] text-muted-foreground/60 truncate italic ml-1 max-w-[200px]">
              {previewText}
            </span>
          )}
        </div>
        <ChevronDown className={cn("w-3.5 h-3.5 ml-auto flex-shrink-0 transition-transform duration-200", isExpanded && "rotate-180")} />
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="reasoning-content pb-2 text-xs italic text-muted-foreground/80 leading-relaxed">
              <NodeRenderer content={text} final={true} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const MessageItem = memo(function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user"
  const isAgent = message.role === "agent"

  const bubbleClass = useMemo(() => cn(
    "rounded-lg py-3 text-sm w-full",
    isUser
      ? "bg-primary px-4 text-primary-foreground ml-8"
      : message.role === "error"
        ? "bg-red-400 border text-white px-4 py-3"
        : "bg-transparent prose prose-sm prose-invert"
  ), [isUser, message.role])

  const imageBlockClass = useMemo(() => cn(
    "rounded-lg overflow-hidden w-fit max-w-full",
    isUser ? "ml-8" : ""
  ), [isUser])

  return (
    <div className={cn(
      "message-item group relative flex flex-col gap-2",
      isUser ? "items-end" : "items-start",
      message.role === "error" && "w-full items-center my-4"
    )}>
      <div className={cn("flex flex-col w-full overflow-x-auto", isUser ? "items-end" : "items-start")}>
        {/* Main content block: metadata and text parts */}
        <div className={bubbleClass}>
          {message.metadata?.summary && (
            <TaskSteps steps={message.metadata.summary} />
          )}
          <div className={cn("flex flex-col gap-2 overflow-x-hidden", isUser && "prose prose-sm prose-invert max-w-none overflow-x-auto")}>
            {message.parts && message.parts.length > 0 ? (
              message.parts
                .filter(part => part.type === "text" || part.type === "reasoning")
                .map((part, i) => (
                  <div key={i}>
                    {part.type === "text" && part.text && (
                      <NodeRenderer content={part.text} final={!message.streaming} />
                    )}
                    {part.type === "reasoning" && part.text && (
                      <ReasoningBlock text={part.text} />
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

      <div className={cn("absolute", "-top-4 -right-2")}>
        {isUser && <RewindButton messageId={message.id} />}
      </div>
    </div>
  )
})

