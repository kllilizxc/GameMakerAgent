export function isImageFile(filename: string) {
    const ext = filename.split(".").pop()?.toLowerCase()
    return ["png", "jpg", "jpeg", "gif", "webp", "ico", "bmp"].includes(ext || "")
}

export function isTempFile(filename: string) {
    return filename.startsWith("--temp-")
}

export function shortId() {
    return Math.random().toString(36).substring(2, 8)
}