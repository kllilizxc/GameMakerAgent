import { useThemeStore, themes, type ThemeId } from "@/stores/theme"
import { useEffect, useState } from "react"

export function ThemeToggle() {
    const { currentTheme, setTheme, loadTheme } = useThemeStore()
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        loadTheme()
    }, [loadTheme])

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                title="Change Theme"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2" />
                    <path d="M12 20v2" />
                    <path d="m4.93 4.93 1.41 1.41" />
                    <path d="m17.66 17.66 1.41 1.41" />
                    <path d="M2 12h2" />
                    <path d="M20 12h2" />
                    <path d="m6.34 17.66-1.41 1.41" />
                    <path d="m19.07 4.93-1.41 1.41" />
                </svg>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-2 min-w-[140px]">
                        {themes.map((theme) => (
                            <button
                                key={theme.id}
                                onClick={() => {
                                    setTheme(theme.id as ThemeId)
                                    setIsOpen(false)
                                }}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${currentTheme === theme.id
                                        ? "bg-primary/20 text-primary"
                                        : "hover:bg-zinc-800 text-zinc-300"
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span
                                        className="w-3 h-3 rounded-full"
                                        style={{
                                            backgroundColor: `hsl(${theme.variables["--primary"]})`,
                                        }}
                                    />
                                    {theme.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
