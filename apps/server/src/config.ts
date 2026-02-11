
import { Config, Instance } from "@game-agent/agent"

export interface Model {
    id: string
    providerId: string
    name?: string
}

export interface ProviderConfig {
    name?: string
    npm: string
    options?: Record<string, any>
    api?: string
    env?: string[]
    models: Record<string, { id: string, name?: string, modalities?: any }>
}

export interface OpencodeConfig {
    model?: string
    provider?: Record<string, ProviderConfig>
}

// Hardcoded programmatic configuration
const DEFAULT_CONFIG: OpencodeConfig = {
    provider: {
        "antigravity": {
            "npm": "@ai-sdk/openai-compatible",
            "name": "Antigravity",
            "options": {
                "baseURL": "http://127.0.0.1:8045/v1"
            },
            "env": [
                "ANTIGRAVITY_API_KEY",
                "NANOBANANA_API_KEY"
            ],
            "models": {
                "gemini-3-flash": {
                    "id": "gemini-3-flash",
                    "modalities": {
                        "input": ["image"]
                    }
                },
                "gemini-3-pro": {
                    "id": "gemini-3-pro",
                    "modalities": {
                        "input": ["image"]
                    }
                }
            }
        },
        "opencode": {
            "npm": "@ai-sdk/openai-compatible",
            "models": {
                "big-pickle": { "id": "big-pickle" }
            }
        }
    },
    model: "opencode/big-pickle"
}

// In-memory state (replace with a real DB as the project grows)
let currentConfig: OpencodeConfig = { ...DEFAULT_CONFIG }

// Initialize the configuration override at startup
export function initConfig() {
    console.log(`[config] Initializing programmatic configuration`)
    console.log(`[config] Applying initial override with ${Object.keys(currentConfig.provider || {}).length} providers`)
    Config.override(currentConfig as any)
}

export function getConfig(): OpencodeConfig {
    return currentConfig
}

export function saveConfig(config: OpencodeConfig) {
    currentConfig = config
    console.log("[config] Programmatic config updated in-memory")
}

export function getModels(): Model[] {
    const config = getConfig()
    const models: Model[] = []

    if (config.provider) {
        for (const [providerId, provider] of Object.entries(config.provider)) {
            if (provider.models) {
                for (const [modelKey, modelDef] of Object.entries(provider.models)) {
                    models.push({
                        id: `${providerId}/${modelKey}`, // construct full ID: provider/model
                        providerId,
                        name: modelDef.name || modelKey
                    })
                }
            }
        }
    }

    return models
}

export function getActiveModel(): string | undefined {
    return currentConfig.model
}

export async function setActiveModel(modelId: string | undefined) {
    // 1. Update the in-memory config
    if (modelId === undefined || modelId === null) {
        currentConfig.model = "opencode/big-pickle"
    } else {
        currentConfig.model = modelId
    }

    // 2. Programmatically override the running instance configuration
    Config.override(currentConfig as any)

    // 3. Invalidate the cache to force a reload for all instances
    console.log("[config] Switching model to:", currentConfig.model, "- Invaldating all instances")
    await Instance.disposeAll()
}
