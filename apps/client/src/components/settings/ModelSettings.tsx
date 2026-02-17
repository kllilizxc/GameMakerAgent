import { useState } from "react"
import { Button } from "@heroui/react"
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

            <DialogContent className="max-h-[60vh] overflow-y-auto pt-0">
                <div className="flex gap-2 p-1 bg-zinc-800/50 rounded-lg mb-4 sticky top-0 z-10">
                    <Button
                        onPress={() => setCurrentTab("select")}
                        variant={currentTab === "select" ? "secondary" : "ghost"}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2",
                            currentTab !== "select" && "text-zinc-400 hover:text-zinc-200"
                        )}
                        size="sm"
                    >
                        <Settings size={14} />
                        Select Model
                    </Button>
                    <Button
                        onPress={() => setCurrentTab("add")}
                        variant={currentTab === "add" ? "secondary" : "ghost"}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2",
                            currentTab !== "add" && "text-zinc-400 hover:text-zinc-200"
                        )}
                        size="sm"
                    >
                        <Plus size={14} />
                        Add Provider
                    </Button>
                </div>
                {currentTab === "select" ? (
                    <div className="space-y-2">
                        {isLoading && models.length === 0 ? (
                            <div className="text-center py-8 text-zinc-500">Loading models...</div>
                        ) : models.length === 0 ? (
                            <div className="text-center py-8 text-zinc-500">No models found. Add a provider first.</div>
                        ) : (
                            models.map((model) => (
                                <Button
                                    key={model.id}
                                    onPress={() => handleSwitchModel(model.id)}
                                    variant="ghost"
                                    className={cn(
                                        "w-full flex items-center justify-between p-3 h-auto min-h-[48px] rounded-lg border transition-all text-left",
                                        activeModel === model.id
                                            ? "bg-primary/10 border-primary text-primary"
                                            : "bg-surface-secondary/50 border-border text-muted-foreground hover:border-border-strong hover:bg-surface-secondary"
                                    )}
                                >
                                    <div className="flex flex-col items-start">
                                        <div className="font-medium text-foreground">{model.name}</div>
                                        <div className="text-xs text-muted-foreground uppercase tracking-wider">{model.providerId}</div>
                                    </div>
                                    {activeModel === model.id && <Check size={18} className="text-primary" />}
                                </Button>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 bg-surface-secondary/50 rounded-lg border border-border border-dashed text-center">
                            <p className="text-sm text-muted-foreground mb-2">Programmatic Provider Registration</p>
                            <p className="text-xs text-muted-foreground">
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
