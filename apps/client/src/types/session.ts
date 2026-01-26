export interface Message {
  id: string
  role: "user" | "agent"
  content: string
}

export interface Activity {
  id: string
  type: "tool" | "text" | "file"
  timestamp: number
  data: {
    tool?: string
    title?: string
    path?: string
    text?: string
  }
}

export interface FsPatch {
  op: "write" | "delete" | "mkdir"
  path: string
  content?: string
}
