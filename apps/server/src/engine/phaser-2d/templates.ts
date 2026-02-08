import type { FileMap, TemplateInfo } from "../adapter"
import * as fs from "fs"
import * as path from "path"

const TEMPLATES_DIR = path.join(__dirname, "templates")

/**
 * Recursively reads all files in a directory and returns a FileMap
 */
function readFilesRecursive(baseDir: string, relativePath: string): FileMap {
  const result: FileMap = {}
  const fullPath = path.join(baseDir, relativePath)

  for (const entry of fs.readdirSync(fullPath, { withFileTypes: true })) {
    const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      Object.assign(result, readFilesRecursive(baseDir, entryRelativePath))
    } else if (entry.isFile() && entry.name !== "template.json") {
      result[entryRelativePath] = fs.readFileSync(path.join(fullPath, entry.name), "utf-8")
    }
  }

  return result
}

/**
 * Load templates from the file system (templates/ folder)
 */
export function loadFileBasedTemplates(): { templates: TemplateInfo[], templateFiles: Record<string, FileMap> } {
  const templates: TemplateInfo[] = []
  const templateFiles: Record<string, FileMap> = {}

  if (!fs.existsSync(TEMPLATES_DIR)) {
    return { templates, templateFiles }
  }

  for (const folder of fs.readdirSync(TEMPLATES_DIR, { withFileTypes: true })) {
    if (!folder.isDirectory()) continue

    const templatePath = path.join(TEMPLATES_DIR, folder.name)
    const metadataPath = path.join(templatePath, "template.json")
    const packagePath = path.join(templatePath, "package.json")

    let metadata: any = {}

    if (fs.existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"))
      } catch (e) {
        console.warn(`Failed to parse template.json for ${folder.name}`, e)
      }
    } else if (fs.existsSync(packagePath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8"))
        metadata.name = pkg.name
        metadata.description = pkg.description
      } catch (e) { }
    }

    templates.push({
      id: folder.name,
      name: metadata.name || folder.name,
      description: metadata.description || "Local template",
      thumbnail: metadata.thumbnail || "📁",
      ...metadata
    })

    // Load all files (recursively)
    templateFiles[folder.name] = readFilesRecursive(templatePath, "")
  }

  return { templates, templateFiles }
}
export const templates: TemplateInfo[] = [

  {
    id: "platformer",
    name: "Platformer",
    description: "Basic platformer with jumping, gravity, and platforms.",
    thumbnail: "🏃",
  },
  {
    id: "shooter",
    name: "Space Shooter",
    description: "Top-down space shooter with player, enemies, and bullets.",
    thumbnail: "🚀",
  },
  {
    id: "puzzle",
    name: "Puzzle Grid",
    description: "Grid-based interactive puzzle system.",
    thumbnail: "🧩",
  },
]

const commonFiles = {
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
    canvas { display: block; border: 4px solid #2d2d44; border-radius: 8px; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
  </style>
</head>
<body>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>`,

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

export const templateFiles: Record<string, FileMap> = {


  platformer: {
    ...commonFiles,
    "src/main.ts": `import Phaser from "phaser"
import { MainScene } from "./scenes/MainScene"

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#87CEEB",
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
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private platforms!: Phaser.Physics.Arcade.StaticGroup

  constructor() {
    super("MainScene")
  }

  preload() {
    this.load.setBaseURL('https://labs.phaser.io')
    this.load.image('sky', 'assets/skies/space3.png')
    this.load.image('ground', 'assets/sprites/platform.png')
    this.load.image('star', 'assets/demoscene/star.png')
    this.load.spritesheet('dude', 'assets/sprites/dude.png', { frameWidth: 32, frameHeight: 48 })
  }

  create() {
    // Background
    this.add.image(400, 300, 'sky')

    // Platforms
    this.platforms = this.physics.add.staticGroup()
    this.platforms.create(400, 568, 'ground').setScale(2).refreshBody()
    this.platforms.create(600, 400, 'ground')
    this.platforms.create(50, 250, 'ground')
    this.platforms.create(750, 220, 'ground')

    // Player
    this.player = this.physics.add.sprite(100, 450, 'dude')
    this.player.setBounce(0.2)
    this.player.setCollideWorldBounds(true)

    // Physics collisions
    this.physics.add.collider(this.player, this.platforms)

    // Input
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys()
    }

    // Instructions
    this.add.text(16, 16, 'Arrow keys to move', { fontSize: '32px', color: '#000' })
  }

  update() {
    if (!this.cursors) return

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-160)
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(160)
    } else {
      this.player.setVelocityX(0)
    }

    if (this.cursors.up.isDown && this.player.body.touching.down) {
      this.player.setVelocityY(-330)
    }
  }
}
`,
  },

  shooter: {
    ...commonFiles,
    "src/main.ts": `import Phaser from "phaser"
import { MainScene } from "./scenes/MainScene"

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#000000",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [MainScene],
}

new Phaser.Game(config)
`,
    "src/scenes/MainScene.ts": `import Phaser from "phaser"

export class MainScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private bullets!: Phaser.Physics.Arcade.Group
  private lastFired = 0

  constructor() {
    super("MainScene")
  }

  preload() {
    this.load.setBaseURL('https://labs.phaser.io')
    this.load.image('ship', 'assets/sprites/phaser-dude.png')
    this.load.image('bullet', 'assets/sprites/bullets/bullet5.png')
  }

  create() {
    // Player
    this.player = this.physics.add.sprite(400, 500, 'ship')
    this.player.setCollideWorldBounds(true)

    // Bullets
    this.bullets = this.physics.add.group({
      defaultKey: 'bullet',
      maxSize: 10
    })

    // Input
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys()
    }

    this.add.text(16, 16, 'Arrow keys to move, Space to shoot', { fontSize: '24px', color: '#ffffff' })
  }

  update(time: number) {
    if (!this.cursors) return

    // Movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-300)
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(300)
    } else {
      this.player.setVelocityX(0)
    }

    // Shooting
    if (this.cursors.space.isDown && time > this.lastFired) {
      const bullet = this.bullets.get(this.player.x, this.player.y - 20) as Phaser.Physics.Arcade.Image
      
      if (bullet) {
        bullet.setActive(true)
        bullet.setVisible(true)
        bullet.setVelocityY(-400)
        this.lastFired = time + 200
      }
    }

    // Cleanup bullets
    this.bullets.children.each((b) => {
      const bullet = b as Phaser.Physics.Arcade.Image
      if (bullet.active && bullet.y < 0) {
        bullet.setActive(false)
        bullet.setVisible(false)
      }
      return true
    })
  }
}
`,
  },

  puzzle: {
    ...commonFiles,
    "src/main.ts": `import Phaser from "phaser"
import { MainScene } from "./scenes/MainScene"

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#2d2d44",
  scene: [MainScene],
}

new Phaser.Game(config)
`,
    "src/scenes/MainScene.ts": `import Phaser from "phaser"

export class MainScene extends Phaser.Scene {
  private gridSize = 8
  private tileSize = 60
  private offset = { x: 160, y: 60 }
  private selected: { x: number, y: number } | null = null

  constructor() {
    super("MainScene")
  }

  create() {
    this.add.text(400, 30, "Grid Puzzle", { fontSize: '32px' }).setOrigin(0.5)

    // Create grid background
    const graphics = this.add.graphics()
    graphics.lineStyle(2, 0xffffff, 0.5)

    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const x = this.offset.x + c * this.tileSize
        const y = this.offset.y + r * this.tileSize
        
        // Tile background
        graphics.strokeRect(x, y, this.tileSize, this.tileSize)
        
        // Interactive zone
        const zone = this.add.zone(x + this.tileSize/2, y + this.tileSize/2, this.tileSize, this.tileSize)
          .setInteractive()
          .setData({ r, c })

        zone.on('pointerdown', () => this.handleTileClick(r, c, x, y))
      }
    }
  }

  handleTileClick(row: number, col: number, x: number, y: number) {
    // Visual feedback
    const highlight = this.add.rectangle(
      x + this.tileSize/2, 
      y + this.tileSize/2, 
      this.tileSize - 4, 
      this.tileSize - 4, 
      0x00ff00, 
      0.5
    )

    this.tweens.add({
      targets: highlight,
      alpha: 0,
      duration: 500,
      onComplete: () => highlight.destroy()
    })

    console.log(\`Clicked tile at \${row}, \${col}\`)
  }
}
`,
  },
}
