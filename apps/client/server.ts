
import { serve } from "bun";
import { join } from "path";

const PORT = parseInt(process.env.PORT || "3000");
const STATIC_DIR = "dist";

console.log(`Starting server on port ${PORT}...`);

serve({
    port: PORT,
    async fetch(req) {
        const url = new URL(req.url);
        let path = url.pathname;

        if (path === "/") path = "/index.html";

        // Try to serve static file
        let file = Bun.file(join(STATIC_DIR, path));

        // If file doesn't exist, fall back to index.html (SPA routing)
        if (!(await file.exists())) {
            file = Bun.file(join(STATIC_DIR, "index.html"));
        }

        // Standard static file serving
        if (!path.endsWith("index.html") && await file.exists()) {
            const response = new Response(file);
            response.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
            response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
            return response;
        }

        // Special handling for index.html (Runtime Env Injection)
        const text = await file.text();
        const envScript = `<script>window.__ENV__ = { VITE_SERVER_URL: "${process.env.VITE_SERVER_URL || ''}" }</script>`;
        // Inject before </head> or just append to body if HEAD not found, but we should use a marker
        // Let's assume we can replace a marker or just inject before </head>
        const injectedText = text.replace("</head>", `${envScript}</head>`);

        const response = new Response(injectedText, {
            headers: {
                "Content-Type": "text/html",
                "Cross-Origin-Embedder-Policy": "require-corp",
                "Cross-Origin-Opener-Policy": "same-origin"
            }
        });

        return response;

        // Add Cross-Origin Isolation headers for WebContainers
        response.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
        response.headers.set("Cross-Origin-Opener-Policy", "same-origin");

        return response;
    },
});
