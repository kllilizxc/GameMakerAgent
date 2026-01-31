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

  templateSeed(): FileMap {
    return {
      "package.json": JSON.stringify(
        {
          name: "phaser-game",
          private: true,
          type: "module",
          scripts: {
            dev: "vite",
            build: "vite build",
            preview: "vite preview",
          },
          dependencies: {
            phaser: "^3.80.1",
          },
          devDependencies: {
            vite: "^5.4.2",
            typescript: "^5.5.4",
          },
        },
        null,
        2
      ),

      "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Phaser Game</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a1a2e; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>`,

      "src/main.ts": `import Phaser from "phaser"
import { MainScene } from "./scenes/MainScene"

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#2d2d44",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 300 },
      debug: false,
    },
  },
  scene: [MainScene],
}

new Phaser.Game(config)
`,

      "src/scenes/MainScene.ts": `import Phaser from "phaser"

export class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene")
  }

  preload() {
    // Load assets here
  }

  create() {
    this.add.text(400, 300, "Hello Phaser!", {
      fontSize: "48px",
      color: "#ffffff",
    }).setOrigin(0.5)
  }

  update() {
    // Game loop logic here
  }
}
`,

      "tsconfig.json": JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            module: "ESNext",
            moduleResolution: "bundler",
            strict: true,
            skipLibCheck: true,
            esModuleInterop: true,
          },
          include: ["src"],
        },
        null,
        2
      ),

      "vite.config.ts": `import { defineConfig } from "vite"

export default defineConfig({
  base: "./",
  server: {
    host: true,
    port: 5173,
  },
})
`,
    }
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
