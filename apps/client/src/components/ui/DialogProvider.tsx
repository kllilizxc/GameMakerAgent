"use client"

import { useState, useCallback, useRef, createContext, useContext, ReactNode, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
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

    const resolveRef = useRef<(value: boolean) => void>()
    const timerRef = useRef<ReturnType<typeof setTimeout>>()

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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className={`flex items-center gap-2 ${state.titleClass || ""}`}>
                            {state.icon}
                            {state.title}
                        </DialogTitle>
                        <DialogDescription>
                            {state.description}
                        </DialogDescription>
                    </DialogHeader>
                    {/* Only show footer if there's at least one button */}
                    {(state.showCancel || state.showConfirm) && (
                        <DialogFooter>
                            {state.showCancel && (
                                <button
                                    onClick={handleClose}
                                    className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                                >
                                    {state.cancelText}
                                </button>
                            )}
                            {state.showConfirm && (
                                <button
                                    onClick={handleConfirm}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${state.confirmButtonClass || "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20"}`}
                                >
                                    {state.confirmText}
                                </button>
                            )}
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
        </DialogContext.Provider>
    )
}
