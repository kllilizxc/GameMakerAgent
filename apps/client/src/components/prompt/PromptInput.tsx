import { Square, X, Plus, Mic, ArrowRight, ChevronUp } from "lucide-react"
import { useSessionStore } from "@/stores/session"
import { useSettingsStore } from "@/stores/settings"
import { FormEvent, useRef, useEffect, useState, ChangeEvent } from "react"
import { validateImage, resizeImage, processImageUrl } from "@/lib/image-utils"
import { useError } from "@/hooks/useError"
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown"

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
  placeholder = "Describe your game here",
  disabled = false,
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const { models, activeModel, fetchModels, setActiveModel } = useSettingsStore()
  const { error: showError } = useError()

  const canSubmit = (value.trim().length > 0 || attachments.length > 0) && !isLoading && !disabled && !isProcessing

  // Fetch models on mount if not loaded
  useEffect(() => {
    if (models.length === 0) {
      fetchModels()
    }
  }, [models.length, fetchModels])

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

  const handleModelChange = (modelId: string) => {
    if (modelId && modelId !== activeModel) {
      setActiveModel(modelId)
      // Persist to backend
      fetch("/workspaces/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeModel: modelId }),
      }).catch((err) => console.error("Failed to save model setting:", err))
    }
  }

  const activeModelName = models.find(m => m.id === activeModel)?.name || "Select Model"

  const modelOptions: DropdownOption[] = models.map((model) => ({
    id: model.id,
    label: model.name,
  }))

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
    <form onSubmit={handleSubmit} className="px-4 pb-4">
      {/* Unified card container */}
      <div className="rounded-2xl border border-border bg-secondary overflow-hidden">
        {/* Attachment preview row */}
        {attachments.length > 0 && (
          <div className="flex gap-2 px-4 pt-3 overflow-x-auto">
            {attachments.map((att, i) => (
              <div key={i} className="relative group flex-shrink-0">
                <img
                  src={att.preview}
                  alt="attachment"
                  className="h-14 w-14 object-cover rounded-lg border border-border"
                />
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea area */}
        <div className="px-4 pt-3 pb-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted outline-none resize-none overflow-y-auto max-h-[150px] min-h-[24px] leading-relaxed scrollbar-none"
            rows={1}
            disabled={disabled}
          />
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*"
          multiple
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-2 pb-2.5 pt-0.5">
          {/* Left group: Plus, Fast, Model */}
          <div className="flex items-center gap-0.5">
            {/* Plus / Attach button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isLoading}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
              title="Attach image"
            >
              <Plus size={18} strokeWidth={2} />
            </button>

            {/* Model selector dropdown */}
            <Dropdown
              options={modelOptions}
              value={activeModel ?? undefined}
              onChange={handleModelChange}
              placement="top"
              dark
              trigger={
                <div className="flex items-center gap-1 px-2 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground rounded-lg transition-colors outline-none">
                  <ChevronUp size={12} />
                  <span>{activeModelName}</span>
                </div>
              }
            />
          </div>

          {/* Right group: Mic, Submit/Stop */}
          <div className="flex items-center gap-1">
            {/* Voice input */}
            <button
              disabled
              type="button"
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
            >
              <Mic size={18} />
            </button>

            {/* Submit / Interrupt */}
            {isLoading ? (
              <button
                type="button"
                onClick={onInterrupt}
                className="p-2 bg-destructive/10 text-destructive rounded-full hover:bg-destructive/20 transition-all active:scale-90"
                title="Stop generation"
              >
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSubmit}
                className={[
                  "p-2 rounded-full transition-all duration-200 active:scale-90",
                  canSubmit
                    ? "bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
                    : "bg-muted text-muted-primary/30 cursor-not-allowed text-overlay"
                ].join(" ")}
              >
                <ArrowRight size={16} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}
