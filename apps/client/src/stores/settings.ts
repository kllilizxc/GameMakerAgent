
import { create } from "zustand"
import { HTTP_SERVER_URL } from "@/lib/constants"

interface Model {
    id: string
    providerId: string
    name: string
}

interface SettingsState {
    models: Model[]
    activeModel: string | null
    isLoading: boolean

    fetchModels: () => Promise<void>
    setActiveModel: (modelId: string | undefined) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
    models: [],
    activeModel: null,
    isLoading: false,

    fetchModels: async () => {
        set({ isLoading: true })
        try {
            // Use the constant or relative URL
            const res = await fetch(`${HTTP_SERVER_URL}/api/config/models`)
            const data = await res.json()
            set({
                models: data.models,
                activeModel: data.activeModel || null
            })
        } catch (e) {
            console.error("Failed to fetch models", e)
        } finally {
            set({ isLoading: false })
        }
    },

    setActiveModel: async (modelId: string | undefined) => {
        // Optimistic update
        set({ activeModel: modelId || null })
        try {
            await fetch(`${HTTP_SERVER_URL}/api/config/model`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modelId })
            })
        } catch (e) {
            console.error("Failed to set active model", e)
            // Revert on failure? For now, just log.
        }
    }
}))
