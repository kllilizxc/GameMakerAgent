# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A monorepo for building a game-making agent service on top of OpenCode. The project wraps OpenCode's agent runtime to provide a specialized game development agent accessible via WebSocket API and web client.

## Key Architecture Concepts

### OpenCode Integration via Git Submodule

OpenCode lives at `packages/opencode` as a **git submodule** (read-only vendor code). The wrapper code lives **inside** the OpenCode directory at `packages/opencode/packages/opencode/src/game-agent/index.ts` because OpenCode uses `@/*` path aliases that only resolve when running from the OpenCode directory context.

The `packages/agent` directory re-exports from `game-agent` so other parts of the monorepo can import via `@game-agent/agent`.

### Path Aliases

- `@game-agent/agent` → `packages/agent/src/index.ts` (re-exports from game-agent)
- `@/*` → `packages/opencode/packages/opencode/src/*` (OpenCode internals)
- `@tui/*` → `packages/opencode/packages/opencode/src/cli/cmd/tui/*` (OpenCode TUI)

### Workspace Structure

```
packages/
  opencode/                                    # Git submodule (read-only)
    packages/opencode/src/
      game-agent/                              # YOUR wrapper code
        index.ts                               # Agent runtime and API
  agent/                                       # Re-exports from game-agent
    src/
      index.ts                                 # Re-exports @game-agent/agent
      test.ts                                  # Test file

apps/
  server/                                      # Elysia WebSocket server
    src/
      index.ts                                 # Server entry point
      protocol/                                # WebSocket protocol handlers
      session/                                 # Session management
      engine/                                  # Game engine registry
      agent/                                   # Agent execution
  client/                                      # React + Vite web client
    src/
      App.tsx                                  # Main app component
      components/                              # UI components
      stores/                                  # Zustand state management
      hooks/                                   # React hooks
```

## Common Commands

### Setup

```bash
# Install root dependencies
bun install

# Install OpenCode dependencies (first time only)
bun install --cwd packages/opencode

# Initialize submodule (if cloning fresh)
git submodule update --init --recursive
```

### Development

```bash
# Run agent test
bun run test:agent "Design a 2D platformer game"

# Run server (port 3001)
bun run dev:server

# Run client (port 5173)
bun run dev:client

# Run both server and client
bun run dev

# Type checking
bun run typecheck
```

### Server Commands

```bash
# Development with watch mode
bun run --watch apps/server/src/index.ts

# Production
bun run start:server
```

### Client Commands

```bash
# Development
bun run --cwd apps/client dev

# Build
bun run build:client

# iOS (Capacitor)
bun run --cwd apps/client ios
bun run --cwd apps/client ios:open
bun run --cwd apps/client ios:sync
```

### OpenCode Submodule Management

```bash
# Update OpenCode to latest
git submodule update --remote --merge packages/opencode
git add packages/opencode
git commit -m "chore: bump opencode submodule"

# Check submodule status
git submodule status
```

## Important Notes

### Bun Runtime Configuration

The project uses Bun with `conditions = ["browser"]` in `bunfig.toml` to match OpenCode's requirements. When running agent code, always use `--conditions=browser` flag.

### Modifying OpenCode

Treat OpenCode as read-only vendor code. All custom logic should go in:
- `packages/opencode/packages/opencode/src/game-agent/` for agent wrapper code
- `apps/server/` for server-side logic
- `apps/client/` for client-side UI

Your code in `game-agent/` will NOT be overwritten when updating the submodule (unless you reset it).

### Server Architecture

The server uses Elysia with WebSocket protocol at `/ws`. Key concepts:
- Session management with workspace directories
- Game engine registry (extensible)
- Protocol handlers for agent communication
- Event streaming to clients

### Client Architecture

React + Vite client with:
- WebContainer API for in-browser code execution
- CodeMirror for code editing
- Zustand for state management
- Capacitor for iOS deployment
- COOP/COEP headers required for WebContainer

### Agent API

```typescript
import { run, AgentEvent } from "@game-agent/agent"

await run(process.cwd(), { prompt: "Build a game" }, (event: AgentEvent) => {
  // Handle events: session, text, tool, finished, error
})
```

The agent wrapper subscribes to OpenCode's `MessageV2.Event.PartUpdated` bus events and transforms them into simplified `AgentEvent` callbacks.
