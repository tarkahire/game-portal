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
            { name: 'Spark Bolt',      type: 'projectile', damage: 10, cooldown: 120,  speed: 12, radius: 22,  knockback: 6,  blockReduction: 0.5, draw: 'sparkBolt' },
            { name: 'Thunder Strike',  type: 'instant',    damage: 18, cooldown: 300,  range: 9999, knockback: 10, blockReduction: 0.4, vfx: 'bolt' },
            { name: 'Ball Lightning',  type: 'projectile', damage: 22, cooldown: 420,  speed: 4,  radius: 50, knockback: 14, blockReduction: 0.3, draw: 'ballLightning' },
            { name: 'Lightning Storm', type: 'instant',    damage: 35, cooldown: 600,  range: 9999, knockback: 18, blockReduction: 0.2, vfx: 'storm' },
        ],
    },
    fire: {
        name: 'Fire',
        color: '#e67e22',
        hue: 25,
        attacks: [
            { name: 'Fireball',    type: 'projectile', damage: 12, cooldown: 150,  speed: 9,  radius: 28, knockback: 8,  blockReduction: 0.5, draw: 'fireball' },
            { name: 'Flame Burst', type: 'instant',    damage: 20, cooldown: 300,  range: 200, knockback: 12, blockReduction: 0.4, vfx: 'burst' },
            { name: 'Fire Pillar', type: 'instant',    damage: 25, cooldown: 420,  range: 400, knockback: 10, blockReduction: 0.3, vfx: 'pillar' },
            { name: 'Meteor',      type: 'projectile', damage: 40, cooldown: 660,  speed: 7,  radius: 80, knockback: 22, blockReduction: 0.2, draw: 'meteor', special: 'meteor' },
        ],
    },
    water: {
        name: 'Water',
        color: '#3498db',
        hue: 200,
        attacks: [
            { name: 'Water Bolt',  type: 'projectile', damage: 8,  cooldown: 100,  speed: 10, radius: 20, knockback: 6,  blockReduction: 0.6, draw: 'waterBolt' },
            { name: 'Tidal Wave',  type: 'projectile', damage: 14, cooldown: 270,  speed: 5,  radius: 55, knockback: 18, blockReduction: 0.4, draw: 'tidalWave' },
            { name: 'Ice Spike',   type: 'instant',    damage: 22, cooldown: 360,  range: 350, knockback: 6,  blockReduction: 0.3, vfx: 'iceSpike', launchUp: -20 },
            { name: 'Tsunami',     type: 'projectile', damage: 30, cooldown: 600,  speed: 3,  radius: 85, knockback: 28, blockReduction: 0.2, draw: 'tsunami' },
        ],
    },
    wind: {
        name: 'Wind',
        color: '#1abc9c',
        hue: 170,
        attacks: [
            { name: 'Air Slash',     type: 'projectile', damage: 9,  cooldown: 90,   speed: 14, radius: 24, knockback: 6,  blockReduction: 0.6, draw: 'airSlash' },
            { name: 'Gust',          type: 'instant',    damage: 5,  cooldown: 180,  range: 300, knockback: 24, blockReduction: 0.5, vfx: 'gust' },
            { name: 'Tornado',       type: 'projectile', damage: 18, cooldown: 360,  speed: 3,  radius: 50, knockback: 12, blockReduction: 0.3, draw: 'tornado' },
            { name: 'Cyclone Burst', type: 'instant',    damage: 28, cooldown: 540,  range: 260, knockback: 26, blockReduction: 0.2, vfx: 'cyclone' },
        ],
    },
    earth: {
        name: 'Earth',
        color: '#a0522d',
        hue: 30,
        attacks: [
            { name: 'Rock Shot',     type: 'projectile', damage: 11, cooldown: 110,  speed: 11, radius: 32, knockback: 8,  blockReduction: 0.5, draw: 'rockShot' },
            { name: 'Earth Pillar',  type: 'instant',    damage: 20, cooldown: 300,  range: 360, knockback: 14, blockReduction: 0.3, vfx: 'earthPillar' },
            { name: 'Seismic Wave',  type: 'projectile', damage: 18, cooldown: 360,  speed: 5,  radius: 60, knockback: 16, blockReduction: 0.3, draw: 'seismicWave' },
            { name: 'Boulder Crush', type: 'projectile', damage: 38, cooldown: 600,  speed: 0,  radius: 85, knockback: 28, blockReduction: 0.2, draw: 'boulderCrush', special: 'boulderCrush' },
        ],
    },
    acid: {
        name: 'Acid',
        color: '#39ff14',
        hue: 110,
        attacks: [
            { name: 'Acid Barrage', type: 'projectile', damage: 7,  cooldown: 100,  speed: 13, radius: 16, knockback: 4,  blockReduction: 0.5, draw: 'acidBarrage', special: 'acidBarrage' },
            { name: 'Acid Rain',    type: 'instant',    damage: 14, cooldown: 270,  range: 9999, knockback: 8,  blockReduction: 0.4, vfx: 'acidRain' },
            { name: 'Acid Slash',   type: 'instant',    damage: 20, cooldown: 360,  range: 9999, knockback: 14, blockReduction: 0.3, vfx: 'acidSlash' },
            { name: 'Acid Monster', type: 'projectile', damage: 25, cooldown: 660,  speed: 0,  radius: 90, knockback: 22, blockReduction: 0.2, draw: 'acidMonster', special: 'acidMonster' },
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

// ── Hitstop (freeze frames on impact) ──
let hitstopTimer = 0;
function triggerHitstop(frames) { hitstopTimer = Math.max(hitstopTimer, frames); }

// ── Screen Flash ──
let screenFlashAlpha = 0;
let screenFlashColor = '#fff';
function triggerScreenFlash(color, alpha) { screenFlashColor = color || '#fff'; screenFlashAlpha = Math.max(screenFlashAlpha, alpha || 0.5); }
function drawScreenFlash() {
    if (screenFlashAlpha > 0.01) {
        ctx.globalAlpha = screenFlashAlpha;
        ctx.fillStyle = screenFlashColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        screenFlashAlpha *= 0.82;
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
        this.rageAvailable = false;
        this.rageActive = false;
        this.rageTimer = 0;
        this.rageUsed = false;
        this.punchTimer = 0;
        this.kickTimer = 0;
        this.meleeCooldown = 0;
        this.phoenixDive = null;
    }

    update(opponent) {
        this.facing = this.x < opponent.x ? 1 : -1;
        if (this.hitTimer > 0) { this.hitTimer--; this.hit = this.hitTimer > 0; }
        if (this.castTimer > 0) { this.castTimer--; this.casting = this.castTimer > 0; }
        if (this.punchTimer > 0) this.punchTimer--;
        if (this.kickTimer > 0) this.kickTimer--;
        if (this.meleeCooldown > 0) this.meleeCooldown--;
        for (let i = 0; i < 4; i++) { if (this.cooldowns[i] > 0) this.cooldowns[i]--; }

        // Rage system
        if (this.health <= MAX_HEALTH * 0.5 && !this.rageUsed && !this.rageActive) {
            this.rageAvailable = true;
        }
        if (this.rageActive) {
            this.rageTimer--;
            if (this.rageTimer <= 0) { this.rageActive = false; }
            // Rage aura particles
            if (Math.random() < 0.3) {
                particles.push({ x: this.x + (Math.random() - 0.5) * 40, y: this.y - Math.random() * this.height,
                    vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 3,
                    life: 10 + Math.random() * 10, maxLife: 20,
                    color: `hsl(0, 100%, ${40 + Math.random() * 30}%)` });
            }
        }

        // ── Phoenix Dive (Fire Rage) overrides normal movement ──
        if (this.phoenixDive) {
            const pd = this.phoenixDive;
            pd.timer++;
            if (pd.phase === 'rise') {
                this.y -= 12;
                this.onGround = false;
                for (let i = 0; i < 4; i++) {
                    particles.push({ x: this.x + (Math.random() - 0.5) * 20, y: this.y + 15,
                        vx: (Math.random() - 0.5) * 3, vy: 3 + Math.random() * 6,
                        life: 10 + Math.random() * 8, maxLife: 18,
                        color: `hsl(${15 + Math.random() * 25}, 100%, ${50 + Math.random() * 30}%)` });
                }
                if (pd.timer >= 20) { pd.phase = 'hover'; pd.timer = 0; triggerScreenFlash('#e67e22', 0.35); }
            } else if (pd.phase === 'hover') {
                this.y += Math.sin(pd.timer * 0.3) * 0.5;
                for (let i = 0; i < 6; i++) {
                    const a = Math.random() * Math.PI * 2;
                    const s = 2 + Math.random() * 5;
                    particles.push({ x: this.x + Math.cos(a) * 25, y: this.y - this.height * 0.5 + Math.sin(a) * 25,
                        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                        life: 8 + Math.random() * 8, maxLife: 16,
                        color: `hsl(${10 + Math.random() * 30}, 100%, ${45 + Math.random() * 40}%)` });
                }
                if (pd.timer >= 15) {
                    pd.phase = 'dive'; pd.timer = 0;
                    pd.targetX = pd.opponent.x;
                    pd.startX = this.x; pd.startY = this.y;
                    triggerScreenFlash('#ff4400', 0.4);
                }
            } else if (pd.phase === 'dive') {
                const dur = 16;
                const t = Math.min(pd.timer / dur, 1);
                const ease = t * t * t;
                this.x = pd.startX + (pd.targetX - pd.startX) * ease;
                this.y = pd.startY + (groundY - pd.startY) * ease;
                for (let i = 0; i < 8; i++) {
                    particles.push({ x: this.x + (Math.random() - 0.5) * 35, y: this.y + (Math.random() - 0.5) * 35,
                        vx: (Math.random() - 0.5) * 7, vy: -3 - Math.random() * 7,
                        life: 10 + Math.random() * 10, maxLife: 20,
                        color: `hsl(${8 + Math.random() * 25}, 100%, ${40 + Math.random() * 40}%)` });
                }
                if (t >= 1) {
                    pd.phase = 'impact'; pd.timer = 0;
                    this.y = groundY; this.onGround = true;
                    triggerScreenShake(45, 50);
                    triggerHitstop(15);
                    triggerScreenFlash('#ff4400', 0.8);
                    spawnMeteorImpact(this.x, groundY);
                    const hitDist = Math.abs(this.x - pd.opponent.x);
                    if (hitDist < 140) {
                        let damage = pd.damage;
                        if (pd.opponent.blocking) damage = Math.floor(damage * (1 - pd.blockReduction));
                        pd.opponent.health = Math.max(0, pd.opponent.health - damage);
                        pd.opponent.hitTimer = 22;
                        pd.opponent.hit = true;
                        pd.opponent.vy = -14;
                        pd.opponent.onGround = false;
                        const kdir = this.x < pd.opponent.x ? 1 : -1;
                        pd.opponent.x += kdir * pd.knockback;
                        visualEffects.push({ type: 'impactRing', x: this.x, y: groundY - 30, life: 25, maxLife: 25, color: '#e67e22' });
                    }
                }
            } else if (pd.phase === 'impact') {
                if (pd.timer >= 22) this.phoenixDive = null;
            }
            this.x = Math.max(this.width / 2, Math.min(canvas.width - this.width / 2, this.x));
            return;
        }

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

    melee(type, opponent) {
        if (this.meleeCooldown > 0 || this.hit || this.blocking || this.phoenixDive) return;
        const PUNCH_RANGE = 70;
        const KICK_RANGE = 85;
        const PUNCH_DAMAGE = 5;
        const KICK_DAMAGE = 8;
        const PUNCH_KB = 5;
        const KICK_KB = 10;
        const range = type === 'punch' ? PUNCH_RANGE : KICK_RANGE;
        const dmg = type === 'punch' ? PUNCH_DAMAGE : KICK_DAMAGE;
        const kb = type === 'punch' ? PUNCH_KB : KICK_KB;

        if (type === 'punch') { this.punchTimer = 12; this.meleeCooldown = 18; }
        else { this.kickTimer = 15; this.meleeCooldown = 25; }

        const dist = Math.abs(this.x - opponent.x);
        const dir = this.facing;
        if (dist < range) {
            let damage = dmg;
            if (this.rageActive) damage = Math.floor(damage * 1.5);
            let knockback = kb;
            if (opponent.blocking) {
                damage = Math.floor(damage * 0.3);
                knockback *= 0.3;
            }
            opponent.health = Math.max(0, opponent.health - damage);
            opponent.hitTimer = 8;
            opponent.hit = true;
            opponent.x += dir * knockback;
            if (type === 'kick') { opponent.vy = -4; opponent.onGround = false; }
            triggerScreenShake(type === 'punch' ? 3 : 5, type === 'punch' ? 5 : 8);
            triggerHitstop(type === 'punch' ? 3 : 5);
            // Hit particles
            const hitX = this.x + dir * (range * 0.6);
            const hitY = type === 'punch' ? this.y - this.height * 0.65 : this.y - this.height * 0.3;
            for (let i = 0; i < 8; i++) {
                const a = Math.random() * Math.PI * 2;
                const s = 2 + Math.random() * 4;
                particles.push({ x: hitX, y: hitY, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                    life: 8 + Math.random() * 6, maxLife: 14, color: '#fff' });
            }
            visualEffects.push({ type: 'impactRing', x: hitX, y: hitY, life: 12, maxLife: 12, color: '#fff' });
        }
    }

    activateRage() {
        if (!this.rageAvailable || this.rageActive || this.rageUsed) return;
        this.rageActive = true;
        this.rageTimer = 30 * 60; // 30 seconds at ~60fps
        this.rageUsed = true;
        this.rageAvailable = false;
        this.cooldowns = [0, 0, 0, 0];
        triggerScreenShake(20, 25);
        triggerScreenFlash('#ff0000', 0.6);
        triggerHitstop(15);
        // Rage activation burst
        for (let i = 0; i < 50; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 3 + Math.random() * 8;
            particles.push({ x: this.x, y: this.y - this.height * 0.5,
                vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                life: 15 + Math.random() * 15, maxLife: 30,
                color: `hsl(0, 100%, ${40 + Math.random() * 40}%)` });
        }
        visualEffects.push({ type: 'rageActivation', x: this.x, y: this.y - this.height * 0.5, life: 40, maxLife: 40 });
    }

    useAttack(index, opponent) {
        if (!this.style || this.cooldowns[index] > 0 || this.hit || this.blocking || this.phoenixDive) return;
        const atk = STYLES[this.style].attacks[index];
        const styleData = STYLES[this.style];
        this.cooldowns[index] = this.rageActive ? Math.floor(atk.cooldown * 0.5) : atk.cooldown;
        this.casting = true;
        this.castTimer = 15;
        spawnElementParticles(this.x + this.facing * 20, this.y - this.height * 0.5, styleData, this.rageActive ? 25 : 12);
        const dir = this.facing;

        // ── Fire Rage Upgrades ──
        if (this.rageActive && this.style === 'fire') {
            if (index === 0) {
                // INFERNO LASER — replaces Fireball
                let damage = Math.floor(atk.damage * 1.5);
                let kb = atk.knockback * 1.5;
                if (opponent.blocking) { damage = Math.floor(damage * (1 - atk.blockReduction)); kb *= (1 - atk.blockReduction); }
                opponent.health = Math.max(0, opponent.health - damage);
                opponent.hitTimer = 15; opponent.hit = true;
                opponent.x += dir * kb;
                this.castTimer = 20;
                const beamY = this.y - this.height * 0.55;
                const beamEndX = dir > 0 ? canvas.width + 50 : -50;
                visualEffects.push({ type: 'laserBeam', x1: this.x + dir * 30, y1: beamY, x2: beamEndX, y2: beamY, dir, life: 28, maxLife: 28 });
                triggerScreenShake(15, 20); triggerHitstop(10); triggerScreenFlash('#ff4400', 0.5);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 60);
                visualEffects.push({ type: 'impactRing', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 20, maxLife: 20, color: '#e67e22' });
                return;
            }
            if (index === 1) {
                // PHOENIX DIVE — replaces Flame Burst
                this.phoenixDive = {
                    phase: 'rise', timer: 0, opponent,
                    damage: Math.floor(atk.damage * 1.5),
                    knockback: atk.knockback * 1.5,
                    blockReduction: atk.blockReduction,
                };
                this.casting = false; this.castTimer = 0;
                triggerScreenFlash('#e67e22', 0.3);
                return;
            }
            if (index === 2) {
                // INFERNO ERUPTION — replaces Fire Pillar (3 pillars)
                let damage = Math.floor(atk.damage * 1.5);
                let kb = atk.knockback;
                if (opponent.blocking) { damage = Math.floor(damage * (1 - atk.blockReduction)); kb *= (1 - atk.blockReduction); }
                const dist = Math.abs(this.x - opponent.x);
                if (dist < atk.range) {
                    opponent.health = Math.max(0, opponent.health - damage);
                    opponent.hitTimer = 18; opponent.hit = true;
                    opponent.x += dir * kb;
                    opponent.vy = -8; opponent.onGround = false;
                }
                for (let pp = -1; pp <= 1; pp++) spawnFirePillar(opponent.x + pp * 110, groundY);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 80);
                triggerScreenShake(20, 25); triggerHitstop(10); triggerScreenFlash('#e67e22', 0.6);
                visualEffects.push({ type: 'impactRing', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 25, maxLife: 25, color: '#e67e22' });
                return;
            }
            // Index 3 (Meteor) falls through to normal logic — already has rage VFX
        }

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
                    rageVfx: this.rageActive && index === 3 ? this.style : null,
                });
            }
            // Boulder Crush — rises from ground at caster, lifts up, then slams down on opponent
            else if (atk.special === 'boulderCrush') {
                triggerScreenShake(6, 10);
                projectiles.push({
                    x: this.x,
                    y: groundY,
                    vx: 0,
                    vy: 0,
                    radius: atk.radius,
                    owner: this,
                    target: opponent,
                    atk, styleData,
                    life: 300,
                    trail: [],
                    isBoulder: true,
                    phase: 'rise',       // rise -> hold -> slam
                    phaseTimer: 0,
                    originX: this.x,
                    targetX: opponent.x,
                    dir: dir,
                    rageVfx: this.rageActive && index === 3 ? this.style : null,
                });
            }
            // Acid Barrage — 3 projectiles in a spread
            else if (atk.special === 'acidBarrage') {
                for (let b = -1; b <= 1; b++) {
                    projectiles.push({
                        x: this.x + dir * 30,
                        y: this.y - this.height * 0.55 + b * 15,
                        vx: dir * atk.speed,
                        vy: b * 1.5,
                        radius: atk.radius,
                        owner: this,
                        target: opponent,
                        atk, styleData,
                        life: 200,
                        trail: [],
                        rageVfx: this.rageActive && index === 3 ? this.style : null,
                    });
                }
            }
            // Acid Monster — rises from ground at opponent, punches them
            else if (atk.special === 'acidMonster') {
                triggerScreenShake(8, 12);
                projectiles.push({
                    x: opponent.x,
                    y: groundY,
                    vx: 0, vy: 0,
                    radius: atk.radius,
                    owner: this,
                    target: opponent,
                    atk, styleData,
                    life: 300,
                    trail: [],
                    isAcidMonster: true,
                    phase: 'rise',
                    phaseTimer: 0,
                    dir: dir,
                    rageVfx: this.rageActive && index === 3 ? this.style : null,
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
                    rageVfx: this.rageActive && index === 3 ? this.style : null,
                });
            }
        } else if (atk.type === 'instant') {
            const dist = Math.abs(this.x - opponent.x);
            if (dist < atk.range) {
                let damage = atk.damage;
                if (this.rageActive) damage = Math.floor(damage * 1.5);
                let kb = atk.knockback;
                if (opponent.blocking) {
                    damage = Math.floor(damage * (1 - atk.blockReduction));
                    kb *= (1 - atk.blockReduction);
                }
                opponent.health = Math.max(0, opponent.health - damage);
                opponent.hitTimer = 12;
                opponent.hit = true;
                opponent.x += dir * kb;
                if (atk.launchUp) {
                    opponent.vy = atk.launchUp;
                    opponent.onGround = false;
                }
                this.spawnInstantVFX(atk, styleData, opponent, dir);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, this.rageActive ? 90 : 55);
                triggerScreenShake(Math.min(atk.damage * 1.2, 30), Math.min(atk.damage * 1.0, 30));
                triggerHitstop(Math.max(3, Math.floor(atk.damage / 6)));
                triggerScreenFlash(styleData.color, Math.min(atk.damage / 40, 0.6));
                visualEffects.push({ type: 'impactRing', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 25, maxLife: 25, color: styleData.color });
                // Rage ultimate VFX for instant attacks
                if (this.rageActive && index === 3) {
                    triggerRageUltVFX(this.style, opponent.x, opponent.y - opponent.height * 0.5, dir);
                }
            }
        }
    }

    spawnInstantVFX(atk, styleData, opponent, dir) {
        const vfx = atk.vfx;
        if (vfx === 'bolt') spawnLightningBolt(opponent.x, 0, groundY, 6);
        else if (vfx === 'storm') {
            for (let i = 0; i < 10; i++)
                setTimeout(() => spawnLightningBolt(opponent.x + (Math.random() - 0.5) * 200, 0, groundY, 7), i * 40);
        }
        else if (vfx === 'burst') spawnFlameBurst(this.x + dir * 60, this.y - this.height * 0.4);
        else if (vfx === 'pillar') spawnFirePillar(opponent.x, groundY);
        else if (vfx === 'gust') spawnWindGust(this.x, this.y - this.height * 0.5, dir);
        else if (vfx === 'cyclone') spawnCyclone(this.x, this.y - this.height * 0.3);
        else if (vfx === 'iceSpike') spawnIceSpike(opponent.x, groundY);
        else if (vfx === 'earthPillar') spawnEarthPillar(opponent.x, groundY);
        else if (vfx === 'acidRain') spawnAcidRain(opponent.x, groundY);
        else if (vfx === 'acidSlash') spawnAcidSlash(this.x, this.y - this.height * 0.5, opponent.x, opponent.y - opponent.height * 0.5, dir);
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.facing, 1);
        ctx.globalAlpha = this.hit ? 0.5 + Math.sin(Date.now() * 0.05) * 0.3 : 1;

        // Red rage aura
        if (this.rageActive) {
            const pulse = 0.4 + Math.sin(Date.now() * 0.006) * 0.2;
            const auraGrd = ctx.createRadialGradient(0, -this.height * 0.5, 5, 0, -this.height * 0.5, 70);
            auraGrd.addColorStop(0, `rgba(255, 30, 0, ${pulse * 0.4})`);
            auraGrd.addColorStop(0.5, `rgba(255, 0, 0, ${pulse * 0.2})`);
            auraGrd.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = auraGrd;
            ctx.beginPath(); ctx.arc(0, -this.height * 0.5, 70, 0, Math.PI * 2); ctx.fill();
        }
        // Rage available indicator — subtle pulse
        if (this.rageAvailable && !this.rageActive) {
            const pulse = 0.15 + Math.sin(Date.now() * 0.004) * 0.1;
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, -this.height * 0.5, 55, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = this.hit ? 0.5 + Math.sin(Date.now() * 0.05) * 0.3 : 1;
        }

        // ── Phoenix Dive: draw fireball instead of stickman ──
        if (this.phoenixDive && (this.phoenixDive.phase === 'hover' || this.phoenixDive.phase === 'dive')) {
            const r = this.phoenixDive.phase === 'dive' ? 50 : 38;
            const cy = -this.height * 0.5;
            ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 80;
            // Outer fire glow
            const og = ctx.createRadialGradient(0, cy, 0, 0, cy, r * 2.2);
            og.addColorStop(0, 'rgba(255,100,0,0.5)'); og.addColorStop(0.5, 'rgba(231,76,60,0.2)'); og.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = og;
            ctx.beginPath(); ctx.arc(0, cy, r * 2.2, 0, Math.PI * 2); ctx.fill();
            // Core fireball
            const fg = ctx.createRadialGradient(0, cy, 0, 0, cy, r);
            fg.addColorStop(0, '#fff'); fg.addColorStop(0.15, '#ffe066');
            fg.addColorStop(0.35, '#f39c12'); fg.addColorStop(0.6, '#e67e22');
            fg.addColorStop(0.85, '#e74c3c'); fg.addColorStop(1, 'rgba(231,76,60,0)');
            ctx.fillStyle = fg;
            ctx.beginPath(); ctx.arc(0, cy, r, 0, Math.PI * 2); ctx.fill();
            // Flickering flame wisps
            for (let f = 0; f < 5; f++) {
                const fa = (f / 5) * Math.PI * 2 + Date.now() * 0.012;
                const fr = r * (0.8 + Math.sin(Date.now() * 0.015 + f) * 0.3);
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = '#f39c12';
                ctx.beginPath(); ctx.arc(Math.cos(fa) * fr * 0.6, cy + Math.sin(fa) * fr * 0.6, 6 + Math.random() * 4, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1; ctx.shadowBlur = 0;
            ctx.restore();
            return;
        }

        const headY = -this.height;
        const bodyTopY = -this.height + 25;
        const bodyBottomY = -this.height * 0.4;

        ctx.strokeStyle = this.color;
        if (this.rageActive) { ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 18; }
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath(); ctx.arc(0, headY, 14, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, bodyTopY); ctx.lineTo(0, bodyBottomY); ctx.stroke();

        const armY = bodyTopY + 10;
        if (this.punchTimer > 0) {
            // Punching — one arm extended forward
            const ext = Math.sin(this.punchTimer / 12 * Math.PI);
            ctx.beginPath(); ctx.moveTo(0, armY); ctx.lineTo(20 + ext * 30, armY - 5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, armY); ctx.lineTo(-8, armY + 15); ctx.stroke();
            // Fist circle
            if (ext > 0.3) {
                ctx.fillStyle = this.color;
                ctx.beginPath(); ctx.arc(20 + ext * 30, armY - 5, 5, 0, Math.PI * 2); ctx.fill();
            }
        } else if (this.casting) {
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
        if (this.kickTimer > 0) {
            // Kicking — one leg extended forward
            const ext = Math.sin(this.kickTimer / 15 * Math.PI);
            ctx.beginPath(); ctx.moveTo(0, legY); ctx.lineTo(15 + ext * 35, legY + 5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, legY); ctx.lineTo(-5, 0); ctx.stroke();
            // Foot
            if (ext > 0.3) {
                ctx.fillStyle = this.color;
                ctx.beginPath(); ctx.arc(15 + ext * 35, legY + 5, 4, 0, Math.PI * 2); ctx.fill();
            }
        } else if (!this.onGround) {
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
        ctx.shadowBlur = 0;
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
        segments.push({ x: x + (Math.random() - 0.5) * 50 * width, y: cy });
        cy += 10 + Math.random() * 14;
    }
    segments.push({ x, y: bottom });
    visualEffects.push({ type: 'lightning', segments, life: 24, maxLife: 24, width: width * 1.3 });
    triggerScreenFlash('#f1c40f', 0.15);
}

function spawnMeteorImpact(x, y) {
    // Giant explosion ring
    visualEffects.push({ type: 'meteorImpact', x, y, life: 45, maxLife: 45 });
    // Massive particle burst
    for (let i = 0; i < 80; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 3 + Math.random() * 12;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - Math.random() * 5,
            life: 20 + Math.random() * 25, maxLife: 45,
            color: `hsl(${10 + Math.random() * 30}, 100%, ${40 + Math.random() * 45}%)` });
    }
    // Debris chunks flying up
    for (let i = 0; i < 22; i++) {
        const a = -Math.PI * 0.1 - Math.random() * Math.PI * 0.8;
        const s = 4 + Math.random() * 8;
        particles.push({ x: x + (Math.random() - 0.5) * 30, y,
            vx: Math.cos(a) * s * (Math.random() > 0.5 ? 1 : -1), vy: -3 - Math.random() * 10,
            life: 25 + Math.random() * 20, maxLife: 45,
            color: `hsl(25, 60%, ${25 + Math.random() * 20}%)` });
    }
}

function spawnFlameBurst(x, y) {
    visualEffects.push({ type: 'flameBurst', x, y, life: 28, maxLife: 28 });
    triggerScreenShake(6, 10);
    for (let i = 0; i < 35; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 3 + Math.random() * 8;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 15 + Math.random() * 15, maxLife: 30,
            color: `hsl(${15 + Math.random() * 25}, 100%, ${45 + Math.random() * 35}%)` });
    }
}

function spawnFirePillar(x, y) {
    visualEffects.push({ type: 'firePillar', x, y, life: 45, maxLife: 45 });
    triggerScreenShake(10, 15);
    triggerScreenFlash('#e67e22', 0.3);
}

function spawnWindGust(x, y, dir) {
    visualEffects.push({ type: 'windGust', x, y, dir, life: 30, maxLife: 30 });
    triggerScreenShake(4, 8);
}

function spawnCyclone(x, y) {
    visualEffects.push({ type: 'cyclone', x, y, life: 45, maxLife: 45 });
    triggerScreenShake(8, 12);
    triggerScreenFlash('#1abc9c', 0.25);
}

function spawnBoulderImpact(x, y) {
    visualEffects.push({ type: 'boulderImpact', x, y, life: 40, maxLife: 40 });
    triggerScreenFlash('#a0522d', 0.5);
    // Massive dirt/rock burst
    for (let i = 0; i < 65; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 3 + Math.random() * 10;
        particles.push({ x, y,
            vx: Math.cos(a) * s, vy: Math.sin(a) * s - Math.random() * 6,
            life: 18 + Math.random() * 20, maxLife: 38,
            color: `hsl(${25 + Math.random() * 15}, ${35 + Math.random() * 25}%, ${25 + Math.random() * 30}%)` });
    }
    // Rock chunks flying up
    for (let i = 0; i < 16; i++) {
        particles.push({ x: x + (Math.random() - 0.5) * 60, y,
            vx: (Math.random() - 0.5) * 12, vy: -6 - Math.random() * 14,
            life: 25 + Math.random() * 15, maxLife: 40,
            color: `hsl(25, 50%, ${20 + Math.random() * 15}%)` });
    }
}

function spawnIceSpike(x, y) {
    visualEffects.push({ type: 'iceSpike', x, y, life: 55, maxLife: 55 });
    triggerScreenShake(12, 18);
    triggerScreenFlash('#85c1e9', 0.3);
    // Ice shards burst
    for (let i = 0; i < 30; i++) {
        const a = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
        const s = 2 + Math.random() * 7;
        particles.push({ x: x + (Math.random() - 0.5) * 40, y,
            vx: Math.cos(a) * s * (Math.random() > 0.5 ? 1 : -1), vy: -3 - Math.random() * 8,
            life: 15 + Math.random() * 15, maxLife: 30,
            color: `hsl(${200 + Math.random() * 15}, ${60 + Math.random() * 30}%, ${60 + Math.random() * 30}%)` });
    }
}

function spawnEarthPillar(x, y) {
    visualEffects.push({ type: 'earthPillar', x, y, life: 42, maxLife: 42 });
    triggerScreenShake(12, 18);
    triggerScreenFlash('#a0522d', 0.2);
    // Dirt/debris burst
    for (let i = 0; i < 28; i++) {
        const a = -Math.PI * 0.2 - Math.random() * Math.PI * 0.6;
        const s = 2 + Math.random() * 6;
        particles.push({ x: x + (Math.random() - 0.5) * 30, y,
            vx: Math.cos(a) * s * (Math.random() > 0.5 ? 1 : -1), vy: -2 - Math.random() * 7,
            life: 15 + Math.random() * 15, maxLife: 30,
            color: `hsl(${25 + Math.random() * 15}, ${40 + Math.random() * 20}%, ${30 + Math.random() * 25}%)` });
    }
}

function spawnAcidRain(x, y) {
    visualEffects.push({ type: 'acidRain', x, y, life: 45, maxLife: 45 });
    triggerScreenShake(6, 10);
    triggerScreenFlash('#39ff14', 0.2);
    // Acid splash particles
    for (let i = 0; i < 20; i++) {
        particles.push({ x: x + (Math.random() - 0.5) * 120, y: y - Math.random() * 30,
            vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 5,
            life: 12 + Math.random() * 10, maxLife: 22,
            color: `hsl(${110 + Math.random() * 20}, 100%, ${40 + Math.random() * 30}%)` });
    }
}

function spawnAcidSlash(x1, y1, x2, y2, dir) {
    // Curved slash from caster to opponent and beyond
    const extend = 300;
    const endX = x2 + dir * extend;
    const endY = y2 - 40;
    // Control point for the curve — arcs upward
    const midX = (x1 + endX) * 0.5;
    const midY = Math.min(y1, endY) - 180;
    visualEffects.push({ type: 'acidSlash', x1, y1, x2: endX, y2: endY, cx: midX, cy: midY, dir, life: 30, maxLife: 30 });
    triggerScreenShake(10, 14);
    triggerScreenFlash('#39ff14', 0.25);
    // Particles along the slash path
    for (let i = 0; i < 25; i++) {
        const t = Math.random();
        const px = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * midX + t * t * endX;
        const py = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * midY + t * t * endY;
        const s = 2 + Math.random() * 5;
        const a = Math.random() * Math.PI * 2;
        particles.push({ x: px, y: py, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 10 + Math.random() * 12, maxLife: 22,
            color: `hsl(${110 + Math.random() * 15}, 100%, ${45 + Math.random() * 35}%)` });
    }
}

function spawnAcidMonsterImpact(x, y) {
    visualEffects.push({ type: 'acidMonsterImpact', x, y, life: 35, maxLife: 35 });
    triggerScreenFlash('#39ff14', 0.4);
    for (let i = 0; i < 40; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 3 + Math.random() * 8;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - Math.random() * 4,
            life: 15 + Math.random() * 15, maxLife: 30,
            color: `hsl(${105 + Math.random() * 20}, 100%, ${35 + Math.random() * 40}%)` });
    }
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
// ══ RAGE VFX SPAWNERS ══
// ══════════════════════════════════════

function triggerRageUltVFX(style, x, y, dir) {
    triggerScreenShake(30, 35);
    triggerHitstop(20);
    if (style === 'water') spawnScreenFracture(x, y);
    else if (style === 'lightning') spawnScreenLightningStorm();
    else if (style === 'fire') spawnScreenInferno();
    else if (style === 'wind') spawnScreenTear(x, y, dir);
    else if (style === 'earth') spawnScreenShatter(x, y);
    else if (style === 'acid') spawnScreenMeltdown(x, y);
}

function spawnScreenMeltdown(x, y) {
    visualEffects.push({ type: 'screenMeltdown', x, y, life: 60, maxLife: 60 });
    triggerScreenFlash('#39ff14', 0.7);
}

function spawnScreenFracture(x, y) {
    const cracks = [];
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const segments = [{ x, y }];
        let cx = x, cy = y;
        const maxDist = Math.max(canvas.width, canvas.height) * 0.8;
        const steps = 6 + Math.floor(Math.random() * 4);
        for (let j = 0; j < steps; j++) {
            cx += Math.cos(angle + (Math.random() - 0.5) * 0.5) * (maxDist / steps);
            cy += Math.sin(angle + (Math.random() - 0.5) * 0.5) * (maxDist / steps);
            segments.push({ x: cx, y: cy });
        }
        cracks.push(segments);
    }
    visualEffects.push({ type: 'screenFracture', x, y, cracks, life: 65, maxLife: 65 });
    triggerScreenFlash('#85c1e9', 0.7);
}

function spawnScreenLightningStorm() {
    visualEffects.push({ type: 'screenLightningStorm', life: 55, maxLife: 55 });
    triggerScreenFlash('#f1c40f', 0.8);
}

function spawnScreenInferno() {
    visualEffects.push({ type: 'screenInferno', life: 60, maxLife: 60 });
    triggerScreenFlash('#ff4400', 0.85);
}

function spawnScreenTear(x, y, dir) {
    const angle = -Math.PI * 0.15 * dir;
    const length = Math.max(canvas.width, canvas.height) * 1.2;
    visualEffects.push({ type: 'screenTear', x, y, angle, length, dir, life: 50, maxLife: 50 });
    triggerScreenFlash('#1abc9c', 0.6);
}

function spawnScreenShatter(x, y) {
    const cracks = [];
    for (let i = 0; i < 14; i++) {
        const angle = (i / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const segments = [{ x, y }];
        let cx = x, cy = y;
        const steps = 5 + Math.floor(Math.random() * 3);
        for (let j = 0; j < steps; j++) {
            cx += Math.cos(angle + (Math.random() - 0.5) * 0.6) * (60 + Math.random() * 50);
            cy += Math.sin(angle + (Math.random() - 0.5) * 0.6) * (60 + Math.random() * 50);
            segments.push({ x: cx, y: cy });
        }
        cracks.push(segments);
    }
    visualEffects.push({ type: 'screenShatter', x, y, cracks, life: 55, maxLife: 55 });
    triggerScreenFlash('#a0522d', 0.6);
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
            ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 35;
            ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 3 + (vfx.width || 3);
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
            const r1 = prog * 420;
            ctx.globalAlpha = a * 0.8;
            ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 10;
            ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 60;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r1, 0, Math.PI * 2); ctx.stroke();
            // Inner orange ring
            ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 7;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r1 * 0.65, 0, Math.PI * 2); ctx.stroke();
            // Second shockwave ring
            ctx.strokeStyle = '#ff6600'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r1 * 0.35, 0, Math.PI * 2); ctx.stroke();
            // Bright white flash at center (fades fast)
            if (prog < 0.4) {
                const flashAlpha = (0.4 - prog) / 0.4;
                ctx.globalAlpha = flashAlpha * 0.9;
                const fg = ctx.createRadialGradient(vfx.x, vfx.y, 0, vfx.x, vfx.y, 180);
                fg.addColorStop(0, '#fff');
                fg.addColorStop(0.2, 'rgba(255,200,50,0.8)');
                fg.addColorStop(0.5, 'rgba(243,156,18,0.4)');
                fg.addColorStop(1, 'rgba(231,76,60,0)');
                ctx.fillStyle = fg;
                ctx.beginPath(); ctx.arc(vfx.x, vfx.y, 180, 0, Math.PI * 2); ctx.fill();
            }
            // Ground crack lines
            ctx.globalAlpha = a * 0.6;
            ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 3;
            for (let j = 0; j < 12; j++) {
                const ca = (j / 12) * Math.PI * 2;
                const cr = 30 + prog * 130;
                ctx.beginPath();
                ctx.moveTo(vfx.x, vfx.y);
                ctx.lineTo(vfx.x + Math.cos(ca) * cr, vfx.y + Math.sin(ca) * cr * 0.3);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }

        if (vfx.type === 'flameBurst') {
            const prog = 1 - a;
            const r = 50 + prog * 170;
            ctx.globalAlpha = a * 0.7;
            ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 8;
            ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 40;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r * 0.6, 0, Math.PI * 2); ctx.stroke();
            // Inner white-hot core
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r * 0.3, 0, Math.PI * 2); ctx.stroke();
            if (prog < 0.3) {
                const grd = ctx.createRadialGradient(vfx.x, vfx.y, 0, vfx.x, vfx.y, r * 0.5);
                grd.addColorStop(0, 'rgba(255,255,255,0.6)');
                grd.addColorStop(1, 'rgba(255,100,0,0)');
                ctx.globalAlpha = (0.3 - prog) / 0.3;
                ctx.fillStyle = grd;
                ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r * 0.5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.shadowBlur = 0;
        }

        if (vfx.type === 'firePillar') {
            const prog = 1 - a;
            const pillarH = Math.min(prog * 4, 1) * 450;
            const fadeH = a;
            ctx.globalAlpha = fadeH * 0.8;
            // Wide fiery pillar
            const grd = ctx.createLinearGradient(vfx.x, vfx.y, vfx.x, vfx.y - pillarH);
            grd.addColorStop(0, '#e74c3c');
            grd.addColorStop(0.3, '#e67e22');
            grd.addColorStop(0.7, '#f39c12');
            grd.addColorStop(1, 'rgba(241,196,15,0)');
            ctx.fillStyle = grd;
            ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 60;
            ctx.fillRect(vfx.x - 45, vfx.y - pillarH, 90, pillarH);
            // Inner bright core
            const grd2 = ctx.createLinearGradient(vfx.x, vfx.y, vfx.x, vfx.y - pillarH);
            grd2.addColorStop(0, '#fff');
            grd2.addColorStop(0.5, '#f1c40f');
            grd2.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grd2;
            ctx.fillRect(vfx.x - 20, vfx.y - pillarH, 40, pillarH);
            ctx.shadowBlur = 0;
            // Fire particles shooting up
            if (vfx.life % 2 === 0) {
                for (let i = 0; i < 6; i++) {
                    particles.push({ x: vfx.x + (Math.random() - 0.5) * 60, y: vfx.y - Math.random() * pillarH,
                        vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 4,
                        life: 10 + Math.random() * 10, maxLife: 20,
                        color: `hsl(${15 + Math.random() * 30}, 100%, ${50 + Math.random() * 40}%)` });
                }
            }
        }

        if (vfx.type === 'windGust') {
            const prog = 1 - a;
            ctx.globalAlpha = a * 0.85;
            const sweep = prog * 400;
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
            const r = 60 + prog * 140;
            ctx.globalAlpha = a * 0.75;
            ctx.shadowColor = '#1abc9c'; ctx.shadowBlur = 25;
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

        if (vfx.type === 'iceSpike') {
            const prog = 1 - a;
            const spikeH = Math.min(prog * 5, 1) * 380;
            ctx.globalAlpha = a * 0.95;
            ctx.shadowColor = '#85c1e9'; ctx.shadowBlur = 30;

            // Main ice spike — huge jagged crystal
            const grd = ctx.createLinearGradient(vfx.x, vfx.y, vfx.x, vfx.y - spikeH);
            grd.addColorStop(0, '#2980b9');
            grd.addColorStop(0.3, '#5dade2');
            grd.addColorStop(0.6, '#aed6f1');
            grd.addColorStop(1, '#d6eaf8');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.moveTo(vfx.x - 40, vfx.y);
            ctx.lineTo(vfx.x - 25, vfx.y - spikeH * 0.35);
            ctx.lineTo(vfx.x - 12, vfx.y - spikeH * 0.65);
            ctx.lineTo(vfx.x, vfx.y - spikeH);
            ctx.lineTo(vfx.x + 14, vfx.y - spikeH * 0.6);
            ctx.lineTo(vfx.x + 28, vfx.y - spikeH * 0.3);
            ctx.lineTo(vfx.x + 40, vfx.y);
            ctx.closePath();
            ctx.fill();

            // Inner bright highlight — glassy shine
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.beginPath();
            ctx.moveTo(vfx.x - 18, vfx.y);
            ctx.lineTo(vfx.x - 8, vfx.y - spikeH * 0.55);
            ctx.lineTo(vfx.x, vfx.y - spikeH * 0.9);
            ctx.lineTo(vfx.x + 10, vfx.y - spikeH * 0.45);
            ctx.lineTo(vfx.x + 18, vfx.y);
            ctx.closePath();
            ctx.fill();

            // Side spikes — smaller crystals
            const sideH = spikeH * 0.5;
            ctx.fillStyle = '#85c1e9';
            // Left side spike
            ctx.beginPath();
            ctx.moveTo(vfx.x - 38, vfx.y);
            ctx.lineTo(vfx.x - 50, vfx.y - sideH * 0.6);
            ctx.lineTo(vfx.x - 42, vfx.y - sideH);
            ctx.lineTo(vfx.x - 30, vfx.y - sideH * 0.4);
            ctx.lineTo(vfx.x - 25, vfx.y);
            ctx.closePath();
            ctx.fill();
            // Right side spike
            ctx.beginPath();
            ctx.moveTo(vfx.x + 25, vfx.y);
            ctx.lineTo(vfx.x + 32, vfx.y - sideH * 0.4);
            ctx.lineTo(vfx.x + 45, vfx.y - sideH);
            ctx.lineTo(vfx.x + 52, vfx.y - sideH * 0.55);
            ctx.lineTo(vfx.x + 40, vfx.y);
            ctx.closePath();
            ctx.fill();

            // Bright white edge lines — crystal facets
            ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(vfx.x - 12, vfx.y - spikeH * 0.65);
            ctx.lineTo(vfx.x, vfx.y - spikeH);
            ctx.lineTo(vfx.x + 14, vfx.y - spikeH * 0.6);
            ctx.stroke();

            // Ground crack / frost spread
            ctx.strokeStyle = '#85c1e9'; ctx.lineWidth = 3;
            ctx.shadowColor = '#aed6f1'; ctx.shadowBlur = 15;
            for (let j = 0; j < 10; j++) {
                const ca = (j / 10) * Math.PI * 2;
                const cr = 30 + prog * 100;
                ctx.beginPath();
                ctx.moveTo(vfx.x, vfx.y);
                ctx.lineTo(vfx.x + Math.cos(ca) * cr, vfx.y + Math.sin(ca) * cr * 0.25);
                ctx.stroke();
            }

            // Ice dust during eruption
            if (prog < 0.4 && vfx.life % 2 === 0) {
                for (let d = 0; d < 5; d++) {
                    particles.push({ x: vfx.x + (Math.random() - 0.5) * 70, y: vfx.y - Math.random() * spikeH * 0.3,
                        vx: (Math.random() - 0.5) * 6, vy: -3 - Math.random() * 5,
                        life: 10 + Math.random() * 10, maxLife: 20,
                        color: `hsl(${200 + Math.random() * 10}, 70%, ${70 + Math.random() * 25}%)` });
                }
            }
            ctx.shadowBlur = 0;
        }

        if (vfx.type === 'earthPillar') {
            const prog = 1 - a;
            const pillarH = Math.min(prog * 5, 1) * 320;
            const pillarW = 65;
            ctx.globalAlpha = a * 0.9;
            // Stone pillar body
            ctx.fillStyle = '#6b4423';
            ctx.fillRect(vfx.x - pillarW / 2, vfx.y - pillarH, pillarW, pillarH);
            // Lighter front face
            ctx.fillStyle = '#8b5e3c';
            ctx.fillRect(vfx.x - pillarW / 2 + 6, vfx.y - pillarH, pillarW / 2 - 6, pillarH);
            // Top cap — jagged
            ctx.fillStyle = '#9b7653';
            ctx.beginPath();
            ctx.moveTo(vfx.x - pillarW / 2 - 6, vfx.y - pillarH);
            ctx.lineTo(vfx.x - pillarW / 4, vfx.y - pillarH - 15);
            ctx.lineTo(vfx.x, vfx.y - pillarH - 8);
            ctx.lineTo(vfx.x + pillarW / 4, vfx.y - pillarH - 18);
            ctx.lineTo(vfx.x + pillarW / 2 + 6, vfx.y - pillarH);
            ctx.closePath();
            ctx.fill();
            // Crack lines
            ctx.strokeStyle = '#3d2010'; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(vfx.x - 5, vfx.y - pillarH);
            ctx.lineTo(vfx.x - 10, vfx.y - pillarH * 0.5);
            ctx.lineTo(vfx.x + 3, vfx.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(vfx.x + 12, vfx.y - pillarH * 0.8);
            ctx.lineTo(vfx.x + 6, vfx.y - pillarH * 0.3);
            ctx.lineTo(vfx.x + 15, vfx.y);
            ctx.stroke();
            // Shadow at base
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(vfx.x, vfx.y + 2, pillarW * 0.8, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            // Dust at base during rise
            if (prog < 0.4 && vfx.life % 2 === 0) {
                for (let d = 0; d < 4; d++) {
                    particles.push({ x: vfx.x + (Math.random() - 0.5) * 70, y: vfx.y,
                        vx: (Math.random() - 0.5) * 6, vy: -2 - Math.random() * 4,
                        life: 10 + Math.random() * 8, maxLife: 18,
                        color: `hsl(30, 30%, ${40 + Math.random() * 25}%)` });
                }
            }
        }

        if (vfx.type === 'boulderImpact') {
            const prog = 1 - a;
            ctx.globalAlpha = a * 0.9;
            // Ground crater
            const craterW = 80 + prog * 140;
            ctx.fillStyle = '#3d2010';
            ctx.beginPath();
            ctx.ellipse(vfx.x, vfx.y, craterW, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            // Shockwave ring
            const ringR = prog * 250;
            ctx.strokeStyle = '#8b5e3c'; ctx.lineWidth = 8;
            ctx.shadowColor = '#a0522d'; ctx.shadowBlur = 30;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, ringR, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
            // Ground crack lines radiating out
            ctx.strokeStyle = '#4a2800'; ctx.lineWidth = 3;
            for (let j = 0; j < 14; j++) {
                const ca = (j / 14) * Math.PI * 2;
                const cr = 40 + prog * 150;
                ctx.beginPath();
                ctx.moveTo(vfx.x, vfx.y);
                ctx.lineTo(vfx.x + Math.cos(ca) * cr, vfx.y + Math.sin(ca) * cr * 0.3);
                ctx.stroke();
            }
            // Dust cloud
            if (prog < 0.4 && vfx.life % 2 === 0) {
                for (let d = 0; d < 5; d++) {
                    particles.push({ x: vfx.x + (Math.random() - 0.5) * 100, y: vfx.y - Math.random() * 30,
                        vx: (Math.random() - 0.5) * 5, vy: -2 - Math.random() * 4,
                        life: 12 + Math.random() * 10, maxLife: 22,
                        color: `hsl(28, 30%, ${40 + Math.random() * 25}%)` });
                }
            }
        }
        if (vfx.type === 'impactRing') {
            const prog = 1 - a;
            ctx.globalAlpha = a * 0.9;
            ctx.shadowColor = vfx.color; ctx.shadowBlur = 45;
            // Outer expanding ring
            const r1 = prog * 200;
            ctx.strokeStyle = vfx.color; ctx.lineWidth = 7 * a;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r1, 0, Math.PI * 2); ctx.stroke();
            // Mid ring
            const r15 = prog * 150;
            ctx.strokeStyle = vfx.color; ctx.lineWidth = 4 * a;
            ctx.globalAlpha = a * 0.5;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r15, 0, Math.PI * 2); ctx.stroke();
            // Inner bright ring
            ctx.globalAlpha = a * 0.9;
            const r2 = prog * 100;
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 4 * a;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r2, 0, Math.PI * 2); ctx.stroke();
            // Center flash
            if (prog < 0.4) {
                const fa = (0.4 - prog) / 0.4;
                ctx.globalAlpha = fa * 0.8;
                const fg = ctx.createRadialGradient(vfx.x, vfx.y, 0, vfx.x, vfx.y, 90);
                fg.addColorStop(0, '#fff');
                fg.addColorStop(0.4, vfx.color);
                fg.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = fg;
                ctx.beginPath(); ctx.arc(vfx.x, vfx.y, 90, 0, Math.PI * 2); ctx.fill();
            }
            ctx.shadowBlur = 0;
        }

        // ── Inferno Laser Beam (Fire Rage) ──
        if (vfx.type === 'laserBeam') {
            const prog = 1 - a;
            const reveal = Math.min(prog * 5, 1);
            const beamLen = (vfx.x2 - vfx.x1) * reveal;
            const endX = vfx.x1 + beamLen;
            // Outer red glow
            ctx.globalAlpha = a * 0.4;
            ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 40 * a;
            ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 60;
            ctx.beginPath(); ctx.moveTo(vfx.x1, vfx.y1); ctx.lineTo(endX, vfx.y1); ctx.stroke();
            // Mid orange beam
            ctx.globalAlpha = a * 0.7;
            ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 22 * a;
            ctx.beginPath(); ctx.moveTo(vfx.x1, vfx.y1); ctx.lineTo(endX, vfx.y1); ctx.stroke();
            // Main bright beam
            ctx.globalAlpha = a * 0.9;
            ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 12 * a;
            ctx.beginPath(); ctx.moveTo(vfx.x1, vfx.y1); ctx.lineTo(endX, vfx.y1); ctx.stroke();
            // White-hot core
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 5 * a;
            ctx.beginPath(); ctx.moveTo(vfx.x1, vfx.y1); ctx.lineTo(endX, vfx.y1); ctx.stroke();
            // Heat shimmer particles along beam
            if (vfx.life % 2 === 0) {
                for (let i = 0; i < 5; i++) {
                    const px = vfx.x1 + Math.random() * beamLen;
                    particles.push({ x: px, y: vfx.y1 + (Math.random() - 0.5) * 20,
                        vx: (Math.random() - 0.5) * 3, vy: -2 - Math.random() * 4,
                        life: 8 + Math.random() * 8, maxLife: 16,
                        color: `hsl(${10 + Math.random() * 30}, 100%, ${50 + Math.random() * 35}%)` });
                }
            }
            // Bright origin point
            if (prog < 0.3) {
                ctx.globalAlpha = (0.3 - prog) / 0.3 * 0.8;
                const og = ctx.createRadialGradient(vfx.x1, vfx.y1, 0, vfx.x1, vfx.y1, 50);
                og.addColorStop(0, '#fff'); og.addColorStop(0.3, '#f39c12'); og.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = og;
                ctx.beginPath(); ctx.arc(vfx.x1, vfx.y1, 50, 0, Math.PI * 2); ctx.fill();
            }
            ctx.shadowBlur = 0;
        }

        // ── Acid Rain ──
        if (vfx.type === 'acidRain') {
            const prog = 1 - a;
            ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 15;
            // Falling acid drops
            ctx.globalAlpha = a * 0.8;
            for (let j = 0; j < 14; j++) {
                const dx = (Math.random() - 0.5) * 160;
                const dropY = -20 + prog * (groundY + 40) * ((j + Math.sin(vfx.life * 0.3 + j)) / 14);
                const dropLen = 12 + Math.random() * 10;
                ctx.strokeStyle = `hsl(${110 + Math.random() * 15}, 100%, ${50 + Math.random() * 30}%)`;
                ctx.lineWidth = 2 + Math.random() * 2;
                ctx.beginPath();
                ctx.moveTo(vfx.x + dx, dropY);
                ctx.lineTo(vfx.x + dx, dropY + dropLen);
                ctx.stroke();
            }
            // Acid puddle on ground
            if (prog > 0.3) {
                const puddleW = (prog - 0.3) / 0.7 * 120;
                ctx.globalAlpha = a * 0.5;
                ctx.fillStyle = '#39ff14';
                ctx.beginPath();
                ctx.ellipse(vfx.x, vfx.y, puddleW, 8, 0, 0, Math.PI * 2);
                ctx.fill();
                // Bubbles in puddle
                ctx.fillStyle = '#7fff00';
                for (let b = 0; b < 5; b++) {
                    const bx = vfx.x + (Math.random() - 0.5) * puddleW * 1.5;
                    const br = 2 + Math.random() * 3;
                    ctx.beginPath(); ctx.arc(bx, vfx.y - Math.random() * 6, br, 0, Math.PI * 2); ctx.fill();
                }
            }
            ctx.shadowBlur = 0;
        }

        // ── Acid Slash ──
        if (vfx.type === 'acidSlash') {
            const prog = 1 - a;
            const reveal = Math.min(prog * 4, 1); // slash sweeps across fast
            ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 30;

            // Draw the curved slash line using quadratic bezier
            // Outer glow
            ctx.globalAlpha = a * 0.5;
            ctx.strokeStyle = '#39ff14'; ctx.lineWidth = 22 * a;
            ctx.beginPath();
            ctx.moveTo(vfx.x1, vfx.y1);
            const partCx = vfx.x1 + (vfx.cx - vfx.x1) * reveal;
            const partCy = vfx.y1 + (vfx.cy - vfx.y1) * reveal;
            const partEx = vfx.x1 + (vfx.x2 - vfx.x1) * reveal;
            const partEy = vfx.y1 + (vfx.y2 - vfx.y1) * reveal;
            ctx.quadraticCurveTo(partCx, partCy, partEx, partEy);
            ctx.stroke();

            // Main bright slash
            ctx.globalAlpha = a * 0.85;
            ctx.strokeStyle = '#7fff00'; ctx.lineWidth = 10 * a;
            ctx.beginPath();
            ctx.moveTo(vfx.x1, vfx.y1);
            ctx.quadraticCurveTo(partCx, partCy, partEx, partEy);
            ctx.stroke();

            // White-hot core
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 4 * a;
            ctx.beginPath();
            ctx.moveTo(vfx.x1, vfx.y1);
            ctx.quadraticCurveTo(partCx, partCy, partEx, partEy);
            ctx.stroke();

            // Acid drips falling from the slash curve
            if (vfx.life % 2 === 0) {
                const t = Math.random() * reveal;
                const dx = (1 - t) * (1 - t) * vfx.x1 + 2 * (1 - t) * t * vfx.cx + t * t * vfx.x2;
                const dy = (1 - t) * (1 - t) * vfx.y1 + 2 * (1 - t) * t * vfx.cy + t * t * vfx.y2;
                particles.push({ x: dx, y: dy,
                    vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 4,
                    life: 10 + Math.random() * 8, maxLife: 18,
                    color: `hsl(${110 + Math.random() * 15}, 100%, ${45 + Math.random() * 30}%)` });
            }
            ctx.shadowBlur = 0;
        }

        // ── Acid Monster Impact ──
        if (vfx.type === 'acidMonsterImpact') {
            const prog = 1 - a;
            const r = prog * 180;
            ctx.globalAlpha = a * 0.7;
            ctx.strokeStyle = '#39ff14'; ctx.lineWidth = 8;
            ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 40;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#7fff00'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r * 0.6, 0, Math.PI * 2); ctx.stroke();
            if (prog < 0.3) {
                ctx.globalAlpha = (0.3 - prog) / 0.3 * 0.7;
                const fg = ctx.createRadialGradient(vfx.x, vfx.y, 0, vfx.x, vfx.y, 100);
                fg.addColorStop(0, '#fff'); fg.addColorStop(0.3, '#39ff14'); fg.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = fg;
                ctx.beginPath(); ctx.arc(vfx.x, vfx.y, 100, 0, Math.PI * 2); ctx.fill();
            }
            ctx.shadowBlur = 0;
        }

        // ── Rage Activation Burst ──
        if (vfx.type === 'rageActivation') {
            const prog = 1 - a;
            const r = prog * 200;
            ctx.globalAlpha = a * 0.7;
            ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 6 * a;
            ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 40;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#ff6600'; ctx.lineWidth = 3 * a;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r * 0.6, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * a;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r * 0.3, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // ── Screen Fracture (Water Rage) ──
        if (vfx.type === 'screenFracture') {
            const prog = 1 - a;
            const reveal = Math.min(prog * 3, 1);
            // Dark overlay
            ctx.globalAlpha = a * 0.15;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Main cracks — white/cyan
            ctx.globalAlpha = a * 0.9;
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
            ctx.shadowColor = '#85c1e9'; ctx.shadowBlur = 15;
            for (const crack of vfx.cracks) {
                const segs = Math.floor(crack.length * reveal);
                if (segs < 2) continue;
                ctx.beginPath(); ctx.moveTo(crack[0].x, crack[0].y);
                for (let j = 1; j < segs; j++) ctx.lineTo(crack[j].x, crack[j].y);
                ctx.stroke();
            }
            // Branch cracks
            ctx.lineWidth = 1.5; ctx.globalAlpha = a * 0.5; ctx.strokeStyle = '#aed6f1';
            for (const crack of vfx.cracks) {
                const segs = Math.floor(crack.length * reveal);
                for (let j = 1; j < segs; j += 2) {
                    const ba = Math.atan2(crack[j].y - crack[Math.max(0, j - 1)].y, crack[j].x - crack[Math.max(0, j - 1)].x) + (j % 2 === 0 ? 0.8 : -0.8);
                    const bl = 15 + Math.random() * 35;
                    ctx.beginPath(); ctx.moveTo(crack[j].x, crack[j].y);
                    ctx.lineTo(crack[j].x + Math.cos(ba) * bl, crack[j].y + Math.sin(ba) * bl);
                    ctx.stroke();
                }
            }
            // Center impact glow
            if (prog < 0.3) {
                ctx.globalAlpha = (0.3 - prog) / 0.3 * 0.6;
                const fg = ctx.createRadialGradient(vfx.x, vfx.y, 0, vfx.x, vfx.y, 150);
                fg.addColorStop(0, '#fff'); fg.addColorStop(0.3, '#85c1e9'); fg.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = fg;
                ctx.beginPath(); ctx.arc(vfx.x, vfx.y, 150, 0, Math.PI * 2); ctx.fill();
            }
            ctx.shadowBlur = 0;
        }

        // ── Screen Lightning Storm (Lightning Rage) ──
        if (vfx.type === 'screenLightningStorm') {
            ctx.globalAlpha = a * 0.2;
            ctx.fillStyle = '#f1c40f';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Random bolts across the screen
            if (vfx.life % 3 === 0) {
                spawnLightningBolt(Math.random() * canvas.width, 0, groundY, 4 + Math.random() * 5);
            }
            // Electrical arcs
            ctx.globalAlpha = a * 0.6;
            ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2;
            ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 20;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                let bx = Math.random() * canvas.width, by = 0;
                ctx.moveTo(bx, by);
                while (by < canvas.height) {
                    bx += (Math.random() - 0.5) * 80;
                    by += 20 + Math.random() * 40;
                    ctx.lineTo(bx, by);
                }
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }

        // ── Screen Inferno (Fire Rage) ──
        if (vfx.type === 'screenInferno') {
            // Screen-wide fire overlay
            ctx.globalAlpha = a * 0.25;
            const fireGrd = ctx.createLinearGradient(0, canvas.height, 0, 0);
            fireGrd.addColorStop(0, '#e74c3c'); fireGrd.addColorStop(0.4, '#e67e22');
            fireGrd.addColorStop(0.7, 'rgba(243,156,18,0.3)'); fireGrd.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = fireGrd;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Fire from edges
            ctx.globalAlpha = a * 0.35;
            for (let side = 0; side < 2; side++) {
                const sx = side === 0 ? 0 : canvas.width;
                const eg = ctx.createLinearGradient(sx, 0, sx + (side === 0 ? 200 : -200), 0);
                eg.addColorStop(0, 'rgba(231,76,60,0.6)'); eg.addColorStop(0.5, 'rgba(230,126,34,0.2)'); eg.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = eg;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            // Fire particles from bottom
            if (vfx.life % 2 === 0) {
                for (let i = 0; i < 8; i++) {
                    particles.push({ x: Math.random() * canvas.width, y: canvas.height,
                        vx: (Math.random() - 0.5) * 4, vy: -5 - Math.random() * 10,
                        life: 15 + Math.random() * 15, maxLife: 30,
                        color: `hsl(${10 + Math.random() * 25}, 100%, ${45 + Math.random() * 35}%)` });
                }
            }
        }

        // ── Screen Tear (Wind Rage) ──
        if (vfx.type === 'screenTear') {
            const prog = 1 - a;
            const reveal = Math.min(prog * 4, 1);
            const slashLen = vfx.length * reveal;
            const sx = vfx.x - Math.cos(vfx.angle) * slashLen * 0.5;
            const sy = vfx.y - Math.sin(vfx.angle) * slashLen * 0.5;
            const ex = vfx.x + Math.cos(vfx.angle) * slashLen * 0.5;
            const ey = vfx.y + Math.sin(vfx.angle) * slashLen * 0.5;
            // Bright slash line
            ctx.globalAlpha = a;
            ctx.strokeStyle = '#1abc9c'; ctx.lineWidth = 8;
            ctx.shadowColor = '#1abc9c'; ctx.shadowBlur = 35;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
            // Dark void behind slash
            const perpAngle = vfx.angle + Math.PI / 2;
            ctx.globalAlpha = a * 0.3;
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
            ctx.lineTo(ex + Math.cos(perpAngle) * 12, ey + Math.sin(perpAngle) * 12);
            ctx.lineTo(sx + Math.cos(perpAngle) * 12, sy + Math.sin(perpAngle) * 12);
            ctx.closePath(); ctx.fill();
            // Particles along the slash
            if (vfx.life % 3 === 0) {
                const t = Math.random();
                const px = sx + (ex - sx) * t, py = sy + (ey - sy) * t;
                particles.push({ x: px, y: py,
                    vx: Math.cos(perpAngle) * (3 + Math.random() * 4), vy: Math.sin(perpAngle) * (3 + Math.random() * 4),
                    life: 8 + Math.random() * 8, maxLife: 16, color: '#a3e4d7' });
            }
            ctx.shadowBlur = 0;
        }

        // ── Screen Shatter (Earth Rage) ──
        if (vfx.type === 'screenShatter') {
            const prog = 1 - a;
            const reveal = Math.min(prog * 3, 1);
            // Earth-colored cracks
            ctx.globalAlpha = a * 0.85;
            ctx.strokeStyle = '#a0522d'; ctx.lineWidth = 4;
            ctx.shadowColor = '#a0522d'; ctx.shadowBlur = 12;
            for (const crack of vfx.cracks) {
                const segs = Math.floor(crack.length * reveal);
                if (segs < 2) continue;
                ctx.beginPath(); ctx.moveTo(crack[0].x, crack[0].y);
                for (let j = 1; j < segs; j++) ctx.lineTo(crack[j].x, crack[j].y);
                ctx.stroke();
            }
            // Inner lighter cracks
            ctx.strokeStyle = '#d4a36e'; ctx.lineWidth = 2; ctx.globalAlpha = a * 0.5;
            for (const crack of vfx.cracks) {
                const segs = Math.floor(crack.length * reveal);
                if (segs < 2) continue;
                ctx.beginPath(); ctx.moveTo(crack[0].x, crack[0].y);
                for (let j = 1; j < segs; j++) ctx.lineTo(crack[j].x, crack[j].y);
                ctx.stroke();
            }
            // Ground dust
            if (vfx.life % 3 === 0) {
                for (let i = 0; i < 4; i++) {
                    particles.push({ x: Math.random() * canvas.width, y: groundY,
                        vx: (Math.random() - 0.5) * 5, vy: -3 - Math.random() * 6,
                        life: 10 + Math.random() * 10, maxLife: 20,
                        color: `hsl(28, 35%, ${35 + Math.random() * 25}%)` });
                }
            }
            ctx.shadowBlur = 0;
        }

        // ── Screen Meltdown (Acid Rage) ──
        if (vfx.type === 'screenMeltdown') {
            const prog = 1 - a;
            // Toxic green overlay
            ctx.globalAlpha = a * 0.2;
            ctx.fillStyle = '#39ff14';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Acid dripping from top of screen
            ctx.globalAlpha = a * 0.7;
            for (let i = 0; i < 16; i++) {
                const dx = (i / 16) * canvas.width + Math.sin(Date.now() * 0.003 + i) * 20;
                const dripH = (Math.sin(Date.now() * 0.005 + i * 1.5) * 0.5 + 0.5) * 200 * prog;
                const dg = ctx.createLinearGradient(dx, 0, dx, dripH);
                dg.addColorStop(0, 'rgba(57,255,20,0.6)'); dg.addColorStop(0.7, 'rgba(57,255,20,0.2)');
                dg.addColorStop(1, 'rgba(57,255,20,0)');
                ctx.fillStyle = dg;
                ctx.fillRect(dx - 8, 0, 16, dripH);
            }
            // Acid bubbles rising from bottom
            if (vfx.life % 2 === 0) {
                for (let i = 0; i < 6; i++) {
                    particles.push({ x: Math.random() * canvas.width, y: canvas.height,
                        vx: (Math.random() - 0.5) * 3, vy: -4 - Math.random() * 8,
                        life: 12 + Math.random() * 12, maxLife: 24,
                        color: `hsl(${110 + Math.random() * 15}, 100%, ${45 + Math.random() * 35}%)` });
                }
            }
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

        // ── Boulder Crush phased movement ──
        if (p.isBoulder) {
            p.phaseTimer++;
            if (p.phase === 'rise') {
                // Rise out of the ground
                p.vy = -3.5;
                p.vx = 0;
                // Ground ripping dust
                if (p.phaseTimer % 3 === 0) {
                    for (let d = 0; d < 3; d++) {
                        particles.push({ x: p.x + (Math.random() - 0.5) * 60, y: groundY,
                            vx: (Math.random() - 0.5) * 5, vy: -2 - Math.random() * 5,
                            life: 12 + Math.random() * 10, maxLife: 22,
                            color: `hsl(28, 40%, ${30 + Math.random() * 25}%)` });
                    }
                }
                if (p.phaseTimer >= 35) {
                    p.phase = 'hold';
                    p.phaseTimer = 0;
                    p.vy = 0;
                }
            } else if (p.phase === 'hold') {
                // Hover in the air, slight wobble
                p.vy = Math.sin(p.phaseTimer * 0.15) * 0.5;
                p.vx = 0;
                if (p.phaseTimer >= 20) {
                    p.phase = 'slam';
                    p.phaseTimer = 0;
                    // Aim at opponent's current position
                    p.targetX = p.target.x;
                    p.slamStartX = p.x;
                    p.slamStartY = p.y;
                }
            } else if (p.phase === 'slam') {
                // Arc toward opponent and smash down
                const slamDuration = 25;
                const t = Math.min(p.phaseTimer / slamDuration, 1);
                const ease = t * t; // accelerate into slam
                p.x = p.slamStartX + (p.targetX - p.slamStartX) * ease;
                p.y = p.slamStartY + (groundY - p.slamStartY) * ease;
                p.vx = 0;
                p.vy = 0;

                if (t >= 1 || p.y >= groundY - 5) {
                    // SLAM — massive impact
                    triggerScreenShake(40, 45);
                    triggerHitstop(12);
                    spawnBoulderImpact(p.x, groundY);
                    // Check if close enough to hit
                    const hitDist = Math.abs(p.x - p.target.x);
                    if (hitDist < p.radius + 40) {
                        let damage = p.atk.damage;
                        if (p.owner.rageActive) damage = Math.floor(damage * 1.5);
                        let kb = p.atk.knockback;
                        if (p.target.blocking) {
                            damage = Math.floor(damage * (1 - p.atk.blockReduction));
                            kb *= (1 - p.atk.blockReduction);
                        }
                        p.target.health = Math.max(0, p.target.health - damage);
                        p.target.hitTimer = 25;
                        p.target.hit = true;
                        p.target.x += p.dir * kb;
                        visualEffects.push({ type: 'impactRing', x: p.x, y: groundY - 30, life: 22, maxLife: 22, color: '#a0522d' });
                        if (p.rageVfx) triggerRageUltVFX(p.rageVfx, p.x, groundY - 30, p.dir);
                    }
                    projectiles.splice(i, 1);
                    continue;
                }
            }
        }

        p.x += p.vx;
        p.y += (p.vy || 0);
        p.life--;

        // Skip trail/hit for boulders (handled above)
        if (p.isBoulder) {
            if (p.life <= 0) { projectiles.splice(i, 1); }
            continue;
        }

        // ── Acid Monster phased movement ──
        if (p.isAcidMonster) {
            p.phaseTimer++;
            if (p.phase === 'rise') {
                // Monster slowly rises from the ground — menacing
                p.vy = -2;
                // Continuous rumble shake
                if (p.phaseTimer % 5 === 0) triggerScreenShake(6, 6);
                // Lots of acid erupting from ground
                if (p.phaseTimer % 2 === 0) {
                    for (let d = 0; d < 5; d++) {
                        particles.push({ x: p.x + (Math.random() - 0.5) * 180, y: groundY,
                            vx: (Math.random() - 0.5) * 6, vy: -3 - Math.random() * 7,
                            life: 12 + Math.random() * 12, maxLife: 24,
                            color: `hsl(${110 + Math.random() * 15}, 100%, ${35 + Math.random() * 35}%)` });
                    }
                }
                // Roar flash at start
                if (p.phaseTimer === 1) {
                    triggerScreenShake(15, 15);
                    triggerScreenFlash('#39ff14', 0.3);
                }
                if (p.phaseTimer >= 40) {
                    p.phase = 'punch';
                    p.phaseTimer = 0;
                    p.vy = 0;
                    triggerScreenShake(10, 10);
                }
            } else if (p.phase === 'punch') {
                p.vy = 0; p.vx = 0;
                // Punch hits at frame 12
                if (p.phaseTimer === 12) {
                    triggerScreenShake(40, 40);
                    triggerHitstop(14);
                    triggerScreenFlash('#39ff14', 0.5);
                    spawnAcidMonsterImpact(p.target.x, p.target.y - p.target.height * 0.5);
                    const hitDist = Math.abs(p.x - p.target.x);
                    if (hitDist < p.radius + 120) {
                        let damage = p.atk.damage;
                        if (p.owner.rageActive) damage = Math.floor(damage * 1.5);
                        let kb = p.atk.knockback;
                        if (p.target.blocking) {
                            damage = Math.floor(damage * (1 - p.atk.blockReduction));
                            kb *= (1 - p.atk.blockReduction);
                        }
                        p.target.health = Math.max(0, p.target.health - damage);
                        p.target.hitTimer = 20;
                        p.target.hit = true;
                        p.target.x += p.dir * kb;
                        p.target.vy = -8;
                        p.target.onGround = false;
                        visualEffects.push({ type: 'impactRing', x: p.target.x, y: p.target.y - p.target.height * 0.5, life: 25, maxLife: 25, color: '#39ff14' });
                        if (p.rageVfx) triggerRageUltVFX(p.rageVfx, p.target.x, p.target.y - p.target.height * 0.5, p.dir);
                    }
                }
                if (p.phaseTimer >= 25) {
                    p.phase = 'sink';
                    p.phaseTimer = 0;
                }
            } else if (p.phase === 'sink') {
                p.vy = 3;
                if (p.phaseTimer >= 25 || p.y >= groundY + 10) {
                    projectiles.splice(i, 1);
                    continue;
                }
            }
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) { projectiles.splice(i, 1); }
            continue;
        }

        p.trail.push({ x: p.x, y: p.y, alpha: 1 });
        if (p.trail.length > 35) p.trail.shift();
        for (const t of p.trail) t.alpha *= 0.87;

        // Hit detection
        const hitY = p.isMeteor ? p.y : (p.target.y - p.target.height * 0.5);
        const dx = p.x - p.target.x;
        const dy = (p.isMeteor ? p.y : p.y) - hitY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < p.radius + 30) {
            let damage = p.atk.damage;
            if (p.owner.rageActive) damage = Math.floor(damage * 1.5);
            let kb = p.atk.knockback;
            if (p.target.blocking) {
                damage = Math.floor(damage * (1 - p.atk.blockReduction));
                kb *= (1 - p.atk.blockReduction);
            }
            p.target.health = Math.max(0, p.target.health - damage);
            p.target.hitTimer = 15;
            p.target.hit = true;
            p.target.x += (p.vx > 0 ? 1 : p.vx < 0 ? -1 : p.owner.facing) * kb;

            spawnElementParticles(p.x, p.y, p.styleData, p.owner.rageActive ? 100 : 60);
            if (p.rageVfx) triggerRageUltVFX(p.rageVfx, p.x, p.y, p.owner.facing);
            // Impact effects scale with damage
            const impactPow = p.atk.damage;
            triggerScreenShake(Math.min(impactPow * 1.2, 28), Math.min(impactPow * 1.0, 30));
            triggerHitstop(Math.max(3, Math.floor(impactPow / 5)));
            triggerScreenFlash(p.styleData.color, Math.min(impactPow / 35, 0.6));
            visualEffects.push({ type: 'impactRing', x: p.x, y: p.y, life: 25, maxLife: 25, color: p.styleData.color });
            if (p.isMeteor) {
                triggerScreenShake(40, 45);
                triggerHitstop(14);
                triggerScreenFlash('#ff4400', 0.85);
                spawnMeteorImpact(p.x, p.y);
            }
            projectiles.splice(i, 1);
            continue;
        }

        // Meteor hits ground (missed)
        if (p.isMeteor && p.y >= groundY) {
            triggerScreenShake(30, 30);
            triggerHitstop(8);
            triggerScreenFlash('#ff4400', 0.6);
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
            ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 35;
            // Core bolt shape
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill();
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
            ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 50;
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
            ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 40;
            // Outer fire
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 1.6);
            g.addColorStop(0, '#fff');
            g.addColorStop(0.2, '#f39c12');
            g.addColorStop(0.5, '#e67e22');
            g.addColorStop(0.8, '#e74c3c');
            g.addColorStop(1, 'rgba(231,76,60,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 1.6, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Fire particles
            if (Math.random() < 0.85) {
                particles.push({ x: p.x + (Math.random() - 0.5) * 12, y: p.y + (Math.random() - 0.5) * 12,
                    vx: (Math.random() - 0.5) * 3 - p.vx * 0.2, vy: -1 - Math.random() * 3,
                    life: 8 + Math.random() * 8, maxLife: 16,
                    color: `hsl(${10 + Math.random() * 30}, 100%, ${50 + Math.random() * 35}%)` });
            }
        }

        // ─── FIRE: Meteor ───
        else if (draw === 'meteor') {
            // Massive flame trail
            for (const t of p.trail) {
                ctx.globalAlpha = t.alpha * 0.6;
                const tr = p.radius * t.alpha * 0.8;
                ctx.fillStyle = `hsl(${15 + (1 - t.alpha) * 20}, 100%, ${40 + (1 - t.alpha) * 35}%)`;
                ctx.beginPath(); ctx.arc(t.x, t.y, tr, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 80;
            // Outer fire glow
            const og = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2.5);
            og.addColorStop(0, 'rgba(255,100,0,0.5)');
            og.addColorStop(0.5, 'rgba(231,76,60,0.2)');
            og.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = og;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2); ctx.fill();
            // Rock body
            ctx.fillStyle = '#5a2d0c';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 0.65, 0, Math.PI * 2); ctx.fill();
            // Dark cracks on rock
            ctx.strokeStyle = '#2a1500'; ctx.lineWidth = 2;
            for (let j = 0; j < 4; j++) {
                const ca = (j / 4) * Math.PI * 2 + 0.3;
                ctx.beginPath(); ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + Math.cos(ca) * p.radius * 0.5, p.y + Math.sin(ca) * p.radius * 0.5);
                ctx.stroke();
            }
            // Fire envelope
            const mg = ctx.createRadialGradient(p.x, p.y - 5, p.radius * 0.2, p.x, p.y, p.radius * 1.5);
            mg.addColorStop(0, 'rgba(255,255,255,0.9)');
            mg.addColorStop(0.15, '#f39c12');
            mg.addColorStop(0.4, '#e67e22');
            mg.addColorStop(0.7, 'rgba(231,76,60,0.5)');
            mg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = mg;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Lots of embers streaming off
            for (let e = 0; e < 3; e++) {
                particles.push({ x: p.x + (Math.random() - 0.5) * p.radius, y: p.y + (Math.random() - 0.5) * p.radius,
                    vx: (Math.random() - 0.5) * 6, vy: -2 - Math.random() * 5,
                    life: 12 + Math.random() * 12, maxLife: 24,
                    color: `hsl(${8 + Math.random() * 30}, 100%, ${45 + Math.random() * 40}%)` });
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
            const waveH = 95;
            const waveW = 75;
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
            const waveH = 180;
            const waveW = 110;
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
            const h = 140;
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

        // ─── EARTH: Rock Shot ───
        else if (draw === 'rockShot') {
            const dir = p.vx > 0 ? 1 : -1;
            // Dust trail
            for (const t of p.trail) {
                ctx.globalAlpha = t.alpha * 0.3;
                ctx.fillStyle = '#8b6b47';
                ctx.beginPath(); ctx.arc(t.x, t.y, p.radius * 0.35, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
            // Jagged rock shape
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(Date.now() * 0.008 * dir);
            ctx.fillStyle = '#6b4423';
            ctx.beginPath();
            ctx.moveTo(0, -p.radius);
            ctx.lineTo(p.radius * 0.7, -p.radius * 0.4);
            ctx.lineTo(p.radius, p.radius * 0.2);
            ctx.lineTo(p.radius * 0.5, p.radius);
            ctx.lineTo(-p.radius * 0.3, p.radius * 0.8);
            ctx.lineTo(-p.radius, p.radius * 0.1);
            ctx.lineTo(-p.radius * 0.6, -p.radius * 0.6);
            ctx.closePath();
            ctx.fill();
            // Lighter highlight
            ctx.fillStyle = '#9b7653';
            ctx.beginPath();
            ctx.moveTo(0, -p.radius * 0.8);
            ctx.lineTo(p.radius * 0.5, -p.radius * 0.2);
            ctx.lineTo(p.radius * 0.2, p.radius * 0.3);
            ctx.lineTo(-p.radius * 0.3, -p.radius * 0.1);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            // Dust puffs
            if (Math.random() < 0.4) {
                particles.push({ x: p.x - dir * 8, y: p.y + (Math.random() - 0.5) * 10,
                    vx: -dir * (1 + Math.random() * 2), vy: (Math.random() - 0.5) * 2,
                    life: 6 + Math.random() * 5, maxLife: 11,
                    color: `hsl(30, 30%, ${45 + Math.random() * 20}%)` });
            }
        }

        // ─── EARTH: Seismic Wave ───
        else if (draw === 'seismicWave') {
            const dir = p.vx > 0 ? 1 : -1;
            ctx.save();
            ctx.translate(p.x, groundY);
            ctx.globalAlpha = 0.9;
            // Ground chunks rising up — big jagged pillars
            for (let j = 0; j < 8; j++) {
                const offset = (j - 3.5) * 22 * dir;
                const peakness = 1 - Math.abs(j - 3.5) / 4;
                const chunkH = 30 + Math.sin(Date.now() * 0.012 + j) * 12 + peakness * 50;
                const chunkW = 16 + peakness * 8;
                ctx.fillStyle = j % 2 === 0 ? '#5a3a1a' : '#7a5a3a';
                // Jagged top
                ctx.beginPath();
                ctx.moveTo(offset - chunkW / 2, 0);
                ctx.lineTo(offset - chunkW / 2, -chunkH * 0.7);
                ctx.lineTo(offset - chunkW / 4, -chunkH);
                ctx.lineTo(offset + chunkW / 4, -chunkH * 0.85);
                ctx.lineTo(offset + chunkW / 2, -chunkH * 0.6);
                ctx.lineTo(offset + chunkW / 2, 0);
                ctx.closePath();
                ctx.fill();
                // Lighter face
                ctx.fillStyle = '#8b6a4a';
                ctx.beginPath();
                ctx.moveTo(offset - chunkW / 4, -chunkH * 0.9);
                ctx.lineTo(offset + chunkW / 4, -chunkH * 0.75);
                ctx.lineTo(offset + chunkW / 3, -chunkH * 0.2);
                ctx.lineTo(offset, -chunkH * 0.3);
                ctx.closePath();
                ctx.fill();
            }
            // Ground crack line
            ctx.strokeStyle = '#4a3020'; ctx.lineWidth = 4;
            ctx.shadowColor = '#a0522d'; ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(-80 * dir, 2);
            ctx.lineTo(80 * dir, 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
            // Heavy dust clouds
            if (Math.random() < 0.8) {
                for (let d = 0; d < 2; d++) {
                    particles.push({ x: p.x + (Math.random() - 0.5) * 60, y: groundY - Math.random() * 25,
                        vx: dir * (1 + Math.random() * 3), vy: -2 - Math.random() * 4,
                        life: 10 + Math.random() * 10, maxLife: 20,
                        color: `hsl(28, 35%, ${35 + Math.random() * 25}%)` });
                }
            }
        }

        // ─── EARTH: Boulder Crush ───
        else if (draw === 'boulderCrush') {
            const r = p.radius;
            const rot = p.phase === 'slam' ? Date.now() * 0.012 : Date.now() * 0.003;

            ctx.globalAlpha = 1;

            // Ground rip hole during rise phase
            if (p.phase === 'rise') {
                ctx.save();
                ctx.fillStyle = '#2a1200';
                ctx.beginPath();
                ctx.ellipse(p.originX, groundY, r * 1.2, 15, 0, 0, Math.PI * 2);
                ctx.fill();
                // Jagged edges around hole
                ctx.strokeStyle = '#4a2800'; ctx.lineWidth = 3;
                for (let j = 0; j < 8; j++) {
                    const ca = (j / 8) * Math.PI * 2;
                    const cr = r * 1.2 + Math.sin(j * 2.3) * 10;
                    ctx.beginPath();
                    ctx.moveTo(p.originX + Math.cos(ca) * r * 0.8, groundY + Math.sin(ca) * 8);
                    ctx.lineTo(p.originX + Math.cos(ca) * cr, groundY + Math.sin(ca) * 12);
                    ctx.stroke();
                }
                ctx.restore();
            }

            // Shadow on ground
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(p.x, groundY + 3, r * 0.8, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            // The boulder itself
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(rot);
            ctx.shadowColor = '#4a2800'; ctx.shadowBlur = 25;

            // Main rock body — big jagged shape
            ctx.fillStyle = '#4a2a10';
            ctx.beginPath();
            for (let j = 0; j < 12; j++) {
                const a = (j / 12) * Math.PI * 2;
                const rr = r * (0.82 + Math.sin(j * 4.1) * 0.18);
                if (j === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
                else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
            }
            ctx.closePath();
            ctx.fill();

            // Lighter face
            ctx.fillStyle = '#6b4a2a';
            ctx.beginPath();
            ctx.moveTo(-r * 0.4, -r * 0.7);
            ctx.lineTo(r * 0.5, -r * 0.5);
            ctx.lineTo(r * 0.6, r * 0.15);
            ctx.lineTo(-r * 0.15, r * 0.5);
            ctx.lineTo(-r * 0.6, 0);
            ctx.closePath();
            ctx.fill();

            // Even lighter highlight
            ctx.fillStyle = '#8b6a4a';
            ctx.beginPath();
            ctx.moveTo(-r * 0.1, -r * 0.5);
            ctx.lineTo(r * 0.3, -r * 0.35);
            ctx.lineTo(r * 0.25, r * 0.05);
            ctx.lineTo(-r * 0.2, -r * 0.1);
            ctx.closePath();
            ctx.fill();

            // Deep cracks
            ctx.strokeStyle = '#1a0800'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.2); ctx.lineTo(r * 0.15, r * 0.6); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(r * 0.25, -r * 0.7); ctx.lineTo(-r * 0.25, r * 0.15); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-r * 0.15, -r * 0.85); ctx.lineTo(r * 0.5, 0); ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.restore();

            // Dust falling off during all phases
            if (Math.random() < 0.7) {
                for (let e = 0; e < 2; e++) {
                    particles.push({ x: p.x + (Math.random() - 0.5) * r, y: p.y + (Math.random() - 0.5) * r,
                        vx: (Math.random() - 0.5) * 3, vy: 1 + Math.random() * 3,
                        life: 8 + Math.random() * 8, maxLife: 16,
                        color: `hsl(${25 + Math.random() * 15}, ${30 + Math.random() * 20}%, ${30 + Math.random() * 25}%)` });
                }
            }

            // Slam speed lines during slam phase
            if (p.phase === 'slam') {
                ctx.globalAlpha = 0.5;
                ctx.strokeStyle = '#a08060'; ctx.lineWidth = 2;
                for (let j = 0; j < 5; j++) {
                    const lx = p.x + (Math.random() - 0.5) * r * 1.5;
                    const ly = p.y - r - Math.random() * 40;
                    ctx.beginPath();
                    ctx.moveTo(lx, ly);
                    ctx.lineTo(lx + (Math.random() - 0.5) * 10, ly - 20 - Math.random() * 30);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            }
        }

        // ─── ACID: Acid Barrage ───
        else if (draw === 'acidBarrage') {
            for (const t of p.trail) {
                ctx.globalAlpha = t.alpha * 0.4;
                ctx.fillStyle = '#39ff14';
                ctx.beginPath(); ctx.arc(t.x, t.y, p.radius * 0.4, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 20;
            const ag = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 1.3);
            ag.addColorStop(0, '#fff'); ag.addColorStop(0.25, '#7fff00');
            ag.addColorStop(0.6, '#39ff14'); ag.addColorStop(1, 'rgba(57,255,20,0)');
            ctx.fillStyle = ag;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 1.3, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Acid drips
            if (Math.random() < 0.4) {
                particles.push({ x: p.x, y: p.y + p.radius * 0.5,
                    vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 2,
                    life: 6 + Math.random() * 4, maxLife: 10, color: '#39ff14' });
            }
        }

        // ─── ACID: Acid Monster ───
        else if (draw === 'acidMonster') {
            ctx.globalAlpha = 1;
            ctx.save();
            ctx.translate(p.x, p.y);

            const bodyH = 280;
            const bodyW = 140;
            const breathe = Math.sin(Date.now() * 0.005) * 4;

            // Massive toxic acid pool spreading on ground
            ctx.fillStyle = 'rgba(57, 255, 20, 0.35)';
            ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 25;
            ctx.beginPath();
            ctx.ellipse(0, groundY - p.y + 3, 160 + breathe, 18, 0, 0, Math.PI * 2);
            ctx.fill();
            // Bubbling in the pool
            ctx.fillStyle = '#7fff00';
            for (let b = 0; b < 8; b++) {
                const bx = (Math.random() - 0.5) * 280;
                const br = 3 + Math.random() * 5;
                ctx.globalAlpha = 0.3 + Math.random() * 0.4;
                ctx.beginPath(); ctx.arc(bx, groundY - p.y + Math.random() * 5, br, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;

            // Dark menacing aura behind the monster
            const auraG = ctx.createRadialGradient(0, -bodyH * 0.4, 20, 0, -bodyH * 0.4, bodyW * 1.5);
            auraG.addColorStop(0, 'rgba(0, 40, 0, 0.4)');
            auraG.addColorStop(0.5, 'rgba(0, 20, 0, 0.2)');
            auraG.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = auraG;
            ctx.beginPath(); ctx.arc(0, -bodyH * 0.4, bodyW * 1.5, 0, Math.PI * 2); ctx.fill();

            // Monster body — massive hulking shape
            ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 40;
            const bg = ctx.createLinearGradient(0, 0, 0, -bodyH);
            bg.addColorStop(0, '#0a3a02');
            bg.addColorStop(0.3, '#0d5e05');
            bg.addColorStop(0.6, '#1a8a0a');
            bg.addColorStop(0.85, '#0d5e05');
            bg.addColorStop(1, '#082a01');
            ctx.fillStyle = bg;
            ctx.beginPath();
            ctx.moveTo(-bodyW * 0.8, 0);
            // Left side — bulging shoulder
            ctx.quadraticCurveTo(-bodyW * 1.1, -bodyH * 0.2, -bodyW * 1.2 - breathe, -bodyH * 0.45);
            ctx.quadraticCurveTo(-bodyW * 0.9, -bodyH * 0.65, -bodyW * 0.5, -bodyH * 0.8);
            // Head — wide with horns
            ctx.quadraticCurveTo(-bodyW * 0.35, -bodyH * 1.05, -bodyW * 0.15, -bodyH * 1.1);
            ctx.lineTo(-bodyW * 0.08, -bodyH * 1.25); // left horn
            ctx.lineTo(0, -bodyH * 1.05);
            ctx.lineTo(bodyW * 0.08, -bodyH * 1.25);  // right horn
            ctx.lineTo(bodyW * 0.15, -bodyH * 1.1);
            ctx.quadraticCurveTo(bodyW * 0.35, -bodyH * 1.05, bodyW * 0.5, -bodyH * 0.8);
            // Right side — bulging shoulder
            ctx.quadraticCurveTo(bodyW * 0.9, -bodyH * 0.65, bodyW * 1.2 + breathe, -bodyH * 0.45);
            ctx.quadraticCurveTo(bodyW * 1.1, -bodyH * 0.2, bodyW * 0.8, 0);
            ctx.closePath();
            ctx.fill();

            // Slimy texture veins across body
            ctx.strokeStyle = '#39ff14'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.25;
            for (let v = 0; v < 8; v++) {
                const vx = (Math.random() - 0.5) * bodyW * 1.4;
                const vy1 = -Math.random() * bodyH * 0.7;
                ctx.beginPath(); ctx.moveTo(vx, vy1);
                ctx.quadraticCurveTo(vx + (Math.random() - 0.5) * 30, vy1 - 40, vx + (Math.random() - 0.5) * 20, vy1 - 80);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

            // Multiple glowing eyes — 6 eyes in two rows
            const eyeCY = -bodyH * 0.85;
            ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 20;
            // Top row — 2 big main eyes
            ctx.fillStyle = '#39ff14';
            ctx.beginPath(); ctx.ellipse(-22, eyeCY, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(22, eyeCY, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
            // Bottom row — 4 smaller eyes
            ctx.beginPath(); ctx.arc(-35, eyeCY + 18, 5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(-12, eyeCY + 20, 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(12, eyeCY + 20, 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(35, eyeCY + 18, 5, 0, Math.PI * 2); ctx.fill();
            // Slit pupils — all staring at opponent
            ctx.fillStyle = '#000'; ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.ellipse(-22, eyeCY, 4, 9, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(22, eyeCY, 4, 9, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(-35, eyeCY + 18, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(-12, eyeCY + 20, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(12, eyeCY + 20, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(35, eyeCY + 18, 2.5, 0, Math.PI * 2); ctx.fill();

            // Gaping mouth with jagged fangs
            const mouthY = -bodyH * 0.6;
            ctx.fillStyle = '#040d01';
            ctx.beginPath();
            ctx.moveTo(-40, mouthY);
            ctx.quadraticCurveTo(0, mouthY + 35 + breathe, 40, mouthY);
            ctx.closePath();
            ctx.fill();
            // Upper fangs
            ctx.fillStyle = '#c8ffb0';
            const fangs = [-32, -18, -5, 8, 20, 34];
            for (const fx of fangs) {
                const fh = 10 + Math.random() * 8;
                ctx.beginPath();
                ctx.moveTo(fx - 4, mouthY + 2);
                ctx.lineTo(fx, mouthY + fh);
                ctx.lineTo(fx + 4, mouthY + 2);
                ctx.closePath();
                ctx.fill();
            }
            // Lower fangs
            for (let f = 0; f < 4; f++) {
                const fx = -25 + f * 16;
                const fh = 6 + Math.random() * 5;
                ctx.beginPath();
                ctx.moveTo(fx - 3, mouthY + 25);
                ctx.lineTo(fx, mouthY + 25 - fh);
                ctx.lineTo(fx + 3, mouthY + 25);
                ctx.closePath();
                ctx.fill();
            }
            // Acid drool from mouth
            ctx.strokeStyle = '#39ff14'; ctx.lineWidth = 3; ctx.globalAlpha = 0.6;
            ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 8;
            for (let d = 0; d < 3; d++) {
                const dx = -15 + d * 15;
                const droolLen = 15 + Math.sin(Date.now() * 0.008 + d) * 10;
                ctx.beginPath(); ctx.moveTo(dx, mouthY + 28);
                ctx.lineTo(dx + (Math.random() - 0.5) * 4, mouthY + 28 + droolLen);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

            // Massive punch arm during punch phase
            if (p.phase === 'punch') {
                const ext = Math.min(p.phaseTimer / 12, 1);
                const fistX = p.dir * (40 + ext * 150);
                const fistY = -bodyH * 0.45;
                const shoulderX = p.dir * bodyW * 0.9;
                const shoulderY = -bodyH * 0.45;
                // Thick arm
                ctx.strokeStyle = '#0d5e05'; ctx.lineWidth = 28;
                ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 15;
                ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY);
                ctx.quadraticCurveTo(shoulderX + p.dir * 40, fistY - 20, fistX, fistY);
                ctx.stroke();
                // Giant fist with claws
                ctx.fillStyle = '#1a8a0a';
                ctx.beginPath(); ctx.arc(fistX, fistY, 28, 0, Math.PI * 2); ctx.fill();
                // Claws
                ctx.fillStyle = '#c8ffb0';
                for (let c = -2; c <= 2; c++) {
                    const ca = (c * 0.3) + (p.dir > 0 ? 0 : Math.PI);
                    ctx.beginPath();
                    ctx.moveTo(fistX + Math.cos(ca) * 22, fistY + Math.sin(ca) * 22);
                    ctx.lineTo(fistX + Math.cos(ca) * 40, fistY + Math.sin(ca) * 40 + c * 2);
                    ctx.lineTo(fistX + Math.cos(ca + 0.15) * 22, fistY + Math.sin(ca + 0.15) * 22);
                    ctx.closePath();
                    ctx.fill();
                }
                // Speed lines during punch extension
                if (ext > 0.3) {
                    ctx.globalAlpha = 0.4;
                    ctx.strokeStyle = '#39ff14'; ctx.lineWidth = 2;
                    for (let sl = 0; sl < 6; sl++) {
                        const slx = fistX - p.dir * (20 + Math.random() * 50);
                        const sly = fistY + (Math.random() - 0.5) * 40;
                        ctx.beginPath(); ctx.moveTo(slx, sly);
                        ctx.lineTo(slx - p.dir * (20 + Math.random() * 30), sly);
                        ctx.stroke();
                    }
                    ctx.globalAlpha = 1;
                }
            }

            // Heavy acid dripping off the monster body
            if (Math.random() < 0.85) {
                for (let d = 0; d < 3; d++) {
                    particles.push({ x: p.x + (Math.random() - 0.5) * bodyW * 1.5, y: p.y - Math.random() * bodyH * 0.7,
                        vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4,
                        life: 10 + Math.random() * 10, maxLife: 20,
                        color: `hsl(${110 + Math.random() * 15}, 100%, ${35 + Math.random() * 35}%)` });
                }
            }
            // Toxic mist rising around the monster
            if (Math.random() < 0.4) {
                particles.push({ x: p.x + (Math.random() - 0.5) * 200, y: groundY - Math.random() * 30,
                    vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2,
                    life: 15 + Math.random() * 10, maxLife: 25,
                    color: 'rgba(57, 255, 20, 0.4)' });
            }

            ctx.shadowBlur = 0;
            ctx.restore();
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
        const a = p.life / p.maxLife;
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        const size = 2 + a * 5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
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
    if (keys['e']) { player1.activateRage(); keys['e'] = false; }
    if (keys['f']) { player1.melee('punch', player2); keys['f'] = false; }
    if (keys['g']) { player1.melee('kick', player2); keys['g'] = false; }

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
        if (keys['m'])  { player2.activateRage(); keys['m'] = false; }
        if (keys['0'])  { player2.melee('punch', player1); keys['0'] = false; }
        if (keys['1'])  { player2.melee('kick', player1); keys['1'] = false; }
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
    // AI melee when close
    if (dist < 80 && player2.meleeCooldown <= 0 && Math.random() < 0.15) {
        player2.melee(Math.random() < 0.5 ? 'punch' : 'kick', player1);
    }
    // AI activates rage when available and health is low
    if (player2.rageAvailable && !player2.rageActive && player2.health <= MAX_HEALTH * 0.4) {
        player2.activateRage();
    }
}

// ── Drawing ──
let hellFade = 0; // 0 = normal, 1 = full hell

function drawBackground() {
    const meteorActive = projectiles.some(p => p.isMeteor);
    // Also keep hell bg briefly after impact
    const meteorImpactActive = visualEffects.some(v => v.type === 'meteorImpact');

    // Smoothly transition hell fade
    const target = (meteorActive || meteorImpactActive) ? 1 : 0;
    hellFade += (target - hellFade) * 0.08;
    if (hellFade < 0.01) hellFade = 0;

    if (hellFade > 0) {
        drawHellBackground(hellFade);
    }
    if (hellFade < 1) {
        drawNormalBackground(1 - hellFade);
    }
}

function drawNormalBackground(alpha) {
    ctx.globalAlpha = alpha;
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
    ctx.globalAlpha = 1;
}

function drawHellBackground(alpha) {
    ctx.globalAlpha = alpha;
    const t = Date.now() * 0.001;

    // Fiery sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, '#1a0000');
    sky.addColorStop(0.3, '#4a0000');
    sky.addColorStop(0.6, '#8b1a00');
    sky.addColorStop(1, '#2d0000');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Lava cracks on the ground
    ctx.fillStyle = '#1a0800';
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

    // Glowing lava veins in the ground
    ctx.strokeStyle = '#ff4500';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff4500';
    ctx.shadowBlur = 12;
    for (let i = 0; i < 8; i++) {
        const sx = (i / 8) * canvas.width + Math.sin(t + i) * 30;
        ctx.beginPath();
        ctx.moveTo(sx, groundY + 5);
        ctx.quadraticCurveTo(
            sx + 40 + Math.sin(t * 1.3 + i * 2) * 20,
            groundY + 15 + Math.sin(t + i) * 8,
            sx + 80 + Math.cos(t + i) * 25,
            groundY + (canvas.height - groundY)
        );
        ctx.stroke();
    }

    // Ground line — fiery
    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
    ctx.shadowBlur = 0;

    // Floating embers in the sky
    for (let i = 0; i < 12; i++) {
        const ex = (i * 137 + t * 30) % canvas.width;
        const ey = ((i * 89 + t * 20) % (groundY * 0.9));
        const er = 1.5 + Math.sin(t * 2 + i) * 1;
        ctx.globalAlpha = alpha * (0.3 + Math.sin(t * 3 + i * 0.7) * 0.25);
        ctx.fillStyle = '#ff6633';
        ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fill();
    }

    // Distant fire glow on horizon
    ctx.globalAlpha = alpha * (0.15 + Math.sin(t * 0.8) * 0.08);
    const hg = ctx.createRadialGradient(canvas.width * 0.5, groundY, 0, canvas.width * 0.5, groundY, canvas.width * 0.5);
    hg.addColorStop(0, 'rgba(255, 80, 0, 0.4)');
    hg.addColorStop(0.5, 'rgba(180, 30, 0, 0.15)');
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, canvas.width, groundY);

    ctx.globalAlpha = 1;
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

// ── Rage Bars ──
function drawRageBars() {
    drawRageBar(32, 148, 100, 6, player1, 'E');
    drawRageBar(canvas.width - 132, 148, 100, 6, player2, aiMode ? '' : 'M');
}

function drawRageBar(x, y, w, h, player, key) {
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
    ctx.font = '9px "Segoe UI",Arial,sans-serif';
    ctx.textAlign = 'left';

    if (player.rageActive) {
        const ratio = player.rageTimer / (30 * 60);
        ctx.fillStyle = '#ff0000';
        ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.008) * 0.3;
        ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 8;
        ctx.fillRect(x, y, w * ratio, h);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        ctx.fillStyle = '#ff4444';
        ctx.fillText('RAGE ACTIVE', x, y - 2);
        ctx.textAlign = 'right'; ctx.fillStyle = '#ff6666';
        ctx.fillText(Math.ceil(player.rageTimer / 60) + 's', x + w, y - 2);
    } else if (player.rageAvailable) {
        ctx.fillStyle = '#ff0000';
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.006) * 0.3;
        ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 10;
        ctx.fillRect(x, y, w, h);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        ctx.fillStyle = '#ff4444';
        ctx.fillText('RAGE READY' + (key ? ' [' + key + ']' : ''), x, y - 2);
    } else if (player.rageUsed) {
        ctx.fillStyle = '#444';
        ctx.fillText('RAGE SPENT', x, y - 2);
    } else {
        const fill = Math.max(0, 1 - player.health / (MAX_HEALTH * 0.5));
        ctx.fillStyle = '#660000';
        ctx.fillRect(x, y, w * fill, h);
        ctx.fillStyle = '#555';
        ctx.fillText('RAGE', x, y - 2);
    }
    ctx.textAlign = 'left'; ctx.globalAlpha = 1; ctx.shadowBlur = 0;
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

    // Hitstop — freeze game logic, keep rendering for dramatic pause
    if (hitstopTimer > 0) {
        hitstopTimer--;
        ctx.save();
        ctx.translate(shakeOffsetX, shakeOffsetY);
        drawBackground();
        player1.draw(); player2.draw();
        drawProjectiles(); drawVisualEffects(); drawParticles(); drawCooldowns(); drawRageBars();
        ctx.restore();
        drawScreenFlash();
        updateUI();
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
    drawProjectiles(); drawVisualEffects(); drawParticles(); drawCooldowns(); drawRageBars();

    ctx.restore();

    drawScreenFlash();
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
