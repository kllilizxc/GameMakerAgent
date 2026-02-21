/**
 * SSE Stream Processor
 *
 * Utility to handle Server-Sent Events (SSE) from a ReadableStream.
 * Decodes the stream, buffers lines, and parses "data: " prefixed JSON messages.
 */
export async function parseSseStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onMessage: (msg: any) => void
): Promise<void> {
    const decoder = new TextDecoder()
    let buffer = ""

    try {
        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines.pop() || ""

            for (const line of lines) {
                const trimmedLine = line.trim()
                if (!trimmedLine) continue

                if (trimmedLine.startsWith("data: ")) {
                    try {
                        const data = JSON.parse(trimmedLine.slice(6))
                        onMessage(data)
                    } catch (e) {
                        console.error("[sse] Failed to parse message:", e, trimmedLine)
                    }
                }
            }
        }
    } finally {
        reader.releaseLock()
    }
}
