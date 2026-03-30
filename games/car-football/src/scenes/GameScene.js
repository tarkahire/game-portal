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

        // Orbital strike (X key)
        this.xKey = this.input.keyboard.addKey('X');
        this.orbitalActive = false;
        this.redCarDisabled = false;
        this.redCarRespawnTimer = 0;

        // Hollow Purple (V key)
        this.vKey = this.input.keyboard.addKey('V');
        this.hollowPurpleActive = false;
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
        this.orbitalActive = false;
        this.hollowPurpleActive = false;

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

    // --- Orbital Strike Cannon (X key) ---

    launchOrbitalStrike() {
        if (this.orbitalActive || this.redCarDisabled) return;
        this.orbitalActive = true;

        const targetX = this.redCar.x;
        const targetY = this.redCar.y;

        // Red targeting reticle on the red car
        const reticle = this.add.graphics().setDepth(85);
        const reticleData = { radius: 80, alpha: 1, rotation: 0 };

        const reticleTween = this.tweens.add({
            targets: reticleData,
            radius: 20,
            rotation: Math.PI * 2,
            duration: 1000,
            ease: 'Power2',
            onUpdate: () => {
                reticle.clear();
                // Outer circle
                reticle.lineStyle(3, 0xff0000, reticleData.alpha);
                reticle.strokeCircle(targetX, targetY, reticleData.radius);
                // Inner circle
                reticle.lineStyle(2, 0xff0000, reticleData.alpha);
                reticle.strokeCircle(targetX, targetY, reticleData.radius * 0.4);
                // Crosshairs
                const r = reticleData.radius;
                const cos = Math.cos(reticleData.rotation);
                const sin = Math.sin(reticleData.rotation);
                reticle.lineBetween(targetX + cos * r, targetY + sin * r, targetX - cos * r, targetY - sin * r);
                reticle.lineBetween(targetX - sin * r, targetY + cos * r, targetX + sin * r, targetY - cos * r);
            }
        });

        // Warning text
        const warningText = this.add.text(
            GAME_CONFIG.GAME_WIDTH / 2, 40,
            'ORBITAL STRIKE INCOMING',
            { fontSize: '20px', fill: '#ff0000', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 }
        ).setOrigin(0.5).setDepth(100);

        this.tweens.add({
            targets: warningText,
            alpha: 0.3,
            duration: 200,
            yoyo: true,
            repeat: 4
        });

        // After targeting, fire the beam
        this.time.delayedCall(1200, () => {
            reticle.destroy();
            warningText.destroy();

            const beamX = targetX;

            // Giant beam from top of screen
            const beam = this.add.rectangle(beamX, 0, 60, GAME_CONFIG.GAME_HEIGHT * 2, 0xffffff, 0.9)
                .setOrigin(0.5, 0).setDepth(95);

            // Inner beam glow
            const innerBeam = this.add.rectangle(beamX, 0, 30, GAME_CONFIG.GAME_HEIGHT * 2, 0x00ccff, 0.8)
                .setOrigin(0.5, 0).setDepth(96);

            // Outer glow
            const outerBeam = this.add.rectangle(beamX, 0, 120, GAME_CONFIG.GAME_HEIGHT * 2, 0x0066ff, 0.3)
                .setOrigin(0.5, 0).setDepth(94);

            // Screen flash white
            const flash = this.add.rectangle(
                GAME_CONFIG.GAME_WIDTH / 2, GAME_CONFIG.GAME_HEIGHT / 2,
                GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT,
                0xffffff, 0.7
            ).setDepth(93);

            // Camera shake
            this.cameras.main.shake(500, 0.02);

            // Massive explosion at impact point
            if (!this.textures.exists('orbital-particle')) {
                const gfx = this.make.graphics({ x: 0, y: 0, add: false });
                gfx.fillStyle(0xffffff, 1);
                gfx.fillCircle(6, 6, 6);
                gfx.generateTexture('orbital-particle', 12, 12);
                gfx.destroy();
            }

            const explosion = this.add.particles(beamX, targetY, 'orbital-particle', {
                speed: { min: 200, max: 700 },
                angle: { min: 0, max: 360 },
                scale: { start: 3, end: 0 },
                alpha: { start: 1, end: 0 },
                lifespan: 1200,
                quantity: 80,
                tint: [0x00ccff, 0x0066ff, 0xffffff, 0x00ffff, 0xff4400],
                blendMode: 'ADD',
                emitting: false
            }).setDepth(97);
            explosion.explode(80);

            // Disable red car
            this.redCar.setVisible(false);
            this.redCar.body.setEnable(false);
            this.redCar.body.setVelocity(0, 0);
            this.redCarDisabled = true;
            this.redCarRespawnTimer = 5000;

            // Blast the ball away from impact
            const ballDx = this.ball.x - beamX;
            this.ball.body.setVelocity(ballDx > 0 ? 500 : -500, -400);

            // Blast player car away too
            const playerDx = this.playerCar.x - beamX;
            this.playerCar.body.setVelocity(playerDx > 0 ? 400 : -400, -300);

            // Fade out beam
            this.tweens.add({
                targets: [beam, innerBeam, outerBeam],
                alpha: 0,
                duration: 400,
                onComplete: () => {
                    beam.destroy();
                    innerBeam.destroy();
                    outerBeam.destroy();
                }
            });

            this.tweens.add({
                targets: flash,
                alpha: 0,
                duration: 600,
                onComplete: () => {
                    flash.destroy();
                    this.orbitalActive = false;
                }
            });

            this.time.delayedCall(1500, () => {
                if (explosion && explosion.active) explosion.destroy();
            });
        });
    }

    // --- Hollow Purple (V key) - Jujutsu Kaisen ---

    launchHollowPurple() {
        if (this.hollowPurpleActive || this.redCarDisabled) return;
        this.hollowPurpleActive = true;

        // Pause the game physics for the full cutscene
        this.physics.pause();
        if (this.matchTimer) this.matchTimer.pause();

        const centerX = GAME_CONFIG.GAME_WIDTH / 2;
        const centerY = GAME_CONFIG.GAME_HEIGHT / 2;

        // Ensure particle texture
        if (!this.textures.exists('jjk-particle')) {
            const gfx = this.make.graphics({ x: 0, y: 0, add: false });
            gfx.fillStyle(0xffffff, 1);
            gfx.fillCircle(5, 5, 5);
            gfx.generateTexture('jjk-particle', 10, 10);
            gfx.destroy();
        }

        // === FULL SCREEN BLACKOUT ===
        const blackout = this.add.rectangle(
            centerX, centerY,
            GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT,
            0x000000, 0
        ).setDepth(85);
        this.tweens.add({
            targets: blackout,
            alpha: 0.8,
            duration: 600,
            ease: 'Power2'
        });

        // Cinematic letterbox bars
        const topBar = this.add.rectangle(centerX, 0, GAME_CONFIG.GAME_WIDTH, 60, 0x000000, 1)
            .setOrigin(0.5, 0).setDepth(110).setAlpha(0);
        const botBar = this.add.rectangle(centerX, GAME_CONFIG.GAME_HEIGHT, GAME_CONFIG.GAME_WIDTH, 60, 0x000000, 1)
            .setOrigin(0.5, 1).setDepth(110).setAlpha(0);
        this.tweens.add({ targets: [topBar, botBar], alpha: 1, duration: 400 });

        // === PHASE 1: BLUE (Attraction) - 1.5s ===
        this.time.delayedCall(600, () => {
            // Title text
            const titleText = this.add.text(centerX, 80, 'Cursed Technique Lapse:', {
                fontSize: '22px', fill: '#4488ff', fontFamily: 'Arial', fontStyle: 'bold',
                stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5).setDepth(120).setAlpha(0);
            this.tweens.add({ targets: titleText, alpha: 1, duration: 300 });

            const blueLabel = this.add.text(centerX, 115, 'BLUE', {
                fontSize: '48px', fill: '#0066ff', fontFamily: 'Arial', fontStyle: 'bold',
                stroke: '#000000', strokeThickness: 6
            }).setOrigin(0.5).setDepth(120).setAlpha(0);
            this.tweens.add({ targets: blueLabel, alpha: 1, duration: 300, delay: 200 });

            // Giant blue orb at left-center
            const blueX = centerX - 180;
            const blueOrb = this.add.circle(blueX, centerY, 50, 0x0044ff, 0.95).setDepth(100);
            const blueGlow1 = this.add.circle(blueX, centerY, 80, 0x0066ff, 0.4).setDepth(99);
            const blueGlow2 = this.add.circle(blueX, centerY, 120, 0x0088ff, 0.15).setDepth(98);

            // Scale in dramatically
            [blueOrb, blueGlow1, blueGlow2].forEach(o => o.setScale(0));
            this.tweens.add({
                targets: [blueOrb, blueGlow1, blueGlow2],
                scaleX: 1, scaleY: 1,
                duration: 500,
                ease: 'Back.easeOut'
            });

            // Blue swirling particles (sucking inward)
            const blueEmitter = this.add.particles(blueX, centerY, 'jjk-particle', {
                speed: { min: 100, max: 250 },
                scale: { start: 1.5, end: 0 },
                alpha: { start: 0.9, end: 0 },
                lifespan: 600,
                frequency: 15,
                tint: [0x0044ff, 0x0088ff, 0x00aaff, 0x0066ff],
                blendMode: 'ADD',
                emitting: true
            }).setDepth(99);

            // Pulsing
            this.tweens.add({
                targets: [blueOrb, blueGlow1, blueGlow2],
                scaleX: 1.2, scaleY: 1.2,
                duration: 400,
                yoyo: true,
                repeat: -1
            });

            this.cameras.main.shake(300, 0.005);

            // === PHASE 2: RED (Repulsion) - after 1.5s ===
            this.time.delayedCall(1500, () => {
                titleText.setText('Cursed Technique Reversal:');
                titleText.setFill('#ff4444');
                blueLabel.setText('RED');
                blueLabel.setFill('#ff0000');

                // Giant red orb at right-center
                const redX = centerX + 180;
                const redOrb = this.add.circle(redX, centerY, 50, 0xff0000, 0.95).setDepth(100);
                const redGlow1 = this.add.circle(redX, centerY, 80, 0xff2200, 0.4).setDepth(99);
                const redGlow2 = this.add.circle(redX, centerY, 120, 0xff4400, 0.15).setDepth(98);

                [redOrb, redGlow1, redGlow2].forEach(o => o.setScale(0));
                this.tweens.add({
                    targets: [redOrb, redGlow1, redGlow2],
                    scaleX: 1, scaleY: 1,
                    duration: 500,
                    ease: 'Back.easeOut'
                });

                // Red bursting particles
                const redEmitter = this.add.particles(redX, centerY, 'jjk-particle', {
                    speed: { min: 120, max: 300 },
                    scale: { start: 1.5, end: 0 },
                    alpha: { start: 0.9, end: 0 },
                    lifespan: 600,
                    frequency: 15,
                    tint: [0xff0000, 0xff4400, 0xff2200, 0xff6600],
                    blendMode: 'ADD',
                    emitting: true
                }).setDepth(99);

                this.tweens.add({
                    targets: [redOrb, redGlow1, redGlow2],
                    scaleX: 1.2, scaleY: 1.2,
                    duration: 400,
                    yoyo: true,
                    repeat: -1
                });

                this.cameras.main.shake(300, 0.008);

                // === PHASE 3: MERGE - after 1.5s ===
                this.time.delayedCall(1500, () => {
                    titleText.setText('Imaginary Technique:');
                    titleText.setFill('#cc66ff');
                    blueLabel.setText('HOLLOW PURPLE');
                    blueLabel.setFill('#9900ff');
                    blueLabel.setFontSize('56px');

                    // Flash text
                    this.tweens.add({
                        targets: blueLabel,
                        alpha: 0.3, duration: 150, yoyo: true, repeat: 3
                    });

                    // Slam both orbs to center
                    this.tweens.add({
                        targets: [blueOrb, blueGlow1, blueGlow2],
                        x: centerX, duration: 600, ease: 'Power3'
                    });
                    this.tweens.add({
                        targets: [redOrb, redGlow1, redGlow2],
                        x: centerX, duration: 600, ease: 'Power3',
                        onComplete: () => {
                            // Destroy individual orbs
                            blueOrb.destroy(); blueGlow1.destroy(); blueGlow2.destroy();
                            redOrb.destroy(); redGlow1.destroy(); redGlow2.destroy();
                            blueEmitter.destroy(); redEmitter.destroy();

                            // MASSIVE merge explosion flash
                            const mergeFlash = this.add.rectangle(
                                centerX, centerY,
                                GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT,
                                0xffffff, 0.9
                            ).setDepth(105);
                            this.tweens.add({
                                targets: mergeFlash, alpha: 0, duration: 800,
                                onComplete: () => mergeFlash.destroy()
                            });

                            this.cameras.main.shake(500, 0.03);

                            // Merge explosion particles
                            const mergeExplosion = this.add.particles(centerX, centerY, 'jjk-particle', {
                                speed: { min: 200, max: 600 },
                                angle: { min: 0, max: 360 },
                                scale: { start: 3, end: 0 },
                                alpha: { start: 1, end: 0 },
                                lifespan: 1000,
                                quantity: 80,
                                tint: [0x7700cc, 0x9900ff, 0x0044ff, 0xff0000, 0xffffff],
                                blendMode: 'ADD',
                                emitting: false
                            }).setDepth(102);
                            mergeExplosion.explode(80);

                            // Create HUGE purple sphere
                            const purpleOrb = this.add.circle(centerX, centerY, 70, 0x7700cc, 0.95).setDepth(100);
                            const pGlow1 = this.add.circle(centerX, centerY, 110, 0x9900ff, 0.5).setDepth(99);
                            const pGlow2 = this.add.circle(centerX, centerY, 160, 0xaa44ff, 0.25).setDepth(98);
                            const pGlow3 = this.add.circle(centerX, centerY, 200, 0xcc66ff, 0.1).setDepth(97);

                            // Purple aura particles
                            const purpleEmitter = this.add.particles(centerX, centerY, 'jjk-particle', {
                                speed: { min: 50, max: 180 },
                                scale: { start: 2.5, end: 0 },
                                alpha: { start: 1, end: 0 },
                                lifespan: 800,
                                frequency: 5,
                                tint: [0x7700cc, 0x9900ff, 0xaa44ff, 0xcc66ff, 0x5500aa],
                                blendMode: 'ADD',
                                emitting: true
                            }).setDepth(99);

                            // Ominous pulse
                            this.tweens.add({
                                targets: [purpleOrb, pGlow1, pGlow2, pGlow3],
                                scaleX: 1.15, scaleY: 1.15,
                                duration: 300,
                                yoyo: true,
                                repeat: -1
                            });

                            // === PHASE 4: CUTSCENE - Ball grab and slam ===
                            this.time.delayedCall(1000, () => {
                                titleText.destroy();
                                blueLabel.destroy();
                                this.time.delayedCall(200, () => {
                                    if (mergeExplosion && mergeExplosion.active) mergeExplosion.destroy();
                                });

                                // Teleport ball to center (inside the purple orb)
                                this.ball.setPosition(centerX, centerY);
                                this.ball.body.setVelocity(0, 0);
                                this.ball.setDepth(101);

                                // Ball gets engulfed - purple tint effect
                                this.tweens.add({
                                    targets: this.ball,
                                    alpha: 0.5, duration: 200, yoyo: true, repeat: 2
                                });

                                // Disable red car
                                this.redCar.setVisible(false);
                                this.redCar.body.setEnable(false);
                                this.redCar.body.setVelocity(0, 0);
                                this.redCarDisabled = true;
                                this.redCarRespawnTimer = 5000;

                                // Target: red goal center
                                const mc = this.mapConfig;
                                const redGoalX = GAME_CONFIG.GAME_WIDTH - mc.wallThickness + mc.goalWidth / 2;
                                const goalTop = GAME_CONFIG.GAME_HEIGHT - mc.wallThickness - mc.goalHeight;
                                const goalCenterY = goalTop + mc.goalHeight / 2;

                                // After 800ms, FIRE everything at the goal
                                this.time.delayedCall(800, () => {
                                    // Resume physics so the ball can score
                                    this.physics.resume();

                                    // Launch ball at the red goal at insane speed
                                    const bDx = redGoalX - this.ball.x;
                                    const bDy = goalCenterY - this.ball.y;
                                    const bDist = Math.sqrt(bDx * bDx + bDy * bDy) || 1;
                                    this.ball.body.setVelocity((bDx / bDist) * 1500, (bDy / bDist) * 1500);
                                    this.ball.setDepth(10);

                                    // Fire the purple orb along with the ball
                                    const fireSpeed = 1500;
                                    this.tweens.add({
                                        targets: [purpleOrb, pGlow1, pGlow2, pGlow3],
                                        x: redGoalX, y: goalCenterY,
                                        duration: 400,
                                        ease: 'Power2',
                                        onUpdate: () => {
                                            purpleEmitter.setPosition(purpleOrb.x, purpleOrb.y);
                                        },
                                        onComplete: () => {
                                            // GOAL IMPACT EXPLOSION
                                            const goalExplosion = this.add.particles(redGoalX, goalCenterY, 'jjk-particle', {
                                                speed: { min: 300, max: 900 },
                                                angle: { min: 0, max: 360 },
                                                scale: { start: 4, end: 0 },
                                                alpha: { start: 1, end: 0 },
                                                lifespan: 1500,
                                                quantity: 120,
                                                tint: [0x7700cc, 0x9900ff, 0xaa44ff, 0xffffff, 0x000000],
                                                blendMode: 'ADD',
                                                emitting: false
                                            }).setDepth(95);
                                            goalExplosion.explode(120);

                                            // Expanding void rings at goal
                                            for (let r = 0; r < 3; r++) {
                                                const ring = this.add.graphics().setDepth(94);
                                                const ringData = { radius: 10, alpha: 1 };
                                                this.time.delayedCall(r * 150, () => {
                                                    this.tweens.add({
                                                        targets: ringData,
                                                        radius: 180 + r * 40,
                                                        alpha: 0,
                                                        duration: 700,
                                                        ease: 'Power2',
                                                        onUpdate: () => {
                                                            ring.clear();
                                                            ring.lineStyle(4 - r, 0x9900ff, ringData.alpha);
                                                            ring.strokeCircle(redGoalX, goalCenterY, ringData.radius);
                                                        },
                                                        onComplete: () => ring.destroy()
                                                    });
                                                });
                                            }

                                            // Giant screen flash
                                            const impactFlash = this.add.rectangle(
                                                centerX, centerY,
                                                GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT,
                                                0x9900ff, 0.7
                                            ).setDepth(93);
                                            this.tweens.add({
                                                targets: impactFlash, alpha: 0, duration: 1200,
                                                onComplete: () => impactFlash.destroy()
                                            });

                                            this.cameras.main.shake(800, 0.04);

                                            // Clean up purple orb
                                            purpleOrb.destroy(); pGlow1.destroy();
                                            pGlow2.destroy(); pGlow3.destroy();
                                            purpleEmitter.destroy();

                                            // Blast player car away
                                            this.playerCar.body.setVelocity(-400, -300);

                                            // Clean up cutscene elements
                                            this.tweens.add({
                                                targets: [blackout, topBar, botBar],
                                                alpha: 0,
                                                duration: 800,
                                                onComplete: () => {
                                                    blackout.destroy();
                                                    topBar.destroy();
                                                    botBar.destroy();
                                                }
                                            });

                                            if (this.matchTimer) this.matchTimer.resume();
                                            this.time.delayedCall(2000, () => {
                                                if (goalExplosion && goalExplosion.active) goalExplosion.destroy();
                                                this.hollowPurpleActive = false;
                                            });
                                        }
                                    });
                                });
                            });
                        }
                    });
                });
            });
        });
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

        // Orbital strike
        if (Phaser.Input.Keyboard.JustDown(this.xKey) && !this.orbitalActive && !this.redCarDisabled) {
            this.launchOrbitalStrike();
        }

        // Hollow Purple
        if (Phaser.Input.Keyboard.JustDown(this.vKey) && !this.hollowPurpleActive && !this.redCarDisabled) {
            this.launchHollowPurple();
        }
        if (this.redCarDisabled) {
            this.redCarRespawnTimer -= delta;
            if (this.redCarRespawnTimer <= 0) {
                this.respawnRedCar();
            }
        }
    }
}
