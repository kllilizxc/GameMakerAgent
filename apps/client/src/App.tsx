import { useEffect } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { TemplateSelector } from "@/components/layout/TemplateSelector"
import { useSessionStore } from "@/stores/session"
import { useSettingsStore } from "@/stores/settings"
import { useThemeStore } from "@/stores/theme"
import { Routes, Route, Navigate, useParams } from "react-router-dom"
import { LoadingOverlay } from "@/components/ui/LoadingOverlay"
import { ThemeCurtain } from "@/components/ui/ThemeCurtain"

function SessionLayout() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const currentSessionId = useSessionStore((s) => s.sessionId)
  const resumeSession = useSessionStore((s) => s.resumeSession)

  // Sync route ID with session store
  useEffect(() => {
    if (sessionId && sessionId !== currentSessionId) {
      resumeSession(sessionId)
    }
  }, [sessionId, currentSessionId, resumeSession])

  return <AppShell />
}

export function App() {
  const loadHistory = useSessionStore((s) => s.loadHistory)
  const fetchModels = useSettingsStore((s) => s.fetchModels)
  const isRewinding = useSessionStore((s) => s.isRewinding)
  const isChangingTheme = useThemeStore((s) => s.isChangingTheme)
  const mode = useThemeStore((s) => s.mode)
  const targetMode = useThemeStore((s) => s.targetMode)

  // Load history and models on mount
  useEffect(() => {
    loadHistory()
    fetchModels()
  }, [loadHistory, fetchModels])

  return (
    <>
      <LoadingOverlay show={isRewinding} message="Rewinding session..." />
      <ThemeCurtain
        show={isChangingTheme}
        fromMode={mode}
        toMode={targetMode ?? mode}
      />

      <Routes>
        <Route path="/" element={<Navigate to="/templates" replace />} />
        <Route path="/templates" element={<TemplateSelector />} />
        <Route path="/session/:sessionId" element={<SessionLayout />} />
      </Routes>
    </>
  )
}
