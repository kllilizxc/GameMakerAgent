import { useState } from "react"
import { Wrench, FileEdit, MessageSquare, ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Activity } from "@/types/session"

interface ActivityItemProps {
  activity: Activity
}

/** Strip workspace prefix (e.g., "workspaces/ses_xxx/") from file paths */
function formatFilePath(path: string): string {
  // Match absolute or relative workspace paths and strip the prefix
  // Regex explanation:
  // ([^\s"']*[\\/])? -> Optional prefix (absolute path parts) ending in / or \ (non-whitespace/quote)
  // workspaces[\\/]ses_[^\\/]+[\\/] -> The workspace directory pattern
  // 'g' flag to handle multiple paths in a single string (e.g. commands)
  return path.replace(/([^\s"']*[\\/])?workspaces[\\/]ses_[^\\/]+[\\/]/g, "")
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const [expanded, setExpanded] = useState(false)

  const title = activity.type === "tool" && activity.data.title ? formatFilePath(activity.data.title) : ""
  const path = activity.type === "file" && activity.data.path ? formatFilePath(activity.data.path) : ""

  const hasExpandableContent =
    (activity.type === "tool" && title.length > 50) ||
    (activity.type === "file" && path.length > 40) ||
    (activity.type === "text" && activity.data.text && activity.data.text.length > 60)

  return (
    <div className="flex items-start gap-2 p-2 bg-secondary/50 rounded text-xs text-muted-foreground">
      {activity.type === "tool" && (
        <>
          <Wrench size={14} className="mt-0.5 flex-shrink-0 text-blue-500" />
          <div className="flex-1 min-w-0">
            <span className="font-medium text-foreground">{activity.data.tool}</span>
            {activity.data.title && (
              <div
                className={cn(
                  "opacity-75 break-all transition-[max-height] duration-300 ease-in-out overflow-hidden",
                  expanded ? "max-h-[500px]" : "max-h-[1rem]" // text-xs has line-height 1rem
                )}
              >
                {title}
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
          <div
            className={cn(
              "flex-1 min-w-0 transition-[max-height] duration-300 ease-in-out overflow-hidden",
              expanded ? "max-h-[500px]" : "max-h-[1rem]"
            )}
          >
            <span className="text-foreground">Modified:</span> {path || ""}
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
          <div
            className={cn(
              "flex-1 min-w-0 opacity-75 transition-[max-height] duration-300 ease-in-out overflow-hidden",
              expanded ? "max-h-[500px]" : "max-h-[1rem]"
            )}
          >
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
