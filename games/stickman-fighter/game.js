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
            { name: 'Spark Bolt',      type: 'projectile', damage: 10, cooldown: 120,  speed: 12, radius: 12,  knockback: 3,  blockReduction: 0.5, draw: 'sparkBolt' },
            { name: 'Thunder Strike',  type: 'instant',    damage: 18, cooldown: 300,  range: 320, knockback: 6,  blockReduction: 0.4, vfx: 'bolt' },
            { name: 'Ball Lightning',  type: 'projectile', damage: 22, cooldown: 420,  speed: 4,  radius: 30, knockback: 10, blockReduction: 0.3, draw: 'ballLightning' },
            { name: 'Lightning Storm', type: 'instant',    damage: 35, cooldown: 600,  range: 400, knockback: 12, blockReduction: 0.2, vfx: 'storm' },
        ],
    },
    fire: {
        name: 'Fire',
        color: '#e67e22',
        hue: 25,
        attacks: [
            { name: 'Fireball',    type: 'projectile', damage: 12, cooldown: 150,  speed: 9,  radius: 16, knockback: 5,  blockReduction: 0.5, draw: 'fireball' },
            { name: 'Flame Burst', type: 'instant',    damage: 20, cooldown: 300,  range: 150, knockback: 8,  blockReduction: 0.4, vfx: 'burst' },
            { name: 'Fire Pillar', type: 'instant',    damage: 25, cooldown: 420,  range: 350, knockback: 6,  blockReduction: 0.3, vfx: 'pillar' },
            { name: 'Meteor',      type: 'projectile', damage: 40, cooldown: 660,  speed: 7,  radius: 30, knockback: 15, blockReduction: 0.2, draw: 'meteor', special: 'meteor' },
        ],
    },
    water: {
        name: 'Water',
        color: '#3498db',
        hue: 200,
        attacks: [
            { name: 'Water Bolt',  type: 'projectile', damage: 8,  cooldown: 100,  speed: 10, radius: 12, knockback: 4,  blockReduction: 0.6, draw: 'waterBolt' },
            { name: 'Tidal Wave',  type: 'projectile', damage: 14, cooldown: 270,  speed: 5,  radius: 40, knockback: 14, blockReduction: 0.4, draw: 'tidalWave' },
            { name: 'Ice Spike',   type: 'projectile', damage: 22, cooldown: 360,  speed: 16, radius: 14, knockback: 3,  blockReduction: 0.3, draw: 'iceSpike' },
            { name: 'Tsunami',     type: 'projectile', damage: 30, cooldown: 600,  speed: 3,  radius: 60, knockback: 22, blockReduction: 0.2, draw: 'tsunami' },
        ],
    },
    wind: {
        name: 'Wind',
        color: '#1abc9c',
        hue: 170,
        attacks: [
            { name: 'Air Slash',     type: 'projectile', damage: 9,  cooldown: 90,   speed: 14, radius: 14, knockback: 3,  blockReduction: 0.6, draw: 'airSlash' },
            { name: 'Gust',          type: 'instant',    damage: 5,  cooldown: 180,  range: 250, knockback: 18, blockReduction: 0.5, vfx: 'gust' },
            { name: 'Tornado',       type: 'projectile', damage: 18, cooldown: 360,  speed: 3,  radius: 35, knockback: 8,  blockReduction: 0.3, draw: 'tornado' },
            { name: 'Cyclone Burst', type: 'instant',    damage: 28, cooldown: 540,  range: 200, knockback: 20, blockReduction: 0.2, vfx: 'cyclone' },
        ],
    },
};

// ── Screen Shake ──
let shakeIntensity = 0;
let shakeDuration = 0;
let shakeOffsetX = 0;
let shakeOffsetY = 0;

function triggerScreenShake(intensity, duration) {
    shakeIntensity = intensity;
    shakeDuration = duration;
}

function updateScreenShake() {
    if (shakeDuration > 0) {
        shakeDuration--;
        const decay = shakeDuration / 20;
        shakeOffsetX = (Math.random() - 0.5) * shakeIntensity * 2 * decay;
        shakeOffsetY = (Math.random() - 0.5) * shakeIntensity * 2 * decay;
    } else {
        shakeOffsetX = 0;
        shakeOffsetY = 0;
    }
}

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
        if (this.hitTimer > 0) { this.hitTimer--; this.hit = this.hitTimer > 0; }
        if (this.castTimer > 0) { this.castTimer--; this.casting = this.castTimer > 0; }
        for (let i = 0; i < 4; i++) { if (this.cooldowns[i] > 0) this.cooldowns[i]--; }

        if (!this.hit) this.x += this.vx;
        this.vy += GRAVITY;
        this.y += this.vy;
        if (this.y >= groundY) { this.y = groundY; this.vy = 0; this.onGround = true; }
        this.x = Math.max(this.width / 2, Math.min(canvas.width - this.width / 2, this.x));

        if (Math.abs(this.vx) > 0 && this.onGround) {
            this.walkTimer++;
            if (this.walkTimer > 8) { this.walkTimer = 0; this.walkFrame = (this.walkFrame + 1) % 4; }
        } else if (this.onGround) { this.walkFrame = 0; }
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
            // Meteor spawns behind the caster and flies diagonally at the opponent
            if (atk.special === 'meteor') {
                const spawnX = this.x - dir * 120;
                const spawnY = -60;
                const dx = opponent.x - spawnX;
                const dy = (opponent.y - opponent.height * 0.5) - spawnY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const speed = atk.speed + 4;
                projectiles.push({
                    x: spawnX,
                    y: spawnY,
                    vx: (dx / dist) * speed,
                    vy: (dy / dist) * speed,
                    radius: atk.radius,
                    owner: this,
                    target: opponent,
                    atk, styleData,
                    life: 240,
                    trail: [],
                    isMeteor: true,
                });
            } else {
                projectiles.push({
                    x: this.x + dir * 30,
                    y: this.y - this.height * 0.55,
                    vx: dir * atk.speed,
                    vy: 0,
                    radius: atk.radius,
                    owner: this,
                    target: opponent,
                    atk, styleData,
                    life: 300,
                    trail: [],
                });
            }
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
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 18);
            }
        }
    }

    spawnInstantVFX(atk, styleData, opponent, dir) {
        const vfx = atk.vfx;
        if (vfx === 'bolt') spawnLightningBolt(opponent.x, 0, groundY, 4);
        else if (vfx === 'storm') {
            for (let i = 0; i < 6; i++)
                setTimeout(() => spawnLightningBolt(opponent.x + (Math.random() - 0.5) * 120, 0, groundY, 5), i * 50);
        }
        else if (vfx === 'burst') spawnFlameBurst(this.x + dir * 60, this.y - this.height * 0.4);
        else if (vfx === 'pillar') spawnFirePillar(opponent.x, groundY);
        else if (vfx === 'gust') spawnWindGust(this.x, this.y - this.height * 0.5, dir);
        else if (vfx === 'cyclone') spawnCyclone(this.x, this.y - this.height * 0.3);
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.facing, 1);
        ctx.globalAlpha = this.hit ? 0.5 + Math.sin(Date.now() * 0.05) * 0.3 : 1;

        const headY = -this.height;
        const bodyTopY = -this.height + 25;
        const bodyBottomY = -this.height * 0.4;

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath(); ctx.arc(0, headY, 14, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, bodyTopY); ctx.lineTo(0, bodyBottomY); ctx.stroke();

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
            ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(10, -this.height * 0.5, 25, -Math.PI / 2, Math.PI / 2); ctx.stroke();
        }
        ctx.restore();
    }
}

// ══════════════════════════════════════
// ══ VFX SPAWNERS ══
// ══════════════════════════════════════

function spawnLightningBolt(x, top, bottom, width) {
    const segments = [];
    let cy = top;
    while (cy < bottom) {
        segments.push({ x: x + (Math.random() - 0.5) * 40 * width, y: cy });
        cy += 12 + Math.random() * 18;
    }
    segments.push({ x, y: bottom });
    visualEffects.push({ type: 'lightning', segments, life: 18, maxLife: 18, width });
}

function spawnMeteorImpact(x, y) {
    // Giant explosion ring
    visualEffects.push({ type: 'meteorImpact', x, y, life: 35, maxLife: 35 });
    // Massive particle burst
    for (let i = 0; i < 50; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 3 + Math.random() * 12;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - Math.random() * 5,
            life: 20 + Math.random() * 25, maxLife: 45,
            color: `hsl(${10 + Math.random() * 30}, 100%, ${40 + Math.random() * 45}%)` });
    }
    // Debris chunks flying up
    for (let i = 0; i < 12; i++) {
        const a = -Math.PI * 0.1 - Math.random() * Math.PI * 0.8;
        const s = 4 + Math.random() * 8;
        particles.push({ x: x + (Math.random() - 0.5) * 30, y,
            vx: Math.cos(a) * s * (Math.random() > 0.5 ? 1 : -1), vy: -3 - Math.random() * 10,
            life: 25 + Math.random() * 20, maxLife: 45,
            color: `hsl(25, 60%, ${25 + Math.random() * 20}%)` });
    }
}

function spawnFlameBurst(x, y) {
    visualEffects.push({ type: 'flameBurst', x, y, life: 22, maxLife: 22 });
    for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 3 + Math.random() * 8;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 15 + Math.random() * 15, maxLife: 30,
            color: `hsl(${15 + Math.random() * 25}, 100%, ${45 + Math.random() * 35}%)` });
    }
}

function spawnFirePillar(x, y) {
    visualEffects.push({ type: 'firePillar', x, y, life: 35, maxLife: 35 });
}

function spawnWindGust(x, y, dir) {
    visualEffects.push({ type: 'windGust', x, y, dir, life: 25, maxLife: 25 });
}

function spawnCyclone(x, y) {
    visualEffects.push({ type: 'cyclone', x, y, life: 35, maxLife: 35 });
}

function spawnElementParticles(x, y, styleData, count) {
    for (let i = 0; i < (count || 12); i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 2 + Math.random() * 7;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 20 + Math.random() * 18, maxLife: 38,
            color: `hsl(${styleData.hue + (Math.random() - 0.5) * 30}, 90%, ${45 + Math.random() * 35}%)` });
    }
}

// ══════════════════════════════════════
// ══ VFX UPDATE & DRAW ══
// ══════════════════════════════════════

function updateVisualEffects() {
    for (let i = visualEffects.length - 1; i >= 0; i--) {
        visualEffects[i].life--;
        if (visualEffects[i].life <= 0) visualEffects.splice(i, 1);
    }
}

function drawVisualEffects() {
    for (const vfx of visualEffects) {
        const a = vfx.life / vfx.maxLife;

        if (vfx.type === 'lightning') {
            ctx.globalAlpha = a;
            ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 20;
            ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2 + (vfx.width || 3);
            ctx.beginPath(); ctx.moveTo(vfx.segments[0].x, vfx.segments[0].y);
            for (let j = 1; j < vfx.segments.length; j++) ctx.lineTo(vfx.segments[j].x, vfx.segments[j].y);
            ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1 + (vfx.width || 1) * 0.4;
            ctx.beginPath(); ctx.moveTo(vfx.segments[0].x, vfx.segments[0].y);
            for (let j = 1; j < vfx.segments.length; j++) ctx.lineTo(vfx.segments[j].x, vfx.segments[j].y);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        if (vfx.type === 'meteorImpact') {
            const prog = 1 - a;
            // Massive expanding shockwave ring
            const r1 = prog * 200;
            ctx.globalAlpha = a * 0.7;
            ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 8;
            ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 40;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r1, 0, Math.PI * 2); ctx.stroke();
            // Inner orange ring
            ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r1 * 0.65, 0, Math.PI * 2); ctx.stroke();
            // Bright white flash at center (fades fast)
            if (prog < 0.3) {
                const flashAlpha = (0.3 - prog) / 0.3;
                ctx.globalAlpha = flashAlpha * 0.8;
                const fg = ctx.createRadialGradient(vfx.x, vfx.y, 0, vfx.x, vfx.y, 120);
                fg.addColorStop(0, '#fff');
                fg.addColorStop(0.3, 'rgba(243,156,18,0.6)');
                fg.addColorStop(1, 'rgba(231,76,60,0)');
                ctx.fillStyle = fg;
                ctx.beginPath(); ctx.arc(vfx.x, vfx.y, 120, 0, Math.PI * 2); ctx.fill();
            }
            // Ground crack lines
            ctx.globalAlpha = a * 0.5;
            ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 2;
            for (let j = 0; j < 8; j++) {
                const ca = (j / 8) * Math.PI * 2;
                const cr = 20 + prog * 80;
                ctx.beginPath();
                ctx.moveTo(vfx.x, vfx.y);
                ctx.lineTo(vfx.x + Math.cos(ca) * cr, vfx.y + Math.sin(ca) * cr * 0.3);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }

        if (vfx.type === 'flameBurst') {
            const prog = 1 - a;
            const r = 30 + prog * 80;
            ctx.globalAlpha = a * 0.6;
            ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 6;
            ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 25;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r * 0.6, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
        }

        if (vfx.type === 'firePillar') {
            const prog = 1 - a;
            const pillarH = Math.min(prog * 4, 1) * 250;
            const fadeH = a;
            ctx.globalAlpha = fadeH * 0.8;
            // Wide fiery pillar
            const grd = ctx.createLinearGradient(vfx.x, vfx.y, vfx.x, vfx.y - pillarH);
            grd.addColorStop(0, '#e74c3c');
            grd.addColorStop(0.3, '#e67e22');
            grd.addColorStop(0.7, '#f39c12');
            grd.addColorStop(1, 'rgba(241,196,15,0)');
            ctx.fillStyle = grd;
            ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 30;
            ctx.fillRect(vfx.x - 25, vfx.y - pillarH, 50, pillarH);
            // Inner bright core
            const grd2 = ctx.createLinearGradient(vfx.x, vfx.y, vfx.x, vfx.y - pillarH);
            grd2.addColorStop(0, '#fff');
            grd2.addColorStop(0.5, '#f1c40f');
            grd2.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grd2;
            ctx.fillRect(vfx.x - 10, vfx.y - pillarH, 20, pillarH);
            ctx.shadowBlur = 0;
            // Fire particles shooting up
            if (vfx.life % 2 === 0) {
                for (let i = 0; i < 3; i++) {
                    particles.push({ x: vfx.x + (Math.random() - 0.5) * 40, y: vfx.y - Math.random() * pillarH,
                        vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 4,
                        life: 10 + Math.random() * 10, maxLife: 20,
                        color: `hsl(${15 + Math.random() * 30}, 100%, ${50 + Math.random() * 40}%)` });
                }
            }
        }

        if (vfx.type === 'windGust') {
            const prog = 1 - a;
            ctx.globalAlpha = a * 0.7;
            const sweep = prog * 300;
            for (let j = 0; j < 8; j++) {
                const offset = j * 18 - 63;
                ctx.strokeStyle = `hsla(170, 60%, ${55 + j * 5}%, ${0.4 + Math.random() * 0.3})`;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(vfx.x, vfx.y + offset);
                const cp1x = vfx.x + vfx.dir * sweep * 0.4;
                const cp1y = vfx.y + offset + Math.sin(j + Date.now() * 0.01) * 12;
                const cp2x = vfx.x + vfx.dir * sweep * 0.7;
                const cp2y = vfx.y + offset + Math.cos(j * 2) * 15;
                const ex = vfx.x + vfx.dir * sweep;
                const ey = vfx.y + offset + (j - 3.5) * 6;
                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, ey);
                ctx.stroke();
            }
        }

        if (vfx.type === 'cyclone') {
            const prog = 1 - a;
            const r = 50 + prog * 100;
            ctx.globalAlpha = a * 0.6;
            ctx.shadowColor = '#1abc9c'; ctx.shadowBlur = 15;
            for (let j = 0; j < 12; j++) {
                const angle = (j / 12) * Math.PI * 2 + Date.now() * 0.015;
                const rx = r * (0.3 + Math.sin(angle * 2) * 0.15);
                const ry = r * 0.3;
                ctx.strokeStyle = `hsla(170, 70%, ${55 + j * 3}%, ${0.5})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(vfx.x + Math.cos(angle) * rx * 0.4, vfx.y + Math.sin(angle) * ry * 0.4, r * 0.25, angle, angle + 1.8);
                ctx.stroke();
            }
            // Debris particles
            if (vfx.life % 3 === 0) {
                const pa = Math.random() * Math.PI * 2;
                particles.push({ x: vfx.x + Math.cos(pa) * r * 0.5, y: vfx.y + Math.sin(pa) * r * 0.3,
                    vx: Math.cos(pa + 1.5) * 5, vy: Math.sin(pa + 1.5) * 3 - 2,
                    life: 12 + Math.random() * 8, maxLife: 20,
                    color: `hsl(170, 50%, ${50 + Math.random() * 30}%)` });
            }
            ctx.shadowBlur = 0;
        }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

// ══════════════════════════════════════
// ══ PROJECTILE SYSTEM ══
// ══════════════════════════════════════

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx;
        p.y += (p.vy || 0);
        p.life--;

        p.trail.push({ x: p.x, y: p.y, alpha: 1 });
        if (p.trail.length > 20) p.trail.shift();
        for (const t of p.trail) t.alpha *= 0.87;

        // Hit detection — use wider hitbox for waves
        const hitY = p.isMeteor ? p.y : (p.target.y - p.target.height * 0.5);
        const dx = p.x - p.target.x;
        const dy = (p.isMeteor ? p.y : p.y) - hitY;
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
            p.target.x += (p.vx > 0 ? 1 : p.vx < 0 ? -1 : p.owner.facing) * kb;

            spawnElementParticles(p.x, p.y, p.styleData, 20);
            // Meteor smash — massive explosion and screen shake
            if (p.isMeteor) {
                triggerScreenShake(25, 30);
                spawnMeteorImpact(p.x, p.y);
            }
            projectiles.splice(i, 1);
            continue;
        }

        // Meteor hits ground (missed)
        if (p.isMeteor && p.y >= groundY) {
            triggerScreenShake(15, 20);
            spawnMeteorImpact(p.x, groundY);
            projectiles.splice(i, 1);
            continue;
        }

        if (p.life <= 0 || p.x < -80 || p.x > canvas.width + 80 || p.y > canvas.height + 50) {
            projectiles.splice(i, 1);
        }
    }
}

function drawProjectiles() {
    for (const p of projectiles) {
        const draw = p.atk.draw || 'default';

        // ─── LIGHTNING: Spark Bolt ───
        if (draw === 'sparkBolt') {
            // Crackling electric bolt
            for (const t of p.trail) {
                ctx.globalAlpha = t.alpha * 0.3;
                ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(t.x - 6, t.y + (Math.random() - 0.5) * 6);
                ctx.lineTo(t.x + 6, t.y + (Math.random() - 0.5) * 6);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 20;
            // Core bolt shape
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
            // Electric arcs
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
            for (let j = 0; j < 3; j++) {
                const a = Math.random() * Math.PI * 2;
                const r = p.radius + 5 + Math.random() * 10;
                ctx.beginPath(); ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }

        // ─── LIGHTNING: Ball Lightning ───
        else if (draw === 'ballLightning') {
            ctx.globalAlpha = 1;
            ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 35;
            // Outer glow
            const g1 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2);
            g1.addColorStop(0, 'rgba(241,196,15,0.4)');
            g1.addColorStop(1, 'rgba(241,196,15,0)');
            ctx.fillStyle = g1;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2); ctx.fill();
            // Core
            const g2 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            g2.addColorStop(0, '#fff');
            g2.addColorStop(0.4, '#f1c40f');
            g2.addColorStop(1, 'rgba(241,196,15,0.3)');
            ctx.fillStyle = g2;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
            // Wild arcs
            ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2;
            for (let j = 0; j < 6; j++) {
                const a = (j / 6) * Math.PI * 2 + Date.now() * 0.008;
                const r = p.radius + 8 + Math.sin(Date.now() * 0.02 + j) * 12;
                ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * p.radius * 0.5, p.y + Math.sin(a) * p.radius * 0.5);
                const mx = p.x + Math.cos(a + 0.3) * r;
                const my = p.y + Math.sin(a + 0.3) * r;
                ctx.lineTo(mx, my); ctx.stroke();
            }
            ctx.shadowBlur = 0;
            // Ambient sparks
            if (Math.random() < 0.6) {
                particles.push({ x: p.x + (Math.random() - 0.5) * p.radius * 2, y: p.y + (Math.random() - 0.5) * p.radius * 2,
                    vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
                    life: 6 + Math.random() * 6, maxLife: 12, color: '#f1c40f' });
            }
        }

        // ─── FIRE: Fireball ───
        else if (draw === 'fireball') {
            // Trail of flames
            for (const t of p.trail) {
                ctx.globalAlpha = t.alpha * 0.5;
                const tr = p.radius * (0.3 + t.alpha * 0.5);
                ctx.fillStyle = `hsl(${20 + (1 - t.alpha) * 20}, 100%, ${50 + (1 - t.alpha) * 20}%)`;
                ctx.beginPath(); ctx.arc(t.x, t.y, tr, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 25;
            // Outer fire
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 1.3);
            g.addColorStop(0, '#fff');
            g.addColorStop(0.2, '#f39c12');
            g.addColorStop(0.5, '#e67e22');
            g.addColorStop(0.8, '#e74c3c');
            g.addColorStop(1, 'rgba(231,76,60,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 1.3, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Fire particles
            if (Math.random() < 0.7) {
                particles.push({ x: p.x + (Math.random() - 0.5) * 12, y: p.y + (Math.random() - 0.5) * 12,
                    vx: (Math.random() - 0.5) * 3 - p.vx * 0.2, vy: -1 - Math.random() * 3,
                    life: 8 + Math.random() * 8, maxLife: 16,
                    color: `hsl(${10 + Math.random() * 30}, 100%, ${50 + Math.random() * 35}%)` });
            }
        }

        // ─── FIRE: Meteor ───
        else if (draw === 'meteor') {
            // Flame trail going up
            for (const t of p.trail) {
                ctx.globalAlpha = t.alpha * 0.5;
                ctx.fillStyle = `hsl(${20 + (1 - t.alpha) * 15}, 100%, ${45 + (1 - t.alpha) * 30}%)`;
                ctx.beginPath(); ctx.arc(t.x, t.y, p.radius * t.alpha * 0.7, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 40;
            // Rock body
            ctx.fillStyle = '#8B4513';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 0.7, 0, Math.PI * 2); ctx.fill();
            // Fire envelope
            const mg = ctx.createRadialGradient(p.x, p.y - 5, 0, p.x, p.y, p.radius * 1.5);
            mg.addColorStop(0, 'rgba(255,255,255,0.8)');
            mg.addColorStop(0.2, '#f39c12');
            mg.addColorStop(0.5, '#e67e22');
            mg.addColorStop(0.8, 'rgba(231,76,60,0.5)');
            mg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = mg;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Lots of embers
            if (Math.random() < 0.8) {
                particles.push({ x: p.x + (Math.random() - 0.5) * 20, y: p.y + (Math.random() - 0.5) * 20,
                    vx: (Math.random() - 0.5) * 5, vy: -2 - Math.random() * 4,
                    life: 10 + Math.random() * 10, maxLife: 20,
                    color: `hsl(${10 + Math.random() * 30}, 100%, ${50 + Math.random() * 40}%)` });
            }
        }

        // ─── WATER: Water Bolt ───
        else if (draw === 'waterBolt') {
            for (const t of p.trail) {
                ctx.globalAlpha = t.alpha * 0.3;
                ctx.fillStyle = '#3498db';
                ctx.beginPath(); ctx.arc(t.x, t.y, p.radius * 0.4, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.shadowColor = '#3498db'; ctx.shadowBlur = 15;
            const wg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            wg.addColorStop(0, '#fff');
            wg.addColorStop(0.3, '#85c1e9');
            wg.addColorStop(0.7, '#3498db');
            wg.addColorStop(1, 'rgba(52,152,219,0)');
            ctx.fillStyle = wg;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Drips
            if (Math.random() < 0.4) {
                particles.push({ x: p.x, y: p.y + p.radius * 0.5,
                    vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 2,
                    life: 8 + Math.random() * 5, maxLife: 13, color: '#5dade2' });
            }
        }

        // ─── WATER: Tidal Wave ───
        else if (draw === 'tidalWave') {
            const dir = p.vx > 0 ? 1 : -1;
            const waveH = 70;
            const waveW = 60;
            ctx.save();
            ctx.translate(p.x, groundY);
            ctx.globalAlpha = 0.85;
            ctx.shadowColor = '#2980b9'; ctx.shadowBlur = 20;
            // Wave body — filled curve
            ctx.fillStyle = 'rgba(52, 152, 219, 0.6)';
            ctx.beginPath();
            ctx.moveTo(-dir * waveW * 0.5, 0);
            // Rising back of wave
            ctx.quadraticCurveTo(-dir * waveW * 0.3, -waveH * 0.5, 0, -waveH);
            // Curling top
            ctx.quadraticCurveTo(dir * waveW * 0.3, -waveH * 1.1, dir * waveW * 0.5, -waveH * 0.7);
            // Crashing front
            ctx.quadraticCurveTo(dir * waveW * 0.6, -waveH * 0.3, dir * waveW * 0.5, 0);
            ctx.closePath();
            ctx.fill();
            // Foam/white cap
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, -waveH);
            ctx.quadraticCurveTo(dir * waveW * 0.3, -waveH * 1.1, dir * waveW * 0.5, -waveH * 0.7);
            ctx.stroke();
            // Inner wave highlight
            ctx.fillStyle = 'rgba(133, 193, 233, 0.5)';
            ctx.beginPath();
            ctx.moveTo(-dir * waveW * 0.2, -5);
            ctx.quadraticCurveTo(-dir * waveW * 0.1, -waveH * 0.4, dir * waveW * 0.1, -waveH * 0.7);
            ctx.quadraticCurveTo(dir * waveW * 0.3, -waveH * 0.5, dir * waveW * 0.3, -5);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
            // Spray particles
            if (Math.random() < 0.5) {
                particles.push({ x: p.x + dir * 20, y: groundY - waveH + Math.random() * 20,
                    vx: dir * (2 + Math.random() * 3), vy: -1 - Math.random() * 3,
                    life: 8 + Math.random() * 6, maxLife: 14, color: '#aed6f1' });
            }
        }

        // ─── WATER: Ice Spike ───
        else if (draw === 'iceSpike') {
            const dir = p.vx > 0 ? 1 : -1;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(dir > 0 ? 0 : Math.PI);
            ctx.globalAlpha = 1;
            ctx.shadowColor = '#85c1e9'; ctx.shadowBlur = 15;
            // Sharp crystalline shard
            ctx.fillStyle = '#aed6f1';
            ctx.beginPath();
            ctx.moveTo(20, 0);
            ctx.lineTo(-8, -7);
            ctx.lineTo(-14, 0);
            ctx.lineTo(-8, 7);
            ctx.closePath();
            ctx.fill();
            // Inner bright edge
            ctx.fillStyle = '#d6eaf8';
            ctx.beginPath();
            ctx.moveTo(18, 0);
            ctx.lineTo(-4, -4);
            ctx.lineTo(-8, 0);
            ctx.lineTo(-4, 4);
            ctx.closePath();
            ctx.fill();
            // Bright tip
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(16, 0, 3, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
            // Ice sparkle particles
            if (Math.random() < 0.3) {
                particles.push({ x: p.x, y: p.y + (Math.random() - 0.5) * 8,
                    vx: -dir * Math.random() * 2, vy: (Math.random() - 0.5) * 2,
                    life: 6 + Math.random() * 4, maxLife: 10, color: '#d4efdf' });
            }
        }

        // ─── WATER: Tsunami ───
        else if (draw === 'tsunami') {
            const dir = p.vx > 0 ? 1 : -1;
            const waveH = 140;
            const waveW = 90;
            ctx.save();
            ctx.translate(p.x, groundY);
            ctx.globalAlpha = 0.8;
            ctx.shadowColor = '#1a5276'; ctx.shadowBlur = 30;
            // Massive wave body
            ctx.fillStyle = 'rgba(41, 128, 185, 0.65)';
            ctx.beginPath();
            ctx.moveTo(-dir * waveW * 0.6, 0);
            ctx.quadraticCurveTo(-dir * waveW * 0.3, -waveH * 0.4, 0, -waveH);
            ctx.quadraticCurveTo(dir * waveW * 0.35, -waveH * 1.15, dir * waveW * 0.6, -waveH * 0.6);
            ctx.quadraticCurveTo(dir * waveW * 0.7, -waveH * 0.2, dir * waveW * 0.6, 0);
            ctx.closePath();
            ctx.fill();
            // Deep water inner
            ctx.fillStyle = 'rgba(26, 82, 118, 0.5)';
            ctx.beginPath();
            ctx.moveTo(-dir * waveW * 0.3, -5);
            ctx.quadraticCurveTo(0, -waveH * 0.5, dir * waveW * 0.2, -waveH * 0.8);
            ctx.quadraticCurveTo(dir * waveW * 0.4, -waveH * 0.5, dir * waveW * 0.35, -5);
            ctx.closePath();
            ctx.fill();
            // Foam cap
            ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-dir * 5, -waveH * 0.95);
            ctx.quadraticCurveTo(dir * waveW * 0.35, -waveH * 1.15, dir * waveW * 0.6, -waveH * 0.6);
            ctx.stroke();
            // Secondary foam
            ctx.strokeStyle = 'rgba(174,214,241,0.6)'; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-dir * waveW * 0.1, -waveH * 0.6);
            ctx.quadraticCurveTo(dir * waveW * 0.15, -waveH * 0.7, dir * waveW * 0.4, -waveH * 0.5);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
            // Heavy spray
            if (Math.random() < 0.7) {
                for (let s = 0; s < 2; s++) {
                    particles.push({ x: p.x + dir * (Math.random() * 30), y: groundY - waveH * 0.5 - Math.random() * waveH * 0.5,
                        vx: dir * (1 + Math.random() * 4), vy: -2 - Math.random() * 4,
                        life: 10 + Math.random() * 8, maxLife: 18, color: '#d6eaf8' });
                }
            }
        }

        // ─── WIND: Air Slash ───
        else if (draw === 'airSlash') {
            const dir = p.vx > 0 ? 1 : -1;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.globalAlpha = 0.8;
            ctx.shadowColor = '#1abc9c'; ctx.shadowBlur = 12;
            // Crescent blade shape
            ctx.strokeStyle = '#1abc9c'; ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, -0.8, 0.8);
            ctx.stroke();
            ctx.strokeStyle = '#a3e4d7'; ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius * 0.7, -0.6, 0.6);
            ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius * 0.4, -0.4, 0.4);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // ─── WIND: Tornado ───
        else if (draw === 'tornado') {
            const h = 100;
            ctx.save();
            ctx.translate(p.x, groundY);
            ctx.globalAlpha = 0.7;
            ctx.shadowColor = '#1abc9c'; ctx.shadowBlur = 15;
            // Funnel shape — wider at bottom, narrow at top, spinning lines
            for (let j = 0; j < 10; j++) {
                const t = j / 10;
                const y = -t * h;
                const w = (1 - t * 0.6) * 30;
                const offset = Math.sin(Date.now() * 0.012 + j * 0.8) * w * 0.5;
                ctx.strokeStyle = `hsla(170, 60%, ${50 + j * 4}%, ${0.4 + t * 0.3})`;
                ctx.lineWidth = 3 - t * 1.5;
                ctx.beginPath();
                ctx.ellipse(offset, y, w, 6, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
            ctx.restore();
            // Debris
            if (Math.random() < 0.5) {
                const dy = Math.random() * h;
                particles.push({ x: p.x + (Math.random() - 0.5) * 40, y: groundY - dy,
                    vx: Math.sin(Date.now() * 0.01) * 4, vy: -1 - Math.random() * 2,
                    life: 8 + Math.random() * 6, maxLife: 14,
                    color: `hsl(170, 40%, ${45 + Math.random() * 30}%)` });
            }
        }

        // ─── DEFAULT (fallback) ───
        else {
            for (const t of p.trail) {
                ctx.globalAlpha = t.alpha * 0.35;
                ctx.fillStyle = p.styleData.color;
                ctx.beginPath(); ctx.arc(t.x, t.y, p.radius * 0.5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.shadowColor = p.styleData.color; ctx.shadowBlur = 15;
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            g.addColorStop(0, '#fff'); g.addColorStop(0.35, p.styleData.color); g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

// ── Particles ──
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life--;
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
    player1.reset(); player2.reset();
    projectiles.length = 0;
    visualEffects.length = 0;
}

// ── Input ──
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; e.preventDefault(); });
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; e.preventDefault(); });

function handleInput() {
    player1.vx = 0; player1.blocking = false;
    if (!player1.hit) {
        if (keys['a']) player1.vx = -MOVE_SPEED;
        if (keys['d']) player1.vx = MOVE_SPEED;
        if (keys['s']) player1.blocking = true;
    }
    if (keys['w'] && player1.onGround && !player1.blocking) { player1.vy = JUMP_FORCE; player1.onGround = false; }
    if (keys['z']) { player1.useAttack(0, player2); keys['z'] = false; }
    if (keys['x']) { player1.useAttack(1, player2); keys['x'] = false; }
    if (keys['c']) { player1.useAttack(2, player2); keys['c'] = false; }
    if (keys['v']) { player1.useAttack(3, player2); keys['v'] = false; }

    if (!aiMode) {
        player2.vx = 0; player2.blocking = false;
        if (!player2.hit) {
            if (keys['arrowleft']) player2.vx = -MOVE_SPEED;
            if (keys['arrowright']) player2.vx = MOVE_SPEED;
            if (keys['arrowdown']) player2.blocking = true;
        }
        if (keys['arrowup'] && player2.onGround && !player2.blocking) { player2.vy = JUMP_FORCE; player2.onGround = false; }
        if (keys['\\']) { player2.useAttack(0, player1); keys['\\'] = false; }
        if (keys['/'])  { player2.useAttack(1, player1); keys['/'] = false; }
        if (keys['.'])  { player2.useAttack(2, player1); keys['.'] = false; }
        if (keys[','])  { player2.useAttack(3, player1); keys[','] = false; }
    }
}

// ── AI ──
let aiActionTimer = 0, aiAction = 'idle';

function handleAI() {
    if (!aiMode) return;
    const dist = Math.abs(player2.x - player1.x);
    const dir = (player2.x > player1.x) ? -1 : 1;
    player2.vx = 0; player2.blocking = false;

    aiActionTimer--;
    if (aiActionTimer <= 0) {
        const r = Math.random();
        if (dist > 300) {
            if (r < 0.3) { aiAction = 'ability'; aiActionTimer = 25; }
            else { aiAction = 'approach'; aiActionTimer = 25; }
        } else if (dist > 100) {
            if (r < 0.3) { aiAction = 'approach'; aiActionTimer = 15; }
            else if (r < 0.6) { aiAction = 'ability'; aiActionTimer = 20; }
            else if (r < 0.8) { aiAction = 'block'; aiActionTimer = 25; }
            else { aiAction = 'jump'; aiActionTimer = 10; }
        } else {
            if (r < 0.4) { aiAction = 'ability'; aiActionTimer = 12; }
            else if (r < 0.65) { aiAction = 'block'; aiActionTimer = 20; }
            else if (r < 0.85) { aiAction = 'retreat'; aiActionTimer = 20; }
            else { aiAction = 'jump'; aiActionTimer = 10; }
        }
    }
    if (player2.hit) return;
    switch (aiAction) {
        case 'approach': player2.vx = dir * MOVE_SPEED; break;
        case 'retreat': player2.vx = -dir * MOVE_SPEED; break;
        case 'ability': {
            const ready = [0,1,2,3].filter(i => player2.cooldowns[i] <= 0);
            if (ready.length > 0) {
                let pick;
                if (dist > 250 && ready.includes(3)) pick = 3;
                else if (dist < 150 && ready.includes(0)) pick = 0;
                else pick = ready[Math.floor(Math.random() * ready.length)];
                player2.useAttack(pick, player1);
            }
            aiAction = 'idle'; break;
        }
        case 'block': player2.blocking = true; break;
        case 'jump':
            if (player2.onGround) { player2.vy = JUMP_FORCE; player2.onGround = false; }
            player2.vx = dir * MOVE_SPEED; break;
    }
    if (player1.casting && dist < 120 && Math.random() < 0.3) player2.blocking = true;
}

// ── Drawing ──
function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#1a1a2e'); g.addColorStop(1, '#16213e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
    ctx.strokeStyle = '#3498db'; ctx.lineWidth = 2;
    ctx.shadowColor = '#3498db'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
    ctx.shadowBlur = 0;
}

function updateUI() {
    document.getElementById('p1-health').style.width = (player1.health / MAX_HEALTH * 100) + '%';
    document.getElementById('p2-health').style.width = (player2.health / MAX_HEALTH * 100) + '%';
    document.getElementById('round-info').textContent = `Round ${currentRound}  |  ${p1Wins} - ${p2Wins}`;
}

function drawCooldowns() {
    if (!p1Style || !p2Style) return;
    const barW = 100, barH = 7, gap = 17, startY = 78;
    const p1A = STYLES[p1Style].attacks, p1C = STYLES[p1Style].color;
    const p2A = STYLES[p2Style].attacks, p2C = STYLES[p2Style].color;
    for (let i = 0; i < 4; i++) {
        drawCooldownBar(32, startY + i * gap, barW, barH, player1.cooldowns[i] / p1A[i].cooldown, p1A[i].name, p1C, p1A[i].cooldown);
        drawCooldownBar(canvas.width - 32 - barW, startY + i * gap, barW, barH, player2.cooldowns[i] / p2A[i].cooldown, p2A[i].name, p2C, p2A[i].cooldown);
    }
}

function drawCooldownBar(x, y, w, h, ratio, name, color, maxCd) {
    const ready = ratio <= 0;
    ctx.font = '10px "Segoe UI",Arial,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = ready ? color : '#555';
    ctx.fillText(name, x, y - 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = ready ? color : '#666';
    ctx.fillText(ready ? 'READY' : Math.ceil(ratio * maxCd / 60) + 's', x + w, y - 2);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
    const fw = (1 - ratio) * w;
    ctx.fillStyle = color;
    ctx.globalAlpha = ready ? 0.6 + Math.sin(Date.now() * 0.004) * 0.3 : 0.35;
    if (ready) { ctx.shadowColor = color; ctx.shadowBlur = 5; }
    ctx.fillRect(x, y, fw, h);
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
}

// ── Round / Game Logic ──
function startTimer() {
    timer = ROUND_TIME;
    document.getElementById('timer').textContent = timer;
    timerInterval = setInterval(() => { timer--; document.getElementById('timer').textContent = timer; if (timer <= 0) { clearInterval(timerInterval); endRound(); } }, 1000);
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
    if (player1.health <= 0) { p2Wins++; if (p2Wins >= ROUNDS_TO_WIN) endGame('Player 2 Wins!'); else { currentRound++; resetPositions(); clearInterval(timerInterval); startTimer(); } }
    else if (player2.health <= 0) { p1Wins++; if (p1Wins >= ROUNDS_TO_WIN) endGame('Player 1 Wins!'); else { currentRound++; resetPositions(); clearInterval(timerInterval); startTimer(); } }
}

// ── Game Loop ──
function gameLoop() {
    requestAnimationFrame(gameLoop);

    if (gameState !== 'playing') {
        drawBackground();
        return;
    }

    handleInput();
    if (aiMode) handleAI();
    player1.update(player2); player2.update(player1);
    updateParticles(); updateProjectiles(); updateVisualEffects();
    updateScreenShake();

    // Apply screen shake
    ctx.save();
    ctx.translate(shakeOffsetX, shakeOffsetY);

    drawBackground();
    player1.draw(); player2.draw();
    drawProjectiles(); drawVisualEffects(); drawParticles(); drawCooldowns();

    ctx.restore();

    updateUI(); checkRoundEnd();
}

// ── Style Selection ──
function showAttackPreview(player, styleName) {
    const el = document.getElementById(player === 1 ? 'p1-preview' : 'p2-preview');
    const k = player === 1 ? ['Z', 'X', 'C', 'V'] : ['\\', '/', '.', ','];
    const attacks = STYLES[styleName].attacks;
    el.innerHTML = attacks.map((a, i) =>
        `<p><span class="atk-name">[${k[i]}] ${a.name}</span> — ${a.damage} dmg, ${(a.cooldown / 60).toFixed(1)}s cd</p>`
    ).join('');
}

function setupStyleSelect() {
    p1Style = null; p2Style = null;
    document.getElementById('fight-btn').classList.add('hidden');
    document.getElementById('p1-preview').innerHTML = '';
    document.getElementById('p2-preview').innerHTML = '';
    document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('selected'));
}

document.querySelectorAll('.style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const player = parseInt(btn.dataset.player);
        const style = btn.dataset.style;
        btn.closest('.select-side').querySelectorAll('.style-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        if (player === 1) p1Style = style; else p2Style = style;
        showAttackPreview(player, style);
        if (p1Style && p2Style) document.getElementById('fight-btn').classList.remove('hidden');
    });
});

function goToSelect(useAI) {
    aiMode = useAI;
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('select-screen').classList.remove('hidden');
    setupStyleSelect();
    document.getElementById('p2-select-title').textContent = aiMode ? 'AI (Blue)' : 'Player 2 (Blue)';
    if (aiMode) {
        const names = Object.keys(STYLES);
        const rs = names[Math.floor(Math.random() * names.length)];
        p2Style = rs;
        document.querySelectorAll('#p2-select .style-btn').forEach(b => b.classList.toggle('selected', b.dataset.style === rs));
        showAttackPreview(2, rs);
        if (p1Style) document.getElementById('fight-btn').classList.remove('hidden');
    }
}

function startFight() {
    if (!p1Style || !p2Style) return;
    player1.style = p1Style; player2.style = p2Style;
    gameState = 'playing'; p1Wins = 0; p2Wins = 0; currentRound = 1;
    particles.length = 0; projectiles.length = 0; visualEffects.length = 0;
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
