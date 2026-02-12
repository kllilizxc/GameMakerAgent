
import { create } from "zustand"
import { fetchModels, setActiveModel } from "@/lib/api"

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
            const data = await fetchModels()
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
            await setActiveModel(modelId)
        } catch (e) {
            console.error("Failed to set active model", e)
            // Revert on failure? For now, just log.
        }
    }
}))
