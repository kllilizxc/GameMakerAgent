import { MessageItem } from "./MessageItem"
import { ActivityItem } from "../activities/ActivityItem"
import { useSessionStore } from "@/stores/session"
import { Loader2 } from "lucide-react"
import type { Message } from "@/types/session"
import { useMessageTimeline } from "@/hooks/useMessageTimeline"
import { useInfiniteLoader } from "@/hooks/useInfiniteLoader"
import { useScrollRestoration } from "@/hooks/useScrollRestoration"

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
  const activities = useSessionStore((s) => s.activities)
  const status = useSessionStore((s) => s.status)

  const loadMoreMessages = useSessionStore((s) => s.loadMoreMessages)
  const hasMoreMessages = useSessionStore((s) => s.hasMoreMessages)
  const isLoadingMore = useSessionStore((s) => s.isLoadingMore)
  const messagesFirstLoaded = useSessionStore((s) => s.messagesFirstLoaded)

  // 1. Timeline Management
  const timeline = useMessageTimeline(messages, activities)

  // 2. Scroll Restoration
  const { setScrollContainer, captureScroll } = useScrollRestoration([messages])

  // 3. Infinite Loading
  const handleLoadMore = () => {
    // Ensure scroll restoration knows about the container
    // We get the ref from infinite loader, but need to pass it to restoration
    setScrollContainer(scrollParentRef.current)
    captureScroll()
    loadMoreMessages()
  }

  const { setTarget, scrollParentRef } = useInfiniteLoader(
    handleLoadMore,
    hasMoreMessages && !isLoadingMore && messagesFirstLoaded,
    { threshold: 0.1 }
  )

  const validMessages = messages.filter((msg) => msg.content.trim().length > 0)

  if (validMessages.length === 0 && activities.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>No messages yet.</p>
        <p className="text-sm mt-1">Start by describing your game!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {hasMoreMessages && (
        <div ref={setTarget} className="flex justify-center py-2 h-8">
          {<Loader2 size={16} className="animate-spin text-muted-foreground" />}
        </div>
      )}
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
