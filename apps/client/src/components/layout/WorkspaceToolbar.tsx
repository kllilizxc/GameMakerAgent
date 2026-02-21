import { memo } from "react"
import { cn } from "@/lib/utils"
import { Code, Play, RefreshCw, Image as ImageIcon, Terminal } from "lucide-react"
import { usePreviewStore } from "@/stores/preview"
import { ThemeToggle } from "../ui/ThemeToggle"
import { IconButton } from "@/components/ui/IconButton"
import { Tabs } from "@heroui/react"
import { useIsMobile } from "@/hooks/useIsMobile"

export type View = "preview" | "editor" | "assets" | "terminal"

interface WorkspaceToolbarProps {
    view: View
    onViewChange: (view: View) => void
}

export const WorkspaceToolbar = memo(function WorkspaceToolbar({
    view,
    onViewChange,
}: WorkspaceToolbarProps) {
    const refresh = usePreviewStore((s) => s.refresh)
    const status = usePreviewStore((s) => s.status)
    const isMobile = useIsMobile()

    return (
        <div
            className={cn(
                "flex items-center justify-between flex-shrink-0 h-12 px-4"
            )}
        >
            {/* View tabs */}
            <div className="flex items-center">
                <Tabs
                    aria-label="Workspace view"
                    variant="primary"
                    selectedKey={view}
                    onSelectionChange={(key) => onViewChange(key as View)}
                >
                    <Tabs.ListContainer>
                        <Tabs.List>
                            <Tabs.Tab id="preview">
                                <div className={cn("flex items-center gap-2", isMobile ? "px-1" : "px-2")}>
                                    <Play size={14} />
                                    {!isMobile && <span>Preview</span>}
                                    <Tabs.Indicator />
                                </div>
                            </Tabs.Tab>
                            <Tabs.Tab id="editor">
                                <div className={cn("flex items-center gap-2", isMobile ? "px-1" : "px-2")}>
                                    <Code size={14} />
                                    {!isMobile && <span>Code</span>}
                                    <Tabs.Indicator />
                                </div>
                            </Tabs.Tab>
                            <Tabs.Tab id="assets">
                                <div className={cn("flex items-center gap-2", isMobile ? "px-1" : "px-2")}>
                                    <ImageIcon size={14} />
                                    {!isMobile && <span>Assets</span>}
                                    <Tabs.Indicator />
                                </div>
                            </Tabs.Tab>
                            <Tabs.Tab id="terminal">
                                <div className={cn("flex items-center gap-2", isMobile ? "px-1" : "px-2")}>
                                    <Terminal size={14} />
                                    {!isMobile && <span>Terminal</span>}
                                    <Tabs.Indicator />
                                </div>
                            </Tabs.Tab>
                        </Tabs.List>
                    </Tabs.ListContainer>
                </Tabs>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
                <ThemeToggle />
                <IconButton
                    onClick={refresh}
                    disabled={status !== "running"}
                    title="Refresh preview"
                    size={isMobile ? "sm" : "md"}
                    className={isMobile ? "h-7 w-7" : "h-9 w-9"}
                    icon={<RefreshCw size={isMobile ? 14 : 18} />}
                />
            </div>
        </div>
    )
})
