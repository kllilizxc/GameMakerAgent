import { useState, FormEvent, useEffect } from "react"
import { useSessionStore } from "@/stores/session"

interface UsePromptSubmitOptions {
  onSubmit: (prompt: string, attachments?: string[]) => void
  isDisabled?: boolean
}

/**
 * Hook to handle prompt input and submission
 */
export function usePromptSubmit({ onSubmit, isDisabled = false }: UsePromptSubmitOptions) {
  const [input, setInput] = useState("")
  const draftPrompt = useSessionStore((s) => s.draftPrompt)
  const setDraftPrompt = useSessionStore((s) => s.setDraftPrompt)

  useEffect(() => {
    if (draftPrompt) {
      setInput(draftPrompt)
      setDraftPrompt(null) // Consume it
    }
  }, [draftPrompt, setDraftPrompt])

  const handleSubmit = (e: FormEvent, attachments?: string[]) => {
    e.preventDefault()
    if ((!input.trim() && (!attachments || attachments.length === 0)) || isDisabled) return

    onSubmit(input.trim(), attachments)
    setInput("")
  }

  const canSubmit = input.trim().length > 0 && !isDisabled

  return {
    input,
    setInput,
    handleSubmit,
    canSubmit,
  }
}
