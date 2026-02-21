# Repository Guidelines

## Project Structure & Module Organization

- `apps/client/`: React + Vite UI (chat, editor, game preview). Uses `@` as an alias for `apps/client/src/`.
- `apps/server/`: Bun + Elysia backend (config, sessions, streaming). Serves generated projects from `workspaces/` (gitignored).
- `packages/agent/`: Thin wrapper/re-export around the OpenCode game-agent implementation in `packages/opencode/`.
- `packages/common/`, `packages/perf/`: Shared utilities/types and performance telemetry.
- `packages/opencode/`: Git submodule; follow its own contributor notes in `packages/opencode/AGENTS.md` when editing.
- `assets/`, `docs/`: Static assets and documentation (screenshots/GIFs).

## Build, Test, and Development Commands

- `bun install`: Install workspace dependencies (and initializes submodules via `postinstall` when `.git/` exists).
- `bun run dev`: Run server + client (server defaults to `http://localhost:3001`, client to `http://localhost:5173`).
- `bun run dev:server` / `bun run dev:client`: Run each side in isolation.
- `bun run start:server`: Start the server without watch mode.
- `bun run build:client`: Build the web client for production.
- `bun run typecheck`: Strict TypeScript typecheck for `packages/` (see `tsconfig.json`).

## Coding Style & Naming Conventions

- TypeScript + ESM (`"type": "module"`). Keep changes focused and avoid reformat-only diffs.
- Match surrounding formatting; most files use 2-space indents, double quotes, and no semicolons.
- Naming: React components `PascalCase.tsx`, hooks `useThing.ts`, shared libs export via `src/index.ts`.

## Testing Guidelines

- Baseline checks: `bun run typecheck` and the agent smoke test:
  - `bun run test:agent -- "Build a simple platformer"`
- For UI changes, manually verify core flows via `bun run dev` and include screenshots/GIFs in the PR when behavior changes.

## Commit & Pull Request Guidelines

- Follow the repo’s Conventional Commit style from Git history: `feat:`, `fix:`, `refactor:`, `style:`, `chore:`, `perf:`, `config:`.
- PRs should include: a short summary, how you tested, and any env/submodule changes. Do not commit secrets (`.env*`) or generated state (`workspaces/`, `.opencode/`).
