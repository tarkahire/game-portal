// ═══════════════════════════════════════════════════════════════
//  DUNGEON CRAWLER — Dark & Gritty Roguelike
// ═══════════════════════════════════════════════════════════════

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ─── CONSTANTS ───────────────────────────────────────────────
const TILE = 40;
const ROOM_MIN = 5, ROOM_MAX = 9;
const MAP_COLS = 60, MAP_ROWS = 60;
const MAX_FLOORS = 5;
const VIEWPORT_TILES_X = 25, VIEWPORT_TILES_Y = 18;

// ─── COLOR PALETTE ───────────────────────────────────────────
const PAL = {
    floor: ['#1e1a16', '#1c1814', '#201c18', '#1a1612'],
    wall: '#0e0c0a',
    wallTop: '#2a2520',
    door: '#3a2a1a',
    fog: '#0a0a0f',
    blood: '#5a1010',
    torchLight: '#ff8c40',
    hpBar: '#8b0000',
    hpBg: '#1a1215',
    manaBar: '#2244aa',
    xpBar: '#daa520',
    minimap: { explored: '#333', current: '#8b0000', unexplored: '#111', boss: '#aa0000', treasure: '#aa8800', shop: '#2288aa' }
};

// ─── GAME STATE ──────────────────────────────────────────────
let gameState = 'title'; // title, classSelect, playing, paused, inventory, gameover
let coopMode = false;
let p2ClassSelect = false;
let currentFloor = 1;
let dungeon = null;
let players = [];
let enemies = [];
let projectiles = [];
let particles = [];
let lootDrops = [];
let damageNumbers = [];
let screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
let camera = { x: 0, y: 0 };
let gameTime = 0;
let runStats = { enemiesKilled: 0, goldCollected: 0, floorsCleared: 0, bossesKilled: 0, itemsFound: 0 };

// ─── META PROGRESSION (localStorage) ────────────────────────
const SAVE_KEY = 'dungeonCrawlerSave';
let meta = loadMeta();
function loadMeta() {
    try {
        const s = localStorage.getItem(SAVE_KEY);
        if (s) return JSON.parse(s);
    } catch(e) {}
    return { gold: 0, totalRuns: 0, bestFloor: 0, totalKills: 0, unlocks: [] };
}
function saveMeta() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(meta)); } catch(e) {} }

// ─── CLASS DEFINITIONS ──────────────────────────────────────
const CLASSES = {
    warrior: {
        name: 'Warrior', maxHp: 120, speed: 2.2, attackRange: 30, attackDamage: 12, attackSpeed: 500,
        attackType: 'melee', color: '#8b4513', specialCooldown: 4000,
        specialName: 'Shield Bash', specialDesc: 'Stun nearby enemies',
        drawChar: drawWarrior
    },
    mage: {
        name: 'Mage', maxHp: 60, speed: 2.5, attackRange: 200, attackDamage: 15, attackSpeed: 700,
        attackType: 'ranged', color: '#6a3093', specialCooldown: 3000,
        specialName: 'Frost Nova', specialDesc: 'Freeze all nearby enemies',
        drawChar: drawMage
    },
    rogue: {
        name: 'Rogue', maxHp: 80, speed: 3.5, attackRange: 25, attackDamage: 10, attackSpeed: 300,
        attackType: 'melee', color: '#2e7d32', specialCooldown: 2000,
        specialName: 'Shadow Dash', specialDesc: 'Dash forward, invincible',
        drawChar: drawRogue
    },
    ranger: {
        name: 'Ranger', maxHp: 80, speed: 2.8, attackRange: 220, attackDamage: 11, attackSpeed: 500,
        attackType: 'ranged', color: '#5d8a3c', specialCooldown: 5000,
        specialName: 'Bear Trap', specialDesc: 'Place a trap that snares enemies',
        drawChar: drawRanger
    }
};

// ─── ENEMY DEFINITIONS ──────────────────────────────────────
const ENEMY_TYPES = {
    skeleton: { name: 'Skeleton', hp: 25, speed: 1.2, damage: 6, attackSpeed: 800, range: 25, type: 'melee', xp: 10, color: '#b0a890', radius: 12 },
    archerSkeleton: { name: 'Archer', hp: 18, speed: 0.9, damage: 8, attackSpeed: 1200, range: 180, type: 'ranged', xp: 15, color: '#a09878', radius: 12 },
    slime: { name: 'Slime', hp: 35, speed: 0.7, damage: 5, attackSpeed: 1000, range: 20, type: 'melee', xp: 12, color: '#3a7a3a', radius: 14, splits: true },
    bat: { name: 'Bat', hp: 12, speed: 2.8, damage: 4, attackSpeed: 600, range: 18, type: 'melee', xp: 8, color: '#5a4a6a', radius: 9 },
    darkKnight: { name: 'Dark Knight', hp: 60, speed: 1.0, damage: 12, attackSpeed: 1000, range: 28, type: 'melee', xp: 25, color: '#3a3a4a', radius: 14 },
    necromancer: { name: 'Necromancer', hp: 30, speed: 0.8, damage: 10, attackSpeed: 2000, range: 160, type: 'summoner', xp: 30, color: '#5a2a5a', radius: 12 },
};

// ─── BOSS DEFINITIONS ───────────────────────────────────────
const BOSSES = [
    { name: 'Bone King', hp: 200, speed: 1.0, damage: 15, attackSpeed: 1200, range: 35, type: 'melee', xp: 100, color: '#d4c8a0', radius: 22,
      special: 'summon', specialCd: 5000, drawBoss: drawBoneKing },
    { name: 'Slime Mother', hp: 250, speed: 0.5, damage: 10, attackSpeed: 1500, range: 30, type: 'melee', xp: 120, color: '#2a8a2a', radius: 28,
      special: 'split', specialCd: 6000, drawBoss: drawSlimeMother },
    { name: 'Shadow Wraith', hp: 180, speed: 2.0, damage: 18, attackSpeed: 1000, range: 150, type: 'ranged', xp: 150, color: '#3a2a4a', radius: 20,
      special: 'teleport', specialCd: 3000, drawBoss: drawShadowWraith },
    { name: 'Dragon Hatchling', hp: 300, speed: 1.5, damage: 20, attackSpeed: 1400, range: 120, type: 'ranged', xp: 180, color: '#8a2a1a', radius: 24,
      special: 'fireBreath', specialCd: 4000, drawBoss: drawDragonHatchling },
    { name: 'Lich Lord', hp: 400, speed: 1.2, damage: 22, attackSpeed: 1000, range: 180, type: 'ranged', xp: 250, color: '#4a2a6a', radius: 22,
      special: 'phaseShift', specialCd: 8000, drawBoss: drawLichLord }
];

// ─── LOOT TABLES ─────────────────────────────────────────────
const RARITIES = ['common', 'uncommon', 'rare', 'epic'];
const RARITY_COLORS = { common: '#c8c0b0', uncommon: '#4caf50', rare: '#42a5f5', epic: '#ab47bc' };
const RARITY_MULT = { common: 1, uncommon: 1.3, rare: 1.7, epic: 2.2 };

const WEAPON_BASES = [
    { name: 'Rusty Sword', type: 'weapon', subtype: 'sword', damage: 10, speed: 500, range: 30, forClass: 'warrior' },
    { name: 'Iron Sword', type: 'weapon', subtype: 'sword', damage: 14, speed: 480, range: 32, forClass: 'warrior' },
    { name: 'Battle Axe', type: 'weapon', subtype: 'sword', damage: 18, speed: 650, range: 35, forClass: 'warrior' },
    { name: 'Oak Staff', type: 'weapon', subtype: 'staff', damage: 13, speed: 700, range: 200, forClass: 'mage' },
    { name: 'Crystal Staff', type: 'weapon', subtype: 'staff', damage: 18, speed: 650, range: 220, forClass: 'mage' },
    { name: 'Bone Wand', type: 'weapon', subtype: 'staff', damage: 16, speed: 600, range: 190, forClass: 'mage' },
    { name: 'Stone Dagger', type: 'weapon', subtype: 'dagger', damage: 8, speed: 280, range: 22, forClass: 'rogue' },
    { name: 'Steel Dagger', type: 'weapon', subtype: 'dagger', damage: 12, speed: 260, range: 24, forClass: 'rogue' },
    { name: 'Shadow Blade', type: 'weapon', subtype: 'dagger', damage: 15, speed: 240, range: 26, forClass: 'rogue' },
    { name: 'Short Bow', type: 'weapon', subtype: 'bow', damage: 10, speed: 500, range: 200, forClass: 'ranger' },
    { name: 'Long Bow', type: 'weapon', subtype: 'bow', damage: 14, speed: 550, range: 240, forClass: 'ranger' },
    { name: 'Hunter Bow', type: 'weapon', subtype: 'bow', damage: 17, speed: 480, range: 230, forClass: 'ranger' },
];
const ARMOR_BASES = [
    { name: 'Cloth Robe', type: 'armor', defense: 2 },
    { name: 'Leather Armor', type: 'armor', defense: 5 },
    { name: 'Chain Mail', type: 'armor', defense: 8 },
    { name: 'Plate Armor', type: 'armor', defense: 12 },
    { name: 'Dark Plate', type: 'armor', defense: 15 },
];
const POTION_TYPES = [
    { name: 'Health Potion', type: 'potion', effect: 'heal', value: 30, color: '#cc2222' },
    { name: 'Speed Potion', type: 'potion', effect: 'speed', value: 1.5, duration: 5000, color: '#22cc22' },
    { name: 'Power Potion', type: 'potion', effect: 'damage', value: 1.5, duration: 5000, color: '#cc8800' },
];

const SHOP_ITEMS = [
    { id: 'startSword', name: 'Steel Blade', desc: 'Start with a better sword', cost: 50 },
    { id: 'startStaff', name: 'Fire Staff', desc: 'Start with a better staff', cost: 50 },
    { id: 'startDagger', name: 'Venom Dagger', desc: 'Start with a better dagger', cost: 50 },
    { id: 'startBow', name: 'Oak Longbow', desc: 'Start with a better bow', cost: 50 },
    { id: 'extraHP', name: 'Vitality Charm', desc: '+20 starting HP', cost: 80 },
    { id: 'potionStart', name: 'Potion Belt', desc: 'Start with 2 health potions', cost: 40 },
];

// ─── INPUT ──────────────────────────────────────────────────
const keys = {};
let mouse = { x: 0, y: 0, down: false, clicked: false };
document.addEventListener('keydown', e => { keys[e.code] = true; handleKeyDown(e); });
document.addEventListener('keyup', e => { keys[e.code] = false; });
canvas.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('mousedown', e => { if (e.button === 0) { mouse.down = true; mouse.clicked = true; } });
canvas.addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());

function handleKeyDown(e) {
    if (gameState === 'playing') {
        if (e.code === 'Tab') { e.preventDefault(); toggleInventory(0); }
        if (e.code === 'Numpad3') { e.preventDefault(); if (coopMode && players[1]) toggleInventory(1); }
        if (e.code === 'Escape') { gameState = 'paused'; document.getElementById('pause-overlay').style.display = ''; }
    } else if (gameState === 'paused') {
        if (e.code === 'Escape') resumeGame();
    } else if (gameState === 'inventory') {
        if (e.code === 'Tab' || e.code === 'Escape' || e.code === 'Numpad3') { e.preventDefault(); closeInventory(); }
    }
}

// ─── RESIZE ──────────────────────────────────────────────────
function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize);
resize();

// ─── DUNGEON GENERATION ─────────────────────────────────────
function generateDungeon(floor) {
    const map = [];
    for (let r = 0; r < MAP_ROWS; r++) { map[r] = []; for (let c = 0; c < MAP_COLS; c++) map[r][c] = 0; } // 0=wall

    const rooms = [];
    const numRooms = 8 + floor * 2;

    // Place rooms
    for (let attempt = 0; attempt < 200 && rooms.length < numRooms; attempt++) {
        const w = ROOM_MIN + Math.floor(Math.random() * (ROOM_MAX - ROOM_MIN));
        const h = ROOM_MIN + Math.floor(Math.random() * (ROOM_MAX - ROOM_MIN));
        const x = 2 + Math.floor(Math.random() * (MAP_COLS - w - 4));
        const y = 2 + Math.floor(Math.random() * (MAP_ROWS - h - 4));

        let overlap = false;
        for (const rm of rooms) {
            if (x < rm.x + rm.w + 2 && x + w + 2 > rm.x && y < rm.y + rm.h + 2 && y + h + 2 > rm.y) {
                overlap = true; break;
            }
        }
        if (overlap) continue;

        const roomType = rooms.length === 0 ? 'start' :
            rooms.length === numRooms - 1 ? 'boss' :
            Math.random() < 0.15 ? 'treasure' :
            Math.random() < 0.1 ? 'shop' : 'combat';

        rooms.push({ x, y, w, h, type: roomType, explored: false, enemies: [], cx: x + Math.floor(w/2), cy: y + Math.floor(h/2) });

        for (let ry = y; ry < y + h; ry++)
            for (let rx = x; rx < x + w; rx++)
                map[ry][rx] = 1; // 1=floor
    }

    // Connect rooms with corridors
    for (let i = 1; i < rooms.length; i++) {
        const a = rooms[i - 1], b = rooms[i];
        let cx = a.cx, cy = a.cy;
        while (cx !== b.cx) { if (cy >= 0 && cy < MAP_ROWS && cx >= 0 && cx < MAP_COLS) map[cy][cx] = 1; cx += cx < b.cx ? 1 : -1; }
        while (cy !== b.cy) { if (cy >= 0 && cy < MAP_ROWS && cx >= 0 && cx < MAP_COLS) map[cy][cx] = 1; cy += cy < b.cy ? 1 : -1; }
    }

    // Place torches in rooms
    const torches = [];
    for (const rm of rooms) {
        if (rm.type === 'start' || rm.type === 'boss' || rm.type === 'treasure' || rm.type === 'shop') {
            torches.push({ x: rm.x + 1, y: rm.y + 1 });
            torches.push({ x: rm.x + rm.w - 2, y: rm.y + 1 });
            torches.push({ x: rm.x + 1, y: rm.y + rm.h - 2 });
            torches.push({ x: rm.x + rm.w - 2, y: rm.y + rm.h - 2 });
        } else {
            if (Math.random() < 0.5) torches.push({ x: rm.x + 1, y: rm.y + 1 });
            if (Math.random() < 0.5) torches.push({ x: rm.x + rm.w - 2, y: rm.y + rm.h - 2 });
        }
    }

    return { map, rooms, torches, floor };
}

// ─── ENTITY: PLAYER ─────────────────────────────────────────
function createPlayer(classId, playerIndex) {
    const cls = CLASSES[classId];
    const startRoom = dungeon.rooms[0];
    const offsetX = playerIndex === 0 ? -1 : 1;
    let bonusHp = 0;
    if (meta.unlocks.includes('extraHP')) bonusHp = 20;

    const p = {
        x: (startRoom.cx + offsetX) * TILE + TILE/2,
        y: startRoom.cy * TILE + TILE/2,
        classId, cls,
        hp: cls.maxHp + bonusHp, maxHp: cls.maxHp + bonusHp,
        speed: cls.speed,
        damage: cls.attackDamage,
        attackSpeed: cls.attackSpeed,
        attackRange: cls.attackRange,
        attackType: cls.attackType,
        defense: 0,
        lastAttack: 0,
        lastSpecial: 0,
        specialCooldown: cls.specialCooldown,
        dodgeCd: 0,
        dodging: false,
        dodgeDir: { x: 0, y: 0 },
        dodgeTimer: 0,
        invincible: 0,
        facingAngle: 0,
        playerIndex,
        level: 1, xp: 0, xpToNext: 50,
        inventory: [],
        weapon: null,
        armor: null,
        activeEffects: [],
        alive: true,
        attackAnim: 0,
        currentRoom: null,
    };

    // Starting equipment from shop unlocks
    if (playerIndex === 0) {
        applyShopUnlocks(p);
    }

    return p;
}

function applyShopUnlocks(p) {
    const classWeaponMap = { warrior: 'startSword', mage: 'startStaff', rogue: 'startDagger', ranger: 'startBow' };
    const wUnlock = classWeaponMap[p.classId];
    if (meta.unlocks.includes(wUnlock)) {
        const bases = WEAPON_BASES.filter(w => w.forClass === p.classId);
        if (bases.length > 1) {
            p.weapon = generateItem(bases[1], 'uncommon');
            applyWeapon(p);
        }
    }
    if (meta.unlocks.includes('potionStart')) {
        p.inventory.push({ ...POTION_TYPES[0], rarity: 'common' });
        p.inventory.push({ ...POTION_TYPES[0], rarity: 'common' });
    }
}

function applyWeapon(p) {
    if (p.weapon) {
        p.damage = Math.round(p.weapon.damage * RARITY_MULT[p.weapon.rarity]);
        p.attackSpeed = p.weapon.speed;
        p.attackRange = p.weapon.range;
    }
}

function applyArmor(p) {
    p.defense = p.armor ? Math.round(p.armor.defense * RARITY_MULT[p.armor.rarity]) : 0;
}

function generateItem(base, rarity) {
    return { ...base, rarity: rarity || rollRarity(), id: Math.random().toString(36).substr(2, 6) };
}

function rollRarity() {
    const r = Math.random();
    if (r < 0.5) return 'common';
    if (r < 0.8) return 'uncommon';
    if (r < 0.95) return 'rare';
    return 'epic';
}

function generateLoot(floor) {
    const r = Math.random();
    if (r < 0.4) {
        return generateItem(WEAPON_BASES[Math.floor(Math.random() * WEAPON_BASES.length)]);
    } else if (r < 0.7) {
        return generateItem(ARMOR_BASES[Math.floor(Math.random() * ARMOR_BASES.length)]);
    } else {
        return { ...POTION_TYPES[Math.floor(Math.random() * POTION_TYPES.length)], rarity: 'common', id: Math.random().toString(36).substr(2, 6) };
    }
}

// ─── ENTITY: ENEMY ──────────────────────────────────────────
function createEnemy(type, x, y, floor) {
    const def = ENEMY_TYPES[type];
    const mult = 1 + (floor - 1) * 0.25;
    return {
        ...def,
        enemyType: type,
        hp: Math.round(def.hp * mult), maxHp: Math.round(def.hp * mult),
        damage: Math.round(def.damage * mult),
        x: x * TILE + TILE/2, y: y * TILE + TILE/2,
        lastAttack: 0, target: null, alive: true,
        stunned: 0, frozen: 0, trapped: 0,
        isBoss: false, specialTimer: 0, phase: 1, attackAnim: 0
    };
}

function createBoss(floor) {
    const bossRoom = dungeon.rooms.find(r => r.type === 'boss');
    if (!bossRoom) return null;
    const def = BOSSES[Math.min(floor - 1, BOSSES.length - 1)];
    const mult = 1 + (floor - 1) * 0.15;
    return {
        ...def, type: 'boss',
        hp: Math.round(def.hp * mult), maxHp: Math.round(def.hp * mult),
        damage: Math.round(def.damage * mult),
        x: bossRoom.cx * TILE + TILE/2, y: bossRoom.cy * TILE + TILE/2,
        lastAttack: 0, target: null, alive: true,
        stunned: 0, frozen: 0, trapped: 0,
        isBoss: true, specialTimer: 0, phase: 1, attackAnim: 0
    };
}

function spawnRoomEnemies(room, floor) {
    if (room.type === 'start' || room.type === 'shop' || room.type === 'boss') return;
    if (room.enemies.length > 0) return; // Already spawned

    const count = room.type === 'treasure' ? 2 : 3 + Math.floor(Math.random() * (2 + floor));
    const types = Object.keys(ENEMY_TYPES);
    const available = floor < 3 ? types.slice(0, 4) : types;

    for (let i = 0; i < count; i++) {
        const type = available[Math.floor(Math.random() * available.length)];
        const ex = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
        const ey = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
        const enemy = createEnemy(type, ex, ey, floor);
        enemies.push(enemy);
        room.enemies.push(enemy);
    }
}

// ─── POPULATE DUNGEON ───────────────────────────────────────
function populateDungeon() {
    enemies = [];
    lootDrops = [];

    // Spawn boss
    const boss = createBoss(currentFloor);
    if (boss) enemies.push(boss);

    // Spawn treasure chests
    for (const room of dungeon.rooms) {
        if (room.type === 'treasure') {
            const item = generateLoot(currentFloor);
            lootDrops.push({ x: room.cx * TILE + TILE/2, y: room.cy * TILE + TILE/2, item, type: 'chest' });
        }
        if (room.type === 'shop') {
            for (let i = 0; i < 3; i++) {
                const item = generateLoot(currentFloor);
                const cost = Math.floor((10 + currentFloor * 5) * RARITY_MULT[item.rarity]);
                lootDrops.push({
                    x: (room.cx - 1 + i) * TILE + TILE/2,
                    y: (room.cy - 1) * TILE + TILE/2,
                    item, type: 'shop', cost
                });
            }
        }
    }
}

// ─── GAME FLOW ──────────────────────────────────────────────
function startRun(coop) {
    coopMode = coop;
    p2ClassSelect = false;
    gameState = 'classSelect';
    showScreen('class-screen');
    document.getElementById('p2-class-label').style.display = 'none';
    document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
}

let selectedClasses = [];
function selectClass(classId) {
    if (!p2ClassSelect) {
        // P1 selected
        selectedClasses = [classId];
        if (coopMode) {
            p2ClassSelect = true;
            document.getElementById('p2-class-label').style.display = '';
            document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
            return;
        }
    } else {
        // P2 selected
        selectedClasses.push(classId);
    }
    startGame();
}

function startGame() {
    currentFloor = 1;
    runStats = { enemiesKilled: 0, goldCollected: 0, floorsCleared: 0, bossesKilled: 0, itemsFound: 0 };
    dungeon = generateDungeon(currentFloor);
    dungeon.rooms[0].explored = true;
    // Create players now that dungeon exists
    players = selectedClasses.map((cls, i) => createPlayer(cls, i));
    populateDungeon();
    projectiles = [];
    particles = [];
    damageNumbers = [];
    gameState = 'playing';
    showScreen(null);
    gameTime = 0;
}

function nextFloor() {
    currentFloor++;
    runStats.floorsCleared++;
    if (currentFloor > MAX_FLOORS) {
        victory();
        return;
    }
    dungeon = generateDungeon(currentFloor);
    dungeon.rooms[0].explored = true;
    populateDungeon();
    const startRoom = dungeon.rooms[0];
    players.forEach((p, i) => {
        if (p.alive) {
            p.x = (startRoom.cx + (i === 0 ? -1 : 1)) * TILE + TILE/2;
            p.y = startRoom.cy * TILE + TILE/2;
            p.hp = Math.min(p.hp + 20, p.maxHp);
        }
    });
    projectiles = [];
    particles = [];
    enemies = enemies.filter(e => false);
    lootDrops = lootDrops.filter(l => false);
    populateDungeon();
}

function gameOver() {
    gameState = 'gameover';
    meta.totalRuns++;
    meta.totalKills += runStats.enemiesKilled;
    meta.gold += runStats.goldCollected;
    if (currentFloor > meta.bestFloor) meta.bestFloor = currentFloor;
    saveMeta();

    const title = document.getElementById('gameover-title');
    title.textContent = 'YOU DIED';
    title.classList.remove('victory-title');
    showGameOverStats();
    showScreen('gameover-screen');
}

function victory() {
    gameState = 'gameover';
    meta.totalRuns++;
    meta.totalKills += runStats.enemiesKilled;
    meta.gold += runStats.goldCollected;
    meta.bestFloor = MAX_FLOORS;
    saveMeta();

    const title = document.getElementById('gameover-title');
    title.textContent = 'VICTORY';
    title.classList.add('victory-title');
    showGameOverStats();
    showScreen('gameover-screen');
}

function showGameOverStats() {
    const el = document.getElementById('gameover-stats');
    el.innerHTML = `
        <div class="stat-line"><span>Floor Reached</span><span>${currentFloor}</span></div>
        <div class="stat-line"><span>Enemies Killed</span><span>${runStats.enemiesKilled}</span></div>
        <div class="stat-line"><span>Bosses Slain</span><span>${runStats.bossesKilled}</span></div>
        <div class="stat-line"><span>Gold Found</span><span>${runStats.goldCollected}</span></div>
        <div class="stat-line"><span>Items Found</span><span>${runStats.itemsFound}</span></div>
    `;
}

// ─── SCREEN MANAGEMENT ──────────────────────────────────────
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    if (id) document.getElementById(id).classList.add('active');
}

function resumeGame() {
    gameState = 'playing';
    document.getElementById('pause-overlay').style.display = 'none';
}

let activeInventoryPlayer = 0;
function toggleInventory(playerIdx) {
    if (gameState === 'playing') {
        activeInventoryPlayer = playerIdx;
        gameState = 'inventory';
        renderInventoryUI(players[playerIdx]);
        document.getElementById('inventory-overlay').style.display = '';
    } else if (gameState === 'inventory') {
        closeInventory();
    }
}
function closeInventory() {
    gameState = 'playing';
    document.getElementById('inventory-overlay').style.display = 'none';
}

function renderInventoryUI(p) {
    const wSlot = document.querySelector('.equip-slot[data-slot="weapon"] .slot-item');
    const aSlot = document.querySelector('.equip-slot[data-slot="armor"] .slot-item');
    wSlot.textContent = p.weapon ? p.weapon.name : 'Empty';
    wSlot.style.color = p.weapon ? RARITY_COLORS[p.weapon.rarity] : '#555';
    wSlot.className = 'slot-item' + (p.weapon ? ' has-item' : '');
    aSlot.textContent = p.armor ? p.armor.name : 'Empty';
    aSlot.style.color = p.armor ? RARITY_COLORS[p.armor.rarity] : '#555';
    aSlot.className = 'slot-item' + (p.armor ? ' has-item' : '');

    const grid = document.getElementById('inventory-items');
    grid.innerHTML = '';
    for (let i = 0; i < 15; i++) {
        const slot = document.createElement('div');
        slot.className = 'inv-slot';
        if (i < p.inventory.length) {
            const item = p.inventory[i];
            slot.className += ' has-item';
            slot.textContent = item.name.split(' ').map(w => w[0]).join('');
            slot.style.color = RARITY_COLORS[item.rarity];
            slot.title = item.name;
            slot.onclick = () => useItem(p, i);
        }
        grid.appendChild(slot);
    }
}

function useItem(p, idx) {
    const item = p.inventory[idx];
    if (!item) return;
    if (item.type === 'weapon') {
        if (p.weapon) p.inventory.push(p.weapon);
        p.weapon = item;
        p.inventory.splice(idx, 1);
        applyWeapon(p);
    } else if (item.type === 'armor') {
        if (p.armor) p.inventory.push(p.armor);
        p.armor = item;
        p.inventory.splice(idx, 1);
        applyArmor(p);
    } else if (item.type === 'potion') {
        if (item.effect === 'heal') {
            p.hp = Math.min(p.hp + item.value, p.maxHp);
            spawnParticles(p.x, p.y, '#cc2222', 8);
        } else {
            p.activeEffects.push({ effect: item.effect, value: item.value, endTime: gameTime + item.duration });
        }
        p.inventory.splice(idx, 1);
    }
    renderInventoryUI(p);
}

// ─── COMBAT ─────────────────────────────────────────────────
function playerAttack(p, now) {
    if (now - p.lastAttack < p.attackSpeed || p.dodging) return;
    p.lastAttack = now;
    p.attackAnim = 8;

    const dmgMult = p.activeEffects.some(e => e.effect === 'damage') ? 1.5 : 1;
    const dmg = Math.round(p.damage * dmgMult);

    if (p.attackType === 'melee') {
        // Melee attack — hit enemies in arc
        for (const e of enemies) {
            if (!e.alive) continue;
            const dx = e.x - p.x, dy = e.y - p.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < p.attackRange + e.radius) {
                const angleToEnemy = Math.atan2(dy, dx);
                let angleDiff = angleToEnemy - p.facingAngle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                if (Math.abs(angleDiff) < Math.PI * 0.6) {
                    dealDamageToEnemy(e, dmg, p);
                }
            }
        }
        spawnParticles(p.x + Math.cos(p.facingAngle) * 20, p.y + Math.sin(p.facingAngle) * 20, '#aaa', 4);
    } else {
        // Ranged attack — spawn projectile
        const speed = 6;
        projectiles.push({
            x: p.x, y: p.y,
            vx: Math.cos(p.facingAngle) * speed,
            vy: Math.sin(p.facingAngle) * speed,
            damage: dmg, owner: 'player', ownerRef: p,
            range: p.attackRange, traveled: 0,
            color: p.cls.color, radius: 4
        });
    }
}

function playerSpecial(p, now) {
    if (now - p.lastSpecial < p.specialCooldown || p.dodging) return;
    p.lastSpecial = now;

    switch (p.classId) {
        case 'warrior': // Shield Bash — stun nearby enemies
            for (const e of enemies) {
                if (!e.alive) continue;
                const dist = Math.hypot(e.x - p.x, e.y - p.y);
                if (dist < 60) {
                    e.stunned = now + 2000;
                    dealDamageToEnemy(e, 8, p);
                    spawnParticles(e.x, e.y, '#daa520', 6);
                }
            }
            triggerShake(5, 10);
            spawnParticles(p.x, p.y, '#daa520', 12);
            break;
        case 'mage': // Frost Nova — freeze nearby enemies
            for (const e of enemies) {
                if (!e.alive) continue;
                const dist = Math.hypot(e.x - p.x, e.y - p.y);
                if (dist < 100) {
                    e.frozen = now + 3000;
                    spawnParticles(e.x, e.y, '#88ccff', 6);
                }
            }
            triggerShake(4, 8);
            spawnParticles(p.x, p.y, '#88ccff', 16);
            break;
        case 'rogue': // Shadow Dash
            p.dodging = true;
            p.dodgeDir = { x: Math.cos(p.facingAngle), y: Math.sin(p.facingAngle) };
            p.dodgeTimer = 12;
            p.invincible = now + 400;
            spawnParticles(p.x, p.y, '#2e7d32', 8);
            break;
        case 'ranger': // Bear Trap
            lootDrops.push({
                x: p.x + Math.cos(p.facingAngle) * 40,
                y: p.y + Math.sin(p.facingAngle) * 40,
                type: 'trap', owner: p, active: true
            });
            break;
    }
}

function playerDodge(p, now) {
    if (p.dodgeCd > now || p.dodging) return;
    p.dodgeCd = now + 800;

    let dx = 0, dy = 0;
    if (p.playerIndex === 0) {
        if (keys['KeyW']) dy = -1; if (keys['KeyS']) dy = 1;
        if (keys['KeyA']) dx = -1; if (keys['KeyD']) dx = 1;
    } else {
        if (keys['ArrowUp']) dy = -1; if (keys['ArrowDown']) dy = 1;
        if (keys['ArrowLeft']) dx = -1; if (keys['ArrowRight']) dx = 1;
    }
    if (dx === 0 && dy === 0) { dx = Math.cos(p.facingAngle); dy = Math.sin(p.facingAngle); }
    const len = Math.sqrt(dx*dx + dy*dy);
    p.dodging = true;
    p.dodgeDir = { x: dx/len, y: dy/len };
    p.dodgeTimer = 8;
    p.invincible = now + 300;
}

function dealDamageToEnemy(e, dmg, p) {
    // Rogue backstab bonus
    if (p && p.classId === 'rogue') {
        const angleToPlayer = Math.atan2(p.y - e.y, p.x - e.x);
        const facingAngle = Math.atan2(e.target ? e.target.y - e.y : 0, e.target ? e.target.x - e.x : 0);
        let diff = Math.abs(angleToPlayer - facingAngle);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff > Math.PI * 0.6) dmg = Math.round(dmg * 1.5); // Backstab!
    }
    e.hp -= dmg;
    e.attackAnim = 5;
    damageNumbers.push({ x: e.x, y: e.y - 20, text: dmg.toString(), color: '#fff', life: 40 });
    spawnParticles(e.x, e.y, PAL.blood, 4);
    triggerShake(2, 4);

    if (e.hp <= 0) {
        e.alive = false;
        runStats.enemiesKilled++;
        if (e.isBoss) runStats.bossesKilled++;

        // XP
        for (const pl of players) {
            if (pl.alive) {
                pl.xp += e.xp;
                if (pl.xp >= pl.xpToNext) { pl.xp -= pl.xpToNext; pl.level++; pl.xpToNext = Math.round(pl.xpToNext * 1.3); pl.maxHp += 5; pl.hp = Math.min(pl.hp + 10, pl.maxHp); pl.damage += 1;
                    damageNumbers.push({ x: pl.x, y: pl.y - 30, text: 'LEVEL UP!', color: '#daa520', life: 60 });
                }
            }
        }

        // Gold drop
        const gold = Math.floor((5 + Math.random() * 10) * (e.isBoss ? 5 : 1));
        runStats.goldCollected += gold;
        damageNumbers.push({ x: e.x, y: e.y - 10, text: `+${gold}g`, color: '#daa520', life: 40 });

        // Loot drop
        if (Math.random() < (e.isBoss ? 1 : 0.2)) {
            lootDrops.push({ x: e.x, y: e.y, item: generateLoot(currentFloor), type: 'drop' });
            runStats.itemsFound++;
        }

        // Slime split
        if (e.splits && !e.isBoss) {
            for (let s = 0; s < 2; s++) {
                const se = createEnemy('bat', Math.floor(e.x / TILE), Math.floor(e.y / TILE), currentFloor);
                se.x = e.x + (Math.random() - 0.5) * 20;
                se.y = e.y + (Math.random() - 0.5) * 20;
                se.hp = 8; se.maxHp = 8; se.color = '#3a7a3a';
                enemies.push(se);
            }
        }

        // Boss kill → stairs
        if (e.isBoss) {
            lootDrops.push({ x: e.x, y: e.y + 30, type: 'stairs' });
        }

        spawnParticles(e.x, e.y, e.color, 12);
    }
}

function dealDamageToPlayer(p, dmg) {
    if (p.invincible > gameTime || p.dodging) return;
    const reduced = Math.max(1, dmg - p.defense);
    p.hp -= reduced;
    p.invincible = gameTime + 200;
    damageNumbers.push({ x: p.x, y: p.y - 30, text: reduced.toString(), color: '#ff4444', life: 40 });
    spawnParticles(p.x, p.y, PAL.blood, 5);
    triggerShake(3, 6);

    if (p.hp <= 0) {
        p.alive = false;
        p.hp = 0;
        spawnParticles(p.x, p.y, '#888', 20);
        // Check if all players dead
        if (players.every(pl => !pl.alive)) gameOver();
    }
}

// ─── ENEMY AI ───────────────────────────────────────────────
function updateEnemy(e, now) {
    if (!e.alive || e.stunned > now || e.frozen > now || e.trapped > now) return;

    // Find closest player
    let closest = null, closestDist = Infinity;
    for (const p of players) {
        if (!p.alive) continue;
        const d = Math.hypot(p.x - e.x, p.y - e.y);
        if (d < closestDist) { closestDist = d; closest = p; }
    }
    e.target = closest;
    if (!closest || closestDist > 300) return;

    const dx = closest.x - e.x, dy = closest.y - e.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    // Boss special abilities
    if (e.isBoss && e.special && now - e.specialTimer > (e.specialCd || 5000)) {
        e.specialTimer = now;
        bossSpecial(e, now);
    }

    // Movement
    if (dist > e.range * 0.8) {
        const moveX = (dx / dist) * e.speed;
        const moveY = (dy / dist) * e.speed;
        const nx = e.x + moveX, ny = e.y + moveY;
        if (isWalkable(nx, ny)) { e.x = nx; e.y = ny; }
        else if (isWalkable(nx, e.y)) e.x = nx;
        else if (isWalkable(e.x, ny)) e.y = ny;
    }

    // Attack
    if (dist < e.range + 10 && now - e.lastAttack > e.attackSpeed) {
        e.lastAttack = now;
        e.attackAnim = 5;
        if (e.type === 'ranged' || (e.isBoss && e.type === 'ranged')) {
            const angle = Math.atan2(dy, dx);
            projectiles.push({
                x: e.x, y: e.y,
                vx: Math.cos(angle) * 4,
                vy: Math.sin(angle) * 4,
                damage: e.damage, owner: 'enemy',
                range: e.range + 50, traveled: 0,
                color: e.color, radius: 3
            });
        } else if (e.type === 'summoner') {
            // Necromancer summon
            const se = createEnemy('skeleton', Math.floor(e.x / TILE), Math.floor(e.y / TILE), currentFloor);
            se.x = e.x + (Math.random() - 0.5) * 40;
            se.y = e.y + (Math.random() - 0.5) * 40;
            enemies.push(se);
            spawnParticles(se.x, se.y, '#5a2a5a', 8);
        } else {
            dealDamageToPlayer(closest, e.damage);
        }
    }
}

function bossSpecial(e, now) {
    switch (e.special) {
        case 'summon':
            for (let i = 0; i < 3; i++) {
                const se = createEnemy('skeleton', Math.floor(e.x / TILE), Math.floor(e.y / TILE), currentFloor);
                se.x = e.x + (Math.random() - 0.5) * 60;
                se.y = e.y + (Math.random() - 0.5) * 60;
                enemies.push(se);
            }
            spawnParticles(e.x, e.y, '#d4c8a0', 16);
            break;
        case 'split':
            for (let i = 0; i < 4; i++) {
                const se = createEnemy('slime', Math.floor(e.x / TILE), Math.floor(e.y / TILE), currentFloor);
                se.x = e.x + (Math.random() - 0.5) * 80;
                se.y = e.y + (Math.random() - 0.5) * 80;
                se.hp = 15; se.maxHp = 15;
                enemies.push(se);
            }
            spawnParticles(e.x, e.y, '#2a8a2a', 16);
            break;
        case 'teleport':
            const tp = players.find(p => p.alive);
            if (tp) {
                e.x = tp.x + (Math.random() - 0.5) * 80;
                e.y = tp.y + (Math.random() - 0.5) * 80;
                spawnParticles(e.x, e.y, '#3a2a4a', 12);
            }
            break;
        case 'fireBreath':
            for (let a = -0.4; a <= 0.4; a += 0.2) {
                const target = players.find(p => p.alive);
                if (!target) break;
                const angle = Math.atan2(target.y - e.y, target.x - e.x) + a;
                projectiles.push({
                    x: e.x, y: e.y,
                    vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
                    damage: Math.round(e.damage * 0.7), owner: 'enemy',
                    range: 180, traveled: 0, color: '#ff4400', radius: 5
                });
            }
            spawnParticles(e.x, e.y, '#ff4400', 12);
            break;
        case 'phaseShift':
            e.phase = e.phase === 1 ? 2 : 1;
            if (e.phase === 2) {
                e.speed *= 1.5; e.attackSpeed = Math.round(e.attackSpeed * 0.7);
                spawnParticles(e.x, e.y, '#8a2aaa', 20);
            } else {
                e.speed /= 1.5; e.attackSpeed = Math.round(e.attackSpeed / 0.7);
            }
            break;
    }
}

// ─── COLLISION / UTILITY ────────────────────────────────────
function isWalkable(px, py) {
    const col = Math.floor(px / TILE), row = Math.floor(py / TILE);
    if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return false;
    return dungeon.map[row][col] === 1;
}

function isWalkableRadius(px, py, r) {
    return isWalkable(px - r, py - r) && isWalkable(px + r, py - r) && isWalkable(px - r, py + r) && isWalkable(px + r, py + r);
}

function getRoomAt(px, py) {
    const col = Math.floor(px / TILE), row = Math.floor(py / TILE);
    for (const rm of dungeon.rooms) {
        if (col >= rm.x && col < rm.x + rm.w && row >= rm.y && row < rm.y + rm.h) return rm;
    }
    return null;
}

function triggerShake(intensity, duration) {
    screenShake.intensity = intensity;
    screenShake.duration = duration;
}

function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1 + Math.random() * 3;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 20 + Math.random() * 15, maxLife: 35, color, size: 1 + Math.random() * 2 });
    }
}

// ─── UPDATE LOOP ────────────────────────────────────────────
function update(now) {
    if (gameState !== 'playing') return;
    gameTime = now;

    // Update players
    for (const p of players) {
        if (!p.alive) continue;
        updatePlayer(p, now);
    }

    // Update enemies
    for (const e of enemies) updateEnemy(e, now);

    // Update projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        proj.x += proj.vx;
        proj.y += proj.vy;
        proj.traveled += Math.sqrt(proj.vx*proj.vx + proj.vy*proj.vy);

        // Wall collision
        if (!isWalkable(proj.x, proj.y)) { projectiles.splice(i, 1); spawnParticles(proj.x, proj.y, proj.color, 3); continue; }

        if (proj.traveled > proj.range) { projectiles.splice(i, 1); continue; }

        if (proj.owner === 'player') {
            for (const e of enemies) {
                if (!e.alive) continue;
                if (Math.hypot(e.x - proj.x, e.y - proj.y) < e.radius + proj.radius) {
                    dealDamageToEnemy(e, proj.damage, proj.ownerRef);
                    projectiles.splice(i, 1);
                    break;
                }
            }
        } else {
            for (const p of players) {
                if (!p.alive) continue;
                if (Math.hypot(p.x - proj.x, p.y - proj.y) < 12 + proj.radius) {
                    dealDamageToPlayer(p, proj.damage);
                    projectiles.splice(i, 1);
                    break;
                }
            }
        }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx; pt.y += pt.vy;
        pt.vx *= 0.95; pt.vy *= 0.95;
        pt.life--;
        if (pt.life <= 0) particles.splice(i, 1);
    }

    // Update damage numbers
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        damageNumbers[i].y -= 0.8;
        damageNumbers[i].life--;
        if (damageNumbers[i].life <= 0) damageNumbers.splice(i, 1);
    }

    // Check traps
    for (let i = lootDrops.length - 1; i >= 0; i--) {
        const l = lootDrops[i];
        if (l.type === 'trap' && l.active) {
            for (const e of enemies) {
                if (!e.alive) continue;
                if (Math.hypot(e.x - l.x, e.y - l.y) < 20) {
                    e.trapped = now + 3000;
                    e.stunned = now + 3000;
                    spawnParticles(l.x, l.y, '#8b4513', 8);
                    lootDrops.splice(i, 1);
                    break;
                }
            }
        }
    }

    // Pick up loot
    for (const p of players) {
        if (!p.alive) continue;
        for (let i = lootDrops.length - 1; i >= 0; i--) {
            const l = lootDrops[i];
            if (l.type === 'trap') continue;
            const dist = Math.hypot(p.x - l.x, p.y - l.y);

            if (l.type === 'stairs' && dist < 25) {
                nextFloor();
                return;
            }
            if (l.type === 'shop' && dist < 25 && mouse.clicked && p.playerIndex === 0) {
                if (runStats.goldCollected >= l.cost && p.inventory.length < 15) {
                    runStats.goldCollected -= l.cost;
                    p.inventory.push(l.item);
                    lootDrops.splice(i, 1);
                    damageNumbers.push({ x: l.x, y: l.y - 10, text: `-${l.cost}g`, color: '#cc4444', life: 40 });
                }
            }
            if ((l.type === 'drop' || l.type === 'chest') && dist < 25) {
                if (p.inventory.length < 15) {
                    p.inventory.push(l.item);
                    lootDrops.splice(i, 1);
                    damageNumbers.push({ x: l.x, y: l.y - 10, text: l.item.name, color: RARITY_COLORS[l.item.rarity], life: 50 });
                    runStats.itemsFound++;
                }
            }
        }
    }

    // Screen shake
    if (screenShake.duration > 0) {
        screenShake.x = (Math.random() - 0.5) * screenShake.intensity * 2;
        screenShake.y = (Math.random() - 0.5) * screenShake.intensity * 2;
        screenShake.duration--;
    } else {
        screenShake.x = 0; screenShake.y = 0;
    }

    // Room discovery + spawn enemies
    for (const p of players) {
        if (!p.alive) continue;
        const room = getRoomAt(p.x, p.y);
        if (room && !room.explored) {
            room.explored = true;
            spawnRoomEnemies(room, currentFloor);
        }
        p.currentRoom = room;
    }

    // Clean up active effects
    for (const p of players) {
        p.activeEffects = p.activeEffects.filter(e => e.endTime > now);
    }

    mouse.clicked = false;
}

function updatePlayer(p, now) {
    const speedMult = p.activeEffects.some(e => e.effect === 'speed') ? 1.5 : 1;
    const spd = p.speed * speedMult;

    // Dodge movement
    if (p.dodging) {
        const dodgeSpd = spd * 2.5;
        const nx = p.x + p.dodgeDir.x * dodgeSpd;
        const ny = p.y + p.dodgeDir.y * dodgeSpd;
        if (isWalkableRadius(nx, ny, 8)) { p.x = nx; p.y = ny; }
        p.dodgeTimer--;
        if (p.dodgeTimer <= 0) p.dodging = false;
        return;
    }

    // Movement
    let dx = 0, dy = 0;
    if (p.playerIndex === 0) {
        if (keys['KeyW']) dy = -1; if (keys['KeyS']) dy = 1;
        if (keys['KeyA']) dx = -1; if (keys['KeyD']) dx = 1;
    } else {
        if (keys['ArrowUp']) dy = -1; if (keys['ArrowDown']) dy = 1;
        if (keys['ArrowLeft']) dx = -1; if (keys['ArrowRight']) dx = 1;
    }
    if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx*dx + dy*dy);
        const nx = p.x + (dx/len) * spd;
        const ny = p.y + (dy/len) * spd;
        if (isWalkableRadius(nx, p.y, 8)) p.x = nx;
        if (isWalkableRadius(p.x, ny, 8)) p.y = ny;
    }

    // Facing direction
    if (p.playerIndex === 0) {
        // Mouse aim
        const wx = mouse.x - canvas.width/2 + camera.x;
        const wy = mouse.y - canvas.height/2 + camera.y;
        p.facingAngle = Math.atan2(wy - p.y, wx - p.x);
    } else {
        // P2 aims at nearest enemy
        let closest = null, closestDist = Infinity;
        for (const e of enemies) {
            if (!e.alive) continue;
            const d = Math.hypot(e.x - p.x, e.y - p.y);
            if (d < closestDist && d < 250) { closestDist = d; closest = e; }
        }
        if (closest) p.facingAngle = Math.atan2(closest.y - p.y, closest.x - p.x);
        else if (dx !== 0 || dy !== 0) p.facingAngle = Math.atan2(dy, dx);
    }

    // Attacks
    if (p.playerIndex === 0) {
        if (mouse.down) playerAttack(p, now);
        if (keys['KeyE']) playerSpecial(p, now);
        if (keys['Space']) playerDodge(p, now);
    } else {
        if (keys['Numpad0']) playerAttack(p, now);
        if (keys['Numpad1']) playerSpecial(p, now);
        if (keys['Numpad2']) playerDodge(p, now);
    }

    // Reduce attackAnim
    if (p.attackAnim > 0) p.attackAnim--;
}

// ─── RENDERING ──────────────────────────────────────────────
function render() {
    ctx.fillStyle = PAL.fog;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameState !== 'playing' && gameState !== 'paused' && gameState !== 'inventory') return;

    // Camera follows P1 (or centroid if co-op)
    let camX = 0, camY = 0, camCount = 0;
    for (const p of players) {
        if (p.alive) { camX += p.x; camY += p.y; camCount++; }
    }
    if (camCount > 0) { camera.x = camX / camCount; camera.y = camY / camCount; }

    const offX = canvas.width / 2 - camera.x + screenShake.x;
    const offY = canvas.height / 2 - camera.y + screenShake.y;

    ctx.save();
    ctx.translate(offX, offY);

    // Visible tile range
    const startCol = Math.max(0, Math.floor((camera.x - canvas.width/2) / TILE) - 1);
    const endCol = Math.min(MAP_COLS - 1, Math.ceil((camera.x + canvas.width/2) / TILE) + 1);
    const startRow = Math.max(0, Math.floor((camera.y - canvas.height/2) / TILE) - 1);
    const endRow = Math.min(MAP_ROWS - 1, Math.ceil((camera.y + canvas.height/2) / TILE) + 1);

    // Draw tiles
    for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
            const tx = c * TILE, ty = r * TILE;

            // Check if in explored room or corridor
            const visible = isTileVisible(c, r);
            if (!visible) { ctx.fillStyle = PAL.fog; ctx.fillRect(tx, ty, TILE, TILE); continue; }

            if (dungeon.map[r][c] === 1) {
                // Floor tile
                ctx.fillStyle = PAL.floor[(c + r * 7) % PAL.floor.length];
                ctx.fillRect(tx, ty, TILE, TILE);
                // Subtle grid lines
                ctx.strokeStyle = 'rgba(255,255,255,0.02)';
                ctx.strokeRect(tx, ty, TILE, TILE);
                // Random floor cracks
                if ((c * 13 + r * 7) % 17 === 0) {
                    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(tx + 5, ty + 10); ctx.lineTo(tx + 20, ty + 25); ctx.stroke();
                }
            } else {
                // Wall tile
                ctx.fillStyle = PAL.wall;
                ctx.fillRect(tx, ty, TILE, TILE);
                // Wall top edge (3D effect)
                if (r + 1 < MAP_ROWS && dungeon.map[r + 1][c] === 1) {
                    ctx.fillStyle = PAL.wallTop;
                    ctx.fillRect(tx, ty + TILE - 8, TILE, 8);
                }
            }
        }
    }

    // Torches
    for (const torch of dungeon.torches) {
        if (!isTileVisible(torch.x, torch.y)) continue;
        const tx = torch.x * TILE + TILE/2, ty = torch.y * TILE + TILE/2;
        // Torch holder
        ctx.fillStyle = '#3a2a1a'; ctx.fillRect(tx - 2, ty - 6, 4, 8);
        // Flame
        const flicker = Math.sin(gameTime * 0.01 + torch.x * 3) * 2;
        const fg = ctx.createRadialGradient(tx, ty - 8 + flicker, 0, tx, ty - 8 + flicker, 6);
        fg.addColorStop(0, '#ffcc44'); fg.addColorStop(0.5, '#ff8833'); fg.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.arc(tx, ty - 8 + flicker, 6, 0, Math.PI * 2); ctx.fill();
        // Light radius
        const lg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 60);
        lg.addColorStop(0, 'rgba(255,140,64,0.08)'); lg.addColorStop(1, 'rgba(255,140,64,0)');
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.arc(tx, ty, 60, 0, Math.PI * 2); ctx.fill();
    }

    // Loot drops
    for (const l of lootDrops) {
        if (l.type === 'trap') {
            ctx.fillStyle = '#8b4513'; ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(l.x, l.y, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            // Teeth
            ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1;
            for (let t = 0; t < 6; t++) {
                const a = (t / 6) * Math.PI * 2;
                ctx.beginPath(); ctx.moveTo(l.x + Math.cos(a) * 5, l.y + Math.sin(a) * 5);
                ctx.lineTo(l.x + Math.cos(a) * 9, l.y + Math.sin(a) * 9); ctx.stroke();
            }
            continue;
        }
        if (l.type === 'stairs') {
            // Stairs down
            ctx.fillStyle = '#444';
            ctx.fillRect(l.x - 12, l.y - 12, 24, 24);
            ctx.fillStyle = '#222';
            for (let s = 0; s < 3; s++) {
                ctx.fillRect(l.x - 10 + s * 3, l.y - 8 + s * 6, 18 - s * 6, 4);
            }
            ctx.fillStyle = '#daa520'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
            ctx.fillText('v', l.x, l.y + 3);
            continue;
        }
        // Item drop
        const bob = Math.sin(gameTime * 0.005 + l.x) * 3;
        if (l.type === 'chest') {
            ctx.fillStyle = '#8b6914'; ctx.fillRect(l.x - 8, l.y - 6 + bob, 16, 12);
            ctx.fillStyle = '#daa520'; ctx.fillRect(l.x - 2, l.y - 3 + bob, 4, 3);
        } else if (l.type === 'shop') {
            ctx.fillStyle = '#2a4a5a'; ctx.fillRect(l.x - 8, l.y - 6 + bob, 16, 12);
            ctx.fillStyle = '#daa520'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
            ctx.fillText(`${l.cost}g`, l.x, l.y + 14 + bob);
        } else {
            const col = l.item ? RARITY_COLORS[l.item.rarity] : '#888';
            ctx.fillStyle = col; ctx.globalAlpha = 0.7 + Math.sin(gameTime * 0.005) * 0.3;
            ctx.beginPath(); ctx.arc(l.x, l.y + bob, 5, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    // Enemies
    for (const e of enemies) {
        if (!e.alive) continue;
        const flash = e.attackAnim > 0;
        if (e.frozen > gameTime) ctx.globalAlpha = 0.6;
        if (e.stunned > gameTime) ctx.globalAlpha = 0.7;

        if (e.isBoss && e.drawBoss) {
            e.drawBoss(ctx, e, gameTime);
        } else {
            drawEnemy(ctx, e, flash);
        }
        ctx.globalAlpha = 1;

        // HP bar
        if (e.hp < e.maxHp) {
            const bw = e.isBoss ? 40 : 24;
            ctx.fillStyle = PAL.hpBg; ctx.fillRect(e.x - bw/2, e.y - e.radius - 10, bw, 4);
            ctx.fillStyle = PAL.hpBar; ctx.fillRect(e.x - bw/2, e.y - e.radius - 10, bw * (e.hp / e.maxHp), 4);
        }
    }

    // Players
    for (const p of players) {
        if (!p.alive) continue;
        if (p.invincible > gameTime && Math.floor(gameTime / 50) % 2 === 0) ctx.globalAlpha = 0.4;
        if (p.dodging) ctx.globalAlpha = 0.3;
        p.cls.drawChar(ctx, p, gameTime);
        ctx.globalAlpha = 1;
    }

    // Projectiles
    for (const proj of projectiles) {
        ctx.fillStyle = proj.color;
        ctx.shadowColor = proj.color; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        // Trail
        ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.arc(proj.x - proj.vx * 2, proj.y - proj.vy * 2, proj.radius * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    }

    // Particles
    for (const pt of particles) {
        ctx.globalAlpha = pt.life / pt.maxLife;
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x - pt.size/2, pt.y - pt.size/2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    // Damage numbers
    for (const dn of damageNumbers) {
        ctx.globalAlpha = dn.life / 40;
        ctx.fillStyle = dn.color;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(dn.text, dn.x, dn.y);
    }
    ctx.globalAlpha = 1;

    // Fog of war overlay (darken unexplored)
    drawFogOfWar(startCol, endCol, startRow, endRow);

    ctx.restore();

    // HUD
    drawHUD();
    drawMinimap();
}

function isTileVisible(c, r) {
    for (const rm of dungeon.rooms) {
        if (rm.explored && c >= rm.x - 1 && c <= rm.x + rm.w && r >= rm.y - 1 && r <= rm.y + rm.h) return true;
    }
    // Also check corridors near player
    for (const p of players) {
        if (!p.alive) continue;
        const pc = Math.floor(p.x / TILE), pr = Math.floor(p.y / TILE);
        if (Math.abs(c - pc) <= 4 && Math.abs(r - pr) <= 4) return true;
    }
    return false;
}

function drawFogOfWar(startCol, endCol, startRow, endRow) {
    // Radial light around players
    for (const p of players) {
        if (!p.alive) continue;
        const lg = ctx.createRadialGradient(p.x, p.y, 30, p.x, p.y, 180);
        lg.addColorStop(0, 'rgba(255,200,140,0.04)');
        lg.addColorStop(0.5, 'rgba(255,160,100,0.02)');
        lg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.arc(p.x, p.y, 180, 0, Math.PI * 2); ctx.fill();
    }
}

// ─── HUD ────────────────────────────────────────────────────
function drawHUD() {
    const pad = 15;
    for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const hx = i === 0 ? pad : canvas.width - 220 - pad;
        const hy = pad;

        // Background
        ctx.fillStyle = 'rgba(10,10,15,0.8)';
        ctx.fillRect(hx, hy, 220, 70);
        ctx.strokeStyle = '#2a2535';
        ctx.strokeRect(hx, hy, 220, 70);

        // Class name
        ctx.fillStyle = p.cls.color;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`P${i+1} ${p.cls.name}  Lv.${p.level}`, hx + 8, hy + 16);

        // HP bar
        ctx.fillStyle = PAL.hpBg; ctx.fillRect(hx + 8, hy + 24, 200, 10);
        ctx.fillStyle = p.hp > p.maxHp * 0.3 ? PAL.hpBar : '#cc2222';
        ctx.fillRect(hx + 8, hy + 24, 200 * Math.max(0, p.hp / p.maxHp), 10);
        ctx.fillStyle = '#c8c0b0'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
        ctx.fillText(`${Math.ceil(p.hp)}/${p.maxHp}`, hx + 108, hy + 32);

        // XP bar
        ctx.fillStyle = '#1a1a20'; ctx.fillRect(hx + 8, hy + 38, 200, 5);
        ctx.fillStyle = PAL.xpBar; ctx.fillRect(hx + 8, hy + 38, 200 * (p.xp / p.xpToNext), 5);

        // Special cooldown
        const specialReady = gameTime - p.lastSpecial >= p.specialCooldown;
        const specialPct = Math.min(1, (gameTime - p.lastSpecial) / p.specialCooldown);
        ctx.fillStyle = specialReady ? '#daa520' : '#444';
        ctx.font = '9px monospace'; ctx.textAlign = 'left';
        ctx.fillText(`[${p.cls.specialName}] ${specialReady ? 'READY' : Math.ceil((p.specialCooldown - (gameTime - p.lastSpecial))/1000) + 's'}`, hx + 8, hy + 56);

        // Dodge cooldown indicator
        const dodgeReady = gameTime >= p.dodgeCd;
        ctx.fillStyle = dodgeReady ? '#666' : '#333';
        ctx.fillText(`Dodge: ${dodgeReady ? 'OK' : '...'}`, hx + 150, hy + 56);

        // Dead overlay
        if (!p.alive) {
            ctx.fillStyle = 'rgba(80,0,0,0.6)';
            ctx.fillRect(hx, hy, 220, 70);
            ctx.fillStyle = '#cc2222'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
            ctx.fillText('DEAD', hx + 110, hy + 42);
        }
    }

    // Floor indicator
    ctx.fillStyle = '#c8c0b0'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
    ctx.fillText(`Floor ${currentFloor}/${MAX_FLOORS}`, canvas.width / 2, 25);

    // Gold
    ctx.fillStyle = '#daa520'; ctx.font = '12px monospace';
    ctx.fillText(`Gold: ${runStats.goldCollected}`, canvas.width / 2, 42);

    // Boss HP bar (if boss in room)
    const boss = enemies.find(e => e.isBoss && e.alive);
    if (boss) {
        const bx = canvas.width / 2 - 150, by = canvas.height - 50;
        ctx.fillStyle = 'rgba(10,10,15,0.8)'; ctx.fillRect(bx - 5, by - 5, 310, 30);
        ctx.fillStyle = '#c8c0b0'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
        ctx.fillText(boss.name, canvas.width / 2, by + 5);
        ctx.fillStyle = PAL.hpBg; ctx.fillRect(bx, by + 10, 300, 10);
        ctx.fillStyle = '#aa0000'; ctx.fillRect(bx, by + 10, 300 * (boss.hp / boss.maxHp), 10);
    }
}

function drawMinimap() {
    const mmSize = 120;
    const mmX = canvas.width - mmSize - 10, mmY = canvas.height - mmSize - 10;
    const scale = mmSize / Math.max(MAP_COLS, MAP_ROWS);

    ctx.fillStyle = 'rgba(10,10,15,0.85)';
    ctx.fillRect(mmX - 2, mmY - 2, mmSize + 4, mmSize + 4);

    for (const rm of dungeon.rooms) {
        if (!rm.explored) {
            ctx.fillStyle = PAL.minimap.unexplored;
        } else if (rm.type === 'boss') {
            ctx.fillStyle = PAL.minimap.boss;
        } else if (rm.type === 'treasure') {
            ctx.fillStyle = PAL.minimap.treasure;
        } else if (rm.type === 'shop') {
            ctx.fillStyle = PAL.minimap.shop;
        } else {
            ctx.fillStyle = PAL.minimap.explored;
        }
        ctx.fillRect(mmX + rm.x * scale, mmY + rm.y * scale, rm.w * scale, rm.h * scale);
    }

    // Player dots
    for (const p of players) {
        if (!p.alive) continue;
        ctx.fillStyle = p.playerIndex === 0 ? '#fff' : '#4a9eff';
        const px = mmX + (p.x / TILE) * scale;
        const py = mmY + (p.y / TILE) * scale;
        ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
    }
}

// ─── CHARACTER DRAWING ──────────────────────────────────────
function drawWarrior(ctx, p, time) {
    ctx.save(); ctx.translate(p.x, p.y);
    // Body
    ctx.fillStyle = p.attackAnim > 0 ? '#cc8844' : '#8b4513';
    ctx.beginPath(); ctx.arc(0, -10, 8, 0, Math.PI * 2); ctx.fill(); // Head
    ctx.fillRect(-5, -2, 10, 14); // Torso
    // Shield
    ctx.fillStyle = '#666'; ctx.fillRect(-10, -4, 4, 12);
    ctx.fillStyle = '#8b0000'; ctx.fillRect(-9, -2, 2, 8);
    // Sword (aimed direction)
    ctx.save(); ctx.rotate(p.facingAngle);
    ctx.fillStyle = '#bbb';
    ctx.fillRect(8, -1.5, 16 + (p.attackAnim > 0 ? 6 : 0), 3);
    ctx.fillStyle = '#8b4513'; ctx.fillRect(6, -3, 4, 6); // Hilt
    ctx.restore();
    // Legs
    ctx.fillStyle = '#5a3010';
    ctx.fillRect(-4, 12, 3, 8); ctx.fillRect(1, 12, 3, 8);
    // Player indicator
    ctx.fillStyle = p.playerIndex === 0 ? '#fff' : '#4a9eff';
    ctx.beginPath(); ctx.arc(0, -22, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawMage(ctx, p, time) {
    ctx.save(); ctx.translate(p.x, p.y);
    // Robe
    ctx.fillStyle = p.attackAnim > 0 ? '#8844cc' : '#4a2080';
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.lineTo(9, 18); ctx.lineTo(-9, 18); ctx.fill();
    // Head
    ctx.fillStyle = '#bba088'; ctx.beginPath(); ctx.arc(0, -6, 7, 0, Math.PI * 2); ctx.fill();
    // Hat
    ctx.fillStyle = '#3a1860';
    ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(0, -22); ctx.lineTo(8, -6); ctx.fill();
    // Staff (aimed direction)
    ctx.save(); ctx.rotate(p.facingAngle);
    ctx.strokeStyle = '#8b6b4a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(22, 0); ctx.stroke();
    // Staff orb
    ctx.fillStyle = '#aa44ff';
    ctx.shadowColor = '#aa44ff'; ctx.shadowBlur = p.attackAnim > 0 ? 15 : 8;
    ctx.beginPath(); ctx.arc(24, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    // Player indicator
    ctx.fillStyle = p.playerIndex === 0 ? '#fff' : '#4a9eff';
    ctx.beginPath(); ctx.arc(0, -26, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawRogue(ctx, p, time) {
    ctx.save(); ctx.translate(p.x, p.y);
    // Body (slim)
    ctx.fillStyle = p.attackAnim > 0 ? '#4a8a4a' : '#2a5a2a';
    ctx.beginPath(); ctx.arc(0, -8, 6, 0, Math.PI * 2); ctx.fill(); // Head
    ctx.fillRect(-4, -2, 8, 12); // Torso
    // Hood
    ctx.fillStyle = '#1a3a1a';
    ctx.beginPath(); ctx.arc(0, -8, 7, Math.PI, Math.PI * 2); ctx.fill();
    // Daggers (aimed direction)
    ctx.save(); ctx.rotate(p.facingAngle);
    ctx.fillStyle = '#ccc';
    ctx.fillRect(6, -3, 10 + (p.attackAnim > 0 ? 5 : 0), 2);
    ctx.fillRect(6, 1, 10 + (p.attackAnim > 0 ? 5 : 0), 2);
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(4, -4, 3, 8);
    ctx.restore();
    // Legs
    ctx.fillStyle = '#1a3a1a';
    ctx.fillRect(-3, 10, 2, 8); ctx.fillRect(1, 10, 2, 8);
    // Player indicator
    ctx.fillStyle = p.playerIndex === 0 ? '#fff' : '#4a9eff';
    ctx.beginPath(); ctx.arc(0, -18, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawRanger(ctx, p, time) {
    ctx.save(); ctx.translate(p.x, p.y);
    // Body
    ctx.fillStyle = p.attackAnim > 0 ? '#7aaa5a' : '#5a8a3a';
    ctx.beginPath(); ctx.arc(0, -8, 7, 0, Math.PI * 2); ctx.fill(); // Head
    ctx.fillRect(-5, -1, 10, 13); // Torso
    // Cloak
    ctx.fillStyle = '#3a5a2a';
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-8, 14); ctx.lineTo(8, 14); ctx.lineTo(6, 0); ctx.fill();
    // Bow (aimed direction)
    ctx.save(); ctx.rotate(p.facingAngle);
    ctx.strokeStyle = '#8b6b4a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(12, 0, 10, -0.8, 0.8); ctx.stroke();
    // Bowstring
    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(12 + Math.cos(-0.8) * 10, Math.sin(-0.8) * 10);
    ctx.lineTo(8, 0);
    ctx.lineTo(12 + Math.cos(0.8) * 10, Math.sin(0.8) * 10); ctx.stroke();
    // Arrow
    if (p.attackAnim > 0) {
        ctx.fillStyle = '#bbb'; ctx.fillRect(6, -0.5, 12, 1);
    }
    ctx.restore();
    // Legs
    ctx.fillStyle = '#3a5a2a';
    ctx.fillRect(-4, 12, 3, 7); ctx.fillRect(1, 12, 3, 7);
    // Player indicator
    ctx.fillStyle = p.playerIndex === 0 ? '#fff' : '#4a9eff';
    ctx.beginPath(); ctx.arc(0, -18, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

// ─── ENEMY DRAWING ──────────────────────────────────────────
function drawEnemy(ctx, e, flash) {
    ctx.save(); ctx.translate(e.x, e.y);
    const col = flash ? '#fff' : e.color;

    switch (e.enemyType) {
        case 'skeleton':
            ctx.fillStyle = col;
            ctx.beginPath(); ctx.arc(0, -8, 6, 0, Math.PI * 2); ctx.fill(); // Skull
            ctx.fillRect(-3, -2, 6, 10); // Ribs
            // Eye sockets
            ctx.fillStyle = '#300'; ctx.fillRect(-3, -10, 2, 2); ctx.fillRect(1, -10, 2, 2);
            ctx.fillStyle = col;
            ctx.fillRect(-2, 8, 2, 6); ctx.fillRect(1, 8, 2, 6); // Legs
            break;
        case 'archerSkeleton':
            ctx.fillStyle = col;
            ctx.beginPath(); ctx.arc(0, -8, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(-3, -2, 6, 10);
            ctx.fillStyle = '#300'; ctx.fillRect(-3, -10, 2, 2); ctx.fillRect(1, -10, 2, 2);
            // Bow
            ctx.strokeStyle = '#8b6b4a'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(8, 0, 7, -0.7, 0.7); ctx.stroke();
            break;
        case 'slime':
            ctx.fillStyle = col;
            const squish = 1 + Math.sin(gameTime * 0.005) * 0.1;
            ctx.save(); ctx.scale(1/squish, squish);
            ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
            // Eyes
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-3, -3, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(3, -3, 2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-3, -3, 1, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(3, -3, 1, 0, Math.PI * 2); ctx.fill();
            break;
        case 'bat':
            ctx.fillStyle = col;
            ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
            // Wings
            const wingAngle = Math.sin(gameTime * 0.02) * 0.5;
            ctx.save(); ctx.rotate(wingAngle);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-12, -6); ctx.lineTo(-8, 2); ctx.fill();
            ctx.restore();
            ctx.save(); ctx.rotate(-wingAngle);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(12, -6); ctx.lineTo(8, 2); ctx.fill();
            ctx.restore();
            // Eyes
            ctx.fillStyle = '#f00'; ctx.fillRect(-2, -2, 1.5, 1.5); ctx.fillRect(1, -2, 1.5, 1.5);
            break;
        case 'darkKnight':
            ctx.fillStyle = col;
            // Helmet
            ctx.beginPath(); ctx.arc(0, -10, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#220'; ctx.fillRect(-5, -12, 10, 3); // Visor
            ctx.fillStyle = col;
            // Armor body
            ctx.fillRect(-6, -2, 12, 14);
            // Shield
            ctx.fillStyle = '#222'; ctx.fillRect(-11, -4, 4, 14);
            ctx.fillStyle = '#880000'; ctx.fillRect(-10, -2, 2, 10);
            // Legs
            ctx.fillStyle = col; ctx.fillRect(-4, 12, 3, 7); ctx.fillRect(2, 12, 3, 7);
            break;
        case 'necromancer':
            // Purple robe
            ctx.fillStyle = col;
            ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.lineTo(10, 16); ctx.lineTo(-10, 16); ctx.fill();
            ctx.beginPath(); ctx.arc(0, -6, 6, 0, Math.PI * 2); ctx.fill();
            // Glowing eyes
            ctx.fillStyle = '#aa00ff';
            ctx.shadowColor = '#aa00ff'; ctx.shadowBlur = 6;
            ctx.fillRect(-3, -8, 2, 2); ctx.fillRect(1, -8, 2, 2);
            ctx.shadowBlur = 0;
            // Staff
            ctx.strokeStyle = '#4a2a4a'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(8, 14); ctx.stroke();
            ctx.fillStyle = '#aa00ff'; ctx.beginPath(); ctx.arc(8, -6, 3, 0, Math.PI * 2); ctx.fill();
            break;
    }
    ctx.restore();
}

// ─── BOSS DRAWING ───────────────────────────────────────────
function drawBoneKing(ctx, e, time) {
    ctx.save(); ctx.translate(e.x, e.y);
    // Large skeleton king
    ctx.fillStyle = e.attackAnim > 0 ? '#fff' : e.color;
    ctx.beginPath(); ctx.arc(0, -14, 12, 0, Math.PI * 2); ctx.fill(); // Big skull
    // Crown
    ctx.fillStyle = '#daa520';
    ctx.beginPath(); ctx.moveTo(-10, -22); ctx.lineTo(-8, -28); ctx.lineTo(-4, -24); ctx.lineTo(0, -30);
    ctx.lineTo(4, -24); ctx.lineTo(8, -28); ctx.lineTo(10, -22); ctx.fill();
    // Body
    ctx.fillStyle = e.color; ctx.fillRect(-8, -2, 16, 16);
    // Eye sockets
    ctx.fillStyle = '#a00';
    ctx.shadowColor = '#a00'; ctx.shadowBlur = 6;
    ctx.fillRect(-5, -18, 3, 3); ctx.fillRect(2, -18, 3, 3);
    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawSlimeMother(ctx, e, time) {
    ctx.save(); ctx.translate(e.x, e.y);
    const squish = 1 + Math.sin(time * 0.003) * 0.15;
    ctx.save(); ctx.scale(1/squish, squish);
    ctx.fillStyle = e.attackAnim > 0 ? '#4aca4a' : e.color;
    ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Multiple eyes
    ctx.fillStyle = '#ff0';
    for (let i = 0; i < 4; i++) {
        const ex = -8 + i * 5, ey = -6 + Math.sin(i + time * 0.003) * 2;
        ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#111';
    for (let i = 0; i < 4; i++) {
        const ex = -8 + i * 5, ey = -6 + Math.sin(i + time * 0.003) * 2;
        ctx.beginPath(); ctx.arc(ex, ey, 1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

function drawShadowWraith(ctx, e, time) {
    ctx.save(); ctx.translate(e.x, e.y);
    ctx.globalAlpha = 0.6 + Math.sin(time * 0.004) * 0.2;
    // Flowing dark shape
    ctx.fillStyle = e.attackAnim > 0 ? '#6a4a8a' : e.color;
    ctx.beginPath();
    ctx.moveTo(0, -e.radius);
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = e.radius + Math.sin(time * 0.006 + i * 2) * 5;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
    // Glowing eyes
    ctx.fillStyle = '#ff4444';
    ctx.shadowColor = '#ff4444'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(-5, -5, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, -5, 2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
}

function drawDragonHatchling(ctx, e, time) {
    ctx.save(); ctx.translate(e.x, e.y);
    ctx.fillStyle = e.attackAnim > 0 ? '#cc5544' : e.color;
    // Body
    ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.8, 0, Math.PI * 2); ctx.fill();
    // Head
    ctx.beginPath(); ctx.arc(e.radius * 0.5, -e.radius * 0.4, e.radius * 0.4, 0, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#ff8800';
    ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.arc(e.radius * 0.6, -e.radius * 0.5, 2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Wings
    ctx.fillStyle = '#6a1a0a';
    const wFlap = Math.sin(time * 0.008) * 0.3;
    ctx.save(); ctx.rotate(wFlap - 0.5);
    ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(-25, -20); ctx.lineTo(-10, 0); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.rotate(-wFlap + 0.5);
    ctx.beginPath(); ctx.moveTo(5, -5); ctx.lineTo(25, -20); ctx.lineTo(10, 0); ctx.fill();
    ctx.restore();
    // Tail
    ctx.strokeStyle = e.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-e.radius * 0.6, e.radius * 0.3);
    ctx.quadraticCurveTo(-e.radius, e.radius, -e.radius * 0.8, e.radius * 1.2); ctx.stroke();
    ctx.restore();
}

function drawLichLord(ctx, e, time) {
    ctx.save(); ctx.translate(e.x, e.y);
    const phase2 = e.phase === 2;
    // Robe
    ctx.fillStyle = phase2 ? '#6a2a8a' : e.color;
    ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(10, -4); ctx.lineTo(14, 20); ctx.lineTo(-14, 20); ctx.fill();
    // Skull head
    ctx.fillStyle = phase2 ? '#eee' : '#ccc';
    ctx.beginPath(); ctx.arc(0, -12, 10, 0, Math.PI * 2); ctx.fill();
    // Crown of dark energy
    ctx.strokeStyle = phase2 ? '#aa00ff' : '#4a2a6a';
    ctx.shadowColor = phase2 ? '#aa00ff' : '#4a2a6a';
    ctx.shadowBlur = phase2 ? 15 : 5;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI - Math.PI / 2 + Math.sin(time * 0.003 + i) * 0.1;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 10, -12 + Math.sin(a) * 10);
        ctx.lineTo(Math.cos(a) * 16, -12 + Math.sin(a) * 16); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    // Eyes
    ctx.fillStyle = phase2 ? '#ff00ff' : '#aa0000';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(-4, -14, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -14, 2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Staff
    ctx.strokeStyle = '#3a2a3a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(12, -10); ctx.lineTo(12, 18); ctx.stroke();
    // Orb
    ctx.fillStyle = phase2 ? '#ff00ff' : '#8a00aa';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(12, -14, 5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
}

// ─── UI BUTTONS ─────────────────────────────────────────────
document.getElementById('btn-solo').onclick = () => startRun(false);
document.getElementById('btn-coop').onclick = () => startRun(true);
document.getElementById('btn-shop').onclick = () => { showScreen('shop-screen'); renderShop(); };
document.getElementById('btn-stats').onclick = () => { showScreen('stats-screen'); renderStats(); };
document.getElementById('btn-back-title').onclick = () => showScreen('title-screen');
document.getElementById('btn-back-shop').onclick = () => showScreen('title-screen');
document.getElementById('btn-back-stats').onclick = () => showScreen('title-screen');
document.getElementById('btn-retry').onclick = () => { gameState = 'classSelect'; showScreen('class-screen'); };
document.getElementById('btn-menu').onclick = () => { gameState = 'title'; showScreen('title-screen'); };
document.getElementById('btn-resume').onclick = resumeGame;
document.getElementById('btn-quit').onclick = () => { gameState = 'title'; showScreen('title-screen'); document.getElementById('pause-overlay').style.display = 'none'; };

document.querySelectorAll('.class-card').forEach(card => {
    card.onclick = () => {
        document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        setTimeout(() => selectClass(card.dataset.class), 200);
    };
});

function renderShop() {
    const grid = document.getElementById('shop-items');
    const goldEl = document.getElementById('shop-gold');
    goldEl.textContent = meta.gold;
    grid.innerHTML = '';
    for (const item of SHOP_ITEMS) {
        const owned = meta.unlocks.includes(item.id);
        const div = document.createElement('div');
        div.className = 'shop-item' + (owned ? ' owned' : '');
        div.innerHTML = `<h4>${item.name}</h4><p>${item.desc}</p><div class="price">${owned ? 'Owned' : item.cost + 'g'}</div>`;
        if (!owned) {
            div.onclick = () => {
                if (meta.gold >= item.cost) {
                    meta.gold -= item.cost;
                    meta.unlocks.push(item.id);
                    saveMeta();
                    renderShop();
                }
            };
        }
        grid.appendChild(div);
    }
}

function renderStats() {
    document.getElementById('stats-content').innerHTML = `
        <div class="stat-line"><span>Total Runs</span><span>${meta.totalRuns}</span></div>
        <div class="stat-line"><span>Best Floor</span><span>${meta.bestFloor}</span></div>
        <div class="stat-line"><span>Total Kills</span><span>${meta.totalKills}</span></div>
        <div class="stat-line"><span>Gold Banked</span><span>${meta.gold}</span></div>
        <div class="stat-line"><span>Unlocks</span><span>${meta.unlocks.length}/${SHOP_ITEMS.length}</span></div>
    `;
}

// ─── GAME LOOP ──────────────────────────────────────────────
function gameLoop(timestamp) {
    update(timestamp);
    render();
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
