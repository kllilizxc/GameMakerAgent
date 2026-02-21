import { FILE_SIZE_LIMIT_BINARY } from "@game-agent/common"
import { fetchBlob } from "./api"

export { isImageFile } from "@game-agent/common"

export async function resizeImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = (event) => {
            const img = new Image()
            img.src = event.target?.result as string
            img.onload = () => {
                const canvas = document.createElement("canvas")
                const ctx = canvas.getContext("2d")
                if (!ctx) {
                    reject(new Error("Failed to get canvas context"))
                    return
                }

                // Max dimensions
                const MAX_WIDTH = 1024
                const MAX_HEIGHT = 1024

                let width = img.width
                let height = img.height

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width
                        width = MAX_WIDTH
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height
                        height = MAX_HEIGHT
                    }
                }

                canvas.width = width
                canvas.height = height
                ctx.drawImage(img, 0, 0, width, height)

                // Compress to jpeg with 0.8 quality
                const dataUrl = canvas.toDataURL("image/jpeg", 0.8)
                resolve(dataUrl)
            }
            img.onerror = (error) => reject(error)
        }
        reader.onerror = (error) => reject(error)
    })
}

export function validateImage(file: File): string | null {
    if (!file.type.startsWith("image/")) {
        return "File is not an image"
    }

    if (file.size > FILE_SIZE_LIMIT_BINARY) {
        return `Image size exceeds limit of ${FILE_SIZE_LIMIT_BINARY / (1024 * 1024)}MB`
    }

    return null
}

export async function processImageUrl(url: string): Promise<{ file: File; preview: string; base64: string } | null> {
    try {
        const blob = await fetchBlob(url)
        const file = new File([blob], "image.jpg", { type: blob.type })

        const errorMsg = validateImage(file)
        if (errorMsg) return null

        const preview = URL.createObjectURL(file)
        const base64 = await resizeImage(file)

        return { file, preview, base64 }
    } catch (err) {
        console.error("Failed to process image URL:", err)
        return null
    }
}
