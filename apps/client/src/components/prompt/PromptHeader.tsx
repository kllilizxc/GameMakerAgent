import { useState } from "react"
import { useSessionStore } from "@/stores/session"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog"
import { ThemeToggle } from "@/components/ui/ThemeToggle"

interface PromptHeaderProps {
  title?: string
  subtitle?: string
}

export function PromptHeader({
  title = "Game Agent",
  subtitle = "Describe your game idea"
}: PromptHeaderProps) {
  const [showConfirm, setShowConfirm] = useState(false)
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
          onClick={() => setShowConfirm(true)}
          className="p-2 -ml-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          title="Back to Templates"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
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

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return to Templates?</DialogTitle>
            <DialogDescription>
              Any unsaved progress will be lost. This will disconnect your current session.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setShowConfirm(false)}
              className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowConfirm(false)
                leaveSession()
              }}
              className="px-4 py-2 text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-md transition-colors border border-red-500/20"
            >
              Leave Session
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
