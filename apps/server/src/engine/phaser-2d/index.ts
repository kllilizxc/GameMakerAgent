import { templateFiles, templates } from "./templates"
import type { EngineAdapter, FileMap } from "../adapter"

export const phaser2dAdapter: EngineAdapter = {
  engineId: "phaser-2d",
  name: "Phaser 2D",
  capabilities: {
    dimension: "2d",
    physics: true,
    tilemap: true,
  },
  preview: {
    devCommand: "bun run dev",
    url: "http://localhost:5173",
  },

  templateSeed(templateId = "blank"): FileMap {
    const template = templateFiles[templateId]
    if (!template) {
      console.warn(`Template "${templateId}" not found, falling back to blank`)
      return templateFiles.blank
    }
    return template
  },

  getTemplates() {
    return templates
  },

  systemPrompt() {
    return `# Role
You are a game developer who is an expert in Phaser 3.

# Goal
You are building a 2D game using Phaser 3.

# Project Structure
- src/main.ts: Game config and entry point
- src/scenes/: Phaser scenes (MainScene.ts is the starting scene)
- assets/: Game assets (images, audio, etc.)

# Key Phaser patterns
- Scenes have preload(), create(), update() lifecycle methods
- Use this.load.image/spritesheet/audio in preload()
- Use this.add/this.physics.add to create game objects
- Use this.input for keyboard/mouse/touch input

# Note
- You only need to create the game files, no need to install dependencies or run it.
- The game will be run by the user.
- Keep the code simple and functional. Focus on gameplay first.`
  },
}
