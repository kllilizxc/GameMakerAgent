import { Send, Square, Paperclip, X } from "lucide-react"
import { useSessionStore } from "@/stores/session"
import { FormEvent, useRef, useEffect, useState, ChangeEvent } from "react"
import { validateImage, resizeImage, processImageUrl } from "@/lib/image-utils"
import { useError } from "@/hooks/useError"

interface PromptInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: FormEvent, attachments?: string[]) => void
  onInterrupt?: () => void
  isLoading?: boolean
  placeholder?: string
  disabled?: boolean
}

interface Attachment {
  file: File
  preview: string
  base64?: string
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const { error: showError } = useError()

  const canSubmit = (value.trim().length > 0 || attachments.length > 0) && !isLoading && !disabled && !isProcessing

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value])

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      attachments.forEach(a => URL.revokeObjectURL(a.preview))
    }
  }, [attachments])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (canSubmit) {
        handleSubmit(e)
      }
    }
  }

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsProcessing(true)
      const newAttachments: Attachment[] = []

      try {
        for (const file of Array.from(e.target.files)) {
          const errorMsg = validateImage(file)
          if (errorMsg) {
            console.error(errorMsg)
            await showError({
              title: "Invalid Image",
              description: errorMsg,
            })
            continue
          }

          const preview = URL.createObjectURL(file)
          const base64 = await resizeImage(file)

          newAttachments.push({
            file,
            preview,
            base64
          })
        }

        setAttachments(prev => [...prev, ...newAttachments])
      } catch (err) {
        console.error("Failed to process image", err)
      } finally {
        setIsProcessing(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const newAttachments = [...prev]
      URL.revokeObjectURL(newAttachments[index].preview)
      newAttachments.splice(index, 1)
      return newAttachments
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    const { sessionId } = useSessionStore.getState()
    if (!sessionId) {
      showError({ title: "Session error", description: "No active session found" })
      return
    }

    setIsProcessing(true)
    try {
      const dataUrls = attachments
        .map(a => a.base64)
        .filter((b): b is string => !!b)

      onSubmit(e, dataUrls.length > 0 ? dataUrls : undefined)
      setAttachments([])
    } catch (err) {
      console.error("Failed to process images", err)
      showError({ title: "Process Failed", description: "Could not handle images" })
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle draft attachments from session store (e.g. on rewind)
  const { draftAttachments, setDraftAttachments } = useSessionStore()
  useEffect(() => {
    if (draftAttachments && draftAttachments.length > 0) {
      setIsProcessing(true)
      const processDrafts = async () => {
        try {
          const newAttachments: Attachment[] = []
          for (const url of draftAttachments) {
            const result = await processImageUrl(url)
            if (result) {
              newAttachments.push(result)
            }
          }
          setAttachments(prev => [...prev, ...newAttachments])
          setDraftAttachments(null)
        } catch (err) {
          console.error("Failed to process draft attachments", err)
        } finally {
          setIsProcessing(false)
        }
      }
      processDrafts()
    }
  }, [draftAttachments, setDraftAttachments, showError])

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-border">
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-2 overflow-x-auto py-2">
          {attachments.map((att, i) => (
            <div key={i} className="relative group flex-shrink-0">
              <img
                src={att.preview}
                alt="attachment"
                className="h-16 w-16 object-cover rounded-md border border-border"
              />
              <button
                type="button"
                onClick={() => removeAttachment(i)}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*"
          multiple
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading}
          className="p-3 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
          title="Attach image"
        >
          <Paperclip size={18} />
        </button>

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
            className="bg-destructive text-destructive-foreground rounded-lg px-4 py-3 transition-colors hover:bg-destructive/90 h-fit"
            title="Stop generation"
          >
            <Square size={18} fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSubmit}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-3 disabled:opacity-50 transition-colors hover:bg-primary/90 h-fit"
          >
            <Send size={18} />
          </button>
        )}
      </div>
    </form>
  )
}
