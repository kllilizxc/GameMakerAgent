import { Send, Square } from "lucide-react"
import { FormEvent, useRef, useEffect } from "react"

interface PromptInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
  onInterrupt?: () => void
  isLoading?: boolean
  placeholder?: string
  disabled?: boolean
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  onInterrupt,
  isLoading = false,
  placeholder = "Describe your game...",
  disabled = false,
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const canSubmit = value.trim().length > 0 && !isLoading && !disabled

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (canSubmit) {
        onSubmit(e as any)
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className="p-4 border-t border-border">
      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-secondary rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none overflow-y-auto max-h-[150px] min-h-[44px]"
          rows={1}
          disabled={disabled}
        />
        {isLoading ? (
          <button
            type="button"
            onClick={onInterrupt}
            className="bg-destructive text-destructive-foreground rounded-lg px-4 py-3 transition-colors hover:bg-destructive/90 h-fit self-end"
            title="Stop generation"
          >
            <Square size={18} fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSubmit}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-3 disabled:opacity-50 transition-colors hover:bg-primary/90 h-fit self-end"
          >
            <Send size={18} />
          </button>
        )}
      </div>
    </form>
  )
}
