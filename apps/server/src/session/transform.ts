import type { MessageV2 } from "@game-agent/agent"

/**
 * Client-facing message format
 */
export interface ClientMessage {
    id: string
    role: "user" | "agent"
    content: string
    parts: MessagePart[]
    timestamp: number
    streaming?: boolean
    activities?: ClientActivity[]
}

export interface MessagePart {
    type: "text" | "image" | "ui"
    text?: string
    url?: string
    ui?: {
        name: string
        props: Record<string, any>
    }
}

// Copied from types/session.ts to avoid circular deps
export interface ClientActivity {
    id: string
    type: "tool" | "file" | "text"
    timestamp: number
    data: any // Can be specific per type
    completed?: boolean
    callId?: string
}

/**
 * Transform OpenCode's MessageV2.WithParts[] to our client message format
 */
export function transformMessages(ocMessages: MessageV2.WithParts[]): ClientMessage[] {
    return ocMessages.map((msg) => {
        const messageTimestamp = msg.info.time.created
        const parts: MessagePart[] = []

        // Process parts
        for (const part of msg.parts) {
            if (part.type === "text") {
                parts.push({ type: "text", text: part.text })
            } else if (part.type === "file" && part.mime.startsWith("image/")) {
                // Determine if it's a data URL or a relative path in the workspace
                let url = part.url
                if (!url.startsWith("data:") && !url.startsWith("http") && !url.startsWith("/")) {
                    // It's a relative path in the workspace, use the static serving route
                    url = `/workspaces/${msg.info.sessionID}/${url}`
                }
                parts.push({ type: "image", url })
            } else if (part.type === "tool") {
                // Map specific tools to custom UI parts
                if (part.tool === "selector" && part.state.status === "completed") {
                    parts.push({
                        type: "ui",
                        ui: {
                            name: "selector",
                            props: part.state.output as Record<string, any> || {}
                        }
                    })
                }
            }
        }

        const content = parts
            .filter(p => p.type === "text")
            .map(p => p.text)
            .join("")

        // Extract tool activities from ToolParts
        const toolParts = msg.parts.filter((p): p is MessageV2.ToolPart => p.type === "tool")
        const activities: ClientActivity[] = toolParts.map(t => {
            // ... existing activity mapping logic ...
            const state = t.state
            let title = state.status === "completed" ? state.title : undefined

            if (!title && state.input) {
                title = getToolTitle(state.input as Record<string, any>)
            }

            let timestamp: number
            if (state.status === "completed" || state.status === "running") {
                timestamp = state.time.start
            } else if (state.status === "error") {
                timestamp = state.time.start
            } else {
                timestamp = messageTimestamp
            }

            return {
                id: t.id,
                type: "tool" as const,
                timestamp,
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
            parts,
            timestamp: messageTimestamp,
            activities: activities.length > 0 ? activities : undefined
        }
    })
}


function getToolTitle(input: Record<string, any>): string | undefined {
    if (input.path && typeof input.path === "string") {
        return input.path
    } else if (input.filePath && typeof input.filePath === "string") {
        return input.filePath
    } else if (input.command && typeof input.command === "string") {
        return input.command
    } else if (input.pattern && typeof input.pattern === "string") {
        return input.pattern
    } else if (input.url && typeof input.url === "string") {
        return input.url
    } else if (input.prompt && typeof input.prompt === "string") {
        return input.prompt
    }

    if (Object.keys(input).length > 0) {
        return JSON.stringify(input)
    }

    return undefined
}
