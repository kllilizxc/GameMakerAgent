import { useThemeStore, availableThemes } from "@/stores/theme"
import { Sun, Moon } from "lucide-react"
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown"
import { cn } from "@/lib/utils"
import { IconButton } from "@/components/ui/IconButton"

export function ThemeToggle() {
    const { theme, mode, setTheme, toggleMode } = useThemeStore()

    const themeOptions: DropdownOption<string>[] = availableThemes.map((t) => ({
        id: t.id,
        label: t.name,
        // Using endIcon for color indicator as requested
        endIcon: (
            <span
                className={cn(
                    "w-3 h-3 rounded-full border border-border shadow-sm",
                    !t.color && "bg-muted" // Fallback if no color extracted
                )}
                style={{ backgroundColor: t.color }}
            />
        ),
    }))

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
}
