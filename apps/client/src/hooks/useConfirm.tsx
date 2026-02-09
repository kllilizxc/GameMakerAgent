import { useState, useCallback, useRef, createContext, useContext } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/Dialog"
import { AlertTriangle } from "lucide-react"

interface ConfirmOptions {
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    variant?: "default" | "destructive"
}

interface ConfirmState extends ConfirmOptions {
    isOpen: boolean
}

type ConfirmFunction = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFunction | undefined>(undefined)

export function useConfirm() {
    const context = useContext(ConfirmContext)
    if (!context) {
        throw new Error("useConfirm must be used within a ConfirmProvider")
    }
    return { confirm: context }
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<ConfirmState>({
        isOpen: false,
        title: "",
        description: "",
        confirmText: "Confirm",
        cancelText: "Cancel",
        variant: "default",
    })

    const resolveRef = useRef<(value: boolean) => void>()

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        setState({
            isOpen: true,
            confirmText: "Confirm",
            cancelText: "Cancel",
            variant: "default",
            ...options,
        })

        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve
        })
    }, [])

    const handleClose = useCallback(() => {
        setState((prev) => ({ ...prev, isOpen: false }))
        resolveRef.current?.(false)
    }, [])

    const handleConfirm = useCallback(() => {
        setState((prev) => ({ ...prev, isOpen: false }))
        resolveRef.current?.(true)
    }, [])

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <Dialog open={state.isOpen} onOpenChange={(open) => !open && handleClose()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className={`flex items-center gap-2 ${state.variant === "destructive" ? "text-red-400" : ""}`}>
                            {state.variant === "destructive" && <AlertTriangle size={20} />}
                            {state.title}
                        </DialogTitle>
                        <DialogDescription>
                            {state.description}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                        >
                            {state.cancelText}
                        </button>
                        <button
                            onClick={handleConfirm}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${state.variant === "destructive"
                                    ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
                                    : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20"
                                }`}
                        >
                            {state.confirmText}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ConfirmContext.Provider>
    )
}
