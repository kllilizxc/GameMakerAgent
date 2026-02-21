import * as React from "react"
import { Modal } from "@heroui/react"
import { cn } from "@/lib/utils"

interface DialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    children: React.ReactNode
    className?: string
}

const Dialog = ({
    open,
    onOpenChange,
    children,
    className
}: DialogProps) => {
    return (
        <Modal
            isOpen={open}
            onOpenChange={onOpenChange}
        >
            <Modal.Backdrop
                variant="blur"
                className="bg-linear-to-t from-black/80 via-black/40 to-transparent dark:from-background/80 dark:via-background/40"
            >
                <Modal.Container className={cn(className)}>
                    <Modal.Dialog className="outline-none sm:max-w-[400px]">
                        <Modal.CloseTrigger />
                        {children}
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    )
}

const DialogHeader = ({ className, children, ...props }: React.ComponentProps<typeof Modal.Header>) => (
    <Modal.Header className={cn("flex flex-col gap-3", className)} {...props}>
        {children}
    </Modal.Header>
)

const DialogIcon = ({ className, children, ...props }: React.ComponentProps<typeof Modal.Icon>) => (
    <Modal.Icon className={cn("bg-secondary text-foreground", className)} {...props}>
        {children}
    </Modal.Icon>
)

const DialogTitle = ({ className, ...props }: React.ComponentProps<typeof Modal.Heading>) => (
    <Modal.Heading className={cn("text-lg font-semibold leading-none tracking-tight text-foreground", className)} {...props} />
)

const DialogDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className={cn("text-sm text-muted-foreground font-normal", className)} {...props} />
)

const DialogContent = ({ className, children, ...props }: React.ComponentProps<typeof Modal.Body>) => (
    <Modal.Body className={cn(className)} {...props}>
        {children}
    </Modal.Body>
)

const DialogFooter = ({ className, ...props }: React.ComponentProps<typeof Modal.Footer>) => (
    <Modal.Footer className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)

export {
    Dialog,
    DialogHeader,
    DialogIcon,
    DialogTitle,
    DialogDescription,
    DialogContent,
    DialogFooter,
}
