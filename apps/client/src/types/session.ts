export interface MessagePart {
  type: "text" | "image" | "ui" | "reasoning"
  text?: string
  url?: string
  ui?: {
    name: string
    props: Record<string, any>
  }
}

export interface Message {
  id: string
  role: "user" | "agent" | "error"
  content: string // Kept for backward compatibility/summary
  parts?: MessagePart[]
  streaming?: boolean
  timestamp: number
  /** True for client-only synthetic messages derived from tool output. */
  synthetic?: boolean
  metadata?: {
    summary?: {
      id: string
      tool: string
      state: {
        status: string
        title?: string
      }
    }[]
    todos?: {
      id: string
      content: string
      status: string
      priority: string
    }[]
    [key: string]: any
  }
  activities?: Activity[]
}


export interface Activity {
  id: string
  type: "tool" | "text" | "file"
  timestamp: number
  completed?: boolean
  callId?: string
  data: {
    tool?: string
    title?: string
    path?: string
    text?: string
  }
  metadata?: {
    todos?: {
      id: string
      content: string
      status: string
      priority: string
    }[]
    [key: string]: any
  }
}

export interface FsPatch {
  op: "write" | "delete" | "mkdir"
  path: string
  content?: string
  encoding?: "utf-8" | "base64"
}

export interface TemplateInfo {
  id: string
  name: string
  description: string
  thumbnail?: string
}
