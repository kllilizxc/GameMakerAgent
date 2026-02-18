import { Elysia, t } from "elysia"
import { getConfig, saveConfig, getModels, getActiveModel, setActiveModel } from "../config"

export const configRoutes = new Elysia({ prefix: "/api/config" })
    .post("/provider", async ({ body }) => {
        const config = getConfig()
        if (!config.provider) config.provider = {}

        // Merge or overwrite provider config
        config.provider[body.providerId] = body.config
        saveConfig(config)
        return { success: true }
    }, {
        body: t.Object({
            providerId: t.String(),
            config: t.Any()
        })
    })
    .get("/models", async () => {
        return {
            models: getModels(),
            activeModel: getActiveModel()
        }
    })
    .post("/model", async ({ body }) => {
        setActiveModel(body.modelId)
        return { success: true }
    }, {
        body: t.Object({
            modelId: t.Optional(t.String())
        })
    })
