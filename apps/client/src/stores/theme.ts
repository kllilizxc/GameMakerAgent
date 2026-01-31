import { create } from "zustand"

export type ThemeId = "dark" | "midnight" | "forest" | "ocean" | "light"

interface Theme {
    id: ThemeId
    name: string
    variables: Record<string, string>
}

export const themes: Theme[] = [
    {
        id: "dark",
        name: "Dark",
        variables: {
            "--background": "0 0% 4%",
            "--foreground": "0 0% 98%",
            "--primary": "142 76% 36%",
            "--primary-foreground": "0 0% 98%",
            "--secondary": "240 4% 16%",
            "--secondary-foreground": "0 0% 98%",
            "--muted": "240 4% 16%",
            "--muted-foreground": "240 5% 65%",
            "--accent": "240 4% 16%",
            "--accent-foreground": "0 0% 98%",
            "--destructive": "0 84% 60%",
            "--destructive-foreground": "0 0% 98%",
            "--border": "240 4% 16%",
            "--ring": "142 76% 36%",
        },
    },
    {
        id: "midnight",
        name: "Midnight",
        variables: {
            "--background": "222 47% 8%",
            "--foreground": "210 40% 98%",
            "--primary": "217 91% 60%",
            "--primary-foreground": "0 0% 100%",
            "--secondary": "217 33% 17%",
            "--secondary-foreground": "210 40% 98%",
            "--muted": "217 33% 17%",
            "--muted-foreground": "215 20% 65%",
            "--accent": "217 33% 17%",
            "--accent-foreground": "210 40% 98%",
            "--destructive": "0 84% 60%",
            "--destructive-foreground": "0 0% 98%",
            "--border": "217 33% 17%",
            "--ring": "217 91% 60%",
        },
    },
    {
        id: "forest",
        name: "Forest",
        variables: {
            "--background": "120 20% 6%",
            "--foreground": "120 10% 96%",
            "--primary": "142 70% 45%",
            "--primary-foreground": "0 0% 100%",
            "--secondary": "120 15% 14%",
            "--secondary-foreground": "120 10% 96%",
            "--muted": "120 15% 14%",
            "--muted-foreground": "120 10% 60%",
            "--accent": "120 15% 14%",
            "--accent-foreground": "120 10% 96%",
            "--destructive": "0 84% 60%",
            "--destructive-foreground": "0 0% 98%",
            "--border": "120 15% 14%",
            "--ring": "142 70% 45%",
        },
    },
    {
        id: "ocean",
        name: "Ocean",
        variables: {
            "--background": "200 50% 6%",
            "--foreground": "200 10% 96%",
            "--primary": "190 90% 50%",
            "--primary-foreground": "200 50% 8%",
            "--secondary": "200 30% 14%",
            "--secondary-foreground": "200 10% 96%",
            "--muted": "200 30% 14%",
            "--muted-foreground": "200 15% 60%",
            "--accent": "200 30% 14%",
            "--accent-foreground": "200 10% 96%",
            "--destructive": "0 84% 60%",
            "--destructive-foreground": "0 0% 98%",
            "--border": "200 30% 14%",
            "--ring": "190 90% 50%",
        },
    },
    {
        id: "light",
        name: "Light",
        variables: {
            "--background": "0 0% 100%",
            "--foreground": "222 47% 11%",
            "--primary": "142 70% 40%",
            "--primary-foreground": "0 0% 100%",
            "--secondary": "220 14% 96%",
            "--secondary-foreground": "222 47% 11%",
            "--muted": "220 14% 96%",
            "--muted-foreground": "220 9% 46%",
            "--accent": "220 14% 96%",
            "--accent-foreground": "222 47% 11%",
            "--destructive": "0 84% 60%",
            "--destructive-foreground": "0 0% 98%",
            "--border": "220 13% 91%",
            "--ring": "142 70% 40%",
        },
    },
]

interface ThemeState {
    currentTheme: ThemeId
    setTheme: (themeId: ThemeId) => void
    loadTheme: () => void
}

const THEME_KEY = "game-agent-theme"

function applyTheme(themeId: ThemeId) {
    const theme = themes.find((t) => t.id === themeId)
    if (!theme) return

    const root = document.documentElement
    Object.entries(theme.variables).forEach(([key, value]) => {
        root.style.setProperty(key, value)
    })
}

export const useThemeStore = create<ThemeState>((set) => ({
    currentTheme: "dark",

    setTheme: (themeId: ThemeId) => {
        applyTheme(themeId)
        localStorage.setItem(THEME_KEY, themeId)
        set({ currentTheme: themeId })
    },

    loadTheme: () => {
        try {
            const stored = localStorage.getItem(THEME_KEY) as ThemeId | null
            const themeId = stored && themes.find((t) => t.id === stored) ? stored : "dark"
            applyTheme(themeId)
            set({ currentTheme: themeId })
        } catch {
            applyTheme("dark")
        }
    },
}))
