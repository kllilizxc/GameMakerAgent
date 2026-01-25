import type { EngineAdapter } from "./adapter"
import type { EngineId } from "../protocol/messages"
import { phaser2dAdapter } from "./phaser-2d"

const adapters: Record<EngineId, EngineAdapter> = {
  "phaser-2d": phaser2dAdapter,
  "babylon-3d": undefined as unknown as EngineAdapter, // Not implemented yet
}

export function getEngine(id: EngineId): EngineAdapter {
  const adapter = adapters[id]
  if (!adapter) {
    throw new Error(`Engine "${id}" is not implemented yet`)
  }
  return adapter
}

export function listEngines(): EngineId[] {
  return Object.keys(adapters).filter(
    (id) => adapters[id as EngineId] !== undefined
  ) as EngineId[]
}
