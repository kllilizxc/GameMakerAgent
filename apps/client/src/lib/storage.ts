/**
 * Storage Protocol Layer
 * 
 * Abstract interface for persisting session history.
 * Currently backed by localStorage, can be swapped for IndexedDB, 
 * REST API, or any other storage mechanism.
 */

export interface SessionHistoryItem {
    id: string
    name: string
    lastActive: number
    templateId?: string
}

export interface StorageProvider {
    getHistory(): Promise<SessionHistoryItem[]>
    saveHistory(history: SessionHistoryItem[]): Promise<void>
    clearHistory(): Promise<void>
}

const STORAGE_KEY = "game-agent-history"

/**
 * LocalStorage implementation of StorageProvider
 */
class LocalStorageProvider implements StorageProvider {
    async getHistory(): Promise<SessionHistoryItem[]> {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            return stored ? JSON.parse(stored) : []
        } catch (e) {
            console.error("[storage] Failed to read history:", e)
            return []
        }
    }

    async saveHistory(history: SessionHistoryItem[]): Promise<void> {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
        } catch (e) {
            console.error("[storage] Failed to save history:", e)
        }
    }

    async clearHistory(): Promise<void> {
        try {
            localStorage.removeItem(STORAGE_KEY)
        } catch (e) {
            console.error("[storage] Failed to clear history:", e)
        }
    }
}

// Export singleton instance - swap this for database provider later
export const storage: StorageProvider = new LocalStorageProvider()

// Re-export type for convenience
export type { SessionHistoryItem as HistoryItem }
