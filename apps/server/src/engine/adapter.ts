import type { EngineId } from "../protocol/messages"

export type FileMap = Record<string, string>

export interface EngineCapabilities {
  dimension: "2d" | "3d"
  physics?: boolean
  tilemap?: boolean
}

export interface EnginePreview {
  devCommand: string
  url: string
}

export interface EngineAdapter {
  engineId: EngineId
  name: string
  capabilities: EngineCapabilities
  preview: EnginePreview
  templateSeed(): FileMap
  validate?(files: FileMap): { ok: boolean; errors: string[] }
  systemPrompt?(): string
}
