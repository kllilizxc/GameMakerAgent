import { useEffect, useState } from "react"
import { usePreviewStore } from "@/stores/preview"

// Progress breakpoints for each loading stage
const PROGRESS_BREAKPOINTS = {
    idle: 5,
    booting: 25,
    installing: 95,
    complete: 100,
} as const

// Animation config
const PROGRESS_UPDATE_INTERVAL = 100 // ms
const PROGRESS_STEP_RATIO = 0.02 // 2% of remaining distance
const MIN_PROGRESS_STEP = 0.1

export function LoadingOverlay() {
    const wcStatus = usePreviewStore((s) => s.status)
    const [progress, setProgress] = useState(0)

    const loadingMessage = wcStatus === "booting" ? "Starting environment..."
        : wcStatus === "installing" ? "Installing dependencies..."
            : "Preparing..."

    // Target progress based on status (never quite reaches next breakpoint)
    const targetProgress = wcStatus === "idle" ? PROGRESS_BREAKPOINTS.idle
        : wcStatus === "booting" ? PROGRESS_BREAKPOINTS.booting
            : wcStatus === "installing" ? PROGRESS_BREAKPOINTS.installing
                : PROGRESS_BREAKPOINTS.complete

    // Slowly animate towards target but asymptotically approach it
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                const diff = targetProgress - prev
                // Move configured % of remaining distance
                const step = Math.max(diff * PROGRESS_STEP_RATIO, MIN_PROGRESS_STEP)
                // Stop if very close to target
                if (diff < 0.5) return prev
                return Math.min(prev + step, targetProgress - 1)
            })
        }, PROGRESS_UPDATE_INTERVAL)

        return () => clearInterval(interval)
    }, [targetProgress])

    // Don't show if running or error (moved after hooks to avoid early return)
    if (wcStatus === "running" || wcStatus === "error") return null

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />

            {/* Animated gradient orbs */}
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse"
                style={{ animationDelay: "1s" }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-3xl animate-pulse"
                style={{ animationDelay: "0.5s" }} />

            {/* Grid pattern overlay */}
            <div
                className="absolute inset-0 opacity-10"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)`,
                    backgroundSize: "50px 50px"
                }}
            />

            {/* Content */}
            <div className="relative flex flex-col items-center gap-6 w-72">
                {/* Logo or icon placeholder */}
                <div className="text-4xl mb-2">🎮</div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-primary to-indigo-400 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Shimmer text */}
                <p
                    className="text-sm font-medium"
                    style={{
                        background: "linear-gradient(90deg, #94a3b8 0%, #e2e8f0 25%, #94a3b8 50%, #e2e8f0 75%, #94a3b8 100%)",
                        backgroundSize: "200% 100%",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        animation: "shimmer 2s linear infinite",
                    }}
                >
                    {loadingMessage}
                </p>
            </div>

            {/* Shimmer keyframes */}
            <style>{`
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </div>
    )
}
