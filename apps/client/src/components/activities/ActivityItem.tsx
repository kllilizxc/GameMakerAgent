import { useState } from "react"
import { Wrench, FileEdit, MessageSquare, ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Activity } from "@/types/session"

interface ActivityItemProps {
  activity: Activity
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const [expanded, setExpanded] = useState(false)

  const hasExpandableContent =
    (activity.type === "tool" && activity.data.title && activity.data.title.length > 50) ||
    (activity.type === "file" && activity.data.path && activity.data.path.length > 40) ||
    (activity.type === "text" && activity.data.text && activity.data.text.length > 60)

  return (
    <div className="flex items-start gap-2 p-2 bg-secondary/50 rounded text-xs text-muted-foreground">
      {activity.type === "tool" && (
        <>
          <Wrench size={14} className="mt-0.5 flex-shrink-0 text-blue-500" />
          <div className="flex-1 min-w-0">
            <span className="font-medium text-foreground">{activity.data.tool}</span>
            {activity.data.title && (
              <div className={cn("opacity-75 break-all", !expanded && "truncate")}>
                {activity.data.title}
              </div>
            )}
          </div>
          {hasExpandableContent && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex-shrink-0 hover:text-foreground transition-colors"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
        </>
      )}
      {activity.type === "file" && (
        <>
          <FileEdit size={14} className="mt-0.5 flex-shrink-0 text-green-500" />
          <div className={cn("flex-1 min-w-0", !expanded && "truncate")}>
            <span className="text-foreground">Modified:</span> {activity.data.path}
          </div>
          {hasExpandableContent && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex-shrink-0 hover:text-foreground transition-colors"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
        </>
      )}
      {activity.type === "text" && (
        <>
          <MessageSquare size={14} className="mt-0.5 flex-shrink-0 text-purple-500" />
          <div className={cn("flex-1 min-w-0 opacity-75", !expanded && "truncate")}>
            {activity.data.text}
          </div>
          {hasExpandableContent && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex-shrink-0 hover:text-foreground transition-colors"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
        </>
      )}
    </div>
  )
}
