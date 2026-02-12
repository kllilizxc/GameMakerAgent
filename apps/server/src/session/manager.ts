import type { EngineId, ServerMessage } from "../protocol/messages"
import { sessionId as genSessionId, runId as genRunId } from "../util/id"
import { getEngine } from "../engine/registry"
import { createWorkspace, deleteWorkspace, readWorkspaceFiles, workspacePath, loadMetadata, saveMetadata } from "./workspace"
import { Perf } from "@game-agent/perf"
import { GlobalBus, MessageV2, Session as OcSession, Instance } from "@game-agent/agent"
import { transformMessages } from "./transform"
export { transformMessages }

interface StreamClient {
  send: (data: string) => void
  close: () => void
}
// ... existing functions ...

/**
 * Initialize global event listeners
 */
export function initSessionManager() {
  GlobalBus.on("event", (e) => {
    // Filter for Message Updated events
    if (e.payload.type === MessageV2.Event.Updated.type) {
      const info = e.payload.properties.info

      // Find session by opencodeSessionId
      for (const session of sessions.values()) {
        if (session.opencodeSessionId === info.sessionID) {
          // We must provide instance context to load messages from storage
          Instance.provide({
            directory: getWorkspacePath(session),
            fn: async () => {
              // Fetch all messages to find the one that updated (we need 'parts', event only has 'info')
              const allMessages = await OcSession.messages({ sessionID: info.sessionID })
              const fullMessage = allMessages.find((m: MessageV2.WithParts) => m.info.id === info.id)


              if (fullMessage) {
                const clientMsgs = transformMessages([fullMessage])
                if (clientMsgs.length > 0) {
                  broadcast(session, {
                    type: "message/updated",
                    message: clientMsgs[0]
                  } as any)
                }
              }
            }
          })

          break
        }
      }
    }

    // Filter for Session Error events
    if (e.payload.type === OcSession.Event.Error.type) {
      const { sessionID, error } = e.payload.properties

      if (sessionID) {
        // Find session by opencodeSessionId
        for (const session of sessions.values()) {
          if (session.opencodeSessionId === sessionID) {
            console.log(`[session] Broadcasting error for session ${session.id}:`, error)

            let errorMessage = "Unknown error"
            if (error) {
              if ('message' in error) {
                errorMessage = error.message
              } else if ('data' in error && error.data && typeof error.data === 'object' && 'message' in error.data) {
                errorMessage = (error.data as any).message
              }
            }

            broadcast(session, {
              type: "run/error",
              message: errorMessage
            } as any)
            break
          }
        }
      }
    }
  })
}


export interface Session {
  id: string
  engineId: EngineId
  templateId?: string
  workspaceDir: string
  currentRunId: string | null
  /** OpenCode's internal session ID for message history persistence */
  opencodeSessionId?: string
  leafId?: string // ID of the current head message
  seq: number

  ackedSeq: number
  clients: Set<StreamClient>
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

      const metadata = await loadMetadata(id)

      const session: Session = {
        id,
        engineId,
        templateId: metadata?.templateId || templateId,
        workspaceDir: dir,
        currentRunId: null,
        opencodeSessionId: metadata?.opencodeSessionId,
        leafId: metadata?.leafId,
        seq: 0,
        ackedSeq: 0,
        clients: new Set(),
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
    clients: new Set(),
    createdAt: new Date(),
  }

  sessions.set(id, session)

  // Save initial metadata
  saveMetadata(id, {
    templateId,
    engineId,
    version: 1
  }).catch(err => console.error(`[session] Failed to save metadata for ${id}:`, err))

  return session
}

export async function loadSession(id: string): Promise<Session | undefined> {
  const existing = sessions.get(id)
  if (existing) return existing

  const dir = workspacePath(id)
  try {
    const stats = await stat(dir)
    if (!stats.isDirectory()) return undefined

    const metadata = await loadMetadata(id)

    // Default to phaser-2d if missing (legacy sessions)
    const engineId = (metadata?.engineId || "phaser-2d") as EngineId

    const session: Session = {
      id,
      engineId,
      templateId: metadata?.templateId,
      workspaceDir: dir,
      currentRunId: null,
      opencodeSessionId: metadata?.opencodeSessionId,
      leafId: metadata?.leafId,
      seq: 0,
      ackedSeq: 0,
      clients: new Set(),
      createdAt: new Date(),
    }
    sessions.set(id, session)
    return session
  } catch (e) {
    return undefined
  }
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id)
}

export async function destroySession(id: string): Promise<void> {
  const session = sessions.get(id)
  if (session) {
    session.clients.clear()
    sessions.delete(id)
  }

  await deleteWorkspace(id)
}

export function startRun(session: Session): string {
  const id = genRunId()
  session.currentRunId = id
  return id
}

export function finishRun(session: Session): void {
  session.currentRunId = null
}

export function addClient(session: Session, client: StreamClient): void {
  session.clients.add(client)
}

export function removeClient(session: Session, client: StreamClient): void {
  session.clients.delete(client)
}

export function broadcast(session: Session, message: ServerMessage): void {
  const event = (message as any).event
  const eventType = event?.type
  const len = event?.data?.text?.length
  console.log(`[broadcast] ${Date.now()} sending ${message.type} ${eventType} ${len && `len=${len}`}`)
  using timer = Perf.time("sse", "broadcast")
  const data = JSON.stringify(message)
  for (const client of session.clients) {
    client.send(data)
  }
}

export function nextSeq(session: Session): number {
  return ++session.seq
}

export function ackSeq(session: Session, seq: number): void {
  session.ackedSeq = Math.max(session.ackedSeq, seq)
}

export async function getSnapshot(session: Session): Promise<Record<string, string | { content: string, encoding: "utf-8" | "base64" }>> {
  using timer = Perf.time("file", "get-snapshot")
  return readWorkspaceFiles(session.id)
}

export function getWorkspacePath(session: Session): string {
  return workspacePath(session.id)
}
