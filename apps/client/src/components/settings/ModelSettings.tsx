import { useState } from "react"
import { useSettingsStore } from "@/stores/settings"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/Dialog"
import { cn } from "@/lib/utils"
import { Check, Settings, Plus } from "lucide-react"

interface ModelSettingsProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ModelSettings({ open, onOpenChange }: ModelSettingsProps) {
    const { models, activeModel, setActiveModel, isLoading } = useSettingsStore()
    const [currentTab, setCurrentTab] = useState<"select" | "add">("select")

    const handleSwitchModel = async (modelId: string) => {
        await setActiveModel(modelId)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
                <DialogDescription>
                    Configure your AI providers and models.
                </DialogDescription>
            </DialogHeader>

            <div className="flex gap-2 p-1 bg-zinc-800/50 rounded-lg mb-4">
                <button
                    onClick={() => setCurrentTab("select")}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                        currentTab === "select"
                            ? "bg-zinc-700 text-white shadow-sm"
                            : "text-zinc-400 hover:text-zinc-200"
                    )}
                >
                    <Settings size={14} />
                    Select Model
                </button>
                <button
                    onClick={() => setCurrentTab("add")}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                        currentTab === "add"
                            ? "bg-zinc-700 text-white shadow-sm"
                            : "text-zinc-400 hover:text-zinc-200"
                    )}
                >
                    <Plus size={14} />
                    Add Provider
                </button>
            </div>

            <DialogContent className="max-h-[60vh] overflow-y-auto">
                {currentTab === "select" ? (
                    <div className="space-y-2">
                        {isLoading && models.length === 0 ? (
                            <div className="text-center py-8 text-zinc-500">Loading models...</div>
                        ) : models.length === 0 ? (
                            <div className="text-center py-8 text-zinc-500">No models found. Add a provider first.</div>
                        ) : (
                            models.map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => handleSwitchModel(model.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left",
                                        activeModel === model.id
                                            ? "bg-blue-500/10 border-blue-500 text-blue-400"
                                            : "bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
                                    )}
                                >
                                    <div>
                                        <div className="font-medium">{model.name}</div>
                                        <div className="text-xs text-zinc-500 uppercase tracking-wider">{model.providerId}</div>
                                    </div>
                                    {activeModel === model.id && <Check size={18} />}
                                </button>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 border-dashed text-center">
                            <p className="text-sm text-zinc-400 mb-2">Programmatic Provider Registration</p>
                            <p className="text-xs text-zinc-500">
                                Currently, providers are registered programmatically in `apps/server/src/config.ts`.
                                Dynamic registration via UI is coming soon.
                            </p>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
