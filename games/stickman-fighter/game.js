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

// ── Abilities ──
const ABILITIES = {
    lightning: {
        name: 'Lightning',
        damage: 20,
        cooldown: 300,   // 5s
        type: 'instant',
        range: 350,
        knockback: 5,
        blockReduction: 0.5,
        color: '#f1c40f',
        hue: 50,
    },
    water: {
        name: 'Water',
        damage: 15,
        cooldown: 240,   // 4s
        type: 'projectile',
        speed: 6,
        radius: 14,
        knockback: 12,
        blockReduction: 0.6,
        color: '#3498db',
        hue: 200,
    },
    fire: {
        name: 'Fire',
        damage: 25,
        cooldown: 420,   // 7s
        type: 'projectile',
        speed: 9,
        radius: 12,
        knockback: 8,
        blockReduction: 0.4,
        color: '#e67e22',
        hue: 25,
    },
    wind: {
        name: 'Wind',
        damage: 8,
        cooldown: 180,   // 3s
        type: 'instant',
        range: 250,
        knockback: 20,
        blockReduction: 0.7,
        color: '#1abc9c',
        hue: 170,
    },
};

const ABILITY_NAMES = ['lightning', 'water', 'fire', 'wind'];

// ── State ──
let groundY, gameState, timer, timerInterval;
let p1Wins = 0, p2Wins = 0, currentRound = 1;
let aiMode = false;

const keys = {};
const projectiles = [];
const visualEffects = [];

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
        this.blocking = false;
        this.hit = false;
        this.hitTimer = 0;
        this.casting = false;
        this.castTimer = 0;
        this.cooldowns = { lightning: 0, water: 0, fire: 0, wind: 0 };
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

        // Cast animation
        if (this.castTimer > 0) {
            this.castTimer--;
            this.casting = this.castTimer > 0;
        }

        // Cooldowns
        for (const name of ABILITY_NAMES) {
            if (this.cooldowns[name] > 0) this.cooldowns[name]--;
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

    useAbility(abilityName, opponent) {
        if (this.cooldowns[abilityName] > 0 || this.hit || this.blocking) return;
        const ab = ABILITIES[abilityName];
        this.cooldowns[abilityName] = ab.cooldown;
        this.casting = true;
        this.castTimer = 15;

        const dir = this.facing;

        if (ab.type === 'projectile') {
            projectiles.push({
                x: this.x + dir * 30,
                y: this.y - this.height * 0.55,
                vx: dir * ab.speed,
                vy: 0,
                radius: ab.radius,
                owner: this,
                target: opponent,
                ability: abilityName,
                life: 180,
                trail: [],
            });
        } else if (ab.type === 'instant') {
            const dist = Math.abs(this.x - opponent.x);
            if (dist < ab.range) {
                let damage = ab.damage;
                let kb = ab.knockback;
                if (opponent.blocking) {
                    damage = Math.floor(damage * (1 - ab.blockReduction));
                    kb *= (1 - ab.blockReduction);
                }
                opponent.health = Math.max(0, opponent.health - damage);
                opponent.hitTimer = 12;
                opponent.hit = true;
                opponent.x += dir * kb;

                if (abilityName === 'lightning') {
                    spawnLightningBolt(opponent.x, opponent.y - opponent.height);
                } else if (abilityName === 'wind') {
                    spawnWindGust(this.x, this.y - this.height * 0.5, dir);
                }
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, abilityName);
            }
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
        if (this.casting) {
            // Casting pose — both arms thrust forward
            const swing = Math.sin(this.castTimer / 15 * Math.PI);
            ctx.beginPath();
            ctx.moveTo(0, armY);
            ctx.lineTo(20 + swing * 25, armY - 10);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, armY);
            ctx.lineTo(15 + swing * 20, armY + 5);
            ctx.stroke();
        } else if (this.blocking) {
            ctx.beginPath();
            ctx.moveTo(0, armY);
            ctx.lineTo(15, armY - 15);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, armY);
            ctx.lineTo(15, armY + 5);
            ctx.stroke();
        } else {
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
        if (!this.onGround) {
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

        // Block shield
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

// ── Visual Effects ──
function spawnLightningBolt(x, topY) {
    const segments = [];
    let cy = 0;
    while (cy < topY + groundY) {
        segments.push({ x: x + (Math.random() - 0.5) * 30, y: cy });
        cy += 15 + Math.random() * 20;
    }
    segments.push({ x, y: topY + groundY });
    visualEffects.push({ type: 'lightning', segments, life: 15, maxLife: 15 });
}

function spawnWindGust(x, y, dir) {
    visualEffects.push({ type: 'wind', x, y, dir, life: 20, maxLife: 20 });
}

function spawnElementParticles(x, y, abilityName) {
    const ab = ABILITIES[abilityName];
    const count = abilityName === 'lightning' ? 15 : 12;
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 20 + Math.random() * 15,
            maxLife: 35,
            color: `hsl(${ab.hue + (Math.random() - 0.5) * 30}, 90%, ${45 + Math.random() * 35}%)`,
        });
    }
}

function updateVisualEffects() {
    for (let i = visualEffects.length - 1; i >= 0; i--) {
        visualEffects[i].life--;
        if (visualEffects[i].life <= 0) visualEffects.splice(i, 1);
    }
}

function drawVisualEffects() {
    for (const vfx of visualEffects) {
        const alpha = vfx.life / vfx.maxLife;

        if (vfx.type === 'lightning') {
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#f1c40f';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.moveTo(vfx.segments[0].x, vfx.segments[0].y);
            for (let j = 1; j < vfx.segments.length; j++) {
                ctx.lineTo(vfx.segments[j].x, vfx.segments[j].y);
            }
            ctx.stroke();
            // Bright core
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(vfx.segments[0].x, vfx.segments[0].y);
            for (let j = 1; j < vfx.segments.length; j++) {
                ctx.lineTo(vfx.segments[j].x, vfx.segments[j].y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        if (vfx.type === 'wind') {
            ctx.globalAlpha = alpha * 0.6;
            const progress = 1 - vfx.life / vfx.maxLife;
            for (let j = 0; j < 5; j++) {
                const offset = j * 20 - 40;
                const sweep = progress * 250;
                ctx.strokeStyle = `hsl(170, 60%, ${60 + j * 5}%)`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(vfx.x, vfx.y + offset);
                ctx.quadraticCurveTo(
                    vfx.x + vfx.dir * sweep * 0.5, vfx.y + offset + (Math.random() - 0.5) * 15,
                    vfx.x + vfx.dir * sweep, vfx.y + offset + (j - 2) * 8
                );
                ctx.stroke();
            }
        }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

// ── Projectile System ──
function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx;
        p.life--;

        // Trail
        p.trail.push({ x: p.x, y: p.y, alpha: 1 });
        if (p.trail.length > 15) p.trail.shift();
        for (const t of p.trail) t.alpha *= 0.88;

        // Hit detection
        const dx = p.x - p.target.x;
        const dy = p.y - (p.target.y - p.target.height * 0.5);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < p.radius + 30) {
            const ab = ABILITIES[p.ability];
            let damage = ab.damage;
            let kb = ab.knockback;
            if (p.target.blocking) {
                damage = Math.floor(damage * (1 - ab.blockReduction));
                kb *= (1 - ab.blockReduction);
            }
            p.target.health = Math.max(0, p.target.health - damage);
            p.target.hitTimer = 15;
            p.target.hit = true;
            p.target.x += (p.vx > 0 ? 1 : -1) * kb;

            spawnElementParticles(p.x, p.y, p.ability);
            projectiles.splice(i, 1);
            continue;
        }

        // Off screen or expired
        if (p.life <= 0 || p.x < -50 || p.x > canvas.width + 50) {
            projectiles.splice(i, 1);
        }
    }
}

function drawProjectiles() {
    for (const p of projectiles) {
        const ab = ABILITIES[p.ability];

        // Trail
        for (const t of p.trail) {
            ctx.globalAlpha = t.alpha * 0.4;
            ctx.fillStyle = ab.color;
            ctx.beginPath();
            ctx.arc(t.x, t.y, p.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Glow
        ctx.shadowColor = ab.color;
        ctx.shadowBlur = 15;

        // Core
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.3, ab.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Fire gets extra flickering particles around it
        if (p.ability === 'fire' && Math.random() < 0.5) {
            particles.push({
                x: p.x + (Math.random() - 0.5) * 10,
                y: p.y + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 3,
                vy: -Math.random() * 3,
                life: 8 + Math.random() * 6,
                maxLife: 14,
                color: `hsl(${15 + Math.random() * 25}, 100%, ${50 + Math.random() * 30}%)`,
            });
        }

        // Water gets drip particles
        if (p.ability === 'water' && Math.random() < 0.3) {
            particles.push({
                x: p.x + (Math.random() - 0.5) * 8,
                y: p.y + (Math.random() - 0.5) * 8,
                vx: (Math.random() - 0.5) * 2,
                vy: Math.random() * 2,
                life: 10 + Math.random() * 5,
                maxLife: 15,
                color: `hsl(${195 + Math.random() * 15}, 80%, ${55 + Math.random() * 25}%)`,
            });
        }

        ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
}

// ── Particles ──
const particles = [];

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
    projectiles.length = 0;
    visualEffects.length = 0;
}

// ── Input ──
window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    e.preventDefault();
});

window.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
    e.preventDefault();
});

function handleInput() {
    // Player 1: WASD + ZXCV abilities
    player1.vx = 0;
    player1.blocking = false;
    if (!player1.hit) {
        if (keys['a']) player1.vx = -MOVE_SPEED;
        if (keys['d']) player1.vx = MOVE_SPEED;
        if (keys['s']) player1.blocking = true;
    }
    if (keys['w'] && player1.onGround && !player1.blocking) {
        player1.vy = JUMP_FORCE;
        player1.onGround = false;
    }
    if (keys['z']) { player1.useAbility('lightning', player2); keys['z'] = false; }
    if (keys['x']) { player1.useAbility('water', player2);     keys['x'] = false; }
    if (keys['c']) { player1.useAbility('fire', player2);      keys['c'] = false; }
    if (keys['v']) { player1.useAbility('wind', player2);      keys['v'] = false; }

    // Player 2: Arrows + \ /., abilities
    if (!aiMode) {
        player2.vx = 0;
        player2.blocking = false;
        if (!player2.hit) {
            if (keys['arrowleft']) player2.vx = -MOVE_SPEED;
            if (keys['arrowright']) player2.vx = MOVE_SPEED;
            if (keys['arrowdown']) player2.blocking = true;
        }
        if (keys['arrowup'] && player2.onGround && !player2.blocking) {
            player2.vy = JUMP_FORCE;
            player2.onGround = false;
        }
        if (keys['\\']) { player2.useAbility('lightning', player1); keys['\\'] = false; }
        if (keys['/'])  { player2.useAbility('water', player1);    keys['/'] = false; }
        if (keys['.'])  { player2.useAbility('fire', player1);     keys['.'] = false; }
        if (keys[','])  { player2.useAbility('wind', player1);     keys[','] = false; }
    }
}

// ── AI ──
let aiActionTimer = 0;
let aiAction = 'idle';

function handleAI() {
    if (!aiMode) return;

    const dist = Math.abs(player2.x - player1.x);
    const facingPlayer = (player2.x > player1.x) ? -1 : 1;

    player2.vx = 0;
    player2.blocking = false;

    aiActionTimer--;
    if (aiActionTimer <= 0) {
        const roll = Math.random();
        if (dist > 300) {
            // Far — approach or use ranged ability
            const ready = ABILITY_NAMES.filter(a => player2.cooldowns[a] <= 0);
            if (roll < 0.25 && ready.length > 0) {
                aiAction = 'ability';
                aiActionTimer = 30;
            } else {
                aiAction = 'approach';
                aiActionTimer = 20 + Math.random() * 30;
            }
        } else if (dist > 100) {
            if (roll < 0.35) {
                aiAction = 'approach';
                aiActionTimer = 10 + Math.random() * 15;
            } else if (roll < 0.65) {
                aiAction = 'ability';
                aiActionTimer = 20;
            } else if (roll < 0.85) {
                aiAction = 'block';
                aiActionTimer = 20 + Math.random() * 20;
            } else {
                aiAction = 'jump';
                aiActionTimer = 10;
            }
        } else {
            if (roll < 0.4) {
                aiAction = 'ability';
                aiActionTimer = 15;
            } else if (roll < 0.65) {
                aiAction = 'block';
                aiActionTimer = 15 + Math.random() * 15;
            } else if (roll < 0.85) {
                aiAction = 'retreat';
                aiActionTimer = 15 + Math.random() * 10;
            } else {
                aiAction = 'jump';
                aiActionTimer = 10;
            }
        }
    }

    if (player2.hit) return;

    switch (aiAction) {
        case 'approach':
            player2.vx = facingPlayer * MOVE_SPEED;
            break;
        case 'retreat':
            player2.vx = -facingPlayer * MOVE_SPEED;
            break;
        case 'ability': {
            // Pick a random ready ability, prefer fire at range, wind up close
            const ready = ABILITY_NAMES.filter(a => player2.cooldowns[a] <= 0);
            if (ready.length > 0) {
                let pick;
                if (dist < 150 && ready.includes('wind')) {
                    pick = 'wind';
                } else if (dist > 200 && ready.includes('fire')) {
                    pick = 'fire';
                } else {
                    pick = ready[Math.floor(Math.random() * ready.length)];
                }
                player2.useAbility(pick, player1);
            }
            aiAction = 'idle';
            break;
        }
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
    }

    // Reactive block
    if (player1.casting && dist < 120 && Math.random() < 0.3) {
        player2.blocking = true;
    }
}

// ── Drawing ──
function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(1, '#16213e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

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

function drawCooldowns() {
    const barW = 100;
    const barH = 8;
    const gap = 18;
    const startY = 80;

    // Player 1 — left side
    const p1X = 32;
    for (let i = 0; i < ABILITY_NAMES.length; i++) {
        const name = ABILITY_NAMES[i];
        const ab = ABILITIES[name];
        const y = startY + i * gap;
        const ratio = player1.cooldowns[name] / ab.cooldown;
        drawAbilityCooldownBar(p1X, y, barW, barH, ratio, ab, 'left');
    }

    // Player 2 — right side
    const p2X = canvas.width - 32 - barW;
    for (let i = 0; i < ABILITY_NAMES.length; i++) {
        const name = ABILITY_NAMES[i];
        const ab = ABILITIES[name];
        const y = startY + i * gap;
        const ratio = player2.cooldowns[name] / ab.cooldown;
        drawAbilityCooldownBar(p2X, y, barW, barH, ratio, ab, 'right');
    }
}

function drawAbilityCooldownBar(x, y, w, h, cooldownRatio, ab, side) {
    const ready = cooldownRatio <= 0;

    // Label
    ctx.font = '11px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = ready ? ab.color : '#555';
    ctx.fillText(ab.name, x, y - 2);

    // Status text
    ctx.textAlign = 'right';
    if (ready) {
        ctx.fillStyle = ab.color;
        ctx.fillText('READY', x + w, y - 2);
    } else {
        ctx.fillStyle = '#777';
        const secs = Math.ceil(cooldownRatio * (ab.cooldown / 60));
        ctx.fillText(secs + 's', x + w, y - 2);
    }
    ctx.textAlign = 'left';

    // Bar background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Fill
    const fillW = (1 - cooldownRatio) * w;
    if (ready) {
        const pulse = 0.6 + Math.sin(Date.now() * 0.004) * 0.3;
        ctx.fillStyle = ab.color;
        ctx.globalAlpha = pulse;
        ctx.shadowColor = ab.color;
        ctx.shadowBlur = 6;
    } else {
        ctx.fillStyle = ab.color;
        ctx.globalAlpha = 0.4;
    }
    ctx.fillRect(x, y, fillW, h);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
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
    if (player1.health > player2.health) p1Wins++;
    else if (player2.health > player1.health) p2Wins++;

    if (p1Wins >= ROUNDS_TO_WIN) endGame('Player 1 Wins!');
    else if (p2Wins >= ROUNDS_TO_WIN) endGame('Player 2 Wins!');
    else { currentRound++; resetPositions(); startTimer(); }
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
        if (p2Wins >= ROUNDS_TO_WIN) endGame('Player 2 Wins!');
        else { currentRound++; resetPositions(); clearInterval(timerInterval); startTimer(); }
    } else if (player2.health <= 0) {
        p1Wins++;
        if (p1Wins >= ROUNDS_TO_WIN) endGame('Player 1 Wins!');
        else { currentRound++; resetPositions(); clearInterval(timerInterval); startTimer(); }
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
    updateProjectiles();
    updateVisualEffects();

    player1.draw();
    player2.draw();
    drawProjectiles();
    drawVisualEffects();
    drawParticles();
    drawCooldowns();

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
    projectiles.length = 0;
    visualEffects.length = 0;
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
