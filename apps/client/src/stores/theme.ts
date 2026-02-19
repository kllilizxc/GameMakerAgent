import { create } from "zustand"
import { persist } from "zustand/middleware"

// 1. Dynamic Import of Theme CSS for Injection (Side-effects)
const themeStyles = import.meta.glob("../themes/*.css", { eager: true })

// 2. Dynamic Import of Theme CSS for Parsing (Content)
const themeContent = import.meta.glob("../themes/*.css", { query: '?inline', eager: true })

// 3. Parse Themes from Filenames and Content
interface ThemeConfig {
    name: string
    modes: ("light" | "dark")[]
    color?: string
}

const registeredThemes: Record<string, ThemeConfig> = {}

Object.keys(themeStyles).forEach((path) => {
    // Extract filename: ../themes/ocean-light.css -> ocean-light
    const filename = path.split("/").pop()?.replace(".css", "")
    if (!filename) return

    // Split into theme and mode
    const parts = filename.split("-")
    const mode = parts[parts.length - 1] as "light" | "dark"
    if (mode !== "light" && mode !== "dark") return // Skip invalid files

    const themeName = parts.slice(0, -1).join("-") // e.g., 'ocean', 'default'

    // Parse CSS content to find --accent
    let accentColor: string | undefined
    if (themeContent[path]) {
        const cssText = (themeContent[path] as any).default as string
        // Match --accent: value;
        const match = cssText.match(/--accent:\s*([^;}\n]+)/)
        if (match) {
            accentColor = match[1].trim()
        }
    }

    if (!registeredThemes[themeName]) {
        registeredThemes[themeName] = {
            name: themeName.charAt(0).toUpperCase() + themeName.slice(1),
            modes: [],
            color: accentColor
        }
    } else {
        // Prefer light mode color for the indicator, or use first found
        if (mode === "light" && accentColor) {
            registeredThemes[themeName].color = accentColor
        } else if (!registeredThemes[themeName].color && accentColor) {
            registeredThemes[themeName].color = accentColor
        }
    }

    if (!registeredThemes[themeName].modes.includes(mode)) {
        registeredThemes[themeName].modes.push(mode)
    }
})

// Ensure we have at least default if nothing found (fallback)
if (Object.keys(registeredThemes).length === 0) {
    registeredThemes["default"] = { name: "Default", modes: ["light", "dark"] }
}

export const availableThemes = Object.entries(registeredThemes).map(([id, config]) => ({
    id,
    name: config.name,
    modes: config.modes,
    color: config.color
}))

interface ThemeState {
    theme: string
    mode: "light" | "dark"
    setTheme: (theme: string) => void
    setMode: (mode: "light" | "dark") => void
    toggleMode: () => void
    isChangingTheme: boolean
    targetMode?: "light" | "dark"
}

const applyThemeToDom = (theme: string, mode: "light" | "dark") => {
    const root = document.documentElement
    // Construct data-theme: e.g., "ocean-light"
    const themeId = `${theme}-${mode}`
    root.setAttribute("data-theme", themeId)
    root.style.colorScheme = mode

    if (mode === "dark") {
        root.classList.add("dark")
    } else {
        root.classList.remove("dark")
    }
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => {
            const wrapThemeChange = async (fn: () => void, targetMode?: "light" | "dark") => {
                set({ isChangingTheme: true, targetMode })

                // Wait for the curtain to fully cover the screen before switching
                await new Promise(resolve => setTimeout(resolve, 600))

                fn()

                // Wait for styles to settle and repaint
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

                set({ isChangingTheme: false, targetMode: undefined })
            }

            return {
                theme: "default",
                mode: "dark",
                isChangingTheme: false,
                targetMode: undefined,

                setTheme: (theme) => {
                    const { mode } = get()
                    const config = registeredThemes[theme]
                    const nextMode = (config && !config.modes.includes(mode)) ? config.modes[0] : mode

                    wrapThemeChange(() => {
                        applyThemeToDom(theme, nextMode)
                        set({ theme, mode: nextMode })
                    }, nextMode)
                },

                setMode: (mode) => {
                    wrapThemeChange(() => {
                        const { theme } = get()
                        const config = registeredThemes[theme]
                        if (config && !config.modes.includes(mode)) {
                            console.warn(`Theme ${theme} does not support ${mode} mode`)
                            return
                        }

                        applyThemeToDom(theme, mode)
                        set({ mode })
                    }, mode)
                },

                toggleMode: () => {
                    const { mode } = get()
                    const newMode = mode === "light" ? "dark" : "light"

                    wrapThemeChange(() => {
                        const { theme } = get()
                        const config = registeredThemes[theme]
                        if (config && !config.modes.includes(newMode)) {
                            return
                        }

                        applyThemeToDom(theme, newMode)
                        set({ mode: newMode })
                    }, newMode)
                },
            }
        },
        {
            name: "game-agent-theme-storage",
            onRehydrateStorage: () => (state) => {
                if (state) {
                    applyThemeToDom(state.theme, state.mode)
                }
            }
        }
    )
)
