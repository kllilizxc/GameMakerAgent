
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

        const response = new Response(file);

        // Add Cross-Origin Isolation headers for WebContainers
        response.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
        response.headers.set("Cross-Origin-Opener-Policy", "same-origin");

        return response;
    },
});
