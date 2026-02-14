import { cn } from "@/lib/utils"
import { memo, useState } from "react"
import { Check } from "lucide-react"

interface TodoListProps {
    todos: Array<{ id: string; content: string; status: string; priority?: string }>
}

export const TodoList = memo(function TodoList({ todos }: TodoListProps) {
    const [isOpen, setIsOpen] = useState(true)

    if (!todos || todos.length === 0) return null

    const pending = todos.filter(t => t.status !== "completed")

    return (
        <div className="my-2 rounded-md border border-border bg-card text-sm overflow-hidden shadow-sm">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors bg-muted/20"
            >
                <span className="font-medium text-foreground flex items-center gap-2">
                    Todo List
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-foreground/70">
                        {pending.length} pending
                    </span>
                </span>
                <span className={cn("text-muted-foreground transition-transform duration-200", isOpen ? "rotate-90" : "")}>
                    ▶
                </span>
            </button>

            <div
                className={cn(
                    "grid transition-[grid-template-rows] duration-500 ease-in-out",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
            >
                <div className="overflow-hidden">
                    <div className="border-t border-border px-3 py-2 space-y-1">
                        {todos.map((todo) => (
                            <div key={todo.id} className="flex items-start gap-2 group">
                                <div className={cn(
                                    "mt-1 h-3.5 w-3.5 rounded border flex items-center justify-center transition-colors",
                                    todo.status === "completed"
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : "border-muted-foreground/30 bg-background"
                                )}>
                                    {todo.status === "completed" && (
                                        <Check size={10} />
                                    )}
                                </div>
                                <div className={cn(
                                    "flex-1 text-sm transition-opacity",
                                    todo.status === "completed" ? "text-muted-foreground line-through opacity-70" : "text-foreground"
                                )}>
                                    {todo.content}
                                    {todo.priority && todo.priority !== "medium" && (
                                        <span className={cn(
                                            "ml-2 text-[10px] px-1 py-0.5 rounded uppercase font-semibold tracking-wider",
                                            todo.priority === "high" ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                        )}>
                                            {todo.priority}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
})
