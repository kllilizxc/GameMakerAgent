import { useThemeStore, availableThemes } from "@/stores/theme"
import { memo, useMemo } from "react"
import { Sun, Moon } from "lucide-react"
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown"
import { cn } from "@/lib/utils"
import { IconButton } from "@/components/ui/IconButton"

export const ThemeToggle = memo(function ThemeToggle() {
    const theme = useThemeStore((s) => s.theme)
    const mode = useThemeStore((s) => s.mode)
    const setTheme = useThemeStore((s) => s.setTheme)
    const toggleMode = useThemeStore((s) => s.toggleMode)

    const themeOptions: DropdownOption<string>[] = useMemo(() => availableThemes.map((t) => ({
        id: t.id,
        label: t.name,
        endIcon: (
            <span
                className={cn(
                    "w-3 h-3 rounded-full border border-border shadow-sm",
                    !t.color && "bg-muted"
                )}
                style={{ backgroundColor: t.color }}
            />
        ),
    })), []) // availableThemes is a module-level constant

    return (
        <div className="flex items-center gap-2">
            <Dropdown
                options={themeOptions}
                value={theme}
                onChange={setTheme}
                placement="bottom"
                trigger={
                    <div className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors rounded-md hover:bg-primary text-foreground hover:text-primary-foreground">
                        <span className="capitalize">{availableThemes.find(t => t.id === theme)?.name || theme}</span>
                    </div>
                }
            />
            <IconButton
                onClick={toggleMode}
                title="Toggle Mode"
                size="md"
                className="h-9 w-9" // Slightly smaller than md default (10) to match prev style
                icon={mode === "light" ? <Sun size={18} /> : <Moon size={18} />}
            />
        </div>
    )
})
