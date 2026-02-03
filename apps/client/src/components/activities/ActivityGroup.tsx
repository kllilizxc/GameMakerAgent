import { useRef, useLayoutEffect } from "react"
import { ActivityItem } from "./ActivityItem"
import type { Activity } from "@/types/session"

interface ActivityGroupProps {
    activities: Activity[]
}

export function ActivityGroup({ activities }: ActivityGroupProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    useLayoutEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight
        }
    }, [])

    return (
        <div
            ref={containerRef}
            className="flex flex-col gap-1 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar border-l-2 border-muted pl-2"
        >
            {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
            ))}
        </div>
    )
}
