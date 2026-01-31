import * as React from "react"
import { cn } from "@/lib/utils"

const Dialog = ({
    open,
    onOpenChange,
    children,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    children: React.ReactNode
}) => {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => onOpenChange(false)}
            />
            <div className="relative z-50 w-full max-w-lg p-6 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {children}
            </div>
        </div>
    )
}

const DialogContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("grid gap-4", className)} {...props}>
        {children}
    </div>
)

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
)

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)

const DialogTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className={cn("text-lg font-semibold leading-none tracking-tight text-white", className)} {...props} />
)

const DialogDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className={cn("text-sm text-zinc-400", className)} {...props} />
)

export {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
}
