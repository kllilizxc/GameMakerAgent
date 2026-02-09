import { TemplateInfo } from "@/types/session"

// Add global type definition for runtime env
declare global {
    interface Window {
        __ENV__?: {
            VITE_SERVER_URL?: string
        }
    }
}

const WS_URL = window.__ENV__?.VITE_SERVER_URL || import.meta.env.VITE_SERVER_URL || "ws://localhost:3001"
const API_BASE_URL = WS_URL.replace(/^ws/, "http")

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

        // Handle 204 No Content
        if (res.status === 204) {
            return {} as T
        }

        return await res.json()
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

// --- API Methods ---

export function fetchTemplates(): Promise<TemplateInfo[]> {
    return get<{ templates: TemplateInfo[] }>("/templates").then((data) => data.templates)
}
