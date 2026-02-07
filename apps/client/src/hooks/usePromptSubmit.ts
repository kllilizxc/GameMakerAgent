import { useState, FormEvent, useEffect } from "react"
import { useSessionStore } from "@/stores/session"

interface UsePromptSubmitOptions {
  onSubmit: (prompt: string) => void
  isDisabled?: boolean
}

/**
 * Hook to handle prompt input and submission
 */
export function usePromptSubmit({ onSubmit, isDisabled = false }: UsePromptSubmitOptions) {
  const [input, setInput] = useState("")
  const { draftPrompt, setDraftPrompt } = useSessionStore()

  useEffect(() => {
    if (draftPrompt) {
      setInput(draftPrompt)
      setDraftPrompt(null) // Consume it
    }
  }, [draftPrompt, setDraftPrompt])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isDisabled) return

    onSubmit(input.trim())
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
