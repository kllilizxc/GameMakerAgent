import type { EngineId, ServerMessage } from "../protocol/messages"
import { sessionId as genSessionId, runId as genRunId } from "../util/id"
import { getEngine } from "../engine/registry"
import { createWorkspace, deleteWorkspace, readWorkspaceFiles, workspacePath } from "./workspace"
import { Perf } from "@game-agent/perf"

interface RawSocket {
  send: (data: string) => void
}

export interface Session {
  id: string
  engineId: EngineId
  templateId?: string
  workspaceDir: string
  currentRunId: string | null
  /** OpenCode's internal session ID for message history persistence */
  opencodeSessionId?: string
  seq: number
  ackedSeq: number
  sockets: Set<RawSocket>
  createdAt: Date
}

const sessions = new Map<string, Session>()

import { stat } from "node:fs/promises"

// ...

export async function createSession(engineId: EngineId, templateId?: string, desiredSessionId?: string): Promise<Session> {
  // 1. Try to resume if ID provided
  if (desiredSessionId) {
    // Check active sessions
    const existing = sessions.get(desiredSessionId)
    if (existing) {
      console.log(`[session] Resuming active session ${desiredSessionId}`)
      return existing
    }

    // Check if workspace exists on disk
    const dir = workspacePath(desiredSessionId)
    try {
      await stat(dir)
      // Workspace exists, rehydrate session
      const id = desiredSessionId
      console.log(`[session] Rehydrating session from disk ${id}`)

      const session: Session = {
        id,
        engineId,
        templateId, // Note: We might want to persist this in a metadata file later
        workspaceDir: dir,
        currentRunId: null,
        seq: 0,
        ackedSeq: 0,
        sockets: new Set(),
        createdAt: new Date(),
      }
      sessions.set(id, session)
      return session
    } catch {
      // Workspace doesn't exist, proceed to create new
      console.log(`[session] Desired session ${desiredSessionId} not found, creating new`)
    }
  }

  // 2. Create new session
  const id = desiredSessionId || genSessionId()
  const engine = getEngine(engineId)
  const seed = engine.templateSeed(templateId)
  const workspaceDir = await createWorkspace(id, seed)

  const session: Session = {
    id,
    engineId,
    templateId,
    workspaceDir,
    currentRunId: null,
    seq: 0,
    ackedSeq: 0,
    sockets: new Set(),
    createdAt: new Date(),
  }

  sessions.set(id, session)
  return session
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id)
}

export async function destroySession(id: string): Promise<void> {
  const session = sessions.get(id)
  if (!session) return

  session.sockets.clear()

  await deleteWorkspace(id)
  sessions.delete(id)
}

export function startRun(session: Session): string {
  const id = genRunId()
  session.currentRunId = id
  return id
}

export function finishRun(session: Session): void {
  session.currentRunId = null
}

export function addSocket(session: Session, socket: RawSocket): void {
  session.sockets.add(socket)
}

export function removeSocket(session: Session, socket: RawSocket): void {
  session.sockets.delete(socket)
}

export function broadcast(session: Session, message: ServerMessage): void {
  using timer = Perf.time("ws", "broadcast")
  const data = JSON.stringify(message)
  for (const socket of session.sockets) {
    socket.send(data)
  }
}

export function nextSeq(session: Session): number {
  return ++session.seq
}

export function ackSeq(session: Session, seq: number): void {
  session.ackedSeq = Math.max(session.ackedSeq, seq)
}

export async function getSnapshot(session: Session): Promise<Record<string, string>> {
  using timer = Perf.time("file", "get-snapshot")
  return readWorkspaceFiles(session.id)
}

export function getWorkspacePath(session: Session): string {
  return workspacePath(session.id)
}
