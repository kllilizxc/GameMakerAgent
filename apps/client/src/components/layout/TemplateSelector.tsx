import { useEffect } from "react"
import { useSessionStore } from "@/stores/session"
import { storage } from "@/lib/storage"
import { Trash2, ArrowRight } from "lucide-react"
import { useConfirm } from "@/hooks/useConfirm"
import { useNavigate } from "react-router-dom"

export function TemplateSelector() {
    const templates = useSessionStore((s) => s.templates)
    const createSession = useSessionStore((s) => s.createSession)
    const history = useSessionStore((s) => s.history)
    const loadHistory = useSessionStore((s) => s.loadHistory)
    const deleteSession = useSessionStore((s) => s.deleteSession)

    const { confirm } = useConfirm()
    const navigate = useNavigate()

    useEffect(() => {
        loadHistory()
    }, [loadHistory])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090b] text-white p-8">
            <div className="max-w-4xl w-full space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                        Choose a Template
                    </h1>
                    <p className="text-zinc-400 text-lg">
                        Select a starting point for your game. You can customize everything later.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[400px] overflow-y-auto">
                    {templates.map((template) => (
                        <button
                            key={template.id}
                            onClick={() => createSession(template.id)}
                            className="group relative flex flex-col items-start p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all duration-200 text-left hover:shadow-2xl hover:shadow-blue-900/10"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />

                            <div className="relative w-full">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-4xl" role="img" aria-label={template.name}>
                                        {template.thumbnail || "🎮"}
                                    </span>
                                    <div className="h-8 w-8 rounded-full border border-zinc-700 flex items-center justify-center group-hover:border-blue-500 group-hover:text-blue-500 transition-colors">
                                        <ArrowRight size={16} />
                                    </div>
                                </div>

                                <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-400 transition-colors">
                                    {template.name}
                                </h3>

                                <p className="text-sm text-zinc-400 leading-relaxed">
                                    {template.description}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>

                {history.length > 0 && (
                    <div className="pt-8 border-t border-zinc-800">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-semibold text-zinc-300">Recent Sessions</h2>
                            <button
                                onClick={async () => {
                                    const ok = await confirm({
                                        title: "Clear History?",
                                        description: "This will remove all session history from your browser. Local files will remain.",
                                        confirmText: "Clear History",
                                        variant: "destructive"
                                    })
                                    if (ok) {
                                        await storage.clearHistory()
                                        window.location.reload()
                                    }
                                }}
                                className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                            >
                                Clear History
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[200px] overflow-y-auto">
                            {history.map((session) => (
                                <div
                                    key={session.id}
                                    className="p-4 rounded-lg bg-zinc-900/30 border border-zinc-800 hover:border-zinc-700 transition-colors flex items-center justify-between group"
                                >
                                    <div>
                                        <div className="font-medium text-zinc-200">{session.name}</div>
                                        <div className="text-xs text-zinc-500 mt-1">
                                            {new Date(session.lastActive).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => navigate(`/session/${session.id}`)}
                                            className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors"
                                        >
                                            Resume
                                        </button>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation()
                                                const ok = await confirm({
                                                    title: "Delete Session?",
                                                    description: "This action cannot be undone. This will permanently delete the session and all its files.",
                                                    confirmText: "Delete Forever",
                                                    variant: "destructive"
                                                })
                                                if (ok) {
                                                    deleteSession(session.id)
                                                }
                                            }}
                                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-md transition-colors"
                                            title="Delete Session"
                                        >
                                            <Trash2 size={14} />
                                        </button>

                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}
