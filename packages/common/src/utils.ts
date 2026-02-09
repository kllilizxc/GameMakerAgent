export function isImageFile(filename: string) {
    const ext = filename.split(".").pop()?.toLowerCase()
    return ["png", "jpg", "jpeg", "gif", "webp", "ico", "bmp"].includes(ext || "")
}
