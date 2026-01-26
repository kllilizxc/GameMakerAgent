import { useState, FormEvent } from "react"

interface UsePromptSubmitOptions {
  onSubmit: (prompt: string) => void
  isDisabled?: boolean
}

/**
 * Hook to handle prompt input and submission
 */
export function usePromptSubmit({ onSubmit, isDisabled = false }: UsePromptSubmitOptions) {
  const [input, setInput] = useState("")

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
