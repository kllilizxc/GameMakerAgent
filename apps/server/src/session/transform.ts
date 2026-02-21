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
    /** True for client-only synthetic messages derived from tool output. */
    synthetic?: boolean
}

export interface MessagePart {
    type: "text" | "image" | "ui" | "reasoning"
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

function escapeRegExp(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function textContainsMarkdownImage(text: string, url: string): boolean {
    const escapedUrl = escapeRegExp(url)
    const re = new RegExp(`!\\[[^\\]]*\\]\\(\\s*<?${escapedUrl}>?(?:\\s+["'][^"']*["'])?\\s*\\)`, "m")
    return re.test(text)
}

function extractMarkdownImageUrls(markdown: string): string[] {
    const urls: string[] = []
    const re = /!\[[^\]]*\]\(([^)]+)\)/g

    let match: RegExpExecArray | null
    while ((match = re.exec(markdown)) !== null) {
        const inside = match[1]?.trim()
        if (!inside) continue

        // Handle optional title: (url "title")
        let url = inside
        if (url.startsWith("<") && url.includes(">")) {
            url = url.slice(1, url.indexOf(">"))
        } else {
            url = url.split(/\s+/)[0]
        }

        url = url.replace(/\\/g, "/")
        if (url.startsWith("workspaces/")) url = `/${url}`

        urls.push(url)
    }

    return urls
}

/**
 * Transform OpenCode's MessageV2.WithParts[] to our client message format
 */
export function transformMessages(ocMessages: MessageV2.WithParts[]): ClientMessage[] {
    return ocMessages.flatMap((msg) => {
        const toolParts = msg.parts.filter((p): p is MessageV2.ToolPart => p.type === "tool")

        // Keep assistant "thinking" (reasoning) before tool activities, but render tool-generated images
        // after the tool has completed by emitting synthetic follow-up messages.
        let messageTimestamp = msg.info.time.created

        if (msg.info.role !== "user") {
            let earliestToolStart: number | undefined
            for (const toolPart of toolParts) {
                const state: any = toolPart.state as any
                const start = state?.time?.start
                if (typeof start !== "number") continue
                earliestToolStart = earliestToolStart === undefined ? start : Math.min(earliestToolStart, start)
            }
            if (typeof earliestToolStart === "number") {
                messageTimestamp = Math.min(messageTimestamp, earliestToolStart - 1)
            }
        }

        const existingText = msg.parts
            .filter((p): p is MessageV2.TextPart => p.type === "text")
            .map(p => p.text)
            .join("\n")

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
            } else if (part.type === "reasoning") {
                parts.push({ type: "reasoning", text: part.text })
            } else if (part.type === "tool") {
                // Map specific tools to custom UI parts
                if (part.tool === "selector" && part.state.status === "completed") {
                    parts.push({
                        type: "ui",
                        ui: {
                            name: "selector",
                            props: (part.state.output as unknown as Record<string, any>) || {}
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

        const baseMessage: ClientMessage = {
            id: msg.info.id,
            role: msg.info.role === "user" ? "user" as const : "agent" as const,
            content,
            parts,
            timestamp: messageTimestamp,
            activities: activities.length > 0 ? activities : undefined
        }

        const syntheticMessages: ClientMessage[] = []

        for (const toolPart of toolParts) {
            if (
                toolPart.state.status !== "completed" ||
                (toolPart.tool !== "generate_spritesheet" && toolPart.tool !== "generate-spritesheet")
            ) {
                continue
            }

            const urls = extractMarkdownImageUrls(toolPart.state.output)
                .filter(Boolean)
                .filter((url) => !(existingText && textContainsMarkdownImage(existingText, url)))

            if (urls.length === 0) continue

            const endTime = toolPart.state.time.end
            const syntheticTimestamp = typeof endTime === "number" ? endTime + 1 : messageTimestamp + 1

            syntheticMessages.push({
                id: `gen_${toolPart.id}`,
                role: "agent",
                content: "",
                parts: urls.map((url) => ({ type: "image" as const, url })),
                timestamp: syntheticTimestamp,
                synthetic: true,
            })
        }

        return [baseMessage, ...syntheticMessages]
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
