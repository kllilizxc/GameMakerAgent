import { mkdir, rm, readdir, readFile, writeFile, unlink, stat } from "node:fs/promises"
import { join, relative } from "node:path"
import type { FileMap } from "../engine/adapter"
import type { FsPatchOp } from "../protocol/messages"
import { Perf } from "@game-agent/perf"

const WORKSPACES_DIR = join(process.cwd(), "workspaces")

export async function ensureWorkspacesDir() {
  await mkdir(WORKSPACES_DIR, { recursive: true })
}

export function workspacePath(sessionId: string): string {
  return join(WORKSPACES_DIR, sessionId)
}

export async function createWorkspace(sessionId: string, seed: FileMap): Promise<string> {
  using timer = Perf.time("file", "create-workspace")
  const dir = workspacePath(sessionId)
  await mkdir(dir, { recursive: true })

  for (const [path, content] of Object.entries(seed)) {
    const full = join(dir, path)
    const parent = full.substring(0, full.lastIndexOf("/"))
    if (parent !== dir) {
      await mkdir(parent, { recursive: true })
    }
    await writeFile(full, content, "utf-8")
  }

  return dir
}

export async function deleteWorkspace(sessionId: string): Promise<void> {
  using timer = Perf.time("file", "delete-workspace")
  const dir = workspacePath(sessionId)
  await rm(dir, { recursive: true, force: true })
}

export async function readWorkspaceFiles(sessionId: string): Promise<FileMap> {
  using timer = Perf.time("file", "read-workspace")
  const dir = workspacePath(sessionId)
  const files: FileMap = {}

  async function walk(current: string) {
    const entries = await readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git") continue
        await walk(full)
      } else {
        const rel = relative(dir, full)
        const info = await stat(full)
        if (info.size < 1024 * 100) {
          files[rel] = await readFile(full, "utf-8")
        }
      }
    }
  }

  await walk(dir)
  return files
}

export async function applyPatchOps(sessionId: string, ops: FsPatchOp[]): Promise<void> {
  const dir = workspacePath(sessionId)

  for (const op of ops) {
    const full = join(dir, op.path)

    switch (op.op) {
      case "write": {
        const parent = full.substring(0, full.lastIndexOf("/"))
        await mkdir(parent, { recursive: true })
        await writeFile(full, op.content, "utf-8")
        break
      }
      case "delete": {
        await unlink(full).catch(() => { })
        break
      }
      case "mkdir": {
        await mkdir(full, { recursive: true })
        break
      }
      case "asset": {
        break
      }
    }
  }
}

// Message history persistence
const MESSAGES_FILE = ".agent/messages.json"

export interface PersistedMessage {
  role: "user" | "agent"
  content: string
  timestamp: number
}

export async function saveMessages(sessionId: string, messages: PersistedMessage[]): Promise<void> {
  const dir = workspacePath(sessionId)
  const messagesDir = join(dir, ".agent")
  await mkdir(messagesDir, { recursive: true })
  await writeFile(join(dir, MESSAGES_FILE), JSON.stringify(messages, null, 2), "utf-8")
}

export async function loadMessages(sessionId: string): Promise<PersistedMessage[]> {
  const dir = workspacePath(sessionId)
  try {
    const content = await readFile(join(dir, MESSAGES_FILE), "utf-8")
    return JSON.parse(content)
  } catch {
    return []
  }
}

export async function appendMessage(sessionId: string, message: PersistedMessage): Promise<void> {
  const messages = await loadMessages(sessionId)
  messages.push(message)
  await saveMessages(sessionId, messages)
}
