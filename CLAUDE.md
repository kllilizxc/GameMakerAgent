# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a game-making agent service built on top of OpenCode. It provides a WebSocket-based server that streams AI-generated game code to a React client with live preview via WebContainer. The architecture follows the plan in `PLAN.md`.

## Monorepo Structure

```
├── packages/
│   ├── opencode/                    # Git submodule (OpenCode framework)
│   │   └── packages/opencode/src/
│   │       └── game-agent/          # Custom agent wrapper (YOUR code)
│   ├── agent/                       # Re-exports @game-agent/agent
│   └── perf/                        # Performance monitoring
├── apps/
│   ├── server/                      # Elysia WebSocket server
│   └── client/                      # React + Vite + WebContainer UI
└── workspaces/                      # Per-session file workspaces (created at runtime)
```

## Development Commands

### Running the application
```bash
# Run both server and client concurrently
bun run dev

# Run server only (port 3001)
bun run dev:server

# Run client only (port 5173)
bun run dev:client
```

### Building
```bash
# Build client for production
bun run build:client

# Type checking
bun run typecheck
```

### Testing
```bash
# Test the agent with a prompt
bun run test:agent "Design a 2D platformer game"
```

### OpenCode submodule
```bash
# Update OpenCode submodule
git submodule update --remote packages/opencode

# Install OpenCode dependencies
bun install --cwd packages/opencode
```

See `UPDATE_OPENCODE.md` for detailed submodule management.

## Architecture

### Server (apps/server)

**WebSocket Protocol** (`apps/server/src/protocol/`):
- Client → Server: `run/start`, `run/cancel`, `fs/ack`, `fs/snapshot-request`, `session/create`, `messages/list`
- Server → Client: `run/started`, `agent/event`, `fs/patch`, `fs/snapshot`, `run/finished`, `run/error`, `session/created`, `messages/list`
- All messages are Zod-validated in `protocol/messages.ts`

**Session Management** (`apps/server/src/session/`):
- Each session has a unique ID and workspace directory in `workspaces/{sessionId}/`
- Sessions persist conversation history in `.agent/messages.json`
- File changes are watched via `chokidar` and streamed as `fs/patch` operations
- Supports session resumption with OpenCode session IDs

**Agent Execution** (`apps/server/src/agent/runner.ts`):
- Imports `run()` from `@game-agent/agent` (which wraps OpenCode)
- Watches workspace files and emits `fs/patch` messages (write, delete, mkdir, asset ops)
- Collects agent events (text, text-delta, tool, tool-start) and broadcasts to clients
- Persists messages with metadata and activity items

**Engine Adapters** (`apps/server/src/engine/`):
- `EngineAdapter` interface defines: `engineId`, `capabilities`, `preview`, `templateSeed()`, `systemPrompt()`
- Currently implements `phaser-2d` adapter with multiple templates
- Registry pattern allows adding new engines (e.g., `babylon-3d`)

### Client (apps/client)

**State Management** (Zustand stores in `apps/client/src/stores/`):
- `session.ts`: WebSocket connection, message history, run state
- `files.ts`: File system state synced from server patches
- `preview.ts`: WebContainer preview URL
- `theme.ts`: Theme persistence

**WebContainer Integration** (`apps/client/src/hooks/useWebContainer.ts`):
- Boots WebContainer on first file snapshot
- Applies file patches incrementally
- Runs `bun install` and `bun run dev` inside container
- Exposes preview URL for iframe embedding

**Message Rendering** (`apps/client/src/components/messages/`):
- Uses `markstream-react` for streaming markdown rendering
- Displays tool activities and file operations
- Auto-scrolls to latest messages

### Agent Wrapper (packages/opencode/.../game-agent)

**Location**: `packages/opencode/packages/opencode/src/game-agent/index.ts`

This is YOUR custom code that wraps OpenCode. It lives inside the OpenCode submodule because OpenCode uses `@/*` path aliases that only resolve from within its directory structure.

**Key exports**:
- `run(cwd, input, onEvent)`: Main entry point for agent execution
- `RunInput`: Accepts `prompt`, `system`, `agent`, `model`, and optional `sessionId` for persistence
- `AgentEvent`: Event types include `session`, `text`, `text-delta`, `tool`, `tool-start`, `finished`, `error`
- Session resumption: Pass `sessionId` to continue previous conversations

**Important**: When updating the OpenCode submodule, your code in `game-agent/` is preserved as long as you don't reset the submodule.

## Path Aliases

Root `tsconfig.json` defines:
- `@game-agent/agent` → `packages/agent/src/index.ts`
- `@/*` → `packages/opencode/packages/opencode/src/*` (OpenCode internals)
- `@tui/*` → OpenCode TUI components

Client `tsconfig.json` defines:
- `@/` → `apps/client/src/`

## Key Patterns

### Adding a new engine
1. Create adapter in `apps/server/src/engine/{engine-name}/`
2. Implement `EngineAdapter` interface with templates and system prompt
3. Register in `apps/server/src/engine/registry.ts`
4. Add engine ID to `EngineId` enum in `protocol/messages.ts`

### File patch streaming
- Server watches workspace with `chokidar` (ignores `.`, `node_modules`, `.git`)
- Changes are debounced (100ms) and batched into `fs/patch` messages
- Client applies patches to WebContainer filesystem
- Vite HMR handles live reload automatically

### Message persistence
- User and agent messages are stored in `workspaces/{sessionId}/.agent/messages.json`
- Agent messages include `metadata` (from tool results) and `activities` (tool execution timeline)
- Client can paginate history with `messages/list` requests

### Performance monitoring
- `@game-agent/perf` package provides `Perf.time()` for instrumentation
- View metrics at `GET /perf`, reset with `POST /perf/reset`
- Tracks WebSocket message handling, file operations, and agent execution

## Important Notes

- **WebContainer requires COOP/COEP headers**: Vite config sets `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`
- **Workspace files < 100KB**: Snapshot only includes files under 100KB to avoid memory issues
- **Session IDs**: Server generates session IDs, but client can provide one for resumption
- **OpenCode session persistence**: Agent runner captures `opencodeSessionId` from events and passes it to subsequent runs for conversation continuity
- **Bun runtime**: This project uses Bun as package manager and runtime (see `bunfig.toml`)

## Common Workflows

### Adding a new template
1. Edit `apps/server/src/engine/phaser-2d/templates.ts`
2. Add template info to `TEMPLATES` array
3. Implement template seed in `getTemplateSeed()` function
4. Template will appear in client's template selector

### Debugging agent behavior
1. Check server logs for agent events and file patches
2. Use `/perf` endpoint to identify bottlenecks
3. Inspect `workspaces/{sessionId}/` to see actual file changes
4. Review `.agent/messages.json` for conversation history

### Modifying the protocol
1. Update Zod schemas in `apps/server/src/protocol/messages.ts`
2. Update handler logic in `apps/server/src/protocol/handler.ts`
3. Update client WebSocket handling in `apps/client/src/stores/session.ts`
4. TypeScript will catch any mismatches
