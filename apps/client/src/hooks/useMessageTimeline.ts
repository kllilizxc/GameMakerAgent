import { useMemo } from "react"
import type { Message, Activity } from "@/types/session"

export type TimelineItem =
    | { type: "message"; data: Message }
    | { type: "activity_group"; data: Activity[] }

type UngroupedItem =
    | { type: "message"; data: Message }
    | { type: "activity"; data: Activity }

export function useMessageTimeline(messages: Message[], activities: Activity[]) {
    const timeline = useMemo(() => {
        const validMessages = messages.filter((msg) => msg.content.trim().length > 0)

        const items: UngroupedItem[] = [
            ...validMessages.map((m) => ({ type: "message" as const, data: m })),
            ...activities.map((a) => ({ type: "activity" as const, data: a })),
        ]

        // Sort by timestamp
        items.sort((a, b) => {
            return a.data.timestamp - b.data.timestamp
        })

        // Group adjacent activities
        const groupedItems: TimelineItem[] = []
        let currentGroup: Activity[] = []

        for (const item of items) {
            if (item.type === "activity") {
                currentGroup.push(item.data)
            } else {
                if (currentGroup.length > 0) {
                    groupedItems.push({ type: "activity_group", data: [...currentGroup] })
                    currentGroup = []
                }
                groupedItems.push(item)
            }
        }

        // Push remaining activities
        if (currentGroup.length > 0) {
            groupedItems.push({ type: "activity_group", data: [...currentGroup] })
        }

        return groupedItems
    }, [messages, activities])

    return timeline
}
