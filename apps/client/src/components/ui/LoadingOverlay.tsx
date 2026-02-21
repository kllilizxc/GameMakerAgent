import { useEffect, useState, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2 } from "lucide-react"

interface LoadingOverlayProps {
    show: boolean
    message?: string
    noSpinner?: boolean
}

export function LoadingOverlay({ show, message = "Loading...", noSpinner = false }: LoadingOverlayProps) {
    const [isVisible, setIsVisible] = useState(false)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const startTimeRef = useRef<number>(0)

    useEffect(() => {
        if (show) {
            // Cancel any pending hide timeout
            if (timeoutRef.current) clearTimeout(timeoutRef.current)

            setIsVisible(true)
            startTimeRef.current = Date.now()
        } else {
            const elapsed = Date.now() - startTimeRef.current
            const remaining = Math.max(0, 500 - elapsed)

            timeoutRef.current = setTimeout(() => {
                setIsVisible(false)
            }, remaining)
        }

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [show])

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
                >
                    <div className="flex flex-col items-center gap-4 p-8">
                        {!noSpinner && <Loader2 className="w-10 h-10 text-primary animate-spin" />}
                        <p className="text-lg font-medium text-foreground tracking-tight text-center">{message}</p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
