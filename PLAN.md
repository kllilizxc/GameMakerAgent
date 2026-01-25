# Plan: Game-making app (Agent + Patch Streaming Preview)

## 1) Engine choice: Phaser vs Babylon

### Recommendation: start with **Phaser** for MVP

Phaser is a better fit for a patch-streamed “generate code -> instant preview” loop:

- **Fast iteration**: small bundle size, quick reload/HMR.
- **2D-first**: most generated games will be 2D for a long time (less asset complexity).
- **Simpler assets**: sprites/tiles/audio are easy to stream/sync.
- **Lower cognitive load**: easier templates for an LLM to maintain.

### When to use Babylon

Choose Babylon if your product is explicitly **3D** (or you need PBR materials, cameras, physics-heavy scenes). It increases complexity:

- Larger assets (meshes/textures) -> harder patch streaming.
- Heavier build toolchain and more runtime pitfalls.

### Strategy for maintainability

Phaser is the MVP, but the architecture should assume engines can change.

- Keep a **single “project template” contract** and provide multiple templates:
  - `template-phaser-2d`
  - `template-babylon-3d` (later)

- Add an **engine registry** (server + client agree on `engineId` values):
  - `phaser-2d`
  - `babylon-3d`

- Define an **engine adapter** interface (keeps engine-specific logic out of the core app):
  - `engineId: string`
  - `templateSeed(): FileMap` (initial files)
  - `capabilities: { dimension: "2d" | "3d"; physics?: boolean; tilemap?: boolean; }`
  - `preview: { devCommand: string; url: string; }`
  - `validate(files): { ok: boolean; errors: string[] }` (optional, for guardrails)

- The agent always edits files within a template workspace, selected by `engineId`.

Maintainability warning (worth double-checking): supporting many engines early can hurt reliability (LLM has more surface area, templates diverge). I’d start with Phaser-only implementation, but keep the adapter boundary from day 1.

## 2) High-level architecture

### Recommended: agent on server, preview on client

- **Server** runs the agent, tools, and writes files to a per-session workspace.
- **Client** runs a WebContainer-based preview (Vite + Phaser), fed by streamed file patches.

This keeps secrets/tools on the server while still giving instant preview.

## 3) Server ↔ Client protocol (WebSocket)

Use a single WebSocket per user session.

### Client -> Server messages

- `run/start`
  - `{ sessionId, prompt, engineId: "phaser-2d", options? }`
- `run/cancel`
  - `{ sessionId, runId }`
- `fs/ack`
  - `{ sessionId, seq }` (backpressure)
- `asset/uploaded`
  - `{ sessionId, path, hash, size }` (optional if upload is separate)

### Server -> Client messages

- `run/started`
  - `{ sessionId, runId }`
- `agent/event`
  - `{ sessionId, runId, event }` (wraps your `AgentEvent`)
- `fs/patch`
  - `{ sessionId, runId, seq, ops }`
- `fs/snapshot`
  - `{ sessionId, runId, seq, files }` (for initial sync / resync)
- `run/finished`
  - `{ sessionId, runId, finishReason }`
- `run/error`
  - `{ sessionId, runId, message }`

### Patch ops format (text-first)

Prefer deterministic, simple ops (easy to apply, easy to debug):

```json
{
  "type": "fs/patch",
  "sessionId": "ses_...",
  "runId": "run_...",
  "seq": 42,
  "ops": [
    { "op": "write", "path": "src/main.ts", "content": "..." },
    { "op": "delete", "path": "src/old.ts" },
    { "op": "mkdir", "path": "assets" }
  ]
}
```

Notes:
- For MVP, send **whole-file writes** for text files.
- Later optimization: add `patch` ops (unified diff) for large files.

## 4) Workspace & file sync model

### Server-side workspace

- Per session directory:
  - `workspaces/{sessionId}/` (text + assets)
- The agent’s `cwd` should point at that workspace.

### How to detect file changes

Two reasonable options:

- Subscribe to OpenCode’s internal bus events (preferred if available):
  - e.g. `Bus.subscribe(... file.edited ...)` and translate events into `fs/patch`.
- Fallback: `fs.watch` the workspace and diff content (more brittle).

### Binary assets (images/audio)

**Do not stream binaries over WS** in the common case.

- Client uploads binaries via HTTP:
  - `POST /assets/{sessionId}`
- Server stores them in the workspace and emits a small `fs/patch` op:
  - `{ op: "asset", path, hash, url }`
- Client downloads and writes into WebContainer.

### Backpressure & resync

- Server increments `seq` for each patch batch.
- Client sends `fs/ack` periodically.
- If the client reconnects (or misses patches), server sends `fs/snapshot`.

## 5) Client preview pipeline (WebContainer + Vite + engine templates)

### Template

- Each engine provides a **Vite-based template** (common dev server workflow).
- Start from a minimal Vite + Phaser TS template for `phaser-2d`.
- Run the engine’s dev server inside WebContainer using the adapter’s `preview.devCommand`.

### Applying patches

- On `fs/patch`, apply ops to WebContainer FS.
- For text writes, write full file content.
- Debounce rebuild triggers:
  - send `preview/reload` after patch batch
  - or rely on Vite HMR if the container supports it reliably

### Preview rendering

- Embed the preview as an iframe pointing to the WebContainer-served URL.

## 6) Key risks / traps (please double-check)

- **Large assets** can make patch streaming laggy. Keep MVP assets small and use HTTP/object storage for binaries.
- **Patch spam** hurts scalability. Emit patches on tool completion / meaningful boundaries, not per keystroke.
- **Untrusted code execution**: running generated code (even in WebContainer) needs guardrails. Add size/time limits and reset ability.
- **Multi-engine drift**: templates can diverge and the agent may generate engine-mismatched code. Mitigate with engine-scoped prompts + validation.

## 7) Milestones

1. Define engine adapter/registry + implement `phaser-2d` adapter.
2. Server: WebSocket session + `run/start` -> stream `agent/event`.
3. Server: file patch emission (text files) from workspace.
4. Client: WebContainer Vite+engine template + apply patches + auto-reload.
4. Assets: upload/download flow + cache by hash.
5. Hardening: quotas, cancellation, resync, persistence.
