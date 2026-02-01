import { useMemo } from "react"
import type { Message, Activity } from "@/types/session"

export type TimelineItem =
    | { type: "message"; data: Message }
    | { type: "activity"; data: Activity }

export function useMessageTimeline(messages: Message[], activities: Activity[]) {
    const timeline = useMemo(() => {
        const validMessages = messages.filter((msg) => msg.content.trim().length > 0)

        const items: TimelineItem[] = [
            ...validMessages.map((m) => ({ type: "message" as const, data: m })),
            ...activities.map((a) => ({ type: "activity" as const, data: a })),
        ]

        return items.sort((a, b) => {
            const aTime = a.data.timestamp
            const bTime = b.data.timestamp
            // Sort ascending (Oldest first) based on recent fix, 
            // check previous files if it was DESC or ASC.
            // previous edit changed to: return aTime - bTime
            return aTime - bTime
        })
    }, [messages, activities])

    return timeline
}
