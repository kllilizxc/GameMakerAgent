# game-agent-opencode

A monorepo for building a game-making agent service on top of OpenCode.

## Structure

```
├── packages/
│   ├── opencode/                    # Git submodule (read-only)
│   │   └── packages/opencode/src/
│   │       └── game-agent/          # YOUR wrapper code lives here
│   │           └── index.ts         # Agent runtime and API
│   └── agent/                       # Re-exports from game-agent
│       └── src/
│           ├── index.ts             # Re-exports @game-agent/agent
│           └── test.ts              # Test file
├── apps/
│   ├── server/                      # Future server application
│   └── web/                         # Future web application
└── package.json
```

## Why code lives inside opencode?

OpenCode uses `@/*` path aliases internally. These only resolve when running from the opencode directory context. By placing your wrapper code inside `packages/opencode/packages/opencode/src/game-agent/`, all imports resolve correctly.

## Setup

```bash
# Install root dependencies
bun install

# Install OpenCode dependencies
bun install --cwd packages/opencode
```

## Run the test

```bash
bun run test:agent "Design a 2D platformer game"
```

## API Usage

```typescript
import { run, AgentEvent } from "@game-agent/agent"

await run(process.cwd(), { prompt: "Build a game" }, (event: AgentEvent) => {
  if (event.type === "text") {
    console.log(event.data.text)
  }
  if (event.type === "tool") {
    console.log(`Tool: ${event.data.tool}`)
  }
})
```

## Exported Functions

- `run(cwd, input, onEvent?)` - Run an agent session
- `bootstrap` - OpenCode bootstrap function
- `Session` - Session management
- `SessionPrompt` - Prompt handling
- `Provider` - Model provider
- `Agent` - Agent configuration
- `Bus` - Event bus
- `MessageV2` - Message types
- `Log` - Logging

## Updating OpenCode

See `UPDATE_OPENCODE.md` for git submodule update commands.

**Note**: Your code in `packages/opencode/packages/opencode/src/game-agent/` will NOT be overwritten when updating the submodule, as long as you don't reset the submodule. However, consider backing up your changes or tracking them separately.
