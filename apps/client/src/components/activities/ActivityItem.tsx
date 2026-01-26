import { Wrench, FileEdit, MessageSquare } from "lucide-react"
import type { Activity } from "@/types/session"

interface ActivityItemProps {
  activity: Activity
}

export function ActivityItem({ activity }: ActivityItemProps) {
  return (
    <div className="flex items-start gap-2 p-2 bg-secondary/50 rounded text-xs text-muted-foreground">
      {activity.type === "tool" && (
        <>
          <Wrench size={14} className="mt-0.5 flex-shrink-0 text-blue-500" />
          <div className="flex-1 min-w-0">
            <span className="font-medium text-foreground">{activity.data.tool}</span>
            {activity.data.title && (
              <div className="truncate opacity-75">{activity.data.title}</div>
            )}
          </div>
        </>
      )}
      {activity.type === "file" && (
        <>
          <FileEdit size={14} className="mt-0.5 flex-shrink-0 text-green-500" />
          <div className="flex-1 min-w-0 truncate">
            <span className="text-foreground">Modified:</span> {activity.data.path}
          </div>
        </>
      )}
      {activity.type === "text" && (
        <>
          <MessageSquare size={14} className="mt-0.5 flex-shrink-0 text-purple-500" />
          <div className="flex-1 min-w-0 truncate opacity-75">
            {activity.data.text}
          </div>
        </>
      )}
    </div>
  )
}
