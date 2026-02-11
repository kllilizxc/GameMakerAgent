import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import { existsSync } from "fs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Calculate the absolute path to opencode.json in the project root
// apps/server/src/setup.ts -> ../../../opencode.json
const configPath = resolve(__dirname, "../../../opencode.json")

if (existsSync(configPath)) {
    console.log(`[setup] Found config at ${configPath}`)
    console.log(`[setup] Overriding OPENCODE_CONFIG to absolute path: ${configPath}`)
    process.env.OPENCODE_CONFIG = configPath
} else {
    console.error(`[setup] WARNING: Could not find opencode.json at ${configPath}`)
}
