import { useState } from "react"
import { useSessionStore } from "@/stores/session"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { ChevronLeft } from "lucide-react"

interface PromptHeaderProps {
  title?: string
  subtitle?: string
}

export function PromptHeader({
  title = "Game Agent",
  subtitle = "Describe your game idea"
}: PromptHeaderProps) {
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
      <div className="p-4 border-b border-border flex items-center gap-4">
        <button
          onClick={() => leaveSession()}
          className="p-2 -ml-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          title="Back to Templates"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              autoFocus
              className="text-lg font-semibold bg-transparent border-b border-zinc-600 outline-none focus:border-blue-500 transition-colors w-full max-w-md"
            />
          ) : (
            <h1
              className="text-lg font-semibold cursor-pointer hover:text-blue-400 transition-colors"
              onClick={handleStartEdit}
              title="Click to edit session name"
            >
              {displayName}
            </h1>
          )}
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <ThemeToggle />
      </div>

    </>
  )
}
