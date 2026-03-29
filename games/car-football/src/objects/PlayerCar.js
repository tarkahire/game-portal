import GAME_CONFIG from '../config/gameConfig.js';
import Car from './Car.js';

export default class PlayerCar extends Car {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x
     * @param {number} y
     * @param {number} targetHeight
     * @param {object} [options]
     * @param {string} [options.textureKey='blue-car'] - Phaser texture key
     * @param {boolean} [options.facingRight=false] - Whether the car faces right
     * @param {object} [options.keys] - Key bindings { up, down, left, right } using Phaser key codes
     * @param {string} [options.particleKey='boost-particle'] - Unique texture key for this car's particles
     */
    constructor(scene, x, y, targetHeight, options = {}) {
        const textureKey = options.textureKey ?? 'blue-car';
        const facingRight = options.facingRight ?? false;
        super(scene, x, y, textureKey, facingRight, targetHeight);

        // Setup key bindings
        const keyConfig = options.keys ?? { up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT' };
        this.keys = {
            up: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[keyConfig.up]),
            down: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[keyConfig.down]),
            left: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[keyConfig.left]),
            right: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[keyConfig.right])
        };

        // Boost state
        this.boostFuel = GAME_CONFIG.BOOST_MAX_FUEL;
        this.boostRechargeRate = GAME_CONFIG.BOOST_RECHARGE_RATE;
        this.isBoosting = false;

        // Flip state (double-jump flip)
        this.canFlip = true;
        this.isFlipping = false;
        this.flipSpeed = 720; // degrees per second (full 360 in 0.5s)
        this.flipRemaining = 0;
        this.flipDir = 0;

        // Create flame particle emitter for boost trail
        this.particleKey = options.particleKey ?? 'boost-particle';
        this.createBoostTrail(scene);
    }

    createBoostTrail(scene) {
        // Only generate the particle texture if it doesn't already exist
        if (!scene.textures.exists(this.particleKey)) {
            const gfx = scene.make.graphics({ x: 0, y: 0, add: false });
            gfx.fillStyle(0xffaa00, 1);
            gfx.fillCircle(4, 4, 4);
            gfx.generateTexture(this.particleKey, 8, 8);
            gfx.destroy();
        }

        this.boostEmitter = scene.add.particles(0, 0, this.particleKey, {
            speed: { min: 80, max: 200 },
            angle: { min: 160, max: 200 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: GAME_CONFIG.BOOST_PARTICLE_LIFESPAN,
            frequency: 15,
            tint: [0xff4400, 0xff8800, 0xffcc00, 0xffff00],
            blendMode: 'ADD',
            emitting: false
        });
        this.boostEmitter.setDepth(4);
    }

    update(cursors, delta) {
        // Use own key bindings; the cursors parameter is kept for backward compatibility
        // but we prefer this.keys when available
        const keys = this.keys;
        const accel = this.carAcceleration ?? GAME_CONFIG.CAR_ACCELERATION;
        const dt = delta / 1000;
        const inAir = !this.isOnGround();

        if (inAir) {
            // --- AIR CONTROLS ---

            // Flip: press jump while holding a direction in air
            if (Phaser.Input.Keyboard.JustDown(keys.up) && this.canFlip && !this.isFlipping) {
                if (keys.left.isDown) {
                    this.isFlipping = true;
                    this.flipDir = -1;
                    this.flipRemaining = 360;
                    this.canFlip = false;
                } else if (keys.right.isDown) {
                    this.isFlipping = true;
                    this.flipDir = 1;
                    this.flipRemaining = 360;
                    this.canFlip = false;
                }
            }

            // During flip, auto-rotate; otherwise manual rotation
            if (this.isFlipping) {
                const flipAmount = this.flipSpeed * dt;
                this.angle += this.flipDir * flipAmount;
                this.flipRemaining -= flipAmount;
                if (this.flipRemaining <= 0) {
                    this.isFlipping = false;
                }
            } else {
                if (keys.left.isDown) {
                    this.angle -= GAME_CONFIG.CAR_AIR_ROTATION_SPEED * dt;
                } else if (keys.right.isDown) {
                    this.angle += GAME_CONFIG.CAR_AIR_ROTATION_SPEED * dt;
                }
            }

            // Boost (down key while in air)
            const hasFuel = this.boostRechargeRate === -1 || this.boostFuel > 0;
            const wantBoost = keys.down.isDown && hasFuel;

            if (wantBoost) {
                this.isBoosting = true;

                // Thrust in the direction the car is pointing
                const rad = Phaser.Math.DegToRad(this.angle);
                this.body.velocity.x += Math.cos(rad) * GAME_CONFIG.BOOST_THRUST * dt;
                this.body.velocity.y += Math.sin(rad) * GAME_CONFIG.BOOST_THRUST * dt;

                // Drain fuel (skip if infinite)
                if (this.boostRechargeRate !== -1) {
                    this.boostFuel -= GAME_CONFIG.BOOST_DRAIN_RATE * dt;
                    if (this.boostFuel < 0) this.boostFuel = 0;
                }

                // Position emitter behind the car based on angle
                const behindRad = Phaser.Math.DegToRad(this.angle + 180);
                this.boostEmitter.setPosition(
                    this.x + Math.cos(behindRad) * this.displayWidth / 2,
                    this.y + Math.sin(behindRad) * this.displayWidth / 2
                );

                // Rotate particle spray to match (opposite of car facing)
                const sprayAngle = this.angle + 180;
                this.boostEmitter.setConfig({
                    angle: { min: sprayAngle - 20, max: sprayAngle + 20 }
                });
                this.boostEmitter.emitting = true;
            } else {
                this.isBoosting = false;
                this.boostEmitter.emitting = false;
            }
        } else {
            // --- GROUND CONTROLS ---

            // Snap rotation back to level when on ground
            if (this.angle !== 0) {
                if (Math.abs(this.angle) < 5) {
                    this.angle = 0;
                } else {
                    this.angle *= 0.8; // smooth snap back
                }
            }

            // Reset flip for next jump
            this.canFlip = true;
            this.isFlipping = false;

            // Horizontal movement
            if (keys.left.isDown) {
                this.body.setAccelerationX(-accel);
            } else if (keys.right.isDown) {
                this.body.setAccelerationX(accel);
            } else {
                this.body.setAccelerationX(0);
            }

            // Jump
            if (keys.up.isDown) {
                this.body.setVelocityY(GAME_CONFIG.CAR_JUMP_VELOCITY);
            }

            // Stop boosting visuals
            this.isBoosting = false;
            this.boostEmitter.emitting = false;

            // Recharge fuel on ground
            if (this.boostRechargeRate > 0 && this.boostFuel < GAME_CONFIG.BOOST_MAX_FUEL) {
                this.boostFuel += this.boostRechargeRate * dt;
                if (this.boostFuel > GAME_CONFIG.BOOST_MAX_FUEL) {
                    this.boostFuel = GAME_CONFIG.BOOST_MAX_FUEL;
                }
            }
        }
    }

    resetPosition() {
        super.resetPosition();
        this.angle = 0;
        this.boostFuel = (this.boostRechargeRate === -1) ? GAME_CONFIG.BOOST_MAX_FUEL : GAME_CONFIG.BOOST_MAX_FUEL;
        this.isBoosting = false;
        this.canFlip = true;
        this.isFlipping = false;
        if (this.boostEmitter) this.boostEmitter.emitting = false;
    }
}
