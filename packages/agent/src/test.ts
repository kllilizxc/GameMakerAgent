// Test the game-agent wrapper
import { run, AgentEvent } from "./index"

console.log("Starting test...")

const prompt = process.argv.slice(2).join(" ") || "Say hello and list the first 3 steps you would take to make a simple game."

console.log("Prompt:", prompt)
console.log("Running agent...")

await run(process.cwd(), { prompt }, (event: AgentEvent) => {
  switch (event.type) {
    case "session":
      console.log(`[session] created: ${event.sessionId}`)
      break
    case "text":
      console.log(`\n[text]\n${(event.data as { text: string }).text}\n`)
      break
    case "tool":
      const tool = event.data as { tool: string; title: string }
      console.log(`[tool] ${tool.tool}: ${tool.title}`)
      break
    case "finished":
      console.log(`[done] finish reason: ${(event.data as { finishReason: string }).finishReason}`)
      break
  }
})

console.log("Test complete.")