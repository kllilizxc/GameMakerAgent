import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: ReactNode
    variant?: "ghost" | "outline" | "solid"
    size?: "sm" | "md" | "lg"
    rounded?: boolean
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
    ({ className, icon, children, variant = "ghost", size = "md", rounded = false, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
                    {
                        "hover:bg-accent hover:text-accent-foreground": variant === "ghost",
                        "border border-input bg-background hover:bg-accent hover:text-accent-foreground": variant === "outline",
                        "bg-primary text-primary-foreground hover:bg-primary/90": variant === "solid",
                        "h-8 w-8 p-0": size === "sm",
                        "h-10 w-10 p-2": size === "md",
                        "h-12 w-12 p-3": size === "lg",
                        "rounded-full": rounded,
                        "cursor-not-allowed": props.disabled,
                    },
                    className
                )}
                {...props}
            >
                {icon || children}
            </button>
        )
    }
)

IconButton.displayName = "IconButton"
