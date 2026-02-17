import { useRef, useEffect } from "react"
import { usePreviewStore } from "@/stores/preview"
import { useSessionStore } from "@/stores/session"
import { Trash2, X, Terminal, MessageSquarePlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { IconButton } from "@/components/ui/IconButton"

const LOG_STYLES: Record<string, string> = {
    log: "text-foreground",
    error: "text-red-500",
    warn: "text-yellow-500",
}

const LABEL_STYLES: Record<string, string> = {
    log: "bg-muted text-muted-foreground",
    error: "bg-destructive/10 text-destructive",
    warn: "bg-yellow-500/10 text-yellow-500",
}

const TYPE_LABELS: Record<string, string> = {
    log: "LOG",
    error: "ERR",
    warn: "WRN",
}

export function PreviewTerminal() {
    const logs = usePreviewStore((s) => s.logs)
    const clearLogs = usePreviewStore((s) => s.clearLogs)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [logs])

    return (
        <div className="h-full bg-background flex flex-col">
            {/* Header */}

            <div className="flex items-center justify-between px-3 py-1 bg-muted/30 border-b border-border h-9 shrink-0">
                <div className="flex items-center gap-2 text-foreground text-xs font-medium uppercase tracking-wider">
                    <Terminal size={14} className="text-muted-foreground" />
                    <span>Console Output</span>
                    <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] min-w-[1.5rem] text-center">
                        {logs.length}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <IconButton
                        size="sm"
                        onClick={() => {
                            const lastLogs = logs.slice(-10)
                            const formattedLogs = lastLogs
                                .map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.type.toUpperCase()}] ${l.message}`)
                                .join('\n')
                            useSessionStore.getState().setDraftPrompt(
                                `Here are the recent logs from the console:\n\n\`\`\`\n${formattedLogs}\n\`\`\`\n\nPlease analyze these logs.`
                            )
                        }}
                        title="Send last 10 logs to prompt"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        icon={<MessageSquarePlus size={14} />}
                    />
                    <IconButton
                        size="sm"
                        onClick={clearLogs}
                        title="Clear logs"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        icon={<Trash2 size={14} />}
                    />
                </div>
            </div>

            {/* Logs */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            >
                {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 italic select-none">
                        <span>No console output</span>
                    </div>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className={cn(
                            "flex gap-3 leading-relaxed group break-all whitespace-pre-wrap py-0.5",
                            LOG_STYLES[log.type] ?? LOG_STYLES.log
                        )}>
                            <span className="opacity-40 select-none shrink-0 font-mono text-[10px] pt-0.5" style={{ minWidth: '4.5rem' }}>
                                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className={cn("select-none shrink-0 font-bold w-8 text-[10px] uppercase pt-0.5", LABEL_STYLES[log.type] ?? LABEL_STYLES.log)}>
                                {TYPE_LABELS[log.type] ?? "LOG"}
                            </span>
                            <span className="flex-1">{log.message}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
