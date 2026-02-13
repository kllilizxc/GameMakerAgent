import { useState } from "react"
import { useSessionStore } from "@/stores/session"
import { ChevronLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { IconButton } from "../ui/IconButton"

interface PromptHeaderProps {
  title?: string
  subtitle?: string
}

export function PromptHeader({
  title = "Game Agent",
  subtitle = ""
}: PromptHeaderProps) {
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState("")

  const sessionId = useSessionStore((s) => s.sessionId)
  const history = useSessionStore((s) => s.history)
  const leaveSession = useSessionStore((s) => s.leaveSession)
  const updateSessionName = useSessionStore((s) => s.updateSessionName)

  const currentSession = history.find((h) => h.id === sessionId)
  const displayName = currentSession?.name || title

  const handleStartEdit = () => {
    setEditValue(displayName)
    setIsEditing(true)
  }

  const handleSave = () => {
    if (sessionId && editValue.trim()) {
      updateSessionName(sessionId, editValue.trim())
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      setIsEditing(false)
    }
  }

  return (
    <>
      <div className="p-4 flex items-center gap-4">
        <IconButton
          icon={<ChevronLeft size={20} />}
          variant="ghost"
          rounded
          size="md"
          onClick={() => {
            leaveSession()
            navigate("/templates")
          }}
          title="Back to Templates"
        />
        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              autoFocus
              className="text-lg font-semibold bg-transparent border-b border-primary outline-none focus:border-primary transition-colors w-full max-w-md"
            />
          ) : (
            <h1
              className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors"
              onClick={handleStartEdit}
              title="Click to edit session name"
            >
              {displayName}
            </h1>
          )}
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    </>
  )
}
