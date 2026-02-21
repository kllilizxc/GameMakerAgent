"use client"
import { useState, useCallback, useRef, createContext, useContext, ReactNode, useEffect } from "react"
import { Button } from "@heroui/react"
import {
    Dialog,
    DialogHeader,
    DialogIcon,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/Dialog"

export interface DialogOptions {
    title: string
    description: string
    icon?: ReactNode
    confirmText?: string
    cancelText?: string
    showCancel?: boolean
    showConfirm?: boolean
    confirmButtonClass?: string
    titleClass?: string
    autoCloseDuration?: number
    onConfirm?: () => void
    onCancel?: () => void
}

interface DialogState extends DialogOptions {
    isOpen: boolean
}

type DialogFunction = (options: DialogOptions) => Promise<boolean>

const DialogContext = createContext<DialogFunction | undefined>(undefined)

export function useDialog() {
    const context = useContext(DialogContext)
    if (!context) {
        throw new Error("useDialog must be used within a DialogProvider")
    }
    return { open: context }
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<DialogState>({
        isOpen: false,
        title: "",
        description: "",
        confirmText: "Confirm",
        cancelText: "Cancel",
        showCancel: true,
        showConfirm: true,
    })

    const resolveRef = useRef<(value: boolean) => void>(null)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const open = useCallback((options: DialogOptions): Promise<boolean> => {
        // Clear any existing timer
        if (timerRef.current) {
            clearTimeout(timerRef.current)
        }

        setState({
            isOpen: true,
            confirmText: "Confirm",
            cancelText: "Cancel",
            showCancel: true,
            showConfirm: true,
            ...options,
        })

        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve
        })
    }, [])

    const handleClose = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
        }
        setState((prev) => ({ ...prev, isOpen: false }))
        state.onCancel?.()
        resolveRef.current?.(false)
    }, [state])

    const handleConfirm = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
        }
        setState((prev) => ({ ...prev, isOpen: false }))
        state.onConfirm?.()
        resolveRef.current?.(true)
    }, [state])

    // Auto-close effect
    useEffect(() => {
        if (state.isOpen && state.autoCloseDuration) {
            timerRef.current = setTimeout(() => {
                handleClose()
            }, state.autoCloseDuration)

            return () => {
                if (timerRef.current) {
                    clearTimeout(timerRef.current)
                }
            }
        }
    }, [state.isOpen, state.autoCloseDuration, handleClose])

    return (
        <DialogContext.Provider value={open}>
            {children}
            <Dialog open={state.isOpen} onOpenChange={(open) => !open && handleClose()}>
                <DialogHeader>
                    {state.icon && <DialogIcon>{state.icon}</DialogIcon>}
                    <DialogTitle className={state.titleClass}>
                        {state.title}
                    </DialogTitle>
                    <DialogDescription>
                        {state.description}
                    </DialogDescription>
                </DialogHeader>
                {(state.showCancel || state.showConfirm) && (
                    <DialogFooter>
                        {state.showCancel && (
                            <Button
                                onPress={handleClose}
                                variant="ghost"
                                className="text-muted-foreground hover:text-foreground"
                            >
                                {state.cancelText}
                            </Button>
                        )}
                        {state.showConfirm && (
                            <Button
                                onPress={handleConfirm}
                                className={state.confirmButtonClass}
                            >
                                {state.confirmText}
                            </Button>
                        )}
                    </DialogFooter>
                )}
            </Dialog>
        </DialogContext.Provider>
    )
}
