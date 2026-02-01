import { cn } from "@/lib/utils"
import { Message } from "@/types/session"
import { useState } from "react"

interface TaskStepsProps {
    steps: NonNullable<NonNullable<Message["metadata"]>["summary"]>
}

export function TaskSteps({ steps }: TaskStepsProps) {
    const [isOpen, setIsOpen] = useState(true)

    if (!steps || steps.length === 0) return null

    // Group steps by ID to handle updates to the same step, though usually they are unique entries in the summary array
    // The summary array from the server is already sorted and consolidated enough for display suitable for a "log" view.

    return (
        <div className="my-2 rounded-md border border-border bg-muted/30 text-sm overflow-hidden">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
            >
                <span className="font-medium text-muted-foreground flex items-center gap-2">
                    Task Progress
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-foreground/70">
                        {steps.length}
                    </span>
                </span>
                <span className={cn("text-muted-foreground transition-transform duration-200", isOpen ? "rotate-90" : "")}>
                    ▶
                </span>
            </button>

            {isOpen && (
                <div className="border-t border-border px-3 py-2 space-y-2">
                    {steps.map((step) => (
                        <div key={step.id} className="flex items-start gap-2 text-xs">
                            <div className={cn(
                                "mt-0.5 h-2 w-2 rounded-full flex-shrink-0",
                                step.state.status === "completed" ? "bg-green-500" :
                                    step.state.status === "failed" ? "bg-red-500" :
                                        "bg-blue-500 animate-pulse"
                            )} />
                            <div className="flex-1 space-y-0.5">
                                <div className="font-medium text-foreground">
                                    {step.tool}
                                </div>
                                {(step.state.title || (step.state.status === "running")) && (
                                    <div className="text-muted-foreground">
                                        {step.state.title || "Running..."}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
