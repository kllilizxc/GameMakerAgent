import { z } from "zod"

// Engine IDs
export const EngineId = z.enum(["phaser-2d", "babylon-3d"])
export type EngineId = z.infer<typeof EngineId>

export const TemplateInfo = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  thumbnail: z.string().optional(),
})
export type TemplateInfo = z.infer<typeof TemplateInfo>

// ============ Client -> Server ============

export const RunStartMessage = z.object({
  type: z.literal("run/start"),
  sessionId: z.string().nullish(),
  prompt: z.string(),
  engineId: EngineId.default("phaser-2d"),
  templateId: z.string().optional(),
  options: z.record(z.unknown()).optional(),
})
export type RunStartMessage = z.infer<typeof RunStartMessage>

export const RunCancelMessage = z.object({
  type: z.literal("run/cancel"),
  sessionId: z.string(),
  runId: z.string(),
})
export type RunCancelMessage = z.infer<typeof RunCancelMessage>

export const FsAckMessage = z.object({
  type: z.literal("fs/ack"),
  sessionId: z.string(),
  seq: z.number(),
})
export type FsAckMessage = z.infer<typeof FsAckMessage>

export const SnapshotRequestMessage = z.object({
  type: z.literal("fs/snapshot-request"),
  sessionId: z.string(),
})
export type SnapshotRequestMessage = z.infer<typeof SnapshotRequestMessage>

export const TemplatesListRequest = z.object({
  type: z.literal("templates/list"),
  engineId: EngineId,
})
export type TemplatesListRequest = z.infer<typeof TemplatesListRequest>

export const SessionCreateRequest = z.object({
  type: z.literal("session/create"),
  engineId: EngineId,
  templateId: z.string().optional(),
  sessionId: z.string().optional(),
})
export type SessionCreateRequest = z.infer<typeof SessionCreateRequest>

export const ClientMessage = z.discriminatedUnion("type", [
  RunStartMessage,
  RunCancelMessage,
  FsAckMessage,
  SnapshotRequestMessage,
  SessionCreateRequest,
])
export type ClientMessage = z.infer<typeof ClientMessage>

// ============ Server -> Client ============

export const RunStartedMessage = z.object({
  type: z.literal("run/started"),
  sessionId: z.string(),
  runId: z.string(),
  engineId: EngineId,
})
export type RunStartedMessage = z.infer<typeof RunStartedMessage>

export const SessionCreatedMessage = z.object({
  type: z.literal("session/created"),
  sessionId: z.string(),
  engineId: EngineId,
  templateId: z.string().optional(),
})
export type SessionCreatedMessage = z.infer<typeof SessionCreatedMessage>

export const AgentEventMessage = z.object({
  type: z.literal("agent/event"),
  sessionId: z.string(),
  runId: z.string(),
  event: z.object({
    type: z.enum(["session", "text", "text-delta", "tool", "tool-start", "finished", "error"]),
    sessionId: z.string().optional(),
    data: z.unknown().optional(),
  }),
})
export type AgentEventMessage = z.infer<typeof AgentEventMessage>

export const FsPatchOp = z.discriminatedUnion("op", [
  z.object({ op: z.literal("write"), path: z.string(), content: z.string() }),
  z.object({ op: z.literal("delete"), path: z.string() }),
  z.object({ op: z.literal("mkdir"), path: z.string() }),
  z.object({ op: z.literal("asset"), path: z.string(), hash: z.string(), url: z.string() }),
])
export type FsPatchOp = z.infer<typeof FsPatchOp>

export const FsPatchMessage = z.object({
  type: z.literal("fs/patch"),
  sessionId: z.string(),
  runId: z.string(),
  seq: z.number(),
  ops: z.array(FsPatchOp),
})
export type FsPatchMessage = z.infer<typeof FsPatchMessage>

export const FsSnapshotMessage = z.object({
  type: z.literal("fs/snapshot"),
  sessionId: z.string(),
  runId: z.string().optional(),
  seq: z.number(),
  files: z.record(z.string()),
})
export type FsSnapshotMessage = z.infer<typeof FsSnapshotMessage>

export const RunFinishedMessage = z.object({
  type: z.literal("run/finished"),
  sessionId: z.string(),
  runId: z.string(),
  finishReason: z.string(),
})
export type RunFinishedMessage = z.infer<typeof RunFinishedMessage>

export const RunErrorMessage = z.object({
  type: z.literal("run/error"),
  sessionId: z.string(),
  runId: z.string().optional(),
  message: z.string(),
})
export type RunErrorMessage = z.infer<typeof RunErrorMessage>

export const ServerMessage = z.discriminatedUnion("type", [
  RunStartedMessage,
  AgentEventMessage,
  FsPatchMessage,
  FsSnapshotMessage,
  RunFinishedMessage,
  RunErrorMessage,
  SessionCreatedMessage,
])
export type ServerMessage = z.infer<typeof ServerMessage>
