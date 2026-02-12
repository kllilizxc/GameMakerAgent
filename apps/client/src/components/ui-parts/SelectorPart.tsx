import { useSessionStore } from "@/stores/session"

interface SelectorPartProps {
    props: {
        options: Array<{ label: string; value: string }>
        title?: string
    }
}

export function SelectorPart({ props }: SelectorPartProps) {
    const sendPrompt = useSessionStore((s) => s.sendPrompt)

    const handleSelect = (value: string) => {
        sendPrompt(value)
    }

    return (
        <div className="my-2 p-3 bg-secondary/50 rounded-lg border border-border">
            {props.title && <div className="text-xs font-medium mb-2 opacity-70 uppercase tracking-wider">{props.title}</div>}
            <div className="flex flex-wrap gap-2">
                {props.options.map((opt, i) => (
                    <button
                        key={i}
                        onClick={() => handleSelect(opt.value)}
                        className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs hover:bg-primary/90 transition-colors"
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    )
}
