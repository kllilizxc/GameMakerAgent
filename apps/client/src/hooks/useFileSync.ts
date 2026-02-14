import { useEffect, useRef } from "react"
import { useFilesStore } from "@/stores/files"
import { usePreviewStore } from "@/stores/preview"
import { useWebContainer } from "./useWebContainer"

/**
 * Watches the files store and syncs changes to the WebContainer.
 * On first snapshot: boots WC, writes all files, installs deps, starts dev server.
 * On subsequent changes: diffs against previous snapshot and applies patches.
 */
export function useFileSync() {
    const files = useFilesStore((s) => s.files)
    const wcStatus = usePreviewStore((s) => s.status)
    const hasBooted = useRef(false)
    const prevFilesRef = useRef<Map<string, { content: string; encoding: "utf-8" | "base64" }>>(new Map())

    const { boot, writeFiles, installDeps, startDevServer, applyFilePatch } = useWebContainer()

    const isWcReady = wcStatus === "running"

    useEffect(() => {
        if (files.size === 0) return

        // Don't apply patches until WC is fully ready
        if (!isWcReady && hasBooted.current) {
            console.log("[wc] Skipping patch - not ready yet")
            return
        }

        const syncFiles = async () => {
            // First time — boot and write all files
            if (!hasBooted.current) {
                hasBooted.current = true
                const totalStart = performance.now()

                let t = performance.now()
                console.log("[wc] Booting WebContainer...")
                await boot()
                console.log(`[wc] Boot done (${(performance.now() - t).toFixed(0)}ms)`)

                const textFiles: Record<string, string> = {}
                const binaryFiles: Record<string, string> = {}

                files.forEach((entry, path) => {
                    if (entry.encoding === "base64") {
                        binaryFiles[path] = entry.content
                    } else {
                        textFiles[path] = entry.content
                    }
                })

                t = performance.now()
                console.log("[wc] Writing initial files:", Object.keys(textFiles).length)
                if (Object.keys(textFiles).length > 0) {
                    await writeFiles(textFiles)
                }

                for (const [path, content] of Object.entries(binaryFiles)) {
                    await applyFilePatch({
                        op: "write",
                        path,
                        content,
                        encoding: "base64",
                    })
                }
                console.log(`[wc] Files written (${(performance.now() - t).toFixed(0)}ms)`)

                t = performance.now()
                console.log("[wc] Installing deps...")
                await installDeps()
                console.log(`[wc] Deps installed (${(performance.now() - t).toFixed(0)}ms)`)

                t = performance.now()
                console.log("[wc] Starting dev server...")
                await startDevServer()
                console.log(`[wc] Dev server started (${(performance.now() - t).toFixed(0)}ms)`)

                console.log(`[wc] Total init: ${(performance.now() - totalStart).toFixed(0)}ms`)

                prevFilesRef.current = new Map(files)
                return
            }

            // Subsequent changes — diff and patch
            const prev = prevFilesRef.current

            for (const [path, entry] of files) {
                const prevEntry = prev.get(path)
                if (!prevEntry || prevEntry.content !== entry.content) {
                    console.log("[wc] Applying patch:", path)
                    await applyFilePatch({
                        op: "write",
                        path,
                        content: entry.content,
                        encoding: entry.encoding,
                    })
                }
            }

            for (const path of prev.keys()) {
                if (!files.has(path)) {
                    console.log("[wc] Deleting:", path)
                    await applyFilePatch({ op: "delete", path })
                }
            }

            prevFilesRef.current = new Map(files)
        }

        syncFiles()
    }, [files, isWcReady, boot, writeFiles, installDeps, startDevServer, applyFilePatch])
}
