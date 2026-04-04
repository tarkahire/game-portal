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
    gojo: {
        name: 'Gojo', maxHp: 95, speed: 3.2, attackRange: 180, attackDamage: 14, attackSpeed: 400,
        attackType: 'ranged', color: '#4fc3f7', specialCooldown: 15000,
        specialName: 'Domain Expansion', specialDesc: 'Unlimited Void — all enemies take massive damage',
        drawChar: drawGojo
    },
    sukuna: {
        name: 'Sukuna', maxHp: 130, speed: 2.8, attackRange: 35, attackDamage: 16, attackSpeed: 350,
        attackType: 'melee', color: '#8b0000', specialCooldown: 15000,
        specialName: 'Malevolent Shrine', specialDesc: 'Domain Expansion — slashing void shreds all enemies',
        drawChar: drawSukuna
    },
    // ── Jujutsu Kaisen ──
    toji: {
        name: 'Toji', maxHp: 110, speed: 3.6, attackRange: 32, attackDamage: 15, attackSpeed: 300,
        attackType: 'melee', color: '#2e7d32', specialCooldown: 3000,
        specialName: 'Inverted Spear', specialDesc: 'Lunging spear thrust that pierces defense',
        drawChar: drawToji
    },
    yuji: {
        name: 'Yuji', maxHp: 105, speed: 3.0, attackRange: 28, attackDamage: 13, attackSpeed: 320,
        attackType: 'melee', color: '#e65100', specialCooldown: 4000,
        specialName: 'Divergent Fist', specialDesc: 'Double-impact punch with delayed cursed energy',
        drawChar: drawYuji
    },
    // ── Naruto ──
    naruto: {
        name: 'Naruto', maxHp: 100, speed: 3.0, attackRange: 30, attackDamage: 11, attackSpeed: 380,
        attackType: 'melee', color: '#ff8f00', specialCooldown: 5000,
        specialName: 'Shadow Clones', specialDesc: 'Summon 2 clones that copy your attacks for 4s',
        drawChar: drawNaruto
    },
    sasuke: {
        name: 'Sasuke', maxHp: 90, speed: 3.3, attackRange: 30, attackDamage: 14, attackSpeed: 350,
        attackType: 'melee', color: '#311b92', specialCooldown: 5000,
        specialName: 'Chidori', specialDesc: 'Lightning dash that pierces through enemies',
        drawChar: drawSasuke
    },
    kakashi: {
        name: 'Kakashi', maxHp: 90, speed: 3.0, attackRange: 28, attackDamage: 12, attackSpeed: 380,
        attackType: 'melee', color: '#546e7a', specialCooldown: 6000,
        specialName: 'Lightning Blade', specialDesc: 'Concentrated lightning strike + brief copy buff',
        drawChar: drawKakashi
    },
    itachi: {
        name: 'Itachi', maxHp: 75, speed: 2.8, attackRange: 160, attackDamage: 13, attackSpeed: 500,
        attackType: 'ranged', color: '#b71c1c', specialCooldown: 7000,
        specialName: 'Tsukuyomi', specialDesc: 'Stun all enemies for 3s + Amaterasu burn',
        drawChar: drawItachi
    },
    minato: {
        name: 'Minato', maxHp: 85, speed: 4.0, attackRange: 140, attackDamage: 11, attackSpeed: 450,
        attackType: 'ranged', color: '#fdd835', specialCooldown: 3000,
        specialName: 'Flying Raijin', specialDesc: 'Teleport to a thrown kunai marker',
        drawChar: drawMinato
    },
    // ── Dragon Ball ──
    goku: {
        name: 'Goku', maxHp: 120, speed: 3.0, attackRange: 30, attackDamage: 13, attackSpeed: 350,
        attackType: 'melee', color: '#ff6f00', specialCooldown: 6000,
        specialName: 'Kamehameha', specialDesc: 'Devastating energy beam attack',
        drawChar: drawGoku
    },
    vegeta: {
        name: 'Vegeta', maxHp: 115, speed: 2.8, attackRange: 170, attackDamage: 14, attackSpeed: 450,
        attackType: 'ranged', color: '#1a237e', specialCooldown: 6000,
        specialName: 'Final Flash', specialDesc: 'Massive energy blast in a wide cone',
        drawChar: drawVegeta
    },
    // ── One Piece ──
    luffy: {
        name: 'Luffy', maxHp: 130, speed: 2.8, attackRange: 45, attackDamage: 12, attackSpeed: 300,
        attackType: 'melee', color: '#d32f2f', specialCooldown: 8000,
        specialName: 'Gear 5', specialDesc: 'Transform — +50% speed & damage for 6s',
        drawChar: drawLuffy
    },
    zoro: {
        name: 'Zoro', maxHp: 115, speed: 2.6, attackRange: 35, attackDamage: 15, attackSpeed: 350,
        attackType: 'melee', color: '#2e7d32', specialCooldown: 7000,
        specialName: 'Asura', specialDesc: 'Nine-sword form — triple damage slash AoE',
        drawChar: drawZoro
    },
    // ── Demon Slayer ──
    tanjiro: {
        name: 'Tanjiro', maxHp: 100, speed: 2.9, attackRange: 32, attackDamage: 13, attackSpeed: 370,
        attackType: 'melee', color: '#00897b', specialCooldown: 5000,
        specialName: 'Water Breathing', specialDesc: 'Flowing water slash arc hitting all nearby enemies',
        drawChar: drawTanjiro
    },
    zenitsu: {
        name: 'Zenitsu', maxHp: 65, speed: 2.0, attackRange: 25, attackDamage: 9, attackSpeed: 600,
        attackType: 'melee', color: '#f9a825', specialCooldown: 4000,
        specialName: 'Thunderclap Flash', specialDesc: 'Instant dash-strike — huge damage to first enemy hit',
        drawChar: drawZenitsu
    },
    // ── Attack on Titan ──
    levi: {
        name: 'Levi', maxHp: 80, speed: 3.8, attackRange: 28, attackDamage: 14, attackSpeed: 250,
        attackType: 'melee', color: '#37474f', specialCooldown: 4000,
        specialName: 'Spinning Slash', specialDesc: 'Rapid spin hitting all enemies nearby',
        drawChar: drawLevi
    },
    // ── My Hero Academia ──
    deku: {
        name: 'Deku', maxHp: 95, speed: 2.6, attackRange: 30, attackDamage: 12, attackSpeed: 400,
        attackType: 'melee', color: '#4caf50', specialCooldown: 5000,
        specialName: 'Detroit Smash', specialDesc: 'Massive punch shockwave + Full Cowling speed boost',
        drawChar: drawDeku
    },
    // ── Naruto (more) ──
    rocklee: { name: 'Rock Lee', maxHp: 90, speed: 3.0, attackRange: 28, attackDamage: 11, attackSpeed: 280, attackType: 'melee', color: '#2e7d32', specialCooldown: 8000, specialName: '8 Gates', specialDesc: 'Massive speed+damage boost, costs HP', drawChar: drawRockLee },
    gaara: { name: 'Gaara', maxHp: 100, speed: 2.2, attackRange: 150, attackDamage: 11, attackSpeed: 550, attackType: 'ranged', color: '#c8a05a', specialCooldown: 5000, specialName: 'Sand Coffin', specialDesc: 'Crush nearest enemy + sand shield', drawChar: drawGaara, passive: 'sandShield' },
    pain: { name: 'Pain', maxHp: 95, speed: 2.6, attackRange: 160, attackDamage: 12, attackSpeed: 500, attackType: 'ranged', color: '#e65100', specialCooldown: 6000, specialName: 'Almighty Push', specialDesc: 'Knockback all enemies + damage', drawChar: drawPain },
    madara: { name: 'Madara', maxHp: 130, speed: 2.5, attackRange: 35, attackDamage: 15, attackSpeed: 400, attackType: 'melee', color: '#d32f2f', specialCooldown: 10000, specialName: 'Susanoo', specialDesc: 'Damage shield + meteor drop AoE', drawChar: drawMadara },
    // ── JJK (more) ──
    todo: { name: 'Todo', maxHp: 115, speed: 2.8, attackRange: 30, attackDamage: 14, attackSpeed: 380, attackType: 'melee', color: '#6d4c41', specialCooldown: 3000, specialName: 'Boogie Woogie', specialDesc: 'Swap positions with nearest enemy', drawChar: drawTodo },
    megumi: { name: 'Megumi', maxHp: 85, speed: 2.7, attackRange: 140, attackDamage: 11, attackSpeed: 500, attackType: 'ranged', color: '#1a237e', specialCooldown: 5000, specialName: 'Divine Dogs', specialDesc: 'Summon 2 shadow dogs to attack', drawChar: drawMegumi },
    maki: { name: 'Maki', maxHp: 105, speed: 3.4, attackRange: 32, attackDamage: 14, attackSpeed: 300, attackType: 'melee', color: '#558b2f', specialCooldown: 3000, specialName: 'Weapon Switch', specialDesc: 'Polearm sweep hitting all nearby enemies', drawChar: drawMaki },
    kenjaku: { name: 'Kenjaku', maxHp: 90, speed: 2.5, attackRange: 170, attackDamage: 13, attackSpeed: 500, attackType: 'ranged', color: '#4e342e', specialCooldown: 7000, specialName: 'Curse Manip', specialDesc: 'Confuse enemies — they attack each other 3s', drawChar: drawKenjaku },
    // ── Dragon Ball (more) ──
    gohan: { name: 'Gohan', maxHp: 110, speed: 2.8, attackRange: 160, attackDamage: 13, attackSpeed: 450, attackType: 'ranged', color: '#e91e63', specialCooldown: 7000, specialName: 'Beast Mode', specialDesc: 'Transform — +40% damage for 5s + Masenko beam', drawChar: drawGohan },
    frieza: { name: 'Frieza', maxHp: 95, speed: 3.0, attackRange: 200, attackDamage: 14, attackSpeed: 400, attackType: 'ranged', color: '#7b1fa2', specialCooldown: 5000, specialName: 'Death Beam', specialDesc: 'Precise long-range piercing beam', drawChar: drawFrieza },
    broly: { name: 'Broly', maxHp: 150, speed: 2.0, attackRange: 35, attackDamage: 10, attackSpeed: 450, attackType: 'melee', color: '#33691e', specialCooldown: 6000, specialName: 'Berserker', specialDesc: 'Damage grows as HP drops + Eraser Cannon', drawChar: drawBroly, passive: 'berserker' },
    trunks: { name: 'Trunks', maxHp: 100, speed: 3.0, attackRange: 32, attackDamage: 13, attackSpeed: 350, attackType: 'melee', color: '#7c4dff', specialCooldown: 5000, specialName: 'Burning Attack', specialDesc: 'Sword combo + energy blast', drawChar: drawTrunks },
    // ── One Piece (more) ──
    sanji: { name: 'Sanji', maxHp: 100, speed: 3.5, attackRange: 28, attackDamage: 13, attackSpeed: 320, attackType: 'melee', color: '#ff8f00', specialCooldown: 5000, specialName: 'Diable Jambe', specialDesc: 'Fire kicks + Sky Walk speed boost', drawChar: drawSanji },
    law: { name: 'Law', maxHp: 85, speed: 2.6, attackRange: 140, attackDamage: 12, attackSpeed: 500, attackType: 'ranged', color: '#fdd835', specialCooldown: 5000, specialName: 'Room', specialDesc: 'Create ROOM — swap enemy positions + Gamma Knife', drawChar: drawLaw },
    shanks: { name: 'Shanks', maxHp: 120, speed: 2.6, attackRange: 32, attackDamage: 16, attackSpeed: 400, attackType: 'melee', color: '#b71c1c', specialCooldown: 7000, specialName: 'Conqueror Haki', specialDesc: 'Stun all enemies in range for 2.5s', drawChar: drawShanks },
    // ── Demon Slayer (more) ──
    rengoku: { name: 'Rengoku', maxHp: 110, speed: 2.8, attackRange: 32, attackDamage: 14, attackSpeed: 370, attackType: 'melee', color: '#ff6f00', specialCooldown: 5000, specialName: 'Flame Tiger', specialDesc: 'Flame Breathing slash + fire trail', drawChar: drawRengoku },
    muichiro: { name: 'Muichiro', maxHp: 75, speed: 3.2, attackRange: 30, attackDamage: 12, attackSpeed: 330, attackType: 'melee', color: '#b3e5fc', specialCooldown: 5000, specialName: 'Obscuring Clouds', specialDesc: 'Mist — enemies miss attacks for 4s', drawChar: drawMuichiro },
    akaza: { name: 'Akaza', maxHp: 120, speed: 3.0, attackRange: 30, attackDamage: 15, attackSpeed: 320, attackType: 'melee', color: '#e040fb', specialCooldown: 5000, specialName: 'Destructive Death', specialDesc: 'Compass auto-aim + crushing punch barrage', drawChar: drawAkaza },
    // ── Bleach ──
    ichigo: { name: 'Ichigo', maxHp: 105, speed: 3.0, attackRange: 35, attackDamage: 14, attackSpeed: 370, attackType: 'melee', color: '#ff6f00', specialCooldown: 6000, specialName: 'Getsuga Tensho', specialDesc: 'Slash beam + Bankai speed form', drawChar: drawIchigo },
    byakuya: { name: 'Byakuya', maxHp: 85, speed: 2.5, attackRange: 120, attackDamage: 12, attackSpeed: 450, attackType: 'ranged', color: '#f48fb1', specialCooldown: 6000, specialName: 'Senbonzakura', specialDesc: '1000 blade petals AoE shred', drawChar: drawByakuya },
    aizen: { name: 'Aizen', maxHp: 90, speed: 2.6, attackRange: 160, attackDamage: 13, attackSpeed: 480, attackType: 'ranged', color: '#6a1b9a', specialCooldown: 8000, specialName: 'Kyoka Suigetsu', specialDesc: 'Confuse enemies — they attack each other 4s', drawChar: drawAizen },
    // ── Hunter x Hunter ──
    gon: { name: 'Gon', maxHp: 100, speed: 2.8, attackRange: 28, attackDamage: 12, attackSpeed: 400, attackType: 'melee', color: '#2e7d32', specialCooldown: 4000, specialName: 'Jajanken Rock', specialDesc: 'Charged punch — massive close-range damage', drawChar: drawGon },
    killua: { name: 'Killua', maxHp: 80, speed: 3.2, attackRange: 25, attackDamage: 11, attackSpeed: 280, attackType: 'melee', color: '#42a5f5', specialCooldown: 5000, specialName: 'Godspeed', specialDesc: 'Insane speed mode + Lightning Palm stun', drawChar: drawKillua },
    hisoka: { name: 'Hisoka', maxHp: 85, speed: 2.8, attackRange: 160, attackDamage: 11, attackSpeed: 450, attackType: 'ranged', color: '#e91e63', specialCooldown: 4000, specialName: 'Bungee Gum', specialDesc: 'Pull all nearby enemies to you', drawChar: drawHisoka },
    // ── Solo Leveling ──
    jinwoo: { name: 'Jin-Woo', maxHp: 110, speed: 3.0, attackRange: 32, attackDamage: 14, attackSpeed: 350, attackType: 'melee', color: '#311b92', specialCooldown: 6000, specialName: 'Shadow Army', specialDesc: 'Raise 3 shadow soldiers from dead enemies', drawChar: drawJinWoo },
    // ── One Punch Man ──
    saitama: { name: 'Saitama', maxHp: 80, speed: 2.2, attackRange: 30, attackDamage: 8, attackSpeed: 500, attackType: 'melee', color: '#fdd835', specialCooldown: 20000, specialName: 'Serious Punch', specialDesc: 'One-shots everything in range. Long cooldown.', drawChar: drawSaitama },
    genos: { name: 'Genos', maxHp: 90, speed: 3.0, attackRange: 180, attackDamage: 13, attackSpeed: 400, attackType: 'ranged', color: '#ff8f00', specialCooldown: 5000, specialName: 'Incinerate', specialDesc: 'Wide fire beam + Machine Gun Blows', drawChar: drawGenos },
    // ── Tokyo Ghoul ──
    kaneki: { name: 'Kaneki', maxHp: 95, speed: 3.0, attackRange: 35, attackDamage: 13, attackSpeed: 340, attackType: 'melee', color: '#9e9e9e', specialCooldown: 6000, specialName: 'Centipede', specialDesc: 'Kagune form — +40% speed & damage for 5s', drawChar: drawKaneki },
    // ── Chainsaw Man ──
    denji: { name: 'Denji', maxHp: 110, speed: 2.8, attackRange: 35, attackDamage: 13, attackSpeed: 300, attackType: 'melee', color: '#ff5722', specialCooldown: 6000, specialName: 'Devil Form', specialDesc: 'Chainsaw transform — regen + wide slashes', drawChar: drawDenji },
    // ── Black Clover ──
    asta: { name: 'Asta', maxHp: 115, speed: 2.8, attackRange: 35, attackDamage: 14, attackSpeed: 370, attackType: 'melee', color: '#222', specialCooldown: 5000, specialName: 'Black Divider', specialDesc: 'Anti-magic slash — reflects projectiles 4s', drawChar: drawAsta }
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
    { name: 'Cursed Orb', type: 'weapon', subtype: 'cursed', damage: 13, speed: 400, range: 180, forClass: 'gojo' },
    { name: 'Six Eyes Focus', type: 'weapon', subtype: 'cursed', damage: 17, speed: 370, range: 200, forClass: 'gojo' },
    { name: 'Infinite Void', type: 'weapon', subtype: 'cursed', damage: 20, speed: 350, range: 210, forClass: 'gojo' },
    { name: 'Cursed Claw', type: 'weapon', subtype: 'claw', damage: 14, speed: 350, range: 35, forClass: 'sukuna' },
    { name: 'Dismantle Blade', type: 'weapon', subtype: 'claw', damage: 19, speed: 320, range: 38, forClass: 'sukuna' },
    { name: 'Cleave', type: 'weapon', subtype: 'claw', damage: 23, speed: 300, range: 42, forClass: 'sukuna' },
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
    { id: 'startCursed', name: 'Six Eyes Focus', desc: 'Start with a better cursed orb', cost: 50 },
    { id: 'startSukunaClaw', name: 'Dismantle Blade', desc: 'Start with a better cursed claw', cost: 50 },
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
    const offsets = [-1, 1, 0];
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
    const classWeaponMap = { angel: 'startScepter', demon: 'startClaw', draco: 'startDragonClaw', healer: 'startCane', lightning: 'startRod', portal: 'startOrb', gojo: 'startCursed', sukuna: 'startSukunaClaw' };
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
    summonedMinions = summonedMinions.filter(m => (m.type === 'shadow' || m.type === 'shadowBoss') && m.life === Infinity);
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
        case 'gojo': // Domain Expansion — Unlimited Void
            domainExpansion = {
                x: p.x, y: p.y, owner: p,
                radius: 0, maxRadius: 200,
                life: now + 4000, startTime: now,
                damage: 30, hasDamaged: false,
                phase: 'expand' // expand -> hold -> collapse
            };
            // Stun all enemies immediately
            for (const e of enemies) {
                if (e.alive) e.stunned = Math.max(e.stunned, now + 4000);
            }
            spawnParticles(p.x, p.y, '#4fc3f7', 30);
            spawnParticles(p.x, p.y, '#fff', 15);
            triggerShake(10, 20);
            break;
        case 'sukuna': // Domain Expansion — Malevolent Shrine
            domainExpansion = {
                x: p.x, y: p.y, owner: p,
                radius: 0, maxRadius: 220,
                life: now + 4500, startTime: now,
                damage: 35, hasDamaged: false,
                phase: 'expand', isSukuna: true
            };
            // Stun all enemies
            for (const e of enemies) {
                if (e.alive) e.stunned = Math.max(e.stunned, now + 4500);
            }
            spawnParticles(p.x, p.y, '#8b0000', 30);
            spawnParticles(p.x, p.y, '#ff4444', 15);
            triggerShake(12, 24);
            break;
        case 'toji': // Inverted Spear — lunging pierce
            { const spearLen = 60, dmg = Math.round(p.damage * 2);
            for (const e of enemies) { if (!e.alive) continue;
                const dx = e.x - p.x, dy = e.y - p.y, dist = Math.hypot(dx, dy);
                const along = dx * Math.cos(p.facingAngle) + dy * Math.sin(p.facingAngle);
                const perp = Math.abs(-dx * Math.sin(p.facingAngle) + dy * Math.cos(p.facingAngle));
                if (along > 0 && along < spearLen && perp < 15) dealDamageToEnemy(e, dmg, p);
            }
            activeBeams.push({ x: p.x, y: p.y, angle: p.facingAngle, length: spearLen, width: 6, life: 10, maxLife: 10, color: '#2e7d32' });
            spawnParticles(p.x + Math.cos(p.facingAngle) * 30, p.y + Math.sin(p.facingAngle) * 30, '#4caf50', 10);
            triggerShake(4, 8); } break;
        case 'yuji': // Divergent Fist — double impact
            { const range = 40, dmg1 = Math.round(p.damage * 1.2);
            for (const e of enemies) { if (!e.alive) continue;
                if (Math.hypot(e.x - p.x, e.y - p.y) < range) {
                    dealDamageToEnemy(e, dmg1, p);
                    setTimeout(() => { if (e.alive) { dealDamageToEnemy(e, Math.round(dmg1 * 0.8), p); spawnParticles(e.x, e.y, '#ff6f00', 6); } }, 200);
                }
            }
            spawnParticles(p.x + Math.cos(p.facingAngle) * 20, p.y + Math.sin(p.facingAngle) * 20, '#e65100', 10);
            triggerShake(5, 10); } break;
        case 'naruto': // Shadow Clones — 8 clones
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                summonedMinions.push({ x: p.x + Math.cos(angle) * 25, y: p.y + Math.sin(angle) * 25, owner: p,
                    hp: 10, maxHp: 10, damage: Math.round(p.damage * 0.6), speed: p.speed, radius: 7, attackRange: 22,
                    lastAttack: 0, attackSpeed: 400, life: now + 6000, color: '#ff8f00', type: 'clone' });
            }
            spawnParticles(p.x, p.y, '#ff8f00', 12); triggerShake(3, 5); break;
        case 'sasuke': // Chidori — lightning dash
            { p.dodging = true; p.dodgeDir = { x: Math.cos(p.facingAngle), y: Math.sin(p.facingAngle) };
            p.dodgeTimer = 14; p.invincible = now + 500;
            const dmg = Math.round(p.damage * 2);
            for (const e of enemies) { if (!e.alive) continue;
                const dx = e.x - p.x, dy = e.y - p.y;
                const along = dx * Math.cos(p.facingAngle) + dy * Math.sin(p.facingAngle);
                const perp = Math.abs(-dx * Math.sin(p.facingAngle) + dy * Math.cos(p.facingAngle));
                if (along > 0 && along < 80 && perp < 20) dealDamageToEnemy(e, dmg, p);
            }
            activeBeams.push({ x: p.x, y: p.y, angle: p.facingAngle, length: 80, width: 10, life: 12, maxLife: 12, color: '#311b92' });
            spawnParticles(p.x, p.y, '#7c4dff', 16); triggerShake(6, 10); } break;
        case 'kakashi': // Lightning Blade + copy buff
            { const range = 45, dmg = Math.round(p.damage * 2.2);
            for (const e of enemies) { if (!e.alive) continue;
                if (Math.hypot(e.x - p.x, e.y - p.y) < range) { dealDamageToEnemy(e, dmg, p); }
            }
            p.activeEffects.push({ effect: 'damage', value: 1.3, endTime: now + 4000 });
            activeBeams.push({ x: p.x, y: p.y, angle: p.facingAngle, length: 45, width: 8, life: 8, maxLife: 8, color: '#546e7a' });
            spawnParticles(p.x + Math.cos(p.facingAngle) * 20, p.y + Math.sin(p.facingAngle) * 20, '#b0bec5', 12);
            triggerShake(5, 8); } break;
        case 'itachi': // Tsukuyomi + Amaterasu
            for (const e of enemies) { if (!e.alive) continue;
                const dist = Math.hypot(e.x - p.x, e.y - p.y);
                if (dist < 150) { e.stunned = Math.max(e.stunned, now + 3000); dealDamageToEnemy(e, 8, p);
                    spawnParticles(e.x, e.y, '#b71c1c', 6); }
            }
            spawnParticles(p.x, p.y, '#d50000', 16); spawnParticles(p.x, p.y, '#000', 10);
            triggerShake(4, 10); break;
        case 'minato': // Flying Raijin — throw kunai marker then teleport
            { const kx = p.x + Math.cos(p.facingAngle) * 120, ky = p.y + Math.sin(p.facingAngle) * 120;
            spawnParticles(p.x, p.y, '#fdd835', 10);
            if (isWalkable(kx, ky)) { p.x = kx; p.y = ky; }
            spawnParticles(p.x, p.y, '#fff176', 12);
            // Damage enemies at arrival
            for (const e of enemies) { if (!e.alive) continue;
                if (Math.hypot(e.x - p.x, e.y - p.y) < 40) dealDamageToEnemy(e, Math.round(p.damage * 1.5), p);
            }
            triggerShake(4, 6); } break;
        case 'goku': // Kamehameha
            { const beamLen = 280, beamW = 20;
            for (const e of enemies) { if (!e.alive) continue;
                const dx = e.x - p.x, dy = e.y - p.y;
                const along = dx * Math.cos(p.facingAngle) + dy * Math.sin(p.facingAngle);
                const perp = Math.abs(-dx * Math.sin(p.facingAngle) + dy * Math.cos(p.facingAngle));
                if (along > 0 && along < beamLen && perp < beamW) dealDamageToEnemy(e, Math.round(p.damage * 2), p);
            }
            activeBeams.push({ x: p.x, y: p.y, angle: p.facingAngle, length: beamLen, width: beamW, life: 22, maxLife: 22, color: '#4fc3f7' });
            spawnParticles(p.x, p.y, '#4fc3f7', 20); triggerShake(8, 16); } break;
        case 'vegeta': // Final Flash — wide cone
            { for (const e of enemies) { if (!e.alive) continue;
                const dx = e.x - p.x, dy = e.y - p.y, dist = Math.hypot(dx, dy);
                if (dist < 180) { const angle = Math.atan2(dy, dx);
                    let diff = angle - p.facingAngle; while (diff > Math.PI) diff -= Math.PI*2; while (diff < -Math.PI) diff += Math.PI*2;
                    if (Math.abs(diff) < 0.6) dealDamageToEnemy(e, Math.round(p.damage * 1.8), p);
                }
            }
            activeBeams.push({ x: p.x, y: p.y, angle: p.facingAngle, length: 180, width: 25, life: 18, maxLife: 18, color: '#fdd835' });
            spawnParticles(p.x, p.y, '#fdd835', 18); triggerShake(7, 14); } break;
        case 'luffy': // Gear 5 — transformation
            p.activeEffects.push({ effect: 'speed', value: 1.5, endTime: now + 6000 });
            p.activeEffects.push({ effect: 'damage', value: 1.5, endTime: now + 6000 });
            p.activeEffects.push({ effect: 'gear5', value: 1, endTime: now + 6000 });
            p.hp = Math.min(p.hp + 20, p.maxHp);
            spawnParticles(p.x, p.y, '#fff', 20); spawnParticles(p.x, p.y, '#d32f2f', 12);
            triggerShake(6, 12); break;
        case 'zoro': // Asura — nine-sword AoE
            { const range = 55, dmg = Math.round(p.damage * 2.5);
            for (const e of enemies) { if (!e.alive) continue;
                if (Math.hypot(e.x - p.x, e.y - p.y) < range) dealDamageToEnemy(e, dmg, p);
            }
            for (let s = 0; s < 9; s++) { const a = (s / 9) * Math.PI * 2;
                activeBeams.push({ x: p.x, y: p.y, angle: a, length: 55, width: 4, life: 10, maxLife: 10, color: '#2e7d32' });
            }
            spawnParticles(p.x, p.y, '#4caf50', 20); triggerShake(8, 14); } break;
        case 'tanjiro': // Water Breathing — flowing slash arc
            { const range = 50;
            for (const e of enemies) { if (!e.alive) continue;
                if (Math.hypot(e.x - p.x, e.y - p.y) < range) { dealDamageToEnemy(e, Math.round(p.damage * 1.8), p);
                    spawnParticles(e.x, e.y, '#4dd0e1', 5); }
            }
            spawnParticles(p.x, p.y, '#00bcd4', 16); spawnParticles(p.x, p.y, '#80deea', 10);
            triggerShake(5, 8); } break;
        case 'zenitsu': // Thunderclap Flash — instant dash-strike
            { let target = null, closest = Infinity;
            for (const e of enemies) { if (!e.alive) continue;
                const d = Math.hypot(e.x - p.x, e.y - p.y);
                if (d < 200 && d < closest) { closest = d; target = e; }
            }
            if (target) { spawnParticles(p.x, p.y, '#f9a825', 12);
                p.x = target.x - Math.cos(p.facingAngle) * 20; p.y = target.y - Math.sin(p.facingAngle) * 20;
                dealDamageToEnemy(target, Math.round(p.damage * 3), p);
                spawnParticles(p.x, p.y, '#fff176', 16); spawnParticles(target.x, target.y, '#ffeb3b', 10);
                p.invincible = now + 300;
            }
            triggerShake(6, 10); } break;
        case 'levi': // Spinning Slash — AoE around self
            { const range = 45, dmg = Math.round(p.damage * 1.8);
            for (const e of enemies) { if (!e.alive) continue;
                if (Math.hypot(e.x - p.x, e.y - p.y) < range) dealDamageToEnemy(e, dmg, p);
            }
            for (let s = 0; s < 6; s++) { const a = (s / 6) * Math.PI * 2;
                activeBeams.push({ x: p.x, y: p.y, angle: a, length: 45, width: 3, life: 8, maxLife: 8, color: '#78909c' });
            }
            spawnParticles(p.x, p.y, '#b0bec5', 16); triggerShake(5, 8); } break;
        case 'deku': // Detroit Smash + Full Cowling
            { const range = 60, dmg = Math.round(p.damage * 2);
            for (const e of enemies) { if (!e.alive) continue;
                const dx = e.x - p.x, dy = e.y - p.y;
                const along = dx * Math.cos(p.facingAngle) + dy * Math.sin(p.facingAngle);
                const perp = Math.abs(-dx * Math.sin(p.facingAngle) + dy * Math.cos(p.facingAngle));
                if (along > 0 && along < range && perp < 25) dealDamageToEnemy(e, dmg, p);
            }
            p.activeEffects.push({ effect: 'speed', value: 1.4, endTime: now + 4000 });
            activeBeams.push({ x: p.x, y: p.y, angle: p.facingAngle, length: 60, width: 20, life: 10, maxLife: 10, color: '#4caf50' });
            spawnParticles(p.x, p.y, '#69f0ae', 18); triggerShake(7, 12); } break;
        case 'rocklee': // 8 Gates
            p.activeEffects.push({ effect: 'speed', value: 2.0, endTime: now + 5000 });
            p.activeEffects.push({ effect: 'damage', value: 2.0, endTime: now + 5000 });
            p.hp = Math.max(1, p.hp - 15); // costs HP
            spawnParticles(p.x, p.y, '#4caf50', 20); spawnParticles(p.x, p.y, '#ff5722', 12);
            triggerShake(6, 12); break;
        case 'gaara': // Sand Coffin
            { let target = null, closest = Infinity;
            for (const e of enemies) { if (!e.alive) continue; const d = Math.hypot(e.x-p.x, e.y-p.y); if (d < 150 && d < closest) { closest = d; target = e; } }
            if (target) { dealDamageToEnemy(target, Math.round(p.damage * 2.5), p); target.stunned = Math.max(target.stunned, now + 2000);
                spawnParticles(target.x, target.y, '#c8a05a', 14); }
            p.invincible = now + 1500; // sand shield
            spawnParticles(p.x, p.y, '#d4a04a', 12); triggerShake(5, 8); } break;
        case 'pain': // Almighty Push
            { for (const e of enemies) { if (!e.alive) continue; const dist = Math.hypot(e.x-p.x, e.y-p.y);
                if (dist < 120) { dealDamageToEnemy(e, Math.round(p.damage * 1.5), p);
                    const a = Math.atan2(e.y-p.y, e.x-p.x); e.x += Math.cos(a) * 60; e.y += Math.sin(a) * 60;
                    spawnParticles(e.x, e.y, '#e65100', 5); } }
            spawnParticles(p.x, p.y, '#e65100', 20); triggerShake(8, 14); } break;
        case 'madara': // Susanoo + Meteor
            p.invincible = now + 3000; // Susanoo shield
            p.activeEffects.push({ effect: 'damage', value: 1.5, endTime: now + 5000 });
            { for (const e of enemies) { if (!e.alive) continue; const dist = Math.hypot(e.x-p.x, e.y-p.y);
                if (dist < 140) dealDamageToEnemy(e, Math.round(p.damage * 2), p); }
            spawnParticles(p.x, p.y, '#d32f2f', 24); spawnParticles(p.x, p.y, '#ff8a65', 12);
            triggerShake(10, 18); } break;
        case 'todo': // Boogie Woogie — swap with nearest enemy
            { let target = null, closest = Infinity;
            for (const e of enemies) { if (!e.alive) continue; const d = Math.hypot(e.x-p.x, e.y-p.y); if (d < 200 && d < closest) { closest = d; target = e; } }
            if (target) { spawnParticles(p.x, p.y, '#8d6e63', 10); spawnParticles(target.x, target.y, '#8d6e63', 10);
                const tx = target.x, ty = target.y; target.x = p.x; target.y = p.y; p.x = tx; p.y = ty;
                dealDamageToEnemy(target, Math.round(p.damage * 1.5), p); }
            triggerShake(4, 6); } break;
        case 'megumi': // Divine Dogs — summon 8 fiends orbiting player
            for (let i = 0; i < 8; i++) { const angle = (i / 8) * Math.PI * 2;
                summonedMinions.push({ x: p.x+Math.cos(angle)*35, y: p.y+Math.sin(angle)*35, owner: p,
                    hp: 30, maxHp: 30, damage: 8, speed: 3.5, radius: 14, attackRange: 28,
                    lastAttack: 0, attackSpeed: 400, life: now + 10000, color: '#1a237e', type: 'dog',
                    _guardIndex: i, _guardTotal: 8, _orbit: true }); }
            spawnParticles(p.x, p.y, '#283593', 16); triggerShake(4, 8); break;
        case 'maki': // Weapon sweep
            { const range = 50; for (const e of enemies) { if (!e.alive) continue;
                if (Math.hypot(e.x-p.x, e.y-p.y) < range) dealDamageToEnemy(e, Math.round(p.damage * 1.8), p); }
            for (let s = 0; s < 4; s++) activeBeams.push({ x: p.x, y: p.y, angle: p.facingAngle + (s-1.5)*0.4, length: 50, width: 4, life: 8, maxLife: 8, color: '#558b2f' });
            spawnParticles(p.x, p.y, '#7cb342', 14); triggerShake(5, 8); } break;
        case 'kenjaku': // Curse Manipulation — confuse enemies
            { for (const e of enemies) { if (!e.alive) continue; const dist = Math.hypot(e.x-p.x, e.y-p.y);
                if (dist < 130) { e.stunned = Math.max(e.stunned, now + 3000); dealDamageToEnemy(e, 5, p);
                    spawnParticles(e.x, e.y, '#5d4037', 4); } }
            spawnParticles(p.x, p.y, '#4e342e', 16); triggerShake(4, 8); } break;
        case 'gohan': // Beast Mode — damage buff + scatter Masenko (5 projectiles in fan)
            p.activeEffects.push({ effect: 'damage', value: 1.4, endTime: now + 5000 });
            for (let i = -2; i <= 2; i++) { const a = p.facingAngle + i * 0.2;
                projectiles.push({ x: p.x, y: p.y, vx: Math.cos(a)*6, vy: Math.sin(a)*6,
                    damage: Math.round(p.damage * 1.2), owner: 'player', ownerRef: p, range: 200, traveled: 0, color: '#e91e63', radius: 4 }); }
            spawnParticles(p.x, p.y, '#f48fb1', 16); triggerShake(7, 12); break;
        case 'frieza': // Death Beam — piercing snipe
            { const speed = 10;
            projectiles.push({ x: p.x, y: p.y, vx: Math.cos(p.facingAngle)*speed, vy: Math.sin(p.facingAngle)*speed,
                damage: Math.round(p.damage * 2.5), owner: 'player', ownerRef: p, range: 400, traveled: 0,
                color: '#e040fb', radius: 3, piercing: true });
            spawnParticles(p.x, p.y, '#ce93d8', 10); triggerShake(4, 6); } break;
        case 'broly': // Eraser Cannon
            { const range = 100; const hpPct = 1 - (p.hp / p.maxHp); const dmg = Math.round(p.damage * (1.5 + hpPct * 2));
            for (const e of enemies) { if (!e.alive) continue; if (Math.hypot(e.x-p.x, e.y-p.y) < range) dealDamageToEnemy(e, dmg, p); }
            spawnParticles(p.x, p.y, '#76ff03', 20); spawnParticles(p.x, p.y, '#33691e', 10);
            triggerShake(8, 14); } break;
        case 'trunks': // Burning Attack — sword combo + blast
            { const range = 45; for (const e of enemies) { if (!e.alive) continue;
                if (Math.hypot(e.x-p.x, e.y-p.y) < range) dealDamageToEnemy(e, Math.round(p.damage * 1.5), p); }
            projectiles.push({ x: p.x, y: p.y, vx: Math.cos(p.facingAngle)*7, vy: Math.sin(p.facingAngle)*7,
                damage: Math.round(p.damage * 1.5), owner: 'player', ownerRef: p, range: 200, traveled: 0, color: '#7c4dff', radius: 6 });
            spawnParticles(p.x, p.y, '#b388ff', 14); triggerShake(5, 8); } break;
        case 'sanji': // Diable Jambe — speed boost + fire kick chain (3 rapid dashes)
            p.activeEffects.push({ effect: 'speed', value: 1.5, endTime: now + 4000 });
            { const dmg = Math.round(p.damage * 1.3);
            for (let kick = 0; kick < 3; kick++) { const a = p.facingAngle + (kick - 1) * 0.5;
                for (const e of enemies) { if (!e.alive) continue;
                    const dx = e.x-p.x, dy = e.y-p.y;
                    const along = dx*Math.cos(a)+dy*Math.sin(a);
                    const perp = Math.abs(-dx*Math.sin(a)+dy*Math.cos(a));
                    if (along > 0 && along < 50 && perp < 15) dealDamageToEnemy(e, dmg, p); }
                activeBeams.push({ x: p.x, y: p.y, angle: a, length: 50, width: 6, life: 6+kick*3, maxLife: 15, color: '#ff6f00' }); }
            spawnParticles(p.x, p.y, '#ff9800', 16); triggerShake(5, 8); } break;
        case 'law': // Room + Gamma Knife
            { for (const e of enemies) { if (!e.alive) continue; const dist = Math.hypot(e.x-p.x, e.y-p.y);
                if (dist < 100) { dealDamageToEnemy(e, Math.round(p.damage * 2), p); e.stunned = Math.max(e.stunned, now + 1500);
                    spawnParticles(e.x, e.y, '#fdd835', 5); } }
            spawnParticles(p.x, p.y, '#fff176', 16); spawnParticles(p.x, p.y, '#42a5f5', 8);
            triggerShake(6, 10); } break;
        case 'shanks': // Conqueror's Haki — expanding shockwave that stuns + pushes
            { const waves = 3; for (let w = 0; w < waves; w++) { const wRange = 50 + w * 40;
                for (const e of enemies) { if (!e.alive) continue; const dist = Math.hypot(e.x-p.x, e.y-p.y);
                    if (dist < wRange && dist > wRange - 40) {
                        e.stunned = Math.max(e.stunned, now + 2000);
                        const a = Math.atan2(e.y-p.y, e.x-p.x); e.x += Math.cos(a) * 20; e.y += Math.sin(a) * 20;
                        dealDamageToEnemy(e, Math.round(p.damage * 0.5), p); } } }
            spawnParticles(p.x, p.y, '#f44336', 20); spawnParticles(p.x, p.y, '#000', 10);
            triggerShake(10, 16); } break;
        case 'rengoku': // Flame Tiger — dash forward + fire trail that burns enemies who touch it
            { p.dodging = true; p.dodgeDir = { x: Math.cos(p.facingAngle), y: Math.sin(p.facingAngle) };
            p.dodgeTimer = 12; p.invincible = now + 500;
            // Leave fire trail healing circles that damage enemies
            for (let f = 0; f < 4; f++) {
                const fx = p.x + Math.cos(p.facingAngle) * f * 20, fy = p.y + Math.sin(p.facingAngle) * f * 20;
                lightningNets.push({ x: fx, y: fy, owner: p, radius: 25, life: now + 3000, damage: 4, damageRate: 300, lastDamage: 0, color: '#ff6f00' });
                spawnParticles(fx, fy, '#ff9800', 4); }
            // Hit enemies in dash path
            for (const e of enemies) { if (!e.alive) continue; const dx = e.x-p.x, dy = e.y-p.y;
                const along = dx*Math.cos(p.facingAngle)+dy*Math.sin(p.facingAngle);
                const perp = Math.abs(-dx*Math.sin(p.facingAngle)+dy*Math.cos(p.facingAngle));
                if (along > 0 && along < 80 && perp < 20) dealDamageToEnemy(e, Math.round(p.damage * 2), p); }
            spawnParticles(p.x, p.y, '#d84315', 14); triggerShake(7, 12); } break;
        case 'muichiro': // Obscuring Clouds — create mist zone, enemies inside are slowed+miss
            healingCircles.push({ x: p.x, y: p.y, owner: p, radius: 80, life: now + 5000, healRate: 800, lastHeal: 0, color: '#b3e5fc' });
            { for (const e of enemies) { if (!e.alive) continue; const dist = Math.hypot(e.x-p.x, e.y-p.y);
                if (dist < 80) { e.stunned = Math.max(e.stunned, now + 2000); spawnParticles(e.x, e.y, '#e1f5fe', 3); } }
            spawnParticles(p.x, p.y, '#e1f5fe', 20);
            triggerShake(3, 6); } break;
        case 'akaza': // Destructive Death — auto-aim punch barrage
            { const range = 60; let hitCount = 0;
            for (const e of enemies) { if (!e.alive || hitCount >= 5) continue; const dist = Math.hypot(e.x-p.x, e.y-p.y);
                if (dist < range) { dealDamageToEnemy(e, Math.round(p.damage * 1.5), p); hitCount++;
                    spawnParticles(e.x, e.y, '#e040fb', 5); } }
            spawnParticles(p.x, p.y, '#ce93d8', 16); triggerShake(6, 10); } break;
        case 'ichigo': // Getsuga Tensho — crescent slash projectile + Bankai speed
            p.activeEffects.push({ effect: 'speed', value: 1.4, endTime: now + 5000 });
            // Fire a massive slow crescent projectile that pierces
            projectiles.push({ x: p.x, y: p.y, vx: Math.cos(p.facingAngle)*4, vy: Math.sin(p.facingAngle)*4,
                damage: Math.round(p.damage * 2.5), owner: 'player', ownerRef: p, range: 250, traveled: 0,
                color: '#ff6f00', radius: 12, piercing: true, isHollowPurple: false });
            spawnParticles(p.x, p.y, '#ffab40', 16); triggerShake(7, 12); break;
        case 'byakuya': // Senbonzakura — 8 homing petal projectiles
            for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2;
                projectiles.push({ x: p.x, y: p.y, vx: Math.cos(a)*5, vy: Math.sin(a)*5,
                    damage: Math.round(p.damage * 0.8), owner: 'player', ownerRef: p, range: 150, traveled: 0,
                    color: '#f48fb1', radius: 3 }); }
            spawnParticles(p.x, p.y, '#f8bbd0', 24);
            triggerShake(4, 8); break;
        case 'aizen': // Kyoka Suigetsu — become invisible + all enemies walk toward a decoy
            p.invincible = now + 4000; p.activeEffects.push({ effect: 'stealth', value: 1, endTime: now + 4000 });
            // Spawn a decoy that attracts enemies
            { const dx = p.x + Math.cos(p.facingAngle) * 60, dy = p.y + Math.sin(p.facingAngle) * 60;
            lootDrops.push({ x: dx, y: dy, type: 'trap', owner: p, active: true }); // decoy acts as bait
            for (const e of enemies) { if (!e.alive) continue; const dist = Math.hypot(e.x-p.x, e.y-p.y);
                if (dist < 140) { dealDamageToEnemy(e, 8, p); spawnParticles(e.x, e.y, '#9c27b0', 5); } }
            spawnParticles(p.x, p.y, '#7b1fa2', 18);
            triggerShake(5, 10); } break;
        case 'gon': // Jajanken Rock — charged punch
            { const range = 35, dmg = Math.round(p.damage * 3);
            for (const e of enemies) { if (!e.alive) continue;
                if (Math.hypot(e.x-p.x, e.y-p.y) < range) dealDamageToEnemy(e, dmg, p); }
            spawnParticles(p.x+Math.cos(p.facingAngle)*15, p.y+Math.sin(p.facingAngle)*15, '#ffab40', 16);
            spawnParticles(p.x, p.y, '#2e7d32', 8); triggerShake(7, 12); } break;
        case 'killua': // Godspeed
            p.activeEffects.push({ effect: 'speed', value: 2.0, endTime: now + 4000 });
            { for (const e of enemies) { if (!e.alive) continue; const dist = Math.hypot(e.x-p.x, e.y-p.y);
                if (dist < 60) { e.stunned = Math.max(e.stunned, now + 2000); dealDamageToEnemy(e, Math.round(p.damage * 1.3), p);
                    spawnParticles(e.x, e.y, '#42a5f5', 5); } }
            spawnParticles(p.x, p.y, '#90caf9', 18); spawnParticles(p.x, p.y, '#fff', 8);
            triggerShake(5, 8); } break;
        case 'hisoka': // Bungee Gum — pull enemies
            { for (const e of enemies) { if (!e.alive) continue; const dist = Math.hypot(e.x-p.x, e.y-p.y);
                if (dist < 120 && dist > 20) { const a = Math.atan2(p.y-e.y, p.x-e.x);
                    e.x += Math.cos(a) * 40; e.y += Math.sin(a) * 40;
                    spawnParticles(e.x, e.y, '#e91e63', 4); } }
            spawnParticles(p.x, p.y, '#f48fb1', 14); triggerShake(4, 6); } break;
        case 'jinwoo': // Shadow Army — start spawning shadows 1 at a time
            { p._shadowSpawning = true; p._lastShadowSpawn = now;
            const existing = summonedMinions.filter(m => m.type === 'shadow' && m.owner === p).length;
            damageNumbers.push({ x: p.x, y: p.y - 30, text: 'ARISE!', color: '#7c4dff', life: 50 });
            spawnParticles(p.x, p.y, '#311b92', 12); spawnParticles(p.x, p.y, '#7c4dff', 6);
            triggerShake(4, 8); } break;
        case 'saitama': // Serious Punch — one-shots everything
            { const range = 80;
            const snap = enemies.slice(); // snapshot to prevent iteration over newly spawned splits
            for (const e of snap) { if (!e.alive) continue;
                const dx = e.x-p.x, dy = e.y-p.y;
                const along = dx*Math.cos(p.facingAngle)+dy*Math.sin(p.facingAngle);
                const perp = Math.abs(-dx*Math.sin(p.facingAngle)+dy*Math.cos(p.facingAngle));
                if (along > 0 && along < range && perp < 30) dealDamageToEnemy(e, 9999, p); }
            activeBeams.push({ x: p.x, y: p.y, angle: p.facingAngle, length: range, width: 30, life: 15, maxLife: 15, color: '#fdd835' });
            spawnParticles(p.x, p.y, '#fdd835', 16); spawnParticles(p.x, p.y, '#fff', 8);
            triggerShake(12, 20); } break;
        case 'genos': // Incinerate — wide fire beam
            { const beamLen = 220, beamW = 22;
            for (const e of enemies) { if (!e.alive) continue; const dx = e.x-p.x, dy = e.y-p.y;
                const along = dx*Math.cos(p.facingAngle)+dy*Math.sin(p.facingAngle);
                const perp = Math.abs(-dx*Math.sin(p.facingAngle)+dy*Math.cos(p.facingAngle));
                if (along > 0 && along < beamLen && perp < beamW) dealDamageToEnemy(e, Math.round(p.damage * 1.8), p); }
            activeBeams.push({ x: p.x, y: p.y, angle: p.facingAngle, length: beamLen, width: beamW, life: 18, maxLife: 18, color: '#ff6f00' });
            spawnParticles(p.x, p.y, '#ff9800', 18); triggerShake(7, 14); } break;
        case 'kaneki': // Centipede — kagune form
            p.activeEffects.push({ effect: 'speed', value: 1.4, endTime: now + 5000 });
            p.activeEffects.push({ effect: 'damage', value: 1.4, endTime: now + 5000 });
            { const range = 45; for (const e of enemies) { if (!e.alive) continue;
                if (Math.hypot(e.x-p.x, e.y-p.y) < range) dealDamageToEnemy(e, Math.round(p.damage * 1.5), p); }
            spawnParticles(p.x, p.y, '#f44336', 14); spawnParticles(p.x, p.y, '#9e9e9e', 8);
            triggerShake(6, 10); } break;
        case 'denji': // Devil Form — regen + wide slashes
            p.activeEffects.push({ effect: 'damage', value: 1.5, endTime: now + 5000 });
            p.activeEffects.push({ effect: 'speed', value: 1.2, endTime: now + 5000 });
            p.hp = Math.min(p.hp + 20, p.maxHp);
            { const range = 50; for (const e of enemies) { if (!e.alive) continue;
                if (Math.hypot(e.x-p.x, e.y-p.y) < range) dealDamageToEnemy(e, Math.round(p.damage * 1.5), p); }
            spawnParticles(p.x, p.y, '#ff5722', 18); spawnParticles(p.x, p.y, '#d84315', 10);
            triggerShake(6, 12); } break;
        case 'asta': // Black Divider — anti-magic reflect
            p.activeEffects.push({ effect: 'reflect', value: 1, endTime: now + 4000 });
            { const range = 55, dmg = Math.round(p.damage * 2);
            for (const e of enemies) { if (!e.alive) continue;
                if (Math.hypot(e.x-p.x, e.y-p.y) < range) dealDamageToEnemy(e, dmg, p); }
            activeBeams.push({ x: p.x, y: p.y, angle: p.facingAngle, length: 55, width: 12, life: 10, maxLife: 10, color: '#222' });
            spawnParticles(p.x, p.y, '#111', 16); spawnParticles(p.x, p.y, '#69f0ae', 8);
            triggerShake(6, 10); } break;
    }
}

function sukunaBlackFlash(p, now) {
    if (p.classId !== 'sukuna') return;
    if (!p._blackFlashCd) p._blackFlashCd = 0;
    if (now - p._blackFlashCd < 3000) return; // 3s cooldown
    p._blackFlashCd = now;

    // Black Flash — devastating melee strike in facing direction
    const flashRange = 50;
    const flashDmg = Math.round(p.damage * 2.5);
    let hitAny = false;
    for (const e of enemies) {
        if (!e.alive) continue;
        const dx = e.x - p.x, dy = e.y - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < flashRange) {
            const angleToEnemy = Math.atan2(dy, dx);
            let angleDiff = angleToEnemy - p.facingAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            if (Math.abs(angleDiff) < Math.PI * 0.7) {
                dealDamageToEnemy(e, flashDmg, p);
                hitAny = true;
            }
        }
    }
    // Black flash visual — dark lightning burst
    const fx = p.x + Math.cos(p.facingAngle) * 25;
    const fy = p.y + Math.sin(p.facingAngle) * 25;
    spawnParticles(fx, fy, '#111', 12);
    spawnParticles(fx, fy, '#ff1744', 8);
    spawnParticles(fx, fy, '#000', 6);
    activeBeams.push({
        x: p.x, y: p.y, angle: p.facingAngle,
        length: 55, width: 12,
        life: 8, maxLife: 8, color: '#111',
        isBlackFlash: true
    });
    triggerShake(8, 12);
    p.attackAnim = 10;
}

function jinwooAriseBoss(p, now) {
    if (p.classId !== 'jinwoo') return;
    if (!p._bossBank || p._bossBank.length === 0) return;
    if (!p._ariseBossCd) p._ariseBossCd = 0;
    if (now - p._ariseBossCd < 2000) return;
    p._ariseBossCd = now;
    // Only 1 shadow boss at a time
    const existingBoss = summonedMinions.find(m => m.type === 'shadowBoss' && m.owner === p);
    if (existingBoss) return;
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

function gojoDash(p, now) {
    if (p.classId !== 'gojo') return;
    if (!p._gojoDashCd) p._gojoDashCd = 0;
    if (now - p._gojoDashCd < 1500) return; // 1.5s cooldown
    if (p.dodging) return;
    p._gojoDashCd = now;
    p.dodging = true;
    p.dodgeDir = { x: Math.cos(p.facingAngle), y: Math.sin(p.facingAngle) };
    p.dodgeTimer = 10;
    p.invincible = now + 350;
    // Blue teleport trail
    spawnParticles(p.x, p.y, '#4fc3f7', 12);
    spawnParticles(p.x, p.y, '#e1f5fe', 6);
}

// ─── R-KEY SECONDARY ABILITIES ──────────────────────────────
function animeSecondary(p, now) {
    if (!p._secondaryCd) p._secondaryCd = 0;
    switch (p.classId) {
        case 'naruto': // Rasengan
            if (now - p._secondaryCd < 3000) return; p._secondaryCd = now;
            { const range = 35, dmg = Math.round(p.damage * 2);
            for (const e of enemies) { if (!e.alive) continue;
                if (Math.hypot(e.x - p.x, e.y - p.y) < range) { dealDamageToEnemy(e, dmg, p); }
            }
            spawnParticles(p.x + Math.cos(p.facingAngle) * 15, p.y + Math.sin(p.facingAngle) * 15, '#42a5f5', 14);
            spawnParticles(p.x + Math.cos(p.facingAngle) * 15, p.y + Math.sin(p.facingAngle) * 15, '#fff', 6);
            triggerShake(5, 8); } break;
        case 'sasuke': // Amaterasu — black flame DoT
            if (now - p._secondaryCd < 5000) return; p._secondaryCd = now;
            { let target = null, closest = Infinity;
            for (const e of enemies) { if (!e.alive) continue;
                const d = Math.hypot(e.x - p.x, e.y - p.y);
                if (d < 200 && d < closest) { closest = d; target = e; } }
            if (target) { dealDamageToEnemy(target, Math.round(p.damage * 1.5), p);
                target.stunned = Math.max(target.stunned, now + 2000);
                spawnParticles(target.x, target.y, '#000', 12); spawnParticles(target.x, target.y, '#4a148c', 6); }
            triggerShake(4, 6); } break;
        case 'goku': // Instant Transmission
            if (now - p._secondaryCd < 3000) return; p._secondaryCd = now;
            { let target = null, closest = Infinity;
            for (const e of enemies) { if (!e.alive) continue;
                const d = Math.hypot(e.x - p.x, e.y - p.y);
                if (d < 250 && d < closest) { closest = d; target = e; } }
            if (target) { spawnParticles(p.x, p.y, '#4fc3f7', 10);
                p.x = target.x - Math.cos(p.facingAngle) * 25; p.y = target.y - Math.sin(p.facingAngle) * 25;
                dealDamageToEnemy(target, Math.round(p.damage * 1.5), p);
                spawnParticles(p.x, p.y, '#fff', 10); p.invincible = now + 300; }
            triggerShake(3, 5); } break;
        case 'vegeta': // Galick Gun
            if (now - p._secondaryCd < 4000) return; p._secondaryCd = now;
            { const beamLen = 200, beamW = 14;
            for (const e of enemies) { if (!e.alive) continue;
                const dx = e.x - p.x, dy = e.y - p.y;
                const along = dx * Math.cos(p.facingAngle) + dy * Math.sin(p.facingAngle);
                const perp = Math.abs(-dx * Math.sin(p.facingAngle) + dy * Math.cos(p.facingAngle));
                if (along > 0 && along < beamLen && perp < beamW) dealDamageToEnemy(e, Math.round(p.damage * 1.5), p);
            }
            activeBeams.push({ x: p.x, y: p.y, angle: p.facingAngle, length: beamLen, width: beamW, life: 16, maxLife: 16, color: '#7b1fa2' });
            spawnParticles(p.x, p.y, '#ce93d8', 14); triggerShake(6, 10); } break;
        case 'luffy': // Gum Gum Gatling — rapid punches
            if (now - p._secondaryCd < 3000) return; p._secondaryCd = now;
            { const range = 55, hits = 5;
            for (let h = 0; h < hits; h++) {
                for (const e of enemies) { if (!e.alive) continue;
                    if (Math.hypot(e.x - p.x, e.y - p.y) < range) dealDamageToEnemy(e, Math.round(p.damage * 0.5), p);
                }
            }
            spawnParticles(p.x + Math.cos(p.facingAngle) * 20, p.y + Math.sin(p.facingAngle) * 20, '#d32f2f', 16);
            triggerShake(6, 10); } break;
        case 'tanjiro': // Hinokami Kagura — flame slash
            if (now - p._secondaryCd < 5000) return; p._secondaryCd = now;
            { const beamLen = 70, beamW = 15, dmg = Math.round(p.damage * 2.2);
            for (const e of enemies) { if (!e.alive) continue;
                const dx = e.x - p.x, dy = e.y - p.y;
                const along = dx * Math.cos(p.facingAngle) + dy * Math.sin(p.facingAngle);
                const perp = Math.abs(-dx * Math.sin(p.facingAngle) + dy * Math.cos(p.facingAngle));
                if (along > 0 && along < beamLen && perp < beamW) dealDamageToEnemy(e, dmg, p);
            }
            activeBeams.push({ x: p.x, y: p.y, angle: p.facingAngle, length: beamLen, width: beamW, life: 12, maxLife: 12, color: '#ff6f00' });
            spawnParticles(p.x, p.y, '#ff9800', 14); spawnParticles(p.x, p.y, '#ff5722', 8);
            triggerShake(6, 10); } break;
        case 'saitama': // Normal Punch — quick burst (since Serious Punch has 20s CD)
            if (now - p._secondaryCd < 2000) return; p._secondaryCd = now;
            { const range = 45, dmg = Math.round(p.damage * 4);
            const snap2 = enemies.slice();
            for (const e of snap2) { if (!e.alive) continue;
                const dx = e.x-p.x, dy = e.y-p.y;
                const along = dx*Math.cos(p.facingAngle)+dy*Math.sin(p.facingAngle);
                const perp = Math.abs(-dx*Math.sin(p.facingAngle)+dy*Math.cos(p.facingAngle));
                if (along > 0 && along < range && perp < 20) dealDamageToEnemy(e, dmg, p); }
            spawnParticles(p.x+Math.cos(p.facingAngle)*20, p.y+Math.sin(p.facingAngle)*20, '#fdd835', 12);
            triggerShake(5, 8); } break;
        case 'genos': // Machine Gun Blows — rapid 8 projectiles
            if (now - p._secondaryCd < 3000) return; p._secondaryCd = now;
            for (let i = 0; i < 8; i++) { const a = p.facingAngle + (Math.random()-0.5)*0.4;
                projectiles.push({ x: p.x, y: p.y, vx: Math.cos(a)*8, vy: Math.sin(a)*8,
                    damage: Math.round(p.damage * 0.6), owner: 'player', ownerRef: p, range: 180, traveled: 0,
                    color: '#ff8f00', radius: 3 }); }
            spawnParticles(p.x, p.y, '#ff8f00', 10); triggerShake(4, 6); break;
        default: return;
    }
}

function gojoHollowPurple(p, now) {
    if (p.classId !== 'gojo') return;
    if (!p._hollowPurpleCd) p._hollowPurpleCd = 0;
    if (now - p._hollowPurpleCd < 4000) return; // 4s cooldown
    p._hollowPurpleCd = now;

    // Fire a massive slow-moving Hollow Purple orb
    const speed = 3;
    projectiles.push({
        x: p.x, y: p.y,
        vx: Math.cos(p.facingAngle) * speed,
        vy: Math.sin(p.facingAngle) * speed,
        damage: Math.round(p.damage * 3), owner: 'player', ownerRef: p,
        range: 400, traveled: 0,
        color: '#9c27b0', radius: 14,
        isHollowPurple: true, piercing: true
    });
    spawnParticles(p.x, p.y, '#ce93d8', 12);
    spawnParticles(p.x, p.y, '#e040fb', 8);
    triggerShake(5, 10);
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

        if (enraged && !(m.type === 'shadow')) {
            // ATTACK MODE (non-shadow) — chase and attack nearest enemy
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
        }
    }

    // Update domain expansion (Gojo)
    if (domainExpansion) {
        const de = domainExpansion;
        const elapsed = now - de.startTime;
        const totalDuration = de.life - de.startTime;
        // Expand phase (first 20%)
        if (elapsed < totalDuration * 0.2) {
            de.radius = de.maxRadius * (elapsed / (totalDuration * 0.2));
            de.phase = 'expand';
        }
        // Hold phase (20%-80%) — deal damage once
        else if (elapsed < totalDuration * 0.8) {
            de.radius = de.maxRadius;
            de.phase = 'hold';
            if (!de.hasDamaged) {
                de.hasDamaged = true;
                for (const e of enemies) {
                    if (!e.alive) continue;
                    dealDamageToEnemy(e, de.damage, de.owner);
                    spawnParticles(e.x, e.y, '#4fc3f7', 6);
                    spawnParticles(e.x, e.y, '#111', 8);
                }
                triggerShake(12, 20);
            }
        }
        // Collapse phase (80%-100%)
        else {
            const collapseProgress = (elapsed - totalDuration * 0.8) / (totalDuration * 0.2);
            de.radius = de.maxRadius * (1 - collapseProgress);
            de.phase = 'collapse';
        }
        if (now > de.life) domainExpansion = null;
    }

    // Update beam effects
    for (let i = activeBeams.length - 1; i >= 0; i--) {
        activeBeams[i].life--;
        if (activeBeams[i].life <= 0) activeBeams.splice(i, 1);
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
                    shadowOf: 'warrior', _guardIndex: existing, _guardTotal: 8, ranged: true });
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
        // Mouse aim (adjust for split screen viewport)
        const m = pMouse(p);
        const numV = coopMode ? players.length : 1;
        const vpW = numV > 1 ? Math.floor(canvas.width / numV) : canvas.width;
        const wx = m.x - vpW/2 + p.x;
        const wy = m.y - canvas.height/2 + p.y;
        p.facingAngle = Math.atan2(wy - p.y, wx - p.x);
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
        if (pKey(p, 'KeyR')) { portalTeleportToAlly(p, now); gojoHollowPurple(p, now); sukunaBlackFlash(p, now); animeSecondary(p, now); }
        if (pKey(p, 'KeyQ')) { gojoDash(p, now); jinwooRecall(p, now); }
        if (pKey(p, 'KeyF')) jinwooAriseBoss(p, now);
    } else {
        // Local P2: Numpad
        if (pKey(p, 'Numpad0')) playerAttack(p, now);
        if (pKey(p, 'Numpad1')) playerSpecial(p, now);
        if (pKey(p, 'Numpad2')) playerDodge(p, now);
        if (pKey(p, 'Numpad5')) { portalTeleportToAlly(p, now); gojoHollowPurple(p, now); sukunaBlackFlash(p, now); animeSecondary(p, now); }
        if (pKey(p, 'Numpad4')) { gojoDash(p, now); jinwooRecall(p, now); }
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
        ctx.fillStyle = proj.color;
        ctx.shadowColor = proj.color; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        // Trail
        ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.arc(proj.x - proj.vx * 2, proj.y - proj.vy * 2, proj.radius * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
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

    // Domain Expansion
    if (domainExpansion) {
        const de = domainExpansion;
        const alpha = de.phase === 'collapse' ? de.radius / de.maxRadius : 1;
        const t = gameTime * 0.002;

        if (de.isSukuna) {
            // ── Malevolent Shrine (Sukuna) ──
            // Blood-red void
            ctx.globalAlpha = alpha * 0.75;
            ctx.fillStyle = '#1a0000';
            ctx.beginPath(); ctx.arc(de.x, de.y, de.radius, 0, Math.PI * 2); ctx.fill();
            // Slash marks filling the domain
            ctx.strokeStyle = 'rgba(255,20,20,0.5)'; ctx.lineWidth = 1.5;
            ctx.globalAlpha = alpha * 0.6;
            for (let s = 0; s < 20; s++) {
                const sx = de.x + Math.sin(t * 1.5 + s * 1.3) * de.radius * 0.7;
                const sy = de.y + Math.cos(t * 1.1 + s * 1.7) * de.radius * 0.7;
                if (Math.hypot(sx - de.x, sy - de.y) < de.radius) {
                    const angle = t * 2 + s;
                    ctx.beginPath();
                    ctx.moveTo(sx - Math.cos(angle) * 12, sy - Math.sin(angle) * 12);
                    ctx.lineTo(sx + Math.cos(angle) * 12, sy + Math.sin(angle) * 12);
                    ctx.stroke();
                }
            }
            // Shrine pillars at edges
            ctx.fillStyle = '#4a0000'; ctx.globalAlpha = alpha * 0.7;
            for (let p = 0; p < 8; p++) {
                const a = (p / 8) * Math.PI * 2 + t * 0.5;
                const px = de.x + Math.cos(a) * de.radius * 0.85;
                const py = de.y + Math.sin(a) * de.radius * 0.85;
                ctx.fillRect(px - 3, py - 10, 6, 20);
                // Skull on top
                ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(px, py - 12, 3, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#4a0000';
            }
            // Edge ring — dark red
            ctx.globalAlpha = alpha * 0.9;
            ctx.strokeStyle = '#8b0000'; ctx.lineWidth = 4;
            ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 30;
            ctx.beginPath(); ctx.arc(de.x, de.y, de.radius, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(de.x, de.y, de.radius * (0.6 + Math.sin(t * 4) * 0.1), 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
        } else {
            // ── Unlimited Void (Gojo) ──
            ctx.globalAlpha = alpha * 0.7;
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(de.x, de.y, de.radius, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = alpha * 0.5;
            for (let s = 0; s < 30; s++) {
                const sx = de.x + Math.sin(t + s * 1.7) * de.radius * 0.8;
                const sy = de.y + Math.cos(t * 0.7 + s * 2.3) * de.radius * 0.8;
                if (Math.hypot(sx - de.x, sy - de.y) < de.radius) {
                    ctx.fillStyle = s % 3 === 0 ? '#4fc3f7' : '#e0e0e0';
                    ctx.fillRect(sx, sy, 1 + Math.sin(t * 3 + s) * 0.5, 1 + Math.sin(t * 3 + s) * 0.5);
                }
            }
            ctx.strokeStyle = 'rgba(79,195,247,0.3)'; ctx.lineWidth = 0.5;
            ctx.globalAlpha = alpha * 0.4;
            for (let g = -de.radius; g < de.radius; g += 20) {
                ctx.beginPath(); ctx.moveTo(de.x + g, de.y - de.radius); ctx.lineTo(de.x + g, de.y + de.radius); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(de.x - de.radius, de.y + g); ctx.lineTo(de.x + de.radius, de.y + g); ctx.stroke();
            }
            ctx.globalAlpha = alpha * 0.8;
            ctx.strokeStyle = '#4fc3f7'; ctx.lineWidth = 3;
            ctx.shadowColor = '#4fc3f7'; ctx.shadowBlur = 25;
            ctx.beginPath(); ctx.arc(de.x, de.y, de.radius, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#e1f5fe'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(de.x, de.y, de.radius * (0.5 + Math.sin(t * 5) * 0.1), 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
    }

    // Hollow Purple projectile glow (special rendering for Gojo's orb)
    for (const proj of projectiles) {
        if (!proj.isHollowPurple) continue;
        // Outer void aura
        ctx.globalAlpha = 0.3;
        const hpg = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, proj.radius * 3);
        hpg.addColorStop(0, '#9c27b0'); hpg.addColorStop(0.4, '#7b1fa2'); hpg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = hpg; ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.radius * 3, 0, Math.PI * 2); ctx.fill();
        // Blue/red swirl inside
        ctx.globalAlpha = 0.6;
        const swirl = gameTime * 0.01;
        ctx.fillStyle = '#e53935';
        ctx.beginPath(); ctx.arc(proj.x + Math.cos(swirl) * 4, proj.y + Math.sin(swirl) * 4, proj.radius * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#42a5f5';
        ctx.beginPath(); ctx.arc(proj.x + Math.cos(swirl + Math.PI) * 4, proj.y + Math.sin(swirl + Math.PI) * 4, proj.radius * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        // Distortion particles
        if (Math.random() < 0.5) {
            const a = Math.random() * Math.PI * 2;
            particles.push({ x: proj.x + Math.cos(a) * proj.radius * 2, y: proj.y + Math.sin(a) * proj.radius * 2,
                vx: -Math.cos(a) * 2, vy: -Math.sin(a) * 2,
                life: 8 + Math.random() * 6, maxLife: 14, color: '#ce93d8', size: 2 });
        }
    }

    // Beam effects (Draco / Black Flash)
    for (const b of activeBeams) {
        const alpha = b.life / b.maxLife;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        if (b.isBlackFlash) {
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

function drawGojo(ctx, p, time) {
    ctx.save(); ctx.translate(p.x, p.y);
    // Infinity barrier aura
    ctx.globalAlpha = 0.1 + Math.sin(time * 0.006) * 0.05;
    const ig = ctx.createRadialGradient(0, -2, 5, 0, -2, 30);
    ig.addColorStop(0, 'rgba(79,195,247,0.3)'); ig.addColorStop(0.5, 'rgba(79,195,247,0.1)'); ig.addColorStop(1, 'rgba(79,195,247,0)');
    ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(0, -2, 30, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // Hair — white spiky
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(-7, -10); ctx.lineTo(-5, -20); ctx.lineTo(-2, -12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-2, -12); ctx.lineTo(0, -22); ctx.lineTo(2, -12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(2, -12); ctx.lineTo(5, -20); ctx.lineTo(7, -10); ctx.fill();
    ctx.beginPath(); ctx.moveTo(5, -10); ctx.lineTo(8, -17); ctx.lineTo(9, -9); ctx.fill();
    // Head
    ctx.fillStyle = '#e8d5b7';
    ctx.beginPath(); ctx.arc(0, -7, 7, 0, Math.PI * 2); ctx.fill();
    // Blindfold
    ctx.fillStyle = '#111';
    ctx.fillRect(-8, -10, 16, 4);
    // Six Eyes glow (through blindfold)
    ctx.fillStyle = '#4fc3f7';
    ctx.shadowColor = '#4fc3f7'; ctx.shadowBlur = p.attackAnim > 0 ? 14 : 8;
    ctx.fillRect(-4, -9, 2.5, 2); ctx.fillRect(1.5, -9, 2.5, 2);
    ctx.shadowBlur = 0;
    // Body — dark uniform
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(-6, -1, 12, 14);
    // High collar
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.moveTo(-6, -1); ctx.lineTo(-5, -4); ctx.lineTo(-3, -1); ctx.fill();
    ctx.beginPath(); ctx.moveTo(6, -1); ctx.lineTo(5, -4); ctx.lineTo(3, -1); ctx.fill();
    // Blue highlights on uniform
    ctx.fillStyle = '#4fc3f7'; ctx.globalAlpha = 0.3;
    ctx.fillRect(-1, 1, 2, 10);
    ctx.globalAlpha = 1;
    // Hands — cursed energy aim
    ctx.save(); ctx.rotate(p.facingAngle);
    // Red and Blue orbs merging
    if (p.attackAnim > 0) {
        ctx.fillStyle = '#e53935';
        ctx.shadowColor = '#e53935'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(12, -3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#42a5f5';
        ctx.shadowColor = '#42a5f5';
        ctx.beginPath(); ctx.arc(12, 3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    } else {
        ctx.fillStyle = '#4fc3f7';
        ctx.shadowColor = '#4fc3f7'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(12, 0, 3, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }
    ctx.restore();
    // Legs
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(-4, 13, 3, 7); ctx.fillRect(2, 13, 3, 7);
    // Shoes
    ctx.fillStyle = '#111';
    ctx.fillRect(-5, 19, 4, 2); ctx.fillRect(1, 19, 4, 2);
    // Player indicator
    ctx.fillStyle = p.playerIndex === 0 ? '#fff' : '#4a9eff';
    ctx.beginPath(); ctx.arc(0, -24, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawSukuna(ctx, p, time) {
    ctx.save(); ctx.translate(p.x, p.y);
    // Malevolent aura
    ctx.globalAlpha = 0.12 + Math.sin(time * 0.005) * 0.06;
    const ag = ctx.createRadialGradient(0, -2, 0, 0, -2, 30);
    ag.addColorStop(0, '#8b0000'); ag.addColorStop(1, 'rgba(139,0,0,0)');
    ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(0, -2, 30, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // Head
    ctx.fillStyle = '#e8d0b0';
    ctx.beginPath(); ctx.arc(0, -8, 8, 0, Math.PI * 2); ctx.fill();
    // Pink/salmon hair — spiky
    ctx.fillStyle = '#d4736a';
    ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(-4, -21); ctx.lineTo(-1, -14); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-1, -14); ctx.lineTo(1, -23); ctx.lineTo(3, -14); ctx.fill();
    ctx.beginPath(); ctx.moveTo(3, -14); ctx.lineTo(6, -20); ctx.lineTo(8, -11); ctx.fill();
    // Four eyes (two pairs)
    ctx.fillStyle = '#8b0000';
    ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 4;
    ctx.fillRect(-5, -11, 2, 2); ctx.fillRect(3, -11, 2, 2); // Top eyes
    ctx.fillRect(-4, -8, 1.5, 1.5); ctx.fillRect(2.5, -8, 1.5, 1.5); // Bottom eyes
    ctx.shadowBlur = 0;
    // Curse marks on face
    ctx.strokeStyle = '#444'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-6, -5); ctx.lineTo(-3, -3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, -5); ctx.lineTo(3, -3); ctx.stroke();
    // Body — dark kimono
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.moveTo(-7, -1); ctx.lineTo(7, -1); ctx.lineTo(8, 16); ctx.lineTo(-8, 16); ctx.fill();
    // Kimono collar V
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-4, -1); ctx.lineTo(0, 5); ctx.lineTo(4, -1); ctx.stroke();
    // Curse marks on body
    ctx.strokeStyle = 'rgba(139,0,0,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-5, 3); ctx.lineTo(-2, 8); ctx.lineTo(-5, 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, 3); ctx.lineTo(2, 8); ctx.lineTo(5, 12); ctx.stroke();
    // Claw weapon (aimed direction)
    ctx.save(); ctx.rotate(p.facingAngle);
    ctx.fillStyle = p.attackAnim > 0 ? '#ff1744' : '#8b0000';
    ctx.shadowColor = '#ff0000'; ctx.shadowBlur = p.attackAnim > 0 ? 12 : 0;
    const ext = p.attackAnim > 0 ? 8 : 0;
    ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(18 + ext, -6); ctx.lineTo(15 + ext, -2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(20 + ext, 0); ctx.lineTo(16 + ext, 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(18 + ext, 6); ctx.lineTo(15 + ext, 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    // Legs
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-4, 16, 3, 6); ctx.fillRect(2, 16, 3, 6);
    // Player indicator
    ctx.fillStyle = p.playerIndex === 0 ? '#fff' : '#4a9eff';
    ctx.beginPath(); ctx.arc(0, -25, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

// ─── ANIME CHARACTER DRAWING ────────────────────────────────
function drawToji(ctx, p, t) { ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(0, -8, 7, 0, Math.PI*2); ctx.fill(); // head
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(-6,-12); ctx.lineTo(0,-15); ctx.lineTo(6,-12); ctx.lineTo(5,-8); ctx.lineTo(-5,-8); ctx.fill(); // hair
    ctx.fillStyle = '#2e7d32'; ctx.fillRect(-6,-1,12,14); // body
    ctx.fillStyle = '#1b5e20'; ctx.fillRect(-4,13,3,7); ctx.fillRect(2,13,3,7); // legs
    ctx.save(); ctx.rotate(p.facingAngle); ctx.fillStyle = '#bbb'; ctx.fillRect(8,-1,20+(p.attackAnim>0?8:0),2); // spear
    ctx.fillStyle = '#888'; ctx.beginPath(); ctx.moveTo(28+(p.attackAnim>0?8:0),-3); ctx.lineTo(32+(p.attackAnim>0?8:0),0); ctx.lineTo(28+(p.attackAnim>0?8:0),3); ctx.fill(); ctx.restore();
    ctx.fillStyle = p.playerIndex===0?'#fff':'#4a9eff'; ctx.beginPath(); ctx.arc(0,-18,2,0,Math.PI*2); ctx.fill(); ctx.restore(); }

function drawYuji(ctx, p, t) { ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = '#e8d0b0'; ctx.beginPath(); ctx.arc(0,-8,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#e65100'; ctx.beginPath(); ctx.moveTo(-5,-12); ctx.lineTo(0,-17); ctx.lineTo(5,-12); ctx.fill(); // spiky orange-pink hair
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-6,-1,12,14); // school uniform
    ctx.fillStyle = '#e65100'; ctx.fillRect(-6,2,12,2); // belt
    ctx.save(); ctx.rotate(p.facingAngle); ctx.fillStyle = p.attackAnim>0?'#ff6f00':'#e8d0b0';
    if(p.attackAnim>0){ctx.shadowColor='#ff6f00';ctx.shadowBlur=10;} ctx.beginPath(); ctx.arc(14,0,5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; ctx.restore();
    ctx.fillStyle = '#111'; ctx.fillRect(-4,13,3,7); ctx.fillRect(2,13,3,7);
    ctx.fillStyle = p.playerIndex===0?'#fff':'#4a9eff'; ctx.beginPath(); ctx.arc(0,-20,2,0,Math.PI*2); ctx.fill(); ctx.restore(); }

function drawNaruto(ctx, p, t) { ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = '#e8d0b0'; ctx.beginPath(); ctx.arc(0,-8,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fdd835'; for(let i=0;i<5;i++){const a=-0.8+i*0.4; ctx.beginPath(); ctx.moveTo(Math.cos(a)*5,-8+Math.sin(a)*5); ctx.lineTo(Math.cos(a)*12,-8+Math.sin(a)*12-3); ctx.lineTo(Math.cos(a+0.2)*6,-8+Math.sin(a+0.2)*6); ctx.fill();}
    ctx.fillStyle = '#ff8f00'; ctx.fillRect(-6,-1,12,14); // orange jacket
    ctx.fillStyle = '#1565c0'; ctx.fillRect(-6,0,12,3); // blue band
    ctx.strokeStyle = '#222'; ctx.lineWidth=0.8; ctx.beginPath(); ctx.moveTo(-3,-6); ctx.lineTo(-5,-6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(3,-6); ctx.lineTo(5,-6); ctx.stroke(); // whiskers
    ctx.fillStyle = '#333'; ctx.fillRect(-4,13,3,7); ctx.fillRect(2,13,3,7);
    ctx.fillStyle = '#546e7a'; ctx.fillRect(-2,-1,4,2); // headband
    ctx.fillStyle = p.playerIndex===0?'#fff':'#4a9eff'; ctx.beginPath(); ctx.arc(0,-20,2,0,Math.PI*2); ctx.fill(); ctx.restore(); }

function drawSasuke(ctx, p, t) { ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = '#e8d0b0'; ctx.beginPath(); ctx.arc(0,-8,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(-7,-10); ctx.lineTo(-4,-18); ctx.lineTo(0,-12); ctx.lineTo(4,-18); ctx.lineTo(7,-10); ctx.fill(); // dark spiky hair
    ctx.fillStyle = '#1a237e'; ctx.fillRect(-6,-1,12,14); // dark blue outfit
    ctx.save(); ctx.rotate(p.facingAngle); ctx.fillStyle = '#bbb'; ctx.fillRect(6,-1,14+(p.attackAnim>0?6:0),2);
    if(p.attackAnim>0){ctx.fillStyle='#7c4dff';ctx.shadowColor='#7c4dff';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(12,0,4,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;} ctx.restore();
    ctx.fillStyle = '#0d1b3e'; ctx.fillRect(-4,13,3,7); ctx.fillRect(2,13,3,7);
    ctx.fillStyle = '#d50000'; ctx.beginPath(); ctx.arc(3,-8,1.5,0,Math.PI*2); ctx.fill(); // sharingan eye
    ctx.fillStyle = p.playerIndex===0?'#fff':'#4a9eff'; ctx.beginPath(); ctx.arc(0,-20,2,0,Math.PI*2); ctx.fill(); ctx.restore(); }

function drawKakashi(ctx, p, t) { ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = '#e8d0b0'; ctx.beginPath(); ctx.arc(0,-8,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ccc'; ctx.beginPath(); ctx.moveTo(-5,-12); ctx.lineTo(-2,-20); ctx.lineTo(2,-16); ctx.lineTo(5,-19); ctx.lineTo(6,-10); ctx.fill(); // silver hair
    ctx.fillStyle = '#37474f'; ctx.fillRect(-7,-5,14,3); // mask
    ctx.fillStyle = '#455a64'; ctx.fillRect(-6,-1,12,14);
    ctx.fillStyle = '#546e7a'; ctx.fillRect(-2,-12,4,2); // headband
    ctx.fillStyle = '#d50000'; ctx.beginPath(); ctx.arc(-3,-8,1.5,0,Math.PI*2); ctx.fill(); // sharingan
    ctx.save(); ctx.rotate(p.facingAngle); if(p.attackAnim>0){ctx.fillStyle='#b0bec5';ctx.shadowColor='#90caf9';ctx.shadowBlur=10;ctx.beginPath();ctx.arc(14,0,4,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}else{ctx.fillStyle='#bbb';ctx.fillRect(8,-1,10,2);} ctx.restore();
    ctx.fillStyle = '#37474f'; ctx.fillRect(-4,13,3,7); ctx.fillRect(2,13,3,7);
    ctx.fillStyle = p.playerIndex===0?'#fff':'#4a9eff'; ctx.beginPath(); ctx.arc(0,-22,2,0,Math.PI*2); ctx.fill(); ctx.restore(); }

function drawItachi(ctx, p, t) { ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = '#e8d0b0'; ctx.beginPath(); ctx.arc(0,-8,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(-7,-8); ctx.lineTo(-6,-16); ctx.lineTo(0,-12); ctx.lineTo(6,-16); ctx.lineTo(7,-8); ctx.fill(); // long dark hair
    ctx.fillStyle = '#111'; ctx.fillRect(-7,-8,2,12); ctx.fillRect(5,-8,2,12); // hair sides
    ctx.fillStyle = '#b71c1c'; ctx.fillRect(-6,-1,12,14); // akatsuki cloak
    ctx.fillStyle = '#111'; for(let i=0;i<3;i++) ctx.fillRect(-5+i*4,2,2,8); // cloud pattern
    ctx.strokeStyle = '#b71c1c'; ctx.lineWidth=0.8; ctx.beginPath(); ctx.moveTo(-3,-6); ctx.lineTo(-5,-4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(3,-6); ctx.lineTo(5,-4); ctx.stroke(); // tear marks
    ctx.fillStyle = '#d50000'; ctx.shadowColor = '#d50000'; ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.arc(-3,-8,1.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(3,-8,1.5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; // sharingan
    ctx.fillStyle = '#111'; ctx.fillRect(-4,13,3,7); ctx.fillRect(2,13,3,7);
    ctx.fillStyle = p.playerIndex===0?'#fff':'#4a9eff'; ctx.beginPath(); ctx.arc(0,-18,2,0,Math.PI*2); ctx.fill(); ctx.restore(); }

function drawMinato(ctx, p, t) { ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = '#e8d0b0'; ctx.beginPath(); ctx.arc(0,-8,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fdd835'; for(let i=0;i<6;i++){const a=-1+i*0.4; ctx.beginPath(); ctx.moveTo(Math.cos(a)*5,-8+Math.sin(a)*5); ctx.lineTo(Math.cos(a)*11,-8+Math.sin(a)*11-2); ctx.lineTo(Math.cos(a+0.15)*6,-8+Math.sin(a+0.15)*6); ctx.fill();}
    ctx.fillStyle = '#1565c0'; ctx.fillRect(-6,-1,12,14); // blue outfit
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-8,0); ctx.lineTo(8,0); ctx.lineTo(9,16); ctx.lineTo(-9,16); ctx.fill(); // white cloak
    ctx.fillStyle = '#ff6f00'; ctx.fillRect(-9,12,18,4); // flame hem
    ctx.fillStyle = '#333'; ctx.fillRect(-2,-12,4,2); // headband
    ctx.fillStyle = '#111'; ctx.fillRect(-4,13,3,7); ctx.fillRect(2,13,3,7);
    ctx.save(); ctx.rotate(p.facingAngle); ctx.fillStyle = '#fdd835'; ctx.shadowColor='#fdd835'; ctx.shadowBlur=p.attackAnim>0?10:4;
    ctx.beginPath(); ctx.moveTo(10,-2); ctx.lineTo(18,0); ctx.lineTo(10,2); ctx.fill(); ctx.shadowBlur=0; ctx.restore(); // kunai
    ctx.fillStyle = p.playerIndex===0?'#fff':'#4a9eff'; ctx.beginPath(); ctx.arc(0,-20,2,0,Math.PI*2); ctx.fill(); ctx.restore(); }

function drawGoku(ctx, p, t) { ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = '#e8d0b0'; ctx.beginPath(); ctx.arc(0,-8,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#111'; for(let i=0;i<7;i++){const a=-1.2+i*0.35; ctx.beginPath(); ctx.moveTo(Math.cos(a)*5,-8+Math.sin(a)*5); ctx.lineTo(Math.cos(a)*14,-8+Math.sin(a)*14-4); ctx.lineTo(Math.cos(a+0.15)*6,-8+Math.sin(a+0.15)*6); ctx.fill();}
    ctx.fillStyle = '#ff6f00'; ctx.fillRect(-6,-1,12,14); // orange gi
    ctx.fillStyle = '#1565c0'; ctx.fillRect(-6,0,12,3); // blue undershirt
    ctx.fillStyle = '#1565c0'; ctx.fillRect(-2,3,4,2); // belt
    ctx.save(); ctx.rotate(p.facingAngle); if(p.attackAnim>0){ctx.fillStyle='#4fc3f7';ctx.shadowColor='#4fc3f7';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(14,0,5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}else{ctx.fillStyle='#e8d0b0';ctx.beginPath();ctx.arc(12,0,3,0,Math.PI*2);ctx.fill();} ctx.restore();
    ctx.fillStyle = '#222'; ctx.fillRect(-4,13,3,7); ctx.fillRect(2,13,3,7);
    ctx.fillStyle = p.playerIndex===0?'#fff':'#4a9eff'; ctx.beginPath(); ctx.arc(0,-24,2,0,Math.PI*2); ctx.fill(); ctx.restore(); }

function drawVegeta(ctx, p, t) { ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = '#e8d0b0'; ctx.beginPath(); ctx.arc(0,-8,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(-7,-10); ctx.lineTo(-5,-22); ctx.lineTo(-2,-14); ctx.lineTo(0,-20); ctx.lineTo(2,-14); ctx.lineTo(5,-22); ctx.lineTo(7,-10); ctx.fill(); // flame hair
    ctx.fillStyle = '#1a237e'; ctx.fillRect(-6,-1,12,14); // saiyan armor
    ctx.fillStyle = '#fff'; ctx.fillRect(-5,0,10,6); // chest plate
    ctx.fillStyle = '#fdd835'; ctx.fillRect(-5,0,10,1); // gold trim
    ctx.save(); ctx.rotate(p.facingAngle); ctx.fillStyle = p.attackAnim>0?'#fdd835':'#e8d0b0';
    if(p.attackAnim>0){ctx.shadowColor='#fdd835';ctx.shadowBlur=12;} ctx.beginPath(); ctx.arc(14,0,4,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; ctx.restore();
    ctx.fillStyle = '#0d1b3e'; ctx.fillRect(-4,13,3,7); ctx.fillRect(2,13,3,7);
    ctx.fillStyle = p.playerIndex===0?'#fff':'#4a9eff'; ctx.beginPath(); ctx.arc(0,-24,2,0,Math.PI*2); ctx.fill(); ctx.restore(); }

function drawLuffy(ctx, p, t) { ctx.save(); ctx.translate(p.x, p.y);
    const g5 = p.activeEffects && p.activeEffects.some(e => e.effect === 'gear5');
    ctx.fillStyle = g5?'#fff':'#e8d0b0'; ctx.beginPath(); ctx.arc(0,-8,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = g5?'#fff':'#111'; ctx.beginPath(); ctx.arc(0,-12,8,Math.PI+0.3,-0.3); ctx.fill(); // hair
    if(g5){ctx.globalAlpha=0.3+Math.sin(t*0.01)*0.15; const gg=ctx.createRadialGradient(0,-2,0,0,-2,30); gg.addColorStop(0,'#fff');gg.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=gg;ctx.beginPath();ctx.arc(0,-2,30,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
    ctx.fillStyle = '#d32f2f'; ctx.fillRect(-6,-1,12,14); // red vest
    ctx.fillStyle = '#1565c0'; ctx.fillRect(-5,8,10,6); // blue shorts
    ctx.fillStyle = '#fdd835'; ctx.fillRect(-2,3,4,2); // sash
    // Straw hat
    ctx.fillStyle = '#f9a825'; ctx.beginPath(); ctx.ellipse(0,-14,9,3,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#f57f17'; ctx.fillRect(-5,-17,10,4);
    ctx.fillStyle = '#d32f2f'; ctx.fillRect(-4,-16,8,1); // hat band
    ctx.save(); ctx.rotate(p.facingAngle); ctx.fillStyle = g5?'#fff':p.attackAnim>0?'#ff8a80':'#e8d0b0';
    if(p.attackAnim>0||g5){ctx.shadowColor=g5?'#fff':'#d32f2f';ctx.shadowBlur=8;} ctx.beginPath(); ctx.arc(12+(p.attackAnim>0?6:0),0,4,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; ctx.restore();
    ctx.fillStyle = '#333'; ctx.fillRect(-4,14,3,6); ctx.fillRect(2,14,3,6);
    ctx.fillStyle = p.playerIndex===0?'#fff':'#4a9eff'; ctx.beginPath(); ctx.arc(0,-20,2,0,Math.PI*2); ctx.fill(); ctx.restore(); }

function drawZoro(ctx, p, t) { ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = '#e8d0b0'; ctx.beginPath(); ctx.arc(0,-8,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.arc(0,-12,8,Math.PI+0.3,-0.3); ctx.fill(); // green hair
    ctx.fillStyle = '#1b5e20'; ctx.fillRect(-6,-1,12,14); // green robe
    ctx.fillStyle = '#d32f2f'; ctx.fillRect(-2,3,4,2); // red sash
    ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth=0.8; ctx.beginPath(); ctx.moveTo(-3,-5); ctx.lineTo(-3,-2); ctx.stroke(); // scar
    // Three swords
    ctx.save(); ctx.rotate(p.facingAngle);
    ctx.fillStyle = '#bbb'; ctx.fillRect(6,-3,14+(p.attackAnim>0?5:0),1.5); ctx.fillRect(6,0,14+(p.attackAnim>0?5:0),1.5); ctx.fillRect(6,3,14+(p.attackAnim>0?5:0),1.5);
    ctx.fillStyle = '#795548'; ctx.fillRect(4,-4,3,10); ctx.restore(); // hilt
    ctx.fillStyle = '#1b5e20'; ctx.fillRect(-4,13,3,7); ctx.fillRect(2,13,3,7);
    ctx.fillStyle = p.playerIndex===0?'#fff':'#4a9eff'; ctx.beginPath(); ctx.arc(0,-20,2,0,Math.PI*2); ctx.fill(); ctx.restore(); }

function drawTanjiro(ctx, p, t) { ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = '#e8d0b0'; ctx.beginPath(); ctx.arc(0,-8,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.arc(0,-12,8,Math.PI+0.2,-0.2); ctx.fill(); // dark red-brown hair
    ctx.fillStyle = '#8b0000'; ctx.beginPath(); ctx.arc(-4,-14,2,0,Math.PI*2); ctx.fill(); // scar/mark
    ctx.fillStyle = '#00695c'; ctx.fillRect(-6,-1,12,14); // green-black checkered haori
    ctx.fillStyle = '#004d40'; for(let i=0;i<3;i++) ctx.fillRect(-5+i*4,0,2,12); // pattern
    ctx.save(); ctx.rotate(p.facingAngle); ctx.fillStyle = '#555'; ctx.fillRect(6,-1.5,16+(p.attackAnim>0?6:0),3); // sword blade
    ctx.fillStyle = '#222'; ctx.fillRect(5,-2.5,2,5); // guard
    if(p.attackAnim>0){ctx.strokeStyle='#4dd0e1';ctx.shadowColor='#4dd0e1';ctx.shadowBlur=8;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(14,0,8,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;} ctx.restore();
    ctx.fillStyle = '#222'; ctx.fillRect(-4,13,3,7); ctx.fillRect(2,13,3,7);
    ctx.fillStyle = p.playerIndex===0?'#fff':'#4a9eff'; ctx.beginPath(); ctx.arc(0,-20,2,0,Math.PI*2); ctx.fill(); ctx.restore(); }

function drawZenitsu(ctx, p, t) { ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = '#e8d0b0'; ctx.beginPath(); ctx.arc(0,-8,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#f9a825'; for(let i=0;i<6;i++){const a=-1+i*0.35; ctx.beginPath(); ctx.moveTo(Math.cos(a)*5,-8+Math.sin(a)*5); ctx.lineTo(Math.cos(a)*12,-8+Math.sin(a)*12-3); ctx.lineTo(Math.cos(a+0.15)*6,-8+Math.sin(a+0.15)*6); ctx.fill();}
    ctx.fillStyle = '#f9a825'; ctx.fillRect(-6,-1,12,14); // yellow haori
    ctx.fillStyle = '#ff8f00'; for(let i=0;i<3;i++) ctx.fillRect(-5+i*4,1,2,10); // triangle pattern
    ctx.save(); ctx.rotate(p.facingAngle); ctx.fillStyle = '#bbb'; ctx.fillRect(6,-1,14,2);
    ctx.fillStyle = '#f9a825'; ctx.shadowColor='#f9a825'; ctx.shadowBlur=p.attackAnim>0?14:0;
    if(p.attackAnim>0) ctx.fillRect(6,-3,18,6); ctx.shadowBlur=0; ctx.restore();
    ctx.fillStyle = '#222'; ctx.fillRect(-4,13,3,7); ctx.fillRect(2,13,3,7);
    ctx.fillStyle = p.playerIndex===0?'#fff':'#4a9eff'; ctx.beginPath(); ctx.arc(0,-20,2,0,Math.PI*2); ctx.fill(); ctx.restore(); }

function drawLevi(ctx, p, t) { ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = '#e8d0b0'; ctx.beginPath(); ctx.arc(0,-8,6,0,Math.PI*2); ctx.fill(); // smaller head (short)
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(0,-11,7,Math.PI+0.3,-0.3); ctx.fill(); // dark undercut hair
    ctx.fillStyle = '#37474f'; ctx.fillRect(-5,-1,10,12); // military jacket
    ctx.fillStyle = '#795548'; for(let i=0;i<2;i++){ctx.fillRect(-6+i*10,0,2,10);} // ODM harness straps
    ctx.fillStyle = '#fff'; ctx.fillRect(-2,-1,4,2); // cravat
    // Dual blades
    ctx.save(); ctx.rotate(p.facingAngle);
    ctx.fillStyle = '#e0e0e0'; ctx.fillRect(5,-2,16+(p.attackAnim>0?6:0),1.5); ctx.fillRect(5,1,16+(p.attackAnim>0?6:0),1.5);
    ctx.fillStyle = '#795548'; ctx.fillRect(3,-3,3,7); ctx.restore();
    ctx.fillStyle = '#263238'; ctx.fillRect(-3,11,2,7); ctx.fillRect(1,11,2,7);
    ctx.fillStyle = p.playerIndex===0?'#fff':'#4a9eff'; ctx.beginPath(); ctx.arc(0,-18,2,0,Math.PI*2); ctx.fill(); ctx.restore(); }

function drawDeku(ctx, p, t) { ctx.save(); ctx.translate(p.x, p.y);
    const fc = p.activeEffects && p.activeEffects.some(e => e.effect === 'speed');
    ctx.fillStyle = '#e8d0b0'; ctx.beginPath(); ctx.arc(0,-8,7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.arc(0,-12,9,Math.PI+0.2,-0.2); ctx.fill(); // messy green hair
    if(fc){ctx.strokeStyle='#69f0ae';ctx.shadowColor='#69f0ae';ctx.shadowBlur=8;ctx.lineWidth=1;
        for(let i=0;i<4;i++){const a=t*0.008+i*Math.PI/2;ctx.beginPath();ctx.moveTo(Math.cos(a)*12,Math.sin(a)*12-2);ctx.lineTo(Math.cos(a)*18,Math.sin(a)*18-2);ctx.stroke();}ctx.shadowBlur=0;}
    ctx.fillStyle = '#4caf50'; ctx.fillRect(-6,-1,12,14); // green costume
    ctx.fillStyle = '#fff'; ctx.fillRect(-6,0,12,3); // white details
    ctx.fillStyle = '#d32f2f'; ctx.fillRect(-2,0,4,2); // red belt
    ctx.save(); ctx.rotate(p.facingAngle); ctx.fillStyle = fc?'#69f0ae':p.attackAnim>0?'#4caf50':'#e8d0b0';
    if(p.attackAnim>0||fc){ctx.shadowColor='#69f0ae';ctx.shadowBlur=10;} ctx.beginPath(); ctx.arc(14,0,5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; ctx.restore();
    ctx.fillStyle = '#2e7d32'; ctx.fillRect(-4,13,3,7); ctx.fillRect(2,13,3,7);
    ctx.fillStyle = '#d32f2f'; ctx.fillRect(-5,18,4,2); ctx.fillRect(1,18,4,2); // red shoes
    ctx.fillStyle = p.playerIndex===0?'#fff':'#4a9eff'; ctx.beginPath(); ctx.arc(0,-22,2,0,Math.PI*2); ctx.fill(); ctx.restore(); }

// ─── MORE ANIME CHARACTER DRAWING ───────────────────────────
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

function drawRockLee(c,p,t){drawGenericAnime(c,p,'#111','#2e7d32','round',function(c,p){c.fillStyle='#ff8f00';c.fillRect(-2,3,4,2);c.fillStyle='#e8d0b0';c.beginPath();c.arc(-3,-8,1.5,0,Math.PI*2);c.fill();c.beginPath();c.arc(3,-8,1.5,0,Math.PI*2);c.fill();});}
function drawGaara(c,p,t){drawGenericAnime(c,p,'#b71c1c','#c8a05a','spiky',function(c,p){c.fillStyle='#00695c';c.beginPath();c.arc(-4,-10,2,0,Math.PI*2);c.fill();c.fillStyle='#222';c.strokeStyle='#000';c.lineWidth=0.8;c.beginPath();c.arc(3,-8,1.5,0,Math.PI*2);c.stroke();});}
function drawPain(c,p,t){drawGenericAnime(c,p,'#ff6f00','#111','spiky',function(c,p){c.fillStyle='#7b1fa2';c.beginPath();c.arc(-3,-8,1.8,0,Math.PI*2);c.fill();c.beginPath();c.arc(3,-8,1.8,0,Math.PI*2);c.fill();c.fillStyle='#e65100';for(let i=0;i<4;i++){c.fillRect(-6+i*3,-4,1,1);}});}
function drawMadara(c,p,t){drawGenericAnime(c,p,'#111','#d32f2f','long',function(c,p){c.fillStyle='#d50000';c.shadowColor='#d50000';c.shadowBlur=4;c.beginPath();c.arc(3,-8,1.5,0,Math.PI*2);c.fill();c.shadowBlur=0;c.fillStyle='#555';c.fillRect(-8,0,2,10);c.fillRect(6,0,2,10);});}
function drawTodo(c,p,t){drawGenericAnime(c,p,'#6d4c41','#4e342e','round',function(c,p){c.fillStyle='#e8d0b0';c.fillRect(-7,0,14,3);});}
function drawMegumi(c,p,t){drawGenericAnime(c,p,'#111','#1a237e','spiky',function(c,p){c.fillStyle='#283593';c.fillRect(-6,3,12,2);});}
function drawMaki(c,p,t){drawGenericAnime(c,p,'#33691e','#558b2f','long',function(c,p){c.fillStyle='#fff';c.fillRect(-5,-10,10,2);});}
function drawKenjaku(c,p,t){drawGenericAnime(c,p,'#111','#4e342e','long',function(c,p){c.strokeStyle='#795548';c.lineWidth=1;c.beginPath();c.moveTo(-6,-4);c.lineTo(6,-4);c.stroke();});}
function drawGohan(c,p,t){drawGenericAnime(c,p,'#e0e0e0','#7b1fa2','spiky',function(c,p){c.fillStyle='#e91e63';c.shadowColor='#e91e63';c.shadowBlur=4;c.beginPath();c.arc(0,-8,2,0,Math.PI*2);c.fill();c.shadowBlur=0;});}
function drawFrieza(c,p,t){ctx=c;ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#e1bee7';ctx.beginPath();ctx.arc(0,-8,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#7b1fa2';ctx.beginPath();ctx.arc(0,-14,5,Math.PI+0.3,-0.3);ctx.fill();ctx.fillStyle='#e1bee7';ctx.fillRect(-5,-1,10,12);ctx.fillStyle='#7b1fa2';ctx.fillRect(-6,0,12,2);ctx.fillRect(-6,5,12,2);ctx.fillStyle='#e1bee7';ctx.fillRect(-3,11,2,7);ctx.fillRect(1,11,2,7);ctx.save();ctx.rotate(p.facingAngle);ctx.fillStyle=p.attackAnim>0?'#e040fb':'#ce93d8';if(p.attackAnim>0){ctx.shadowColor='#e040fb';ctx.shadowBlur=10;}ctx.beginPath();ctx.arc(14,0,3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.restore();ctx.fillStyle=p.playerIndex===0?'#fff':'#4a9eff';ctx.beginPath();ctx.arc(0,-20,2,0,Math.PI*2);ctx.fill();ctx.restore();}
function drawBroly(c,p,t){const hpPct=p.hp/p.maxHp;drawGenericAnime(c,p,hpPct<0.5?'#76ff03':'#111','#33691e','spiky',function(c,p){if(hpPct<0.5){c.globalAlpha=0.2;const g=c.createRadialGradient(0,-2,0,0,-2,25);g.addColorStop(0,'#76ff03');g.addColorStop(1,'rgba(118,255,3,0)');c.fillStyle=g;c.beginPath();c.arc(0,-2,25,0,Math.PI*2);c.fill();c.globalAlpha=1;}});}
function drawTrunks(c,p,t){drawGenericAnime(c,p,'#7c4dff','#1a237e','spiky',function(c,p){c.fillStyle='#455a64';c.fillRect(-7,0,14,3);});}
function drawSanji(c,p,t){drawGenericAnime(c,p,'#fdd835','#111','round',function(c,p){c.fillStyle='#fdd835';c.fillRect(-6,-8,5,4);c.fillStyle='#e65100';if(p.activeEffects&&p.activeEffects.some(e=>e.effect==='speed')){c.shadowColor='#ff6f00';c.shadowBlur=6;c.fillRect(-5,10,3,4);c.fillRect(2,10,3,4);c.shadowBlur=0;}});}
function drawLaw(c,p,t){drawGenericAnime(c,p,'#111','#fdd835','round',function(c,p){c.fillStyle='#fff';c.fillRect(-5,-12,10,3);c.fillStyle='#111';c.font='5px monospace';c.textAlign='center';c.fillText('DEATH',0,8);});}
function drawShanks(c,p,t){drawGenericAnime(c,p,'#d32f2f','#111','spiky',function(c,p){c.strokeStyle='#e8d0b0';c.lineWidth=0.8;c.beginPath();c.moveTo(-4,-6);c.lineTo(-6,-4);c.stroke();});}
function drawRengoku(c,p,t){drawGenericAnime(c,p,'#ff6f00','#111','spiky',function(c,p){c.fillStyle='#d84315';c.fillRect(-5,-12,10,3);c.fillStyle='#ff6f00';c.fillRect(-6,0,12,2);});}
function drawMuichiro(c,p,t){drawGenericAnime(c,p,'#b3e5fc','#4fc3f7','long',function(c,p){c.globalAlpha=0.15;const g=c.createRadialGradient(0,-2,0,0,-2,22);g.addColorStop(0,'#e1f5fe');g.addColorStop(1,'rgba(179,229,252,0)');c.fillStyle=g;c.beginPath();c.arc(0,-2,22,0,Math.PI*2);c.fill();c.globalAlpha=1;});}
function drawAkaza(c,p,t){drawGenericAnime(c,p,'#e040fb','#111','spiky',function(c,p){c.strokeStyle='#e040fb';c.lineWidth=0.8;for(let i=0;i<3;i++){c.beginPath();c.arc(0,4,3+i*3,0,Math.PI*2);c.stroke();}});}
function drawIchigo(c,p,t){drawGenericAnime(c,p,'#ff6f00','#111','spiky',function(c,p){c.fillStyle='#111';c.beginPath();c.moveTo(-8,0);c.lineTo(8,0);c.lineTo(9,16);c.lineTo(-9,16);c.fill();});}
function drawByakuya(c,p,t){drawGenericAnime(c,p,'#111','#fff','long',function(c,p){c.fillStyle='#f48fb1';c.globalAlpha=0.15;for(let i=0;i<6;i++){const a=t*0.003+i;c.beginPath();c.arc(Math.cos(a)*15,Math.sin(a)*15-2,2,0,Math.PI*2);c.fill();}c.globalAlpha=1;});}
function drawAizen(c,p,t){drawGenericAnime(c,p,'#4a148c','#fff','round',function(c,p){c.fillStyle='#9c27b0';c.shadowColor='#9c27b0';c.shadowBlur=4;c.beginPath();c.arc(0,-8,2,0,Math.PI*2);c.fill();c.shadowBlur=0;});}
function drawGon(c,p,t){drawGenericAnime(c,p,'#111','#2e7d32','spiky',function(c,p){c.fillStyle='#ff6f00';c.fillRect(-6,0,12,3);});}
function drawKillua(c,p,t){drawGenericAnime(c,p,'#e0e0e0','#42a5f5','spiky',function(c,p){if(p.activeEffects&&p.activeEffects.some(e=>e.effect==='speed')){c.strokeStyle='#42a5f5';c.shadowColor='#42a5f5';c.shadowBlur=6;c.lineWidth=1;for(let i=0;i<3;i++){const a=t*0.01+i*2;c.beginPath();c.moveTo(Math.cos(a)*10,Math.sin(a)*10-2);c.lineTo(Math.cos(a)*16,Math.sin(a)*16-2);c.stroke();}c.shadowBlur=0;}});}
function drawHisoka(c,p,t){drawGenericAnime(c,p,'#d32f2f','#e91e63','spiky',function(c,p){c.fillStyle='#fdd835';c.beginPath();c.moveTo(-2,-6);c.lineTo(0,-4);c.lineTo(2,-6);c.fill();c.fillStyle='#42a5f5';c.beginPath();c.moveTo(-2,-4);c.lineTo(0,-6);c.lineTo(2,-4);c.fill();});}
function drawJinWoo(c,p,t){drawGenericAnime(c,p,'#111','#311b92','round',function(c,p){c.fillStyle='#7c4dff';c.shadowColor='#7c4dff';c.shadowBlur=5;c.beginPath();c.arc(-3,-8,1.5,0,Math.PI*2);c.fill();c.beginPath();c.arc(3,-8,1.5,0,Math.PI*2);c.fill();c.shadowBlur=0;c.globalAlpha=0.1;const g=c.createRadialGradient(0,-2,0,0,-2,25);g.addColorStop(0,'#311b92');g.addColorStop(1,'rgba(49,27,146,0)');c.fillStyle=g;c.beginPath();c.arc(0,-2,25,0,Math.PI*2);c.fill();c.globalAlpha=1;});}
function drawSaitama(c,p,t){ctx=c;ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#e8d0b0';ctx.beginPath();ctx.arc(0,-8,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fdd835';ctx.fillRect(-6,-1,12,14);ctx.fillStyle='#d32f2f';ctx.fillRect(-6,0,12,3);ctx.fillStyle='#fff';ctx.fillRect(-4,3,8,2);ctx.save();ctx.rotate(p.facingAngle);ctx.fillStyle=p.attackAnim>0?'#fdd835':'#e8d0b0';if(p.attackAnim>0){ctx.shadowColor='#fdd835';ctx.shadowBlur=20;}ctx.beginPath();ctx.arc(14,0,6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.restore();ctx.fillStyle='#d32f2f';ctx.fillRect(-4,13,3,7);ctx.fillRect(2,13,3,7);ctx.fillStyle='#fff';ctx.fillRect(-5,18,4,2);ctx.fillRect(1,18,4,2);ctx.fillStyle=p.playerIndex===0?'#fff':'#4a9eff';ctx.beginPath();ctx.arc(0,-18,2,0,Math.PI*2);ctx.fill();ctx.restore();}
function drawGenos(c,p,t){ctx=c;ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#fdd835';ctx.beginPath();ctx.arc(0,-8,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fdd835';ctx.beginPath();ctx.arc(0,-12,8,Math.PI+0.3,-0.3);ctx.fill();ctx.fillStyle='#222';ctx.fillRect(-6,-1,12,14);ctx.fillStyle='#ff8f00';ctx.fillRect(-6,0,2,12);ctx.fillRect(4,0,2,12);ctx.fillStyle='#ff8f00';ctx.shadowColor='#ff8f00';ctx.shadowBlur=4;ctx.beginPath();ctx.arc(-3,-8,1.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(3,-8,1.5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.save();ctx.rotate(p.facingAngle);ctx.fillStyle=p.attackAnim>0?'#ff6f00':'#bbb';if(p.attackAnim>0){ctx.shadowColor='#ff6f00';ctx.shadowBlur=12;}ctx.beginPath();ctx.arc(14,0,5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.restore();ctx.fillStyle='#333';ctx.fillRect(-4,13,3,7);ctx.fillRect(2,13,3,7);ctx.fillStyle=p.playerIndex===0?'#fff':'#4a9eff';ctx.beginPath();ctx.arc(0,-20,2,0,Math.PI*2);ctx.fill();ctx.restore();}
function drawKaneki(c,p,t){drawGenericAnime(c,p,'#fff','#111','round',function(c,p){c.fillStyle='#f44336';c.beginPath();c.arc(-3,-8,1.5,0,Math.PI*2);c.fill();c.fillStyle='#9e9e9e';c.beginPath();c.arc(3,-8,1.5,0,Math.PI*2);c.fill();if(p.activeEffects&&p.activeEffects.some(e=>e.effect==='damage')){c.fillStyle='#f44336';c.globalAlpha=0.4;for(let i=0;i<3;i++){const a=t*0.005+i*2;c.beginPath();c.moveTo(0,5);c.lineTo(Math.cos(a)*20,5+Math.sin(a)*20);c.lineTo(Math.cos(a+0.3)*18,5+Math.sin(a+0.3)*18);c.fill();}c.globalAlpha=1;}});}
function drawDenji(c,p,t){ctx=c;ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#e8d0b0';ctx.beginPath();ctx.arc(0,-8,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ff5722';ctx.beginPath();ctx.moveTo(-5,-12);ctx.lineTo(-3,-18);ctx.lineTo(0,-13);ctx.lineTo(3,-18);ctx.lineTo(5,-12);ctx.fill();const hasBuff=p.activeEffects&&p.activeEffects.some(e=>e.effect==='damage');if(hasBuff){ctx.fillStyle='#ff5722';ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(-2,-25);ctx.lineTo(2,-25);ctx.fill();}ctx.fillStyle='#fff';ctx.fillRect(-6,-1,12,14);ctx.fillStyle='#d32f2f';ctx.fillRect(-2,3,4,2);ctx.save();ctx.rotate(p.facingAngle);ctx.fillStyle='#9e9e9e';ctx.fillRect(6,-2,16+(p.attackAnim>0?6:0),4);ctx.strokeStyle='#bbb';ctx.lineWidth=0.5;for(let i=0;i<5;i++)ctx.beginPath(),ctx.moveTo(8+i*3,-2),ctx.lineTo(8+i*3,2),ctx.stroke();ctx.restore();ctx.fillStyle='#333';ctx.fillRect(-4,13,3,7);ctx.fillRect(2,13,3,7);ctx.fillStyle=p.playerIndex===0?'#fff':'#4a9eff';ctx.beginPath();ctx.arc(0,-20,2,0,Math.PI*2);ctx.fill();ctx.restore();}
function drawAsta(c,p,t){drawGenericAnime(c,p,'#bbb','#111','spiky',function(c,p){c.fillStyle='#222';c.strokeStyle='#69f0ae';c.lineWidth=0.8;c.strokeRect(-3,-1,6,10);if(p.activeEffects&&p.activeEffects.some(e=>e.effect==='reflect')){c.globalAlpha=0.2;const g=c.createRadialGradient(0,-2,0,0,-2,22);g.addColorStop(0,'#111');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.beginPath();c.arc(0,-2,22,0,Math.PI*2);c.fill();c.globalAlpha=1;}});}

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
