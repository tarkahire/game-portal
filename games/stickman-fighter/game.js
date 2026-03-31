const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ── Constants ──
const GROUND_Y_RATIO = 0.85;
const GRAVITY = 0.6;
const MOVE_SPEED = 5;
const JUMP_FORCE = -14;
const MAX_HEALTH = 100;
const ROUND_TIME = 60;
const ROUNDS_TO_WIN = 2;

const ATTACKS = {
    punch: { damage: 8, range: 55, duration: 12, cooldown: 20, knockback: 4, hitFrame: 6 },
    kick:  { damage: 12, range: 65, duration: 18, cooldown: 30, knockback: 7, hitFrame: 10 },
};

// ── State ──
let groundY, gameState, timer, timerInterval;
let p1Wins = 0, p2Wins = 0, currentRound = 1;

const keys = {};

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    groundY = canvas.height * GROUND_Y_RATIO;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ── Fighter Class ──
class Fighter {
    constructor(x, color, facing) {
        this.spawnX = x;
        this.color = color;
        this.facing = facing;
        this.reset();
    }

    reset() {
        this.x = this.spawnX;
        this.y = groundY;
        this.vx = 0;
        this.vy = 0;
        this.health = MAX_HEALTH;
        this.width = 40;
        this.height = 100;
        this.onGround = true;
        this.attacking = false;
        this.attackType = null;
        this.attackTimer = 0;
        this.cooldown = 0;
        this.blocking = false;
        this.hit = false;
        this.hitTimer = 0;
        this.hasHitThisAttack = false;
        // Animation
        this.walkFrame = 0;
        this.walkTimer = 0;
    }

    update(opponent) {
        // Face opponent
        this.facing = this.x < opponent.x ? 1 : -1;

        // Hit stun
        if (this.hitTimer > 0) {
            this.hitTimer--;
            this.hit = this.hitTimer > 0;
        }

        // Cooldown
        if (this.cooldown > 0) this.cooldown--;

        // Attack
        if (this.attacking) {
            this.attackTimer++;
            const atk = ATTACKS[this.attackType];

            if (this.attackTimer === atk.hitFrame && !this.hasHitThisAttack) {
                this.checkHit(opponent, atk);
            }

            if (this.attackTimer >= atk.duration) {
                this.attacking = false;
                this.attackType = null;
                this.attackTimer = 0;
            }
        }

        // Physics
        if (!this.hit) {
            this.x += this.vx;
        }
        this.vy += GRAVITY;
        this.y += this.vy;

        if (this.y >= groundY) {
            this.y = groundY;
            this.vy = 0;
            this.onGround = true;
        }

        // Boundaries
        this.x = Math.max(this.width / 2, Math.min(canvas.width - this.width / 2, this.x));

        // Walk animation
        if (Math.abs(this.vx) > 0 && this.onGround) {
            this.walkTimer++;
            if (this.walkTimer > 8) {
                this.walkTimer = 0;
                this.walkFrame = (this.walkFrame + 1) % 4;
            }
        } else if (this.onGround) {
            this.walkFrame = 0;
        }
    }

    startAttack(type) {
        if (this.attacking || this.cooldown > 0 || this.blocking || this.hit) return;
        this.attacking = true;
        this.attackType = type;
        this.attackTimer = 0;
        this.hasHitThisAttack = false;
        this.cooldown = ATTACKS[type].cooldown;
    }

    checkHit(opponent, atk) {
        const attackX = this.x + this.facing * 30;
        const dist = Math.abs(attackX - opponent.x);
        const yDist = Math.abs((this.y - this.height / 2) - (opponent.y - opponent.height / 2));

        if (dist < atk.range && yDist < 80) {
            let damage = atk.damage;
            let kb = atk.knockback;
            if (opponent.blocking) {
                damage = Math.floor(damage * 0.2);
                kb *= 0.3;
            }
            opponent.health = Math.max(0, opponent.health - damage);
            opponent.hitTimer = 10;
            opponent.hit = true;
            opponent.x += this.facing * kb;
            this.hasHitThisAttack = true;

            spawnHitParticles(opponent.x, this.y - this.height * 0.6);
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        const scale = this.facing;
        ctx.scale(scale, 1);

        const opacity = this.hit ? 0.5 + Math.sin(Date.now() * 0.05) * 0.3 : 1;
        ctx.globalAlpha = opacity;

        const headY = -this.height;
        const bodyTopY = -this.height + 25;
        const bodyBottomY = -this.height * 0.4;
        const headRadius = 14;

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Head
        ctx.beginPath();
        ctx.arc(0, headY, headRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Body
        ctx.beginPath();
        ctx.moveTo(0, bodyTopY);
        ctx.lineTo(0, bodyBottomY);
        ctx.stroke();

        // Arms
        const armY = bodyTopY + 10;
        if (this.attacking) {
            const progress = this.attackTimer / ATTACKS[this.attackType].duration;
            const swing = Math.sin(progress * Math.PI);
            if (this.attackType === 'punch') {
                // Punching arm extended forward
                ctx.beginPath();
                ctx.moveTo(0, armY);
                ctx.lineTo(20 + swing * 30, armY - swing * 5);
                ctx.stroke();
                // Other arm
                ctx.beginPath();
                ctx.moveTo(0, armY);
                ctx.lineTo(-15, armY + 20);
                ctx.stroke();
            } else {
                // Both arms back for kick balance
                ctx.beginPath();
                ctx.moveTo(0, armY);
                ctx.lineTo(-10, armY + 15);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, armY);
                ctx.lineTo(-20, armY + 10);
                ctx.stroke();
            }
        } else if (this.blocking) {
            // Guard pose
            ctx.beginPath();
            ctx.moveTo(0, armY);
            ctx.lineTo(15, armY - 15);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, armY);
            ctx.lineTo(15, armY + 5);
            ctx.stroke();
        } else {
            // Idle / walk arms
            const armSwing = this.onGround ? Math.sin(this.walkFrame * Math.PI / 2) * 10 : 5;
            ctx.beginPath();
            ctx.moveTo(0, armY);
            ctx.lineTo(15 + armSwing, armY + 20);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, armY);
            ctx.lineTo(15 - armSwing, armY + 20);
            ctx.stroke();
        }

        // Legs
        const legTopY = bodyBottomY;
        if (this.attacking && this.attackType === 'kick') {
            const progress = this.attackTimer / ATTACKS[this.attackType].duration;
            const swing = Math.sin(progress * Math.PI);
            // Kicking leg
            ctx.beginPath();
            ctx.moveTo(0, legTopY);
            ctx.lineTo(20 + swing * 30, legTopY + 20 - swing * 15);
            ctx.stroke();
            // Standing leg
            ctx.beginPath();
            ctx.moveTo(0, legTopY);
            ctx.lineTo(-8, 0);
            ctx.stroke();
        } else if (!this.onGround) {
            // Airborne
            ctx.beginPath();
            ctx.moveTo(0, legTopY);
            ctx.lineTo(10, legTopY + 20);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, legTopY);
            ctx.lineTo(-10, legTopY + 20);
            ctx.stroke();
        } else {
            const legSwing = Math.sin(this.walkFrame * Math.PI / 2) * 12;
            ctx.beginPath();
            ctx.moveTo(0, legTopY);
            ctx.lineTo(8 + legSwing, 0);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, legTopY);
            ctx.lineTo(8 - legSwing, 0);
            ctx.stroke();
        }

        // Block shield effect
        if (this.blocking) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(10, -this.height * 0.5, 25, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// ── Particles ──
const particles = [];

function spawnHitParticles(x, y) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 20 + Math.random() * 10,
            maxLife: 30,
            color: `hsl(${30 + Math.random() * 30}, 100%, ${50 + Math.random() * 30}%)`,
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    for (const p of particles) {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    }
    ctx.globalAlpha = 1;
}

// ── Players ──
const player1 = new Fighter(0, '#e74c3c', 1);
const player2 = new Fighter(0, '#3498db', -1);

function resetPositions() {
    player1.spawnX = canvas.width * 0.3;
    player2.spawnX = canvas.width * 0.7;
    player1.reset();
    player2.reset();
}

// ── Input ──
window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    e.preventDefault();
});

window.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = true;
    keys[e.key.toLowerCase()] = false;
    e.preventDefault();
});

function handleInput() {
    // Player 1: WASD + F/G
    player1.vx = 0;
    player1.blocking = false;
    if (!player1.hit && !player1.attacking) {
        if (keys['a']) player1.vx = -MOVE_SPEED;
        if (keys['d']) player1.vx = MOVE_SPEED;
        if (keys['s']) player1.blocking = true;
    }
    if (keys['w'] && player1.onGround && !player1.blocking) {
        player1.vy = JUMP_FORCE;
        player1.onGround = false;
    }
    if (keys['f']) player1.startAttack('punch');
    if (keys['g']) player1.startAttack('kick');

    // Player 2: Arrows + . /
    player2.vx = 0;
    player2.blocking = false;
    if (!player2.hit && !player2.attacking) {
        if (keys['arrowleft']) player2.vx = -MOVE_SPEED;
        if (keys['arrowright']) player2.vx = MOVE_SPEED;
        if (keys['arrowdown']) player2.blocking = true;
    }
    if (keys['arrowup'] && player2.onGround && !player2.blocking) {
        player2.vy = JUMP_FORCE;
        player2.onGround = false;
    }
    if (keys['.']) player2.startAttack('punch');
    if (keys['/']) player2.startAttack('kick');
}

// ── Drawing ──
function drawBackground() {
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(1, '#16213e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ground
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

    // Ground line
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#3498db';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function updateUI() {
    document.getElementById('p1-health').style.width = (player1.health / MAX_HEALTH * 100) + '%';
    document.getElementById('p2-health').style.width = (player2.health / MAX_HEALTH * 100) + '%';
    document.getElementById('round-info').textContent = `Round ${currentRound}  |  ${p1Wins} - ${p2Wins}`;
}

// ── Round / Game Logic ──
function startTimer() {
    timer = ROUND_TIME;
    document.getElementById('timer').textContent = timer;
    timerInterval = setInterval(() => {
        timer--;
        document.getElementById('timer').textContent = timer;
        if (timer <= 0) {
            clearInterval(timerInterval);
            endRound();
        }
    }, 1000);
}

function endRound() {
    clearInterval(timerInterval);

    if (player1.health > player2.health) {
        p1Wins++;
    } else if (player2.health > player1.health) {
        p2Wins++;
    }
    // Draw gives no point

    if (p1Wins >= ROUNDS_TO_WIN) {
        endGame('Player 1 Wins!');
    } else if (p2Wins >= ROUNDS_TO_WIN) {
        endGame('Player 2 Wins!');
    } else {
        currentRound++;
        resetPositions();
        startTimer();
    }
}

function endGame(text) {
    gameState = 'result';
    document.getElementById('result-text').textContent = text;
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('ui-overlay').style.display = 'none';
}

function checkRoundEnd() {
    if (player1.health <= 0) {
        p2Wins++;
        if (p2Wins >= ROUNDS_TO_WIN) {
            endGame('Player 2 Wins!');
        } else {
            currentRound++;
            resetPositions();
            clearInterval(timerInterval);
            startTimer();
        }
    } else if (player2.health <= 0) {
        p1Wins++;
        if (p1Wins >= ROUNDS_TO_WIN) {
            endGame('Player 1 Wins!');
        } else {
            currentRound++;
            resetPositions();
            clearInterval(timerInterval);
            startTimer();
        }
    }
}

// ── Game Loop ──
function gameLoop() {
    requestAnimationFrame(gameLoop);

    drawBackground();

    if (gameState !== 'playing') return;

    handleInput();
    player1.update(player2);
    player2.update(player1);
    updateParticles();

    player1.draw();
    player2.draw();
    drawParticles();

    updateUI();
    checkRoundEnd();
}

// ── Start / Restart ──
function startGame() {
    gameState = 'playing';
    p1Wins = 0;
    p2Wins = 0;
    currentRound = 1;
    particles.length = 0;
    resetPositions();
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('ui-overlay').style.display = 'block';
    startTimer();
}

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('rematch-btn').addEventListener('click', startGame);

gameState = 'menu';
gameLoop();
