import { useState } from "react"
import { cn } from "@/lib/utils"
// Ensure icons are imported. If they don't exist in lucide-react (unlikely), I'll swap them.
// Image, Save, X, RotateCcw, Loader2, Download are standard.
import { Image as ImageIcon, Save, X, RotateCcw, Loader2, Check } from "lucide-react"

type AssetType = "backgrounds" | "characters" | "items" | "ui" | "misc"
// 1024x1024 (1:1), 1280x720 (16:9), 720x1280 (9:16), 1216x896 (4:3)
type ImageSize = "1024x1024" | "1280x720" | "720x1280" | "1216x896"

import { useSessionStore } from "@/stores/session"

export function AssetGenerator() {
    const [prompt, setPrompt] = useState("")
    const [size, setSize] = useState<ImageSize>("1024x1024")
    const [type, setType] = useState<AssetType>("misc")
    // status: idle -> generating -> success -> (saving -> saved)
    const [status, setStatus] = useState<"idle" | "generating" | "success" | "error" | "saving" | "saved">("idle")
    const [generatedImage, setGeneratedImage] = useState<string | null>(null)
    const [savedPath, setSavedPath] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState("")

    const sessionId = useSessionStore(state => state.sessionId)

    const handleGenerate = async () => {
        if (!prompt) return

        setStatus("generating")
        setErrorMessage("")
        setGeneratedImage(null)
        setSavedPath(null)

        try {
            const response = await fetch("http://localhost:3001/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, size })
            })

            if (!response.ok) throw new Error("Generation failed")

            const data = await response.json()
            const content = data.content
            // Simple regex to extract URL from markdown if present
            const markdownRegex = /!\[.*?\]\((.*?)\)/
            const match = content.match(markdownRegex)
            const imageUrl = match ? match[1] : content

            setGeneratedImage(imageUrl)
            setStatus("success")
        } catch (err) {
            console.error(err)
            setErrorMessage("Failed to generate image. Please ensure the backend and AI service are running.")
            setStatus("error")
        }
    }

    const handleSave = async () => {
        if (!generatedImage) return
        if (!sessionId) {
            setErrorMessage("No active session found.")
            return
        }

        setStatus("saving")

        try {
            const response = await fetch("http://localhost:3001/api/save-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    imageUrl: generatedImage,
                    type,
                    sessionId
                })
            })

            if (!response.ok) throw new Error("Save failed")

            const data = await response.json()
            setSavedPath(data.path)
            setStatus("saved")

            // Optional: clear after a delay or let user see "Saved!"
            setTimeout(() => {
                if (status === "saved") {
                    // keep it saved or reset? User might want to generate another.
                }
            }, 2000)

        } catch (err) {
            console.error(err)
            setErrorMessage("Failed to save image.")
            setStatus("success") // Revert to success so they can try again
        }
    }

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-5xl mx-auto w-full space-y-8">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight">Assets</h2>
                        <p className="text-muted-foreground">Generate and save game assets.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* Controls */}
                        <div className="space-y-6 bg-card p-6 rounded-xl border border-border shadow-sm">
                            <div className="space-y-3">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Prompt
                                </label>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Describe the asset..."
                                    className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <label className="text-sm font-medium leading-none">Size</label>
                                    <select
                                        value={size}
                                        onChange={(e) => setSize(e.target.value as ImageSize)}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="1024x1024">Square (1:1)</option>
                                        <option value="1280x720">Landscape (16:9)</option>
                                        <option value="720x1280">Portrait (9:16)</option>
                                        <option value="1216x896">Desktop (4:3)</option>
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-medium leading-none">Type</label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value as AssetType)}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="misc">Misc</option>
                                        <option value="backgrounds">Backgrounds</option>
                                        <option value="characters">Characters</option>
                                        <option value="items">Items</option>
                                        <option value="ui">UI Elements</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={status === "generating" || !prompt}
                                className={cn(
                                    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                                    "bg-primary text-primary-foreground shadow hover:bg-primary/90",
                                    "h-10 w-full px-4 py-2"
                                )}
                            >
                                {status === "generating" ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        Generate
                                    </>
                                )}
                            </button>

                            {errorMessage && (
                                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
                                    <X className="h-4 w-4" />
                                    {errorMessage}
                                </div>
                            )}

                            {savedPath && (
                                <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-600 flex items-center gap-2">
                                    <Check className="h-4 w-4" />
                                    Saved to {savedPath}
                                </div>
                            )}
                        </div>

                        {/* Preview Area */}
                        <div className="space-y-4">
                            <div className={cn(
                                "aspect-square rounded-xl border border-border bg-muted/50 flex flex-col items-center justify-center relative overflow-hidden",
                                status === "generating" && "animate-pulse"
                            )}>
                                {generatedImage ? (
                                    <img
                                        src={generatedImage}
                                        alt="Generated Asset"
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <div className="text-center p-6 text-muted-foreground">
                                        <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="text-sm">Enter a prompt to generate an asset</p>
                                    </div>
                                )}
                            </div>

                            {generatedImage && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleSave}
                                        disabled={status === "saving" || status === "saved"}
                                        className={cn(
                                            "flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                                            "bg-green-600 text-white shadow-sm hover:bg-green-700",
                                            "h-9 px-4 py-2"
                                        )}
                                    >
                                        {status === "saving" ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : status === "saved" ? (
                                            <>
                                                <Check className="mr-2 h-4 w-4" />
                                                Saved
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Accept & Save
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setGeneratedImage(null)
                                            setSavedPath(null)
                                            setStatus("idle")
                                        }}
                                        className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                                    >
                                        <X className="mr-2 h-4 w-4" />
                                        Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
