import { useEffect } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { TemplateSelector } from "@/components/layout/TemplateSelector"
import { useSessionStore } from "@/stores/session"
import { useThemeStore } from "@/stores/theme"

export function App() {
  const fetchTemplates = useSessionStore((s) => s.fetchTemplates)
  const sessionId = useSessionStore((s) => s.sessionId)
  const loadTheme = useThemeStore((s) => s.loadTheme)

  // Load theme on mount
  useEffect(() => {
    loadTheme()
  }, [loadTheme])

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  if (!sessionId) {
    return <TemplateSelector />
  }

  return <AppShell />
}
