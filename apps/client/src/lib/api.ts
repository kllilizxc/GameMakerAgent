import { TemplateInfo } from "@/types/session"
import { SERVER_URL } from "@/lib/constants"

const API_BASE_URL = SERVER_URL

interface RequestOptions extends RequestInit {
    retries?: number
    retryDelay?: number
}

class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message)
        this.name = "ApiError"
    }
}

/**
 * Common request wrapper with retry logic and error handling
 */
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { retries = 3, retryDelay = 1000, ...fetchOptions } = options
    const url = `${API_BASE_URL}${endpoint}`

    try {
        const res = await fetch(url, fetchOptions)

        if (!res.ok) {
            throw new ApiError(res.status, `API request failed: ${res.statusText}`)
        }

        // Handle 204 No Content or empty Content-Length
        if (res.status === 204 || res.headers.get("Content-Length") === "0") {
            return {} as T
        }

        const text = await res.text()
        return text ? JSON.parse(text) : {} as T
    } catch (error) {
        if (retries > 0) {
            console.warn(`Request to ${url} failed, retrying... (${retries} attempts left)`)
            await new Promise((resolve) => setTimeout(resolve, retryDelay))
            return request<T>(endpoint, { ...options, retries: retries - 1 })
        }
        throw error
    }
}

/**
 * GET request helper
 */
export function get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: "GET" })
}

/**
 * POST request helper
 */
export function post<T>(endpoint: string, body: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
        body: JSON.stringify(body),
    })
}

/**
 * POST request helper for streams (returns Response instead of parsed JSON)
 */
export function postStream(endpoint: string, body: unknown, options?: RequestOptions): Promise<Response> {
    const url = `${API_BASE_URL}${endpoint}`
    return fetch(url, {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
        body: JSON.stringify(body),
    })
}

/**
 * Fetch a blob from a URL
 */
export async function fetchBlob(url: string): Promise<Blob> {
    const res = await fetch(url)
    if (!res.ok) throw new ApiError(res.status, `Failed to fetch blob: ${res.statusText}`)
    return res.blob()
}
// ... existing exports ...

/**
 * DELETE request helper
 */
export function del<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: "DELETE" })
}

// --- API Methods ---

export function fetchTemplates(): Promise<TemplateInfo[]> {
    return get<{ templates: TemplateInfo[] }>("/templates").then((data) => data.templates)
}

export async function createSession(engineId: string, templateId?: string, sessionId?: string): Promise<any> {
    return post<any>("/api/session/create", { engineId, templateId, sessionId })
}

export async function startRun(sessionId: string, prompt: string, attachments?: string[], model?: any): Promise<Response> {
    return postStream("/api/run/start", { sessionId, prompt, attachments, model })
}

export async function cancelRun(sessionId: string, runId: string): Promise<any> {
    return post<any>("/api/run/cancel", { sessionId, runId })
}

export async function ackFs(sessionId: string, seq: number): Promise<any> {
    return post<any>("/api/fs/ack", { sessionId, seq })
}

export async function fetchMessages(sessionId: string, limit: number, skip: number): Promise<any> {
    return post<any>("/api/messages/list", { sessionId, limit, skip })
}

export async function rewindSession(sessionId: string, messageId: string, edit?: boolean): Promise<any> {
    return post<any>("/api/session/rewind", { sessionId, messageId, edit })
}

export function deleteSession(sessionId: string): Promise<void> {
    return del<void>(`/sessions/${sessionId}`)
}

export async function fetchModels(): Promise<any> {
    return get<any>("/api/config/models")
}

export async function setActiveModel(modelId: string | undefined): Promise<void> {
    return post<void>("/api/config/model", { modelId })
}

export async function generateImage(prompt: string, size: string): Promise<any> {
    return post<any>("/api/generate-image", { prompt, size })
}

export async function saveImage(imageUrl: string, type: string, sessionId: string): Promise<any> {
    return post<any>("/api/save-image", { imageUrl, type, sessionId })
}

export async function saveFiles(sessionId: string, changes: Array<{ path: string, content: string }>): Promise<any> {
    return post<any>("/api/fs/save", { sessionId, changes })
}
