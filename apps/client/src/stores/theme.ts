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
            "--theme-background": "0 0% 4%",
            "--theme-foreground": "0 0% 98%",
            "--theme-primary": "142 76% 36%",
            "--theme-primary-foreground": "0 0% 98%",
            "--theme-secondary": "240 4% 16%",
            "--theme-secondary-foreground": "0 0% 98%",
            "--theme-muted": "240 4% 16%",
            "--theme-muted-foreground": "240 5% 65%",
            "--theme-accent": "240 4% 16%",
            "--theme-accent-foreground": "0 0% 98%",
            "--theme-destructive": "0 84% 60%",
            "--theme-destructive-foreground": "0 0% 98%",
            "--theme-border": "240 4% 16%",
            "--theme-ring": "142 76% 36%",
            "--theme-code-background": "240 4% 18%",
        },
    },
    {
        id: "midnight",
        name: "Midnight",
        variables: {
            "--theme-background": "222 47% 8%",
            "--theme-foreground": "210 40% 98%",
            "--theme-primary": "217 91% 60%",
            "--theme-primary-foreground": "0 0% 100%",
            "--theme-secondary": "217 33% 17%",
            "--theme-secondary-foreground": "210 40% 98%",
            "--theme-muted": "217 33% 17%",
            "--theme-muted-foreground": "215 20% 65%",
            "--theme-accent": "217 33% 17%",
            "--theme-accent-foreground": "210 40% 98%",
            "--theme-destructive": "0 84% 60%",
            "--theme-destructive-foreground": "0 0% 98%",
            "--theme-border": "217 33% 17%",
            "--theme-ring": "217 91% 60%",
            "--theme-code-background": "217 33% 22%",
        },
    },
    {
        id: "forest",
        name: "Forest",
        variables: {
            "--theme-background": "120 20% 6%",
            "--theme-foreground": "120 10% 96%",
            "--theme-primary": "142 70% 45%",
            "--theme-primary-foreground": "0 0% 100%",
            "--theme-secondary": "120 15% 14%",
            "--theme-secondary-foreground": "120 10% 96%",
            "--theme-muted": "120 15% 14%",
            "--theme-muted-foreground": "120 10% 60%",
            "--theme-accent": "120 15% 14%",
            "--theme-accent-foreground": "120 10% 96%",
            "--theme-destructive": "0 84% 60%",
            "--theme-destructive-foreground": "0 0% 98%",
            "--theme-border": "120 15% 14%",
            "--theme-ring": "142 70% 45%",
            "--theme-code-background": "120 15% 20%",
        },
    },
    {
        id: "ocean",
        name: "Ocean",
        variables: {
            "--theme-background": "200 50% 6%",
            "--theme-foreground": "200 10% 96%",
            "--theme-primary": "190 90% 50%",
            "--theme-primary-foreground": "200 50% 8%",
            "--theme-secondary": "200 30% 14%",
            "--theme-secondary-foreground": "200 10% 96%",
            "--theme-muted": "200 30% 14%",
            "--theme-muted-foreground": "200 15% 60%",
            "--theme-accent": "200 30% 14%",
            "--theme-accent-foreground": "200 10% 96%",
            "--theme-destructive": "0 84% 60%",
            "--theme-destructive-foreground": "0 0% 98%",
            "--theme-border": "200 30% 14%",
            "--theme-ring": "190 90% 50%",
            "--theme-code-background": "200 30% 20%",
        },
    },
    {
        id: "light",
        name: "Light",
        variables: {
            "--theme-background": "0 0% 100%",
            "--theme-foreground": "222 47% 11%",
            "--theme-primary": "142 70% 40%",
            "--theme-primary-foreground": "0 0% 100%",
            "--theme-secondary": "220 14% 96%",
            "--theme-secondary-foreground": "222 47% 11%",
            "--theme-muted": "220 14% 96%",
            "--theme-muted-foreground": "220 9% 46%",
            "--theme-accent": "220 14% 96%",
            "--theme-accent-foreground": "222 47% 11%",
            "--theme-destructive": "0 84% 60%",
            "--theme-destructive-foreground": "0 0% 98%",
            "--theme-border": "220 13% 91%",
            "--theme-ring": "142 70% 40%",
            "--theme-code-background": "220 14% 85%",
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
