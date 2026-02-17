
import { removeGreenBackground } from "../src/image"
import fs from "fs/promises"
import path from "path"

async function main() {
    const args = process.argv.slice(2)
    const inputPath = args[0]

    if (!inputPath) {
        console.error("Usage: bun run scripts/test-green-screen.ts <path-to-image>")
        process.exit(1)
    }

    console.log(`Processing image: ${inputPath}`)
    const buffer = await fs.readFile(inputPath)

    // Test thresholds
    const thresholds = [200, 205, 210, 215]

    for (const threshold of thresholds) {
        console.log(`Testing threshold: ${threshold}...`)
        try {
            const processed = await removeGreenBackground(buffer, threshold)
            const outputPath = path.join(path.dirname(inputPath), `output_t${threshold}_${path.basename(inputPath)}`)
            await fs.writeFile(outputPath, processed)
            console.log(`Saved: ${outputPath}`)
        } catch (error) {
            console.error(`Failed for threshold ${threshold}:`, error)
        }
    }
}

main().catch(console.error)
