import GAME_CONFIG from '../config/gameConfig.js';
import { MAP_LIST, DEFAULT_MAP } from '../config/maps.js';
import Pitch from '../objects/Pitch.js';
import Ball from '../objects/Ball.js';
import PlayerCar from '../objects/PlayerCar.js';
import AICar from '../objects/AICar.js';
import ScoreManager from '../systems/ScoreManager.js';
import MatchTimer from '../systems/MatchTimer.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.mapName = data.mapName ?? DEFAULT_MAP;
        this.mapConfig = MAP_LIST.find(m => m.name === this.mapName) ?? MAP_LIST[0];
        this.matchMode = data.matchMode ?? 'goals';
        this.goalLimit = data.goalLimit ?? GAME_CONFIG.DEFAULT_GOAL_LIMIT;
        this.timeLimit = data.timeLimit ?? GAME_CONFIG.DEFAULT_TIME_LIMIT;
        this.difficulty = data.difficulty ?? GAME_CONFIG.DEFAULT_DIFFICULTY;
        this.ballGravity = data.ballGravity ?? GAME_CONFIG.DEFAULT_BALL_GRAVITY;
        this.carSpeed = data.carSpeed ?? GAME_CONFIG.DEFAULT_SPEED;
        this.boostRegen = data.boostRegen ?? GAME_CONFIG.DEFAULT_BOOST_REGEN;
        this.carSizeLabel = data.carSize ?? GAME_CONFIG.DEFAULT_CAR_SIZE;
        this.ballSizeLabel = data.ballSize ?? GAME_CONFIG.DEFAULT_BALL_SIZE;
        this.gameMode = data.gameMode ?? 'ai'; // 'ai' or '2player'
        this.carChoice = data.carChoice ?? GAME_CONFIG.DEFAULT_CAR_CHOICE;
        this.goalExplosion = data.goalExplosion ?? GAME_CONFIG.DEFAULT_GOAL_EXPLOSION;
    }

    create() {
        this.cameras.main.setBackgroundColor('#1a1a2e');

        const mc = this.mapConfig;

        // Extend world bounds to encompass goal recesses (they extend beyond the canvas)
        const goalExtent = mc.goalWidth + mc.goalPostThickness + 10;
        this.physics.world.setBounds(
            -goalExtent, 0,
            GAME_CONFIG.GAME_WIDTH + goalExtent * 2, GAME_CONFIG.GAME_HEIGHT
        );

        // Create pitch (walls + visuals) with map config
        this.pitch = new Pitch(this, mc);

        // Calculate positions using map's wall thickness
        const groundY = GAME_CONFIG.GAME_HEIGHT - mc.wallThickness - 30;
        const centerX = GAME_CONFIG.GAME_WIDTH / 2;
        const centerY = GAME_CONFIG.GAME_HEIGHT / 2;

        // Resolve car size from preset label
        const carSizeConfig = GAME_CONFIG.CAR_SIZE_OPTIONS.find(o => o.label === this.carSizeLabel);
        const carTargetHeight = carSizeConfig ? carSizeConfig.height : GAME_CONFIG.CAR_TARGET_HEIGHT;

        // Resolve ball size from preset label and regenerate ball texture if needed
        const ballSizeConfig = GAME_CONFIG.BALL_SIZE_OPTIONS.find(o => o.label === this.ballSizeLabel);
        const ballRadius = ballSizeConfig ? ballSizeConfig.radius : GAME_CONFIG.BALL_RADIUS;

        if (ballRadius !== GAME_CONFIG.BALL_RADIUS) {
            // Remove the default ball texture and generate one at the custom radius
            if (this.textures.exists('ball')) {
                this.textures.remove('ball');
            }
            const r = ballRadius;
            const gfx = this.make.graphics({ x: 0, y: 0, add: false });
            gfx.fillStyle(GAME_CONFIG.BALL_OUTLINE_COLOR, 1);
            gfx.fillCircle(r + 1, r + 1, r + 1);
            gfx.fillStyle(GAME_CONFIG.BALL_COLOR, 1);
            gfx.fillCircle(r + 1, r + 1, r);
            gfx.fillStyle(0x333333, 1);
            gfx.fillCircle(r + 1, r + 1, r * 0.3);
            gfx.generateTexture('ball', (r + 1) * 2, (r + 1) * 2);
            gfx.destroy();
        }

        // Create ball at center
        this.ball = new Ball(this, centerX, centerY, ballRadius);

        // Apply ball-specific gravity override (offset from world gravity)
        this.ball.body.setGravityY(this.ballGravity - GAME_CONFIG.GRAVITY_Y);

        // Apply map-specific ball drag
        this.ball.body.setDrag(mc.ballDrag, 0);

        // Resolve car textures from car choice
        const carConfig = GAME_CONFIG.CAR_OPTIONS.find(o => o.label === this.carChoice) ?? GAME_CONFIG.CAR_OPTIONS[0];
        const blueTexture = carConfig.blue;
        const redTexture = carConfig.red;

        // Create player car (blue, left side) — always uses WASD in 2-player mode,
        // or arrow keys (legacy default) in vs AI mode
        const playerStartX = GAME_CONFIG.GAME_WIDTH * GAME_CONFIG.BLUE_START_X_RATIO;
        const is2Player = this.gameMode === '2player';

        if (is2Player) {
            // 2-player: Player 1 uses WASD
            this.playerCar = new PlayerCar(this, playerStartX, groundY, carTargetHeight, {
                textureKey: blueTexture,
                facingRight: false,
                keys: { up: 'W', down: 'S', left: 'A', right: 'D' },
                particleKey: 'boost-particle-p1'
            });
        } else {
            // vs AI: Player 1 uses arrow keys (backward compatible)
            this.playerCar = new PlayerCar(this, playerStartX, groundY, carTargetHeight, {
                textureKey: blueTexture,
                facingRight: false,
                keys: { up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT' },
                particleKey: 'boost-particle'
            });
        }

        // Create opponent car (red, right side)
        const aiStartX = GAME_CONFIG.GAME_WIDTH * GAME_CONFIG.RED_START_X_RATIO;

        if (is2Player) {
            // 2-player: Player 2 uses arrow keys, red car
            this.player2Car = new PlayerCar(this, aiStartX, groundY, carTargetHeight, {
                textureKey: redTexture,
                facingRight: false,   // red car faces left (toward blue goal)
                keys: { up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT' },
                particleKey: 'boost-particle-p2'
            });
            this.redCar = this.player2Car; // unified reference for collisions
        } else {
            // vs AI: AI controls the red car
            this.aiCar = new AICar(this, aiStartX, groundY, this.difficulty, carTargetHeight, mc.wallThickness, redTexture);
            this.redCar = this.aiCar; // unified reference for collisions
        }

        // Apply car speed setting to both cars
        const speedConfig = GAME_CONFIG.SPEED_OPTIONS.find(o => o.label === this.carSpeed);
        if (speedConfig) {
            this.playerCar.body.setMaxVelocity(speedConfig.maxSpeed, 1000);
            this.playerCar.carAcceleration = speedConfig.acceleration;
            if (is2Player) {
                this.player2Car.body.setMaxVelocity(speedConfig.maxSpeed, 1000);
                this.player2Car.carAcceleration = speedConfig.acceleration;
            } else {
                this.aiCar.body.setMaxVelocity(
                    Math.min(speedConfig.maxSpeed, this.aiCar.aiConfig.maxSpeed), 1000
                );
                this.aiCar.carAcceleration = speedConfig.acceleration;
            }
        }

        // Apply boost regen rate to player car(s)
        const regenConfig = GAME_CONFIG.BOOST_REGEN_OPTIONS.find(o => o.label === this.boostRegen);
        if (regenConfig) {
            this.playerCar.boostRechargeRate = regenConfig.rate;
            if (regenConfig.rate === -1) {
                this.playerCar.boostFuel = GAME_CONFIG.BOOST_MAX_FUEL;
            }
            if (is2Player) {
                this.player2Car.boostRechargeRate = regenConfig.rate;
                if (regenConfig.rate === -1) {
                    this.player2Car.boostFuel = GAME_CONFIG.BOOST_MAX_FUEL;
                }
            }
        }

        // Setup controls (cursor keys still created for legacy/menu use, but
        // PlayerCar now manages its own key bindings internally)
        this.cursors = this.input.keyboard.createCursorKeys();

        // Setup collisions
        this.setupCollisions();

        // Setup scoring zones
        this.setupGoalZones();

        // Setup score manager
        this.scoreManager = new ScoreManager(this.matchMode, this.goalLimit, this.timeLimit);

        // Setup timer if time-limited
        this.matchTimer = null;
        if (this.matchMode === 'time') {
            this.matchTimer = new MatchTimer(this.timeLimit);
            this.matchTimer.start();
        }

        // Create HUD
        this.createHUD();

        // Goal state
        this.isGoalPause = false;
        this.goalPauseTimer = 0;

        // Out-of-bounds respawn timers (2 seconds outside pitch = teleport to spawn)
        this.playerOobTime = 0;
        this.aiOobTime = 0;
        this.ballOobTime = 0;

        // Ball ground-stuck detection
        this.ballGroundTime = 0;
        this.ballWarningActive = false;
        this.ballWarningTween = null;
        this.launchText = null;

        // Fireball attack (blue team ability)
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.fireball = null;
        this.fireballEmitter = null;
        this.fireballCooldown = 0;
        this.redCarDisabled = false;
        this.redCarRespawnTimer = 0;
    }

    setupCollisions() {
        const walls = this.pitch.walls;

        // Cars collide with walls
        this.physics.add.collider(this.playerCar, walls);
        this.physics.add.collider(this.redCar, walls);

        // Ball collides with walls
        this.physics.add.collider(this.ball, walls);

        // Cars collide with each other
        this.physics.add.collider(this.playerCar, this.redCar);

        // Cars kick ball
        this.physics.add.collider(this.playerCar, this.ball, this.handleCarBallCollision, null, this);
        this.physics.add.collider(this.redCar, this.ball, this.handleCarBallCollision, null, this);

        // Obstacle colliders (cars and ball collide with obstacles)
        if (this.pitch.obstacles.getLength() > 0) {
            this.physics.add.collider(this.playerCar, this.pitch.obstacles);
            this.physics.add.collider(this.redCar, this.pitch.obstacles);
            this.physics.add.collider(this.ball, this.pitch.obstacles);
        }
    }

    setupGoalZones() {
        const { GAME_HEIGHT, GAME_WIDTH } = GAME_CONFIG;
        const mc = this.mapConfig;
        const WALL_THICKNESS = mc.wallThickness;
        const GOAL_WIDTH = mc.goalWidth;
        const GOAL_HEIGHT = mc.goalHeight;
        const goalTop = GAME_HEIGHT - WALL_THICKNESS - GOAL_HEIGHT;

        // Left goal scoring zone (inside the goal recess)
        this.leftGoalZone = this.add.rectangle(
            WALL_THICKNESS - GOAL_WIDTH / 2,
            goalTop + GOAL_HEIGHT / 2,
            10, GOAL_HEIGHT - 20, 0x0000ff, 0
        );
        this.physics.add.existing(this.leftGoalZone, true);

        // Right goal scoring zone
        this.rightGoalZone = this.add.rectangle(
            GAME_WIDTH - WALL_THICKNESS + GOAL_WIDTH / 2,
            goalTop + GOAL_HEIGHT / 2,
            10, GOAL_HEIGHT - 20, 0xff0000, 0
        );
        this.physics.add.existing(this.rightGoalZone, true);

        // Overlap detection for scoring
        this.physics.add.overlap(this.ball, this.leftGoalZone, () => {
            if (!this.isGoalPause) this.handleGoal('red'); // ball in blue's goal = red scores
        });

        this.physics.add.overlap(this.ball, this.rightGoalZone, () => {
            if (!this.isGoalPause) this.handleGoal('blue'); // ball in red's goal = blue scores
        });
    }

    handleCarBallCollision(car, ball) {
        const dx = ball.x - car.x;
        const dy = ball.y - car.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = dx / len;
        const ny = dy / len;

        const carSpeed = Math.sqrt(
            car.body.velocity.x * car.body.velocity.x +
            car.body.velocity.y * car.body.velocity.y
        );
        const kickStrength = GAME_CONFIG.KICK_FORCE + carSpeed * GAME_CONFIG.KICK_CAR_SPEED_FACTOR;

        ball.body.setVelocity(
            nx * kickStrength,
            ny * kickStrength
        );
    }

    handleGoal(scoringTeam) {
        if (this.isGoalPause || this.scoreManager.matchOver) return;

        this.isGoalPause = true;
        this.scoreManager.addGoal(scoringTeam);
        this.updateHUD();

        // Clear any ball warning state before pausing
        this.ballGroundTime = 0;
        this.clearBallWarning();

        if (this.matchTimer) this.matchTimer.pause();

        const isBlue = scoringTeam === 'blue';
        const teamColor = isBlue ? 0x3366ff : 0xff3333;
        const teamHex = isBlue ? '#3366ff' : '#ff3333';

        // --- FLASH BACKGROUND to team colour ---
        this.goalFlash = this.add.rectangle(
            GAME_CONFIG.GAME_WIDTH / 2, GAME_CONFIG.GAME_HEIGHT / 2,
            GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT,
            teamColor, 0.5
        ).setDepth(90);

        this.tweens.add({
            targets: this.goalFlash,
            alpha: 0,
            duration: 1500,
            ease: 'Power2'
        });

        // --- EXPLOSION in the goal ---
        // Determine goal center position
        const mc = this.mapConfig;
        const goalTop = GAME_CONFIG.GAME_HEIGHT - mc.wallThickness - mc.goalHeight;
        const goalCenterY = goalTop + mc.goalHeight / 2;
        let explosionX;
        if (isBlue) {
            // Blue scored = ball went into RED goal (right side)
            explosionX = GAME_CONFIG.GAME_WIDTH - mc.wallThickness;
        } else {
            // Red scored = ball went into BLUE goal (left side)
            explosionX = mc.wallThickness;
        }

        // Create goal explosion effect
        this.goalEffects = this.createGoalExplosionEffect(explosionX, goalCenterY, teamColor);

        // --- SEND CARS FLYING BACK from the explosion ---
        // Blue car gets blasted to the left, red car gets blasted to the right
        const blastForce = 600;
        const blastUp = -350;

        // Calculate blast direction from explosion to each car
        const blastPlayerDx = this.playerCar.x - explosionX;
        const blastPlayerDir = blastPlayerDx >= 0 ? 1 : -1;
        this.playerCar.body.setVelocity(blastPlayerDir * blastForce, blastUp);

        const blastRedDx = this.redCar.x - explosionX;
        const blastRedDir = blastRedDx >= 0 ? 1 : -1;
        this.redCar.body.setVelocity(blastRedDir * blastForce, blastUp);

        // Ball also blasts away
        this.ball.body.setVelocity(
            (this.ball.x - explosionX) > 0 ? 400 : -400,
            -300
        );

        // Let physics run briefly for the blast effect, then pause
        this.time.delayedCall(600, () => {
            this.physics.pause();
        });

        // Show GOAL text
        const goalText = this.add.text(
            GAME_CONFIG.GAME_WIDTH / 2,
            GAME_CONFIG.GAME_HEIGHT / 2,
            'GOAL!',
            {
                fontSize: '72px',
                fill: teamHex,
                fontFamily: 'Arial',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 6
            }
        ).setOrigin(0.5).setDepth(100);

        const scorerText = this.add.text(
            GAME_CONFIG.GAME_WIDTH / 2,
            GAME_CONFIG.GAME_HEIGHT / 2 + 60,
            `${scoringTeam.toUpperCase()} SCORES!`,
            {
                fontSize: '28px',
                fill: '#ffffff',
                fontFamily: 'Arial'
            }
        ).setOrigin(0.5).setDepth(100);

        // Check win condition
        const result = this.scoreManager.checkWinCondition();

        this.time.delayedCall(GAME_CONFIG.GOAL_PAUSE_DURATION, () => {
            goalText.destroy();
            scorerText.destroy();
            if (this.goalFlash) {
                this.goalFlash.destroy();
                this.goalFlash = null;
            }
            if (this.goalEffects) {
                this.goalEffects.forEach(e => { try { e.destroy(); } catch(ex) {} });
                this.goalEffects = null;
            }

            if (result.over) {
                this.endMatch(result.winner);
            } else {
                this.resetAfterGoal();
            }
        });
    }

    createGoalExplosionEffect(explosionX, goalCenterY, teamColor) {
        const effects = [];

        // Ensure particle texture exists
        if (!this.textures.exists('explosion-particle')) {
            const gfx = this.make.graphics({ x: 0, y: 0, add: false });
            gfx.fillStyle(0xffffff, 1);
            gfx.fillCircle(5, 5, 5);
            gfx.generateTexture('explosion-particle', 10, 10);
            gfx.destroy();
        }

        switch (this.goalExplosion) {
            case 'Fireworks': {
                const offsets = [
                    { x: 0, y: 0, delay: 0 },
                    { x: -30, y: -50, delay: 200 },
                    { x: 20, y: -80, delay: 400 }
                ];
                offsets.forEach(({ x: ox, y: oy, delay }) => {
                    this.time.delayedCall(delay, () => {
                        const burst = this.add.particles(explosionX + ox, goalCenterY + oy, 'explosion-particle', {
                            speed: { min: 100, max: 350 },
                            angle: { min: 0, max: 360 },
                            scale: { start: 1, end: 0 },
                            alpha: { start: 1, end: 0 },
                            lifespan: 1000,
                            quantity: 25,
                            tint: [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff],
                            blendMode: 'ADD',
                            emitting: false
                        }).setDepth(95);
                        burst.explode(25);
                        effects.push(burst);
                    });
                });
                break;
            }
            case 'Confetti': {
                const confetti = this.add.particles(explosionX, goalCenterY - 40, 'explosion-particle', {
                    speedX: { min: -200, max: 200 },
                    speedY: { min: -100, max: 50 },
                    scale: { start: 0.8, end: 0.3 },
                    alpha: { start: 1, end: 0.6 },
                    lifespan: 1800,
                    quantity: 80,
                    gravityY: 300,
                    tint: [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0xff8800, 0x00ffff, 0xffffff],
                    emitting: false
                }).setDepth(95);
                confetti.explode(80);
                effects.push(confetti);
                break;
            }
            case 'Shockwave': {
                // Expanding ring
                const ring = this.add.graphics().setDepth(95);
                const ringData = { radius: 10, alpha: 1 };
                this.tweens.add({
                    targets: ringData,
                    radius: 150,
                    alpha: 0,
                    duration: 600,
                    ease: 'Power2',
                    onUpdate: () => {
                        ring.clear();
                        ring.lineStyle(3, teamColor, ringData.alpha);
                        ring.strokeCircle(explosionX, goalCenterY, ringData.radius);
                    }
                });
                effects.push(ring);

                // Second ring with delay
                const ring2 = this.add.graphics().setDepth(95);
                const ringData2 = { radius: 10, alpha: 1 };
                this.time.delayedCall(200, () => {
                    this.tweens.add({
                        targets: ringData2,
                        radius: 120,
                        alpha: 0,
                        duration: 500,
                        ease: 'Power2',
                        onUpdate: () => {
                            ring2.clear();
                            ring2.lineStyle(2, 0xffffff, ringData2.alpha);
                            ring2.strokeCircle(explosionX, goalCenterY, ringData2.radius);
                        }
                    });
                });
                effects.push(ring2);

                // Small particle burst
                const burst = this.add.particles(explosionX, goalCenterY, 'explosion-particle', {
                    speed: { min: 80, max: 200 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 0.8, end: 0 },
                    alpha: { start: 1, end: 0 },
                    lifespan: 400,
                    quantity: 12,
                    tint: [teamColor, 0xffffff],
                    blendMode: 'ADD',
                    emitting: false
                }).setDepth(95);
                burst.explode(12);
                effects.push(burst);
                break;
            }
            case 'Minimal': {
                const puff = this.add.particles(explosionX, goalCenterY, 'explosion-particle', {
                    speed: { min: 40, max: 120 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 0.6, end: 0 },
                    alpha: { start: 0.7, end: 0 },
                    lifespan: 350,
                    quantity: 8,
                    tint: [teamColor, 0xffffff],
                    blendMode: 'ADD',
                    emitting: false
                }).setDepth(95);
                puff.explode(8);
                effects.push(puff);
                break;
            }
            default: { // Classic
                const explosion = this.add.particles(explosionX, goalCenterY, 'explosion-particle', {
                    speed: { min: 150, max: 500 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 1.5, end: 0 },
                    alpha: { start: 1, end: 0 },
                    lifespan: 800,
                    quantity: 40,
                    tint: [teamColor, 0xffff00, 0xff8800, 0xffffff],
                    blendMode: 'ADD',
                    emitting: false
                }).setDepth(95);
                explosion.explode(40);
                effects.push(explosion);
                break;
            }
        }

        return effects;
    }

    resetAfterGoal() {
        // Clean up fireball if active
        this.cleanupFireball();

        // Re-enable red car if disabled
        if (this.redCarDisabled) {
            this.redCarDisabled = false;
            this.redCarRespawnTimer = 0;
            this.redCar.body.setEnable(true);
            this.redCar.setVisible(true);
            this.redCar.setAlpha(1);
        }

        this.ball.resetPosition();
        this.playerCar.resetPosition();
        this.playerCar.angle = 0;
        this.redCar.resetPosition();
        if (this.redCar.angle !== undefined) this.redCar.angle = 0;

        // Reset ball ground-stuck timer
        this.ballGroundTime = 0;
        this.clearBallWarning();

        this.physics.resume();
        if (this.matchTimer) this.matchTimer.resume();
        this.isGoalPause = false;
    }

    endMatch(winner) {
        this.scene.start('GameOverScene', {
            winner: winner,
            blueScore: this.scoreManager.blueScore,
            redScore: this.scoreManager.redScore
        });
    }

    createHUD() {
        // Score display
        this.blueScoreText = this.add.text(GAME_CONFIG.GAME_WIDTH / 2 - 60, 2, '0', {
            fontSize: '16px', fill: '#3366ff', fontFamily: 'Arial', fontStyle: 'bold'
        }).setOrigin(1, 0).setDepth(50);

        this.add.text(GAME_CONFIG.GAME_WIDTH / 2, 2, '-', {
            fontSize: '16px', fill: '#ffffff', fontFamily: 'Arial'
        }).setOrigin(0.5, 0).setDepth(50);

        this.redScoreText = this.add.text(GAME_CONFIG.GAME_WIDTH / 2 + 60, 2, '0', {
            fontSize: '16px', fill: '#ff3333', fontFamily: 'Arial', fontStyle: 'bold'
        }).setOrigin(0, 0).setDepth(50);

        // Team labels
        this.add.text(GAME_CONFIG.GAME_WIDTH / 2 - 80, 2, 'BLUE', {
            fontSize: '12px', fill: '#3366ff', fontFamily: 'Arial'
        }).setOrigin(1, 0).setDepth(50);

        this.add.text(GAME_CONFIG.GAME_WIDTH / 2 + 80, 2, 'RED', {
            fontSize: '12px', fill: '#ff3333', fontFamily: 'Arial'
        }).setOrigin(0, 0).setDepth(50);

        // Timer display (if time mode)
        if (this.matchMode === 'time') {
            this.timerText = this.add.text(GAME_CONFIG.GAME_WIDTH - 70, 2, '', {
                fontSize: '16px', fill: '#ffffff', fontFamily: 'Arial'
            }).setOrigin(1, 0).setDepth(50);
        }

        // Menu button (top-right)
        const menuBtn = this.add.text(GAME_CONFIG.GAME_WIDTH - 8, 2, 'MENU', {
            fontSize: '12px', fill: '#888888', fontFamily: 'Arial', fontStyle: 'bold'
        }).setOrigin(1, 0).setDepth(50).setInteractive({ useHandCursor: true });

        menuBtn.on('pointerover', () => menuBtn.setFill('#ffffff'));
        menuBtn.on('pointerout', () => menuBtn.setFill('#888888'));
        menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));

        // Mode indicator (top-left)
        if (this.gameMode === '2player') {
            this.add.text(10, 2, '2 PLAYER', {
                fontSize: '12px', fill: '#2196F3', fontFamily: 'Arial', fontStyle: 'bold'
            }).setDepth(50);
        } else {
            this.add.text(10, 2, `AI: ${this.difficulty.toUpperCase()}`, {
                fontSize: '12px', fill: '#888888', fontFamily: 'Arial'
            }).setDepth(50);
        }

        // Map indicator (show only when not Classic)
        let hudY = 18;
        if (this.mapName !== 'Classic') {
            this.add.text(10, hudY, `Map: ${this.mapName}`, {
                fontSize: '12px', fill: '#e65100', fontFamily: 'Arial'
            }).setDepth(50);
            hudY += 16;
        }

        // Speed indicator (show only when not Normal)
        if (this.carSpeed !== 'Normal') {
            this.add.text(10, hudY, `Speed: ${this.carSpeed}`, {
                fontSize: '12px', fill: '#00bcd4', fontFamily: 'Arial'
            }).setDepth(50);
            hudY += 16;
        }

        // Gravity indicator (show only when not Normal)
        if (this.ballGravity !== GAME_CONFIG.GRAVITY_Y) {
            const gravLabel = GAME_CONFIG.GRAVITY_OPTIONS.find(o => o.value === this.ballGravity);
            this.add.text(10, hudY, `Gravity: ${gravLabel ? gravLabel.label : this.ballGravity}`, {
                fontSize: '12px', fill: '#bb86fc', fontFamily: 'Arial'
            }).setDepth(50);
            hudY += 16;
        }

        // Car size indicator (show only when not Normal)
        if (this.carSizeLabel !== 'Normal') {
            this.add.text(10, hudY, `Car: ${this.carSizeLabel}`, {
                fontSize: '12px', fill: '#66bb6a', fontFamily: 'Arial'
            }).setDepth(50);
            hudY += 16;
        }

        // Ball size indicator (show only when not Normal)
        if (this.ballSizeLabel !== 'Normal') {
            this.add.text(10, hudY, `Ball: ${this.ballSizeLabel}`, {
                fontSize: '12px', fill: '#42a5f5', fontFamily: 'Arial'
            }).setDepth(50);
        }

        // Boost meter for Player 1 (bottom-left)
        const meterX = 15;
        const meterY = GAME_CONFIG.GAME_HEIGHT - 30;
        const meterW = 80;
        const meterH = 10;

        const p1Label = this.gameMode === '2player' ? 'P1 BOOST' : 'BOOST';
        this.add.text(meterX, meterY - 14, p1Label, {
            fontSize: '10px', fill: '#ffaa00', fontFamily: 'Arial', fontStyle: 'bold'
        }).setDepth(50);

        this.boostMeterBg = this.add.rectangle(meterX, meterY, meterW, meterH, 0x333333)
            .setOrigin(0, 0.5).setDepth(50);
        this.boostMeterFill = this.add.rectangle(meterX, meterY, meterW, meterH, 0xffaa00)
            .setOrigin(0, 0.5).setDepth(50);

        // Boost meter for Player 2 (bottom-right) — only in 2-player mode
        if (this.gameMode === '2player') {
            const meter2X = GAME_CONFIG.GAME_WIDTH - meterW - 15;
            this.add.text(meter2X, meterY - 14, 'P2 BOOST', {
                fontSize: '10px', fill: '#ff4444', fontFamily: 'Arial', fontStyle: 'bold'
            }).setDepth(50);

            this.boostMeter2Bg = this.add.rectangle(meter2X, meterY, meterW, meterH, 0x333333)
                .setOrigin(0, 0.5).setDepth(50);
            this.boostMeter2Fill = this.add.rectangle(meter2X, meterY, meterW, meterH, 0xff4444)
                .setOrigin(0, 0.5).setDepth(50);
        }
    }

    updateHUD() {
        const scores = this.scoreManager.getScores();
        this.blueScoreText.setText(scores.blue.toString());
        this.redScoreText.setText(scores.red.toString());
    }

    updateBoostMeter(car, meterFill, defaultColor) {
        if (car.boostRechargeRate === -1) {
            // Infinite mode - always full, gold colour
            meterFill.setScale(1, 1);
            meterFill.setFillStyle(0xffdd00);
        } else {
            const fuelRatio = car.boostFuel / GAME_CONFIG.BOOST_MAX_FUEL;
            meterFill.setScale(fuelRatio, 1);
            if (fuelRatio < 0.25) {
                meterFill.setFillStyle(0xff3333);
            } else if (fuelRatio < 0.5) {
                meterFill.setFillStyle(0xff8800);
            } else {
                meterFill.setFillStyle(defaultColor);
            }
        }
    }

    // --- Ball ground-stuck detection & auto-launch ---

    updateBallGroundStuck(delta) {
        const ballBody = this.ball.body;
        const onGround = ballBody.blocked.down || ballBody.touching.down;

        if (onGround) {
            this.ballGroundTime += delta;

            // Show warning when approaching launch threshold
            if (this.ballGroundTime >= GAME_CONFIG.BALL_LAUNCH_WARNING_TIME && !this.ballWarningActive) {
                this.startBallWarning();
            }

            // Launch the ball when stuck time exceeds threshold
            if (this.ballGroundTime >= GAME_CONFIG.BALL_GROUND_STUCK_TIME) {
                this.launchBall();
            }
        } else {
            // Ball is airborne - reset timer and clear any warning
            if (this.ballGroundTime > 0) {
                this.ballGroundTime = 0;
                this.clearBallWarning();
            }
        }
    }

    startBallWarning() {
        this.ballWarningActive = true;

        // Flash the ball with a pulsing alpha
        this.ballWarningTween = this.tweens.add({
            targets: this.ball,
            alpha: 0.4,
            duration: 200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    clearBallWarning() {
        this.ballWarningActive = false;

        if (this.ballWarningTween) {
            this.ballWarningTween.stop();
            this.ballWarningTween = null;
        }
        // Restore full opacity
        this.ball.setAlpha(1);
    }

    launchBall() {
        // Clear warning state
        this.clearBallWarning();

        // Launch the ball upward
        this.ball.body.setVelocityY(GAME_CONFIG.BALL_LAUNCH_VELOCITY);

        // Reset ground timer
        this.ballGroundTime = 0;

        // Show "LAUNCH!" text effect at the ball's position
        const launchText = this.add.text(
            this.ball.x,
            this.ball.y - 30,
            'LAUNCH!',
            {
                fontSize: '24px',
                fill: '#ffff00',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5).setDepth(100);

        // Animate the text: float upward and fade out
        this.tweens.add({
            targets: launchText,
            y: launchText.y - 60,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                launchText.destroy();
            }
        });
    }

    isOutOfBounds(obj) {
        const margin = 50;
        return obj.x < -margin || obj.x > GAME_CONFIG.GAME_WIDTH + margin ||
               obj.y < -margin || obj.y > GAME_CONFIG.GAME_HEIGHT + margin;
    }

    checkOutOfBounds(delta) {
        const OOB_TIME = 2000; // 2 seconds

        // Player car
        if (this.isOutOfBounds(this.playerCar)) {
            this.playerOobTime += delta;
            if (this.playerOobTime >= OOB_TIME) {
                this.playerCar.resetPosition();
                this.playerCar.angle = 0;
                this.playerOobTime = 0;
            }
        } else {
            this.playerOobTime = 0;
        }

        // Red car (AI or Player 2)
        if (this.isOutOfBounds(this.redCar)) {
            this.aiOobTime += delta;
            if (this.aiOobTime >= OOB_TIME) {
                this.redCar.resetPosition();
                if (this.redCar.angle !== undefined) this.redCar.angle = 0;
                this.aiOobTime = 0;
            }
        } else {
            this.aiOobTime = 0;
        }

        // Ball
        if (this.isOutOfBounds(this.ball)) {
            this.ballOobTime += delta;
            if (this.ballOobTime >= OOB_TIME) {
                this.ball.resetPosition();
                this.ballOobTime = 0;
            }
        } else {
            this.ballOobTime = 0;
        }
    }

    // --- Fireball attack ---

    launchFireball() {
        const mc = this.mapConfig;
        const goalTop = GAME_CONFIG.GAME_HEIGHT - mc.wallThickness - mc.goalHeight;
        const goalCenterY = goalTop + mc.goalHeight / 2;
        const startX = mc.wallThickness + 10;

        // Create Slenderman texture if needed
        if (!this.textures.exists('fireball')) {
            const w = 120, h = 220;
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');

            // Tentacles behind body
            ctx.strokeStyle = '#1a1a1a';
            ctx.lineWidth = 3;
            const tentacles = [
                { sx: 60, sy: 90, cp1x: 10, cp1y: 60, cp2x: 0, cp2y: 30, ex: -5, ey: 10 },
                { sx: 60, sy: 90, cp1x: 110, cp1y: 60, cp2x: 120, cp2y: 30, ex: 125, ey: 10 },
                { sx: 60, sy: 100, cp1x: 15, cp1y: 110, cp2x: 5, cp2y: 140, ex: 0, ey: 160 },
                { sx: 60, sy: 100, cp1x: 105, cp1y: 110, cp2x: 115, cp2y: 140, ex: 120, ey: 160 },
            ];
            tentacles.forEach(t => {
                ctx.beginPath();
                ctx.moveTo(t.sx, t.sy);
                ctx.bezierCurveTo(t.cp1x, t.cp1y, t.cp2x, t.cp2y, t.ex, t.ey);
                ctx.stroke();
            });

            // Long legs
            ctx.strokeStyle = '#111111';
            ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(52, 150); ctx.lineTo(40, 220); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(68, 150); ctx.lineTo(80, 220); ctx.stroke();

            // Tall thin body (black suit)
            ctx.fillStyle = '#111111';
            ctx.beginPath();
            ctx.ellipse(60, 120, 18, 55, 0, 0, Math.PI * 2);
            ctx.fill();

            // Suit jacket lapels
            ctx.strokeStyle = '#222222';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(60, 75); ctx.lineTo(50, 110); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(60, 75); ctx.lineTo(70, 110); ctx.stroke();

            // Tie
            ctx.fillStyle = '#880000';
            ctx.beginPath();
            ctx.moveTo(60, 78);
            ctx.lineTo(55, 120);
            ctx.lineTo(60, 130);
            ctx.lineTo(65, 120);
            ctx.closePath();
            ctx.fill();

            // Long thin arms
            ctx.strokeStyle = '#111111';
            ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(44, 85); ctx.lineTo(15, 155); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(76, 85); ctx.lineTo(105, 155); ctx.stroke();
            // Fingers
            ctx.lineWidth = 2;
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath(); ctx.moveTo(15, 155); ctx.lineTo(8 + i * 3, 170); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(105, 155); ctx.lineTo(112 + i * 3, 170); ctx.stroke();
            }

            // White featureless face (oval)
            ctx.fillStyle = '#e8e0d8';
            ctx.beginPath();
            ctx.ellipse(60, 48, 16, 22, 0, 0, Math.PI * 2);
            ctx.fill();

            // Subtle face shadow (no features - just Slenderman blank)
            ctx.fillStyle = 'rgba(0,0,0,0.05)';
            ctx.beginPath();
            ctx.ellipse(60, 52, 12, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            this.textures.addCanvas('fireball', canvas);
        }

        this.fireball = this.physics.add.sprite(startX, goalCenterY, 'fireball');
        this.fireball.setScale(0.8);
        this.fireball.setDepth(80);
        this.fireball.body.setAllowGravity(false);
        this.fireball.body.setCollideWorldBounds(false);

        // Dark smoke particle trail
        if (!this.textures.exists('fire-particle')) {
            const gfx = this.make.graphics({ x: 0, y: 0, add: false });
            gfx.fillStyle(0x222222, 1);
            gfx.fillCircle(4, 4, 4);
            gfx.generateTexture('fire-particle', 8, 8);
            gfx.destroy();
        }

        this.fireballEmitter = this.add.particles(startX, goalCenterY, 'fire-particle', {
            speed: { min: 20, max: 80 },
            scale: { start: 3, end: 0 },
            alpha: { start: 0.5, end: 0 },
            lifespan: 800,
            frequency: 12,
            tint: [0x111111, 0x222222, 0x333333, 0x000000],
            blendMode: 'NORMAL',
            emitting: true
        }).setDepth(79);

        // Eerie flickering effect
        this.tweens.add({
            targets: this.fireball,
            alpha: 0.6,
            duration: 100,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.fireballCooldown = 0;
    }

    updateFireball(delta) {
        if (!this.fireball || !this.fireball.active) return;

        const target = this.redCar;
        const speed = 3000;

        const dx = target.x - this.fireball.x;
        const dy = target.y - this.fireball.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 100) {
            this.fireballHit();
            return;
        }

        const nx = dx / dist;
        const ny = dy / dist;
        this.fireball.body.setVelocity(nx * speed, ny * speed);

        // Update trail position
        if (this.fireballEmitter) {
            this.fireballEmitter.setPosition(this.fireball.x, this.fireball.y);
        }

        // Rotate to face direction of travel
        this.fireball.setRotation(Math.atan2(dy, dx));
    }

    fireballHit() {
        const hitX = this.redCar.x;
        const hitY = this.redCar.y;

        // Big fire explosion
        if (!this.textures.exists('fire-explosion')) {
            const gfx = this.make.graphics({ x: 0, y: 0, add: false });
            gfx.fillStyle(0xffffff, 1);
            gfx.fillCircle(6, 6, 6);
            gfx.generateTexture('fire-explosion', 12, 12);
            gfx.destroy();
        }

        const explosion = this.add.particles(hitX, hitY, 'fire-explosion', {
            speed: { min: 150, max: 500 },
            angle: { min: 0, max: 360 },
            scale: { start: 2, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 1000,
            quantity: 50,
            tint: [0x000000, 0x111111, 0x222222, 0x440000, 0x660000],
            blendMode: 'NORMAL',
            emitting: false
        }).setDepth(90);
        explosion.explode(50);

        // Screen flash
        const flash = this.add.rectangle(
            GAME_CONFIG.GAME_WIDTH / 2, GAME_CONFIG.GAME_HEIGHT / 2,
            GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT,
            0x000000, 0.6
        ).setDepth(89);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 800,
            onComplete: () => flash.destroy()
        });

        // Clean up fireball
        this.cleanupFireball();

        // Disable red car
        this.redCar.setVisible(false);
        this.redCar.body.setEnable(false);
        this.redCar.body.setVelocity(0, 0);
        this.redCarDisabled = true;
        this.redCarRespawnTimer = 5000;

        // Clean up explosion
        this.time.delayedCall(1500, () => {
            if (explosion && explosion.active) explosion.destroy();
        });
    }

    respawnRedCar() {
        this.redCarDisabled = false;

        const mc = this.mapConfig;
        const respawnX = GAME_CONFIG.GAME_WIDTH * GAME_CONFIG.RED_START_X_RATIO;
        const respawnY = GAME_CONFIG.GAME_HEIGHT - mc.wallThickness - 30;

        this.redCar.setPosition(respawnX, respawnY);
        this.redCar.body.setVelocity(0, 0);
        this.redCar.body.setAcceleration(0, 0);
        this.redCar.body.setEnable(true);
        this.redCar.setVisible(true);
        this.redCar.setAlpha(0);
        if (this.redCar.angle !== undefined) this.redCar.angle = 0;

        // Fade in
        this.tweens.add({
            targets: this.redCar,
            alpha: 1,
            duration: 500,
            ease: 'Power2'
        });
    }

    cleanupFireball() {
        if (this.fireball) {
            this.fireball.destroy();
            this.fireball = null;
        }
        if (this.fireballEmitter) {
            this.fireballEmitter.destroy();
            this.fireballEmitter = null;
        }
    }

    update(time, delta) {
        if (this.isGoalPause || this.scoreManager.matchOver) return;

        // Check for out-of-bounds objects and respawn after 2 seconds
        this.checkOutOfBounds(delta);

        // Update player car (pass null for cursors — PlayerCar now uses its own keys)
        this.playerCar.update(this.cursors, delta);

        // Update boost meter (Player 1)
        this.updateBoostMeter(this.playerCar, this.boostMeterFill, 0xffaa00);

        // Update red car (AI or Player 2)
        if (this.gameMode === '2player') {
            this.player2Car.update(null, delta);
            // Update boost meter (Player 2)
            this.updateBoostMeter(this.player2Car, this.boostMeter2Fill, 0xff4444);
        } else {
            this.aiCar.update(this.ball, time);
        }

        // Update timer
        if (this.matchTimer) {
            const timeUp = this.matchTimer.update(delta);
            this.timerText.setText(this.matchTimer.getDisplay());

            if (this.matchTimer.isUrgent()) {
                this.timerText.setFill('#ff3333');
            }

            if (timeUp) {
                const result = this.scoreManager.checkTimeUp();
                this.physics.pause();
                this.endMatch(result.winner);
            }
        }

        // Ball ground-stuck detection & auto-launch
        this.updateBallGroundStuck(delta);

        // Fireball attack
        if (Phaser.Input.Keyboard.JustDown(this.enterKey) && !this.fireball && !this.redCarDisabled) {
            this.launchFireball();
        }
        if (this.fireball && this.fireball.active) {
            this.updateFireball(delta);
        }
        if (this.fireballCooldown > 0) {
            this.fireballCooldown -= delta;
        }
        if (this.redCarDisabled) {
            this.redCarRespawnTimer -= delta;
            if (this.redCarRespawnTimer <= 0) {
                this.respawnRedCar();
            }
        }
    }
}
