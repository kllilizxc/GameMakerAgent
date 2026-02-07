// Re-export from game-agent inside opencode
// This file exists so your server can import from @game-agent/agent

export * from "../../opencode/packages/opencode/src/game-agent"
export { Todo } from "../../opencode/packages/opencode/src/session/todo"

// Re-export OpenCode session management for server integration
export { Session } from "../../opencode/packages/opencode/src/session"
export { SessionRevert } from "../../opencode/packages/opencode/src/session/revert"
export { MessageV2 } from "../../opencode/packages/opencode/src/session/message-v2"
export { Snapshot } from "../../opencode/packages/opencode/src/snapshot"
export { Instance } from "../../opencode/packages/opencode/src/project/instance"
export { GlobalBus } from "../../opencode/packages/opencode/src/bus/global"