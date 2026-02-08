import Phaser from "phaser"

export class MainScene extends Phaser.Scene {
    constructor() {
        super("MainScene")
    }

    preload() {
        // Load assets here
    }

    create() {
        this.add.text(400, 300, "Hello World!", {
            fontSize: "48px",
            color: "#ffffff",
        }).setOrigin(0.5)

        this.add.text(400, 360, "Edit src/scenes/MainScene.ts to start!", {
            fontSize: "20px",
            color: "#aaaaaa",
        }).setOrigin(0.5)
    }

    update() {
        // Game loop logic here
    }
}
