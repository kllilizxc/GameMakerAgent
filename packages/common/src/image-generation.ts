
import { OpenAI, toFile } from "openai"
import { GoogleGenAI } from "@google/genai"
import * as fs from "fs"

export interface ImageGenerationOptions {
    apiKey?: string
    baseURL?: string
    prompt: string
    // Unified image params
    images?: Buffer[] // images[0] is main image, images[1..] are extra images
    mask?: Buffer
    imageName?: string
    model?: string
    n?: number
    size?: string // OpenAI size param
    // Extended params
    aspectRatio?: string // '16:9', etc.
    imageSize?: string // '1K', '2K', '4K'
    style?: string
}

/**
 * Generates an edited image using OpenAI-compatible API.
 * Uses `client.images.edit` which requires a base image (and optional mask).
 * This utility handles the buffer-to-file conversion using `openai.toFile`.
 */
export async function generateImageEdit(options: ImageGenerationOptions): Promise<string> {
    const client = new OpenAI({
        baseURL: options.baseURL || process.env.NANOBANANA_BASE_URL || "http://127.0.0.1:8045/v1",
        apiKey: options.apiKey || process.env.NANOBANANA_API_KEY || "sk-0c30858760cf47fe9d6e438da54d3808",
    })

    const model = options.model || process.env.NANOBANANA_IMAGE_MODEL || "gemini-3-pro-image"
    const imageName = options.imageName || "image.png"

    // Construct the payload with standard and extended parameters
    const payload: any = {
        model: model,
        prompt: options.prompt,
        n: options.n || 1,
        response_format: "b64_json"
    }

    // Standard params
    if (options.size) payload.size = options.size

    // Main image
    const mainImage = options.images?.[0]
    if (!mainImage) throw new Error("Main image (images[0]) is required")
    payload.image = await toFile(mainImage, imageName)

    // Optional standard params
    if (options.mask) payload.mask = await toFile(options.mask, "mask.png")

    // Extended params (mapped from user doc)
    if (options.aspectRatio) payload.aspect_ratio = options.aspectRatio
    if (options.imageSize) payload.image_size = options.imageSize
    if (options.style) payload.style = options.style

    // Extra images (images[1..])
    if (options.images && options.images.length > 1) {
        for (let i = 1; i < options.images.length; i++) {
            const buf = options.images[i]
            const name = `image${i}` // image1, image2...
            payload[name] = await toFile(buf, `${name}.png`)
        }
    }

    try {
        // Cast to any because standard SDK types don't include these extended fields
        const response = await client.images.edit(payload)

        const content = response.data?.[0]?.b64_json
        if (!content) {
            throw new Error("No content received from image generation model")
        }

        return content
    } catch (error: any) {
        throw new Error(`Image generation failed: ${error.message}`)
    }
}

export interface ChatImageGenerationOptions {
    apiKey?: string
    baseURL?: string
    prompt: string
    model?: string
}

/**
 * Generates an image using a chat completion model (e.g. gemini-3-pro-image).
 * This relies on the model returning the image content directly in the text response.
 */
export async function generateImageChat(options: ChatImageGenerationOptions): Promise<string> {
    const client = new OpenAI({
        baseURL: options.baseURL || process.env.NANOBANANA_BASE_URL || "http://127.0.0.1:8045/v1",
        apiKey: options.apiKey || process.env.NANOBANANA_API_KEY || "sk-0c30858760cf47fe9d6e438da54d3808",
    })

    const model = options.model || "gemini-3-pro-image"

    try {
        const response = await client.chat.completions.create({
            model: model,
            messages: [{
                "role": "user",
                "content": options.prompt
            }]
        } as any)

        const content = response.choices[0].message.content
        if (!content) {
            throw new Error("No content received from chat model")
        }

        return content
    } catch (error: any) {
        throw new Error(`Chat image generation failed: ${error.message}`)
    }
}

export interface SoraImageGenerationOptions {
    apiKey?: string
    baseURL?: string
    prompt: string
    model?: string
    size?: string
    variants?: number
    images?: Buffer[] // images to be converted to data urls
}

export interface SyncImageGenerationOptions {
    apiKey?: string // typically not used for this specific internal API but keeping for consistency
    baseURL?: string // defaults to http://zx2.52youxi.cc
    prompt: string
    model?: string
    aspectRatio?: string
    imageSize?: string
    images?: Buffer[]
}

/**
 * Generates an image using the synchronous API (e.g. zx2.52youxi.cc).
 * Converts images to data URLs and sends them in the 'urls' field.
 */
export async function generateImageSync(options: SyncImageGenerationOptions): Promise<string> {
    const baseURL = options.baseURL || process.env._52YOUXI_BASE_URL || "http://zx2.52youxi.cc"
    const url = `${baseURL}/api/generateSync`

    // Default model from example
    const model = options.model || "nano-banana-pro"

    const myHeaders = new Headers();
    // Use provided key or a default placeholder if not strictly required by this specific endpoint/proxy
    const apiKey = options.apiKey || process.env._52YOUXI_API_KEY || "API_key"
    myHeaders.append("Authorization", `Bearer ${apiKey}`);
    myHeaders.append("Content-Type", "application/json");

    const imageUrls = options.images
        ? options.images.map(buf => `data:image/png;base64,${buf.toString('base64')}`)
        : []

    const raw = JSON.stringify({
        "model": model,
        "prompt": options.prompt,
        "aspectRatio": options.aspectRatio || "1:1",
        "imageSize": options.imageSize || "1K",
        "urls": imageUrls
    });

    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow' as RequestRedirect
    };

    try {
        const response = await fetch(url, requestOptions)

        if (!response.ok) {
            throw new Error(`Sync API request failed: ${response.status} ${response.statusText}`)
        }

        const result = await response.text()
        console.log(result)

        // precise parsing might depend on actual response format, assuming plain text url or json with url?
        // The example says "response.text() ... console.log(result)". 
        // Assuming the result IS the image URL or base64? 
        // If it returns a JSON with url, we need to parse it. 
        // If it returns just text, we return it.
        // Let's try to parse as JSON first, if fails return text.
        try {
            const data = JSON.parse(result)
            if (data.url) return data.url
            if (data.data && data.data.url) return data.data.url
            if (data.results && data.results[0] && data.results[0].url) return data.results[0].url
            // Check for error in json
            if (data.error) throw new Error(data.error)
            return result // fallback
        } catch (e) {
            return result
        }

    } catch (error: any) {
        throw new Error(`Sync image generation failed: ${error.message}`)
    }
}

export interface GoogleImageGenerationOptions {
    apiKey?: string
    prompt: string
    model?: string
    aspectRatio?: string // '16:9', '4:3', etc.
    imageSize?: string // '2K', etc.
    images?: Buffer[]
    baseURL?: string
}

/**
 * Generates an image using Google GenAI SDK.
 */
export async function generateImageGoogle(options: GoogleImageGenerationOptions): Promise<string> {
    const apiKey = options.apiKey || process.env.GOOGLE_API_KEY
    if (!apiKey) throw new Error("Google API Key is required")

    const ai = new GoogleGenAI({ apiKey, httpOptions: { baseUrl: options.baseURL || process.env.GOOGLE_BASE_URL || "https://generativelanguage.googleapis.com" } })

    const promptParts: any[] = [{ text: options.prompt }]

    if (options.images) {
        for (const buf of options.images) {
            promptParts.push({
                inlineData: {
                    mimeType: "image/png",
                    data: buf.toString("base64")
                }
            })
        }
    }

    try {
        const modelName = options.model || "gemini-3-pro-image-preview"

        const config: any = {}
        if (options.aspectRatio || options.imageSize) {
            config.imageConfig = {}
            if (options.aspectRatio) config.imageConfig.aspectRatio = options.aspectRatio
            if (options.imageSize) config.imageConfig.imageSize = options.imageSize
        }

        const response = await ai.models.generateContent({
            model: modelName,
            contents: promptParts,
            config: config
        })

        // Extract image data from response
        const candidates = response.candidates
        if (!candidates || candidates.length === 0) throw new Error("No candidates returned")

        const content = candidates[0].content
        if (!content || !content.parts) throw new Error("No content parts returned")

        const parts = content.parts
        for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
                return part.inlineData.data
            }
        }

        throw new Error("No image data found in response")

    } catch (error: any) {
        throw new Error(`Google image generation failed: ${error.message}`)
    }
}

/**
 * Generates an image using the Sora/GPT-Image API (streaming).
 * Handles the streaming response to find the final success status and image URL.
 */
export async function generateImageSora(options: SoraImageGenerationOptions): Promise<string> {
    const baseURL = options.baseURL || process.env.NANOBANANA_BASE_URL || "http://127.0.0.1:8045/v1"
    const apiKey = options.apiKey || process.env.NANOBANANA_API_KEY || "sk-0c30858760cf47fe9d6e438da54d3808"
    const url = `${baseURL}/draw/completions`

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: options.model || "sora-image",
                prompt: options.prompt,
                size: options.size || "1:1",
                variants: options.variants || 1,
                urls: options.images ? options.images.map(buf => `data:image/png;base64,${buf.toString('base64')}`) : [],
                shutProgress: false // We need progress to keep connection alive, but we mainly want the end result
            })
        })

        if (!response.ok) {
            throw new Error(`Sora API request failed: ${response.status} ${response.statusText}`)
        }

        if (!response.body) {
            throw new Error("No response body received from Sora API")
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        let finalUrl: string | null = null

        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })

            // Process lines (assuming SSE or newline-delimited JSON)
            const lines = buffer.split("\n")
            buffer = lines.pop() || "" // Keep incomplete line

            for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed) continue

                // Remove "data: " prefix if present (SSE standard)
                const jsonStr = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed

                if (jsonStr === "[DONE]") return finalUrl || "" // End of stream

                try {
                    const data = JSON.parse(jsonStr)

                    if (data.status === "failed") {
                        throw new Error(data.error || data.failure_reason || "Image generation failed")
                    }

                    if (data.status === "succeeded") {
                        // Prefer results array if available
                        if (data.results && data.results.length > 0) {
                            finalUrl = data.results[0].url
                        } else if (data.url) {
                            finalUrl = data.url
                        }
                    }
                } catch (e) {
                    // Ignore parse errors for intermediate chunks
                }
            }
        }

        if (!finalUrl) {
            throw new Error("Stream ended without success status or image URL")
        }

        return finalUrl

    } catch (error: any) {
        throw new Error(`Sora image generation failed: ${error.message}`)
    }
}

export type ImageGenerationType = "edit" | "chat" | "sora" | "sync" | "google"

export interface UnifiedImageGenerationOptions {
    type: ImageGenerationType
    prompt: string
    apiKey?: string
    baseURL?: string
    model?: string

    // Unified Image Input
    // For 'edit': images[0] is main buffer, images[1..] are extra buffers
    // For 'sora': images are converted to data urls
    images?: Buffer[]

    // Sync params
    // Uses aspectRatio, imageSize from Extended Edit Params
    // Uses model, prompt from top level

    mask?: Buffer // for 'edit'

    size?: string // for 'edit' (OpenAI enum) or 'sora' (string)
    n?: number // for 'edit' (n) or 'sora' (variants)

    // Extended Edit Params
    aspectRatio?: string
    imageSize?: string
    style?: string
    imageName?: string
}

/**
 * Unified image generation wrapper that delegates to specific implementations based on type.
 */
export async function generateImage(options: UnifiedImageGenerationOptions): Promise<string> {
    switch (options.type) {
        case "edit":
            // Filter only buffers for edit mode
            const editImages = options.images?.filter((img): img is Buffer => Buffer.isBuffer(img))
            if (!editImages || editImages.length === 0) throw new Error("At least one image buffer is required for 'edit' type")

            return generateImageEdit({
                apiKey: options.apiKey,
                baseURL: options.baseURL,
                prompt: options.prompt,
                images: editImages,
                mask: options.mask,
                imageName: options.imageName,
                model: options.model,
                n: options.n,
                size: options.size,
                aspectRatio: options.aspectRatio,
                imageSize: options.imageSize,
                style: options.style
            })
        case "chat":
            return generateImageChat({
                apiKey: options.apiKey,
                baseURL: options.baseURL,
                prompt: options.prompt,
                model: options.model
            })
        case "sora":
            return generateImageSora({
                apiKey: options.apiKey,
                baseURL: options.baseURL,
                prompt: options.prompt,
                model: options.model,
                size: options.size,
                variants: options.n, // map n to variants
                images: options.images
            })
        case "sync":
            return generateImageSync({
                apiKey: options.apiKey,
                baseURL: options.baseURL,
                prompt: options.prompt,
                model: options.model,
                aspectRatio: options.aspectRatio,
                imageSize: options.imageSize,
                images: options.images
            })
        case "google":
            return generateImageGoogle({
                apiKey: options.apiKey,
                prompt: options.prompt,
                model: options.model,
                aspectRatio: options.aspectRatio,
                imageSize: options.imageSize,
                images: options.images
            })
        default:
            throw new Error(`Unknown image generation type: ${(options as any).type}`)
    }
}
