import { useFilesStore } from "@/stores/files"

export function ImagePreview() {
    const selectedFile = useFilesStore((s) => s.selectedFile)

    if (!selectedFile) return null

    const entry = useFilesStore.getState().getFileEntry(selectedFile)
    if (!entry) return null

    const isBase64 = entry.encoding === "base64"
    const src = isBase64 ? `data:image/png;base64,${entry.content}` : entry.content

    return (
        <div className="h-full flex flex-col items-center justify-center bg-secondary/30 overflow-auto p-8">
            <div className="max-w-full max-h-full relative group">
                {/* Transparency checkerboard background */}
                <div
                    className="absolute inset-0 z-0"
                    style={{
                        backgroundImage: "conic-gradient(#333 90deg, #444 90deg 180deg, #333 180deg 270deg, #444 270deg)",
                        backgroundSize: "20px 20px"
                    }}
                />
                <img
                    src={src}
                    alt={selectedFile}
                    className="relative z-10 max-w-full max-h-[80vh] object-contain shadow-2xl rounded-sm transition-transform duration-200 group-hover:scale-[1.02]"
                />
            </div>

            <div className="mt-6 px-4 py-2 bg-background border border-border rounded-full shadow-sm">
                <p className="text-xs font-mono text-muted-foreground">
                    {selectedFile.split("/").pop()}
                </p>
            </div>
        </div>
    )
}
