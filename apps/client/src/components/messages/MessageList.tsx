import { MessageItem } from "./MessageItem"
import { ActivityItem } from "../activities/ActivityItem"
import { useSessionStore } from "@/stores/session"
import { Loader2 } from "lucide-react"
import type { Message } from "@/types/session"
import { useMessageTimeline } from "@/hooks/useMessageTimeline"
import InfiniteScroll from "react-infinite-scroller"
import { useRef } from "react"

interface MessageListProps {
  messages: Message[]
  isReady?: boolean
}

export function MessageList({ messages, isReady = true }: MessageListProps) {
  const activities = useSessionStore((s) => s.activities)
  const status = useSessionStore((s) => s.status)

  const loadMoreMessages = useSessionStore((s) => s.loadMoreMessages)
  const hasMoreMessages = useSessionStore((s) => s.hasMoreMessages)
  const isLoadingMore = useSessionStore((s) => s.isLoadingMore)

  // 1. Timeline Management
  const timeline = useMessageTimeline(messages, activities)

  // Ref for scroll parent
  const scrollParentRef = useRef<HTMLDivElement | null>(null)

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
    <div className="space-y-4" ref={scrollParentRef}>
      <InfiniteScroll
        pageStart={0}
        loadMore={() => {
          if (!isLoadingMore && isReady) {
            loadMoreMessages()
          }
        }}
        hasMore={isReady && hasMoreMessages}
        loader={
          <div className="flex justify-center py-2 h-8" key="loader">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        }
        isReverse={true}
        useWindow={false}
        getScrollParent={() => scrollParentRef.current?.parentElement || null}
        className="space-y-4"
      >
        {timeline.map((item) =>
          item.type === "message" ? (
            <MessageItem key={item.data.id} message={item.data} />
          ) : (
            <ActivityItem key={item.data.id} activity={item.data} />
          )
        )}
      </InfiniteScroll>

      {status === "running" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 pl-4">
          <Loader2 size={14} className="animate-spin" />
          <span>Thinking...</span>
        </div>
      )}
    </div>
  )
}
