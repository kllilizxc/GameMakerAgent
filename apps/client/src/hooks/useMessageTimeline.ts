import { useMemo } from "react"
import type { Message, Activity } from "@/types/session"

export type TimelineItem =
    | { type: "message"; data: Message }
    | { type: "activity_group"; data: Activity[] }
    | { type: "todo_list"; data: NonNullable<Message["metadata"]>["todos"]; timestamp: number }

type UngroupedItem =
    | { type: "message"; data: Message }
    | { type: "activity"; data: Activity }
    | { type: "todo_list"; data: NonNullable<Message["metadata"]>["todos"]; timestamp: number }

export function useMessageTimeline(messages: Message[], activities: Activity[]) {
    const timeline = useMemo(() => {
        const validMessages = messages.filter((msg) =>
            msg.content.trim().length > 0 || (msg.parts && msg.parts.length > 0) || msg.metadata?.todos
        )

        const items: UngroupedItem[] = [
            ...validMessages.map((m) => {
                if (m.content.trim().length === 0 && (!m.parts || m.parts.length === 0) && m.metadata?.todos) {
                    return { type: "todo_list" as const, data: m.metadata.todos, timestamp: m.timestamp }
                }
                return { type: "message" as const, data: m }
            }),
            ...activities.map((a) => ({ type: "activity" as const, data: a })),
        ]

        // Add distinct explicit todo updates from activities if they contain todos
        activities.forEach(a => {
            if (a.metadata?.todos) {
                items.push({ type: "todo_list", data: a.metadata.todos, timestamp: a.timestamp + 1 }) // slightly after activity
            }
        })

        // Sort by timestamp
        items.sort((a, b) => {
            const timeA = a.type === "todo_list" ? a.timestamp : a.data.timestamp
            const timeB = b.type === "todo_list" ? b.timestamp : b.data.timestamp
            return timeA - timeB
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
                groupedItems.push(item as any)
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
