import { useDialog } from "@/components/ui/DialogProvider"
import { useCallback } from "react"
import { AlertTriangle } from "lucide-react"

export interface ConfirmOptions {
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    variant?: "default" | "destructive"
}

export function useConfirm() {
    const { open } = useDialog()

    const confirm = useCallback(async (options: ConfirmOptions) => {
        const isDestructive = options.variant === "destructive"

        return open({
            title: options.title,
            description: options.description,
            confirmText: options.confirmText,
            cancelText: options.cancelText,
            showCancel: true,
            showConfirm: true,
            icon: isDestructive ? <AlertTriangle size={20} className="text-destructive" /> : undefined,
            titleClass: isDestructive ? "text-destructive" : undefined,
        })
    }, [open])

    return { confirm }
}
