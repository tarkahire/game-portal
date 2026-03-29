import GAME_CONFIG from '../config/gameConfig.js';

export default class Ball extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, radius) {
        super(scene, x, y, 'ball');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        const r = radius ?? GAME_CONFIG.BALL_RADIUS;
        this.body.setCircle(r + 1);
        this.setBounce(GAME_CONFIG.BALL_BOUNCE);
        this.body.setDrag(GAME_CONFIG.BALL_DRAG_X, GAME_CONFIG.BALL_DRAG_Y);
        this.body.setMaxVelocity(GAME_CONFIG.BALL_MAX_SPEED, GAME_CONFIG.BALL_MAX_SPEED);
        this.body.setCollideWorldBounds(true); // safety net: stop ball escaping the world
        this.setDepth(10);

        this.startX = x;
        this.startY = y;
    }

    resetPosition() {
        this.setPosition(this.startX, this.startY);
        this.body.setVelocity(0, 0);
        this.body.setAcceleration(0, 0);
    }
}
