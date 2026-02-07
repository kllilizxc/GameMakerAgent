import { nanoid } from "nanoid"

export function sessionId(): string {
  return `ses_${nanoid(21)}`
}

export function runId(): string {
  return `run_${nanoid(21)}`
}

export function messageId(): string {
  return `msg_${nanoid(21)}`
}
