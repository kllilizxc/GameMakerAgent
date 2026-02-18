
import { Jimp } from "jimp"

export async function genEmptyPng(w = 1024, h = 256) {

    // new Jimp(options) seems required based on error "options is not an Object"
    const image = new Jimp({ width: w, height: h, color: 0x00000000 });

    const buffer = await image.getBuffer("image/png");
    return "data:image/png;base64," + buffer.toString("base64");
}

export async function genGuideImage(targetW: number, targetH: number, baseSize = 1024) {
    // Create base image (black/transparent)
    const image = new Jimp({ width: baseSize, height: baseSize, color: 0x000000FF }); // Black background

    // Create target green rect
    const greenRect = new Jimp({ width: targetW, height: targetH, color: 0x00FF00FF }); // Green

    // Calculate center position
    const x = Math.floor((baseSize - targetW) / 2);
    const y = Math.floor((baseSize - targetH) / 2);

    // Composite green rect onto base image
    image.composite(greenRect, x, y);

    const buffer = await image.getBuffer("image/png");
    return "data:image/png;base64," + buffer.toString("base64");
}



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

export async function cropImage(buffer: Buffer, width: number, height: number): Promise<Buffer> {
    const image = await Jimp.read(buffer)

    const srcW = image.bitmap.width
    const srcH = image.bitmap.height

    // Calculate center crop
    const x = Math.max(0, (srcW - width) / 2)
    const y = Math.max(0, (srcH - height) / 2)

    // Check bounds
    if (width > srcW || height > srcH) {
        // If target is larger than source, we might need to resize first or just error/warn.
        // For now, let's just return original or crop what we can. 
        // Better behavior: crop strictly to min dimensions
        const cropW = Math.min(srcW, width)
        const cropH = Math.min(srcH, height)
        const cropX = (srcW - cropW) / 2
        const cropY = (srcH - cropH) / 2
        image.crop({ x: cropX, y: cropY, w: cropW, h: cropH })
    } else {
        image.crop({ x, y, w: width, h: height })
    }

    return await image.getBuffer("image/png")
}
