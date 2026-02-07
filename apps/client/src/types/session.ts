export interface Message {
  id: string
  role: "user" | "agent"
  content: string
  streaming?: boolean
  timestamp: number
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
}

export interface FsPatch {
  op: "write" | "delete" | "mkdir"
  path: string
  content?: string
}

export interface TemplateInfo {
  id: string
  name: string
  description: string
  thumbnail?: string
}
