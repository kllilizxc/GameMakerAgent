export const SERVER_URL = import.meta.env.VITE_SERVER_URL || "ws://localhost:3001"
export const HTTP_SERVER_URL = SERVER_URL.replace(/^ws/, "http")
