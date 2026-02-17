import { useEffect, useRef } from "react"
import { useFilesStore } from "@/stores/files"
import { usePreviewStore } from "@/stores/preview"
import { useWebContainer } from "./useWebContainer"

// Build the injection script as a plain string to avoid nested template-literal escaping issues.
function buildErrorScript(): string {
    const lines = [
        "<script>",
        "(function() {",
        // --- helpers ---
        "  var serialize = function(obj) {",
        "    try {",
        "      if (obj instanceof Error) return obj.stack || obj.message;",
        "      if (typeof obj === 'object' && obj !== null) return JSON.stringify(obj);",
        "      return String(obj);",
        "    } catch(e) { return String(obj); }",
        "  };",
        "",
        "  var post = function(type, msg) {",
        "    window.parent.postMessage({ type: type, message: msg }, '*');",
        "  };",
        "",
        "  var send = function(type, args) {",
        "    post(type, Array.prototype.map.call(args, serialize).join(' '));",
        "  };",
        "",
        // Strip our proxy frames from a stack string so the user sees only their code.
        "  var cleanStack = function(stack, framesToSkip) {",
        "    if (!stack) return '';",
        "    var lines = stack.split('\\n');",
        "    lines.splice(0, framesToSkip || 2);",
        "    return lines.join('\\n');",
        "  };",
        "",
        // --- console.log ---
        "  var _log = console.log;",
        "  console.log = function() {",
        "    send('preview-log', arguments);",
        "    _log.apply(console, arguments);",
        "  };",
        "",
        // --- console.info ---
        "  var _info = console.info;",
        "  console.info = function() {",
        "    send('preview-log', arguments);",
        "    _info.apply(console, arguments);",
        "  };",
        "",
        // --- console.warn ---
        "  var _warn = console.warn;",
        "  console.warn = function() {",
        "    var msg = Array.prototype.map.call(arguments, serialize).join(' ');",
        "    var stack = cleanStack(new Error().stack, 2);",
        "    if (stack) msg += '\\n' + stack;",
        "    post('preview-warn', msg);",
        "    _warn.apply(console, arguments);",
        "  };",
        "",
        // --- console.error ---
        "  var _error = console.error;",
        "  console.error = function() {",
        "    var msg = Array.prototype.map.call(arguments, serialize).join(' ');",
        "    var stack = cleanStack(new Error().stack, 2);",
        "    if (stack) msg += '\\n' + stack;",
        "    post('preview-error', msg);",
        // Wrap in try/catch because user code may override console.error to throw
        "    try { _error.apply(console, arguments); } catch(e) {}",
        "  };",
        "",
        // --- Global error handler ---
        "  window.addEventListener('error', function(e) {",
        "    var msg = 'Uncaught ' + (e.error ? e.error.constructor.name + ': ' : '') + e.message;",
        "    if (e.filename) msg += '\\n    at ' + e.filename + ':' + e.lineno + ':' + e.colno;",
        "    if (e.error && e.error.stack) msg += '\\n' + e.error.stack;",
        "    post('preview-error', msg);",
        "  });",
        "",
        // --- Unhandled promise rejection ---
        "  window.addEventListener('unhandledrejection', function(e) {",
        "    var reason = e.reason;",
        "    var msg = 'Uncaught (in promise) ';",
        "    if (reason instanceof Error) {",
        "      msg += reason.constructor.name + ': ' + reason.message;",
        "      if (reason.stack) msg += '\\n' + reason.stack;",
        "    } else {",
        "      msg += String(reason);",
        "    }",
        "    post('preview-error', msg);",
        "  });",
        "",
        // --- XHR network errors ---
        "  if (window.XMLHttpRequest) {",
        "    var XHR = XMLHttpRequest.prototype;",
        "    var _open = XHR.open;",
        "    var _send = XHR.send;",
        "    XHR.open = function(method, url) {",
        "      this._m = method; this._u = String(url);",
        "      return _open.apply(this, arguments);",
        "    };",
        "    XHR.send = function() {",
        "      var self = this;",
        // Capture the call stack at the time of send() so we know where the request originated
        "      var callStack = cleanStack(new Error().stack, 2);",
        "",
        "      self.addEventListener('error', function() {",
        // Format like browser: "GET https://... net::ERR_FAILED"
        "        var msg = self._m + ' ' + self._u + ' net::ERR_FAILED';",
        "        if (callStack) msg += '\\n' + callStack;",
        "        post('preview-error', msg);",
        "      });",
        "",
        "      self.addEventListener('load', function() {",
        "        if (self.status >= 400) {",
        // Format like browser: "GET https://... 404 (Not Found)"
        "          var msg = self._m + ' ' + self._u + ' ' + self.status + ' (' + (self.statusText || 'Error') + ')';",
        "          var body = self.responseText ? self.responseText.substring(0, 500) : '';",
        "          if (body) msg += '\\nResponse: ' + body;",
        "          if (callStack) msg += '\\n' + callStack;",
        "          post('preview-error', msg);",
        "        }",
        "      });",
        "",
        "      return _send.apply(this, arguments);",
        "    };",
        "  }",
        "",
        // --- Fetch errors ---
        "  if (window.fetch) {",
        "    var _fetch = window.fetch;",
        "    window.fetch = function(input, init) {",
        "      var url = (typeof input === 'string') ? input : (input && input.url ? input.url : String(input));",
        "      var method = (init && init.method) ? init.method : 'GET';",
        "      var callStack = cleanStack(new Error().stack, 2);",
        "",
        "      return _fetch.apply(this, arguments).then(function(resp) {",
        "        if (!resp.ok) {",
        "          var msg = method + ' ' + url + ' ' + resp.status + ' (' + (resp.statusText || 'Error') + ')';",
        "          if (callStack) msg += '\\n' + callStack;",
        "          post('preview-error', msg);",
        "        }",
        "        return resp;",
        "      }).catch(function(err) {",
        "        var msg = method + ' ' + url + ' net::ERR_FAILED';",
        "        if (err.message) msg += '\\n' + err.message;",
        "        if (callStack) msg += '\\n' + callStack;",
        "        post('preview-error', msg);",
        "        throw err;",
        "      });",
        "    };",
        "  }",
        "",
        "})();",
        "</script>",
    ]
    return lines.join("\n")
}

const ERROR_CAPTURE_SCRIPT = buildErrorScript()

function injectErrorScript(content: string) {
    if (content.includes("</body>")) {
        return content.replace("</body>", `${ERROR_CAPTURE_SCRIPT}</body>`)
    }
    return content + ERROR_CAPTURE_SCRIPT
}

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
                        // Inject error script into index.html
                        if (path === "index.html") {
                            textFiles[path] = injectErrorScript(entry.content)
                        } else {
                            textFiles[path] = entry.content
                        }
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

                    let content = entry.content
                    // Re-inject if user updates index.html
                    if (path === "index.html" && entry.encoding === "utf-8") {
                        content = injectErrorScript(content)
                    }

                    await applyFilePatch({
                        op: "write",
                        path,
                        content,
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
