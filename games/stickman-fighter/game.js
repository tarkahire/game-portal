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

// ── Element Styles — each has 4 attacks ──
const STYLES = {
    lightning: {
        name: 'Lightning',
        color: '#f1c40f',
        hue: 50,
        attacks: [
            { name: 'Spark Bolt',      type: 'projectile', damage: 10, cooldown: 120,  speed: 12, radius: 8,  knockback: 3,  blockReduction: 0.5 },
            { name: 'Thunder Strike',  type: 'instant',    damage: 18, cooldown: 300,  range: 320, knockback: 6,  blockReduction: 0.4, vfx: 'bolt' },
            { name: 'Ball Lightning',  type: 'projectile', damage: 22, cooldown: 420,  speed: 4,  radius: 20, knockback: 10, blockReduction: 0.3 },
            { name: 'Lightning Storm', type: 'instant',    damage: 35, cooldown: 600,  range: 400, knockback: 12, blockReduction: 0.2, vfx: 'storm' },
        ],
    },
    fire: {
        name: 'Fire',
        color: '#e67e22',
        hue: 25,
        attacks: [
            { name: 'Fireball',    type: 'projectile', damage: 12, cooldown: 150,  speed: 9,  radius: 10, knockback: 5,  blockReduction: 0.5 },
            { name: 'Flame Burst', type: 'instant',    damage: 20, cooldown: 300,  range: 150, knockback: 8,  blockReduction: 0.4, vfx: 'burst' },
            { name: 'Fire Pillar', type: 'instant',    damage: 25, cooldown: 420,  range: 350, knockback: 6,  blockReduction: 0.3, vfx: 'pillar' },
            { name: 'Meteor',      type: 'projectile', damage: 40, cooldown: 660,  speed: 6,  radius: 22, knockback: 15, blockReduction: 0.2 },
        ],
    },
    water: {
        name: 'Water',
        color: '#3498db',
        hue: 200,
        attacks: [
            { name: 'Water Bolt',  type: 'projectile', damage: 8,  cooldown: 100,  speed: 10, radius: 9,  knockback: 4,  blockReduction: 0.6 },
            { name: 'Tidal Wave',  type: 'projectile', damage: 14, cooldown: 270,  speed: 5,  radius: 18, knockback: 14, blockReduction: 0.4 },
            { name: 'Ice Spike',   type: 'projectile', damage: 22, cooldown: 360,  speed: 14, radius: 7,  knockback: 3,  blockReduction: 0.3 },
            { name: 'Tsunami',     type: 'projectile', damage: 30, cooldown: 600,  speed: 4,  radius: 28, knockback: 22, blockReduction: 0.2 },
        ],
    },
    wind: {
        name: 'Wind',
        color: '#1abc9c',
        hue: 170,
        attacks: [
            { name: 'Air Slash',     type: 'projectile', damage: 9,  cooldown: 90,   speed: 14, radius: 8,  knockback: 3,  blockReduction: 0.6 },
            { name: 'Gust',          type: 'instant',    damage: 5,  cooldown: 180,  range: 250, knockback: 18, blockReduction: 0.5, vfx: 'gust' },
            { name: 'Tornado',       type: 'projectile', damage: 18, cooldown: 360,  speed: 3,  radius: 22, knockback: 8,  blockReduction: 0.3 },
            { name: 'Cyclone Burst', type: 'instant',    damage: 28, cooldown: 540,  range: 200, knockback: 20, blockReduction: 0.2, vfx: 'cyclone' },
        ],
    },
};

// ── State ──
let groundY, gameState, timer, timerInterval;
let p1Wins = 0, p2Wins = 0, currentRound = 1;
let aiMode = false;
let p1Style = null, p2Style = null;

const keys = {};
const projectiles = [];
const visualEffects = [];
const particles = [];

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
        this.style = null;
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
        this.cooldowns = [0, 0, 0, 0];
        this.walkFrame = 0;
        this.walkTimer = 0;
    }

    update(opponent) {
        this.facing = this.x < opponent.x ? 1 : -1;

        if (this.hitTimer > 0) {
            this.hitTimer--;
            this.hit = this.hitTimer > 0;
        }
        if (this.castTimer > 0) {
            this.castTimer--;
            this.casting = this.castTimer > 0;
        }
        for (let i = 0; i < 4; i++) {
            if (this.cooldowns[i] > 0) this.cooldowns[i]--;
        }

        if (!this.hit) this.x += this.vx;
        this.vy += GRAVITY;
        this.y += this.vy;

        if (this.y >= groundY) {
            this.y = groundY;
            this.vy = 0;
            this.onGround = true;
        }
        this.x = Math.max(this.width / 2, Math.min(canvas.width - this.width / 2, this.x));

        if (Math.abs(this.vx) > 0 && this.onGround) {
            this.walkTimer++;
            if (this.walkTimer > 8) { this.walkTimer = 0; this.walkFrame = (this.walkFrame + 1) % 4; }
        } else if (this.onGround) {
            this.walkFrame = 0;
        }
    }

    useAttack(index, opponent) {
        if (!this.style || this.cooldowns[index] > 0 || this.hit || this.blocking) return;
        const atk = STYLES[this.style].attacks[index];
        const styleData = STYLES[this.style];
        this.cooldowns[index] = atk.cooldown;
        this.casting = true;
        this.castTimer = 15;

        const dir = this.facing;

        if (atk.type === 'projectile') {
            projectiles.push({
                x: this.x + dir * 30,
                y: this.y - this.height * 0.55,
                vx: dir * atk.speed,
                radius: atk.radius,
                owner: this,
                target: opponent,
                atk,
                styleData,
                life: 240,
                trail: [],
            });
        } else if (atk.type === 'instant') {
            const dist = Math.abs(this.x - opponent.x);
            if (dist < atk.range) {
                let damage = atk.damage;
                let kb = atk.knockback;
                if (opponent.blocking) {
                    damage = Math.floor(damage * (1 - atk.blockReduction));
                    kb *= (1 - atk.blockReduction);
                }
                opponent.health = Math.max(0, opponent.health - damage);
                opponent.hitTimer = 12;
                opponent.hit = true;
                opponent.x += dir * kb;

                this.spawnInstantVFX(atk, styleData, opponent, dir);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData);
            }
        }
    }

    spawnInstantVFX(atk, styleData, opponent, dir) {
        const vfx = atk.vfx;
        if (vfx === 'bolt') {
            spawnLightningBolt(opponent.x, opponent.y - opponent.height);
        } else if (vfx === 'storm') {
            for (let i = 0; i < 4; i++) {
                setTimeout(() => spawnLightningBolt(opponent.x + (Math.random() - 0.5) * 80, opponent.y - opponent.height), i * 60);
            }
        } else if (vfx === 'burst') {
            spawnExplosion(this.x + dir * 60, this.y - this.height * 0.5, styleData, 12);
        } else if (vfx === 'pillar') {
            spawnPillar(opponent.x, opponent.y, styleData);
        } else if (vfx === 'gust') {
            spawnWindGust(this.x, this.y - this.height * 0.5, dir);
        } else if (vfx === 'cyclone') {
            spawnCyclone(this.x, this.y - this.height * 0.5, styleData);
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.facing, 1);

        const opacity = this.hit ? 0.5 + Math.sin(Date.now() * 0.05) * 0.3 : 1;
        ctx.globalAlpha = opacity;

        const headY = -this.height;
        const bodyTopY = -this.height + 25;
        const bodyBottomY = -this.height * 0.4;

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Head
        ctx.beginPath();
        ctx.arc(0, headY, 14, 0, Math.PI * 2);
        ctx.stroke();

        // Body
        ctx.beginPath();
        ctx.moveTo(0, bodyTopY);
        ctx.lineTo(0, bodyBottomY);
        ctx.stroke();

        // Arms
        const armY = bodyTopY + 10;
        if (this.casting) {
            const s = Math.sin(this.castTimer / 15 * Math.PI);
            ctx.beginPath(); ctx.moveTo(0, armY); ctx.lineTo(20 + s * 25, armY - 10); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, armY); ctx.lineTo(15 + s * 20, armY + 5); ctx.stroke();
        } else if (this.blocking) {
            ctx.beginPath(); ctx.moveTo(0, armY); ctx.lineTo(15, armY - 15); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, armY); ctx.lineTo(15, armY + 5); ctx.stroke();
        } else {
            const sw = this.onGround ? Math.sin(this.walkFrame * Math.PI / 2) * 10 : 5;
            ctx.beginPath(); ctx.moveTo(0, armY); ctx.lineTo(15 + sw, armY + 20); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, armY); ctx.lineTo(15 - sw, armY + 20); ctx.stroke();
        }

        // Legs
        const legY = bodyBottomY;
        if (!this.onGround) {
            ctx.beginPath(); ctx.moveTo(0, legY); ctx.lineTo(10, legY + 20); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, legY); ctx.lineTo(-10, legY + 20); ctx.stroke();
        } else {
            const ls = Math.sin(this.walkFrame * Math.PI / 2) * 12;
            ctx.beginPath(); ctx.moveTo(0, legY); ctx.lineTo(8 + ls, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, legY); ctx.lineTo(8 - ls, 0); ctx.stroke();
        }

        if (this.blocking) {
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(10, -this.height * 0.5, 25, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// ── Visual Effect Spawners ──
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

function spawnExplosion(x, y, styleData, count) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 20 + Math.random() * 15,
            maxLife: 35,
            color: `hsl(${styleData.hue + (Math.random() - 0.5) * 30}, 90%, ${50 + Math.random() * 30}%)`,
        });
    }
}

function spawnPillar(x, y, styleData) {
    visualEffects.push({ type: 'pillar', x, y, styleData, life: 25, maxLife: 25 });
}

function spawnWindGust(x, y, dir) {
    visualEffects.push({ type: 'wind', x, y, dir, life: 20, maxLife: 20 });
}

function spawnCyclone(x, y, styleData) {
    visualEffects.push({ type: 'cyclone', x, y, styleData, life: 30, maxLife: 30 });
}

function spawnElementParticles(x, y, styleData) {
    for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 20 + Math.random() * 15,
            maxLife: 35,
            color: `hsl(${styleData.hue + (Math.random() - 0.5) * 30}, 90%, ${45 + Math.random() * 35}%)`,
        });
    }
}

// ── VFX Update & Draw ──
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
            for (let j = 1; j < vfx.segments.length; j++) ctx.lineTo(vfx.segments[j].x, vfx.segments[j].y);
            ctx.stroke();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(vfx.segments[0].x, vfx.segments[0].y);
            for (let j = 1; j < vfx.segments.length; j++) ctx.lineTo(vfx.segments[j].x, vfx.segments[j].y);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        if (vfx.type === 'pillar') {
            const progress = 1 - vfx.life / vfx.maxLife;
            const h = 150 * Math.min(progress * 3, 1);
            ctx.globalAlpha = alpha * 0.7;
            const grad = ctx.createLinearGradient(vfx.x, vfx.y, vfx.x, vfx.y - h);
            grad.addColorStop(0, vfx.styleData.color);
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(vfx.x - 15, vfx.y - h, 30, h);
            ctx.shadowColor = vfx.styleData.color;
            ctx.shadowBlur = 20;
            ctx.fillRect(vfx.x - 8, vfx.y - h, 16, h);
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
                    vfx.x + vfx.dir * sweep * 0.5, vfx.y + offset + (Math.random() - 0.5) * 10,
                    vfx.x + vfx.dir * sweep, vfx.y + offset + (j - 2) * 8
                );
                ctx.stroke();
            }
        }

        if (vfx.type === 'cyclone') {
            ctx.globalAlpha = alpha * 0.5;
            const progress = 1 - vfx.life / vfx.maxLife;
            const r = 40 + progress * 60;
            for (let j = 0; j < 8; j++) {
                const angle = (j / 8) * Math.PI * 2 + Date.now() * 0.01;
                ctx.strokeStyle = vfx.styleData.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(vfx.x + Math.cos(angle) * r * 0.3, vfx.y + Math.sin(angle) * r * 0.2, r * 0.4, angle, angle + 1.5);
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

        p.trail.push({ x: p.x, y: p.y, alpha: 1 });
        if (p.trail.length > 15) p.trail.shift();
        for (const t of p.trail) t.alpha *= 0.88;

        const dx = p.x - p.target.x;
        const dy = p.y - (p.target.y - p.target.height * 0.5);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < p.radius + 30) {
            let damage = p.atk.damage;
            let kb = p.atk.knockback;
            if (p.target.blocking) {
                damage = Math.floor(damage * (1 - p.atk.blockReduction));
                kb *= (1 - p.atk.blockReduction);
            }
            p.target.health = Math.max(0, p.target.health - damage);
            p.target.hitTimer = 15;
            p.target.hit = true;
            p.target.x += (p.vx > 0 ? 1 : -1) * kb;

            spawnElementParticles(p.x, p.y, p.styleData);
            projectiles.splice(i, 1);
            continue;
        }

        if (p.life <= 0 || p.x < -50 || p.x > canvas.width + 50) {
            projectiles.splice(i, 1);
        }
    }
}

function drawProjectiles() {
    for (const p of projectiles) {
        // Trail
        for (const t of p.trail) {
            ctx.globalAlpha = t.alpha * 0.35;
            ctx.fillStyle = p.styleData.color;
            ctx.beginPath();
            ctx.arc(t.x, t.y, p.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.shadowColor = p.styleData.color;
        ctx.shadowBlur = 15;

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.35, p.styleData.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Ambient particles for bigger projectiles
        if (p.radius >= 18 && Math.random() < 0.5) {
            particles.push({
                x: p.x + (Math.random() - 0.5) * p.radius,
                y: p.y + (Math.random() - 0.5) * p.radius,
                vx: (Math.random() - 0.5) * 3,
                vy: -Math.random() * 2,
                life: 8 + Math.random() * 6,
                maxLife: 14,
                color: `hsl(${p.styleData.hue + (Math.random() - 0.5) * 20}, 90%, ${55 + Math.random() * 30}%)`,
            });
        }

        ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
}

// ── Particles ──
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
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; e.preventDefault(); });
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; e.preventDefault(); });

function handleInput() {
    // Player 1: WASD + ZXCV
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
    if (keys['z']) { player1.useAttack(0, player2); keys['z'] = false; }
    if (keys['x']) { player1.useAttack(1, player2); keys['x'] = false; }
    if (keys['c']) { player1.useAttack(2, player2); keys['c'] = false; }
    if (keys['v']) { player1.useAttack(3, player2); keys['v'] = false; }

    // Player 2: Arrows + \/.,
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
        if (keys['\\']) { player2.useAttack(0, player1); keys['\\'] = false; }
        if (keys['/'])  { player2.useAttack(1, player1); keys['/'] = false; }
        if (keys['.'])  { player2.useAttack(2, player1); keys['.'] = false; }
        if (keys[','])  { player2.useAttack(3, player1); keys[','] = false; }
    }
}

// ── AI ──
let aiActionTimer = 0;
let aiAction = 'idle';

function handleAI() {
    if (!aiMode) return;

    const dist = Math.abs(player2.x - player1.x);
    const dir = (player2.x > player1.x) ? -1 : 1;

    player2.vx = 0;
    player2.blocking = false;

    aiActionTimer--;
    if (aiActionTimer <= 0) {
        const roll = Math.random();
        if (dist > 300) {
            if (roll < 0.3) { aiAction = 'ability'; aiActionTimer = 25; }
            else { aiAction = 'approach'; aiActionTimer = 20 + Math.random() * 30; }
        } else if (dist > 100) {
            if (roll < 0.3) { aiAction = 'approach'; aiActionTimer = 15; }
            else if (roll < 0.6) { aiAction = 'ability'; aiActionTimer = 20; }
            else if (roll < 0.8) { aiAction = 'block'; aiActionTimer = 25; }
            else { aiAction = 'jump'; aiActionTimer = 10; }
        } else {
            if (roll < 0.4) { aiAction = 'ability'; aiActionTimer = 12; }
            else if (roll < 0.65) { aiAction = 'block'; aiActionTimer = 20; }
            else if (roll < 0.85) { aiAction = 'retreat'; aiActionTimer = 20; }
            else { aiAction = 'jump'; aiActionTimer = 10; }
        }
    }

    if (player2.hit) return;

    switch (aiAction) {
        case 'approach':
            player2.vx = dir * MOVE_SPEED;
            break;
        case 'retreat':
            player2.vx = -dir * MOVE_SPEED;
            break;
        case 'ability': {
            const ready = [0, 1, 2, 3].filter(i => player2.cooldowns[i] <= 0);
            if (ready.length > 0) {
                // Prefer stronger attacks when available, lighter ones for poke
                let pick;
                if (dist > 250 && ready.includes(3)) pick = 3;
                else if (dist < 150 && ready.includes(0)) pick = 0;
                else pick = ready[Math.floor(Math.random() * ready.length)];
                player2.useAttack(pick, player1);
            }
            aiAction = 'idle';
            break;
        }
        case 'block':
            player2.blocking = true;
            break;
        case 'jump':
            if (player2.onGround) { player2.vy = JUMP_FORCE; player2.onGround = false; }
            player2.vx = dir * MOVE_SPEED;
            break;
    }

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
    if (!p1Style || !p2Style) return;
    const barW = 100;
    const barH = 7;
    const gap = 17;
    const startY = 78;

    const p1Attacks = STYLES[p1Style].attacks;
    const p1Color = STYLES[p1Style].color;
    for (let i = 0; i < 4; i++) {
        const y = startY + i * gap;
        const ratio = player1.cooldowns[i] / p1Attacks[i].cooldown;
        drawCooldownBar(32, y, barW, barH, ratio, p1Attacks[i].name, p1Color, p1Attacks[i].cooldown);
    }

    const p2Attacks = STYLES[p2Style].attacks;
    const p2Color = STYLES[p2Style].color;
    for (let i = 0; i < 4; i++) {
        const y = startY + i * gap;
        const ratio = player2.cooldowns[i] / p2Attacks[i].cooldown;
        drawCooldownBar(canvas.width - 32 - barW, y, barW, barH, ratio, p2Attacks[i].name, p2Color, p2Attacks[i].cooldown);
    }
}

function drawCooldownBar(x, y, w, h, cooldownRatio, name, color, maxCooldown) {
    const ready = cooldownRatio <= 0;

    ctx.font = '10px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = ready ? color : '#555';
    ctx.fillText(name, x, y - 2);

    ctx.textAlign = 'right';
    if (ready) {
        ctx.fillStyle = color;
        ctx.fillText('READY', x + w, y - 2);
    } else {
        ctx.fillStyle = '#666';
        ctx.fillText(Math.ceil(cooldownRatio * maxCooldown / 60) + 's', x + w, y - 2);
    }
    ctx.textAlign = 'left';

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    const fillW = (1 - cooldownRatio) * w;
    if (ready) {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.004) * 0.3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 5;
    } else {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.35;
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
        if (timer <= 0) { clearInterval(timerInterval); endRound(); }
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

// ── Style Selection ──
function showAttackPreview(player, styleName) {
    const el = document.getElementById(player === 1 ? 'p1-preview' : 'p2-preview');
    const keys = player === 1 ? ['Z', 'X', 'C', 'V'] : ['\\', '/', '.', ','];
    const attacks = STYLES[styleName].attacks;
    el.innerHTML = attacks.map((a, i) =>
        `<p><span class="atk-name">[${keys[i]}] ${a.name}</span> — ${a.damage} dmg, ${(a.cooldown / 60).toFixed(1)}s cd</p>`
    ).join('');
}

function setupStyleSelect() {
    p1Style = null;
    p2Style = null;
    document.getElementById('fight-btn').classList.add('hidden');
    document.getElementById('p1-preview').innerHTML = '';
    document.getElementById('p2-preview').innerHTML = '';

    document.querySelectorAll('.style-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
}

document.querySelectorAll('.style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const player = parseInt(btn.dataset.player);
        const style = btn.dataset.style;

        // Deselect siblings
        const side = btn.closest('.select-side');
        side.querySelectorAll('.style-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        if (player === 1) { p1Style = style; }
        else { p2Style = style; }

        showAttackPreview(player, style);

        // Show fight button when both selected
        if (p1Style && p2Style) {
            document.getElementById('fight-btn').classList.remove('hidden');
        }
    });
});

// ── Screen Flow ──
function goToSelect(useAI) {
    aiMode = useAI;
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('select-screen').classList.remove('hidden');
    setupStyleSelect();

    // Update P2 label for AI mode
    document.getElementById('p2-select-title').textContent = aiMode ? 'AI (Blue)' : 'Player 2 (Blue)';

    // If AI mode, auto-select a random style for P2
    if (aiMode) {
        const styleNames = Object.keys(STYLES);
        const randomStyle = styleNames[Math.floor(Math.random() * styleNames.length)];
        p2Style = randomStyle;
        const p2Btns = document.querySelectorAll('#p2-select .style-btn');
        p2Btns.forEach(b => {
            b.classList.toggle('selected', b.dataset.style === randomStyle);
        });
        showAttackPreview(2, randomStyle);

        if (p1Style) document.getElementById('fight-btn').classList.remove('hidden');
    }
}

function startFight() {
    if (!p1Style || !p2Style) return;
    player1.style = p1Style;
    player2.style = p2Style;
    gameState = 'playing';
    p1Wins = 0;
    p2Wins = 0;
    currentRound = 1;
    particles.length = 0;
    projectiles.length = 0;
    visualEffects.length = 0;
    resetPositions();

    document.getElementById('p1-name').textContent = 'P1 ' + STYLES[p1Style].name;
    document.getElementById('p2-name').textContent = 'P2 ' + STYLES[p2Style].name;

    document.getElementById('select-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('ui-overlay').style.display = 'block';
    startTimer();
}

document.getElementById('start-2p-btn').addEventListener('click', () => goToSelect(false));
document.getElementById('start-ai-btn').addEventListener('click', () => goToSelect(true));
document.getElementById('fight-btn').addEventListener('click', startFight);
document.getElementById('rematch-btn').addEventListener('click', startFight);
document.getElementById('reselect-btn').addEventListener('click', () => {
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('select-screen').classList.remove('hidden');
    setupStyleSelect();
});

gameState = 'menu';
gameLoop();
