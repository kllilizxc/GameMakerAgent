import { useDialog } from "@/components/ui/DialogProvider"
import { useCallback } from "react"
import { AlertCircle } from "lucide-react"

export interface ErrorOptions {
    title: string
    description: string
    duration?: number
}

export function useError() {
    const { open } = useDialog()

    const error = useCallback(async (options: ErrorOptions) => {
        await open({
            title: options.title,
            description: options.description,
            showCancel: false,
            showConfirm: false,
            autoCloseDuration: options.duration || 3000,
            icon: <AlertCircle size={20} />,
            titleClass: "text-red-400",
        })
    }, [open])

    return { error }
}
