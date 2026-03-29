import GAME_CONFIG from '../config/gameConfig.js';
import Car from './Car.js';

export default class AICar extends Car {
    constructor(scene, x, y, difficulty, targetHeight, wallThickness, textureKey) {
        super(scene, x, y, textureKey ?? 'red-car', false, targetHeight); // faces left

        this.difficulty = difficulty;
        this.aiConfig = GAME_CONFIG.AI[difficulty];
        this.body.setMaxVelocity(this.aiConfig.maxSpeed, 1000);
        this.wallThickness = wallThickness ?? GAME_CONFIG.WALL_THICKNESS;

        this.lastDecisionTime = 0;
        this.targetX = x;
        this.shouldJump = false;
    }

    update(ball, time) {
        // Only update decisions at the reaction delay interval
        if (time - this.lastDecisionTime > this.aiConfig.reactionDelay) {
            this.lastDecisionTime = time;
            this.makeDecision(ball);
        }

        this.executeDecision();
    }

    makeDecision(ball) {
        // Random mistake chance
        if (Math.random() < this.aiConfig.mistakeChance) {
            this.targetX = this.x + (Math.random() - 0.5) * 200;
            this.shouldJump = false;
            return;
        }

        const goalX = GAME_CONFIG.GAME_WIDTH - this.wallThickness - 30;
        const myGoalX = GAME_CONFIG.GAME_WIDTH - this.wallThickness;

        let ballTargetX = ball.x;
        let ballTargetY = ball.y;

        // Hard AI predicts ball position
        if (this.aiConfig.predictionEnabled) {
            const predTime = 0.4;
            ballTargetX = ball.x + ball.body.velocity.x * predTime;
            ballTargetY = ball.y + ball.body.velocity.y * predTime + 0.5 * GAME_CONFIG.GRAVITY_Y * predTime * predTime;
        }

        const ballOnMySide = ballTargetX > GAME_CONFIG.GAME_WIDTH / 2;
        const ballMovingToMe = ball.body.velocity.x > 0;

        if (ballOnMySide && ballMovingToMe) {
            // DEFEND: position between ball and goal
            const defenseX = ballTargetX + (myGoalX - ballTargetX) * (1 - this.aiConfig.positioningSkill) * 0.5;
            this.targetX = Math.min(defenseX, myGoalX - 60);
        } else if (ballOnMySide) {
            // ATTACK: chase ball and push it toward opponent's goal
            this.targetX = ballTargetX + 30; // approach from the right side to push left
        } else {
            // Ball on opponent's side
            if (this.aiConfig.positioningSkill > 0.5) {
                // Better AI pushes up cautiously
                this.targetX = GAME_CONFIG.GAME_WIDTH * 0.6;
            } else {
                // Weaker AI retreats to defense
                this.targetX = GAME_CONFIG.GAME_WIDTH * 0.75;
            }
        }

        // Jump decision
        const horizontalDist = Math.abs(this.x - ballTargetX);
        const ballAboveGround = ballTargetY < GAME_CONFIG.GAME_HEIGHT - this.wallThickness - 80;

        if (horizontalDist < 100 && ballAboveGround && Math.random() < this.aiConfig.jumpAccuracy) {
            this.shouldJump = true;
        } else {
            this.shouldJump = false;
        }
    }

    executeDecision() {
        const accel = this.carAcceleration ?? GAME_CONFIG.CAR_ACCELERATION;
        const dx = this.targetX - this.x;
        const deadzone = 15;

        if (Math.abs(dx) > deadzone) {
            this.body.setAccelerationX(dx > 0 ? accel : -accel);
        } else {
            this.body.setAccelerationX(0);
        }

        if (this.shouldJump && this.isOnGround()) {
            this.body.setVelocityY(GAME_CONFIG.CAR_JUMP_VELOCITY);
            this.shouldJump = false;
        }
    }
}
