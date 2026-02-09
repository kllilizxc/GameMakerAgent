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
            icon: isDestructive ? <AlertTriangle size={20} /> : undefined,
            titleClass: isDestructive ? "text-red-400" : undefined,
            confirmButtonClass: isDestructive
                ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
                : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20"
        })
    }, [open])

    return { confirm }
}
