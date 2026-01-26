import { Send, Loader2 } from "lucide-react"
import { FormEvent } from "react"

interface PromptInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
  isLoading?: boolean
  placeholder?: string
  disabled?: boolean
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  placeholder = "Describe your game...",
  disabled = false,
}: PromptInputProps) {
  const canSubmit = value.trim().length > 0 && !isLoading && !disabled

  return (
    <form onSubmit={onSubmit} className="p-4 border-t border-border">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-secondary rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          disabled={isLoading || disabled}
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="bg-primary text-primary-foreground rounded-lg px-4 py-3 disabled:opacity-50 transition-colors hover:bg-primary/90"
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>
    </form>
  )
}
