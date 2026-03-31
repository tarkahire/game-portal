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

// ── Hollow Purple ──
const HOLLOW_PURPLE_SPEED = 8;
const HOLLOW_PURPLE_RADIUS = 18;
const HOLLOW_PURPLE_COOLDOWN = 300; // ~5 seconds at 60fps

// ── State ──
let groundY, gameState, timer, timerInterval;
let p1Wins = 0, p2Wins = 0, currentRound = 1;
let aiMode = false;

const keys = {};
const hollowPurpleProjectiles = [];

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
        this.hollowPurpleCooldown = 0;
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
        if (this.hollowPurpleCooldown > 0) this.hollowPurpleCooldown--;

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

    fireHollowPurple(opponent) {
        if (this.hollowPurpleCooldown > 0 || this.attacking || this.hit) return;
        this.hollowPurpleCooldown = HOLLOW_PURPLE_COOLDOWN;
        const dir = this.x < opponent.x ? 1 : -1;
        hollowPurpleProjectiles.push({
            x: this.x + dir * 30,
            y: this.y - this.height * 0.55,
            vx: dir * HOLLOW_PURPLE_SPEED,
            radius: HOLLOW_PURPLE_RADIUS,
            owner: this,
            target: opponent,
            life: 180,
            trail: [],
        });
    }
}

// ── Hollow Purple Projectile System ──
function updateHollowPurple() {
    for (let i = hollowPurpleProjectiles.length - 1; i >= 0; i--) {
        const hp = hollowPurpleProjectiles[i];
        hp.x += hp.vx;
        hp.life--;

        // Trail
        hp.trail.push({ x: hp.x, y: hp.y, alpha: 1 });
        if (hp.trail.length > 20) hp.trail.shift();
        for (const t of hp.trail) t.alpha *= 0.9;

        // Hit detection against target
        const dx = hp.x - hp.target.x;
        const dy = hp.y - (hp.target.y - hp.target.height * 0.5);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < hp.radius + 30) {
            // 50% of max health damage, blocking only reduces by 20%
            let damage = MAX_HEALTH * 0.5;
            if (hp.target.blocking) {
                damage = Math.floor(damage * 0.8);
            }
            hp.target.health = Math.max(0, hp.target.health - damage);
            hp.target.hitTimer = 20;
            hp.target.hit = true;
            hp.target.x += hp.vx > 0 ? 20 : -20;

            // Big purple explosion
            spawnHollowPurpleExplosion(hp.x, hp.y);
            hollowPurpleProjectiles.splice(i, 1);
            continue;
        }

        // Remove if off screen or expired
        if (hp.life <= 0 || hp.x < -50 || hp.x > canvas.width + 50) {
            hollowPurpleProjectiles.splice(i, 1);
        }
    }
}

function drawHollowPurple() {
    for (const hp of hollowPurpleProjectiles) {
        // Trail
        for (const t of hp.trail) {
            ctx.globalAlpha = t.alpha * 0.4;
            ctx.fillStyle = '#8e44ad';
            ctx.beginPath();
            ctx.arc(t.x, t.y, hp.radius * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;

        // Outer glow
        const glowGrad = ctx.createRadialGradient(hp.x, hp.y, 0, hp.x, hp.y, hp.radius * 2.5);
        glowGrad.addColorStop(0, 'rgba(142, 68, 173, 0.4)');
        glowGrad.addColorStop(0.5, 'rgba(100, 30, 150, 0.15)');
        glowGrad.addColorStop(1, 'rgba(100, 30, 150, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(hp.x, hp.y, hp.radius * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Core ball — red + blue merging into purple
        const coreGrad = ctx.createRadialGradient(hp.x - 4, hp.y, 2, hp.x, hp.y, hp.radius);
        coreGrad.addColorStop(0, '#fff');
        coreGrad.addColorStop(0.2, '#d580ff');
        coreGrad.addColorStop(0.5, '#8e44ad');
        coreGrad.addColorStop(0.8, '#6c3483');
        coreGrad.addColorStop(1, 'rgba(108, 52, 131, 0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(hp.x, hp.y, hp.radius, 0, Math.PI * 2);
        ctx.fill();

        // Flickering energy ring
        ctx.strokeStyle = `rgba(200, 150, 255, ${0.5 + Math.sin(Date.now() * 0.02) * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hp.x, hp.y, hp.radius + 3 + Math.sin(Date.now() * 0.03) * 2, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

function spawnHollowPurpleExplosion(x, y) {
    for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 8;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 25 + Math.random() * 20,
            maxLife: 45,
            color: `hsl(${270 + Math.random() * 40}, 80%, ${40 + Math.random() * 40}%)`,
        });
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
    hollowPurpleProjectiles.length = 0;
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
    if (keys['r']) { player2.fireHollowPurple(player1); keys['r'] = false; }
}

// ── AI ──
let aiActionTimer = 0;
let aiAction = 'idle';

function handleAI() {
    if (!aiMode) return;

    const dist = Math.abs(player2.x - player1.x);
    const facingPlayer = (player2.x > player1.x) ? -1 : 1;

    // Reset P2 movement each frame
    player2.vx = 0;
    player2.blocking = false;

    aiActionTimer--;
    if (aiActionTimer <= 0) {
        // Decide next action based on distance
        const roll = Math.random();
        if (dist > 200) {
            // Far away — approach or use Hollow Purple
            if (roll < 0.15 && player2.hollowPurpleCooldown <= 0) {
                aiAction = 'hollowPurple';
                aiActionTimer = 30;
            } else {
                aiAction = 'approach';
                aiActionTimer = 20 + Math.random() * 30;
            }
        } else if (dist > 60) {
            // Medium range — approach, attack, or block
            if (roll < 0.4) {
                aiAction = 'approach';
                aiActionTimer = 10 + Math.random() * 15;
            } else if (roll < 0.7) {
                aiAction = 'attack';
                aiActionTimer = 15;
            } else if (roll < 0.85) {
                aiAction = 'block';
                aiActionTimer = 20 + Math.random() * 20;
            } else {
                aiAction = 'jump';
                aiActionTimer = 10;
            }
        } else {
            // Close range — attack, block, or retreat
            if (roll < 0.5) {
                aiAction = 'attack';
                aiActionTimer = 10;
            } else if (roll < 0.75) {
                aiAction = 'block';
                aiActionTimer = 15 + Math.random() * 15;
            } else {
                aiAction = 'retreat';
                aiActionTimer = 15 + Math.random() * 10;
            }
        }
    }

    // Execute current action
    if (player2.hit) return;

    switch (aiAction) {
        case 'approach':
            if (!player2.attacking) {
                player2.vx = facingPlayer * MOVE_SPEED;
            }
            break;
        case 'retreat':
            if (!player2.attacking) {
                player2.vx = -facingPlayer * MOVE_SPEED;
            }
            break;
        case 'attack':
            if (dist < 80) {
                if (Math.random() < 0.5) {
                    player2.startAttack('punch');
                } else {
                    player2.startAttack('kick');
                }
            } else {
                player2.vx = facingPlayer * MOVE_SPEED;
            }
            break;
        case 'block':
            player2.blocking = true;
            break;
        case 'jump':
            if (player2.onGround) {
                player2.vy = JUMP_FORCE;
                player2.onGround = false;
            }
            player2.vx = facingPlayer * MOVE_SPEED;
            break;
        case 'hollowPurple':
            player2.fireHollowPurple(player1);
            aiAction = 'idle';
            break;
    }

    // React to incoming Hollow Purple / being low health
    if (player1.attacking && dist < 80 && Math.random() < 0.4) {
        player2.blocking = true;
    }
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
    if (aiMode) handleAI();
    player1.update(player2);
    player2.update(player1);
    updateParticles();
    updateHollowPurple();

    player1.draw();
    player2.draw();
    drawHollowPurple();
    drawParticles();

    updateUI();
    checkRoundEnd();
}

// ── Start / Restart ──
function startGame(useAI) {
    aiMode = useAI;
    gameState = 'playing';
    p1Wins = 0;
    p2Wins = 0;
    currentRound = 1;
    particles.length = 0;
    hollowPurpleProjectiles.length = 0;
    resetPositions();
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('ui-overlay').style.display = 'block';
    startTimer();
}

document.getElementById('start-2p-btn').addEventListener('click', () => startGame(false));
document.getElementById('start-ai-btn').addEventListener('click', () => startGame(true));
document.getElementById('rematch-btn').addEventListener('click', () => startGame(aiMode));

gameState = 'menu';
gameLoop();
