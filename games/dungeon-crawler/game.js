// ═══════════════════════════════════════════════════════════════
//  DUNGEON CRAWLER — Dark & Gritty Roguelike
// ═══════════════════════════════════════════════════════════════

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ─── CONSTANTS ───────────────────────────────────────────────
const TILE = 40;
const ROOM_MIN = 5, ROOM_MAX = 9;
const MAP_COLS = 60, MAP_ROWS = 60;
const MAX_FLOORS = Infinity;
const VIEWPORT_TILES_X = 25, VIEWPORT_TILES_Y = 18;

// ─── COLOR PALETTE (CYBERPUNK) ───────────────────────────────
const PAL = {
    floor: ['#0a0a14', '#0c0c18', '#08081a', '#0e0e16'],
    wall: '#04040c',
    wallTop: '#1a1a2e',
    door: '#1a0a2a',
    fog: '#020208',
    blood: '#ff0055',
    torchLight: '#00ffcc',
    hpBar: '#ff0055',
    hpBg: '#1a0a1a',
    manaBar: '#00ccff',
    xpBar: '#ff00ff',
    neonPink: '#ff0080',
    neonCyan: '#00ffee',
    neonPurple: '#aa00ff',
    neonYellow: '#eeff00',
    gridLine: 'rgba(0,255,200,0.04)',
    minimap: { explored: '#1a1a3a', current: '#ff0080', unexplored: '#060612', boss: '#ff0055', treasure: '#eeff00', shop: '#00ffee' }
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
let summonedMinions = [];
let activeBeams = [];
let impsEnraged = 0; // timestamp until imps attack mode
let healingCircles = [];
let lightningNets = [];
let domainExpansion = null; // active domain expansion effect
let screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
let camera = { x: 0, y: 0 };
let gameTime = 0;
let runStats = { enemiesKilled: 0, goldCollected: 0, floorsCleared: 0, bossesKilled: 0, itemsFound: 0 };
let lives = 5;

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
    angel: {
        name: 'Angel', maxHp: 90, speed: 3.25, attackRange: 160, attackDamage: 13, attackSpeed: 450,
        attackType: 'ranged', color: '#f0e68c', specialCooldown: 6000,
        specialName: 'Divine Wings', specialDesc: '+30% speed & heal allies for 5s',
        drawChar: drawAngel
    },
    demon: {
        name: 'Demon', maxHp: 100, speed: 2.4, attackRange: 35, attackDamage: 14, attackSpeed: 450,
        attackType: 'melee', color: '#cc2222', specialCooldown: 5000,
        specialName: 'Summon Imps', specialDesc: 'Summon 3 imp minions to fight',
        drawChar: drawDemon
    },
    draco: {
        name: 'Draco', maxHp: 110, speed: 2.3, attackRange: 40, attackDamage: 11, attackSpeed: 400,
        attackType: 'melee', color: '#6a1b9a', specialCooldown: 4000,
        specialName: 'Dragon Beam', specialDesc: 'Fire a devastating energy beam',
        drawChar: drawDraco
    },
    healer: {
        name: 'Healer', maxHp: 75, speed: 2.6, attackRange: 140, attackDamage: 8, attackSpeed: 600,
        attackType: 'ranged', color: '#43a047', specialCooldown: 3000,
        specialName: 'Healing Circle', specialDesc: 'Summon a healing zone for allies',
        drawChar: drawHealer, passive: 'autoHeal'
    },
    lightning: {
        name: 'Lightning', maxHp: 70, speed: 4.4, attackRange: 170, attackDamage: 12, attackSpeed: 400,
        attackType: 'ranged', color: '#ffeb3b', specialCooldown: 5000,
        specialName: 'Lightning Net', specialDesc: 'Trap & shock enemies in an electric net',
        drawChar: drawLightning
    },
    portal: {
        name: 'Portal', maxHp: 85, speed: 2.8, attackRange: 150, attackDamage: 12, attackSpeed: 500,
        attackType: 'ranged', color: '#00bcd4', specialCooldown: 6000,
        specialName: 'Rift Pull', specialDesc: 'Teleport all nearby enemies to you',
        drawChar: drawPortal, passive: 'autoPortal'
    },
    // ── Naruto ──
    naruto: {
        name: 'Naruto', maxHp: 100, speed: 3.0, attackRange: 30, attackDamage: 11, attackSpeed: 380,
        attackType: 'melee', color: '#ff8f00', specialCooldown: 5000,
        specialName: 'Shadow Clones', specialDesc: 'Summon 2 clones that copy your attacks for 4s',
        drawChar: drawNaruto
    },
    // ── Jujutsu Kaisen ──
    megumi: { name: 'Megumi', maxHp: 85, speed: 2.7, attackRange: 140, attackDamage: 11, attackSpeed: 500, attackType: 'ranged', color: '#1a237e', specialCooldown: 5000, specialName: 'Divine Dogs', specialDesc: 'Summon 2 shadow dogs to attack', drawChar: drawMegumi },
    // ── Solo Leveling ──
    jinwoo: { name: 'Jin-Woo', maxHp: 110, speed: 3.0, attackRange: 32, attackDamage: 14, attackSpeed: 350, attackType: 'melee', color: '#311b92', specialCooldown: 6000, specialName: 'Shadow Army', specialDesc: 'Raise 3 shadow soldiers from dead enemies', drawChar: drawJinWoo },
    // ── One Piece ──
    katakuri: { name: 'Katakuri', maxHp: 120, speed: 2.7, attackRange: 35, attackDamage: 8, attackSpeed: 180, attackType: 'melee', color: '#c62828', specialCooldown: 6000, specialName: 'Dough Fist Fusillade', specialDesc: 'Giant dough fists slam down repeatedly on all nearby enemies', drawChar: drawKatakuri },
    // ── Original ──
    frog: { name: 'Frog', maxHp: 100, speed: 2.5, attackRange: 25, attackDamage: 10, attackSpeed: 400, attackType: 'melee', color: '#4caf50', specialCooldown: 0, specialName: 'Electric Tongue', specialDesc: 'Spinning tongue spiral — catches and devours all enemies', drawChar: drawFrog },
    beeswarm: { name: 'Bee Swarm', maxHp: 60, speed: 3.5, attackRange: 160, attackDamage: 14, attackSpeed: 600, attackType: 'ranged', color: '#fdd835', specialCooldown: 3000, specialName: 'Split Swarm', specialDesc: 'Split apart to dodge — reform to mass sting', drawChar: drawBeeSwarm },
    trex: { name: 'T-Rex', maxHp: 180, speed: 1.8, attackRange: 40, attackDamage: 20, attackSpeed: 600, attackType: 'melee', color: '#4e342e', specialCooldown: 4000, specialName: 'Dino Stomp', specialDesc: 'Massive stomp + screen-shaking roar stuns all', drawChar: drawTRex },
    wendigo: { name: 'Wendigo', maxHp: 90, speed: 2.8, attackRange: 30, attackDamage: 12, attackSpeed: 380, attackType: 'melee', color: '#b0bec5', specialCooldown: 3000, specialName: 'Devour', specialDesc: 'Eat enemy — grow bigger and stronger each kill', drawChar: drawWendigo },
    alienqueen: { name: 'Alien Queen', maxHp: 110, speed: 2.3, attackRange: 140, attackDamage: 11, attackSpeed: 500, attackType: 'ranged', color: '#1b5e20', specialCooldown: 4000, specialName: 'Lay Eggs', specialDesc: 'Spawn face-hugger eggs that hatch and chase enemies', drawChar: drawAlienQueen },
    comet: { name: 'Comet', maxHp: 75, speed: 4.2, attackRange: 25, attackDamage: 10, attackSpeed: 350, attackType: 'melee', color: '#ff6f00', specialCooldown: 2000, specialName: 'Comet Dash', specialDesc: 'Blazing dash — fire trail, faster = more damage', drawChar: drawComet },
    telekinesis: { name: 'Telekinesis', maxHp: 80, speed: 2.6, attackRange: 160, attackDamage: 11, attackSpeed: 500, attackType: 'ranged', color: '#7c4dff', specialCooldown: 3000, specialName: 'TK Throw', specialDesc: 'Grab enemy and hurl them into other enemies', drawChar: drawTelekinesis },
    mindcontrol: { name: 'Mind Control', maxHp: 70, speed: 2.5, attackRange: 150, attackDamage: 9, attackSpeed: 550, attackType: 'ranged', color: '#e040fb', specialCooldown: 6000, specialName: 'Possess', specialDesc: 'Take over an enemy — fight as them temporarily', drawChar: drawMindControl },
    chimera: { name: 'Chimera', maxHp: 110, speed: 2.6, attackRange: 35, attackDamage: 13, attackSpeed: 400, attackType: 'melee', color: '#ff8f00', specialCooldown: 3000, specialName: 'Switch Head', specialDesc: 'Cycle heads — lion fire, goat lightning, snake poison', drawChar: drawChimera },
    mimic: { name: 'Mimic', maxHp: 90, speed: 2.8, attackRange: 30, attackDamage: 12, attackSpeed: 400, attackType: 'melee', color: '#8d6e63', specialCooldown: 5000, specialName: 'Copy', specialDesc: 'Transform into last enemy killed — gain their power', drawChar: drawMimic },
    supernova: { name: 'Supernova', maxHp: 85, speed: 2.4, attackRange: 130, attackDamage: 8, attackSpeed: 500, attackType: 'ranged', color: '#fff176', specialCooldown: 0, specialName: 'Charge & Release', specialDesc: 'Hold E to charge — release for massive explosion', drawChar: drawSupernova },
    puppet: { name: 'Puppet Master', maxHp: 75, speed: 2.5, attackRange: 160, attackDamage: 10, attackSpeed: 500, attackType: 'ranged', color: '#9c27b0', specialCooldown: 500, specialName: 'Strings', specialDesc: 'Attach strings to enemies — slam them into each other', drawChar: drawPuppet },
    medusa: { name: 'Medusa', maxHp: 80, speed: 2.5, attackRange: 130, attackDamage: 11, attackSpeed: 500, attackType: 'ranged', color: '#4caf50', specialCooldown: 3000, specialName: 'Stone Gaze', specialDesc: 'Petrify enemies in cone — stone takes 3x damage', drawChar: makeDrawFn('#4caf50','#1b5e20','long') },
    cerberus: { name: 'Cerberus', maxHp: 130, speed: 2.4, attackRange: 35, attackDamage: 14, attackSpeed: 350, attackType: 'melee', color: '#d32f2f', specialCooldown: 3500, specialName: 'Triple Breath', specialDesc: '3 heads breathe fire/ice/poison simultaneously', drawChar: makeDrawFn('#111','#d32f2f','round') },
    minotaur: { name: 'Minotaur', maxHp: 140, speed: 1.8, attackRange: 35, attackDamage: 18, attackSpeed: 550, attackType: 'melee', color: '#5d4037', specialCooldown: 2500, specialName: 'Bull Charge', specialDesc: 'Charge forward — longer run = more damage on impact', drawChar: makeDrawFn('#4e342e','#5d4037','round') },
    anubis: { name: 'Anubis', maxHp: 90, speed: 2.7, attackRange: 150, attackDamage: 12, attackSpeed: 480, attackType: 'ranged', color: '#fdd835', specialCooldown: 4000, specialName: 'Death Mark', specialDesc: 'Mark enemies — marked die in explosions damaging nearby', drawChar: makeDrawFn('#fdd835','#111','spiky') },
    thor: { name: 'Thor', maxHp: 120, speed: 2.6, attackRange: 35, attackDamage: 15, attackSpeed: 450, attackType: 'melee', color: '#42a5f5', specialCooldown: 3000, specialName: 'Mjolnir Throw', specialDesc: 'Throw hammer — boomerangs back with lightning strikes', drawChar: makeDrawFn('#fdd835','#1565c0','long') },
    venom: { name: 'Venom', maxHp: 115, speed: 3.0, attackRange: 40, attackDamage: 13, attackSpeed: 350, attackType: 'melee', color: '#111', specialCooldown: 2000, specialName: 'Tentacle Burst', specialDesc: 'Tentacles lash out in all 8 directions at once', drawChar: makeDrawFn('#111','#111','round') },
    cordyceps: { name: 'Cordyceps', maxHp: 85, speed: 2.3, attackRange: 120, attackDamage: 9, attackSpeed: 550, attackType: 'ranged', color: '#ff8f00', specialCooldown: 5000, specialName: 'Infect', specialDesc: 'Spore cloud — dead infected enemies rise as your zombies', drawChar: makeDrawFn('#ff8f00','#4e342e','spiky') },
    leech: { name: 'Leech', maxHp: 70, speed: 2.8, attackRange: 22, attackDamage: 8, attackSpeed: 300, attackType: 'melee', color: '#880e4f', specialCooldown: 1500, specialName: 'Latch On', specialDesc: 'Attach to enemy — drain 3 HP/s continuously until they die', drawChar: makeDrawFn('#880e4f','#4a0028','round') },
    chrono: { name: 'Chrono', maxHp: 80, speed: 2.8, attackRange: 140, attackDamage: 11, attackSpeed: 480, attackType: 'ranged', color: '#00bcd4', specialCooldown: 8000, specialName: 'Rewind', specialDesc: 'Rewind 3 seconds — undo all damage taken', drawChar: makeDrawFn('#00bcd4','#006064','spiky') },
    dimcutter: { name: 'Dim Cutter', maxHp: 85, speed: 2.6, attackRange: 35, attackDamage: 13, attackSpeed: 400, attackType: 'melee', color: '#00e5ff', specialCooldown: 3000, specialName: 'Portal Slash', specialDesc: 'Cut a rift — enemies nearby get teleported to a random spot', drawChar: makeDrawFn('#00e5ff','#00838f','spiky') },
    paradox: { name: 'Paradox', maxHp: 90, speed: 2.7, attackRange: 30, attackDamage: 12, attackSpeed: 400, attackType: 'melee', color: '#ff80ab', specialCooldown: 6000, specialName: 'Time Echo', specialDesc: 'Summon future self — delayed clone copies your moves', drawChar: makeDrawFn('#ff80ab','#880e4f','long') },
    drummer: { name: 'Drummer', maxHp: 95, speed: 2.5, attackRange: 28, attackDamage: 10, attackSpeed: 350, attackType: 'melee', color: '#ff5722', specialCooldown: 0, specialName: 'Beat Drop', specialDesc: 'Chain hits for combos: 3=shockwave 5=quake 7=mega blast', drawChar: makeDrawFn('#ff5722','#bf360c','spiky') },
    siren: { name: 'Siren', maxHp: 75, speed: 2.6, attackRange: 160, attackDamage: 10, attackSpeed: 500, attackType: 'ranged', color: '#80deea', specialCooldown: 4000, specialName: 'Lure Song', specialDesc: 'Sing — all enemies walk toward you helplessly then shatter', drawChar: makeDrawFn('#80deea','#006064','long') },
    mercury: { name: 'Mercury', maxHp: 95, speed: 3.0, attackRange: 32, attackDamage: 13, attackSpeed: 370, attackType: 'melee', color: '#b0bec5', specialCooldown: 2500, specialName: 'Reshape', specialDesc: 'Liquid metal — become blade wave that slices through enemies', drawChar: makeDrawFn('#b0bec5','#546e7a','round') },
    acid: { name: 'Acid', maxHp: 80, speed: 2.4, attackRange: 25, attackDamage: 9, attackSpeed: 400, attackType: 'melee', color: '#76ff03', specialCooldown: 1500, specialName: 'Dissolve', specialDesc: 'Acid pool trail — melt enemy armor to zero defense', drawChar: makeDrawFn('#76ff03','#33691e','spiky') },
    smoke: { name: 'Smoke', maxHp: 65, speed: 3.2, attackRange: 120, attackDamage: 10, attackSpeed: 500, attackType: 'ranged', color: '#546e7a', specialCooldown: 3000, specialName: 'Smoke Bomb', specialDesc: 'Vanish + poison cloud — choke damage in zone', drawChar: makeDrawFn('#546e7a','#263238','round') },
    antcolony: { name: 'Ant Colony', maxHp: 100, speed: 2.2, attackRange: 20, attackDamage: 7, attackSpeed: 200, attackType: 'melee', color: '#795548', specialCooldown: 4000, specialName: 'Swarm Rush', specialDesc: 'Send ant wave across floor — damages everything in path', drawChar: makeDrawFn('#5d4037','#3e2723','round') },
    ratking: { name: 'Rat King', maxHp: 90, speed: 2.8, attackRange: 25, attackDamage: 11, attackSpeed: 350, attackType: 'melee', color: '#616161', specialCooldown: 3000, specialName: 'Rat Horde', specialDesc: 'Summon rat wave — sacrifice rats to heal, more rats = more power', drawChar: makeDrawFn('#757575','#424242','round') },
    locust: { name: 'Locust', maxHp: 70, speed: 3.5, attackRange: 20, attackDamage: 6, attackSpeed: 250, attackType: 'melee', color: '#827717', specialCooldown: 2000, specialName: 'Plague Cloud', specialDesc: 'Darkening swarm — constant damage aura that grows over time', drawChar: makeDrawFn('#827717','#33691e','spiky') },
    mechashark: { name: 'Mecha Shark', maxHp: 120, speed: 2.8, attackRange: 180, attackDamage: 14, attackSpeed: 450, attackType: 'ranged', color: '#37474f', specialCooldown: 3000, specialName: 'Torpedo', specialDesc: 'Launch homing torpedo + sonar ping reveals all enemies', drawChar: makeDrawFn('#546e7a','#263238','round') },
    ghostrider: { name: 'Ghost Rider', maxHp: 100, speed: 3.0, attackRange: 35, attackDamage: 14, attackSpeed: 380, attackType: 'melee', color: '#ff6f00', specialCooldown: 3000, specialName: 'Hellfire Chain', specialDesc: 'Spinning fire chain whip + hellfire trail behind you', drawChar: makeDrawFn('#ff6f00','#111','spiky') },
    icephoenix: { name: 'Ice Phoenix', maxHp: 85, speed: 3.2, attackRange: 150, attackDamage: 12, attackSpeed: 450, attackType: 'ranged', color: '#4fc3f7', specialCooldown: 5000, specialName: 'Frost Dive', specialDesc: 'Dive and freeze all nearby — shatter frozen for 3x damage', drawChar: makeDrawFn('#e1f5fe','#0288d1','long') },
    plaguerat: { name: 'Plague Rat', maxHp: 80, speed: 3.0, attackRange: 25, attackDamage: 8, attackSpeed: 320, attackType: 'melee', color: '#33691e', specialCooldown: 2000, specialName: 'Sneeze', specialDesc: 'Toxic sneeze cone — more poisoned enemies = stronger you get', drawChar: makeDrawFn('#33691e','#1b5e20','round') },
    carddealer: { name: 'Card Dealer', maxHp: 85, speed: 2.6, attackRange: 150, attackDamage: 11, attackSpeed: 480, attackType: 'ranged', color: '#d32f2f', specialCooldown: 2000, specialName: 'Draw Card', specialDesc: 'Random card: heal/damage/buff/wild (random massive effect)', drawChar: makeDrawFn('#d32f2f','#111','round') },
    diceroller: { name: 'Dice Roller', maxHp: 90, speed: 2.6, attackRange: 30, attackDamage: 10, attackSpeed: 400, attackType: 'melee', color: '#fff', specialCooldown: 1500, specialName: 'Roll Dice', specialDesc: 'Roll 1-6 multiplier on next attack — 6 = critical explosion', drawChar: makeDrawFn('#fff','#111','round') },
    chessking: { name: 'Chess King', maxHp: 95, speed: 2.0, attackRange: 140, attackDamage: 11, attackSpeed: 500, attackType: 'ranged', color: '#fdd835', specialCooldown: 4000, specialName: 'Summon Pawns', specialDesc: 'Place 4 pawn minions — castle-swap with any pawn instantly', drawChar: makeDrawFn('#fdd835','#fff','round') },
    rage: { name: 'Rage', maxHp: 110, speed: 2.5, attackRange: 30, attackDamage: 10, attackSpeed: 400, attackType: 'melee', color: '#d50000', specialCooldown: 0, specialName: 'Unleash', specialDesc: 'Damage taken charges rage — full rage = 2x everything for 5s', drawChar: makeDrawFn('#d50000','#b71c1c','spiky') },
    fear: { name: 'Fear', maxHp: 80, speed: 2.8, attackRange: 140, attackDamage: 12, attackSpeed: 480, attackType: 'ranged', color: '#4a148c', specialCooldown: 3500, specialName: 'Nightmare', specialDesc: 'Terror zone — enemies flee and take 2x damage while scared', drawChar: makeDrawFn('#4a148c','#1a0033','long') },
    love: { name: 'Love', maxHp: 75, speed: 2.6, attackRange: 150, attackDamage: 9, attackSpeed: 500, attackType: 'ranged', color: '#e91e63', specialCooldown: 5000, specialName: 'Charm', specialDesc: 'Charm enemy permanently — fights for you (max 3 charmed)', drawChar: makeDrawFn('#e91e63','#880e4f','long') },
    chaos: { name: 'Chaos', maxHp: 90, speed: 2.8, attackRange: 35, attackDamage: 12, attackSpeed: 400, attackType: 'melee', color: '#ff00ff', specialCooldown: 1000, specialName: '???', specialDesc: 'Every press = random ability from ANY other class. Pure madness.', drawChar: makeDrawFn('#ff00ff','#111','spiky') }
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
    { name: 'Holy Scepter', type: 'weapon', subtype: 'scepter', damage: 12, speed: 450, range: 160, forClass: 'angel' },
    { name: 'Seraph Rod', type: 'weapon', subtype: 'scepter', damage: 16, speed: 420, range: 180, forClass: 'angel' },
    { name: 'Divine Rod', type: 'weapon', subtype: 'scepter', damage: 19, speed: 400, range: 190, forClass: 'angel' },
    { name: 'Hell Claw', type: 'weapon', subtype: 'claw', damage: 12, speed: 420, range: 32, forClass: 'demon' },
    { name: 'Inferno Fist', type: 'weapon', subtype: 'claw', damage: 16, speed: 400, range: 35, forClass: 'demon' },
    { name: 'Abyssal Talon', type: 'weapon', subtype: 'claw', damage: 20, speed: 380, range: 38, forClass: 'demon' },
    { name: 'Dragon Claw', type: 'weapon', subtype: 'dragonclaw', damage: 10, speed: 400, range: 38, forClass: 'draco' },
    { name: 'Wyrm Fang', type: 'weapon', subtype: 'dragonclaw', damage: 14, speed: 370, range: 42, forClass: 'draco' },
    { name: 'Elder Scale', type: 'weapon', subtype: 'dragonclaw', damage: 18, speed: 350, range: 45, forClass: 'draco' },
    { name: 'Wooden Cane', type: 'weapon', subtype: 'cane', damage: 7, speed: 600, range: 140, forClass: 'healer' },
    { name: 'Life Staff', type: 'weapon', subtype: 'cane', damage: 10, speed: 550, range: 160, forClass: 'healer' },
    { name: 'Nature Wand', type: 'weapon', subtype: 'cane', damage: 13, speed: 500, range: 170, forClass: 'healer' },
    { name: 'Spark Rod', type: 'weapon', subtype: 'rod', damage: 11, speed: 400, range: 160, forClass: 'lightning' },
    { name: 'Storm Rod', type: 'weapon', subtype: 'rod', damage: 15, speed: 370, range: 180, forClass: 'lightning' },
    { name: 'Thunder Rod', type: 'weapon', subtype: 'rod', damage: 18, speed: 350, range: 190, forClass: 'lightning' },
    { name: 'Rift Shard', type: 'weapon', subtype: 'orb', damage: 11, speed: 500, range: 150, forClass: 'portal' },
    { name: 'Void Orb', type: 'weapon', subtype: 'orb', damage: 15, speed: 460, range: 170, forClass: 'portal' },
    { name: 'Warp Core', type: 'weapon', subtype: 'orb', damage: 18, speed: 420, range: 180, forClass: 'portal' },
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
    { id: 'startScepter', name: 'Seraph Rod', desc: 'Start with a better scepter', cost: 50 },
    { id: 'startClaw', name: 'Inferno Fist', desc: 'Start with a better claw', cost: 50 },
    { id: 'startDragonClaw', name: 'Wyrm Fang', desc: 'Start with a better dragon claw', cost: 50 },
    { id: 'startCane', name: 'Life Staff', desc: 'Start with a better healing staff', cost: 50 },
    { id: 'startRod', name: 'Storm Rod', desc: 'Start with a better lightning rod', cost: 50 },
    { id: 'startOrb', name: 'Void Orb', desc: 'Start with a better rift orb', cost: 50 },
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
        if (e.code === 'Escape') {
            // Close any open inventories first
            for (const p of players) { if (p.inventoryOpen) { closeInventory(p.playerIndex); } }
            gameState = 'paused'; document.getElementById('pause-overlay').style.display = '';
        }
    } else if (gameState === 'paused') {
        if (e.code === 'Escape') resumeGame();
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
    const offsets = [-1.5, -0.5, 0.5, 1.5];
    const offsetX = offsets[playerIndex] || 0;
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
        inventoryOpen: false,
    };

    // Starting equipment from shop unlocks
    if (playerIndex === 0) {
        applyShopUnlocks(p);
    }

    return p;
}

function applyShopUnlocks(p) {
    const classWeaponMap = { angel: 'startScepter', demon: 'startClaw', draco: 'startDragonClaw', healer: 'startCane', lightning: 'startRod', portal: 'startOrb' };
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
    lives = 5;
    runStats = { enemiesKilled: 0, goldCollected: 0, floorsCleared: 0, bossesKilled: 0, itemsFound: 0 };
    // Use host's dungeon if we're a client, otherwise generate our own
    if (NET.isOnline && !NET.isHost && NET._hostDungeon) {
        dungeon = NET._hostDungeon;
        NET._hostDungeon = null;
    } else {
        dungeon = generateDungeon(currentFloor);
    }
    dungeon.rooms[0].explored = true;
    // Create players now that dungeon exists
    players = selectedClasses.map((cls, i) => createPlayer(cls, i));
    if (!NET.isOnline || NET.isHost) populateDungeon();
    projectiles = [];
    particles = [];
    damageNumbers = [];
    summonedMinions = [];
    activeBeams = [];
    healingCircles = [];
    lightningNets = [];
    domainExpansion = null;
    gameState = 'playing';
    showScreen(null);
    gameTime = 0;
}

function nextFloor() {
    currentFloor++;
    runStats.floorsCleared++;
    dungeon = generateDungeon(currentFloor);
    dungeon.rooms[0].explored = true;
    populateDungeon();
    const startRoom = dungeon.rooms[0];
    players.forEach((p, i) => {
        const offsets = [-1, 1, 0];
        p.x = (startRoom.cx + (offsets[i] || 0)) * TILE + TILE/2;
        p.y = startRoom.cy * TILE + TILE/2;
        if (!p.alive) {
            // Respawn dead players on new floor
            p.alive = true;
            p.hp = Math.round(p.maxHp * 0.5); // respawn at half HP
            spawnParticles(p.x, p.y, '#00ffcc', 12);
            damageNumbers.push({ x: p.x, y: p.y - 25, text: 'RESPAWNED', color: '#00ffcc', life: 50 });
        } else {
            p.hp = Math.min(p.hp + 20, p.maxHp);
        }
    });
    projectiles = [];
    particles = [];
    // Keep Jin-Woo shadow soldiers alive across floors, clear everything else
    summonedMinions = summonedMinions.filter(m => (m.type === 'shadow' || m.type === 'shadowBoss' || m.type === 'insect') && m.life === Infinity);
    // Teleport surviving shadows to start room
    const floorStart = dungeon.rooms[0];
    summonedMinions.forEach(m => {
        m.x = floorStart.cx * TILE + TILE/2 + (Math.random()-0.5)*40;
        m.y = floorStart.cy * TILE + TILE/2 + (Math.random()-0.5)*40;
        m._stuckSince = 0;
    });
    activeBeams = [];
    healingCircles = [];
    lightningNets = [];
    domainExpansion = null;
    enemies = [];
    lootDrops = [];
    populateDungeon();

    // Send new dungeon to clients
    if (NET.isOnline && NET.isHost) {
        for (const conn of NET.connections) {
            if (conn.open) conn.send({ type: 'nextFloor', floor: currentFloor, dungeon: {
                map: dungeon.map,
                rooms: dungeon.rooms.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h, type: r.type, explored: r.explored, cx: r.cx, cy: r.cy, enemies: [] })),
                torches: dungeon.torches,
                floor: dungeon.floor
            }});
        }
    }
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
    if (currentFloor > meta.bestFloor) meta.bestFloor = currentFloor;
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

let activeInventoryPlayer = -1;
function toggleInventory(playerIdx) {
    if (!players[playerIdx]) return;
    if (players[playerIdx].inventoryOpen) {
        closeInventory(playerIdx);
    } else {
        players[playerIdx].inventoryOpen = true;
        activeInventoryPlayer = playerIdx;
        renderInventoryUI(players[playerIdx]);
        document.getElementById('inventory-overlay').style.display = '';
        // Position overlay on the correct side in split screen
        const overlay = document.getElementById('inventory-overlay');
        if (coopMode && players.length === 2) {
            overlay.style.left = playerIdx === 0 ? '0' : '50%';
            overlay.style.width = '50%';
        } else {
            overlay.style.left = '0';
            overlay.style.width = '100%';
        }
    }
}
function closeInventory(playerIdx) {
    if (playerIdx === undefined) playerIdx = activeInventoryPlayer;
    if (playerIdx >= 0 && players[playerIdx]) players[playerIdx].inventoryOpen = false;
    activeInventoryPlayer = -1;
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
        const isBee = p.classId === 'beeswarm';
        projectiles.push({
            x: p.x, y: p.y,
            vx: Math.cos(p.facingAngle) * (isBee ? 4 : speed),
            vy: Math.sin(p.facingAngle) * (isBee ? 4 : speed),
            damage: dmg, owner: 'player', ownerRef: p,
            range: p.attackRange, traveled: 0,
            color: isBee ? '#ffb300' : p.cls.color,
            radius: isBee ? 16 : 4,
            isHoneyBall: isBee
        });
    }
}

function playerSpecial(p, now) {
    if (now - p.lastSpecial < p.specialCooldown || p.dodging) return;
    p.lastSpecial = now;

    switch (p.classId) {
        case 'angel': // Divine Wings — speed boost + heal
            p.activeEffects.push({ effect: 'speed', value: 1.3, endTime: now + 5000 });
            p.activeEffects.push({ effect: 'wings', value: 1, endTime: now + 5000 });
            p.hp = Math.min(p.hp + 25, p.maxHp);
            // Heal co-op partner too
            for (const ally of players) {
                if (ally !== p && ally.alive) {
                    ally.hp = Math.min(ally.hp + 15, ally.maxHp);
                    spawnParticles(ally.x, ally.y, '#fffacd', 10);
                    damageNumbers.push({ x: ally.x, y: ally.y - 20, text: '+15', color: '#f0e68c', life: 40 });
                }
            }
            spawnParticles(p.x, p.y, '#f0e68c', 20);
            spawnParticles(p.x, p.y, '#fff', 10);
            damageNumbers.push({ x: p.x, y: p.y - 20, text: '+25', color: '#f0e68c', life: 40 });
            triggerShake(3, 6);
            break;
        case 'demon': // Summon Imps
            for (let i = 0; i < 3; i++) {
                const angle = p.facingAngle + (i - 1) * 0.8;
                const sx = p.x + Math.cos(angle) * 30;
                const sy = p.y + Math.sin(angle) * 30;
                summonedMinions.push({
                    x: sx, y: sy, owner: p,
                    hp: 20, maxHp: 20, damage: 6,
                    speed: 2.5, radius: 7, attackRange: 22,
                    lastAttack: 0, attackSpeed: 600,
                    life: now + 8000, // 8 seconds lifespan
                    color: '#ff4444', type: 'imp'
                });
                spawnParticles(sx, sy, '#cc2222', 8);
            }
            spawnParticles(p.x, p.y, '#880000', 12);
            triggerShake(4, 8);
            break;
        case 'draco': // Dragon Beam
            const beamLen = 250;
            const beamWidth = 18;
            // Damage all enemies in beam path
            for (const e of enemies) {
                if (!e.alive) continue;
                // Check if enemy is in beam rectangle
                const dx = e.x - p.x, dy = e.y - p.y;
                const along = dx * Math.cos(p.facingAngle) + dy * Math.sin(p.facingAngle);
                const perp = Math.abs(-dx * Math.sin(p.facingAngle) + dy * Math.cos(p.facingAngle));
                if (along > 0 && along < beamLen && perp < beamWidth) {
                    dealDamageToEnemy(e, Math.round(p.damage * 2), p);
                }
            }
            // Beam visual effect
            activeBeams.push({
                x: p.x, y: p.y, angle: p.facingAngle,
                length: beamLen, width: beamWidth,
                life: 20, maxLife: 20, color: '#9c27b0'
            });
            spawnParticles(p.x + Math.cos(p.facingAngle) * 20, p.y + Math.sin(p.facingAngle) * 20, '#ce93d8', 16);
            triggerShake(6, 12);
            break;
        case 'healer': // Healing Circle
            healingCircles.push({
                x: p.x, y: p.y, owner: p,
                radius: 70, life: now + 4000,
                healRate: 500, lastHeal: 0,
                color: '#43a047'
            });
            spawnParticles(p.x, p.y, '#66bb6a', 16);
            triggerShake(2, 4);
            break;
        case 'lightning': // Lightning Net
            const netX = p.x + Math.cos(p.facingAngle) * 80;
            const netY = p.y + Math.sin(p.facingAngle) * 80;
            lightningNets.push({
                x: netX, y: netY, owner: p,
                radius: 60, life: now + 5000,
                damage: 3, damageRate: 400, lastDamage: 0,
                color: '#ffeb3b'
            });
            spawnParticles(netX, netY, '#ffeb3b', 20);
            spawnParticles(netX, netY, '#fff', 8);
            triggerShake(4, 8);
            break;
        case 'portal': // Rift Pull — teleport ALL enemies in range to player
            for (const e of enemies) {
                if (!e.alive) continue;
                const dist = Math.hypot(e.x - p.x, e.y - p.y);
                if (dist < 300) {
                    spawnParticles(e.x, e.y, '#00bcd4', 6);
                    const angle = Math.random() * Math.PI * 2;
                    const offset = 30 + Math.random() * 20;
                    e.x = p.x + Math.cos(angle) * offset;
                    e.y = p.y + Math.sin(angle) * offset;
                    e.stunned = Math.max(e.stunned, now + 1000);
                    spawnParticles(e.x, e.y, '#80deea', 6);
                }
            }
            spawnParticles(p.x, p.y, '#00bcd4', 24);
            spawnParticles(p.x, p.y, '#fff', 10);
            triggerShake(6, 12);
            break;
        case 'katakuri': // Dough Fist Fusillade — fists launch from side rings
            { const range = 120;
            if (!p._fusillade) p._fusillade = [];
            const snap = enemies.filter(e => e.alive && Math.hypot(e.x - p.x, e.y - p.y) < range);
            const ringL = p._ringLeft || { x: p.x - 12, y: p.y };
            const ringR = p._ringRight || { x: p.x + 12, y: p.y };
            for (let i = 0; i < 8; i++) {
                const ring = i % 2 === 0 ? ringL : ringR; // alternate from left and right ring
                const target = snap[i % Math.max(snap.length, 1)];
                const tx = target ? target.x + (Math.random() - 0.5) * 30 : p.x + Math.cos(p.facingAngle + (Math.random() - 0.5) * 2) * (40 + Math.random() * 80);
                const ty = target ? target.y + (Math.random() - 0.5) * 30 : p.y + Math.sin(p.facingAngle + (Math.random() - 0.5) * 2) * (40 + Math.random() * 80);
                p._fusillade.push({ x: tx, y: ty, srcX: ring.x, srcY: ring.y, delay: i * 150, startTime: now, damage: Math.round(p.damage * 2), owner: p, hit: false });
            }
            damageNumbers.push({ x: p.x, y: p.y - 30, text: 'FUSILLADE!', color: '#c62828', life: 50 });
            spawnParticles(p.x, p.y, '#e8b0a0', 12);
            triggerShake(4, 6); } break;
        case 'naruto': // Shadow Clones — 8 clones
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                summonedMinions.push({ x: p.x + Math.cos(angle) * 25, y: p.y + Math.sin(angle) * 25, owner: p,
                    hp: 9999, maxHp: 9999, damage: Math.round(p.damage * 0.6), speed: p.speed, radius: 7, attackRange: 22,
                    lastAttack: 0, attackSpeed: 400, life: Infinity, color: '#ff8f00', type: 'clone' });
            }
            spawnParticles(p.x, p.y, '#ff8f00', 12); triggerShake(3, 5); break;
        case 'megumi': // Divine Dogs — summon 8 fiends orbiting player
            for (let i = 0; i < 8; i++) { const angle = (i / 8) * Math.PI * 2;
                summonedMinions.push({ x: p.x+Math.cos(angle)*35, y: p.y+Math.sin(angle)*35, owner: p,
                    hp: 30, maxHp: 30, damage: 8, speed: 3.5, radius: 9, attackRange: 28,
                    lastAttack: 0, attackSpeed: 400, life: now + 10000, color: '#1a237e', type: 'dog',
                    _guardIndex: i, _guardTotal: 8, _orbit: true }); }
            spawnParticles(p.x, p.y, '#283593', 16); triggerShake(4, 8); break;
        case 'jinwoo': // Shadow Army — start spawning shadows 1 at a time
            { p._shadowSpawning = true; p._lastShadowSpawn = now;
            const existing = summonedMinions.filter(m => m.type === 'shadow' && m.owner === p).length;
            damageNumbers.push({ x: p.x, y: p.y - 30, text: 'ARISE!', color: '#7c4dff', life: 50 });
            spawnParticles(p.x, p.y, '#311b92', 12); spawnParticles(p.x, p.y, '#7c4dff', 6);
            triggerShake(4, 8); } break;
        case 'frog': // Electric Tongue — spinning wide arc traps everything
            { // Start or continue tongue spin
            if (!p._tongueActive) {
                p._tongueActive = true;
                p._tongueStart = now;
                p._tongueAngle = p.facingAngle;
                p._tongueTrapped = new Set();
            }
            } break;
        case 'beeswarm': // Split Swarm — scatter then reform with mass sting
            { p.invincible = now + 1500; // invincible while split
            p.activeEffects.push({ effect: 'split', value: 1, endTime: now + 1500 });
            // After split, mass sting everything nearby
            const snap = enemies.slice();
            for (const e of snap) { if (!e.alive) continue;
                const dist = Math.hypot(e.x-p.x, e.y-p.y);
                if (dist < 80) {
                    dealDamageToEnemy(e, Math.round(p.damage * 2), p);
                    spawnParticles(e.x, e.y, '#fdd835', 4);
                }
            }
            // Scatter bee particles everywhere
            for (let b = 0; b < 20; b++) {
                const a = Math.random() * Math.PI * 2, r = 20 + Math.random() * 50;
                spawnParticles(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, '#fdd835', 1);
            }
            damageNumbers.push({ x: p.x, y: p.y - 25, text: 'BZZZZ STING!', color: '#fdd835', life: 40 });
            triggerShake(5, 8); } break;
        case 'trex': // Dino Stomp + Roar
            { // Massive stomp AoE
            const range = 70;
            const snap = enemies.slice();
            for (const e of snap) { if (!e.alive) continue;
                if (Math.hypot(e.x-p.x, e.y-p.y) < range) {
                    dealDamageToEnemy(e, Math.round(p.damage * 2), p);
                    spawnParticles(e.x, e.y, '#5d4037', 4);
                }
            }
            // Roar stuns everything on screen
            for (const e of enemies) { if (!e.alive) continue;
                if (Math.hypot(e.x-p.x, e.y-p.y) < 200) e.stunned = Math.max(e.stunned, now + 2500);
            }
            damageNumbers.push({ x: p.x, y: p.y - 35, text: 'ROARRR!', color: '#4e342e', life: 50 });
            spawnParticles(p.x, p.y, '#5d4037', 20); spawnParticles(p.x, p.y, '#8d6e63', 10);
            triggerShake(14, 22); } break;
        case 'wendigo': // Devour — eat enemy, grow bigger and stronger
            { let target = null, closest = Infinity;
            for (const e of enemies) { if (!e.alive || e.isBoss) continue;
                const d = Math.hypot(e.x-p.x, e.y-p.y);
                if (d < 50 && d < closest) { closest = d; target = e; } }
            if (target) {
                target.x = p.x; target.y = p.y;
                dealDamageToEnemy(target, 9999, p);
                // Grow bigger and stronger
                if (!p._wendigoSize) p._wendigoSize = 1;
                p._wendigoSize = Math.min(p._wendigoSize + 0.12, 2.5);
                p.damage += 1;
                p.maxHp += 5; p.hp = Math.min(p.hp + 15, p.maxHp);
                damageNumbers.push({ x: p.x, y: p.y - 25, text: `*CRUNCH* Size:${p._wendigoSize.toFixed(1)}x`, color: '#b0bec5', life: 50 });
                spawnParticles(p.x, p.y, '#b71c1c', 10); spawnParticles(p.x, p.y, '#b0bec5', 6);
                triggerShake(5, 10);
            } } break;
        case 'alienqueen': // Lay Eggs — spawn face-huggers
            { const eggCount = 12;
            for (let i = 0; i < eggCount; i++) {
                const angle = p.facingAngle + (i - eggCount/2 + 0.5) * 0.5;
                const ex = p.x + Math.cos(angle) * 30, ey = p.y + Math.sin(angle) * 30;
                summonedMinions.push({ x: ex, y: ey, owner: p,
                    hp: 12, maxHp: 12, damage: 5, speed: 4.0,
                    radius: 4, attackRange: 18, lastAttack: now + i * 300, attackSpeed: 500,
                    life: now + 8000, color: '#1b5e20', type: 'facehugger' });
                spawnParticles(ex, ey, '#76ff03', 3);
            }
            damageNumbers.push({ x: p.x, y: p.y - 25, text: 'EGGS LAID!', color: '#76ff03', life: 40 });
            spawnParticles(p.x, p.y, '#1b5e20', 10);
            triggerShake(3, 5); } break;
        case 'comet': // Comet Dash — blazing fire trail
            { p.dodging = true; p.dodgeDir = { x: Math.cos(p.facingAngle), y: Math.sin(p.facingAngle) };
            p.dodgeTimer = 16; p.invincible = now + 600;
            // Fire trail zones
            for (let f = 0; f < 6; f++) {
                const fx = p.x + Math.cos(p.facingAngle) * f * 15, fy = p.y + Math.sin(p.facingAngle) * f * 15;
                lightningNets.push({ x: fx, y: fy, owner: p, radius: 18, life: now + 2000, damage: 3, damageRate: 300, lastDamage: 0, color: '#ff6f00' });
            }
            // Hit everything in path
            const snap = enemies.slice();
            for (const e of snap) { if (!e.alive) continue;
                const dx = e.x-p.x, dy = e.y-p.y;
                const along = dx*Math.cos(p.facingAngle)+dy*Math.sin(p.facingAngle);
                const perp = Math.abs(-dx*Math.sin(p.facingAngle)+dy*Math.cos(p.facingAngle));
                if (along > 0 && along < 100 && perp < 20) dealDamageToEnemy(e, Math.round(p.damage * 2.5), p);
            }
            spawnParticles(p.x, p.y, '#ff6f00', 14); spawnParticles(p.x, p.y, '#ffeb3b', 8);
            triggerShake(6, 10); } break;
        case 'telekinesis': // TK Throw — grab nearest enemy, hurl at others
            { let target = null, closest = Infinity;
            for (const e of enemies) { if (!e.alive) continue;
                const d = Math.hypot(e.x-p.x, e.y-p.y); if (d < 130 && d < closest) { closest = d; target = e; } }
            if (target) {
                spawnParticles(target.x, target.y, '#7c4dff', 6);
                // Hurl toward facing direction
                const hx = target.x + Math.cos(p.facingAngle) * 120, hy = target.y + Math.sin(p.facingAngle) * 120;
                target.x = hx; target.y = hy;
                dealDamageToEnemy(target, Math.round(p.damage * 1.5), p);
                // Damage anything at landing zone
                for (const e2 of enemies) { if (!e2.alive || e2 === target) continue;
                    if (Math.hypot(e2.x-hx, e2.y-hy) < 35) dealDamageToEnemy(e2, Math.round(p.damage * 2), p);
                }
                spawnParticles(hx, hy, '#b388ff', 10);
                damageNumbers.push({ x: hx, y: hy - 15, text: 'CRASH!', color: '#7c4dff', life: 40 });
                triggerShake(6, 10);
            } } break;
        case 'mindcontrol': // Possess — take over an enemy
            { let target = null, closest = Infinity;
            for (const e of enemies) { if (!e.alive || e.isBoss) continue;
                const d = Math.hypot(e.x-p.x, e.y-p.y); if (d < 120 && d < closest) { closest = d; target = e; } }
            if (target) {
                // Turn enemy into an ally minion
                target.alive = false;
                summonedMinions.push({ x: target.x, y: target.y, owner: p,
                    hp: target.maxHp, maxHp: target.maxHp, damage: target.damage, speed: target.speed || 2,
                    radius: target.radius || 10, attackRange: 30, lastAttack: now, attackSpeed: 500,
                    life: now + 6000, color: '#e040fb', type: 'possessed',
                    _guardIndex: 0, _guardTotal: 1, _orbit: true });
                spawnParticles(target.x, target.y, '#e040fb', 14);
                damageNumbers.push({ x: target.x, y: target.y - 20, text: 'POSSESSED!', color: '#e040fb', life: 50 });
                triggerShake(4, 8);
            } } break;
        case 'chimera': // Switch Head — cycle between fire/lightning/poison
            { if (!p._chimeraHead) p._chimeraHead = 0;
            p._chimeraHead = (p._chimeraHead + 1) % 3;
            const heads = ['lion', 'goat', 'snake'];
            const head = heads[p._chimeraHead];
            const range = 60;
            const snap2 = enemies.slice();
            if (head === 'lion') { // Fire — AoE burn
                for (const e of snap2) { if (!e.alive) continue;
                    if (Math.hypot(e.x-p.x, e.y-p.y) < range) { dealDamageToEnemy(e, Math.round(p.damage * 1.5), p); spawnParticles(e.x, e.y, '#ff6f00', 4); } }
                spawnParticles(p.x, p.y, '#ff6f00', 14);
            } else if (head === 'goat') { // Lightning — stun chain
                for (const e of snap2) { if (!e.alive) continue;
                    if (Math.hypot(e.x-p.x, e.y-p.y) < range) { e.stunned = Math.max(e.stunned, now + 2000); dealDamageToEnemy(e, Math.round(p.damage * 1.2), p); spawnParticles(e.x, e.y, '#ffeb3b', 4); } }
                spawnParticles(p.x, p.y, '#ffeb3b', 14);
            } else { // Snake — poison DoT
                for (const e of snap2) { if (!e.alive) continue;
                    if (Math.hypot(e.x-p.x, e.y-p.y) < range) { dealDamageToEnemy(e, Math.round(p.damage * 0.8), p); dealDamageToEnemy(e, Math.round(p.damage * 0.8), p); spawnParticles(e.x, e.y, '#76ff03', 4); } }
                spawnParticles(p.x, p.y, '#76ff03', 14);
            }
            damageNumbers.push({ x: p.x, y: p.y - 25, text: head.toUpperCase() + '!', color: head==='lion'?'#ff6f00':head==='goat'?'#ffeb3b':'#76ff03', life: 40 });
            triggerShake(5, 8); } break;
        case 'mimic': // Copy — transform into last killed enemy type
            { let target = null, closest = Infinity;
            for (const e of enemies) { if (!e.alive || e.isBoss) continue;
                const d = Math.hypot(e.x-p.x, e.y-p.y); if (d < 60 && d < closest) { closest = d; target = e; } }
            if (target) {
                dealDamageToEnemy(target, 9999, p); // kill and copy
                p._mimicForm = target.enemyType || 'skeleton';
                p.activeEffects.push({ effect: 'damage', value: 1.5, endTime: now + 6000 });
                p.activeEffects.push({ effect: 'speed', value: 1.3, endTime: now + 6000 });
                p.activeEffects.push({ effect: 'mimic', value: 1, endTime: now + 6000 });
                damageNumbers.push({ x: p.x, y: p.y - 25, text: `Copied: ${target.name || target.enemyType}!`, color: '#8d6e63', life: 50 });
                spawnParticles(p.x, p.y, '#8d6e63', 14);
                triggerShake(4, 6);
            } } break;
        case 'supernova': // Charge & Release — bigger explosion the longer since last use
            { if (!p._novaCharge) p._novaCharge = now;
            const chargeTime = Math.min(now - p._novaCharge, 10000); // max 10s charge
            const chargePct = chargeTime / 10000;
            const range = 50 + chargePct * 150; // 50-200 range
            const dmg = Math.round(p.damage * (1 + chargePct * 4)); // 1x-5x damage
            const snap3 = enemies.slice();
            for (const e of snap3) { if (!e.alive) continue;
                if (Math.hypot(e.x-p.x, e.y-p.y) < range) dealDamageToEnemy(e, dmg, p); }
            spawnParticles(p.x, p.y, '#fff176', Math.round(10 + chargePct * 20));
            spawnParticles(p.x, p.y, '#fff', Math.round(5 + chargePct * 10));
            damageNumbers.push({ x: p.x, y: p.y - 30, text: `NOVA ${Math.round(chargePct*100)}%!`, color: '#fff176', life: 50 });
            triggerShake(Math.round(4 + chargePct * 12), Math.round(8 + chargePct * 16));
            p._novaCharge = now; // reset charge
            } break;
        case 'puppet': // Strings — grab enemies and slam them together
            { const range = 120;
            const caught = [];
            for (const e of enemies) { if (!e.alive || caught.length >= 4) continue;
                if (Math.hypot(e.x-p.x, e.y-p.y) < range) { caught.push(e); e.stunned = Math.max(e.stunned, now + 1500); } }
            if (caught.length >= 2) {
                // Slam them into each other at center point
                const cx = caught.reduce((s,e) => s+e.x, 0) / caught.length;
                const cy = caught.reduce((s,e) => s+e.y, 0) / caught.length;
                for (const e of caught) {
                    e.x = cx + (Math.random()-0.5)*15; e.y = cy + (Math.random()-0.5)*15;
                    dealDamageToEnemy(e, Math.round(p.damage * 2), p);
                    spawnParticles(e.x, e.y, '#9c27b0', 4);
                }
                damageNumbers.push({ x: cx, y: cy - 20, text: 'SLAM!', color: '#9c27b0', life: 40 });
            } else if (caught.length === 1) {
                dealDamageToEnemy(caught[0], Math.round(p.damage * 1.5), p);
            }
            // String visuals
            for (const e of caught) {
                activeBeams.push({ x: p.x, y: p.y, angle: Math.atan2(e.y-p.y, e.x-p.x),
                    length: Math.hypot(e.x-p.x, e.y-p.y), width: 1, life: 10, maxLife: 10, color: '#9c27b0' });
            }
            spawnParticles(p.x, p.y, '#ce93d8', 10);
            triggerShake(5, 8); } break;
        case 'medusa': // Stone Gaze — petrify in cone, stoned enemies take 3x
            { const snap=enemies.slice(); for(const e of snap){if(!e.alive)continue;const dx=e.x-p.x,dy=e.y-p.y,dist=Math.hypot(dx,dy);
                if(dist<120){const a=Math.atan2(dy,dx);let d=a-p.facingAngle;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;
                if(Math.abs(d)<0.7){e.stunned=Math.max(e.stunned,now+3000);e.frozen=Math.max(e.frozen,now+3000);
                dealDamageToEnemy(e,Math.round(p.damage*3),p);spawnParticles(e.x,e.y,'#9e9e9e',5);}}}
            spawnParticles(p.x,p.y,'#4caf50',12);triggerShake(4,8);} break;
        case 'cerberus': // Triple Breath — 3 cones: fire/ice/poison
            { for(let h=0;h<3;h++){const a=p.facingAngle+(h-1)*0.6;const col=['#ff6f00','#4fc3f7','#76ff03'][h];
                for(const e of enemies){if(!e.alive)continue;const dx=e.x-p.x,dy=e.y-p.y;
                const along=dx*Math.cos(a)+dy*Math.sin(a);const perp=Math.abs(-dx*Math.sin(a)+dy*Math.cos(a));
                if(along>0&&along<70&&perp<20){dealDamageToEnemy(e,Math.round(p.damage*(h===0?1.3:h===1?1:0.8)),p);
                if(h===1)e.frozen=Math.max(e.frozen,now+1500);if(h===2)e.stunned=Math.max(e.stunned,now+1000);}}
                activeBeams.push({x:p.x,y:p.y,angle:a,length:70,width:10,life:10,maxLife:10,color:col});}
            spawnParticles(p.x,p.y,'#ff6f00',8);triggerShake(6,10);} break;
        case 'minotaur': // Bull Charge — dash that does more dmg the further you go
            { p.dodging=true;p.dodgeDir={x:Math.cos(p.facingAngle),y:Math.sin(p.facingAngle)};
            p.dodgeTimer=20;p.invincible=now+800;
            const snap=enemies.slice();for(const e of snap){if(!e.alive)continue;
                const dx=e.x-p.x,dy=e.y-p.y;const along=dx*Math.cos(p.facingAngle)+dy*Math.sin(p.facingAngle);
                const perp=Math.abs(-dx*Math.sin(p.facingAngle)+dy*Math.cos(p.facingAngle));
                if(along>0&&along<120&&perp<25){dealDamageToEnemy(e,Math.round(p.damage*2.5),p);
                const ka=Math.atan2(dy,dx);e.x+=Math.cos(ka)*40;e.y+=Math.sin(ka)*40;}}
            spawnParticles(p.x,p.y,'#5d4037',14);triggerShake(8,14);} break;
        case 'anubis': // Death Mark — mark enemies, they explode on death
            { for(const e of enemies){if(!e.alive)continue;const dist=Math.hypot(e.x-p.x,e.y-p.y);
                if(dist<130){e._deathMark=true;e._markOwner=p;spawnParticles(e.x,e.y,'#fdd835',3);
                damageNumbers.push({x:e.x,y:e.y-15,text:'MARKED',color:'#fdd835',life:30});
                dealDamageToEnemy(e,Math.round(p.damage*0.5),p);}}
            spawnParticles(p.x,p.y,'#fdd835',12);triggerShake(3,5);} break;
        case 'thor': // Mjolnir — throw hammer projectile that returns
            { const spd=7;for(let b=-1;b<=1;b++){
                projectiles.push({x:p.x,y:p.y,vx:Math.cos(p.facingAngle+b*0.15)*spd,vy:Math.sin(p.facingAngle+b*0.15)*spd,
                damage:Math.round(p.damage*1.8),owner:'player',ownerRef:p,range:200,traveled:0,color:'#42a5f5',radius:6,piercing:true});}
            spawnParticles(p.x,p.y,'#42a5f5',10);spawnParticles(p.x,p.y,'#ffeb3b',6);triggerShake(5,8);} break;
        case 'venom': // Tentacle Burst — 8 directional tentacle beams
            { for(let t=0;t<8;t++){const a=(t/8)*Math.PI*2;
                activeBeams.push({x:p.x,y:p.y,angle:a,length:50,width:5,life:8,maxLife:8,color:'#111'});
                for(const e of enemies){if(!e.alive)continue;const dx=e.x-p.x,dy=e.y-p.y;
                const along=dx*Math.cos(a)+dy*Math.sin(a);const perp=Math.abs(-dx*Math.sin(a)+dy*Math.cos(a));
                if(along>0&&along<50&&perp<10)dealDamageToEnemy(e,Math.round(p.damage*1.3),p);}}
            spawnParticles(p.x,p.y,'#222',16);triggerShake(6,10);} break;
        case 'cordyceps': // Infect — spore cloud, dead enemies become zombies
            { for(const e of enemies){if(!e.alive)continue;const dist=Math.hypot(e.x-p.x,e.y-p.y);
                if(dist<90){e._infected=true;e._infectOwner=p;dealDamageToEnemy(e,Math.round(p.damage*1.5),p);
                spawnParticles(e.x,e.y,'#ff8f00',4);}}
            spawnParticles(p.x,p.y,'#ff8f00',14);triggerShake(4,6);} break;
        case 'leech': // Latch On — attach and drain continuously
            { let target=null,closest=Infinity;for(const e of enemies){if(!e.alive)continue;
                const d=Math.hypot(e.x-p.x,e.y-p.y);if(d<60&&d<closest){closest=d;target=e;}}
            if(target){p._leechTarget=target;p._leechEnd=now+4000;
                target.stunned=Math.max(target.stunned,now+4000);
                spawnParticles(target.x,target.y,'#880e4f',8);
                damageNumbers.push({x:target.x,y:target.y-15,text:'LATCHED!',color:'#880e4f',life:40});}
            triggerShake(3,5);} break;
        case 'chrono': // Rewind — undo last 3s of damage
            { if(!p._hpHistory)p._hpHistory=[];
            const oldHp=p._hpHistory.length>0?Math.max(...p._hpHistory):p.hp;
            const healed=Math.min(oldHp,p.maxHp)-p.hp;
            if(healed>0){p.hp=Math.min(oldHp,p.maxHp);
                damageNumbers.push({x:p.x,y:p.y-25,text:`REWIND +${healed}hp`,color:'#00bcd4',life:50});}
            p._hpHistory=[];spawnParticles(p.x,p.y,'#00bcd4',16);triggerShake(4,8);} break;
        case 'dimcutter': // Portal Slash — teleport enemies to random spots
            { const snap=enemies.slice();for(const e of snap){if(!e.alive)continue;const dist=Math.hypot(e.x-p.x,e.y-p.y);
                if(dist<80){spawnParticles(e.x,e.y,'#00e5ff',4);
                const room=dungeon.rooms[Math.floor(Math.random()*dungeon.rooms.length)];
                e.x=room.cx*TILE+TILE/2+(Math.random()-0.5)*40;e.y=room.cy*TILE+TILE/2+(Math.random()-0.5)*40;
                dealDamageToEnemy(e,Math.round(p.damage*1.5),p);spawnParticles(e.x,e.y,'#00e5ff',4);}}
            spawnParticles(p.x,p.y,'#00e5ff',12);triggerShake(5,8);} break;
        case 'paradox': // Time Echo — summon clone that fights
            { summonedMinions.push({x:p.x,y:p.y,owner:p,hp:40,maxHp:40,damage:Math.round(p.damage*0.8),speed:p.speed,
                radius:8,attackRange:28,lastAttack:now,attackSpeed:400,life:now+8000,color:'#ff80ab',type:'clone',_orbit:true,_guardIndex:0,_guardTotal:1});
            spawnParticles(p.x,p.y,'#ff80ab',12);damageNumbers.push({x:p.x,y:p.y-25,text:'TIME ECHO!',color:'#ff80ab',life:40});
            triggerShake(3,5);} break;
        case 'drummer': // Beat Drop — combo counter: 3=wave, 5=quake, 7=mega
            { if(!p._drumCombo)p._drumCombo=0;p._drumCombo++;
            const c=p._drumCombo;const range=30+c*8;
            const snap=enemies.slice();for(const e of snap){if(!e.alive)continue;
                if(Math.hypot(e.x-p.x,e.y-p.y)<range)dealDamageToEnemy(e,Math.round(p.damage*(0.5+c*0.3)),p);}
            if(c>=7){spawnParticles(p.x,p.y,'#ff5722',20);triggerShake(12,18);p._drumCombo=0;
                damageNumbers.push({x:p.x,y:p.y-30,text:'MEGA DROP!',color:'#ff5722',life:50});}
            else if(c>=5){spawnParticles(p.x,p.y,'#ff5722',14);triggerShake(8,12);
                damageNumbers.push({x:p.x,y:p.y-25,text:`QUAKE x${c}`,color:'#ff5722',life:40});}
            else if(c>=3){spawnParticles(p.x,p.y,'#ff5722',8);triggerShake(5,8);
                damageNumbers.push({x:p.x,y:p.y-25,text:`WAVE x${c}`,color:'#ff8a65',life:35});}
            else{spawnParticles(p.x,p.y,'#ff5722',4);
                damageNumbers.push({x:p.x,y:p.y-20,text:`beat ${c}`,color:'#ffab91',life:25});}
            } break;
        case 'siren': // Lure Song — enemies walk to you then take shatter damage
            { for(const e of enemies){if(!e.alive)continue;const dist=Math.hypot(e.x-p.x,e.y-p.y);
                if(dist<140){const a=Math.atan2(p.y-e.y,p.x-e.x);e.x+=Math.cos(a)*30;e.y+=Math.sin(a)*30;
                e.stunned=Math.max(e.stunned,now+2000);
                if(Math.hypot(e.x-p.x,e.y-p.y)<30)dealDamageToEnemy(e,Math.round(p.damage*2.5),p);
                spawnParticles(e.x,e.y,'#80deea',3);}}
            spawnParticles(p.x,p.y,'#80deea',14);triggerShake(4,8);} break;
        case 'mercury': // Reshape — liquid blade wave through enemies
            { p.dodging=true;p.dodgeDir={x:Math.cos(p.facingAngle),y:Math.sin(p.facingAngle)};
            p.dodgeTimer=12;p.invincible=now+500;
            const snap=enemies.slice();for(const e of snap){if(!e.alive)continue;const dx=e.x-p.x,dy=e.y-p.y;
                const along=dx*Math.cos(p.facingAngle)+dy*Math.sin(p.facingAngle);
                const perp=Math.abs(-dx*Math.sin(p.facingAngle)+dy*Math.cos(p.facingAngle));
                if(along>0&&along<90&&perp<18)dealDamageToEnemy(e,Math.round(p.damage*2),p);}
            activeBeams.push({x:p.x,y:p.y,angle:p.facingAngle,length:90,width:18,life:10,maxLife:10,color:'#b0bec5'});
            spawnParticles(p.x,p.y,'#b0bec5',12);triggerShake(5,8);} break;
        case 'acid': // Dissolve — acid pools that strip defense
            { for(let a=0;a<5;a++){const ax=p.x+Math.cos(p.facingAngle)*a*15+(Math.random()-0.5)*20;
                const ay=p.y+Math.sin(p.facingAngle)*a*15+(Math.random()-0.5)*20;
                lightningNets.push({x:ax,y:ay,owner:p,radius:20,life:now+3000,damage:2,damageRate:400,lastDamage:0,color:'#76ff03'});}
            for(const e of enemies){if(!e.alive)continue;const dist=Math.hypot(e.x-p.x,e.y-p.y);
                if(dist<60){e._noDefense=now+4000;spawnParticles(e.x,e.y,'#76ff03',4);}}
            spawnParticles(p.x,p.y,'#76ff03',10);triggerShake(3,5);} break;
        case 'smoke': // Smoke Bomb — vanish + poison cloud zone
            { p.invincible=now+2500;p.activeEffects.push({effect:'stealth',value:1,endTime:now+2500});
            lightningNets.push({x:p.x,y:p.y,owner:p,radius:50,life:now+3000,damage:3,damageRate:300,lastDamage:0,color:'#546e7a'});
            spawnParticles(p.x,p.y,'#78909c',16);triggerShake(3,5);} break;
        case 'antcolony': // Swarm Rush — wave of ants across floor
            { for(let a=0;a<8;a++){const angle=p.facingAngle+(a-3.5)*0.12;
                projectiles.push({x:p.x,y:p.y,vx:Math.cos(angle)*4,vy:Math.sin(angle)*4,
                damage:Math.round(p.damage*0.8),owner:'player',ownerRef:p,range:180,traveled:0,color:'#5d4037',radius:2});}
            spawnParticles(p.x,p.y,'#795548',12);triggerShake(4,6);} break;
        case 'ratking': // Rat Horde — summon rats, sacrifice to heal
            { const existing=summonedMinions.filter(m=>m.type==='rat'&&m.owner===p).length;
            if(existing>=6){// sacrifice all rats to heal
                let healed=0;for(let i=summonedMinions.length-1;i>=0;i--){const m=summonedMinions[i];
                if(m.type==='rat'&&m.owner===p){healed+=5;summonedMinions.splice(i,1);}}
                p.hp=Math.min(p.hp+healed,p.maxHp);
                damageNumbers.push({x:p.x,y:p.y-25,text:`SACRIFICE +${healed}hp`,color:'#f44336',life:40});
            }else{for(let r=0;r<3;r++){const a=Math.random()*Math.PI*2;
                summonedMinions.push({x:p.x+Math.cos(a)*20,y:p.y+Math.sin(a)*20,owner:p,
                hp:8,maxHp:8,damage:4,speed:3.5,radius:3,attackRange:18,lastAttack:now+r*200,attackSpeed:400,
                life:now+12000,color:'#757575',type:'rat',_orbit:true,_guardIndex:existing+r,_guardTotal:6});}
                damageNumbers.push({x:p.x,y:p.y-20,text:`Rats: ${existing+3}`,color:'#9e9e9e',life:30});}
            spawnParticles(p.x,p.y,'#616161',8);triggerShake(3,5);} break;
        case 'locust': // Plague Cloud — expanding damage aura
            { if(!p._locustSize)p._locustSize=30;p._locustSize=Math.min(p._locustSize+15,120);
            const snap=enemies.slice();for(const e of snap){if(!e.alive)continue;
                if(Math.hypot(e.x-p.x,e.y-p.y)<p._locustSize)dealDamageToEnemy(e,Math.round(p.damage*0.6),p);}
            spawnParticles(p.x,p.y,'#827717',10);
            damageNumbers.push({x:p.x,y:p.y-25,text:`Swarm: ${p._locustSize}px`,color:'#827717',life:30});
            triggerShake(3,5);} break;
        case 'mechashark': // Torpedo — homing piercing projectile + sonar
            { projectiles.push({x:p.x,y:p.y,vx:Math.cos(p.facingAngle)*5,vy:Math.sin(p.facingAngle)*5,
                damage:Math.round(p.damage*2.5),owner:'player',ownerRef:p,range:300,traveled:0,color:'#37474f',radius:6,piercing:true});
            // Sonar — reveal all rooms
            for(const rm of dungeon.rooms)rm.explored=true;
            spawnParticles(p.x,p.y,'#4fc3f7',12);damageNumbers.push({x:p.x,y:p.y-25,text:'SONAR PING',color:'#4fc3f7',life:40});
            triggerShake(4,6);} break;
        case 'ghostrider': // Hellfire Chain — spinning whip + fire trail
            { for(let c=0;c<6;c++){const a=p.facingAngle+c*Math.PI/3;
                activeBeams.push({x:p.x,y:p.y,angle:a,length:60,width:3,life:10,maxLife:10,color:'#ff6f00'});
                lightningNets.push({x:p.x+Math.cos(a)*40,y:p.y+Math.sin(a)*40,owner:p,radius:15,life:now+2000,damage:3,damageRate:300,lastDamage:0,color:'#ff6f00'});}
            const snap=enemies.slice();for(const e of snap){if(!e.alive)continue;
                if(Math.hypot(e.x-p.x,e.y-p.y)<65)dealDamageToEnemy(e,Math.round(p.damage*1.8),p);}
            spawnParticles(p.x,p.y,'#ff6f00',16);triggerShake(6,10);} break;
        case 'icephoenix': // Frost Dive — freeze all, shatter for 3x
            { p.dodging=true;p.dodgeDir={x:Math.cos(p.facingAngle),y:Math.sin(p.facingAngle)};
            p.dodgeTimer=10;p.invincible=now+400;
            const snap=enemies.slice();for(const e of snap){if(!e.alive)continue;const dist=Math.hypot(e.x-p.x,e.y-p.y);
                if(dist<90){if(e.frozen>now){dealDamageToEnemy(e,Math.round(p.damage*3),p);spawnParticles(e.x,e.y,'#fff',6);
                    damageNumbers.push({x:e.x,y:e.y-15,text:'SHATTER!',color:'#e1f5fe',life:35});}
                else{e.frozen=Math.max(e.frozen,now+3000);spawnParticles(e.x,e.y,'#4fc3f7',4);}}}
            spawnParticles(p.x,p.y,'#e1f5fe',14);triggerShake(5,8);} break;
        case 'plaguerat': // Sneeze — poison cone, stacks power
            { if(!p._poisonCount)p._poisonCount=0;
            const snap=enemies.slice();for(const e of snap){if(!e.alive)continue;const dx=e.x-p.x,dy=e.y-p.y;
                const along=dx*Math.cos(p.facingAngle)+dy*Math.sin(p.facingAngle);
                const perp=Math.abs(-dx*Math.sin(p.facingAngle)+dy*Math.cos(p.facingAngle));
                if(along>0&&along<80&&perp<30){dealDamageToEnemy(e,Math.round(p.damage*(1+p._poisonCount*0.2)),p);
                p._poisonCount++;spawnParticles(e.x,e.y,'#76ff03',3);}}
            spawnParticles(p.x,p.y,'#33691e',10);
            damageNumbers.push({x:p.x,y:p.y-25,text:`Plague x${p._poisonCount}`,color:'#76ff03',life:30});
            triggerShake(3,5);} break;
        case 'carddealer': // Draw Card — random effect
            { const card=Math.floor(Math.random()*4);const cardNames=['HEAL','DAMAGE','BUFF','WILD'];
            if(card===0){p.hp=Math.min(p.hp+30,p.maxHp);spawnParticles(p.x,p.y,'#4caf50',12);}
            else if(card===1){const snap=enemies.slice();for(const e of snap){if(!e.alive)continue;
                if(Math.hypot(e.x-p.x,e.y-p.y)<100)dealDamageToEnemy(e,Math.round(p.damage*2),p);}spawnParticles(p.x,p.y,'#f44336',12);}
            else if(card===2){p.activeEffects.push({effect:'speed',value:1.5,endTime:now+5000});
                p.activeEffects.push({effect:'damage',value:1.5,endTime:now+5000});spawnParticles(p.x,p.y,'#fdd835',12);}
            else{const snap=enemies.slice();for(const e of snap){if(!e.alive)continue;dealDamageToEnemy(e,Math.round(p.damage*3),p);}
                spawnParticles(p.x,p.y,'#ff00ff',20);triggerShake(10,16);}
            damageNumbers.push({x:p.x,y:p.y-25,text:`CARD: ${cardNames[card]}!`,color:'#d32f2f',life:50});
            triggerShake(4,6);} break;
        case 'diceroller': // Roll Dice — random multiplier
            { const roll=1+Math.floor(Math.random()*6);
            if(roll===6){// Critical explosion
                const snap=enemies.slice();for(const e of snap){if(!e.alive)continue;
                if(Math.hypot(e.x-p.x,e.y-p.y)<80)dealDamageToEnemy(e,Math.round(p.damage*5),p);}
                spawnParticles(p.x,p.y,'#fdd835',20);triggerShake(10,16);
                damageNumbers.push({x:p.x,y:p.y-30,text:`ROLLED 6! CRIT!`,color:'#fdd835',life:60});}
            else{p.activeEffects.push({effect:'damage',value:1+roll*0.3,endTime:now+3000});
                spawnParticles(p.x,p.y,'#fff',8);
                damageNumbers.push({x:p.x,y:p.y-25,text:`Rolled ${roll} (${roll*30}% dmg)`,color:'#fff',life:40});}
            triggerShake(3,5);} break;
        case 'chessking': // Summon Pawns — 4 pawns + swap ability
            { const existing=summonedMinions.filter(m=>m.type==='pawn'&&m.owner===p).length;
            if(existing>0){// Castle swap with furthest pawn
                let furthest=null,maxDist=0;for(const m of summonedMinions){if(m.type!=='pawn'||m.owner!==p)continue;
                const d=Math.hypot(m.x-p.x,m.y-p.y);if(d>maxDist){maxDist=d;furthest=m;}}
                if(furthest){spawnParticles(p.x,p.y,'#fdd835',6);const tx=furthest.x,ty=furthest.y;
                furthest.x=p.x;furthest.y=p.y;p.x=tx;p.y=ty;spawnParticles(p.x,p.y,'#fdd835',6);
                damageNumbers.push({x:p.x,y:p.y-20,text:'CASTLE!',color:'#fdd835',life:35});}
            }else{for(let i=0;i<4;i++){const a=(i/4)*Math.PI*2;
                summonedMinions.push({x:p.x+Math.cos(a)*35,y:p.y+Math.sin(a)*35,owner:p,
                hp:15,maxHp:15,damage:5,speed:2.5,radius:5,attackRange:20,lastAttack:now+i*200,attackSpeed:600,
                life:now+15000,color:'#fdd835',type:'pawn'});}
                damageNumbers.push({x:p.x,y:p.y-25,text:'PAWNS PLACED',color:'#fdd835',life:40});}
            spawnParticles(p.x,p.y,'#fdd835',8);triggerShake(3,5);} break;
        case 'rage': // Unleash — spend rage meter for 2x buff
            { if(!p._rageMeter)p._rageMeter=0;
            if(p._rageMeter>=50){p._rageMeter=0;
                p.activeEffects.push({effect:'speed',value:2,endTime:now+5000});
                p.activeEffects.push({effect:'damage',value:2,endTime:now+5000});
                p.invincible=now+1000;
                spawnParticles(p.x,p.y,'#d50000',20);damageNumbers.push({x:p.x,y:p.y-30,text:'UNLEASHED!',color:'#d50000',life:50});
                triggerShake(10,16);}
            else{damageNumbers.push({x:p.x,y:p.y-20,text:`Rage: ${p._rageMeter}/50`,color:'#ff5252',life:30});}
            } break;
        case 'fear': // Nightmare — terror zone, enemies flee + 2x damage
            { for(const e of enemies){if(!e.alive)continue;const dist=Math.hypot(e.x-p.x,e.y-p.y);
                if(dist<110){const a=Math.atan2(e.y-p.y,e.x-p.x);e.x+=Math.cos(a)*35;e.y+=Math.sin(a)*35;
                e.stunned=Math.max(e.stunned,now+500);dealDamageToEnemy(e,Math.round(p.damage*2),p);
                spawnParticles(e.x,e.y,'#4a148c',4);}}
            spawnParticles(p.x,p.y,'#6a1b9a',16);triggerShake(5,10);} break;
        case 'love': // Charm — permanently convert enemy to ally (max 3)
            { const charmed=summonedMinions.filter(m=>m.type==='charmed'&&m.owner===p).length;
            if(charmed>=3)break;
            let target=null,closest=Infinity;for(const e of enemies){if(!e.alive||e.isBoss)continue;
                const d=Math.hypot(e.x-p.x,e.y-p.y);if(d<100&&d<closest){closest=d;target=e;}}
            if(target){target.alive=false;
                summonedMinions.push({x:target.x,y:target.y,owner:p,hp:target.maxHp,maxHp:target.maxHp,
                damage:target.damage,speed:target.speed||2,radius:target.radius||8,attackRange:25,
                lastAttack:now,attackSpeed:500,life:Infinity,color:'#e91e63',type:'charmed',_orbit:true,_guardIndex:charmed,_guardTotal:3});
                spawnParticles(target.x,target.y,'#f48fb1',12);
                damageNumbers.push({x:target.x,y:target.y-20,text:'CHARMED!',color:'#e91e63',life:50});}
            triggerShake(3,5);} break;
        case 'chaos': // Random ability from any other class
            { const allClasses=Object.keys(CLASSES).filter(c=>c!=='chaos');
            const randomClass=allClasses[Math.floor(Math.random()*allClasses.length)];
            const oldClass=p.classId;p.classId=randomClass;
            playerSpecial(p,now);p.classId=oldClass;
            damageNumbers.push({x:p.x,y:p.y-30,text:`CHAOS: ${CLASSES[randomClass].name}!`,color:'#ff00ff',life:50});
            } break;
    }
}

function frogInsects(p, now) {
    if (p.classId !== 'frog') return;
    if (p._insectsSpawned) return; // only summon once
    p._insectsSpawned = true;
    // Spawn 10 insects in a ring
    for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        summonedMinions.push({
            x: p.x + Math.cos(angle) * 30, y: p.y + Math.sin(angle) * 30, owner: p,
            hp: 999, maxHp: 999, damage: 1, speed: 3.5,
            radius: 3, attackRange: 30, lastAttack: now + i * 200, attackSpeed: 2000,
            life: Infinity, color: '#222', type: 'insect',
            _guardIndex: i, _guardTotal: 10, _orbit: true
        });
    }
    damageNumbers.push({ x: p.x, y: p.y - 25, text: 'BZZZZ!', color: '#8d6e63', life: 40 });
    spawnParticles(p.x, p.y, '#5d4037', 12);
    triggerShake(3, 5);
}

function jinwooAriseBoss(p, now) {
    if (p.classId !== 'jinwoo') return;
    if (!p._bossBank || p._bossBank.length === 0) return;
    if (!p._ariseBossCd) p._ariseBossCd = 0;
    if (now - p._ariseBossCd < 2000) return;
    p._ariseBossCd = now;
    // Max 3 shadow boss generals
    const existingBosses = summonedMinions.filter(m => m.type === 'shadowBoss' && m.owner === p).length;
    if (existingBosses >= 3) return;
    const b = p._bossBank.shift(); // take first boss from bank
    const angle = p.facingAngle;
    summonedMinions.push({
        x: p.x + Math.cos(angle) * 35, y: p.y + Math.sin(angle) * 35, owner: p,
        hp: Math.round(b.hp * 0.4), maxHp: Math.round(b.hp * 0.4),
        damage: Math.round(b.damage * 0.7), speed: 2.5,
        radius: 18, attackRange: 150, lastAttack: now, attackSpeed: 700,
        life: Infinity, color: '#6a0dad', type: 'shadowBoss',
        bossName: b.name, _guardIndex: 0, _guardTotal: 1
    });
    damageNumbers.push({ x: p.x, y: p.y - 35, text: `ARISE: ${b.name}!`, color: '#aa00ff', life: 60 });
    spawnParticles(p.x + Math.cos(angle) * 35, p.y + Math.sin(angle) * 35, '#aa00ff', 16);
    spawnParticles(p.x, p.y, '#7c4dff', 10);
    triggerShake(8, 14);
}

function katakuriHaki(p, now) {
    if (p.classId !== 'katakuri') return;
    if (!p._hakiCd) p._hakiCd = 0;
    if (now - p._hakiCd < 500) return; // prevent spam toggle
    p._hakiCd = now;
    p._haki = !p._haki;
    if (p._haki) {
        // Haki ON — damage boost
        p.activeEffects.push({ effect: 'damage', value: 1.4, endTime: now + 10000, _hakiBuff: true });
        damageNumbers.push({ x: p.x, y: p.y - 30, text: 'HAKI!', color: '#b71c1c', life: 40 });
        spawnParticles(p.x, p.y, '#b71c1c', 16);
        spawnParticles(p.x, p.y, '#111', 8);
        triggerShake(4, 6);
        // Auto-expire after 10s
        setTimeout(() => { if (p._haki) { p._haki = false; } }, 10000);
    } else {
        // Haki OFF — remove buff
        p.activeEffects = p.activeEffects.filter(e => !e._hakiBuff);
        damageNumbers.push({ x: p.x, y: p.y - 30, text: 'HAKI OFF', color: '#888', life: 30 });
    }
}

function jinwooRecall(p, now) {
    if (p.classId !== 'jinwoo') return;
    // Teleport all shadows + shadow boss back to Jin-Woo
    let count = 0;
    for (const m of summonedMinions) {
        if ((m.type === 'shadow' || m.type === 'shadowBoss') && m.owner === p) {
            spawnParticles(m.x, m.y, '#7c4dff', 3);
            const angle = (count / 8) * Math.PI * 2;
            m.x = p.x + Math.cos(angle) * 30;
            m.y = p.y + Math.sin(angle) * 30;
            m._stuckSince = 0;
            spawnParticles(m.x, m.y, '#6a3aaa', 3);
            count++;
        }
    }
    if (count > 0) spawnParticles(p.x, p.y, '#7c4dff', 8);
}

// ─── R-KEY SECONDARY ABILITIES ──────────────────────────────
function animeSecondary(p, now) {
    if (!p._secondaryCd) p._secondaryCd = 0;
    switch (p.classId) {
        case 'katakuri': // Restless Dough Fists — directional rapid punch burst
            if (now - p._secondaryCd < 4000) return; p._secondaryCd = now;
            { const fanSpread = 0.5;
            const hk = !!p._haki;
            const beamCol = hk ? '#b71c1c' : '#e8b0a0';
            const sparkCol = hk ? '#7f0000' : '#e8b0a0';
            const dmgMult = hk ? 1.2 : 0.8;
            for (let i = 0; i < 6; i++) {
                const a = p.facingAngle + (i - 2.5) * (fanSpread / 5);
                const range = 60;
                for (const e of enemies) { if (!e.alive) continue;
                    const dx = e.x - p.x, dy = e.y - p.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < range) {
                        const eAngle = Math.atan2(dy, dx);
                        let diff = Math.abs(eAngle - a);
                        if (diff > Math.PI) diff = Math.PI * 2 - diff;
                        if (diff < 0.3) {
                            dealDamageToEnemy(e, Math.round(p.damage * dmgMult), p);
                            spawnParticles(e.x, e.y, sparkCol, 3);
                        }
                    }
                }
                activeBeams.push({ x: p.x, y: p.y, angle: a, length: 55, width: 5, life: 6 + i * 2, maxLife: 18, color: beamCol });
            }
            damageNumbers.push({ x: p.x, y: p.y - 30, text: 'BARRAGE!', color: hk ? '#b71c1c' : '#c62828', life: 40 });
            spawnParticles(p.x, p.y, hk ? '#b71c1c' : '#c62828', 20);
            triggerShake(8, 14); } break;
        case 'naruto': // Rasengan
            if (now - p._secondaryCd < 3000) return; p._secondaryCd = now;
            { const range = 35, dmg = Math.round(p.damage * 2);
            for (const e of enemies) { if (!e.alive) continue;
                if (Math.hypot(e.x - p.x, e.y - p.y) < range) { dealDamageToEnemy(e, dmg, p); }
            }
            spawnParticles(p.x + Math.cos(p.facingAngle) * 15, p.y + Math.sin(p.facingAngle) * 15, '#42a5f5', 14);
            spawnParticles(p.x + Math.cos(p.facingAngle) * 15, p.y + Math.sin(p.facingAngle) * 15, '#fff', 6);
            triggerShake(5, 8); } break;
        default: return;
    }
}

function portalTeleportToAlly(p, now) {
    if (p.classId !== 'portal') return;
    if (!p._lastPortalTp) p._lastPortalTp = 0;
    if (now - p._lastPortalTp < 2000) return; // 2s cooldown
    // Find nearest other player
    let closest = null, closestDist = Infinity;
    for (const ally of players) {
        if (ally === p || !ally.alive) continue;
        const d = Math.hypot(ally.x - p.x, ally.y - p.y);
        if (d < closestDist) { closestDist = d; closest = ally; }
    }
    if (!closest) return;
    p._lastPortalTp = now;
    spawnParticles(p.x, p.y, '#00bcd4', 12);
    p.x = closest.x + (Math.random() - 0.5) * 30;
    p.y = closest.y + (Math.random() - 0.5) * 30;
    spawnParticles(p.x, p.y, '#80deea', 12);
    triggerShake(3, 6);
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
    if (damageNumbers.length < 100) { // Cap to prevent lag from mass kills
        damageNumbers.push({ x: e.x, y: e.y - 20, text: dmg >= 9999 ? 'K.O.' : dmg.toString(), color: dmg >= 9999 ? '#fdd835' : '#fff', life: 40 });
    }
    spawnParticles(e.x, e.y, PAL.blood, 4);
    triggerShake(2, 4);

    if (e.hp <= 0) {
        e.alive = false;
        runStats.enemiesKilled++;
        if (e.isBoss) runStats.bossesKilled++;
        // Jin-Woo: track boss kills for Arise: Boss
        if (p && p.classId === 'jinwoo' && e.isBoss) {
            if (!p._bossBank) p._bossBank = [];
            p._bossBank.push({ name: e.name, hp: e.maxHp, damage: e.damage, speed: e.speed, radius: e.radius, color: e.color });
            damageNumbers.push({ x: e.x, y: e.y - 40, text: `${e.name} captured!`, color: '#aa00ff', life: 60 });
        }
        // Jin-Woo: track killed enemy types for Shadow Army
        if (p && p.classId === 'jinwoo') {
            if (!p._shadowBank) p._shadowBank = [];
            p._shadowBank.push({ enemyType: e.enemyType || 'skeleton', hp: e.maxHp, damage: e.damage, speed: e.speed, radius: e.radius, color: e.color, name: e.name });
        }

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

        // Cordyceps — infected enemies rise as zombie allies
        if (e._infected && e._infectOwner) {
            summonedMinions.push({ x: e.x, y: e.y, owner: e._infectOwner,
                hp: Math.round(e.maxHp * 0.4), maxHp: Math.round(e.maxHp * 0.4),
                damage: Math.round(e.damage * 0.5), speed: 1.5, radius: e.radius || 8,
                attackRange: 22, lastAttack: gameTime, attackSpeed: 600,
                life: gameTime + 10000, color: '#ff8f00', type: 'zombie' });
            spawnParticles(e.x, e.y, '#ff8f00', 6);
            damageNumbers.push({ x: e.x, y: e.y - 15, text: 'RISEN!', color: '#ff8f00', life: 35 });
        }
        // Anubis — death marked enemies explode
        if (e._deathMark && e._markOwner) {
            const snap = enemies.slice();
            for (const e2 of snap) { if (!e2.alive || e2 === e) continue;
                if (Math.hypot(e2.x - e.x, e2.y - e.y) < 50) dealDamageToEnemy(e2, Math.round(e._markOwner.damage * 1.5), e._markOwner);
            }
            spawnParticles(e.x, e.y, '#fdd835', 12);
            triggerShake(4, 6);
        }

        // Slime split (cap at 50 total enemies to prevent lag)
        if (e.splits && !e.isBoss && enemies.length < 50) {
            for (let s = 0; s < 2; s++) {
                const se = createEnemy('bat', Math.floor(e.x / TILE), Math.floor(e.y / TILE), currentFloor);
                se.x = e.x + (Math.random() - 0.5) * 40; // spawn further away
                se.y = e.y + (Math.random() - 0.5) * 40;
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
    // Enrage imps for 4 seconds when any player is hit
    if (summonedMinions.length > 0) impsEnraged = gameTime + 4000;
    // Rage class — charge meter on damage taken
    if (p.classId === 'rage') { if (!p._rageMeter) p._rageMeter = 0; p._rageMeter = Math.min(50, p._rageMeter + reduced); }
    // Chrono class — track HP history for rewind
    if (p.classId === 'chrono') { if (!p._hpHistory) p._hpHistory = []; p._hpHistory.push(p.hp + reduced); if (p._hpHistory.length > 180) p._hpHistory.shift(); }

    if (p.hp <= 0) {
        p.alive = false;
        p.hp = 0;
        lives--;
        spawnParticles(p.x, p.y, '#888', 20);
        damageNumbers.push({ x: p.x, y: p.y - 35, text: `Lives: ${lives}`, color: '#ff0055', life: 60 });
        if (lives <= 0) {
            gameOver();
        }
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
    // Cap total particles to prevent lag from mass kills
    const maxTotal = 500;
    const toSpawn = particles.length > maxTotal ? Math.min(count, 2) : count;
    for (let i = 0; i < toSpawn; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1 + Math.random() * 3;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 20 + Math.random() * 15, maxLife: 35, color, size: 1 + Math.random() * 2 });
    }
}

// ─── UPDATE LOOP ────────────────────────────────────────────
function update(now) {
    if (gameState !== 'playing') return;
    gameTime = now;

    // Network: send input from client / apply remote inputs on host
    // Clients: only send input + update local visual effects, no simulation
    if (NET.isOnline && !NET.isHost) {
        sendClientInput();
        // Still update local particles/damage numbers for visuals
        for (let i = particles.length - 1; i >= 0; i--) {
            const pt = particles[i]; pt.x += pt.vx; pt.y += pt.vy; pt.vx *= 0.95; pt.vy *= 0.95; pt.life--;
            if (pt.life <= 0) particles.splice(i, 1);
        }
        for (let i = damageNumbers.length - 1; i >= 0; i--) {
            damageNumbers[i].y -= 0.8; damageNumbers[i].life--;
            if (damageNumbers[i].life <= 0) damageNumbers.splice(i, 1);
        }
        if (screenShake.duration > 0) {
            screenShake.x = (Math.random() - 0.5) * screenShake.intensity * 2;
            screenShake.y = (Math.random() - 0.5) * screenShake.intensity * 2;
            screenShake.duration--;
        } else { screenShake.x = 0; screenShake.y = 0; }
        mouse.clicked = false;
        return;
    }
    if (NET.isOnline && NET.isHost) { applyRemoteInputs(); }

    // Update players
    for (const p of players) {
        if (!p.alive) continue;
        updatePlayer(p, now);
    }

    // Update enemies (host only in online mode)
    if (!NET.isOnline || NET.isHost)
    for (const e of enemies) updateEnemy(e, now);

    // Update projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        proj.x += proj.vx;
        proj.y += proj.vy;
        proj.traveled += Math.sqrt(proj.vx*proj.vx + proj.vy*proj.vy);
        if (!proj.bounces) proj.bounces = 0;

        // Wall collision — bounce off walls
        if (!isWalkable(proj.x, proj.y)) {
            // Step back
            proj.x -= proj.vx;
            proj.y -= proj.vy;
            // Determine which axis to reflect
            const hitH = !isWalkable(proj.x + proj.vx, proj.y);
            const hitV = !isWalkable(proj.x, proj.y + proj.vy);
            if (hitH) proj.vx = -proj.vx;
            if (hitV) proj.vy = -proj.vy;
            if (!hitH && !hitV) { proj.vx = -proj.vx; proj.vy = -proj.vy; }
            proj.bounces++;
            spawnParticles(proj.x, proj.y, proj.color, 2);
            // Max 5 bounces then destroy
            if (proj.bounces > 5) { projectiles.splice(i, 1); continue; }
        }

        if (proj.traveled > proj.range) { projectiles.splice(i, 1); continue; }

        if (proj.owner === 'player') {
            let hitSomething = false;
            for (const e of enemies) {
                if (!e.alive) continue;
                if (Math.hypot(e.x - proj.x, e.y - proj.y) < e.radius + proj.radius) {
                    dealDamageToEnemy(e, proj.damage, proj.ownerRef);
                    if (!proj.piercing) { projectiles.splice(i, 1); hitSomething = true; break; }
                }
            }
            if (hitSomething) continue;
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

    // Update summoned minions (imps, shadows, clones, dogs)
    const enraged = now < impsEnraged;
    for (let i = summonedMinions.length - 1; i >= 0; i--) {
        const m = summonedMinions[i];
        if (m.type === 'clone') { m.hp = m.maxHp; } // Naruto clones are immortal
        if (now > m.life || m.hp <= 0) { spawnParticles(m.x, m.y, m.color || '#880000', 6); summonedMinions.splice(i, 1); continue; }

        // Shadows: melee when close, shoot blue flame when far
        if (m.type === 'shadow' && m.ranged) {
            let closest = null, closestDist = Infinity;
            for (const e of enemies) { if (!e.alive) continue;
                const d = Math.hypot(e.x - m.x, e.y - m.y);
                if (d < m.attackRange && d < closestDist) { closestDist = d; closest = e; } }
            if (closest && now - m.lastAttack > m.attackSpeed) {
                m.lastAttack = now;
                if (closestDist < 25) {
                    // Melee slash
                    dealDamageToEnemy(closest, Math.round(m.damage * 1.5), m.owner);
                    spawnParticles(closest.x, closest.y, '#7c4dff', 3);
                } else {
                    // Ranged blue flame bullet
                    const angle = Math.atan2(closest.y - m.y, closest.x - m.x);
                    projectiles.push({ x: m.x, y: m.y, vx: Math.cos(angle) * 6, vy: Math.sin(angle) * 6,
                        damage: m.damage, owner: 'player', ownerRef: m.owner, range: m.attackRange, traveled: 0,
                        color: '#448aff', radius: 3 });
                    spawnParticles(m.x, m.y, '#448aff', 2);
                }
            }
        }
        // Shadow boss generals also attack
        if (m.type === 'shadowBoss') {
            let closest = null, closestDist = Infinity;
            for (const e of enemies) { if (!e.alive) continue;
                const d = Math.hypot(e.x - m.x, e.y - m.y);
                if (d < 150 && d < closestDist) { closestDist = d; closest = e; } }
            if (closest && now - m.lastAttack > m.attackSpeed) {
                m.lastAttack = now;
                if (closestDist < 35) {
                    dealDamageToEnemy(closest, m.damage, m.owner);
                    spawnParticles(closest.x, closest.y, '#aa00ff', 4);
                } else {
                    const angle = Math.atan2(closest.y - m.y, closest.x - m.x);
                    for (let b = -1; b <= 1; b++) { // 3 projectile spread
                        projectiles.push({ x: m.x, y: m.y, vx: Math.cos(angle + b * 0.15) * 5, vy: Math.sin(angle + b * 0.15) * 5,
                            damage: Math.round(m.damage * 0.6), owner: 'player', ownerRef: m.owner, range: 150, traveled: 0,
                            color: '#aa00ff', radius: 4 }); }
                    spawnParticles(m.x, m.y, '#aa00ff', 3);
                }
            }
        }

        if (enraged && !(m.type === 'shadow') && !m._orbit) {
            // ATTACK MODE (non-shadow, non-orbiting) — chase and attack nearest enemy
            let closest = null, closestDist = Infinity;
            for (const e of enemies) { if (!e.alive) continue;
                const d = Math.hypot(e.x - m.x, e.y - m.y);
                if (d < closestDist) { closestDist = d; closest = e; } }
            if (closest) {
                if (closestDist > m.attackRange) {
                    const dx = closest.x - m.x, dy = closest.y - m.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    const spd = m.speed * 1.5;
                    const nx = m.x + (dx/dist) * spd, ny = m.y + (dy/dist) * spd;
                    if (isWalkableRadius(nx, ny, m.radius || 6)) { m.x = nx; m.y = ny; }
                    else if (isWalkableRadius(nx, m.y, m.radius || 6)) m.x = nx;
                    else if (isWalkableRadius(m.x, ny, m.radius || 6)) m.y = ny;
                } else if (now - m.lastAttack > m.attackSpeed) {
                    m.lastAttack = now;
                    dealDamageToEnemy(closest, m.damage, m.owner);
                    spawnParticles(closest.x, closest.y, m.color || '#ff4444', 3);
                }
            }
        } else {
            // FOLLOW MODE — shadows form wall, others trail
            const owner = m.owner;
            if (owner && owner.alive) {
                let targetX, targetY;
                if (m._orbit && m._guardIndex !== undefined) {
                    // Fast orbit circle around owner (divine dogs)
                    const orbitAngle = (m._guardIndex / (m._guardTotal || 8)) * Math.PI * 2 + now * 0.004;
                    const orbitRadius = 40;
                    targetX = owner.x + Math.cos(orbitAngle) * orbitRadius;
                    targetY = owner.y + Math.sin(orbitAngle) * orbitRadius;
                } else if (m.type === 'shadow' && m._guardIndex !== undefined) {
                    // Loose wall formation in front of owner (Jin-Woo shadows)
                    const wallSpacing = 14;
                    const wallOffset = (m._guardIndex - (m._guardTotal || 8) / 2 + 0.5) * wallSpacing;
                    const facingAngle = owner.facingAngle || 0;
                    const perpAngle = facingAngle + Math.PI / 2;
                    const guardDist = 30;
                    targetX = owner.x + Math.cos(facingAngle) * guardDist + Math.cos(perpAngle) * wallOffset;
                    targetY = owner.y + Math.sin(facingAngle) * guardDist + Math.sin(perpAngle) * wallOffset;
                } else {
                    targetX = owner.x;
                    targetY = owner.y;
                }
                const dx = targetX - m.x, dy = targetY - m.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const followDist = m.type === 'shadow' ? 5 : 25 + (i % 8) * 10;
                let moved = false;
                if (dist > followDist) {
                    const spd = Math.min(m.speed, dist * 0.15); // smooth approach
                    const nx = m.x + (dx/dist) * spd, ny = m.y + (dy/dist) * spd;
                    if (isWalkableRadius(nx, ny, m.radius || 6)) { m.x = nx; m.y = ny; moved = true; }
                    else if (isWalkableRadius(nx, m.y, m.radius || 6)) { m.x = nx; moved = true; }
                    else if (isWalkableRadius(m.x, ny, m.radius || 6)) { m.y = ny; moved = true; }
                }
                // Wall-stuck detection: if couldn't move, track stuck time
                if (!moved && dist > followDist) {
                    if (!m._stuckSince) m._stuckSince = now;
                    // Teleport back to owner after 3 seconds stuck
                    if (now - m._stuckSince > 3000) {
                        m.x = owner.x + (Math.random()-0.5)*25;
                        m.y = owner.y + (Math.random()-0.5)*25;
                        m._stuckSince = 0;
                        spawnParticles(m.x, m.y, m.color || '#6a3aaa', 4);
                    }
                } else { m._stuckSince = 0; }
                // If very far from owner, teleport immediately
                if (dist > 200) {
                    m.x = owner.x + (Math.random()-0.5)*25;
                    m.y = owner.y + (Math.random()-0.5)*25;
                    m._stuckSince = 0;
                    spawnParticles(m.x, m.y, m.color || '#6a3aaa', 4);
                }
            }
            // Orbiting minions attack enemies in range while orbiting
            if (m._orbit && now - m.lastAttack > m.attackSpeed) {
                let closest = null, closestDist = Infinity;
                for (const e of enemies) { if (!e.alive) continue;
                    const d = Math.hypot(e.x - m.x, e.y - m.y);
                    if (d < m.attackRange && d < closestDist) { closestDist = d; closest = e; } }
                if (closest) {
                    m.lastAttack = now;
                    dealDamageToEnemy(closest, m.damage, m.owner);
                    spawnParticles(closest.x, closest.y, m.color || '#1a237e', 3);
                }
            }
        }
    }


    // Update beam effects
    for (let i = activeBeams.length - 1; i >= 0; i--) {
        activeBeams[i].life--;
        if (activeBeams[i].life <= 0) activeBeams.splice(i, 1);
    }

    // Katakuri Fusillade — delayed dough fist slams
    for (const p of players) {
        if (!p._fusillade || p._fusillade.length === 0) continue;
        for (let i = p._fusillade.length - 1; i >= 0; i--) {
            const f = p._fusillade[i];
            if (now - f.startTime < f.delay) continue; // waiting for delay
            if (!f.hit) {
                f.hit = true;
                // Slam damage in AoE
                const slamRadius = 30;
                for (const e of enemies) { if (!e.alive) continue;
                    if (Math.hypot(e.x - f.x, e.y - f.y) < slamRadius) {
                        dealDamageToEnemy(e, f.damage, f.owner);
                        e.stunned = Math.max(e.stunned, now + 400);
                    }
                }
                // Visual: big dough-colored impact
                spawnParticles(f.x, f.y, '#e8b0a0', 12);
                spawnParticles(f.x, f.y, '#c62828', 6);
                spawnParticles(f.x, f.y, '#8d6e63', 4);
                triggerShake(3, 5);
            }
            // Remove after impact + brief linger
            if (now - f.startTime > f.delay + 300) p._fusillade.splice(i, 1);
        }
    }

    // Healer passive — auto-summon healing circle every 3s
    for (const p of players) {
        if (!p.alive || p.classId !== 'healer') continue;
        if (!p._lastAutoHeal) p._lastAutoHeal = 0;
        if (now - p._lastAutoHeal >= 3000) {
            p._lastAutoHeal = now;
            healingCircles.push({
                x: p.x, y: p.y, owner: p,
                radius: 55, life: now + 3000,
                healRate: 600, lastHeal: 0,
                color: '#43a047'
            });
            spawnParticles(p.x, p.y, '#66bb6a', 8);
        }
    }

    // Leech drain passive
    for (const p of players) {
        if (!p.alive || !p._leechTarget || now > p._leechEnd) { if (p) p._leechTarget = null; continue; }
        const t = p._leechTarget;
        if (!t.alive) { p._leechTarget = null; continue; }
        // Drain 3 HP/s
        if (!p._lastDrain) p._lastDrain = 0;
        if (now - p._lastDrain > 333) { p._lastDrain = now;
            dealDamageToEnemy(t, 1, p); p.hp = Math.min(p.hp + 1, p.maxHp);
            spawnParticles(t.x, t.y, '#880e4f', 1);
        }
        // Stay attached
        p.x = t.x - 10; p.y = t.y;
    }

    // Cordyceps — infected enemies rise as zombies on death (handled in dealDamageToEnemy)

    // Frog tongue — spinning arc that traps enemies
    for (const p of players) {
        if (!p.alive || p.classId !== 'frog' || !p._tongueActive) continue;
        const tongueRadius = 150;
        const spinSpeed = 0.08; // radians per frame — full circle in ~80 frames
        const spinDuration = 1500; // 1.5 seconds for full sweep
        const elapsed = now - p._tongueStart;
        if (elapsed > spinDuration) {
            // Spin done — devour all trapped enemies
            p._tongueActive = false;
            let eaten = 0;
            const snap = enemies.slice();
            for (const e of snap) {
                if (!e.alive || !p._tongueTrapped.has(e)) continue;
                e.x = p.x + (Math.random()-0.5) * 15;
                e.y = p.y + (Math.random()-0.5) * 15;
                if (e.isBoss) {
                    dealDamageToEnemy(e, Math.round(p.damage * 3), p);
                } else {
                    dealDamageToEnemy(e, 9999, p);
                    eaten++;
                }
            }
            if (eaten > 0) {
                const heal = eaten * 5;
                p.hp = Math.min(p.hp + heal, p.maxHp);
                damageNumbers.push({ x: p.x, y: p.y - 25, text: `*CHOMP x${eaten}* +${heal}hp`, color: '#76ff03', life: 50 });
            }
            spawnParticles(p.x, p.y, '#4caf50', 12);
            triggerShake(6, 12);
            p._tongueTrapped = null;
            continue;
        }
        // Advance tongue angle
        p._tongueAngle += spinSpeed;
        // Tongue beam at current angle
        activeBeams.push({ x: p.x, y: p.y, angle: p._tongueAngle,
            length: tongueRadius, width: 4, life: 3, maxLife: 3, color: '#76ff03', isTongue: true });
        // Spark particles at tongue tip
        const tipX = p.x + Math.cos(p._tongueAngle) * tongueRadius;
        const tipY = p.y + Math.sin(p._tongueAngle) * tongueRadius;
        spawnParticles(tipX, tipY, '#ffeb3b', 1);
        // Check what the tongue sweeps over — trap and stun
        for (const e of enemies) {
            if (!e.alive || p._tongueTrapped.has(e)) continue;
            const dist = Math.hypot(e.x - p.x, e.y - p.y);
            if (dist > tongueRadius) continue;
            // Check if enemy is near the tongue line
            const eAngle = Math.atan2(e.y - p.y, e.x - p.x);
            let diff = eAngle - p._tongueAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            if (Math.abs(diff) < 0.25) {
                // Caught! Trap on the tongue
                p._tongueTrapped.add(e);
                e.stunned = Math.max(e.stunned, now + spinDuration);
                spawnParticles(e.x, e.y, '#ffeb3b', 4);
                damageNumbers.push({ x: e.x, y: e.y - 15, text: 'CAUGHT!', color: '#76ff03', life: 30 });
            }
        }
        // Drag trapped enemies along with tongue
        for (const e of p._tongueTrapped) {
            if (!e.alive) continue;
            const dragDist = Math.hypot(e.x - p.x, e.y - p.y);
            const dragAngle = p._tongueAngle + (Math.random()-0.5) * 0.3;
            e.x = p.x + Math.cos(dragAngle) * Math.min(dragDist, tongueRadius * 0.8);
            e.y = p.y + Math.sin(dragAngle) * Math.min(dragDist, tongueRadius * 0.8);
            // Constant shock damage while trapped
            if (Math.random() < 0.1) dealDamageToEnemy(e, 2, p);
        }
    }

    // Jin-Woo passive — spawn 1 shadow every 2s after pressing E (up to 8)
    for (const p of players) {
        if (!p.alive || p.classId !== 'jinwoo' || !p._shadowSpawning) continue;
        if (!p._lastShadowSpawn) p._lastShadowSpawn = 0;
        if (now - p._lastShadowSpawn >= 2000) {
            p._lastShadowSpawn = now;
            const existing = summonedMinions.filter(m => m.type === 'shadow' && m.owner === p).length;
            if (existing < 8) {
                const angle = (existing / 8) * Math.PI * 2;
                summonedMinions.push({ x: p.x + Math.cos(angle) * 30, y: p.y + Math.sin(angle) * 30, owner: p,
                    hp: 20, maxHp: 20, damage: 6, speed: 3.2,
                    radius: 5, attackRange: 140, lastAttack: now, attackSpeed: 800,
                    life: Infinity, color: '#6a3aaa', type: 'shadow',
                    shadowOf: 'warrior', _guardIndex: existing, _guardTotal: 8, ranged: true, _orbit: true });
                spawnParticles(p.x + Math.cos(angle) * 30, p.y + Math.sin(angle) * 30, '#7c4dff', 6);
                damageNumbers.push({ x: p.x, y: p.y - 25, text: `Shadow ${existing + 1}/8`, color: '#448aff', life: 30 });
                // Reassign guard indices
                let idx = 0;
                for (const m of summonedMinions) {
                    if (m.type === 'shadow' && m.owner === p) { m._guardIndex = idx; m._guardTotal = 8; idx++; }
                }
            }
        }
    }

    // Portal passive — auto-teleport enemies to player every 4s
    for (const p of players) {
        if (!p.alive || p.classId !== 'portal') continue;
        if (!p._lastAutoPortal) p._lastAutoPortal = 0;
        if (now - p._lastAutoPortal >= 4000) {
            p._lastAutoPortal = now;
            let pulled = 0;
            for (const e of enemies) {
                if (!e.alive) continue;
                const dist = Math.hypot(e.x - p.x, e.y - p.y);
                if (dist < 250 && dist > 50) {
                    spawnParticles(e.x, e.y, '#00bcd4', 4);
                    const angle = Math.random() * Math.PI * 2;
                    const offset = 25 + Math.random() * 20;
                    e.x = p.x + Math.cos(angle) * offset;
                    e.y = p.y + Math.sin(angle) * offset;
                    spawnParticles(e.x, e.y, '#80deea', 4);
                    pulled++;
                }
            }
            if (pulled > 0) {
                spawnParticles(p.x, p.y, '#00bcd4', 10);
            }
        }
    }

    // Update healing circles
    for (let i = healingCircles.length - 1; i >= 0; i--) {
        const hc = healingCircles[i];
        if (now > hc.life) { healingCircles.splice(i, 1); continue; }
        // Heal players inside the circle
        if (now - hc.lastHeal > hc.healRate) {
            hc.lastHeal = now;
            for (const p of players) {
                if (!p.alive) continue;
                if (Math.hypot(p.x - hc.x, p.y - hc.y) < hc.radius) {
                    const heal = 5;
                    p.hp = Math.min(p.hp + heal, p.maxHp);
                    if (p.hp < p.maxHp) {
                        damageNumbers.push({ x: p.x, y: p.y - 25, text: `+${heal}`, color: '#66bb6a', life: 30 });
                    }
                }
            }
        }
    }

    // Update lightning nets
    for (let i = lightningNets.length - 1; i >= 0; i--) {
        const ln = lightningNets[i];
        if (now > ln.life) { lightningNets.splice(i, 1); continue; }
        // Damage, stun, and trap enemies inside the net
        if (now - ln.lastDamage > ln.damageRate) {
            ln.lastDamage = now;
            for (const e of enemies) {
                if (!e.alive) continue;
                if (Math.hypot(e.x - ln.x, e.y - ln.y) < ln.radius) {
                    dealDamageToEnemy(e, ln.damage, ln.owner);
                    e.stunned = Math.max(e.stunned, now + 500);
                    e.trapped = Math.max(e.trapped, now + 500);
                    spawnParticles(e.x, e.y, '#ffeb3b', 2);
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

// Get input keys/mouse for a player (supports local + online)
function pKey(p, code) {
    // Host's local P2 — use arrow/numpad keys mapped to their bindings
    if (NET.isOnline && NET.isHost && p.playerIndex === 1 && NET.localPlayerCount >= 2) {
        return keys[code] || false; // Uses local keyboard (arrows/numpad handled in updatePlayer)
    }
    // Remote player on host
    if (NET.isOnline && NET.isHost && p.playerIndex >= NET.localPlayerCount) {
        const ri = NET.remoteInputs[p.playerIndex];
        return ri ? (ri.keys[code] || false) : false;
    }
    return keys[code] || false;
}
function pMouse(p) {
    // Remote player on host
    if (NET.isOnline && NET.isHost && p.playerIndex >= NET.localPlayerCount) {
        const ri = NET.remoteInputs[p.playerIndex];
        return ri ? { x: ri.mouseX, y: ri.mouseY, down: ri.mouseDown, clicked: ri.clicked } : mouse;
    }
    return mouse;
}

function updatePlayer(p, now) {
    if (p.inventoryOpen) return; // Frozen while in inventory
    // Clients don't simulate — they receive state from host
    if (NET.isOnline && !NET.isHost) return;

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

    // Movement — determine if this player uses WASD or Arrows
    let dx = 0, dy = 0;
    const isLocalP2 = (p.playerIndex === 1 && NET.localPlayerCount >= 2) || (!NET.isOnline && p.playerIndex > 0);
    if (isLocalP2) {
        if (pKey(p, 'ArrowUp')) dy = -1; if (pKey(p, 'ArrowDown')) dy = 1;
        if (pKey(p, 'ArrowLeft')) dx = -1; if (pKey(p, 'ArrowRight')) dx = 1;
    } else {
        if (pKey(p, 'KeyW')) dy = -1; if (pKey(p, 'KeyS')) dy = 1;
        if (pKey(p, 'KeyA')) dx = -1; if (pKey(p, 'KeyD')) dx = 1;
    }
    if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx*dx + dy*dy);
        const nx = p.x + (dx/len) * spd;
        const ny = p.y + (dy/len) * spd;
        if (isWalkableRadius(nx, p.y, 8)) p.x = nx;
        if (isWalkableRadius(p.x, ny, 8)) p.y = ny;
    }

    // Facing direction
    if (!isLocalP2) {
        // Check if remote player sent a pre-computed facingAngle
        const ri = NET.isOnline && NET.isHost && p.playerIndex >= NET.localPlayerCount ? NET.remoteInputs[p.playerIndex] : null;
        if (ri && ri.facingAngle !== undefined) {
            p.facingAngle = ri.facingAngle;
        } else {
            // Local mouse aim (adjust for split screen viewport)
            const m = pMouse(p);
            const numV = coopMode ? players.length : 1;
            const vpW = numV > 1 ? Math.floor(canvas.width / numV) : canvas.width;
            const wx = m.x - vpW/2 + p.x;
            const wy = m.y - canvas.height/2 + p.y;
            p.facingAngle = Math.atan2(wy - p.y, wx - p.x);
        }
    } else {
        // Local P2 aims at nearest enemy
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
    if (!isLocalP2) {
        // P1 / remote online player: mouse + E + R + Q + Space
        const m = pMouse(p);
        if (m.down) playerAttack(p, now);
        if (pKey(p, 'KeyE')) playerSpecial(p, now);
        if (pKey(p, 'Space')) playerDodge(p, now);
        if (pKey(p, 'KeyR')) { portalTeleportToAlly(p, now); animeSecondary(p, now); frogInsects(p, now); }
        if (pKey(p, 'KeyQ')) { jinwooRecall(p, now); katakuriHaki(p, now); }
        if (pKey(p, 'KeyF')) jinwooAriseBoss(p, now);
    } else {
        // Local P2: Numpad
        if (pKey(p, 'Numpad0')) playerAttack(p, now);
        if (pKey(p, 'Numpad1')) playerSpecial(p, now);
        if (pKey(p, 'Numpad2')) playerDodge(p, now);
        if (pKey(p, 'Numpad5')) { portalTeleportToAlly(p, now); animeSecondary(p, now); frogInsects(p, now); }
        if (pKey(p, 'Numpad6') && !pKey(p, 'Numpad5')) frogInsects(p, now);
        if (pKey(p, 'Numpad4')) { jinwooRecall(p, now); katakuriHaki(p, now); }
        if (pKey(p, 'Numpad6')) jinwooAriseBoss(p, now);
    }

    // Reduce attackAnim
    if (p.attackAnim > 0) p.attackAnim--;
}

// ─── RENDERING ──────────────────────────────────────────────
function render() {
    ctx.fillStyle = PAL.fog;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameState !== 'playing' && gameState !== 'paused') return;

    const numViews = coopMode ? players.length : 1;

    if (numViews >= 2) {
        // Split screen — divide evenly
        const vpW = Math.floor(canvas.width / numViews);
        for (let v = 0; v < numViews; v++) {
            const vx = v * vpW;
            ctx.save();
            ctx.beginPath();
            ctx.rect(vx, 0, vpW, canvas.height);
            ctx.clip();
            // Follow this player, or fallback to first alive player
            let target = players[v];
            if (!target || !target.alive) target = players.find(p => p.alive) || players[0];
            renderWorldView(target.x, target.y, vx, 0, vpW, canvas.height);
            ctx.restore();
        }
        // Divider lines
        ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
        for (let d = 1; d < numViews; d++) {
            const dx = d * vpW;
            ctx.beginPath(); ctx.moveTo(dx, 0); ctx.lineTo(dx, canvas.height); ctx.stroke();
        }
    } else {
        // Solo — full screen
        const p = players[0];
        if (p) renderWorldView(p.alive ? p.x : 0, p.alive ? p.y : 0, 0, 0, canvas.width, canvas.height);
    }

    // HUD (drawn on top, not clipped)
    drawHUD();
    drawMinimap();
}

function renderWorldView(camTargetX, camTargetY, vpX, vpY, vpW, vpH) {
    const camX = camTargetX;
    const camY = camTargetY;
    camera.x = camX; camera.y = camY;

    const offX = vpX + vpW / 2 - camX + screenShake.x;
    const offY = vpY + vpH / 2 - camY + screenShake.y;

    ctx.save();
    ctx.translate(offX, offY);

    // Visible tile range
    const startCol = Math.max(0, Math.floor((camX - vpW/2) / TILE) - 1);
    const endCol = Math.min(MAP_COLS - 1, Math.ceil((camX + vpW/2) / TILE) + 1);
    const startRow = Math.max(0, Math.floor((camY - vpH/2) / TILE) - 1);
    const endRow = Math.min(MAP_ROWS - 1, Math.ceil((camY + vpH/2) / TILE) + 1);

    // Draw tiles
    for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
            const tx = c * TILE, ty = r * TILE;

            // Check if in explored room or corridor
            const visible = isTileVisible(c, r);
            if (!visible) { ctx.fillStyle = PAL.fog; ctx.fillRect(tx, ty, TILE, TILE); continue; }

            if (dungeon.map[r][c] === 1) {
                // Cyberpunk floor tile
                ctx.fillStyle = PAL.floor[(c + r * 7) % PAL.floor.length];
                ctx.fillRect(tx, ty, TILE, TILE);
                // Neon grid lines
                ctx.strokeStyle = PAL.gridLine;
                ctx.strokeRect(tx, ty, TILE, TILE);
                // Circuit traces
                if ((c + r * 3) % 5 === 0) {
                    ctx.strokeStyle = 'rgba(0,255,200,0.06)'; ctx.lineWidth = 0.5;
                    ctx.beginPath(); ctx.moveTo(tx, ty + TILE/2); ctx.lineTo(tx + TILE, ty + TILE/2); ctx.stroke();
                }
                if ((c * 7 + r) % 8 === 0) {
                    ctx.strokeStyle = 'rgba(255,0,128,0.05)'; ctx.lineWidth = 0.5;
                    ctx.beginPath(); ctx.moveTo(tx + TILE/2, ty); ctx.lineTo(tx + TILE/2, ty + TILE); ctx.stroke();
                }
                // Neon dot at intersections
                if ((c + r) % 6 === 0) {
                    ctx.fillStyle = 'rgba(0,255,200,0.08)';
                    ctx.fillRect(tx + TILE/2 - 1, ty + TILE/2 - 1, 2, 2);
                }
            } else {
                // Cyberpunk wall tile
                ctx.fillStyle = PAL.wall;
                ctx.fillRect(tx, ty, TILE, TILE);
                // Neon wall edge
                if (r + 1 < MAP_ROWS && dungeon.map[r + 1][c] === 1) {
                    ctx.fillStyle = PAL.wallTop;
                    ctx.fillRect(tx, ty + TILE - 8, TILE, 8);
                    // Neon strip on wall edge
                    ctx.fillStyle = 'rgba(0,255,200,0.1)';
                    ctx.fillRect(tx, ty + TILE - 1, TILE, 1);
                }
                // Side neon strip
                if (c + 1 < MAP_COLS && dungeon.map[r][c + 1] === 1) {
                    ctx.fillStyle = 'rgba(255,0,128,0.08)';
                    ctx.fillRect(tx + TILE - 1, ty, 1, TILE);
                }
            }
        }
    }

    // Neon light nodes (cyberpunk torches)
    for (const torch of dungeon.torches) {
        if (!isTileVisible(torch.x, torch.y)) continue;
        const tx = torch.x * TILE + TILE/2, ty = torch.y * TILE + TILE/2;
        const pulse = Math.sin(gameTime * 0.008 + torch.x * 2) * 0.3;
        const neonCol = (torch.x + torch.y) % 2 === 0 ? '#00ffcc' : '#ff0080';
        const neonRgba = neonCol === '#00ffcc' ? '0,255,200' : '255,0,128';
        // Light pillar
        ctx.fillStyle = `rgba(${neonRgba},0.15)`; ctx.fillRect(tx - 1, ty - 8, 2, 10);
        // Holographic orb
        ctx.shadowColor = neonCol; ctx.shadowBlur = 12 + pulse * 5;
        ctx.fillStyle = neonCol; ctx.globalAlpha = 0.7 + pulse * 0.2;
        ctx.beginPath(); ctx.arc(tx, ty - 10, 3, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        // Light radius — neon glow
        const lg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 65);
        lg.addColorStop(0, `rgba(${neonRgba},0.06)`); lg.addColorStop(1, `rgba(${neonRgba},0)`);
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.arc(tx, ty, 65, 0, Math.PI * 2); ctx.fill();
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
        if (proj.isHoneyBall) {
            // Huge honey ball — golden glob with dripping effect
            const r = proj.radius;
            // Outer glow
            ctx.globalAlpha = 0.3;
            const hg = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, r * 1.5);
            hg.addColorStop(0, '#ffb300'); hg.addColorStop(1, 'rgba(255,179,0,0)');
            ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(proj.x, proj.y, r * 1.5, 0, Math.PI * 2); ctx.fill();
            // Main honey body
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = '#ffb300';
            ctx.shadowColor = '#fdd835'; ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2); ctx.fill();
            // Inner highlight
            ctx.fillStyle = '#ffe082';
            ctx.beginPath(); ctx.arc(proj.x - r * 0.25, proj.y - r * 0.25, r * 0.45, 0, Math.PI * 2); ctx.fill();
            // Drip blobs trailing behind
            ctx.fillStyle = '#ffb300'; ctx.globalAlpha = 0.5;
            for (let d = 1; d <= 3; d++) {
                const dx = proj.x - proj.vx * d * 2.5;
                const dy = proj.y - proj.vy * d * 2.5;
                ctx.beginPath(); ctx.arc(dx, dy, r * (0.5 - d * 0.1), 0, Math.PI * 2); ctx.fill();
            }
            ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        } else {
            ctx.fillStyle = proj.color;
            ctx.shadowColor = proj.color; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Trail
            ctx.globalAlpha = 0.3;
            ctx.beginPath(); ctx.arc(proj.x - proj.vx * 2, proj.y - proj.vy * 2, proj.radius * 0.7, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    // Summoned minions (imps, shadows, clones, dogs)
    for (const m of summonedMinions) {
        if (m.type === 'shadow' && m.shadowOf) {
            // Jin-Woo shadow warriors — big armored soldiers
            ctx.globalAlpha = 0.9;
            ctx.save(); ctx.translate(m.x, m.y);
            const sCol = '#1a1040';
            const sHi = '#448aff'; // blue flame
            // Blue flame aura
            ctx.shadowColor = sHi; ctx.shadowBlur = 8;
            const ag = ctx.createRadialGradient(0, -2, 0, 0, -2, 12);
            ag.addColorStop(0, 'rgba(68,138,255,0.15)'); ag.addColorStop(1, 'rgba(68,138,255,0)');
            ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(0, -2, 12, 0, Math.PI * 2); ctx.fill();
            // Hooded head
            ctx.fillStyle = sCol; ctx.beginPath(); ctx.arc(0, -6, 5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(0, -6, 6, Math.PI, Math.PI * 2); ctx.fill(); // hood
            // Glowing blue eyes
            ctx.fillStyle = sHi; ctx.shadowColor = sHi; ctx.shadowBlur = 6;
            ctx.fillRect(-3, -7, 2, 1.5); ctx.fillRect(1, -7, 2, 1.5);
            ctx.shadowBlur = 8;
            // Body — slim cloak
            ctx.fillStyle = sCol;
            ctx.beginPath(); ctx.moveTo(-4, -1); ctx.lineTo(4, -1); ctx.lineTo(5, 10); ctx.lineTo(-5, 10); ctx.fill();
            // Blue flame wisps
            const ft = gameTime * 0.012 + m._guardIndex * 1.5;
            ctx.fillStyle = 'rgba(68,138,255,0.4)';
            ctx.beginPath(); ctx.arc(Math.sin(ft) * 3, -8 - Math.abs(Math.sin(ft * 1.3)) * 4, 2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(68,138,255,0.25)';
            ctx.beginPath(); ctx.arc(Math.sin(ft + 1) * 2, -10 - Math.abs(Math.sin(ft * 0.9)) * 3, 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0; ctx.restore(); ctx.globalAlpha = 1;
        } else if (m.type === 'shadowBoss') {
            // Shadow Boss General — large glowing purple entity
            ctx.globalAlpha = 0.9;
            ctx.save(); ctx.translate(m.x, m.y);
            ctx.shadowColor = '#aa00ff'; ctx.shadowBlur = 16;
            // Dark aura
            const bag = ctx.createRadialGradient(0, -4, 0, 0, -4, 28);
            bag.addColorStop(0, 'rgba(170,0,255,0.15)'); bag.addColorStop(1, 'rgba(170,0,255,0)');
            ctx.fillStyle = bag; ctx.beginPath(); ctx.arc(0, -4, 28, 0, Math.PI * 2); ctx.fill();
            // Large armored body
            ctx.fillStyle = '#2a0050';
            ctx.beginPath(); ctx.arc(0, -10, 12, 0, Math.PI * 2); ctx.fill(); // head
            ctx.fillRect(-10, -1, 20, 18); // body
            // Crown/horns
            ctx.fillStyle = '#aa00ff';
            ctx.beginPath(); ctx.moveTo(-6, -18); ctx.lineTo(-4, -26); ctx.lineTo(-2, -18); ctx.fill();
            ctx.beginPath(); ctx.moveTo(2, -18); ctx.lineTo(4, -26); ctx.lineTo(6, -18); ctx.fill();
            // Glowing eyes
            ctx.fillStyle = '#e040fb'; ctx.shadowColor = '#e040fb'; ctx.shadowBlur = 10;
            ctx.fillRect(-6, -13, 4, 3); ctx.fillRect(2, -13, 4, 3);
            ctx.shadowBlur = 16; ctx.shadowColor = '#aa00ff';
            // Armor lines
            ctx.strokeStyle = '#aa00ff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
            ctx.strokeRect(-10, -1, 20, 18);
            ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(0, 17); ctx.stroke();
            ctx.globalAlpha = 0.9;
            // Weapon glow
            ctx.fillStyle = '#aa00ff';
            ctx.fillRect(12, -6, 3, 22);
            ctx.fillStyle = '#e040fb'; ctx.globalAlpha = 0.4;
            ctx.fillRect(13, -6, 1, 22); ctx.globalAlpha = 0.9;
            // Legs
            ctx.fillStyle = '#2a0050';
            ctx.fillRect(-7, 17, 5, 8); ctx.fillRect(2, 17, 5, 8);
            // Name tag
            ctx.fillStyle = '#aa00ff'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
            ctx.fillText(m.bossName || 'General', 0, -28);
            ctx.shadowBlur = 0; ctx.restore(); ctx.globalAlpha = 1;
        } else {
            // Imps, clones, dogs — generic minion drawing
            ctx.save(); ctx.translate(m.x, m.y);
            ctx.fillStyle = m.color;
            ctx.beginPath(); ctx.arc(0, 0, m.radius, 0, Math.PI * 2); ctx.fill();
            if (m.type === 'imp') {
                // Horns
                ctx.fillStyle = '#880000';
                ctx.beginPath(); ctx.moveTo(-4, -5); ctx.lineTo(-6, -11); ctx.lineTo(-2, -7); ctx.fill();
                ctx.beginPath(); ctx.moveTo(4, -5); ctx.lineTo(6, -11); ctx.lineTo(2, -7); ctx.fill();
                ctx.fillStyle = '#ff0'; ctx.shadowColor = '#ff0'; ctx.shadowBlur = 4;
                ctx.fillRect(-3, -3, 2, 2); ctx.fillRect(1, -3, 2, 2); ctx.shadowBlur = 0;
                const wf = Math.sin(gameTime * 0.015) * 0.4;
                ctx.fillStyle = 'rgba(150,0,0,0.5)';
                ctx.save(); ctx.rotate(wf); ctx.beginPath(); ctx.moveTo(-3,-2); ctx.lineTo(-10,-7); ctx.lineTo(-5,1); ctx.fill(); ctx.restore();
                ctx.save(); ctx.rotate(-wf); ctx.beginPath(); ctx.moveTo(3,-2); ctx.lineTo(10,-7); ctx.lineTo(5,1); ctx.fill(); ctx.restore();
            } else if (m.type === 'dog') {
                // Divine Dogs — big shadow fiends with rows of teeth
                ctx.shadowColor = '#283593'; ctx.shadowBlur = 8;
                // Muscular body
                ctx.fillStyle = '#0d1442';
                ctx.beginPath(); ctx.ellipse(0, 2, m.radius * 1.1, m.radius * 0.7, 0, 0, Math.PI * 2); ctx.fill();
                // Head (wolf-like, forward)
                ctx.fillStyle = '#111';
                ctx.beginPath(); ctx.ellipse(m.radius * 0.6, -2, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
                // Snout
                ctx.fillStyle = '#0a0a2a';
                ctx.beginPath(); ctx.moveTo(m.radius * 0.6 + 6, -4); ctx.lineTo(m.radius * 0.6 + 14, -1);
                ctx.lineTo(m.radius * 0.6 + 6, 2); ctx.fill();
                // Rows of teeth (jagged)
                ctx.fillStyle = '#fff';
                for (let t = 0; t < 5; t++) {
                    const tx = m.radius * 0.6 + 6 + t * 1.8;
                    ctx.beginPath(); ctx.moveTo(tx, -2); ctx.lineTo(tx + 0.8, -4); ctx.lineTo(tx + 1.6, -2); ctx.fill(); // top teeth
                    ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx + 0.8, 2); ctx.lineTo(tx + 1.6, 0); ctx.fill(); // bottom teeth
                }
                // Glowing red eyes
                ctx.fillStyle = '#ff1744'; ctx.shadowColor = '#ff1744'; ctx.shadowBlur = 6;
                ctx.beginPath(); ctx.arc(m.radius * 0.5, -5, 2.5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(m.radius * 0.7, -5, 2.5, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
                // Pointed ears
                ctx.fillStyle = '#111';
                ctx.beginPath(); ctx.moveTo(m.radius * 0.3, -6); ctx.lineTo(m.radius * 0.2, -14); ctx.lineTo(m.radius * 0.5, -7); ctx.fill();
                ctx.beginPath(); ctx.moveTo(m.radius * 0.7, -6); ctx.lineTo(m.radius * 0.8, -14); ctx.lineTo(m.radius * 0.9, -7); ctx.fill();
                // Legs (4 clawed)
                ctx.fillStyle = '#0d1442';
                ctx.fillRect(-m.radius * 0.6, m.radius * 0.4, 3, 7);
                ctx.fillRect(-m.radius * 0.2, m.radius * 0.4, 3, 7);
                ctx.fillRect(m.radius * 0.2, m.radius * 0.4, 3, 7);
                ctx.fillRect(m.radius * 0.6, m.radius * 0.4, 3, 7);
                // Claws
                ctx.fillStyle = '#aaa';
                for (let l = 0; l < 4; l++) {
                    const lx = -m.radius * 0.6 + l * (m.radius * 0.4);
                    ctx.beginPath(); ctx.moveTo(lx, m.radius * 0.4 + 7); ctx.lineTo(lx + 1.5, m.radius * 0.4 + 10); ctx.lineTo(lx + 3, m.radius * 0.4 + 7); ctx.fill();
                }
                // Shadow wisps trailing
                ctx.fillStyle = 'rgba(26,35,126,0.3)';
                const wt = gameTime * 0.008;
                for (let w = 0; w < 3; w++) {
                    const wx = -m.radius * 0.5 - w * 4 + Math.sin(wt + w) * 3;
                    const wy = Math.sin(wt * 0.7 + w * 2) * 4;
                    ctx.beginPath(); ctx.arc(wx, wy, 3 + w, 0, Math.PI * 2); ctx.fill();
                }
            } else if (m.type === 'facehugger') {
                // Alien face-hugger — small skittering spider-like
                ctx.fillStyle = '#2e7d32';
                ctx.beginPath(); ctx.ellipse(0, 0, 4, 3, 0, 0, Math.PI*2); ctx.fill();
                // Legs
                ctx.strokeStyle = '#1b5e20'; ctx.lineWidth = 1;
                const skitter = Math.sin(gameTime * 0.03 + (m.lastAttack || 0)) * 0.3;
                for (let l = 0; l < 4; l++) {
                    const la = (l/4)*Math.PI*2 + skitter;
                    ctx.beginPath(); ctx.moveTo(Math.cos(la)*3, Math.sin(la)*3);
                    ctx.lineTo(Math.cos(la)*7, Math.sin(la)*7); ctx.stroke();
                }
                // Tail
                ctx.beginPath(); ctx.moveTo(-4, 0); ctx.quadraticCurveTo(-7, -3, -9, 0); ctx.stroke();
            } else if (m.type === 'insect') {
                // Fly/insect — tiny dark buzzing bug with wings
                const buzz = Math.sin(gameTime * 0.05 + (m._guardIndex || 0) * 2) * 2;
                ctx.fillStyle = '#222';
                ctx.beginPath(); ctx.ellipse(0, buzz, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
                // Wings (fast flapping)
                ctx.fillStyle = 'rgba(200,200,255,0.4)';
                const wFlap = Math.sin(gameTime * 0.08 + (m._guardIndex || 0)) * 0.8;
                ctx.save(); ctx.rotate(wFlap);
                ctx.beginPath(); ctx.ellipse(-2, buzz - 2, 3, 1.5, -0.3, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
                ctx.save(); ctx.rotate(-wFlap);
                ctx.beginPath(); ctx.ellipse(2, buzz - 2, 3, 1.5, 0.3, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
                // Red eyes
                ctx.fillStyle = '#f44336';
                ctx.fillRect(-1.5, buzz - 1, 1, 1); ctx.fillRect(0.5, buzz - 1, 1, 1);
            } else {
                // Generic (clones)
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-2,-2,1.5,0,Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(2,-2,1.5,0,Math.PI*2); ctx.fill();
            }
            ctx.restore();
        }
        // HP bar for all minions
        if (m.hp < m.maxHp) {
            ctx.fillStyle = '#0a0a1a'; ctx.fillRect(m.x - 8, m.y - (m.radius||8) - 8, 16, 3);
            ctx.fillStyle = '#aa44ff'; ctx.fillRect(m.x - 8, m.y - (m.radius||8) - 8, 16 * (m.hp / m.maxHp), 3);
        }
    }

    // Healing circles
    for (const hc of healingCircles) {
        const remaining = (hc.life - gameTime) / 3000;
        ctx.globalAlpha = Math.min(0.35, remaining);
        // Outer ring
        ctx.strokeStyle = '#66bb6a'; ctx.lineWidth = 3;
        ctx.shadowColor = '#43a047'; ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(hc.x, hc.y, hc.radius, 0, Math.PI * 2); ctx.stroke();
        // Inner fill
        const hg = ctx.createRadialGradient(hc.x, hc.y, 0, hc.x, hc.y, hc.radius);
        hg.addColorStop(0, 'rgba(102,187,106,0.2)'); hg.addColorStop(0.7, 'rgba(67,160,71,0.1)'); hg.addColorStop(1, 'rgba(67,160,71,0)');
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hc.x, hc.y, hc.radius, 0, Math.PI * 2); ctx.fill();
        // Cross symbol in center
        ctx.globalAlpha = Math.min(0.6, remaining);
        ctx.strokeStyle = '#a5d6a7'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(hc.x - 8, hc.y); ctx.lineTo(hc.x + 8, hc.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hc.x, hc.y - 8); ctx.lineTo(hc.x, hc.y + 8); ctx.stroke();
        // Rotating sparkles
        const t = gameTime * 0.003;
        for (let s = 0; s < 4; s++) {
            const a = t + s * Math.PI / 2;
            const sx = hc.x + Math.cos(a) * hc.radius * 0.6;
            const sy = hc.y + Math.sin(a) * hc.radius * 0.6;
            ctx.fillStyle = '#a5d6a7'; ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }

    // Lightning nets
    for (const ln of lightningNets) {
        const remaining = (ln.life - gameTime) / 5000;
        const pulse = Math.sin(gameTime * 0.02) * 0.15;
        ctx.globalAlpha = Math.min(0.5, remaining) + pulse;
        // Electric field
        ctx.strokeStyle = '#ffeb3b'; ctx.lineWidth = 2;
        ctx.shadowColor = '#ffeb3b'; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(ln.x, ln.y, ln.radius, 0, Math.PI * 2); ctx.stroke();
        // Net lines — crisscross pattern
        ctx.strokeStyle = 'rgba(255,235,59,0.4)'; ctx.lineWidth = 1;
        for (let n = 0; n < 6; n++) {
            const a1 = (n / 6) * Math.PI * 2 + gameTime * 0.002;
            const a2 = a1 + Math.PI;
            ctx.beginPath();
            ctx.moveTo(ln.x + Math.cos(a1) * ln.radius, ln.y + Math.sin(a1) * ln.radius);
            ctx.lineTo(ln.x + Math.cos(a2) * ln.radius, ln.y + Math.sin(a2) * ln.radius);
            ctx.stroke();
        }
        // Random lightning bolts inside
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
        ctx.globalAlpha = (Math.sin(gameTime * 0.05) > 0.3) ? 0.7 : 0;
        for (let b = 0; b < 3; b++) {
            const bx = ln.x + (Math.sin(gameTime * 0.007 + b * 2) * ln.radius * 0.6);
            const by = ln.y + (Math.cos(gameTime * 0.009 + b * 3) * ln.radius * 0.6);
            ctx.beginPath(); ctx.moveTo(bx, by);
            ctx.lineTo(bx + (Math.random() - 0.5) * 16, by + (Math.random() - 0.5) * 16);
            ctx.stroke();
        }
        // Center spark
        ctx.globalAlpha = 0.4 + pulse;
        const cg = ctx.createRadialGradient(ln.x, ln.y, 0, ln.x, ln.y, ln.radius * 0.5);
        cg.addColorStop(0, 'rgba(255,255,255,0.3)'); cg.addColorStop(1, 'rgba(255,235,59,0)');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(ln.x, ln.y, ln.radius * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }


    // Katakuri Fusillade fist rendering — fists fly from rings to targets
    for (const p of players) {
        if (!p._fusillade) continue;
        const hk = !!p._haki;
        const fCol = hk ? '#b71c1c' : '#fff';
        const fColInner = hk ? '#7f0000' : '#e0e0e0';
        const fGlow = hk ? '#ff1744' : '#fff';
        for (const f of p._fusillade) {
            const elapsed = gameTime - f.startTime;
            const srcX = f.srcX || p.x;
            const srcY = f.srcY || p.y;
            if (elapsed < f.delay) {
                // Fist flying from ring to target
                const progress = elapsed / f.delay;
                const curX = srcX + (f.x - srcX) * progress;
                const curY = srcY + (f.y - srcY) * progress;
                // Dough arm line from ring to fist
                ctx.strokeStyle = fCol; ctx.lineWidth = 4; ctx.lineCap = 'round';
                ctx.shadowColor = fGlow; ctx.shadowBlur = hk ? 10 : 6;
                ctx.globalAlpha = 0.7;
                ctx.beginPath(); ctx.moveTo(srcX, srcY); ctx.lineTo(curX, curY); ctx.stroke();
                ctx.shadowBlur = 0;
                // Flying fist
                ctx.globalAlpha = 1;
                ctx.fillStyle = fCol;
                ctx.beginPath(); ctx.arc(curX, curY, 8, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = fColInner;
                ctx.beginPath(); ctx.arc(curX, curY, 3.5, 0, Math.PI * 2); ctx.fill();
                // Target warning
                ctx.globalAlpha = 0.15 + progress * 0.2;
                ctx.fillStyle = hk ? '#b71c1c' : '#c62828';
                ctx.beginPath(); ctx.arc(f.x, f.y, 12, 0, Math.PI * 2); ctx.fill();
            } else if (!f.hit || elapsed < f.delay + 300) {
                // Slam impact
                const impactT = (elapsed - f.delay) / 300;
                const fistSize = 16 * (1 - impactT * 0.3);
                ctx.globalAlpha = 1 - impactT * 0.7;
                ctx.fillStyle = fCol;
                ctx.beginPath(); ctx.arc(f.x, f.y, fistSize, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = fColInner;
                ctx.beginPath(); ctx.arc(f.x, f.y, fistSize * 0.4, 0, Math.PI * 2); ctx.fill();
                // Impact ring
                ctx.strokeStyle = fCol; ctx.lineWidth = 2;
                ctx.globalAlpha *= 0.5;
                ctx.beginPath(); ctx.arc(f.x, f.y, fistSize + impactT * 25, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }
    }

    // Beam effects (Draco / Black Flash)
    for (const b of activeBeams) {
        const alpha = b.life / b.maxLife;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        if (b.isTongue) {
            // Frog tongue — green with blue lightning arcs
            ctx.globalAlpha = alpha * 0.9;
            ctx.fillStyle = '#e91e63'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill(); // mouth
            ctx.fillStyle = '#76ff03';
            ctx.shadowColor = '#76ff03'; ctx.shadowBlur = 6;
            ctx.fillRect(0, -2, b.length, 4); // tongue
            // Tip
            ctx.beginPath(); ctx.arc(b.length, 0, 5, 0, Math.PI * 2); ctx.fill();
            // Blue lightning arcs along the tongue
            ctx.strokeStyle = '#448aff'; ctx.lineWidth = 1.5; ctx.shadowColor = '#448aff'; ctx.shadowBlur = 12;
            for (let s = 0; s < 6; s++) {
                const sx = 8 + s * (b.length / 6);
                // Top arc — jagged lightning bolt
                ctx.beginPath(); ctx.moveTo(sx, -2);
                ctx.lineTo(sx + 3, -6 - Math.random() * 6);
                ctx.lineTo(sx + 6, -3 - Math.random() * 4);
                ctx.lineTo(sx + 9, -7 - Math.random() * 5);
                ctx.lineTo(sx + 12, -2); ctx.stroke();
                // Bottom arc
                ctx.beginPath(); ctx.moveTo(sx, 2);
                ctx.lineTo(sx + 3, 6 + Math.random() * 6);
                ctx.lineTo(sx + 6, 3 + Math.random() * 4);
                ctx.lineTo(sx + 9, 7 + Math.random() * 5);
                ctx.lineTo(sx + 12, 2); ctx.stroke();
            }
            // Blue glow at tip
            ctx.fillStyle = '#448aff'; ctx.shadowColor = '#448aff'; ctx.shadowBlur = 14;
            ctx.beginPath(); ctx.arc(b.length, 0, 3, 0, Math.PI * 2); ctx.fill();
            // Random blue sparks jumping off tongue
            ctx.strokeStyle = '#82b1ff'; ctx.lineWidth = 1;
            for (let j = 0; j < 3; j++) {
                const jx = Math.random() * b.length;
                const jy = (Math.random() - 0.5) * 20;
                ctx.beginPath(); ctx.moveTo(jx, 0);
                ctx.lineTo(jx + (Math.random()-0.5) * 8, jy);
                ctx.stroke();
            }
        } else if (b.isBlackFlash) {
            // Black Flash — dark lightning burst
            ctx.globalAlpha = alpha * 0.8;
            ctx.fillStyle = '#000';
            ctx.shadowColor = '#ff1744'; ctx.shadowBlur = 20;
            ctx.fillRect(0, -b.width, b.length, b.width * 2);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ff1744';
            ctx.fillRect(0, -b.width * 0.3, b.length, b.width * 0.6);
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, -b.width * 0.1, b.length * 0.6, b.width * 0.2);
        } else {
            // Generic beam — uses b.color
            const bc = b.color || '#9c27b0';
            ctx.globalAlpha = alpha * 0.4;
            ctx.fillStyle = bc;
            ctx.shadowColor = bc; ctx.shadowBlur = 30;
            ctx.fillRect(0, -b.width, b.length, b.width * 2);
            ctx.globalAlpha = alpha * 0.8;
            ctx.fillStyle = bc;
            ctx.fillRect(0, -b.width * 0.5, b.length, b.width);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, -b.width * 0.15, b.length * 0.8, b.width * 0.3);
        }
        ctx.shadowBlur = 0;
        ctx.restore();
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
    // Neon scan light around players
    for (const p of players) {
        if (!p.alive) continue;
        // Cyan holographic scan ring
        const lg = ctx.createRadialGradient(p.x, p.y, 20, p.x, p.y, 190);
        lg.addColorStop(0, 'rgba(0,255,200,0.04)');
        lg.addColorStop(0.4, 'rgba(0,200,255,0.02)');
        lg.addColorStop(0.8, 'rgba(255,0,128,0.01)');
        lg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.arc(p.x, p.y, 190, 0, Math.PI * 2); ctx.fill();
        // Faint scan ring pulse
        ctx.strokeStyle = 'rgba(0,255,200,0.04)'; ctx.lineWidth = 1;
        const scanR = 100 + Math.sin(gameTime * 0.003) * 30;
        ctx.beginPath(); ctx.arc(p.x, p.y, scanR, 0, Math.PI * 2); ctx.stroke();
    }
}

// ─── HUD ────────────────────────────────────────────────────
function drawHUD() {
    const pad = 15;
    for (let i = 0; i < players.length; i++) {
        const p = players[i];
        // Position HUD panels: P1 top-left, P2 top-right, P3 bottom-left, P4 bottom-right
        const hx = (i % 2 === 0) ? pad : canvas.width - 220 - pad;
        const hy = i < 2 ? pad : canvas.height - 85;

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
    ctx.fillStyle = '#00ffcc'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
    ctx.fillText(`Floor ${currentFloor}`, canvas.width / 2, 25);

    // Lives
    ctx.fillStyle = lives > 2 ? '#00ffcc' : lives > 1 ? '#ffeb3b' : '#ff0055';
    ctx.font = '12px monospace';
    ctx.fillText(`Lives: ${lives}`, canvas.width / 2, 42);

    // Gold
    ctx.fillStyle = '#eeff00'; ctx.font = '12px monospace';
    ctx.fillText(`Gold: ${runStats.goldCollected}`, canvas.width / 2, 56);

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

function drawAngel(ctx, p, time) {
    ctx.save(); ctx.translate(p.x, p.y);
    const hasWings = p.activeEffects.some(e => e.effect === 'wings');
    // Holy glow
    if (hasWings) {
        ctx.globalAlpha = 0.15 + Math.sin(time * 0.006) * 0.05;
        const hg = ctx.createRadialGradient(0, -5, 0, 0, -5, 35);
        hg.addColorStop(0, '#fffacd'); hg.addColorStop(1, 'rgba(255,250,205,0)');
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, -5, 35, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    }
    // Wings (always visible, bigger when active)
    const wingSize = hasWings ? 1.4 : 1;
    const wingFlap = Math.sin(time * (hasWings ? 0.012 : 0.004)) * 0.3;
    ctx.fillStyle = hasWings ? 'rgba(255,250,220,0.8)' : 'rgba(240,230,140,0.5)';
    ctx.shadowColor = '#f0e68c'; ctx.shadowBlur = hasWings ? 12 : 4;
    // Left wing
    ctx.save(); ctx.rotate(wingFlap - 0.3);
    ctx.beginPath(); ctx.moveTo(-4, -4);
    ctx.quadraticCurveTo(-18 * wingSize, -20 * wingSize, -8 * wingSize, -2);
    ctx.quadraticCurveTo(-22 * wingSize, -10 * wingSize, -14 * wingSize, 4);
    ctx.lineTo(-4, 2); ctx.fill();
    ctx.restore();
    // Right wing
    ctx.save(); ctx.rotate(-wingFlap + 0.3);
    ctx.beginPath(); ctx.moveTo(4, -4);
    ctx.quadraticCurveTo(18 * wingSize, -20 * wingSize, 8 * wingSize, -2);
    ctx.quadraticCurveTo(22 * wingSize, -10 * wingSize, 14 * wingSize, 4);
    ctx.lineTo(4, 2); ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;
    // Body
    ctx.fillStyle = p.attackAnim > 0 ? '#fffff0' : '#f5f5dc';
    ctx.beginPath(); ctx.arc(0, -8, 7, 0, Math.PI * 2); ctx.fill(); // Head
    // Halo
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1.5;
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.ellipse(0, -18, 7, 2, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    // Robe
    ctx.fillStyle = '#f0e68c';
    ctx.beginPath(); ctx.moveTo(-6, -1); ctx.lineTo(6, -1); ctx.lineTo(8, 16); ctx.lineTo(-8, 16); ctx.fill();
    // Belt
    ctx.fillStyle = '#daa520'; ctx.fillRect(-6, 4, 12, 2);
    // Weapon — holy bolt aim
    ctx.save(); ctx.rotate(p.facingAngle);
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = p.attackAnim > 0 ? 15 : 6;
    ctx.beginPath(); ctx.arc(14, 0, 3 + (p.attackAnim > 0 ? 2 : 0), 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    // Player indicator
    ctx.fillStyle = p.playerIndex === 0 ? '#fff' : '#4a9eff';
    ctx.beginPath(); ctx.arc(0, -22, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawDemon(ctx, p, time) {
    ctx.save(); ctx.translate(p.x, p.y);
    // Dark aura
    ctx.globalAlpha = 0.1 + Math.sin(time * 0.005) * 0.05;
    const ag = ctx.createRadialGradient(0, -2, 0, 0, -2, 28);
    ag.addColorStop(0, '#cc2222'); ag.addColorStop(1, 'rgba(100,0,0,0)');
    ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(0, -2, 28, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // Body
    ctx.fillStyle = p.attackAnim > 0 ? '#ff4444' : '#8b1a1a';
    ctx.beginPath(); ctx.arc(0, -8, 8, 0, Math.PI * 2); ctx.fill(); // Head
    ctx.fillRect(-6, -1, 12, 14); // Torso
    // Horns — large curved
    ctx.fillStyle = '#4a0a0a';
    ctx.beginPath(); ctx.moveTo(-5, -10); ctx.quadraticCurveTo(-10, -24, -3, -20); ctx.lineTo(-4, -12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(5, -10); ctx.quadraticCurveTo(10, -24, 3, -20); ctx.lineTo(4, -12); ctx.fill();
    // Eyes
    ctx.fillStyle = '#ff4400';
    ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 6;
    ctx.fillRect(-4, -10, 2.5, 2); ctx.fillRect(1.5, -10, 2.5, 2);
    ctx.shadowBlur = 0;
    // Demon wings (small)
    ctx.fillStyle = 'rgba(80,0,0,0.6)';
    const wf = Math.sin(time * 0.008) * 0.25;
    ctx.save(); ctx.rotate(wf - 0.2);
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-16, -8); ctx.lineTo(-14, -2); ctx.lineTo(-18, 2); ctx.lineTo(-6, 3); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.rotate(-wf + 0.2);
    ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(16, -8); ctx.lineTo(14, -2); ctx.lineTo(18, 2); ctx.lineTo(6, 3); ctx.fill();
    ctx.restore();
    // Claws (aimed direction)
    ctx.save(); ctx.rotate(p.facingAngle);
    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 2;
    const clawExt = p.attackAnim > 0 ? 8 : 0;
    ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(14 + clawExt, -6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(16 + clawExt, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, 3); ctx.lineTo(14 + clawExt, 6); ctx.stroke();
    ctx.restore();
    // Tail
    ctx.strokeStyle = '#5a0a0a'; ctx.lineWidth = 2.5;
    const tailWave = Math.sin(time * 0.006);
    ctx.beginPath(); ctx.moveTo(0, 13);
    ctx.quadraticCurveTo(8 + tailWave * 4, 18, 5 + tailWave * 3, 24);
    ctx.stroke();
    // Tail point
    ctx.fillStyle = '#5a0a0a';
    ctx.beginPath(); ctx.moveTo(5 + tailWave * 3, 24); ctx.lineTo(3, 27); ctx.lineTo(8, 26); ctx.fill();
    // Legs
    ctx.fillStyle = '#5a1010';
    ctx.fillRect(-4, 13, 3, 7); ctx.fillRect(2, 13, 3, 7);
    // Player indicator
    ctx.fillStyle = p.playerIndex === 0 ? '#fff' : '#4a9eff';
    ctx.beginPath(); ctx.arc(0, -26, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawDraco(ctx, p, time) {
    ctx.save(); ctx.translate(p.x, p.y);
    // Energy aura
    ctx.globalAlpha = 0.08 + Math.sin(time * 0.004) * 0.04;
    const ag = ctx.createRadialGradient(0, -2, 0, 0, -2, 30);
    ag.addColorStop(0, '#9c27b0'); ag.addColorStop(1, 'rgba(106,27,154,0)');
    ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(0, -2, 30, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // Dragon body — muscular
    ctx.fillStyle = p.attackAnim > 0 ? '#8e24aa' : '#4a148c';
    ctx.beginPath(); ctx.arc(0, -9, 9, 0, Math.PI * 2); ctx.fill(); // Head
    ctx.fillRect(-7, -1, 14, 15); // Torso (wider)
    // Snout/jaw
    ctx.fillStyle = '#6a1b9a';
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(6, -4); ctx.lineTo(4, -1); ctx.lineTo(-4, -1); ctx.lineTo(-6, -4); ctx.fill();
    // Dragon eyes — glowing
    ctx.fillStyle = '#e040fb';
    ctx.shadowColor = '#e040fb'; ctx.shadowBlur = 8;
    ctx.fillRect(-5, -12, 3, 2.5); ctx.fillRect(2, -12, 3, 2.5);
    ctx.shadowBlur = 0;
    // Horns — small swept back
    ctx.fillStyle = '#311b92';
    ctx.beginPath(); ctx.moveTo(-5, -14); ctx.lineTo(-9, -22); ctx.lineTo(-3, -16); ctx.fill();
    ctx.beginPath(); ctx.moveTo(5, -14); ctx.lineTo(9, -22); ctx.lineTo(3, -16); ctx.fill();
    // Dragon wings — large
    ctx.fillStyle = 'rgba(74,20,140,0.5)';
    const wf = Math.sin(time * 0.006) * 0.2;
    ctx.save(); ctx.rotate(wf - 0.3);
    ctx.beginPath(); ctx.moveTo(-6, -2);
    ctx.lineTo(-22, -18); ctx.lineTo(-18, -8); ctx.lineTo(-26, -4);
    ctx.lineTo(-14, 4); ctx.lineTo(-6, 4); ctx.fill();
    // Wing membrane lines
    ctx.strokeStyle = 'rgba(156,39,176,0.3)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(-18, -8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-14, 4); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.rotate(-wf + 0.3);
    ctx.beginPath(); ctx.moveTo(6, -2);
    ctx.lineTo(22, -18); ctx.lineTo(18, -8); ctx.lineTo(26, -4);
    ctx.lineTo(14, 4); ctx.lineTo(6, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(156,39,176,0.3)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(18, -8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(14, 4); ctx.stroke();
    ctx.restore();
    // Claws (aimed direction)
    ctx.save(); ctx.rotate(p.facingAngle);
    ctx.fillStyle = p.attackAnim > 0 ? '#e040fb' : '#9c27b0';
    ctx.shadowColor = '#e040fb'; ctx.shadowBlur = p.attackAnim > 0 ? 10 : 0;
    const ext = p.attackAnim > 0 ? 6 : 0;
    // Three dragon claws
    ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(16 + ext, -7); ctx.lineTo(14 + ext, -3); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(18 + ext, 0); ctx.lineTo(15 + ext, 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(16 + ext, 7); ctx.lineTo(14 + ext, 3); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    // Tail
    ctx.strokeStyle = '#4a148c'; ctx.lineWidth = 3;
    const tailW = Math.sin(time * 0.005);
    ctx.beginPath(); ctx.moveTo(0, 14);
    ctx.quadraticCurveTo(10 + tailW * 5, 22, 6 + tailW * 4, 30);
    ctx.stroke();
    // Tail tip (spade shape)
    ctx.fillStyle = '#6a1b9a';
    const tx = 6 + tailW * 4, ty = 30;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx - 4, ty + 5); ctx.lineTo(tx, ty + 3); ctx.lineTo(tx + 4, ty + 5); ctx.fill();
    // Legs
    ctx.fillStyle = '#311b92';
    ctx.fillRect(-5, 14, 4, 7); ctx.fillRect(2, 14, 4, 7);
    // Player indicator
    ctx.fillStyle = p.playerIndex === 0 ? '#fff' : '#4a9eff';
    ctx.beginPath(); ctx.arc(0, -24, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawHealer(ctx, p, time) {
    ctx.save(); ctx.translate(p.x, p.y);
    // Gentle green aura
    ctx.globalAlpha = 0.1 + Math.sin(time * 0.004) * 0.05;
    const ag = ctx.createRadialGradient(0, -2, 0, 0, -2, 25);
    ag.addColorStop(0, '#66bb6a'); ag.addColorStop(1, 'rgba(67,160,71,0)');
    ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(0, -2, 25, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // Head
    ctx.fillStyle = p.attackAnim > 0 ? '#81c784' : '#bba088';
    ctx.beginPath(); ctx.arc(0, -8, 7, 0, Math.PI * 2); ctx.fill();
    // White/green healer robe
    ctx.fillStyle = '#e8f5e9';
    ctx.beginPath(); ctx.moveTo(-7, -1); ctx.lineTo(7, -1); ctx.lineTo(9, 17); ctx.lineTo(-9, 17); ctx.fill();
    // Green trim
    ctx.fillStyle = '#43a047';
    ctx.fillRect(-9, 14, 18, 3);
    ctx.fillRect(-7, 4, 14, 2);
    // Cross emblem on chest
    ctx.fillStyle = '#43a047';
    ctx.fillRect(-1.5, -1, 3, 8);
    ctx.fillRect(-4, 1, 8, 3);
    // Circlet
    ctx.strokeStyle = '#66bb6a'; ctx.lineWidth = 1.5;
    ctx.shadowColor = '#66bb6a'; ctx.shadowBlur = 4;
    ctx.beginPath(); ctx.arc(0, -10, 8, Math.PI + 0.3, -0.3); ctx.stroke();
    ctx.shadowBlur = 0;
    // Staff with leaf top
    ctx.save(); ctx.rotate(p.facingAngle);
    ctx.strokeStyle = '#795548'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(20, 0); ctx.stroke();
    // Glowing leaf orb
    ctx.fillStyle = '#66bb6a';
    ctx.shadowColor = '#66bb6a'; ctx.shadowBlur = p.attackAnim > 0 ? 14 : 6;
    ctx.beginPath(); ctx.arc(22, 0, 4, 0, Math.PI * 2); ctx.fill();
    // Leaf shape
    ctx.fillStyle = '#43a047';
    ctx.beginPath(); ctx.moveTo(22, -5); ctx.quadraticCurveTo(26, -2, 22, 1); ctx.quadraticCurveTo(18, -2, 22, -5); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    // Player indicator
    ctx.fillStyle = p.playerIndex === 0 ? '#fff' : '#4a9eff';
    ctx.beginPath(); ctx.arc(0, -20, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawLightning(ctx, p, time) {
    ctx.save(); ctx.translate(p.x, p.y);
    // Electric crackling aura
    ctx.globalAlpha = 0.12 + Math.sin(time * 0.008) * 0.06;
    const ag = ctx.createRadialGradient(0, -2, 0, 0, -2, 28);
    ag.addColorStop(0, '#ffeb3b'); ag.addColorStop(1, 'rgba(255,235,59,0)');
    ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(0, -2, 28, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // Speed lines when moving
    const moving = Math.abs(p.speed) > 0;
    if (moving && Math.random() < 0.4) {
        ctx.strokeStyle = 'rgba(255,235,59,0.3)'; ctx.lineWidth = 1;
        for (let s = 0; s < 2; s++) {
            const sy = -8 + Math.random() * 20;
            ctx.beginPath(); ctx.moveTo(-12, sy); ctx.lineTo(-20 - Math.random() * 8, sy); ctx.stroke();
        }
    }
    // Head
    ctx.fillStyle = p.attackAnim > 0 ? '#fff176' : '#bba088';
    ctx.beginPath(); ctx.arc(0, -8, 7, 0, Math.PI * 2); ctx.fill();
    // Spiky electric hair
    ctx.fillStyle = '#ffeb3b';
    ctx.shadowColor = '#ffeb3b'; ctx.shadowBlur = 6;
    const hairSpike = Math.sin(time * 0.015) * 2;
    ctx.beginPath(); ctx.moveTo(-5, -12); ctx.lineTo(-3, -20 + hairSpike); ctx.lineTo(-1, -13); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-1, -13); ctx.lineTo(1, -22 - hairSpike); ctx.lineTo(3, -13); ctx.fill();
    ctx.beginPath(); ctx.moveTo(3, -13); ctx.lineTo(5, -19 + hairSpike); ctx.lineTo(6, -12); ctx.fill();
    ctx.shadowBlur = 0;
    // Fitted body suit
    ctx.fillStyle = '#1a237e';
    ctx.fillRect(-5, -1, 10, 13);
    // Lightning bolt emblem
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(-2, 5); ctx.lineTo(0, 5); ctx.lineTo(-1, 10); ctx.lineTo(2, 5); ctx.lineTo(0, 5); ctx.lineTo(1, 0); ctx.fill();
    // Electric arcs on body
    if (Math.random() < 0.3) {
        ctx.strokeStyle = '#ffeb3b'; ctx.lineWidth = 1;
        ctx.shadowColor = '#ffeb3b'; ctx.shadowBlur = 8;
        const ax = (Math.random() - 0.5) * 14, ay = -5 + Math.random() * 18;
        ctx.beginPath(); ctx.moveTo(ax, ay);
        ctx.lineTo(ax + (Math.random() - 0.5) * 12, ay + (Math.random() - 0.5) * 8);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    // Weapon — lightning bolt projectile aim
    ctx.save(); ctx.rotate(p.facingAngle);
    ctx.fillStyle = '#ffeb3b';
    ctx.shadowColor = '#ffeb3b'; ctx.shadowBlur = p.attackAnim > 0 ? 18 : 8;
    // Lightning bolt shape
    ctx.beginPath();
    ctx.moveTo(10, -3); ctx.lineTo(16, -3); ctx.lineTo(14, 0); ctx.lineTo(20 + (p.attackAnim > 0 ? 4 : 0), 0);
    ctx.lineTo(14, 3); ctx.lineTo(16, 3); ctx.lineTo(10, 0);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    // Legs
    ctx.fillStyle = '#1a237e';
    ctx.fillRect(-4, 12, 3, 7); ctx.fillRect(1, 12, 3, 7);
    // Player indicator
    ctx.fillStyle = p.playerIndex === 0 ? '#fff' : '#4a9eff';
    ctx.beginPath(); ctx.arc(0, -24, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawPortal(ctx, p, time) {
    ctx.save(); ctx.translate(p.x, p.y);
    // Swirling portal aura
    ctx.globalAlpha = 0.15 + Math.sin(time * 0.005) * 0.08;
    const ag = ctx.createRadialGradient(0, -2, 0, 0, -2, 32);
    ag.addColorStop(0, '#00bcd4'); ag.addColorStop(0.5, '#006064'); ag.addColorStop(1, 'rgba(0,188,212,0)');
    ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(0, -2, 32, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // Orbiting rift fragments
    ctx.strokeStyle = '#00bcd4'; ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00bcd4'; ctx.shadowBlur = 8;
    for (let i = 0; i < 4; i++) {
        const a = time * 0.004 + i * Math.PI / 2;
        const r = 18 + Math.sin(time * 0.006 + i) * 4;
        const ox = Math.cos(a) * r, oy = Math.sin(a) * r - 4;
        ctx.beginPath(); ctx.arc(ox, oy, 2.5, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    // Head
    ctx.fillStyle = p.attackAnim > 0 ? '#80deea' : '#bba088';
    ctx.beginPath(); ctx.arc(0, -8, 7, 0, Math.PI * 2); ctx.fill();
    // Hooded cloak
    ctx.fillStyle = '#004d40';
    ctx.beginPath(); ctx.arc(0, -8, 8, Math.PI, Math.PI * 2); ctx.fill();
    // Cloak body — teal/dark
    ctx.fillStyle = '#00695c';
    ctx.beginPath(); ctx.moveTo(-7, -1); ctx.lineTo(7, -1); ctx.lineTo(9, 17); ctx.lineTo(-9, 17); ctx.fill();
    // Rift symbol on chest
    ctx.strokeStyle = '#00bcd4'; ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00bcd4'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.ellipse(0, 5, 4, 6, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#004d40';
    ctx.beginPath(); ctx.ellipse(0, 5, 2, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Eyes — glowing cyan
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 6;
    ctx.fillRect(-4, -10, 2.5, 2); ctx.fillRect(1.5, -10, 2.5, 2);
    ctx.shadowBlur = 0;
    // Weapon — rift orb aimed
    ctx.save(); ctx.rotate(p.facingAngle);
    // Swirling rift projectile
    ctx.strokeStyle = '#00bcd4'; ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00bcd4'; ctx.shadowBlur = p.attackAnim > 0 ? 16 : 8;
    const orbR = 4 + (p.attackAnim > 0 ? 2 : 0);
    ctx.beginPath(); ctx.arc(16, 0, orbR, 0, Math.PI * 2); ctx.stroke();
    // Inner swirl
    ctx.beginPath();
    ctx.arc(16, 0, orbR * 0.5, time * 0.02, time * 0.02 + Math.PI * 1.5);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
    // Player indicator
    ctx.fillStyle = p.playerIndex === 0 ? '#fff' : '#4a9eff';
    ctx.beginPath(); ctx.arc(0, -20, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

// ─── ANIME CHARACTER DRAWING ────────────────────────────────

// ─── MORE ANIME CHARACTER DRAWING ───────────────────────────
function makeDrawFn(hair, outfit, style, extraFn) {
    return function(ctx, p, t) { drawGenericAnime(ctx, p, hair, outfit, style, extraFn); };
}

function drawGenericAnime(ctx, p, hairColor, outfitColor, hairStyle, extra) {
    ctx.save(); ctx.translate(p.x, p.y);
    // Neon outline glow
    ctx.shadowColor = outfitColor; ctx.shadowBlur = p.attackAnim > 0 ? 14 : 6;
    // Head with neon accent
    ctx.fillStyle = '#d0c0b0'; ctx.beginPath(); ctx.arc(0, -8, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = outfitColor; ctx.lineWidth = 0.6; ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.arc(0, -8, 8, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    // Hair
    ctx.fillStyle = hairColor;
    if (hairStyle === 'spiky') { for(let i=0;i<5;i++){const a=-0.8+i*0.4;ctx.beginPath();ctx.moveTo(Math.cos(a)*5,-8+Math.sin(a)*5);ctx.lineTo(Math.cos(a)*13,-8+Math.sin(a)*13-4);ctx.lineTo(Math.cos(a+0.2)*6,-8+Math.sin(a+0.2)*6);ctx.fill();} }
    else if (hairStyle === 'long') { ctx.beginPath();ctx.moveTo(-7,-10);ctx.lineTo(-6,-17);ctx.lineTo(0,-13);ctx.lineTo(6,-17);ctx.lineTo(7,-10);ctx.fill();ctx.fillRect(-7,-8,2,13);ctx.fillRect(5,-8,2,13); }
    else { ctx.beginPath();ctx.arc(0,-12,8,Math.PI+0.3,-0.3);ctx.fill(); }
    // Body with cyber trim
    ctx.fillStyle = outfitColor; ctx.fillRect(-6, -1, 12, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(-6, 5, 12, 1); // belt line
    // Neon piping on outfit
    ctx.strokeStyle = outfitColor; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.5;
    ctx.strokeRect(-6, -1, 12, 14); ctx.globalAlpha = 1;
    // Legs
    ctx.fillStyle = outfitColor; ctx.fillRect(-4, 13, 3, 7); ctx.fillRect(2, 13, 3, 7);
    ctx.shadowBlur = 0;
    if (extra) extra(ctx, p);
    // Weapon with neon glow
    ctx.save(); ctx.rotate(p.facingAngle);
    ctx.fillStyle = p.attackAnim > 0 ? '#fff' : outfitColor;
    ctx.shadowColor = outfitColor; ctx.shadowBlur = p.attackAnim > 0 ? 14 : 5;
    ctx.fillRect(8, -1.5, 12 + (p.attackAnim > 0 ? 6 : 0), 3); ctx.shadowBlur = 0; ctx.restore();
    // Player indicator (neon dot)
    ctx.fillStyle = p.playerIndex === 0 ? '#00ffcc' : '#ff0080';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(0, -20, 2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawKatakuri(ctx, p, t) { ctx.save(); ctx.translate(p.x, p.y);
    const attacking = p.attackAnim > 0;
    const haki = !!p._haki;
    const doughCol = haki ? '#b71c1c' : '#fff';        // fists/arms color
    const doughColInner = haki ? '#7f0000' : '#e0e0e0'; // inner fist
    const doughGlow = haki ? '#ff1744' : '#fff';         // glow
    const doughSpark = haki ? 'rgba(183,28,28,0.5)' : 'rgba(255,255,255,0.5)';
    const fa = p.facingAngle;
    const perpX = Math.cos(fa + Math.PI / 2);
    const perpY = Math.sin(fa + Math.PI / 2);
    const fwdX = Math.cos(fa);
    const fwdY = Math.sin(fa);
    const sideOffset = 12;
    // Haki aura around player
    if (haki) {
        ctx.globalAlpha = 0.12;
        const ag = ctx.createRadialGradient(0, 0, 0, 0, 0, 28);
        ag.addColorStop(0, '#b71c1c'); ag.addColorStop(1, 'rgba(183,28,28,0)');
        ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    }
    // Donut rings — ALWAYS white, always visible
    ctx.shadowColor = '#fff'; ctx.shadowBlur = 6;
    for (let side = -1; side <= 1; side += 2) {
        const ringX = perpX * sideOffset * side;
        const ringY = perpY * sideOffset * side;
        // Outer ring — always white
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.arc(ringX, ringY, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // Inner hole — always white
        ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(ringX, ringY, 4, 0, Math.PI * 2); ctx.stroke();
        // Idle particles
        if (!attacking) {
            ctx.fillStyle = haki ? 'rgba(183,28,28,0.3)' : 'rgba(255,255,255,0.25)';
            const ra = t * 0.004 + side * 1.5;
            ctx.beginPath(); ctx.arc(ringX + Math.cos(ra) * 9, ringY + Math.sin(ra) * 9, 1.5, 0, Math.PI * 2); ctx.fill();
        }
        // Fists burst forward — color changes with haki
        if (attacking) {
            const punchDist = 20 + p.attackAnim * 6;
            const fistX = ringX + fwdX * punchDist;
            const fistY = ringY + fwdY * punchDist;
            ctx.shadowColor = doughGlow; ctx.shadowBlur = haki ? 12 : 6;
            // Arm line
            ctx.strokeStyle = doughCol; ctx.lineWidth = 4; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(ringX, ringY); ctx.lineTo(fistX, fistY); ctx.stroke();
            // Fist
            ctx.fillStyle = doughCol;
            ctx.beginPath(); ctx.arc(fistX, fistY, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = doughColInner;
            ctx.beginPath(); ctx.arc(fistX, fistY, 2.5, 0, Math.PI * 2); ctx.fill();
            // Sparks
            ctx.fillStyle = doughSpark;
            for (let sp = 0; sp < 3; sp++) {
                const sa = t * 0.025 + sp * 2.1 + side;
                ctx.beginPath(); ctx.arc(fistX + Math.cos(sa) * 8, fistY + Math.sin(sa) * 8, 1.5, 0, Math.PI * 2); ctx.fill();
            }
        }
    }
    ctx.shadowBlur = 0;
    // Store ring positions + haki state for fusillade rendering
    p._ringLeft = { x: p.x + perpX * sideOffset * -1, y: p.y + perpY * sideOffset * -1 };
    p._ringRight = { x: p.x + perpX * sideOffset * 1, y: p.y + perpY * sideOffset * 1 };
    // Scarf
    ctx.fillStyle = '#e8b0a0'; ctx.globalAlpha = 0.6;
    const scarfWave = Math.sin(t * 0.005) * 4;
    ctx.fillRect(-8, -2, 16, 3);
    ctx.fillRect(-10 + scarfWave, 0, 4, 12);
    ctx.globalAlpha = 1;
    // Body — large, dark vest
    ctx.fillStyle = '#2e1a1a'; ctx.fillRect(-7, -1, 14, 15);
    // Head
    ctx.fillStyle = '#e8d0b0'; ctx.beginPath(); ctx.arc(0, -8, 7, 0, Math.PI * 2); ctx.fill();
    // Dark spiky hair
    ctx.fillStyle = '#1a0a0a';
    for (let i = 0; i < 5; i++) { const a = -0.8 + i * 0.4;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 5, -8 + Math.sin(a) * 5);
        ctx.lineTo(Math.cos(a) * 13, -8 + Math.sin(a) * 13 - 4);
        ctx.lineTo(Math.cos(a + 0.2) * 6, -8 + Math.sin(a + 0.2) * 6); ctx.fill();
    }
    // Mouth stitch scar
    ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(4, -4); ctx.stroke();
    for (let s = -3; s <= 3; s += 2) { ctx.beginPath(); ctx.moveTo(s, -5); ctx.lineTo(s, -3); ctx.stroke(); }
    // Legs
    ctx.fillStyle = '#1a0a0a'; ctx.fillRect(-4, 13, 3, 7); ctx.fillRect(2, 13, 3, 7);
    // Player indicator
    ctx.fillStyle = p.playerIndex === 0 ? '#fff' : '#4a9eff';
    ctx.beginPath(); ctx.arc(0, -20, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore(); }

function drawNaruto(ctx, p, t) { ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = '#e8d0b0'; ctx.beginPath(); ctx.arc(0,-8,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fdd835'; for(let i=0;i<5;i++){const a=-0.8+i*0.4; ctx.beginPath(); ctx.moveTo(Math.cos(a)*5,-8+Math.sin(a)*5); ctx.lineTo(Math.cos(a)*12,-8+Math.sin(a)*12-3); ctx.lineTo(Math.cos(a+0.2)*6,-8+Math.sin(a+0.2)*6); ctx.fill();}
    ctx.fillStyle = '#ff8f00'; ctx.fillRect(-6,-1,12,14); // orange jacket
    ctx.fillStyle = '#1565c0'; ctx.fillRect(-6,0,12,3); // blue band
    ctx.strokeStyle = '#222'; ctx.lineWidth=0.8; ctx.beginPath(); ctx.moveTo(-3,-6); ctx.lineTo(-5,-6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(3,-6); ctx.lineTo(5,-6); ctx.stroke(); // whiskers
    ctx.fillStyle = '#333'; ctx.fillRect(-4,13,3,7); ctx.fillRect(2,13,3,7);
    ctx.fillStyle = '#546e7a'; ctx.fillRect(-2,-1,4,2); // headband
    ctx.fillStyle = p.playerIndex===0?'#fff':'#4a9eff'; ctx.beginPath(); ctx.arc(0,-20,2,0,Math.PI*2); ctx.fill(); ctx.restore(); }

function drawMegumi(c,p,t){drawGenericAnime(c,p,'#111','#1a237e','spiky',function(c,p){c.fillStyle='#283593';c.fillRect(-6,3,12,2);});}
function drawJinWoo(c,p,t){drawGenericAnime(c,p,'#111','#311b92','round',function(c,p){c.fillStyle='#7c4dff';c.shadowColor='#7c4dff';c.shadowBlur=5;c.beginPath();c.arc(-3,-8,1.5,0,Math.PI*2);c.fill();c.beginPath();c.arc(3,-8,1.5,0,Math.PI*2);c.fill();c.shadowBlur=0;c.globalAlpha=0.1;const g=c.createRadialGradient(0,-2,0,0,-2,25);g.addColorStop(0,'#311b92');g.addColorStop(1,'rgba(49,27,146,0)');c.fillStyle=g;c.beginPath();c.arc(0,-2,25,0,Math.PI*2);c.fill();c.globalAlpha=1;});}

function drawFrog(ctx, p, t) {
    ctx.save(); ctx.translate(p.x, p.y);
    // Body — big round green
    ctx.fillStyle = p.attackAnim > 0 ? '#66bb6a' : '#2e7d32';
    ctx.shadowColor = '#76ff03'; ctx.shadowBlur = p.attackAnim > 0 ? 10 : 4;
    ctx.beginPath(); ctx.ellipse(0, 2, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
    // Belly
    ctx.fillStyle = '#a5d6a7';
    ctx.beginPath(); ctx.ellipse(0, 4, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
    // Head — wide
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath(); ctx.ellipse(0, -8, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
    // Big bulging eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-6, -14, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, -14, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(-6, -14, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, -14, 2.5, 0, Math.PI * 2); ctx.fill();
    // Eye shine
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-7, -15, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, -15, 1, 0, Math.PI * 2); ctx.fill();
    // Wide mouth
    ctx.strokeStyle = '#1b5e20'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -5, 8, 0.2, Math.PI - 0.2); ctx.stroke();
    // Tongue hint when attacking
    if (p.attackAnim > 0) {
        ctx.save(); ctx.rotate(p.facingAngle);
        ctx.fillStyle = '#e91e63';
        ctx.fillRect(8, -1.5, 12, 3);
        ctx.fillStyle = '#ffeb3b'; ctx.shadowColor = '#ffeb3b'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(20, 0, 2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.restore();
    }
    // Front legs
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath(); ctx.ellipse(-10, 8, 4, 3, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10, 8, 4, 3, 0.3, 0, Math.PI * 2); ctx.fill();
    // Back legs (bigger)
    ctx.beginPath(); ctx.ellipse(-11, 10, 5, 4, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(11, 10, 5, 4, 0.5, 0, Math.PI * 2); ctx.fill();
    // Webbed feet
    ctx.fillStyle = '#1b5e20';
    for (let side = -1; side <= 1; side += 2) {
        for (let toe = -1; toe <= 1; toe++) {
            ctx.beginPath(); ctx.arc(side * 14 + toe * 2, 13, 1.5, 0, Math.PI * 2); ctx.fill();
        }
    }
    // Electric spots (shows power)
    ctx.fillStyle = '#ffeb3b'; ctx.globalAlpha = 0.3 + Math.sin(t * 0.008) * 0.15;
    ctx.beginPath(); ctx.arc(-4, 0, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, -2, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-2, 5, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    // Player indicator
    ctx.fillStyle = p.playerIndex === 0 ? '#00ffcc' : '#ff0080';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(0, -22, 2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawBeeSwarm(ctx, p, t) {
    ctx.save(); ctx.translate(p.x, p.y);
    const isSplit = p.activeEffects && p.activeEffects.some(e => e.effect === 'split');
    ctx.shadowColor = '#fdd835'; ctx.shadowBlur = 6;
    if (isSplit) {
        // Scattered bees
        for (let b = 0; b < 12; b++) {
            const a = t * 0.01 + b * 0.8, r = 15 + Math.sin(t * 0.02 + b) * 10;
            const bx = Math.cos(a) * r, by = Math.sin(a) * r;
            ctx.fillStyle = '#fdd835'; ctx.beginPath(); ctx.ellipse(bx, by, 2, 1.5, a, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#222'; ctx.fillRect(bx-1, by-0.5, 1, 1);
        }
    } else {
        // Clustered swarm body
        for (let b = 0; b < 8; b++) {
            const bx = Math.sin(t * 0.015 + b * 1.1) * 4, by = Math.cos(t * 0.012 + b * 0.9) * 4 - 2;
            ctx.fillStyle = b % 2 === 0 ? '#fdd835' : '#f57f17';
            ctx.beginPath(); ctx.ellipse(bx, by, 3, 2, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#222'; ctx.fillRect(bx-1, by-0.5, 1, 1); // stripe
            // Wings
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            const wf = Math.sin(t * 0.08 + b) * 0.6;
            ctx.beginPath(); ctx.ellipse(bx-2, by-2, 2, 1, wf, 0, Math.PI*2); ctx.fill();
        }
        // Central mass glow
        ctx.fillStyle = 'rgba(253,216,53,0.2)';
        ctx.beginPath(); ctx.arc(0, -2, 10, 0, Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = p.playerIndex === 0 ? '#00ffcc' : '#ff0080';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(0, -18, 2, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.restore();
}

function drawTRex(ctx, p, t) {
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.shadowColor = '#5d4037'; ctx.shadowBlur = 6;
    // Massive body
    ctx.fillStyle = p.attackAnim > 0 ? '#6d4c41' : '#4e342e';
    ctx.beginPath(); ctx.ellipse(0, 2, 16, 12, 0, 0, Math.PI*2); ctx.fill();
    // Head — large jaw
    ctx.fillStyle = '#4e342e';
    ctx.beginPath(); ctx.ellipse(10, -8, 10, 8, 0.2, 0, Math.PI*2); ctx.fill();
    // Open jaw with teeth
    ctx.fillStyle = '#3e2723';
    ctx.beginPath(); ctx.moveTo(14, -4); ctx.lineTo(22, -2); ctx.lineTo(22, 2); ctx.lineTo(14, 0); ctx.fill();
    ctx.fillStyle = '#fff';
    for (let tooth = 0; tooth < 4; tooth++) {
        ctx.beginPath(); ctx.moveTo(15+tooth*2, -3); ctx.lineTo(16+tooth*2, -5); ctx.lineTo(17+tooth*2, -3); ctx.fill();
        ctx.beginPath(); ctx.moveTo(15+tooth*2, -1); ctx.lineTo(16+tooth*2, 1); ctx.lineTo(17+tooth*2, -1); ctx.fill();
    }
    // Eye
    ctx.fillStyle = '#ff6f00'; ctx.shadowColor = '#ff6f00'; ctx.shadowBlur = 4;
    ctx.beginPath(); ctx.arc(12, -11, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(12, -11, 1, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 6; ctx.shadowColor = '#5d4037';
    // Tiny arms
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(5, 0, 4, 3); ctx.fillRect(-3, 0, 4, 3);
    // Massive legs
    ctx.fillRect(-10, 12, 6, 10); ctx.fillRect(4, 12, 6, 10);
    ctx.fillStyle = '#3e2723'; ctx.fillRect(-12, 20, 8, 3); ctx.fillRect(2, 20, 8, 3);
    // Tail
    ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-14, 4); ctx.quadraticCurveTo(-24, 0, -28, 6); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = p.playerIndex === 0 ? '#00ffcc' : '#ff0080';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(0, -22, 2, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.restore();
}

function drawWendigo(ctx, p, t) {
    ctx.save(); ctx.translate(p.x, p.y);
    const sz = p._wendigoSize || 1;
    ctx.scale(sz, sz);
    ctx.shadowColor = '#b0bec5'; ctx.shadowBlur = 4;
    // Gaunt body
    ctx.fillStyle = '#78909c';
    ctx.fillRect(-5, -2, 10, 16);
    // Skeletal head with antlers
    ctx.fillStyle = '#b0bec5';
    ctx.beginPath(); ctx.arc(0, -8, 7, 0, Math.PI*2); ctx.fill();
    // Antlers
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-4, -12); ctx.lineTo(-8, -20); ctx.lineTo(-12, -18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, -20); ctx.lineTo(-6, -24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, -12); ctx.lineTo(8, -20); ctx.lineTo(12, -18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -20); ctx.lineTo(6, -24); ctx.stroke();
    // Hollow eyes
    ctx.fillStyle = '#d32f2f'; ctx.shadowColor = '#d32f2f'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(-3, -9, 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(3, -9, 2, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 4; ctx.shadowColor = '#b0bec5';
    // Jagged mouth
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(-2, -2); ctx.lineTo(0, -4); ctx.lineTo(2, -2); ctx.lineTo(4, -4); ctx.lineTo(4, -3); ctx.lineTo(-4, -3); ctx.fill();
    // Long thin arms with claws
    ctx.fillStyle = '#78909c';
    ctx.save(); ctx.rotate(p.facingAngle);
    ctx.fillRect(6, -2, 12 + (p.attackAnim > 0 ? 6 : 0), 3);
    ctx.fillStyle = '#d32f2f';
    const ext = p.attackAnim > 0 ? 6 : 0;
    ctx.beginPath(); ctx.moveTo(18+ext, -3); ctx.lineTo(22+ext, -1); ctx.lineTo(18+ext, 1); ctx.fill();
    ctx.beginPath(); ctx.moveTo(18+ext, 1); ctx.lineTo(22+ext, 3); ctx.lineTo(18+ext, 4); ctx.fill();
    ctx.restore();
    // Thin legs
    ctx.fillStyle = '#607d8b';
    ctx.fillRect(-3, 14, 2, 8); ctx.fillRect(1, 14, 2, 8);
    ctx.shadowBlur = 0;
    ctx.fillStyle = p.playerIndex === 0 ? '#00ffcc' : '#ff0080';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(0, -26, 2, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.restore();
}

function drawAlienQueen(ctx, p, t) {
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.shadowColor = '#76ff03'; ctx.shadowBlur = 6;
    // Elongated head crest
    ctx.fillStyle = '#1b5e20';
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(-6, -8); ctx.lineTo(-10, -20); ctx.lineTo(0, -14); ctx.lineTo(10, -20); ctx.lineTo(6, -8); ctx.fill();
    // Head
    ctx.beginPath(); ctx.ellipse(0, -8, 7, 6, 0, 0, Math.PI*2); ctx.fill();
    // Inner mouth
    ctx.fillStyle = '#76ff03'; ctx.shadowColor = '#76ff03'; ctx.shadowBlur = 4;
    ctx.beginPath(); ctx.ellipse(0, -5, 2, 1.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 6; ctx.shadowColor = '#76ff03';
    // Armored body
    ctx.fillStyle = '#0d3311';
    ctx.fillRect(-8, -1, 16, 16);
    // Ribbed segments
    ctx.strokeStyle = '#1b5e20'; ctx.lineWidth = 1;
    for (let r = 0; r < 4; r++) ctx.beginPath(), ctx.moveTo(-8, 1+r*4), ctx.lineTo(8, 1+r*4), ctx.stroke();
    // Tail
    ctx.strokeStyle = '#1b5e20'; ctx.lineWidth = 3;
    const tailW = Math.sin(t * 0.005);
    ctx.beginPath(); ctx.moveTo(0, 15); ctx.quadraticCurveTo(10+tailW*5, 22, 8+tailW*4, 30); ctx.stroke();
    // Tail spike
    ctx.fillStyle = '#76ff03';
    ctx.beginPath(); ctx.moveTo(8+tailW*4, 30); ctx.lineTo(6, 33); ctx.lineTo(11, 32); ctx.fill();
    // Legs
    ctx.fillStyle = '#0d3311';
    ctx.fillRect(-6, 15, 4, 7); ctx.fillRect(2, 15, 4, 7);
    // Drool
    ctx.fillStyle = '#76ff03'; ctx.globalAlpha = 0.4;
    ctx.fillRect(-1, -3, 2, 3 + Math.sin(t*0.008)*2); ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = p.playerIndex === 0 ? '#00ffcc' : '#ff0080';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(0, -22, 2, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.restore();
}

function drawComet(ctx,p,t){ctx.save();ctx.translate(p.x,p.y);
    // Fire trail behind
    ctx.fillStyle='rgba(255,111,0,0.3)';for(let i=1;i<5;i++){const a=p.facingAngle+Math.PI;ctx.beginPath();ctx.arc(Math.cos(a)*i*8,Math.sin(a)*i*8,6-i,0,Math.PI*2);ctx.fill();}
    // Body — blazing rock
    ctx.fillStyle=p.attackAnim>0?'#fff':'#ff8f00';ctx.shadowColor='#ff6f00';ctx.shadowBlur=12;
    ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ffeb3b';ctx.beginPath();ctx.arc(-1,-1,4,0,Math.PI*2);ctx.fill();
    // Flame corona
    ctx.fillStyle='rgba(255,111,0,0.5)';for(let f=0;f<6;f++){const a=t*0.02+f;ctx.beginPath();ctx.arc(Math.cos(a)*10,Math.sin(a)*10,3,0,Math.PI*2);ctx.fill();}
    ctx.shadowBlur=0;ctx.fillStyle=p.playerIndex===0?'#00ffcc':'#ff0080';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=6;ctx.beginPath();ctx.arc(0,-14,2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.restore();}

function drawTelekinesis(ctx,p,t){drawGenericAnime(ctx,p,'#7c4dff','#311b92','round',function(c,p){
    c.strokeStyle='#b388ff';c.shadowColor='#7c4dff';c.shadowBlur=8;c.lineWidth=1;
    for(let i=0;i<3;i++){const a=t*0.005+i*2;c.beginPath();c.arc(Math.cos(a)*14,Math.sin(a)*14-4,2,0,Math.PI*2);c.stroke();}c.shadowBlur=0;});}

function drawMindControl(ctx,p,t){drawGenericAnime(ctx,p,'#e040fb','#4a148c','long',function(c,p){
    c.fillStyle='#e040fb';c.shadowColor='#e040fb';c.shadowBlur=8;
    c.beginPath();c.arc(0,-12,3,0,Math.PI*2);c.fill(); // third eye
    // Psychic waves
    c.strokeStyle='rgba(224,64,251,0.3)';c.lineWidth=1;
    for(let w=0;w<3;w++){c.beginPath();c.arc(0,-8,8+w*6+Math.sin(t*0.01)*2,0,Math.PI*2);c.stroke();}c.shadowBlur=0;});}

function drawChimera(ctx,p,t){ctx.save();ctx.translate(p.x,p.y);
    const head=p._chimeraHead||0;const hCol=head===0?'#ff6f00':head===1?'#ffeb3b':'#76ff03';
    ctx.shadowColor=hCol;ctx.shadowBlur=6;
    // Body
    ctx.fillStyle='#5d4037';ctx.beginPath();ctx.ellipse(0,2,12,9,0,0,Math.PI*2);ctx.fill();
    // Main head
    ctx.fillStyle=hCol;ctx.beginPath();ctx.arc(0,-8,8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-2,-10,2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(2,-10,2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#111';ctx.beginPath();ctx.arc(-2,-10,1,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(2,-10,1,0,Math.PI*2);ctx.fill();
    // Side heads (smaller)
    const otherCols=['#ff6f00','#ffeb3b','#76ff03'].filter((_,i)=>i!==head);
    ctx.fillStyle=otherCols[0];ctx.beginPath();ctx.arc(-10,-3,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=otherCols[1];ctx.beginPath();ctx.arc(10,-3,4,0,Math.PI*2);ctx.fill();
    // Legs
    ctx.fillStyle='#4e342e';ctx.fillRect(-8,10,4,7);ctx.fillRect(4,10,4,7);
    ctx.shadowBlur=0;ctx.fillStyle=p.playerIndex===0?'#00ffcc':'#ff0080';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=6;ctx.beginPath();ctx.arc(0,-20,2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.restore();}

function drawMimic(ctx,p,t){ctx.save();ctx.translate(p.x,p.y);
    const isMimicking=p.activeEffects&&p.activeEffects.some(e=>e.effect==='mimic');
    if(isMimicking){
        // Shimmer effect — enemy form with purple outline
        ctx.fillStyle='#8d6e63';ctx.globalAlpha=0.7+Math.sin(t*0.01)*0.2;
        ctx.beginPath();ctx.arc(0,-4,10,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#e040fb';ctx.lineWidth=2;ctx.shadowColor='#e040fb';ctx.shadowBlur=8;
        ctx.beginPath();ctx.arc(0,-4,11,0,Math.PI*2);ctx.stroke();
        ctx.fillStyle='#fff';ctx.globalAlpha=1;ctx.font='7px monospace';ctx.textAlign='center';ctx.fillText(p._mimicForm||'?',0,0);
        ctx.shadowBlur=0;
    }else{
        // Chest form
        ctx.fillStyle='#6d4c41';ctx.fillRect(-8,-6,16,14);
        ctx.fillStyle='#8d6e63';ctx.fillRect(-7,-5,14,5);
        ctx.fillStyle='#fdd835';ctx.fillRect(-2,-2,4,3);
        // Hidden eye
        ctx.fillStyle='#f44336';ctx.beginPath();ctx.arc(0,-8,2,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle=p.playerIndex===0?'#00ffcc':'#ff0080';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=6;ctx.beginPath();ctx.arc(0,-16,2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.restore();}

function drawSupernova(ctx,p,t){ctx.save();ctx.translate(p.x,p.y);
    const charge=p._novaCharge?Math.min((gameTime-p._novaCharge)/10000,1):0;
    // Charging glow — grows with charge
    const glowR=8+charge*25;
    ctx.globalAlpha=0.15+charge*0.3;
    const sg=ctx.createRadialGradient(0,0,0,0,0,glowR);
    sg.addColorStop(0,'#fff');sg.addColorStop(0.3,'#fff176');sg.addColorStop(1,'rgba(255,241,118,0)');
    ctx.fillStyle=sg;ctx.beginPath();ctx.arc(0,0,glowR,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
    // Core
    ctx.fillStyle=charge>0.5?'#fff':'#fff176';ctx.shadowColor='#fff176';ctx.shadowBlur=8+charge*15;
    ctx.beginPath();ctx.arc(0,0,6+charge*4,0,Math.PI*2);ctx.fill();
    // Orbiting charge particles
    for(let i=0;i<Math.floor(charge*8);i++){const a=t*0.008+i*(Math.PI*2/8);const r=10+charge*8;
        ctx.fillStyle='#ffeb3b';ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,1.5,0,Math.PI*2);ctx.fill();}
    ctx.shadowBlur=0;ctx.fillStyle=p.playerIndex===0?'#00ffcc':'#ff0080';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=6;ctx.beginPath();ctx.arc(0,-16-charge*6,2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.restore();}

function drawPuppet(ctx,p,t){drawGenericAnime(ctx,p,'#9c27b0','#4a148c','long',function(c,p){
    // Strings from fingers
    c.strokeStyle='#ce93d8';c.lineWidth=0.5;c.shadowColor='#9c27b0';c.shadowBlur=4;
    for(let s=0;s<5;s++){const sx=-4+s*2;c.beginPath();c.moveTo(sx,2);c.lineTo(sx+(Math.sin(t*0.005+s)*6),18+Math.sin(t*0.008+s)*4);c.stroke();}
    // Cross control bar
    c.strokeStyle='#795548';c.lineWidth=2;c.beginPath();c.moveTo(-5,0);c.lineTo(5,0);c.stroke();c.shadowBlur=0;});}

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
document.getElementById('btn-online').onclick = () => showScreen('online-screen');
document.getElementById('btn-shop').onclick = () => { showScreen('shop-screen'); renderShop(); };
document.getElementById('btn-stats').onclick = () => { showScreen('stats-screen'); renderStats(); };
document.getElementById('btn-back-title').onclick = () => showScreen('title-screen');
document.getElementById('btn-back-shop').onclick = () => showScreen('title-screen');
document.getElementById('btn-back-stats').onclick = () => showScreen('title-screen');
document.getElementById('btn-back-online').onclick = () => showScreen('title-screen');
document.getElementById('btn-create-room').onclick = () => { createRoom(1); populateLobbyClassGrid(); };
document.getElementById('btn-create-room-2').onclick = () => { createRoom(2); populateLobbyClassGrid(); };
document.getElementById('btn-join-room').onclick = () => {
    const code = document.getElementById('join-code-input').value.trim();
    if (code.length === 4) { joinRoom(code, 1); setTimeout(populateLobbyClassGrid, 500); }
};
document.getElementById('btn-join-room-2').onclick = () => {
    const code = document.getElementById('join-code-input').value.trim();
    if (code.length === 4) { joinRoom(code, 2); setTimeout(populateLobbyClassGrid, 500); }
};
document.getElementById('btn-start-online').onclick = () => hostStartGame();
document.getElementById('btn-leave-lobby').onclick = () => { cleanupNetwork(); showScreen('title-screen'); };
document.getElementById('btn-retry').onclick = () => { cleanupNetwork(); gameState = 'classSelect'; showScreen('class-screen'); };
document.getElementById('btn-menu').onclick = () => { cleanupNetwork(); gameState = 'title'; showScreen('title-screen'); };
document.getElementById('btn-resume').onclick = resumeGame;
document.getElementById('btn-quit').onclick = () => { cleanupNetwork(); gameState = 'title'; showScreen('title-screen'); document.getElementById('pause-overlay').style.display = 'none'; };

document.querySelectorAll('#class-screen .class-card').forEach(card => {
    card.onclick = () => {
        document.querySelectorAll('#class-screen .class-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        setTimeout(() => selectClass(card.dataset.class), 200);
    };
});

function populateLobbyClassGrid() {
    const grid = document.getElementById('lobby-class-grid');
    grid.innerHTML = '';
    for (const [id, cls] of Object.entries(CLASSES)) {
        const card = document.createElement('div');
        card.className = 'class-card';
        card.dataset.class = id;
        card.innerHTML = `<div class="class-icon ${id}-icon"></div><h3>${cls.name}</h3><p class="class-desc">${cls.specialDesc}</p>`;
        card.onclick = () => {
            grid.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            if (NET.isHost) hostSelectClass(id);
            else clientSelectClass(id);
        };
        grid.appendChild(card);
    }
}

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
