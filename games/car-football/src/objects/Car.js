import GAME_CONFIG from '../config/gameConfig.js';

export default class Car extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, textureKey, facingRight, targetHeight) {
        super(scene, x, y, textureKey);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Normalize both cars to the same display height regardless of source image size
        targetHeight = targetHeight ?? GAME_CONFIG.CAR_TARGET_HEIGHT;
        const scale = targetHeight / this.height;
        this.setScale(scale);

        // Arcade Physics doesn't auto-scale bodies, so manually match body to display size
        const bodyW = this.width * scale;
        const bodyH = this.height * scale;
        this.body.setSize(bodyW, bodyH);
        this.body.setOffset(
            (this.width - bodyW) / 2,
            (this.height - bodyH) / 2
        );

        this.setBounce(GAME_CONFIG.CAR_BOUNCE);
        this.body.setMaxVelocity(GAME_CONFIG.CAR_MAX_SPEED, 1000);
        this.body.setDragX(GAME_CONFIG.CAR_DRAG_X);
        this.body.setCollideWorldBounds(true); // safety net: stop car escaping the world
        this.setDepth(5);

        // Both source images face left
        // Blue car needs to face right (toward red goal), so flip it
        // Red car faces left (toward blue goal), so no flip
        if (facingRight) {
            this.setFlipX(true);
        }

        this.facingRight = facingRight;
        this.startX = x;
        this.startY = y;
    }

    isOnGround() {
        return this.body.blocked.down || this.body.touching.down;
    }

    resetPosition() {
        this.setPosition(this.startX, this.startY);
        this.body.setVelocity(0, 0);
        this.body.setAcceleration(0, 0);
    }
}
