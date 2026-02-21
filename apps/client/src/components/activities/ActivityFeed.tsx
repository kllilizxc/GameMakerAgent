import { Loader2 } from "lucide-react"
import { ActivityItem } from "./ActivityItem"
import type { Activity } from "@/types/session"

interface ActivityFeedProps {
  activities: Activity[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="mt-6 p-4 bg-secondary rounded-lg border border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          <span>Starting agent...</span>
        </div>
      </div>
    )
  }

  // Show last 5 activities
  const recentActivities = activities.slice(-5)

  return (
    <div className="mt-6 space-y-2">
      <div className="text-xs font-medium text-muted-foreground mb-2">Agent Activity</div>
      {recentActivities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
        <Loader2 size={12} className="animate-spin" />
        <span>Working...</span>
      </div>
    </div>
  )
}
