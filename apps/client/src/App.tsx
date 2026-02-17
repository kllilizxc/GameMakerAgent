import { useEffect } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { TemplateSelector } from "@/components/layout/TemplateSelector"
import { useSessionStore } from "@/stores/session"
import { useSettingsStore } from "@/stores/settings"
import { Routes, Route, Navigate, useParams } from "react-router-dom"

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

  // Load history and models on mount
  useEffect(() => {
    loadHistory()
    fetchModels()
  }, [loadHistory, fetchModels])



  return (
    <Routes>
      <Route path="/" element={<Navigate to="/templates" replace />} />
      <Route path="/templates" element={<TemplateSelector />} />
      <Route path="/session/:sessionId" element={<SessionLayout />} />
    </Routes>
  )
}
