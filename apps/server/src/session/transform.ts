import type { MessageV2 } from "@game-agent/agent"

/**
 * Client-facing message format
 */
export interface ClientMessage {
    id: string
    role: "user" | "agent"
    content: string
    timestamp: number
    streaming?: boolean
    activities?: ClientActivity[]
}

export interface ClientActivity {
    id: string
    type: "tool" | "file"
    timestamp: number
    completed: boolean
    callId?: string
    data: {
        tool?: string
        title?: string
        path?: string
    }
}

/**
 * Transform OpenCode's MessageV2.WithParts[] to our client message format
 */
export function transformMessages(ocMessages: MessageV2.WithParts[]): ClientMessage[] {
    return ocMessages.map((msg) => {
        // Extract text content from TextParts
        const textParts = msg.parts.filter((p): p is MessageV2.TextPart => p.type === "text")
        const content = textParts.map(p => p.text).join("")

        // Extract tool activities from ToolParts
        const toolParts = msg.parts.filter((p): p is MessageV2.ToolPart => p.type === "tool")
        const activities: ClientActivity[] = toolParts.map(t => {
            const state = t.state
            let title = state.status === "completed" ? state.title : undefined

            // Fallback: Try to extract title from input if missing
            // This handles cases where tools like str_replace/write_file might not set a title but have parameters
            if (!title && state.input) {
                const input = state.input as Record<string, any>
                if (input.path && typeof input.path === "string") {
                    title = input.path
                } else if (input.filePath && typeof input.filePath === "string") {
                    title = input.filePath
                } else if (input.command && typeof input.command === "string") {
                    title = input.command
                } else if (input.pattern && typeof input.pattern === "string") {
                    title = input.pattern
                } else if (input.url && typeof input.url === "string") {
                    title = input.url
                }
            }

            return {
                id: t.id,
                type: "tool" as const,
                timestamp: state.status === "completed" || state.status === "running"
                    ? state.time.start
                    : Date.now(),
                completed: state.status === "completed",
                callId: t.callID,
                data: {
                    tool: t.tool,
                    title
                }
            }
        })

        return {
            id: msg.info.id,
            role: msg.info.role === "user" ? "user" as const : "agent" as const,
            content,
            timestamp: msg.info.time.created,
            activities: activities.length > 0 ? activities : undefined
        }
    })
}
