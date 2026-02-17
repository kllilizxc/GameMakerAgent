import { Jimp } from "jimp"

export async function removeGreenBackground(buffer: Buffer, threshold: number = 100): Promise<Buffer> {
    const image = await Jimp.read(buffer)

    // Target green color: #00FF00
    const targetGreen = { r: 0, g: 255, b: 0 }

    image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
        const r = image.bitmap.data[idx + 0]
        const g = image.bitmap.data[idx + 1]
        const b = image.bitmap.data[idx + 2]

        // Calculate euclidean distance to target green
        // Sqrt not strictly necessary for comparison but good for tuning
        const dist = Math.sqrt(
            Math.pow(r - targetGreen.r, 2) +
            Math.pow(g - targetGreen.g, 2) +
            Math.pow(b - targetGreen.b, 2)
        )

        if (dist < threshold) {
            // Make transparent
            image.bitmap.data[idx + 3] = 0
        }
    })

    // Get buffer back from Jimp
    return await image.getBuffer("image/png")
}
