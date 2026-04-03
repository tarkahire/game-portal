const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ── Face Image ──
const faceImg = new Image();
faceImg.src = 'face.jpg';
let faceImgLoaded = false;
faceImg.onload = () => { faceImgLoaded = true; };

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
            { name: 'Spark Bolt',      type: 'projectile', damage: 6,  cooldown: 120,  speed: 12, radius: 33,  knockback: 6,  blockReduction: 0.5, draw: 'sparkBolt' },
            { name: 'Thunder Strike',  type: 'instant',    damage: 10, cooldown: 300,  range: 9999, knockback: 10, blockReduction: 0.4, vfx: 'bolt' },
            { name: 'Ball Lightning',  type: 'projectile', damage: 13, cooldown: 420,  speed: 4,  radius: 75, knockback: 14, blockReduction: 0.3, draw: 'ballLightning' },
            { name: 'Lightning Storm', type: 'instant',    damage: 20, cooldown: 600,  range: 9999, knockback: 18, blockReduction: 0.2, vfx: 'storm' },
        ],
    },
    fire: {
        name: 'Fire',
        color: '#e67e22',
        hue: 25,
        attacks: [
            { name: 'Fireball',    type: 'projectile', damage: 7,  cooldown: 150,  speed: 9,  radius: 42, knockback: 8,  blockReduction: 0.5, draw: 'fireball' },
            { name: 'Flame Burst', type: 'instant',    damage: 12, cooldown: 300,  range: 9999, knockback: 12, blockReduction: 0.4, vfx: 'burst' },
            { name: 'Fire Pillar', type: 'instant',    damage: 15, cooldown: 420,  range: 9999, knockback: 10, blockReduction: 0.3, vfx: 'pillar' },
            { name: 'Meteor',      type: 'projectile', damage: 24, cooldown: 660,  speed: 7,  radius: 120, knockback: 22, blockReduction: 0.2, draw: 'meteor', special: 'meteor' },
        ],
    },
    water: {
        name: 'Water',
        color: '#3498db',
        hue: 200,
        attacks: [
            { name: 'Water Bolt',  type: 'projectile', damage: 5,  cooldown: 100,  speed: 10, radius: 30, knockback: 6,  blockReduction: 0.6, draw: 'waterBolt' },
            { name: 'Tidal Wave',  type: 'projectile', damage: 8,  cooldown: 270,  speed: 5,  radius: 83, knockback: 18, blockReduction: 0.4, draw: 'tidalWave' },
            { name: 'Ice Spike',   type: 'instant',    damage: 13, cooldown: 360,  range: 9999, knockback: 6,  blockReduction: 0.3, vfx: 'iceSpike', launchUp: -20 },
            { name: 'Tsunami',     type: 'projectile', damage: 18, cooldown: 600,  speed: 3,  radius: 128, knockback: 28, blockReduction: 0.2, draw: 'tsunami' },
        ],
    },
    wind: {
        name: 'Wind',
        color: '#1abc9c',
        hue: 170,
        attacks: [
            { name: 'Air Slash',     type: 'projectile', damage: 5,  cooldown: 90,   speed: 14, radius: 36, knockback: 6,  blockReduction: 0.6, draw: 'airSlash' },
            { name: 'Gust',          type: 'instant',    damage: 3,  cooldown: 180,  range: 9999, knockback: 24, blockReduction: 0.5, vfx: 'gust' },
            { name: 'Tornado',       type: 'projectile', damage: 10, cooldown: 360,  speed: 3,  radius: 75, knockback: 12, blockReduction: 0.3, draw: 'tornado' },
            { name: 'Cyclone Burst', type: 'instant',    damage: 16, cooldown: 540,  range: 9999, knockback: 26, blockReduction: 0.2, vfx: 'cyclone' },
        ],
    },
    earth: {
        name: 'Earth',
        color: '#a0522d',
        hue: 30,
        attacks: [
            { name: 'Rock Shot',     type: 'projectile', damage: 6,  cooldown: 110,  speed: 11, radius: 48, knockback: 8,  blockReduction: 0.5, draw: 'rockShot' },
            { name: 'Earth Pillar',  type: 'instant',    damage: 12, cooldown: 300,  range: 9999, knockback: 14, blockReduction: 0.3, vfx: 'earthPillar' },
            { name: 'Seismic Wave',  type: 'projectile', damage: 10, cooldown: 360,  speed: 5,  radius: 90, knockback: 16, blockReduction: 0.3, draw: 'seismicWave' },
            { name: 'Boulder Crush', type: 'projectile', damage: 22, cooldown: 600,  speed: 0,  radius: 128, knockback: 28, blockReduction: 0.2, draw: 'boulderCrush', special: 'boulderCrush' },
        ],
    },
    acid: {
        name: 'Acid',
        color: '#39ff14',
        hue: 110,
        attacks: [
            { name: 'Acid Barrage', type: 'projectile', damage: 4,  cooldown: 100,  speed: 13, radius: 24, knockback: 4,  blockReduction: 0.5, draw: 'acidBarrage', special: 'acidBarrage' },
            { name: 'Acid Rain',    type: 'instant',    damage: 8,  cooldown: 270,  range: 9999, knockback: 8,  blockReduction: 0.4, vfx: 'acidRain' },
            { name: 'Acid Slash',   type: 'instant',    damage: 12, cooldown: 360,  range: 9999, knockback: 14, blockReduction: 0.3, vfx: 'acidSlash' },
            { name: 'Acid Monster', type: 'projectile', damage: 15, cooldown: 660,  speed: 0,  radius: 135, knockback: 22, blockReduction: 0.2, draw: 'acidMonster', special: 'acidMonster' },
        ],
    },
    light: {
        name: 'Light',
        color: '#ffd700',
        hue: 45,
        attacks: [
            { name: 'Holy Bolt',     type: 'projectile', damage: 6,  cooldown: 110,  speed: 14, radius: 27, knockback: 5,  blockReduction: 0.5, draw: 'holyBolt' },
            { name: 'Radiant Burst', type: 'instant',    damage: 10, cooldown: 280,  range: 9999, knockback: 10, blockReduction: 0.4, vfx: 'radiantBurst' },
            { name: 'Divine Ray',    type: 'projectile', damage: 13, cooldown: 380,  speed: 8,  radius: 53, knockback: 12, blockReduction: 0.3, draw: 'divineRay' },
            { name: 'Judgment',      type: 'instant',    damage: 20, cooldown: 600,  range: 9999, knockback: 18, blockReduction: 0.2, vfx: 'judgment' },
        ],
    },
    dark: {
        name: 'Dark',
        color: '#8e44ad',
        hue: 280,
        attacks: [
            { name: 'Shadow Bolt',  type: 'projectile', damage: 7,  cooldown: 120,  speed: 11, radius: 33, knockback: 6,  blockReduction: 0.5, draw: 'shadowBolt' },
            { name: 'Void Grip',    type: 'instant',    damage: 11, cooldown: 300,  range: 9999, knockback: 8,  blockReduction: 0.4, vfx: 'voidGrip' },
            { name: 'Dark Orb',     type: 'projectile', damage: 12, cooldown: 360,  speed: 4,  radius: 68, knockback: 14, blockReduction: 0.3, draw: 'darkOrb' },
            { name: 'Abyss',        type: 'instant',    damage: 18, cooldown: 580,  range: 9999, knockback: 16, blockReduction: 0.2, vfx: 'abyss' },
        ],
    },
    shadow: {
        name: 'Shadow',
        color: '#708090',
        hue: 210,
        attacks: [
            { name: 'Shadow Strike', type: 'projectile', damage: 5,  cooldown: 80,   speed: 17, radius: 24, knockback: 4,  blockReduction: 0.6, draw: 'shadowStrike' },
            { name: 'Phantom Step',  type: 'instant',    damage: 9,  cooldown: 240,  range: 9999, knockback: 10, blockReduction: 0.4, vfx: 'phantomStep' },
            { name: 'Shadow Clone',  type: 'projectile', damage: 11, cooldown: 340,  speed: 6,  radius: 60, knockback: 12, blockReduction: 0.3, draw: 'shadowClone' },
            { name: 'Eclipse',       type: 'instant',    damage: 17, cooldown: 560,  range: 9999, knockback: 20, blockReduction: 0.2, vfx: 'eclipse' },
        ],
    },
    portal: {
        name: 'Portal',
        color: '#e056de',
        hue: 300,
        attacks: [
            { name: 'Rift Shot',        type: 'projectile', damage: 6,  cooldown: 100,  speed: 12, radius: 30, knockback: 5,  blockReduction: 0.5, draw: 'riftShot' },
            { name: 'Warp Strike',      type: 'instant',    damage: 10, cooldown: 280,  range: 9999, knockback: 10, blockReduction: 0.4, vfx: 'warpStrike' },
            { name: 'Dimensional Rift', type: 'projectile', damage: 13, cooldown: 360,  speed: 3,  radius: 83, knockback: 14, blockReduction: 0.3, draw: 'dimensionalRift' },
            { name: 'Void Gate',        type: 'instant',    damage: 19, cooldown: 600,  range: 9999, knockback: 22, blockReduction: 0.2, vfx: 'voidGate' },
        ],
    },
    washingmachine: {
        name: 'Washer',
        color: '#87ceeb',
        hue: 197,
        attacks: [
            { name: 'Soap Blast',      type: 'projectile', damage: 5,  cooldown: 100,  speed: 10, radius: 33, knockback: 5,  blockReduction: 0.5, draw: 'soapBlast', special: 'soapBlast' },
            { name: 'Spin Cycle',      type: 'instant',    damage: 9,  cooldown: 260,  range: 9999, knockback: 14, blockReduction: 0.4, vfx: 'spinCycle' },
            { name: 'Bubble Barrage',  type: 'projectile', damage: 3,  cooldown: 90,   speed: 7,  radius: 21, knockback: 3,  blockReduction: 0.5, draw: 'bubbleBarrage', special: 'bubbleBarrage' },
            { name: 'Flood Rinse',     type: 'instant',    damage: 16, cooldown: 560,  range: 9999, knockback: 20, blockReduction: 0.2, vfx: 'floodRinse' },
        ],
    },
    corruption: {
        name: 'Corrupt',
        color: '#ff0055',
        hue: 340,
        attacks: [
            { name: 'Tainted Shot',      type: 'projectile', damage: 6,  cooldown: 110,  speed: 11, radius: 33, knockback: 6,  blockReduction: 0.5, draw: 'taintedShot' },
            { name: 'Decay Pulse',       type: 'instant',    damage: 10, cooldown: 280,  range: 9999, knockback: 10, blockReduction: 0.4, vfx: 'decayPulse' },
            { name: 'Glitch Swarm',      type: 'projectile', damage: 3,  cooldown: 90,   speed: 8,  radius: 18, knockback: 3,  blockReduction: 0.5, draw: 'glitchFragment', special: 'glitchSwarm' },
            { name: 'Total Corruption',  type: 'instant',    damage: 18, cooldown: 580,  range: 9999, knockback: 18, blockReduction: 0.2, vfx: 'totalCorruption' },
        ],
    },
    samurai: {
        name: 'Samurai',
        color: '#c8d6e5',
        hue: 215,
        attacks: [
            { name: 'Oni Giri',       type: 'projectile', damage: 15, cooldown: 180,  speed: 0,  radius: 45, knockback: 16, blockReduction: 0.3, draw: 'oniGiri', special: 'oniGiri' },
            { name: 'Shishi Sonson',  type: 'instant',    damage: 14, cooldown: 300,  range: 9999, knockback: 14, blockReduction: 0.3, vfx: 'shishiSonson' },
            { name: 'Dragon Twister', type: 'projectile', damage: 10, cooldown: 340,  speed: 4,  radius: 68, knockback: 12, blockReduction: 0.3, draw: 'dragonTwister' },
            { name: 'Ashura',         type: 'instant',    damage: 22, cooldown: 600,  range: 9999, knockback: 22, blockReduction: 0.2, vfx: 'ashura' },
        ],
    },
    crystal: {
        name: 'Crystal',
        color: '#00e5ff',
        hue: 187,
        attacks: [
            { name: 'Crystal Shard', type: 'projectile', damage: 7,  cooldown: 100,  speed: 15, radius: 27, knockback: 6,  blockReduction: 0.5, draw: 'crystalShard' },
            { name: 'Prism Beam',    type: 'instant',    damage: 12, cooldown: 300,  range: 9999, knockback: 10, blockReduction: 0.4, vfx: 'prismBeam' },
            { name: 'Crystal Cage',  type: 'projectile', damage: 13, cooldown: 350,  speed: 0,  radius: 68, knockback: 8,  blockReduction: 0.3, draw: 'crystalCage', special: 'crystalCage' },
            { name: 'Diamond Storm', type: 'instant',    damage: 19, cooldown: 600,  range: 9999, knockback: 20, blockReduction: 0.2, vfx: 'diamondStorm' },
        ],
    },
    rubberduck: {
        name: 'Duck',
        color: '#ffeb3b',
        hue: 54,
        attacks: [
            { name: 'Duck Shot',    type: 'projectile', damage: 5,  cooldown: 90,   speed: 11, radius: 30, knockback: 6,  blockReduction: 0.5, draw: 'duckShot' },
            { name: 'Squeak Blast', type: 'instant',    damage: 10, cooldown: 270,  range: 9999, knockback: 16, blockReduction: 0.4, vfx: 'squeakBlast' },
            { name: 'Bath Bomb',    type: 'projectile', damage: 12, cooldown: 340,  speed: 8,  radius: 45, knockback: 12, blockReduction: 0.3, draw: 'bathBomb' },
            { name: 'Duck Army',    type: 'instant',    damage: 18, cooldown: 580,  range: 9999, knockback: 20, blockReduction: 0.2, vfx: 'duckArmy' },
        ],
    },
    keyboard: {
        name: 'Keyboard',
        color: '#607d8b',
        hue: 200,
        attacks: [
            { name: 'Key Throw',   type: 'projectile', damage: 6,  cooldown: 90,   speed: 13, radius: 24, knockback: 5,  blockReduction: 0.5, draw: 'keyThrow' },
            { name: 'Caps Lock',   type: 'instant',    damage: 11, cooldown: 280,  range: 9999, knockback: 12, blockReduction: 0.4, vfx: 'capsLock' },
            { name: 'Ctrl+C Ctrl+V', type: 'projectile', damage: 4, cooldown: 100, speed: 12, radius: 21, knockback: 4, blockReduction: 0.5, draw: 'keyThrow', special: 'ctrlCV' },
            { name: 'Blue Screen', type: 'instant',    damage: 20, cooldown: 600,  range: 9999, knockback: 22, blockReduction: 0.2, vfx: 'blueScreen' },
        ],
    },
    chef: {
        name: 'Chef',
        color: '#ff5722',
        hue: 14,
        attacks: [
            { name: 'Pan Toss',         type: 'projectile', damage: 7,  cooldown: 110,  speed: 10, radius: 33, knockback: 10, blockReduction: 0.4, draw: 'panToss' },
            { name: 'Flamb\u00e9',      type: 'instant',    damage: 11, cooldown: 280,  range: 9999, knockback: 12, blockReduction: 0.4, vfx: 'flambe' },
            { name: 'Knife Throw',      type: 'projectile', damage: 8,  cooldown: 80,   speed: 18, radius: 21, knockback: 4,  blockReduction: 0.5, draw: 'knifeThrow' },
            { name: 'Kitchen Nightmare', type: 'instant',   damage: 19, cooldown: 600,  range: 9999, knockback: 22, blockReduction: 0.2, vfx: 'kitchenNightmare' },
        ],
    },
    dj: {
        name: 'DJ',
        color: '#e040fb',
        hue: 291,
        attacks: [
            { name: 'Vinyl Disc',    type: 'projectile', damage: 6,  cooldown: 100,  speed: 12, radius: 30, knockback: 6,  blockReduction: 0.5, draw: 'vinylDisc' },
            { name: 'Bass Drop',     type: 'instant',    damage: 11, cooldown: 280,  range: 9999, knockback: 18, blockReduction: 0.4, vfx: 'bassDrop' },
            { name: 'Speaker Blast', type: 'projectile', damage: 10, cooldown: 320,  speed: 6,  radius: 60, knockback: 14, blockReduction: 0.3, draw: 'speakerBlast' },
            { name: 'Drop the Beat', type: 'instant',    damage: 19, cooldown: 580,  range: 9999, knockback: 22, blockReduction: 0.2, vfx: 'dropTheBeat' },
        ],
    },
    pigeon: {
        name: 'Pigeon',
        color: '#9e9e9e',
        hue: 0,
        attacks: [
            { name: 'Peck Shot',     type: 'projectile', damage: 5,  cooldown: 70,   speed: 16, radius: 21, knockback: 4,  blockReduction: 0.6, draw: 'peckShot' },
            { name: 'Feather Storm', type: 'instant',    damage: 9,  cooldown: 250,  range: 9999, knockback: 10, blockReduction: 0.4, vfx: 'featherStorm' },
            { name: 'Poop Bomb',     type: 'projectile', damage: 14, cooldown: 350,  speed: 0,  radius: 45, knockback: 8,  blockReduction: 0.3, draw: 'poopBomb', special: 'poopBomb' },
            { name: 'Flock Attack',  type: 'instant',    damage: 18, cooldown: 580,  range: 9999, knockback: 20, blockReduction: 0.2, vfx: 'flockAttack' },
        ],
    },
    selfie: {
        name: 'Face',
        color: '#ffaa88',
        hue: 20,
        attacks: [
            { name: 'Face Shot',   type: 'projectile', damage: 6,  cooldown: 180,  speed: 12, radius: 33, knockback: 6,  blockReduction: 0.5, draw: 'faceShot' },
            { name: 'Grin Beam',   type: 'instant',    damage: 11, cooldown: 420,  range: 9999, knockback: 12, blockReduction: 0.4, vfx: 'grinBeam' },
            { name: 'Head Slam',   type: 'projectile', damage: 14, cooldown: 540,  speed: 0,  radius: 83, knockback: 16, blockReduction: 0.3, draw: 'headSlam', special: 'headSlam' },
            { name: 'THE FACE',    type: 'instant',    damage: 20, cooldown: 900,  range: 9999, knockback: 22, blockReduction: 0.2, vfx: 'theFace' },
        ],
    },
    ice: {
        name: 'Ice',
        color: '#88cfff',
        hue: 200,
        attacks: [
            { name: 'Icicle Throw',  type: 'projectile', damage: 6,  cooldown: 100,  speed: 14, radius: 27, knockback: 5,  blockReduction: 0.5, draw: 'icicleThrow' },
            { name: 'Frost Nova',    type: 'instant',    damage: 10, cooldown: 280,  range: 9999, knockback: 12, blockReduction: 0.4, vfx: 'frostNova' },
            { name: 'Ice Wall',      type: 'projectile', damage: 12, cooldown: 360,  speed: 0,  radius: 68, knockback: 8,  blockReduction: 0.3, draw: 'iceWall', special: 'iceWall' },
            { name: 'Blizzard',      type: 'instant',    damage: 19, cooldown: 600,  range: 9999, knockback: 20, blockReduction: 0.2, vfx: 'blizzard' },
        ],
    },
    gravity: {
        name: 'Gravity',
        color: '#9b59b6',
        hue: 280,
        attacks: [
            { name: 'Gravity Pull',   type: 'projectile', damage: 5,  cooldown: 90,   speed: 12, radius: 30, knockback: -8, blockReduction: 0.5, draw: 'gravityPull' },
            { name: 'Crush Field',    type: 'instant',    damage: 11, cooldown: 300,  range: 9999, knockback: 4,  blockReduction: 0.4, vfx: 'crushField' },
            { name: 'Levitate Slam',  type: 'instant',    damage: 14, cooldown: 380,  range: 9999, knockback: 16, blockReduction: 0.3, vfx: 'levitateSla', launchUp: -18 },
            { name: 'Singularity',    type: 'instant',    damage: 20, cooldown: 620,  range: 9999, knockback: 22, blockReduction: 0.2, vfx: 'singularity' },
        ],
    },
    time: {
        name: 'Time',
        color: '#f0e68c',
        hue: 55,
        attacks: [
            { name: 'Time Jab',       type: 'projectile', damage: 6,  cooldown: 80,   speed: 16, radius: 24, knockback: 5,  blockReduction: 0.5, draw: 'timeJab' },
            { name: 'Slow Zone',      type: 'instant',    damage: 9,  cooldown: 260,  range: 9999, knockback: 6,  blockReduction: 0.4, vfx: 'slowZone' },
            { name: 'Rewind Strike',  type: 'projectile', damage: 13, cooldown: 360,  speed: 10, radius: 45, knockback: 14, blockReduction: 0.3, draw: 'rewindStrike' },
            { name: 'Time Stop',      type: 'instant',    damage: 20, cooldown: 640,  range: 9999, knockback: 20, blockReduction: 0.2, vfx: 'timeStop' },
        ],
    },
    vampire: {
        name: 'Vampire',
        color: '#8b0000',
        hue: 0,
        attacks: [
            { name: 'Blood Dart',    type: 'projectile', damage: 6,  cooldown: 100,  speed: 13, radius: 24, knockback: 5,  blockReduction: 0.5, draw: 'bloodDart' },
            { name: 'Bat Swarm',     type: 'instant',    damage: 10, cooldown: 280,  range: 9999, knockback: 10, blockReduction: 0.4, vfx: 'batSwarm' },
            { name: 'Life Drain',    type: 'instant',    damage: 12, cooldown: 360,  range: 9999, knockback: 6,  blockReduction: 0.3, vfx: 'lifeDrain' },
            { name: 'Blood Moon',    type: 'instant',    damage: 19, cooldown: 600,  range: 9999, knockback: 20, blockReduction: 0.2, vfx: 'bloodMoon' },
        ],
    },
    dragon: {
        name: 'Dragon',
        color: '#ff4500',
        hue: 16,
        attacks: [
            { name: 'Flame Claw',    type: 'projectile', damage: 7,  cooldown: 110,  speed: 11, radius: 36, knockback: 8,  blockReduction: 0.5, draw: 'flameClaw' },
            { name: 'Dragon Breath', type: 'instant',    damage: 12, cooldown: 300,  range: 9999, knockback: 14, blockReduction: 0.4, vfx: 'dragonBreath' },
            { name: 'Tail Sweep',    type: 'instant',    damage: 14, cooldown: 380,  range: 9999, knockback: 18, blockReduction: 0.3, vfx: 'tailSweep', launchUp: -14 },
            { name: 'Dragon Roar',   type: 'instant',    damage: 21, cooldown: 620,  range: 9999, knockback: 24, blockReduction: 0.2, vfx: 'dragonRoar' },
        ],
    },
    necro: {
        name: 'Necro',
        color: '#556b2f',
        hue: 80,
        attacks: [
            { name: 'Bone Throw',      type: 'projectile', damage: 6,  cooldown: 90,   speed: 13, radius: 27, knockback: 6,  blockReduction: 0.5, draw: 'boneThrow' },
            { name: 'Skeleton Summon', type: 'projectile', damage: 10, cooldown: 300,  speed: 5,  radius: 60, knockback: 10, blockReduction: 0.4, draw: 'skeletonSummon' },
            { name: 'Soul Drain',      type: 'instant',    damage: 13, cooldown: 360,  range: 9999, knockback: 8,  blockReduction: 0.3, vfx: 'soulDrain' },
            { name: 'Army of Dead',    type: 'instant',    damage: 19, cooldown: 600,  range: 9999, knockback: 20, blockReduction: 0.2, vfx: 'armyOfDead' },
        ],
    },
    magnet: {
        name: 'Magnet',
        color: '#c0c0c0',
        hue: 0,
        attacks: [
            { name: 'Metal Shard',    type: 'projectile', damage: 6,  cooldown: 90,   speed: 15, radius: 21, knockback: 5,  blockReduction: 0.5, draw: 'metalShard' },
            { name: 'Repulse',        type: 'instant',    damage: 10, cooldown: 270,  range: 9999, knockback: 22, blockReduction: 0.4, vfx: 'repulse' },
            { name: 'Iron Pull',      type: 'instant',    damage: 12, cooldown: 340,  range: 9999, knockback: -14, blockReduction: 0.3, vfx: 'ironPull' },
            { name: 'Magnetic Storm', type: 'instant',    damage: 19, cooldown: 600,  range: 9999, knockback: 20, blockReduction: 0.2, vfx: 'magneticStorm' },
        ],
    },
    mech: {
        name: 'Mech',
        color: '#708090',
        hue: 210,
        attacks: [
            { name: 'Rocket Punch',    type: 'projectile', damage: 8,  cooldown: 120,  speed: 10, radius: 42, knockback: 12, blockReduction: 0.4, draw: 'rocketPunch' },
            { name: 'Laser Eye',       type: 'instant',    damage: 11, cooldown: 280,  range: 9999, knockback: 10, blockReduction: 0.4, vfx: 'laserEye' },
            { name: 'Missile Barrage', type: 'projectile', damage: 4,  cooldown: 340,  speed: 8,  radius: 24, knockback: 6,  blockReduction: 0.4, draw: 'missile', special: 'missileBarrage' },
            { name: 'Self-Destruct',   type: 'instant',    damage: 25, cooldown: 700,  range: 9999, knockback: 28, blockReduction: 0.1, vfx: 'selfDestruct' },
        ],
    },
    pizza: {
        name: 'Pizza',
        color: '#ff6347',
        hue: 9,
        attacks: [
            { name: 'Slice Throw',     type: 'projectile', damage: 5,  cooldown: 80,   speed: 13, radius: 27, knockback: 5,  blockReduction: 0.5, draw: 'sliceThrow' },
            { name: 'Cheese Stretch',  type: 'instant',    damage: 10, cooldown: 270,  range: 9999, knockback: -10, blockReduction: 0.4, vfx: 'cheeseStretch' },
            { name: 'Hot Sauce Splash',type: 'instant',    damage: 13, cooldown: 360,  range: 9999, knockback: 14, blockReduction: 0.3, vfx: 'hotSauce' },
            { name: 'The Full Pie',    type: 'projectile', damage: 20, cooldown: 620,  speed: 0,  radius: 110, knockback: 22, blockReduction: 0.2, draw: 'fullPie', special: 'fullPie' },
        ],
    },
    cat: {
        name: 'Cat',
        color: '#dda0dd',
        hue: 300,
        attacks: [
            { name: 'Hairball',        type: 'projectile', damage: 5,  cooldown: 80,   speed: 11, radius: 24, knockback: 4,  blockReduction: 0.5, draw: 'hairball' },
            { name: 'Scratch Fury',    type: 'instant',    damage: 11, cooldown: 270,  range: 9999, knockback: 10, blockReduction: 0.4, vfx: 'scratchFury' },
            { name: 'Laser Pointer',   type: 'projectile', damage: 8,  cooldown: 100,  speed: 20, radius: 18, knockback: 3,  blockReduction: 0.5, draw: 'laserPointer' },
            { name: 'Cat Army',        type: 'instant',    damage: 18, cooldown: 580,  range: 9999, knockback: 20, blockReduction: 0.2, vfx: 'catArmy' },
        ],
    },
    banana: {
        name: 'Banana',
        color: '#ffe135',
        hue: 50,
        attacks: [
            { name: 'Peel Toss',         type: 'projectile', damage: 4,  cooldown: 70,   speed: 12, radius: 24, knockback: 3,  blockReduction: 0.6, draw: 'peelToss' },
            { name: 'Banana Boomerang',  type: 'projectile', damage: 10, cooldown: 280,  speed: 8,  radius: 36, knockback: 10, blockReduction: 0.4, draw: 'bananaBoomerang' },
            { name: 'Split Slam',        type: 'instant',    damage: 13, cooldown: 360,  range: 9999, knockback: 16, blockReduction: 0.3, vfx: 'splitSlam' },
            { name: 'Potassium Overload',type: 'instant',    damage: 19, cooldown: 600,  range: 9999, knockback: 22, blockReduction: 0.2, vfx: 'potassiumOverload' },
        ],
    },
    grandma: {
        name: 'Grandma',
        color: '#deb887',
        hue: 34,
        attacks: [
            { name: 'Slipper Throw',  type: 'projectile', damage: 7,  cooldown: 90,   speed: 14, radius: 27, knockback: 8,  blockReduction: 0.4, draw: 'slipperThrow' },
            { name: 'Purse Swing',    type: 'instant',    damage: 11, cooldown: 270,  range: 9999, knockback: 16, blockReduction: 0.4, vfx: 'purseSwing' },
            { name: 'Cookie Barrage', type: 'projectile', damage: 4,  cooldown: 100,  speed: 10, radius: 21, knockback: 4,  blockReduction: 0.5, draw: 'cookieBarrage', special: 'cookieBarrage' },
            { name: 'The Chancla',    type: 'instant',    damage: 22, cooldown: 620,  range: 9999, knockback: 26, blockReduction: 0.2, vfx: 'theChancla' },
        ],
    },
    painter: {
        name: 'Painter',
        color: '#ff69b4',
        hue: 330,
        attacks: [
            { name: 'Paint Splash',  type: 'projectile', damage: 5,  cooldown: 80,   speed: 11, radius: 33, knockback: 5,  blockReduction: 0.5, draw: 'paintSplash' },
            { name: 'Brush Stroke',  type: 'instant',    damage: 11, cooldown: 280,  range: 9999, knockback: 12, blockReduction: 0.4, vfx: 'brushStroke' },
            { name: 'Canvas Slam',   type: 'projectile', damage: 13, cooldown: 350,  speed: 0,  radius: 75, knockback: 14, blockReduction: 0.3, draw: 'canvasSlam', special: 'canvasSlam' },
            { name: 'Masterpiece',   type: 'instant',    damage: 19, cooldown: 600,  range: 9999, knockback: 20, blockReduction: 0.2, vfx: 'masterpiece' },
        ],
    },
    bee: {
        name: 'Bee',
        color: '#ffc107',
        hue: 45,
        attacks: [
            { name: 'Sting Shot',     type: 'projectile', damage: 5,  cooldown: 70,   speed: 16, radius: 18, knockback: 4,  blockReduction: 0.6, draw: 'stingShot' },
            { name: 'Honey Trap',     type: 'projectile', damage: 8,  cooldown: 260,  speed: 7,  radius: 45, knockback: 3,  blockReduction: 0.4, draw: 'honeyTrap' },
            { name: 'Swarm Cloud',    type: 'instant',    damage: 12, cooldown: 340,  range: 9999, knockback: 10, blockReduction: 0.3, vfx: 'swarmCloud' },
            { name: "Queen's Wrath", type: 'instant',    damage: 19, cooldown: 600,  range: 9999, knockback: 22, blockReduction: 0.2, vfx: 'queensWrath' },
        ],
    },
    teacher: {
        name: 'Teacher',
        color: '#2e8b57',
        hue: 146,
        attacks: [
            { name: 'Chalk Throw',       type: 'projectile', damage: 5,  cooldown: 70,   speed: 15, radius: 18, knockback: 4,  blockReduction: 0.6, draw: 'chalkThrow' },
            { name: 'Ruler Slap',        type: 'instant',    damage: 11, cooldown: 270,  range: 9999, knockback: 14, blockReduction: 0.4, vfx: 'rulerSlap' },
            { name: 'Homework Avalanche',type: 'projectile', damage: 4,  cooldown: 100,  speed: 6,  radius: 24, knockback: 4,  blockReduction: 0.5, draw: 'homeworkAvalanche', special: 'homeworkAvalanche' },
            { name: 'Detention',         type: 'instant',    damage: 19, cooldown: 600,  range: 9999, knockback: 20, blockReduction: 0.2, vfx: 'detention' },
        ],
    },
    plumber: {
        name: 'Plumber',
        color: '#4169e1',
        hue: 225,
        attacks: [
            { name: 'Plunger Toss',     type: 'projectile', damage: 6,  cooldown: 90,   speed: 12, radius: 30, knockback: 6,  blockReduction: 0.5, draw: 'plungerToss' },
            { name: 'Pipe Wrench Spin', type: 'instant',    damage: 11, cooldown: 280,  range: 9999, knockback: 14, blockReduction: 0.4, vfx: 'pipeWrench' },
            { name: 'Flood Burst',      type: 'instant',    damage: 13, cooldown: 360,  range: 9999, knockback: 16, blockReduction: 0.3, vfx: 'floodBurst' },
            { name: 'Clogged Explosion',type: 'instant',    damage: 20, cooldown: 620,  range: 9999, knockback: 24, blockReduction: 0.2, vfx: 'cloggedExplosion' },
        ],
    },
};

// ── Screen Shake ──
let shakeIntensity = 0;
let shakeDuration = 0;
let shakeOffsetX = 0;
let shakeOffsetY = 0;

function triggerScreenShake(intensity, duration) {
    shakeIntensity = intensity * 0.3;
    shakeDuration = Math.floor(duration * 0.4);
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
        screenFlashAlpha *= 0.72;
    }
}

// ── State ──
let groundY, gameState, timer, timerInterval;
let p1Wins = 0, p2Wins = 0, currentRound = 1;
let aiMode = false;
let trainingMode = false;
let p1Style = null, p2Style = null;
const damageNumbers = [];

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
        this.domainAvailable = false;
        this.domainActive = false;
        this.domainTimer = 0;
        this.domainUsed = false;
        this.punchTimer = 0;
        this.kickTimer = 0;
        this.meleeCooldown = 0;
        this.phoenixDive = null;
        this.samuraiDash = null;
        this.combo = 0;
        this.comboTimer = 0;
        this.maxCombo = 0;
        this.comboDamageBonus = 0;
    }

    update(opponent) {
        this.facing = this.x < opponent.x ? 1 : -1;
        if (this.hitTimer > 0) { this.hitTimer--; this.hit = this.hitTimer > 0; }
        if (this.castTimer > 0) { this.castTimer--; this.casting = this.castTimer > 0; }
        if (this.punchTimer > 0) this.punchTimer--;
        if (this.kickTimer > 0) this.kickTimer--;
        if (this.meleeCooldown > 0) this.meleeCooldown--;
        if (this.comboTimer > 0) { this.comboTimer--; if (this.comboTimer <= 0) this.combo = 0; }
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
        if (this.domainActive) {
            this.domainTimer--;
            if (this.domainTimer <= 0) { this.domainActive = false; }
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

        // ── Samurai Dash (Oni Giri) ──
        if (this.samuraiDash) {
            const sd = this.samuraiDash;
            sd.timer++;
            if (sd.phase === 'windup') {
                // Brief crouch/prepare (character stays still)
                this.vx = 0;
                if (sd.timer >= 12) {
                    sd.phase = 'dash'; sd.timer = 0;
                    sd.targetX = sd.opponent.x; // re-target current position
                    sd.dir = sd.targetX > this.x ? 1 : -1; // update direction
                    sd.startX = this.x;
                    triggerScreenFlash('#c8d6e5', 0.2);
                }
            } else if (sd.phase === 'dash') {
                // Lightning-fast dash toward opponent
                const dashDur = 8;
                const t = Math.min(sd.timer / dashDur, 1);
                this.x = sd.startX + (sd.targetX - sd.startX) * t;
                this.vx = 0;
                // Afterimage trail
                for (let i = 0; i < 3; i++) {
                    particles.push({ x: this.x - sd.dir * (10 + Math.random() * 20), y: this.y - this.height * 0.5 + (Math.random() - 0.5) * 40,
                        vx: -sd.dir * (2 + Math.random() * 3), vy: (Math.random() - 0.5) * 2,
                        life: 6 + Math.random() * 4, maxLife: 10, color: '#c8d6e5' });
                }
                if (t >= 1) {
                    sd.phase = 'slash'; sd.timer = 0;
                    // SLASH — deal damage
                    triggerScreenShake(12, 15); triggerHitstop(10);
                    triggerScreenFlash('#fff', 0.4);
                    const hitDist = Math.abs(this.x - sd.opponent.x);
                    if (hitDist < 100) {
                        let damage = sd.damage;
                        if (this.rageActive) damage = Math.floor(damage * 1.5);
                        if (this.domainActive) damage = Math.floor(damage * 1.4);
                        damage = this.applyComboBonus(damage);
                        if (sd.opponent.blocking) {
                            damage = Math.floor(damage * (1 - sd.blockReduction));
                        }
                        sd.opponent.health = Math.max(0, sd.opponent.health - damage);
                        spawnDamageNumber(sd.opponent.x, sd.opponent.y - sd.opponent.height - 10, damage, '#c8d6e5');
                        this.addCombo();
                        sd.opponent.hitTimer = 18; sd.opponent.hit = true;
                        sd.opponent.x += sd.dir * sd.knockback;
                        sd.opponent.vy = -6; sd.opponent.onGround = false;
                        visualEffects.push({ type: 'impactRing', x: sd.opponent.x, y: sd.opponent.y - sd.opponent.height * 0.5, life: 20, maxLife: 20, color: '#c8d6e5' });
                    }
                    // Slash VFX — 3 crossing lines at opponent
                    for (let s = 0; s < 3; s++) {
                        const sa = -0.5 + s * 0.5;
                        visualEffects.push({ type: 'shishiSonson', x1: this.x - sd.dir * 30, y1: this.y - this.height * 0.5 + (s - 1) * 15, x2: this.x + sd.dir * 80, y2: this.y - this.height * 0.5 + (s - 1) * 15 + (s - 1) * 20, dir: sd.dir, life: 18, maxLife: 18 });
                    }
                    spawnElementParticles(this.x + sd.dir * 30, this.y - this.height * 0.5, STYLES[this.style], 40);
                }
            } else if (sd.phase === 'slash') {
                // Brief recovery after slash
                if (sd.timer >= 15) { this.samuraiDash = null; }
            }
            this.x = Math.max(this.width / 2, Math.min(canvas.width - this.width / 2, this.x));
            // Still apply gravity during dash
            this.vy += GRAVITY; this.y += this.vy;
            if (this.y >= groundY) { this.y = groundY; this.vy = 0; this.onGround = true; }
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

    addCombo() {
        this.combo++;
        this.comboTimer = 90; // ~1.5 seconds to keep combo alive
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        // Bonus damage scales with combo: 0% at 1 hit, +5% per additional hit, max +50%
        this.comboDamageBonus = Math.min((this.combo - 1) * 0.05, 0.5);
    }

    applyComboBonus(damage) {
        return Math.floor(damage * (1 + this.comboDamageBonus));
    }

    melee(type, opponent) {
        if (this.meleeCooldown > 0 || this.hit || this.blocking || this.phoenixDive || this.samuraiDash) return;
        const PUNCH_RANGE = 70;
        const KICK_RANGE = 85;
        const PUNCH_DAMAGE = 3;
        const KICK_DAMAGE = 5;
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
            if (this.domainActive) damage = Math.floor(damage * 1.4);
            damage = this.applyComboBonus(damage);
            let knockback = kb;
            if (opponent.blocking) {
                damage = Math.floor(damage * 0.3);
                knockback *= 0.3;
            }
            opponent.health = Math.max(0, opponent.health - damage);
            spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, '#fff');
            this.addCombo();
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
        // Grant opponent domain expansion
        const opponent = (this === player1) ? player2 : player1;
        opponent.domainAvailable = true;
    }

    activateDomain() {
        if (!this.domainAvailable || this.domainActive || this.domainUsed) return;
        this.domainActive = true;
        this.domainTimer = 25 * 60; // 25 seconds
        this.domainUsed = true;
        this.domainAvailable = false;
        this.cooldowns = [0, 0, 0, 0]; // reset cooldowns
        triggerScreenShake(25, 30);
        triggerScreenFlash(STYLES[this.style]?.color || '#fff', 0.8);
        triggerHitstop(20);
        // Dramatic activation burst
        const styleData = STYLES[this.style];
        for (let i = 0; i < 80; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 4 + Math.random() * 10;
            particles.push({ x: this.x, y: this.y - this.height * 0.5,
                vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                life: 20 + Math.random() * 20, maxLife: 40,
                color: styleData ? `hsl(${styleData.hue + (Math.random()-0.5)*30}, 90%, ${50+Math.random()*30}%)` : '#fff' });
        }
        // Domain expansion visual effect
        visualEffects.push({ type: 'domainExpansion', x: this.x, y: this.y - this.height * 0.5,
            style: this.style, life: 60, maxLife: 60, color: styleData?.color || '#fff' });
    }

    useAttack(index, opponent) {
        if (!this.style || this.cooldowns[index] > 0 || this.hit || this.blocking || this.phoenixDive || this.samuraiDash) return;
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
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                this.addCombo();
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
                    spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                    this.addCombo();
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

        // ── Wind Rage Upgrades ──
        if (this.rageActive && this.style === 'wind') {
            if (index === 0) {
                // GALE SLASH — lock-on instant wind slash
                let damage = Math.floor(atk.damage * 1.5);
                let kb = atk.knockback * 2;
                if (opponent.blocking) { damage = Math.floor(damage * (1 - atk.blockReduction)); kb *= (1 - atk.blockReduction); }
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                this.addCombo();
                opponent.hitTimer = 12; opponent.hit = true;
                opponent.x += dir * kb;
                spawnWindGust(this.x, this.y - this.height * 0.5, dir);
                triggerScreenShake(8, 12); triggerHitstop(6);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 50);
                visualEffects.push({ type: 'impactRing', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 20, maxLife: 20, color: '#1abc9c' });
                return;
            }
            if (index === 1) {
                // HURRICANE BLAST — massive wind burst, lock-on
                let damage = Math.floor(atk.damage * 1.5);
                let kb = atk.knockback * 1.5;
                if (opponent.blocking) { damage = Math.floor(damage * (1 - atk.blockReduction)); kb *= (1 - atk.blockReduction); }
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                this.addCombo();
                opponent.hitTimer = 15; opponent.hit = true;
                opponent.x += dir * kb;
                opponent.vy = -8; opponent.onGround = false;
                spawnWindGust(this.x, this.y - this.height * 0.5, dir);
                spawnCyclone(opponent.x, opponent.y - opponent.height * 0.3);
                triggerScreenShake(14, 20); triggerHitstop(8); triggerScreenFlash('#1abc9c', 0.3);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 70);
                return;
            }
            if (index === 2) {
                // MEGA TORNADO — huge tornado with spinning figures and cows
                const figs = [];
                for (let f = 0; f < 3; f++) figs.push({ type: 'stickman', angle: (f / 3) * Math.PI * 2, height: 0.25 + f * 0.22, dist: 35 + f * 18 });
                for (let f = 0; f < 2; f++) figs.push({ type: 'cow', angle: Math.PI + (f / 2) * Math.PI, height: 0.15 + f * 0.3, dist: 30 + f * 22 });
                projectiles.push({
                    x: this.x + dir * 40, y: groundY,
                    vx: dir * 2, vy: 0,
                    radius: 120, owner: this, target: opponent,
                    atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData,
                    life: 360, trail: [],
                    isRageTornado: true, figures: figs, hitCooldown: 0,
                    rageVfx: null,
                });
                triggerScreenShake(12, 15); triggerScreenFlash('#1abc9c', 0.25);
                return;
            }
            // Index 3 (Cyclone Burst) falls through — already has screen tear rage VFX
        }

        // ── Water Rage Upgrades ──
        if (this.rageActive && this.style === 'water') {
            if (index === 0) {
                // HYDRO CANNON — massive water beam across the screen
                let damage = Math.floor(atk.damage * 1.5);
                let kb = atk.knockback * 2;
                if (opponent.blocking) { damage = Math.floor(damage * (1 - atk.blockReduction)); kb *= (1 - atk.blockReduction); }
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                this.addCombo();
                opponent.hitTimer = 15; opponent.hit = true;
                opponent.x += dir * kb;
                this.castTimer = 20;
                const beamY = this.y - this.height * 0.55;
                const beamEndX = dir > 0 ? canvas.width + 50 : -50;
                visualEffects.push({ type: 'hydroCannon', x1: this.x + dir * 30, y1: beamY, x2: beamEndX, y2: beamY, dir, life: 30, maxLife: 30 });
                triggerScreenShake(14, 18); triggerHitstop(8); triggerScreenFlash('#3498db', 0.45);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 60);
                visualEffects.push({ type: 'impactRing', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 20, maxLife: 20, color: '#3498db' });
                return;
            }
            if (index === 1) {
                // ABYSSAL FLOOD — screen-filling tidal wave
                let damage = Math.floor(atk.damage * 1.5);
                let kb = atk.knockback * 1.5;
                if (opponent.blocking) { damage = Math.floor(damage * (1 - atk.blockReduction)); kb *= (1 - atk.blockReduction); }
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                this.addCombo();
                opponent.hitTimer = 20; opponent.hit = true;
                opponent.x += dir * kb;
                opponent.vy = -6; opponent.onGround = false;
                visualEffects.push({ type: 'abyssalFlood', dir, life: 55, maxLife: 55 });
                triggerScreenShake(20, 25); triggerHitstop(10); triggerScreenFlash('#1a5276', 0.5);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 80);
                return;
            }
            if (index === 2) {
                // FROZEN GRAVEYARD — 5 ice spikes erupt across a wide area
                let damage = Math.floor(atk.damage * 1.5);
                let kb = atk.knockback;
                if (opponent.blocking) { damage = Math.floor(damage * (1 - atk.blockReduction)); kb *= (1 - atk.blockReduction); }
                const dist = Math.abs(this.x - opponent.x);
                if (dist < 9999) {
                    opponent.health = Math.max(0, opponent.health - damage);
                    spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                    this.addCombo();
                    opponent.hitTimer = 18; opponent.hit = true;
                    opponent.vy = -16; opponent.onGround = false;
                    opponent.x += dir * kb;
                }
                for (let sp = -2; sp <= 2; sp++) spawnIceSpike(opponent.x + sp * 80, groundY);
                visualEffects.push({ type: 'frostOverlay', life: 50, maxLife: 50 });
                triggerScreenShake(18, 22); triggerHitstop(10); triggerScreenFlash('#aed6f1', 0.5);
                return;
            }
            // Index 3 (Tsunami) falls through — already has screen fracture rage VFX
        }

        // ── Lightning Rage Upgrades ──
        if (this.rageActive && this.style === 'lightning') {
            if (index === 0) {
                // CHAIN LIGHTNING — bolt jumps between caster and opponent multiple times
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                this.addCombo();
                opponent.hitTimer = 14; opponent.hit = true;
                opponent.x += dir * atk.knockback * 1.5;
                // Multiple lightning bolts
                for (let b = 0; b < 5; b++) {
                    setTimeout(() => {
                        spawnLightningBolt(opponent.x + (Math.random() - 0.5) * 80, 0, groundY, 5);
                        triggerScreenShake(4, 4);
                    }, b * 50);
                }
                triggerScreenShake(10, 12); triggerHitstop(6); triggerScreenFlash('#f1c40f', 0.35);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 50);
                return;
            }
            if (index === 1) {
                // DIVINE SMITE — massive bolt from sky, lock-on, huge damage
                let damage = Math.floor(atk.damage * 1.5);
                let kb = atk.knockback * 2;
                if (opponent.blocking) { damage = Math.floor(damage * (1 - atk.blockReduction)); kb *= (1 - atk.blockReduction); }
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                this.addCombo();
                opponent.hitTimer = 20; opponent.hit = true;
                opponent.x += dir * kb;
                opponent.vy = -10; opponent.onGround = false;
                spawnLightningBolt(opponent.x, 0, groundY, 14);
                visualEffects.push({ type: 'divineSmite', x: opponent.x, life: 40, maxLife: 40 });
                triggerScreenShake(25, 30); triggerHitstop(12); triggerScreenFlash('#f1c40f', 0.7);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 90);
                visualEffects.push({ type: 'impactRing', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 25, maxLife: 25, color: '#f1c40f' });
                return;
            }
            if (index === 2) {
                // PLASMA FIELD — ball lightning that expands into a massive electric field
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true;
                opponent.vy = -8; opponent.onGround = false;
                visualEffects.push({ type: 'plasmaField', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 45, maxLife: 45 });
                for (let b = 0; b < 8; b++) {
                    const a = (b / 8) * Math.PI * 2;
                    spawnLightningBolt(opponent.x + Math.cos(a) * 120, opponent.y - opponent.height * 0.5 - 100, groundY, 4);
                }
                triggerScreenShake(18, 22); triggerHitstop(10); triggerScreenFlash('#f1c40f', 0.5);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 80);
                return;
            }
            // Index 3 (Lightning Storm) falls through — already has screen lightning rage VFX
        }

        // ── Earth Rage Upgrades ──
        if (this.rageActive && this.style === 'earth') {
            if (index === 0) {
                // METEOR BARRAGE — 5 rocks fly at opponent from different angles
                for (let r = 0; r < 5; r++) {
                    const angle = -Math.PI * 0.3 + (r / 4) * Math.PI * 0.6;
                    const spawnX = opponent.x + Math.cos(angle + Math.PI) * 250;
                    const spawnY = -50 - r * 40;
                    const dx = opponent.x - spawnX;
                    const dy = (opponent.y - opponent.height * 0.5) - spawnY;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    const spd = 10 + r * 2;
                    setTimeout(() => {
                        projectiles.push({
                            x: spawnX, y: spawnY,
                            vx: (dx / d) * spd, vy: (dy / d) * spd,
                            radius: 25, owner: this, target: opponent,
                            atk: { ...atk, damage: Math.floor(atk.damage * 1.5 / 3), draw: 'rockShot', knockback: 6, blockReduction: 0.5 },
                            styleData, life: 180, trail: [],
                            rageVfx: null,
                        });
                    }, r * 60);
                }
                triggerScreenShake(8, 10); triggerScreenFlash('#a0522d', 0.2);
                return;
            }
            if (index === 1) {
                // MOUNTAIN RISE — colossal earth pillar + two flanking ones
                let damage = Math.floor(atk.damage * 1.5);
                let kb = atk.knockback * 1.5;
                if (opponent.blocking) { damage = Math.floor(damage * (1 - atk.blockReduction)); kb *= (1 - atk.blockReduction); }
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                this.addCombo();
                opponent.hitTimer = 20; opponent.hit = true;
                opponent.vy = -14; opponent.onGround = false;
                opponent.x += dir * kb;
                spawnEarthPillar(opponent.x, groundY);
                spawnEarthPillar(opponent.x - 90, groundY);
                spawnEarthPillar(opponent.x + 90, groundY);
                triggerScreenShake(30, 35); triggerHitstop(12); triggerScreenFlash('#a0522d', 0.5);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 80);
                visualEffects.push({ type: 'impactRing', x: opponent.x, y: groundY - 50, life: 25, maxLife: 25, color: '#a0522d' });
                return;
            }
            if (index === 2) {
                // EARTHQUAKE — screen-wide ground eruption
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true;
                opponent.vy = -10; opponent.onGround = false;
                visualEffects.push({ type: 'earthquake', life: 50, maxLife: 50 });
                for (let ep = 0; ep < 6; ep++) {
                    spawnEarthPillar(100 + ep * (canvas.width - 200) / 5, groundY);
                }
                triggerScreenShake(35, 40); triggerHitstop(12); triggerScreenFlash('#a0522d', 0.5);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 80);
                return;
            }
            // Index 3 (Boulder Crush) falls through — already has screen shatter rage VFX
        }

        // ── Acid Rage Upgrades ──
        if (this.rageActive && this.style === 'acid') {
            if (index === 0) {
                // TOXIC SPRAY — 7 acid globs in a wide fan spread
                for (let b = -3; b <= 3; b++) {
                    projectiles.push({
                        x: this.x + dir * 30,
                        y: this.y - this.height * 0.55,
                        vx: dir * atk.speed * 0.9,
                        vy: b * 2.5,
                        radius: atk.radius, owner: this, target: opponent,
                        atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData,
                        life: 200, trail: [],
                        rageVfx: null,
                    });
                }
                triggerScreenFlash('#39ff14', 0.2);
                return;
            }
            if (index === 1) {
                // ACID STORM — massive acid rain, lock-on, huge damage
                let damage = Math.floor(atk.damage * 1.5);
                let kb = atk.knockback * 1.5;
                if (opponent.blocking) { damage = Math.floor(damage * (1 - atk.blockReduction)); kb *= (1 - atk.blockReduction); }
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true;
                opponent.x += dir * kb;
                spawnAcidRain(opponent.x, groundY);
                spawnAcidRain(opponent.x - 100, groundY);
                spawnAcidRain(opponent.x + 100, groundY);
                visualEffects.push({ type: 'toxicOverlay', life: 45, maxLife: 45 });
                triggerScreenShake(16, 22); triggerHitstop(10); triggerScreenFlash('#39ff14', 0.45);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 80);
                return;
            }
            if (index === 2) {
                // DISSOLUTION — screen-wide acid slash, massive curved line
                let damage = Math.floor(atk.damage * 1.5);
                let kb = atk.knockback * 1.5;
                if (opponent.blocking) { damage = Math.floor(damage * (1 - atk.blockReduction)); kb *= (1 - atk.blockReduction); }
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true;
                opponent.x += dir * kb;
                // Two crossing slashes
                spawnAcidSlash(this.x, this.y - this.height * 0.3, opponent.x, opponent.y - opponent.height * 0.8, dir);
                spawnAcidSlash(this.x, this.y - this.height * 0.7, opponent.x, opponent.y - opponent.height * 0.2, dir);
                triggerScreenShake(18, 22); triggerHitstop(10); triggerScreenFlash('#39ff14', 0.5);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 70);
                visualEffects.push({ type: 'impactRing', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 22, maxLife: 22, color: '#39ff14' });
                return;
            }
            // Index 3 (Acid Monster) falls through — already has screen meltdown rage VFX
        }

        // ── Light Rage Upgrades ──
        if (this.rageActive && this.style === 'light') {
            if (index === 0) {
                // DIVINE LANCE — holy beam across screen
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                opponent.hitTimer = 15; opponent.hit = true; opponent.x += dir * atk.knockback * 2;
                const beamY = this.y - this.height * 0.55;
                visualEffects.push({ type: 'holyBeam', x1: this.x + dir * 30, y1: beamY, x2: dir > 0 ? canvas.width + 50 : -50, y2: beamY, dir, life: 28, maxLife: 28 });
                triggerScreenShake(12, 16); triggerHitstop(8); triggerScreenFlash('#ffd700', 0.5);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, '#ffd700');
                this.addCombo();
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 60);
                return;
            }
            if (index === 1) {
                // SUPERNOVA — massive expanding light explosion
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true; opponent.vy = -10; opponent.onGround = false;
                visualEffects.push({ type: 'radiantBurst', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 35, maxLife: 35 });
                visualEffects.push({ type: 'radiantBurst', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 28, maxLife: 28 });
                triggerScreenShake(16, 20); triggerHitstop(10); triggerScreenFlash('#fff', 0.7);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 90);
                return;
            }
            if (index === 2) {
                // ANGEL'S WRATH — 3 divine rays raining down
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true; opponent.vy = -8; opponent.onGround = false;
                for (let j = -1; j <= 1; j++) {
                    spawnLightningBolt(opponent.x + j * 80, 0, groundY, 8);
                    visualEffects.push({ type: 'judgmentPillar', x: opponent.x + j * 80, life: 35, maxLife: 35 });
                }
                triggerScreenShake(20, 25); triggerHitstop(10); triggerScreenFlash('#ffd700', 0.6);
                return;
            }
        }

        // ── Dark Rage Upgrades ──
        if (this.rageActive && this.style === 'dark') {
            if (index === 0) {
                // DEATH RAY — dark beam across screen
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                opponent.hitTimer = 15; opponent.hit = true; opponent.x += dir * atk.knockback * 2;
                const beamY = this.y - this.height * 0.55;
                visualEffects.push({ type: 'darkBeam', x1: this.x + dir * 30, y1: beamY, x2: dir > 0 ? canvas.width + 50 : -50, y2: beamY, dir, life: 28, maxLife: 28 });
                triggerScreenShake(12, 16); triggerHitstop(8); triggerScreenFlash('#8e44ad', 0.5);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, '#8e44ad');
                this.addCombo();
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 60);
                return;
            }
            if (index === 1) {
                // SOUL CRUSH — massive void grip from all sides
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                this.addCombo();
                opponent.hitTimer = 20; opponent.hit = true;
                visualEffects.push({ type: 'voidGrip', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 40, maxLife: 40 });
                visualEffects.push({ type: 'abyss', x: opponent.x, y: groundY, life: 35, maxLife: 35 });
                triggerScreenShake(16, 22); triggerHitstop(12); triggerScreenFlash('#8e44ad', 0.5);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 80);
                return;
            }
            if (index === 2) {
                // BLACK HOLE — massive gravity well
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                this.addCombo();
                opponent.hitTimer = 20; opponent.hit = true; opponent.vy = -12; opponent.onGround = false;
                visualEffects.push({ type: 'voidGate', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 45, maxLife: 45 });
                triggerScreenShake(20, 28); triggerHitstop(12); triggerScreenFlash('#000', 0.6);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 90);
                return;
            }
        }

        // ── Shadow Rage Upgrades ──
        if (this.rageActive && this.style === 'shadow') {
            if (index === 0) {
                // ASSASSINATE — instant lock-on teleport slash
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                this.addCombo();
                opponent.hitTimer = 14; opponent.hit = true; opponent.x += dir * atk.knockback * 2;
                visualEffects.push({ type: 'phantomSlash', x: opponent.x, y: opponent.y - opponent.height * 0.5, dir, life: 18, maxLife: 18 });
                visualEffects.push({ type: 'phantomSlash', x: opponent.x + 20, y: opponent.y - opponent.height * 0.3, dir: -dir, life: 15, maxLife: 15 });
                triggerScreenShake(10, 14); triggerHitstop(8); triggerScreenFlash('#aaa', 0.3);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 50);
                return;
            }
            if (index === 1) {
                // SHADOW DANCE — triple teleport slashes
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true; opponent.vy = -6; opponent.onGround = false;
                for (let s = 0; s < 3; s++) {
                    setTimeout(() => {
                        visualEffects.push({ type: 'phantomSlash', x: opponent.x + (Math.random() - 0.5) * 40, y: opponent.y - opponent.height * 0.5 + (Math.random() - 0.5) * 30, dir: s % 2 === 0 ? 1 : -1, life: 16, maxLife: 16 });
                        triggerScreenShake(5, 5);
                    }, s * 80);
                }
                triggerScreenShake(12, 16); triggerHitstop(8);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 60);
                return;
            }
            if (index === 2) {
                // SHADOW ARMY — 3 shadow clones converge on opponent
                for (let s = -1; s <= 1; s++) {
                    projectiles.push({
                        x: this.x + s * 60, y: this.y - this.height * 0.55 + s * 20,
                        vx: dir * (atk.speed + 2), vy: s * 1,
                        radius: atk.radius, owner: this, target: opponent,
                        atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData,
                        life: 250, trail: [], rageVfx: null,
                    });
                }
                return;
            }
        }

        // ── Portal Rage Upgrades ──
        if (this.rageActive && this.style === 'portal') {
            if (index === 0) {
                // REALITY SHATTER — lock-on dimensional blast
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                this.addCombo();
                opponent.hitTimer = 15; opponent.hit = true; opponent.x += dir * atk.knockback * 2;
                visualEffects.push({ type: 'warpPortal', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 30, maxLife: 30 });
                triggerScreenShake(12, 16); triggerHitstop(8); triggerScreenFlash('#e056de', 0.4);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 60);
                return;
            }
            if (index === 1) {
                // DIMENSIONAL SLAM — portals open around opponent
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true; opponent.vy = -10; opponent.onGround = false;
                for (let j = -1; j <= 1; j++) {
                    visualEffects.push({ type: 'warpPortal', x: opponent.x + j * 70, y: opponent.y - opponent.height * 0.5 + j * 20, life: 25, maxLife: 25 });
                }
                triggerScreenShake(16, 20); triggerHitstop(10); triggerScreenFlash('#e056de', 0.5);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 80);
                return;
            }
            if (index === 2) {
                // MULTIVERSE COLLAPSE — massive rift
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                this.addCombo();
                opponent.hitTimer = 20; opponent.hit = true; opponent.vy = -12; opponent.onGround = false;
                visualEffects.push({ type: 'voidGate', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 50, maxLife: 50 });
                triggerScreenShake(22, 28); triggerHitstop(12); triggerScreenFlash('#e056de', 0.6);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 90);
                return;
            }
        }

        // ── Corruption Rage Upgrades ──
        if (this.rageActive && this.style === 'corruption') {
            if (index === 0) {
                // CORRUPTION BEAM — glitchy beam across screen
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, '#ff0055');
                this.addCombo();
                opponent.hitTimer = 15; opponent.hit = true; opponent.x += dir * atk.knockback * 2;
                this.castTimer = 20;
                const beamY = this.y - this.height * 0.55;
                visualEffects.push({ type: 'corruptionBeam', x1: this.x + dir * 30, y1: beamY, x2: dir > 0 ? canvas.width + 50 : -50, y2: beamY, dir, life: 30, maxLife: 30 });
                triggerScreenShake(12, 16); triggerHitstop(8); triggerScreenFlash('#ff0055', 0.5);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 60);
                return;
            }
            if (index === 1) {
                // VIRAL SPREAD — massive corruption field
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, '#ff0055');
                this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true; opponent.vy = -8; opponent.onGround = false;
                visualEffects.push({ type: 'decayPulse', x: opponent.x, y: groundY, life: 45, maxLife: 45 });
                visualEffects.push({ type: 'decayPulse', x: opponent.x - 100, y: groundY, life: 40, maxLife: 40 });
                visualEffects.push({ type: 'decayPulse', x: opponent.x + 100, y: groundY, life: 40, maxLife: 40 });
                triggerScreenShake(18, 22); triggerHitstop(10); triggerScreenFlash('#ff0055', 0.5);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 80);
                return;
            }
            if (index === 2) {
                // DIGITAL STORM — 9 erratic glitch fragments
                for (let b = 0; b < 9; b++) {
                    projectiles.push({
                        x: this.x + dir * 30, y: this.y - this.height * 0.55 + (Math.random() - 0.5) * 50,
                        vx: dir * (atk.speed + Math.random() * 6), vy: (Math.random() - 0.5) * 7,
                        radius: atk.radius + Math.random() * 8, owner: this, target: opponent,
                        atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData, life: 200, trail: [],
                        isGlitch: true, glitchOffset: Math.random() * 100, rageVfx: null,
                    });
                }
                triggerScreenFlash('#ff0055', 0.3);
                return;
            }
        }

        // ── Samurai Rage Upgrades ──
        if (this.rageActive && this.style === 'samurai') {
            if (index === 0) {
                // NINE SWORD STYLE — rage dash that hits even harder
                this.samuraiDash = {
                    phase: 'windup', timer: 0, opponent,
                    damage: Math.floor(atk.damage * 2),
                    knockback: atk.knockback * 1.5,
                    blockReduction: atk.blockReduction,
                    startX: this.x, targetX: opponent.x, dir,
                };
                this.casting = false; this.castTimer = 0;
                return;
            }
            if (index === 1) {
                // 1080 POUND PHOENIX — massive horizontal slash across entire screen
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, '#c8d6e5');
                this.addCombo();
                opponent.hitTimer = 20; opponent.hit = true; opponent.x += dir * atk.knockback * 2; opponent.vy = -8; opponent.onGround = false;
                // Multiple slashes across the screen
                for (let s = 0; s < 3; s++) {
                    visualEffects.push({ type: 'shishiSonson', x1: this.x, y1: this.y - this.height * 0.5 + (s - 1) * 30, x2: dir > 0 ? canvas.width : 0, y2: this.y - this.height * 0.5 + (s - 1) * 30 + (s - 1) * 20, dir, life: 25, maxLife: 25 });
                }
                triggerScreenShake(14, 18); triggerHitstop(10); triggerScreenFlash('#fff', 0.6);
                return;
            }
            if (index === 2) {
                // BLACK ROPE DRAGON TWISTER — massive dark slash tornado
                projectiles.push({
                    x: this.x + dir * 40, y: groundY,
                    vx: dir * 3, vy: 0,
                    radius: 80, owner: this, target: opponent,
                    atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData,
                    life: 360, trail: [], rageVfx: null,
                    isDragonTwisterRage: true,
                });
                triggerScreenShake(8, 10);
                return;
            }
        }

        // ── Face Rage Upgrades ──
        if (this.rageActive && this.style === 'selfie') {
            if (index === 0) {
                // FACE BARRAGE — 5 flying faces in a spread
                for (let b = -2; b <= 2; b++) {
                    projectiles.push({
                        x: this.x + dir * 30, y: this.y - this.height * 0.55 + b * 16,
                        vx: dir * (atk.speed + Math.random() * 3), vy: b * 1.5,
                        radius: atk.radius, owner: this, target: opponent,
                        atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData,
                        life: 250, trail: [], rageVfx: null,
                    });
                }
                triggerScreenFlash('#ffaa88', 0.2);
                return;
            }
            if (index === 1) {
                // MEGA GRIN — massive grin beam + THE FACE
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, '#ffaa88');
                this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true; opponent.vy = -10; opponent.onGround = false;
                visualEffects.push({ type: 'grinBeam', x1: this.x, y1: this.y - this.height * 0.8, x2: opponent.x, y2: opponent.y - opponent.height * 0.5, dir, life: 35, maxLife: 35 });
                visualEffects.push({ type: 'theFace', x: opponent.x, y: canvas.height * 0.4, life: 45, maxLife: 45 });
                triggerScreenShake(16, 20); triggerHitstop(12); triggerScreenFlash('#ffaa88', 0.6);
                return;
            }
            if (index === 2) {
                // HEAD RAIN — 3 giant heads drop from sky
                for (let h = -1; h <= 1; h++) {
                    projectiles.push({
                        x: opponent.x + h * 80, y: -80 - Math.abs(h) * 40,
                        vx: 0, vy: 8 + Math.random() * 3,
                        radius: atk.radius, owner: this, target: opponent,
                        atk: { ...atk, damage: Math.floor(atk.damage * 1.5), draw: 'headSlam' }, styleData,
                        life: 200, trail: [], isHeadSlam: true, rageVfx: null,
                    });
                }
                triggerScreenShake(6, 8);
                return;
            }
        }

        // ── Ice Rage Upgrades ──
        if (this.rageActive && this.style === 'ice') {
            if (index === 0) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                for (let b = -2; b <= 2; b++) {
                    projectiles.push({ x: this.x + dir * 30, y: this.y - this.height * 0.55 + b * 14,
                        vx: dir * (atk.speed + 2), vy: b * 1.5, radius: atk.radius, owner: this, target: opponent,
                        atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData, life: 200, trail: [], rageVfx: null });
                }
                triggerScreenFlash('#88cfff', 0.2); return;
            }
            if (index === 1) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true; opponent.vy = -10; opponent.onGround = false;
                for (let sp = -2; sp <= 2; sp++) spawnIceSpike(opponent.x + sp * 70, groundY);
                visualEffects.push({ type: 'frostOverlay', life: 55, maxLife: 55 });
                triggerScreenShake(20, 25); triggerHitstop(12); triggerScreenFlash('#88cfff', 0.5); return;
            }
            if (index === 2) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true;
                for (let w = -1; w <= 1; w++) {
                    projectiles.push({ x: opponent.x + w * 60, y: groundY + 20, vx: 0, vy: -6,
                        radius: atk.radius, owner: this, target: opponent, atk: { ...atk, damage: 0 }, styleData,
                        life: 180, trail: [], rageVfx: null });
                }
                triggerScreenShake(14, 18); triggerHitstop(8); triggerScreenFlash('#88cfff', 0.4); return;
            }
        }

        // ── Gravity Rage Upgrades ──
        if (this.rageActive && this.style === 'gravity') {
            if (index === 0) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 15; opponent.hit = true;
                opponent.x += (this.x - opponent.x) * 0.5;
                visualEffects.push({ type: 'voidGate', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 30, maxLife: 30 });
                triggerScreenShake(10, 14); triggerHitstop(6); triggerScreenFlash('#9b59b6', 0.3); return;
            }
            if (index === 1) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 20; opponent.hit = true; opponent.vy = 15; opponent.onGround = false;
                visualEffects.push({ type: 'impactRing', x: opponent.x, y: groundY, life: 25, maxLife: 25, color: '#9b59b6' });
                triggerScreenShake(20, 25); triggerHitstop(12); triggerScreenFlash('#9b59b6', 0.5); return;
            }
            if (index === 2) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true; opponent.vy = -20; opponent.onGround = false;
                visualEffects.push({ type: 'voidGate', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 40, maxLife: 40 });
                triggerScreenShake(18, 22); triggerHitstop(10); triggerScreenFlash('#9b59b6', 0.5); return;
            }
        }

        // ── Time Rage Upgrades ──
        if (this.rageActive && this.style === 'time') {
            if (index === 0) {
                for (let b = 0; b < 5; b++) {
                    setTimeout(() => {
                        projectiles.push({ x: this.x + dir * 30, y: this.y - this.height * 0.55,
                            vx: dir * (atk.speed + 4), vy: (Math.random() - 0.5) * 3, radius: atk.radius, owner: this, target: opponent,
                            atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData, life: 200, trail: [], rageVfx: null });
                    }, b * 80);
                }
                triggerScreenFlash('#f0e68c', 0.2); return;
            }
            if (index === 1) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 25; opponent.hit = true;
                visualEffects.push({ type: 'impactRing', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 35, maxLife: 35, color: '#f0e68c' });
                triggerScreenShake(12, 16); triggerHitstop(15); triggerScreenFlash('#f0e68c', 0.4); return;
            }
            if (index === 2) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true; opponent.vy = -8; opponent.onGround = false;
                for (let b = -1; b <= 1; b++) {
                    projectiles.push({ x: this.x + dir * 30 + b * 20, y: this.y - this.height * 0.55 + b * 15,
                        vx: dir * (atk.speed + 2), vy: b * 1, radius: atk.radius + 10, owner: this, target: opponent,
                        atk: { ...atk, damage: Math.floor(atk.damage * 0.5) }, styleData, life: 200, trail: [], rageVfx: null });
                }
                triggerScreenShake(14, 18); triggerHitstop(10); triggerScreenFlash('#f0e68c', 0.5); return;
            }
        }

        // ── Vampire Rage Upgrades ──
        if (this.rageActive && this.style === 'vampire') {
            if (index === 0) {
                for (let b = -2; b <= 2; b++) {
                    projectiles.push({ x: this.x + dir * 30, y: this.y - this.height * 0.55 + b * 14,
                        vx: dir * (atk.speed + 1), vy: b * 1.5, radius: atk.radius, owner: this, target: opponent,
                        atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData, life: 200, trail: [], rageVfx: null });
                }
                triggerScreenFlash('#8b0000', 0.2); return;
            }
            if (index === 1) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                this.health = Math.min(MAX_HEALTH, this.health + Math.floor(damage * 0.5));
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true;
                visualEffects.push({ type: 'impactRing', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 30, maxLife: 30, color: '#8b0000' });
                triggerScreenShake(14, 18); triggerHitstop(10); triggerScreenFlash('#8b0000', 0.5); return;
            }
            if (index === 2) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                this.health = Math.min(MAX_HEALTH, this.health + Math.floor(damage * 0.7));
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 20; opponent.hit = true;
                visualEffects.push({ type: 'voidGrip', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 35, maxLife: 35 });
                triggerScreenShake(16, 20); triggerHitstop(10); triggerScreenFlash('#8b0000', 0.5); return;
            }
        }

        // ── Dragon Rage Upgrades ──
        if (this.rageActive && this.style === 'dragon') {
            if (index === 0) {
                for (let b = -1; b <= 1; b++) {
                    projectiles.push({ x: this.x + dir * 30, y: this.y - this.height * 0.55 + b * 18,
                        vx: dir * (atk.speed + 3), vy: b * 1.5, radius: atk.radius + 10, owner: this, target: opponent,
                        atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData, life: 200, trail: [], rageVfx: null });
                }
                triggerScreenFlash('#ff4500', 0.2); return;
            }
            if (index === 1) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 20; opponent.hit = true; opponent.x += dir * atk.knockback * 2;
                const beamY = this.y - this.height * 0.55;
                visualEffects.push({ type: 'laserBeam', x1: this.x + dir * 30, y1: beamY, x2: dir > 0 ? canvas.width + 50 : -50, y2: beamY, dir, life: 30, maxLife: 30 });
                triggerScreenShake(18, 22); triggerHitstop(10); triggerScreenFlash('#ff4500', 0.5);
                spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, 80); return;
            }
            if (index === 2) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true; opponent.vy = -14; opponent.onGround = false;
                for (let pp = -1; pp <= 1; pp++) spawnFirePillar(opponent.x + pp * 100, groundY);
                triggerScreenShake(22, 28); triggerHitstop(12); triggerScreenFlash('#ff4500', 0.6); return;
            }
        }

        // ── Necro Rage Upgrades ──
        if (this.rageActive && this.style === 'necro') {
            if (index === 0) {
                for (let b = 0; b < 5; b++) {
                    projectiles.push({ x: this.x + dir * 30 + (Math.random()-0.5)*20, y: this.y - this.height * 0.55 + (Math.random()-0.5)*30,
                        vx: dir * (atk.speed + Math.random()*4), vy: (Math.random()-0.5)*4, radius: atk.radius, owner: this, target: opponent,
                        atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData, life: 200, trail: [], rageVfx: null });
                }
                triggerScreenFlash('#556b2f', 0.2); return;
            }
            if (index === 1) {
                for (let s = -1; s <= 1; s++) {
                    projectiles.push({ x: this.x + s * 50, y: this.y - this.height * 0.55,
                        vx: dir * (5 + Math.abs(s)*2), vy: s * 1, radius: 60, owner: this, target: opponent,
                        atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData, life: 300, trail: [], rageVfx: null });
                }
                triggerScreenFlash('#556b2f', 0.3); return;
            }
            if (index === 2) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                this.health = Math.min(MAX_HEALTH, this.health + Math.floor(damage * 0.5));
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 20; opponent.hit = true;
                visualEffects.push({ type: 'abyss', x: opponent.x, y: groundY, life: 40, maxLife: 40 });
                triggerScreenShake(16, 20); triggerHitstop(10); triggerScreenFlash('#556b2f', 0.5); return;
            }
        }

        // ── Magnet Rage Upgrades ──
        if (this.rageActive && this.style === 'magnet') {
            if (index === 0) {
                for (let b = -3; b <= 3; b++) {
                    projectiles.push({ x: this.x + dir * 30, y: this.y - this.height * 0.55,
                        vx: dir * atk.speed, vy: b * 2.5, radius: atk.radius, owner: this, target: opponent,
                        atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData, life: 200, trail: [], rageVfx: null });
                }
                triggerScreenFlash('#c0c0c0', 0.2); return;
            }
            if (index === 1) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true; opponent.x += dir * atk.knockback * 2;
                visualEffects.push({ type: 'impactRing', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 25, maxLife: 25, color: '#c0c0c0' });
                triggerScreenShake(16, 20); triggerHitstop(10); triggerScreenFlash('#c0c0c0', 0.5); return;
            }
            if (index === 2) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true;
                opponent.x += (this.x - opponent.x) * 0.7;
                visualEffects.push({ type: 'impactRing', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 30, maxLife: 30, color: '#c0c0c0' });
                triggerScreenShake(14, 18); triggerHitstop(8); triggerScreenFlash('#c0c0c0', 0.4); return;
            }
        }

        // ── Mech Rage Upgrades ──
        if (this.rageActive && this.style === 'mech') {
            if (index === 0) {
                for (let b = -1; b <= 1; b++) {
                    projectiles.push({ x: this.x + dir * 30, y: this.y - this.height * 0.55 + b * 20,
                        vx: dir * (atk.speed + 4), vy: b * 1, radius: atk.radius + 10, owner: this, target: opponent,
                        atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData, life: 200, trail: [], rageVfx: null });
                }
                triggerScreenFlash('#708090', 0.2); return;
            }
            if (index === 1) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 15; opponent.hit = true; opponent.x += dir * atk.knockback * 2;
                const beamY = this.y - this.height * 0.7;
                visualEffects.push({ type: 'laserBeam', x1: this.x + dir * 30, y1: beamY, x2: dir > 0 ? canvas.width + 50 : -50, y2: beamY, dir, life: 25, maxLife: 25 });
                triggerScreenShake(14, 18); triggerHitstop(8); triggerScreenFlash('#ff0000', 0.4); return;
            }
            if (index === 2) {
                for (let b = 0; b < 7; b++) {
                    setTimeout(() => {
                        const spawnY = -50 - Math.random() * 40;
                        const dx = opponent.x - this.x;
                        const dy = (opponent.y - opponent.height * 0.5) - spawnY;
                        const d = Math.sqrt(dx*dx+dy*dy);
                        projectiles.push({ x: this.x + (Math.random()-0.5)*100, y: spawnY,
                            vx: (dx/d)*12, vy: (dy/d)*12, radius: 24, owner: this, target: opponent,
                            atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData, life: 180, trail: [], rageVfx: null });
                    }, b * 60);
                }
                triggerScreenShake(10, 12); triggerScreenFlash('#708090', 0.3); return;
            }
        }

        // ── Pizza Rage Upgrades ──
        if (this.rageActive && this.style === 'pizza') {
            if (index === 0) {
                for (let b = 0; b < 8; b++) {
                    const a = (b / 8) * Math.PI * 2;
                    projectiles.push({ x: this.x, y: this.y - this.height * 0.5,
                        vx: Math.cos(a) * atk.speed, vy: Math.sin(a) * atk.speed, radius: atk.radius, owner: this, target: opponent,
                        atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData, life: 200, trail: [], rageVfx: null });
                }
                triggerScreenFlash('#ff6347', 0.2); return;
            }
            if (index === 1) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true;
                opponent.x += (this.x - opponent.x) * 0.6;
                visualEffects.push({ type: 'impactRing', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 25, maxLife: 25, color: '#ff6347' });
                triggerScreenShake(12, 16); triggerHitstop(8); triggerScreenFlash('#ff6347', 0.4); return;
            }
            if (index === 2) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true; opponent.vy = -10; opponent.onGround = false;
                spawnFlameBurst(opponent.x, opponent.y - opponent.height * 0.4);
                triggerScreenShake(16, 20); triggerHitstop(10); triggerScreenFlash('#ff6347', 0.5); return;
            }
        }

        // ── Cat Rage Upgrades ──
        if (this.rageActive && this.style === 'cat') {
            if (index === 0) {
                for (let b = -2; b <= 2; b++) {
                    projectiles.push({ x: this.x + dir * 30, y: this.y - this.height * 0.55 + b * 14,
                        vx: dir * (atk.speed + 3), vy: b * 2, radius: atk.radius, owner: this, target: opponent,
                        atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData, life: 200, trail: [], rageVfx: null });
                }
                triggerScreenFlash('#dda0dd', 0.2); return;
            }
            if (index === 1) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true;
                for (let s = 0; s < 4; s++) {
                    setTimeout(() => {
                        visualEffects.push({ type: 'phantomSlash', x: opponent.x + (Math.random()-0.5)*40, y: opponent.y - opponent.height * 0.5 + (Math.random()-0.5)*30, dir: s % 2 === 0 ? 1 : -1, life: 16, maxLife: 16 });
                        triggerScreenShake(4, 4);
                    }, s * 60);
                }
                triggerScreenShake(12, 16); triggerHitstop(8); triggerScreenFlash('#dda0dd', 0.4); return;
            }
            if (index === 2) {
                for (let b = -1; b <= 1; b++) {
                    projectiles.push({ x: this.x + dir * 30, y: this.y - this.height * 0.55 + b * 12,
                        vx: dir * (20 + Math.random()*4), vy: b * 1, radius: atk.radius, owner: this, target: opponent,
                        atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData, life: 150, trail: [], rageVfx: null });
                }
                triggerScreenFlash('#ff0000', 0.2); return;
            }
        }

        // ── Banana Rage Upgrades ──
        if (this.rageActive && this.style === 'banana') {
            if (index === 0) {
                for (let b = 0; b < 6; b++) {
                    const a = (b / 6) * Math.PI * 2;
                    projectiles.push({ x: this.x, y: this.y - this.height * 0.5,
                        vx: Math.cos(a) * atk.speed, vy: Math.sin(a) * atk.speed, radius: atk.radius, owner: this, target: opponent,
                        atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData, life: 200, trail: [], rageVfx: null });
                }
                triggerScreenFlash('#ffe135', 0.2); return;
            }
            if (index === 1) {
                for (let b = -1; b <= 1; b++) {
                    projectiles.push({ x: this.x + dir * 30, y: this.y - this.height * 0.55 + b * 18,
                        vx: dir * atk.speed * 1.3, vy: b * 1.5, radius: atk.radius + 10, owner: this, target: opponent,
                        atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData, life: 250, trail: [], rageVfx: null });
                }
                triggerScreenFlash('#ffe135', 0.3); return;
            }
            if (index === 2) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 20; opponent.hit = true; opponent.vy = -14; opponent.onGround = false;
                triggerScreenShake(20, 25); triggerHitstop(12); triggerScreenFlash('#ffe135', 0.6); return;
            }
        }

        // ── Grandma Rage Upgrades ──
        if (this.rageActive && this.style === 'grandma') {
            if (index === 0) {
                for (let b = -2; b <= 2; b++) {
                    projectiles.push({ x: this.x + dir * 30, y: this.y - this.height * 0.55 + b * 12,
                        vx: dir * (atk.speed + 2), vy: b * 1.5, radius: atk.radius, owner: this, target: opponent,
                        atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData, life: 200, trail: [], rageVfx: null });
                }
                triggerScreenFlash('#deb887', 0.2); return;
            }
            if (index === 1) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true; opponent.x += dir * atk.knockback * 2;
                visualEffects.push({ type: 'impactRing', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 25, maxLife: 25, color: '#deb887' });
                triggerScreenShake(16, 20); triggerHitstop(10); triggerScreenFlash('#deb887', 0.5); return;
            }
            if (index === 2) {
                for (let b = 0; b < 8; b++) {
                    setTimeout(() => {
                        projectiles.push({ x: this.x + dir * 30, y: this.y - this.height * 0.55,
                            vx: dir * (atk.speed + Math.random()*5), vy: (Math.random()-0.5)*4, radius: atk.radius, owner: this, target: opponent,
                            atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData, life: 200, trail: [], rageVfx: null });
                    }, b * 40);
                }
                triggerScreenFlash('#deb887', 0.3); return;
            }
        }

        // ── Painter Rage Upgrades ──
        if (this.rageActive && this.style === 'painter') {
            if (index === 0) {
                const colors = ['#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#9b59b6', '#ff69b4'];
                for (let b = 0; b < 6; b++) {
                    projectiles.push({ x: this.x + dir * 30, y: this.y - this.height * 0.55 + (b-2.5)*12,
                        vx: dir * (atk.speed + Math.random()*4), vy: (b-2.5)*1.5, radius: atk.radius + Math.random()*10, owner: this, target: opponent,
                        atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData: {...styleData, color: colors[b]}, life: 200, trail: [], rageVfx: null });
                }
                triggerScreenFlash('#ff69b4', 0.2); return;
            }
            if (index === 1) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true; opponent.x += dir * atk.knockback * 1.5;
                spawnAcidSlash(this.x, this.y - this.height * 0.3, opponent.x, opponent.y - opponent.height * 0.8, dir);
                spawnAcidSlash(this.x, this.y - this.height * 0.7, opponent.x, opponent.y - opponent.height * 0.2, dir);
                triggerScreenShake(14, 18); triggerHitstop(8); triggerScreenFlash('#ff69b4', 0.4); return;
            }
            if (index === 2) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 20; opponent.hit = true; opponent.vy = -10; opponent.onGround = false;
                visualEffects.push({ type: 'impactRing', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 30, maxLife: 30, color: '#ff69b4' });
                triggerScreenShake(18, 22); triggerHitstop(10); triggerScreenFlash('#ff69b4', 0.6); return;
            }
        }

        // ── Bee Rage Upgrades ──
        if (this.rageActive && this.style === 'bee') {
            if (index === 0) {
                for (let b = 0; b < 7; b++) {
                    projectiles.push({ x: this.x + dir * 30, y: this.y - this.height * 0.55 + (Math.random()-0.5)*40,
                        vx: dir * (atk.speed + Math.random()*6), vy: (Math.random()-0.5)*5, radius: atk.radius, owner: this, target: opponent,
                        atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData, life: 180, trail: [], rageVfx: null });
                }
                triggerScreenFlash('#ffc107', 0.2); return;
            }
            if (index === 1) {
                for (let b = -2; b <= 2; b++) {
                    projectiles.push({ x: this.x + dir * 30, y: this.y - this.height * 0.55 + b * 18,
                        vx: dir * (7 + Math.random()*3), vy: b * 1, radius: atk.radius + 10, owner: this, target: opponent,
                        atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData, life: 250, trail: [], rageVfx: null });
                }
                triggerScreenFlash('#ffc107', 0.3); return;
            }
            if (index === 2) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 20; opponent.hit = true; opponent.vy = -8; opponent.onGround = false;
                visualEffects.push({ type: 'impactRing', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 30, maxLife: 30, color: '#ffc107' });
                triggerScreenShake(16, 20); triggerHitstop(10); triggerScreenFlash('#ffc107', 0.5); return;
            }
        }

        // ── Teacher Rage Upgrades ──
        if (this.rageActive && this.style === 'teacher') {
            if (index === 0) {
                for (let b = 0; b < 6; b++) {
                    setTimeout(() => {
                        projectiles.push({ x: this.x + dir * 30, y: this.y - this.height * 0.55,
                            vx: dir * (atk.speed + Math.random()*4), vy: (Math.random()-0.5)*3, radius: atk.radius, owner: this, target: opponent,
                            atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData, life: 200, trail: [], rageVfx: null });
                    }, b * 50);
                }
                triggerScreenFlash('#2e8b57', 0.2); return;
            }
            if (index === 1) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true; opponent.x += dir * atk.knockback * 2;
                visualEffects.push({ type: 'impactRing', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 25, maxLife: 25, color: '#2e8b57' });
                triggerScreenShake(14, 18); triggerHitstop(10); triggerScreenFlash('#2e8b57', 0.4); return;
            }
            if (index === 2) {
                for (let b = 0; b < 10; b++) {
                    setTimeout(() => {
                        projectiles.push({ x: opponent.x + (Math.random()-0.5)*100, y: -50 - Math.random()*40,
                            vx: (Math.random()-0.5)*3, vy: 6 + Math.random()*4, radius: atk.radius, owner: this, target: opponent,
                            atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData, life: 200, trail: [], rageVfx: null });
                    }, b * 40);
                }
                triggerScreenFlash('#2e8b57', 0.3); return;
            }
        }

        // ── Plumber Rage Upgrades ──
        if (this.rageActive && this.style === 'plumber') {
            if (index === 0) {
                for (let b = -2; b <= 2; b++) {
                    projectiles.push({ x: this.x + dir * 30, y: this.y - this.height * 0.55 + b * 14,
                        vx: dir * (atk.speed + 2), vy: b * 1.5, radius: atk.radius, owner: this, target: opponent,
                        atk: { ...atk, damage: Math.floor(atk.damage * 1.5) }, styleData, life: 200, trail: [], rageVfx: null });
                }
                triggerScreenFlash('#4169e1', 0.2); return;
            }
            if (index === 1) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 18; opponent.hit = true; opponent.x += dir * atk.knockback * 2;
                visualEffects.push({ type: 'impactRing', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 25, maxLife: 25, color: '#4169e1' });
                triggerScreenShake(16, 20); triggerHitstop(10); triggerScreenFlash('#4169e1', 0.5); return;
            }
            if (index === 2) {
                let damage = Math.floor(atk.damage * 1.5);
                if (opponent.blocking) damage = Math.floor(damage * (1 - atk.blockReduction));
                opponent.health = Math.max(0, opponent.health - damage);
                spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color); this.addCombo();
                opponent.hitTimer = 20; opponent.hit = true; opponent.vy = -10; opponent.onGround = false;
                visualEffects.push({ type: 'abyssalFlood', dir, life: 50, maxLife: 50 });
                triggerScreenShake(20, 25); triggerHitstop(12); triggerScreenFlash('#4169e1', 0.6); return;
            }
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
            }
            // Oni Giri — samurai dash attack toward opponent
            else if (atk.special === 'oniGiri') {
                this.samuraiDash = {
                    phase: 'windup', timer: 0, opponent,
                    damage: atk.damage,
                    knockback: atk.knockback,
                    blockReduction: atk.blockReduction,
                    startX: this.x,
                    targetX: opponent.x,
                    dir: dir,
                };
                this.casting = false; this.castTimer = 0;
            }
            // Crystal Cage — erupts from ground at opponent
            else if (atk.special === 'crystalCage') {
                projectiles.push({ x: opponent.x, y: groundY + 20, vx: 0, vy: -6,
                    radius: atk.radius, owner: this, target: opponent, atk, styleData,
                    life: 180, trail: [], rageVfx: this.rageActive && index === 3 ? this.style : null });
            }
            // Ctrl+C Ctrl+V — 5 copied key projectiles
            else if (atk.special === 'ctrlCV') {
                for (let b = -2; b <= 2; b++) {
                    projectiles.push({ x: this.x + dir * 30, y: this.y - this.height * 0.55 + b * 14,
                        vx: dir * atk.speed, vy: b * 1.2, radius: atk.radius, owner: this, target: opponent,
                        atk, styleData, life: 200, trail: [], rageVfx: null });
                }
            }
            // Poop Bomb — drops from above onto opponent
            else if (atk.special === 'poopBomb') {
                projectiles.push({ x: opponent.x + (Math.random() - 0.5) * 60, y: -50,
                    vx: 0, vy: 7, radius: atk.radius, owner: this, target: opponent,
                    atk, styleData, life: 200, trail: [], rageVfx: this.rageActive && index === 3 ? this.style : null });
            }
            // Head Slam — giant face drops from sky onto opponent
            else if (atk.special === 'headSlam') {
                const spawnX = opponent.x;
                const spawnY = -80;
                const dx = opponent.x - spawnX;
                const dy = (groundY - 30) - spawnY;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                projectiles.push({
                    x: spawnX, y: spawnY,
                    vx: 0, vy: 8,
                    radius: atk.radius, owner: this, target: opponent,
                    atk, styleData, life: 200, trail: [],
                    isHeadSlam: true,
                    rageVfx: this.rageActive && index === 3 ? this.style : null,
                });
                triggerScreenShake(4, 6);
            }
            // Soap Blast — leaves soapy puddle on expire
            else if (atk.special === 'soapBlast') {
                projectiles.push({
                    x: this.x + dir * 30, y: this.y - this.height * 0.55,
                    vx: dir * atk.speed, vy: 0,
                    radius: atk.radius, owner: this, target: opponent,
                    atk, styleData, life: 250, trail: [],
                    isSoapBlast: true,
                    rageVfx: this.rageActive && index === 3 ? this.style : null,
                });
            }
            // Glitch Swarm — 5 erratic glitch fragments
            else if (atk.special === 'glitchSwarm') {
                for (let b = 0; b < 5; b++) {
                    projectiles.push({
                        x: this.x + dir * 30, y: this.y - this.height * 0.55 + (Math.random() - 0.5) * 30,
                        vx: dir * (atk.speed + Math.random() * 4), vy: (Math.random() - 0.5) * 5,
                        radius: atk.radius + Math.random() * 6, owner: this, target: opponent,
                        atk, styleData, life: 180, trail: [],
                        isGlitch: true, glitchOffset: Math.random() * 100,
                        rageVfx: this.rageActive && index === 3 ? this.style : null,
                    });
                }
            }
            // Bubble Barrage — 5 bubbles in a spread
            else if (atk.special === 'bubbleBarrage') {
                for (let b = -2; b <= 2; b++) {
                    projectiles.push({
                        x: this.x + dir * 30, y: this.y - this.height * 0.55 + b * 12,
                        vx: dir * (atk.speed + Math.random() * 3), vy: b * 1.2 + (Math.random() - 0.5) * 2,
                        radius: atk.radius + Math.random() * 6, owner: this, target: opponent,
                        atk, styleData, life: 200, trail: [],
                        rageVfx: this.rageActive && index === 3 ? this.style : null,
                    });
                }
            }
            // Missile Barrage — 5 missiles from above
            else if (atk.special === 'missileBarrage') {
                for (let b = 0; b < 5; b++) {
                    setTimeout(() => {
                        const spawnX = opponent.x + (Math.random()-0.5)*120;
                        projectiles.push({ x: spawnX, y: -50 - Math.random()*40,
                            vx: (opponent.x - spawnX) * 0.05, vy: 8 + Math.random()*4,
                            radius: atk.radius, owner: this, target: opponent,
                            atk, styleData, life: 200, trail: [],
                            rageVfx: this.rageActive && index === 3 ? this.style : null });
                    }, b * 80);
                }
            }
            // Cookie Barrage — 7 cookies in a spread
            else if (atk.special === 'cookieBarrage') {
                for (let b = -3; b <= 3; b++) {
                    projectiles.push({ x: this.x + dir * 30, y: this.y - this.height * 0.55 + b * 10,
                        vx: dir * (atk.speed + Math.random()*3), vy: b * 1.2,
                        radius: atk.radius, owner: this, target: opponent,
                        atk, styleData, life: 200, trail: [],
                        rageVfx: this.rageActive && index === 3 ? this.style : null });
                }
            }
            // Homework Avalanche — 8 papers rain from above
            else if (atk.special === 'homeworkAvalanche') {
                for (let b = 0; b < 8; b++) {
                    projectiles.push({ x: opponent.x + (Math.random()-0.5)*150, y: -50 - Math.random()*60,
                        vx: (Math.random()-0.5)*3, vy: 5 + Math.random()*3,
                        radius: atk.radius, owner: this, target: opponent,
                        atk, styleData, life: 200, trail: [],
                        rageVfx: this.rageActive && index === 3 ? this.style : null });
                }
            }
            // Full Pie — giant pizza drops from sky
            else if (atk.special === 'fullPie') {
                projectiles.push({ x: opponent.x, y: -80,
                    vx: 0, vy: 7, radius: atk.radius, owner: this, target: opponent,
                    atk, styleData, life: 200, trail: [],
                    isHeadSlam: true,
                    rageVfx: this.rageActive && index === 3 ? this.style : null });
                triggerScreenShake(4, 6);
            }
            // Canvas Slam — drops from sky onto opponent
            else if (atk.special === 'canvasSlam') {
                projectiles.push({ x: opponent.x, y: -80,
                    vx: 0, vy: 7, radius: atk.radius, owner: this, target: opponent,
                    atk, styleData, life: 200, trail: [],
                    isHeadSlam: true,
                    rageVfx: this.rageActive && index === 3 ? this.style : null });
                triggerScreenShake(4, 6);
            }
            // Ice Wall — erupts from ground at opponent
            else if (atk.special === 'iceWall') {
                projectiles.push({ x: opponent.x, y: groundY + 20, vx: 0, vy: -6,
                    radius: atk.radius, owner: this, target: opponent, atk, styleData,
                    life: 180, trail: [], rageVfx: this.rageActive && index === 3 ? this.style : null });
            }
            else {
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
            // Lock-on targets where opponent IS NOW — but damage is delayed so they can dodge
            const targetX = opponent.x;
            const targetY = opponent.y - opponent.height * 0.5;
            const HIT_DELAY = 20; // frames before damage lands
            const HIT_RADIUS = 80; // how close opponent must still be to get hit
            // Spawn a warning marker at the target position
            visualEffects.push({
                type: 'instantTarget', x: targetX, y: targetY,
                life: HIT_DELAY + 5, maxLife: HIT_DELAY + 5,
                color: styleData.color, hitRadius: HIT_RADIUS,
            });
            // Schedule the delayed hit
            const owner = this;
            const rageActive = this.rageActive;
            const isUlt = index === 3;
            setTimeout(() => {
                if (gameState !== 'playing') return; // Don't fire after round/game end
                // Check if opponent is still near the targeted spot
                const dx = opponent.x - targetX;
                const dy = (opponent.y - opponent.height * 0.5) - targetY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < HIT_RADIUS) {
                    let damage = atk.damage;
                    if (rageActive) damage = Math.floor(damage * 1.5);
                    if (owner.domainActive) damage = Math.floor(damage * 1.4);
                    damage = owner.applyComboBonus(damage);
                    let kb = atk.knockback;
                    if (opponent.blocking) {
                        damage = Math.floor(damage * (1 - atk.blockReduction));
                        kb *= (1 - atk.blockReduction);
                    }
                    opponent.health = Math.max(0, opponent.health - damage);
                    spawnDamageNumber(opponent.x, opponent.y - opponent.height - 10, damage, styleData.color);
                    owner.addCombo();
                    opponent.hitTimer = 12;
                    opponent.hit = true;
                    opponent.x += dir * kb;
                    if (atk.launchUp) {
                        opponent.vy = atk.launchUp;
                        opponent.onGround = false;
                    }
                    spawnElementParticles(opponent.x, opponent.y - opponent.height * 0.5, styleData, rageActive ? 90 : 55);
                    triggerScreenShake(Math.min(atk.damage * 1.2, 30), Math.min(atk.damage * 1.0, 30));
                    triggerHitstop(Math.max(3, Math.floor(atk.damage / 6)));
                    visualEffects.push({ type: 'impactRing', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 25, maxLife: 25, color: styleData.color });
                    if (rageActive && isUlt) {
                        triggerRageUltVFX(owner.style, opponent.x, opponent.y - opponent.height * 0.5, dir);
                    }
                }
                // VFX always plays at target position regardless of hit
                owner.spawnInstantVFX(atk, styleData, opponent, dir);
                triggerScreenFlash(styleData.color, Math.min(atk.damage / 40, 0.6));
            }, HIT_DELAY * 16); // ~16ms per frame
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
        else if (vfx === 'radiantBurst') { visualEffects.push({ type: 'radiantBurst', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 25, maxLife: 25 }); triggerScreenFlash('#ffd700', 0.3); }
        else if (vfx === 'judgment') { spawnLightningBolt(opponent.x, 0, groundY, 10); visualEffects.push({ type: 'judgmentPillar', x: opponent.x, life: 40, maxLife: 40 }); triggerScreenFlash('#ffd700', 0.5); }
        else if (vfx === 'voidGrip') { visualEffects.push({ type: 'voidGrip', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 30, maxLife: 30 }); }
        else if (vfx === 'abyss') { visualEffects.push({ type: 'abyss', x: opponent.x, y: groundY, life: 45, maxLife: 45 }); triggerScreenFlash('#8e44ad', 0.4); }
        else if (vfx === 'phantomStep') { visualEffects.push({ type: 'phantomSlash', x: opponent.x, y: opponent.y - opponent.height * 0.5, dir, life: 18, maxLife: 18 }); }
        else if (vfx === 'eclipse') { visualEffects.push({ type: 'eclipse', life: 45, maxLife: 45 }); triggerScreenFlash('#000', 0.6); }
        else if (vfx === 'warpStrike') { visualEffects.push({ type: 'warpPortal', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 28, maxLife: 28 }); triggerScreenFlash('#e056de', 0.3); }
        else if (vfx === 'voidGate') { visualEffects.push({ type: 'voidGate', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 45, maxLife: 45 }); triggerScreenFlash('#e056de', 0.5); }
        else if (vfx === 'spinCycle') { visualEffects.push({ type: 'spinCycle', x: this.x, y: this.y - this.height * 0.4, life: 28, maxLife: 28 }); triggerScreenFlash('#87ceeb', 0.2); }
        else if (vfx === 'floodRinse') { visualEffects.push({ type: 'floodRinse', life: 45, maxLife: 45 }); triggerScreenFlash('#87ceeb', 0.4); }
        else if (vfx === 'decayPulse') { visualEffects.push({ type: 'decayPulse', x: opponent.x, y: groundY, life: 35, maxLife: 35 }); triggerScreenFlash('#ff0055', 0.25); }
        else if (vfx === 'totalCorruption') { visualEffects.push({ type: 'totalCorruption', life: 50, maxLife: 50 }); triggerScreenFlash('#ff0055', 0.5); }
        else if (vfx === 'shishiSonson') { visualEffects.push({ type: 'shishiSonson', x1: this.x, y1: this.y - this.height * 0.5, x2: opponent.x, y2: opponent.y - opponent.height * 0.5, dir, life: 22, maxLife: 22 }); triggerScreenFlash('#fff', 0.4); }
        else if (vfx === 'ashura') { visualEffects.push({ type: 'ashura', x: opponent.x, y: opponent.y - opponent.height * 0.5, casterX: this.x, casterY: this.y, life: 50, maxLife: 50 }); triggerScreenFlash('#c8d6e5', 0.6); }
        else if (vfx === 'grinBeam') { visualEffects.push({ type: 'grinBeam', x1: this.x, y1: this.y - this.height * 0.8, x2: opponent.x, y2: opponent.y - opponent.height * 0.5, dir, life: 28, maxLife: 28 }); triggerScreenFlash('#ffaa88', 0.3); }
        else if (vfx === 'prismBeam') { visualEffects.push({ type: 'prismBeam', x1: this.x, y1: this.y - this.height * 0.5, x2: opponent.x, y2: opponent.y - opponent.height * 0.5, dir, life: 28, maxLife: 28 }); triggerScreenFlash('#00e5ff', 0.3); }
        else if (vfx === 'diamondStorm') { visualEffects.push({ type: 'diamondStorm', life: 50, maxLife: 50 }); triggerScreenFlash('#00e5ff', 0.5); }
        else if (vfx === 'squeakBlast') { visualEffects.push({ type: 'squeakBlast', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 28, maxLife: 28 }); triggerScreenFlash('#ffeb3b', 0.3); }
        else if (vfx === 'duckArmy') { visualEffects.push({ type: 'duckArmy', x: opponent.x, life: 55, maxLife: 55 }); triggerScreenFlash('#ffeb3b', 0.5); }
        else if (vfx === 'capsLock') { visualEffects.push({ type: 'capsLock', x: opponent.x, y: opponent.y - opponent.height * 0.5, dir, life: 30, maxLife: 30 }); triggerScreenFlash('#607d8b', 0.3); }
        else if (vfx === 'blueScreen') { visualEffects.push({ type: 'blueScreen', life: 55, maxLife: 55 }); triggerScreenFlash('#0078d7', 0.6); }
        else if (vfx === 'flambe') { spawnFlameBurst(opponent.x, opponent.y - opponent.height * 0.4); triggerScreenFlash('#ff5722', 0.3); }
        else if (vfx === 'kitchenNightmare') { visualEffects.push({ type: 'kitchenNightmare', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 50, maxLife: 50 }); triggerScreenFlash('#ff5722', 0.5); }
        else if (vfx === 'bassDrop') { visualEffects.push({ type: 'bassDrop', x: this.x, y: this.y - this.height * 0.4, life: 30, maxLife: 30 }); triggerScreenFlash('#e040fb', 0.3); }
        else if (vfx === 'dropTheBeat') { visualEffects.push({ type: 'dropTheBeat', life: 55, maxLife: 55 }); triggerScreenFlash('#e040fb', 0.5); }
        else if (vfx === 'featherStorm') { visualEffects.push({ type: 'featherStorm', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 35, maxLife: 35 }); triggerScreenFlash('#9e9e9e', 0.2); }
        else if (vfx === 'flockAttack') { visualEffects.push({ type: 'flockAttack', x: opponent.x, life: 50, maxLife: 50 }); triggerScreenFlash('#9e9e9e', 0.4); }
        else if (vfx === 'theFace') { visualEffects.push({ type: 'theFace', x: opponent.x, y: canvas.height * 0.4, life: 60, maxLife: 60 }); triggerScreenFlash('#ffaa88', 0.5); }
        // ── New Style VFX ──
        // ICE
        else if (vfx === 'frostNova') { visualEffects.push({ type: 'frostNova', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 30, maxLife: 30 }); triggerScreenShake(8, 12); triggerScreenFlash('#88cfff', 0.3); }
        else if (vfx === 'blizzard') { visualEffects.push({ type: 'frostOverlay', life: 55, maxLife: 55 }); for (let i = 0; i < 5; i++) spawnIceSpike(opponent.x + (Math.random()-0.5)*200, groundY); visualEffects.push({ type: 'frostNova', x: opponent.x, y: opponent.y - opponent.height * 0.3, life: 35, maxLife: 35 }); triggerScreenFlash('#88cfff', 0.5); }
        // GRAVITY
        else if (vfx === 'crushField') { visualEffects.push({ type: 'gravityWell', x: opponent.x, y: opponent.y - opponent.height * 0.5, radius: 100, life: 30, maxLife: 30 }); triggerScreenShake(6, 10); triggerScreenFlash('#9b59b6', 0.3); }
        else if (vfx === 'levitateSla') { visualEffects.push({ type: 'impactRing', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 25, maxLife: 25, color: '#9b59b6' }); triggerScreenFlash('#9b59b6', 0.4); }
        else if (vfx === 'singularity') { visualEffects.push({ type: 'gravityWell', x: opponent.x, y: opponent.y - opponent.height * 0.5, radius: 180, life: 50, maxLife: 50 }); triggerScreenShake(12, 18); triggerScreenFlash('#9b59b6', 0.6); }
        // TIME
        else if (vfx === 'slowZone') { visualEffects.push({ type: 'slowZoneVfx', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 35, maxLife: 35 }); triggerScreenFlash('#f0e68c', 0.3); }
        else if (vfx === 'timeStop') { visualEffects.push({ type: 'timeStopVfx', life: 45, maxLife: 45 }); triggerScreenFlash('#f0e68c', 0.7); }
        // VAMPIRE
        else if (vfx === 'batSwarm') { visualEffects.push({ type: 'batSwarmVfx', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 35, maxLife: 35 }); triggerScreenFlash('#8b0000', 0.3); }
        else if (vfx === 'lifeDrain') { visualEffects.push({ type: 'lifeDrainVfx', x1: this.x, y1: this.y - this.height * 0.5, x2: opponent.x, y2: opponent.y - opponent.height * 0.5, life: 35, maxLife: 35 }); this.health = Math.min(MAX_HEALTH, this.health + 5); triggerScreenFlash('#8b0000', 0.4); }
        else if (vfx === 'bloodMoon') { visualEffects.push({ type: 'bloodMoonVfx', life: 50, maxLife: 50 }); triggerScreenShake(10, 15); triggerScreenFlash('#8b0000', 0.6); }
        // DRAGON
        else if (vfx === 'dragonBreath') { const beamY = this.y - this.height * 0.55; visualEffects.push({ type: 'laserBeam', x1: this.x + dir * 30, y1: beamY, x2: dir > 0 ? canvas.width + 50 : -50, y2: beamY, dir, life: 25, maxLife: 25 }); triggerScreenFlash('#ff4500', 0.4); }
        else if (vfx === 'tailSweep') { visualEffects.push({ type: 'tailSweepVfx', x: opponent.x, y: groundY - 10, life: 25, maxLife: 25 }); triggerScreenShake(6, 10); triggerScreenFlash('#ff4500', 0.3); }
        else if (vfx === 'dragonRoar') { visualEffects.push({ type: 'dragonRoarVfx', x: this.x, y: this.y - this.height * 0.5, life: 35, maxLife: 35 }); triggerScreenShake(14, 20); triggerScreenFlash('#ff4500', 0.6); }
        // NECRO
        else if (vfx === 'soulDrain') { visualEffects.push({ type: 'soulDrainVfx', x1: this.x, y1: this.y - this.height * 0.5, x2: opponent.x, y2: opponent.y - opponent.height * 0.5, life: 35, maxLife: 35 }); this.health = Math.min(MAX_HEALTH, this.health + 4); triggerScreenFlash('#556b2f', 0.3); }
        else if (vfx === 'armyOfDead') { for (let i = 0; i < 3; i++) visualEffects.push({ type: 'skeletonRiseVfx', x: opponent.x + (i - 1) * 60, y: groundY, life: 50, maxLife: 50 }); triggerScreenShake(10, 15); triggerScreenFlash('#556b2f', 0.5); }
        // MAGNET
        else if (vfx === 'repulse') { visualEffects.push({ type: 'impactRing', x: this.x, y: this.y - this.height * 0.5, life: 25, maxLife: 25, color: '#c0c0c0' }); triggerScreenFlash('#c0c0c0', 0.3); }
        else if (vfx === 'ironPull') { visualEffects.push({ type: 'gravityWell', x: opponent.x, y: opponent.y - opponent.height * 0.5, radius: 80, life: 25, maxLife: 25 }); triggerScreenFlash('#c0c0c0', 0.3); }
        else if (vfx === 'magneticStorm') { visualEffects.push({ type: 'diamondStorm', life: 50, maxLife: 50 }); triggerScreenFlash('#c0c0c0', 0.5); }
        // MECH
        else if (vfx === 'laserEye') { const beamY = this.y - this.height * 0.7; visualEffects.push({ type: 'laserBeam', x1: this.x + dir * 20, y1: beamY, x2: dir > 0 ? canvas.width + 50 : -50, y2: beamY, dir, life: 22, maxLife: 22 }); triggerScreenFlash('#ff0000', 0.3); }
        else if (vfx === 'selfDestruct') { visualEffects.push({ type: 'meteorImpact', x: this.x, y: this.y - this.height * 0.5, life: 45, maxLife: 45 }); this.health = Math.max(0, this.health - 10); triggerScreenFlash('#ff4400', 0.7); }
        // PIZZA
        else if (vfx === 'cheeseStretch') { visualEffects.push({ type: 'cheeseStretchVfx', x1: this.x, y1: this.y - this.height * 0.4, x2: opponent.x, y2: opponent.y - opponent.height * 0.4, life: 28, maxLife: 28 }); triggerScreenFlash('#ff6347', 0.3); }
        else if (vfx === 'hotSauce') { spawnFlameBurst(opponent.x, opponent.y - opponent.height * 0.4); triggerScreenFlash('#ff6347', 0.4); }
        // CAT
        else if (vfx === 'scratchFury') { for (let s = 0; s < 3; s++) visualEffects.push({ type: 'phantomSlash', x: opponent.x + (Math.random()-0.5)*30, y: opponent.y - opponent.height * 0.5 + (s-1)*20, dir: s % 2 === 0 ? 1 : -1, life: 16, maxLife: 16 }); triggerScreenFlash('#dda0dd', 0.3); }
        else if (vfx === 'catArmy') { visualEffects.push({ type: 'catArmyVfx', life: 55, maxLife: 55 }); triggerScreenShake(8, 12); triggerScreenFlash('#dda0dd', 0.5); }
        // BANANA
        else if (vfx === 'splitSlam') { visualEffects.push({ type: 'impactRing', x: opponent.x, y: groundY - 20, life: 25, maxLife: 25, color: '#ffe135' }); for (let i = 0; i < 15; i++) { const pa = Math.random() * Math.PI * 2; const ps = 3 + Math.random() * 6; particles.push({ x: opponent.x, y: groundY - 20, vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps, life: 10 + Math.random() * 8, maxLife: 18, color: '#ffe135' }); } triggerScreenFlash('#ffe135', 0.4); }
        else if (vfx === 'potassiumOverload') { visualEffects.push({ type: 'potassiumBlast', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 35, maxLife: 35 }); triggerScreenShake(12, 16); triggerScreenFlash('#ffe135', 0.6); }
        // GRANDMA
        else if (vfx === 'purseSwing') { visualEffects.push({ type: 'impactRing', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 22, maxLife: 22, color: '#deb887' }); triggerScreenFlash('#deb887', 0.3); }
        else if (vfx === 'theChancla') { visualEffects.push({ type: 'chanclaVfx', x: opponent.x, y: opponent.y - opponent.height * 0.3, life: 40, maxLife: 40 }); triggerScreenShake(14, 18); triggerScreenFlash('#deb887', 0.6); }
        // PAINTER
        else if (vfx === 'brushStroke') { visualEffects.push({ type: 'paintStrokeVfx', x1: this.x, y1: this.y - this.height * 0.5, x2: opponent.x, y2: opponent.y - opponent.height * 0.5, dir, life: 25, maxLife: 25 }); triggerScreenFlash('#ff69b4', 0.3); }
        else if (vfx === 'masterpiece') { visualEffects.push({ type: 'paintExplosion', life: 55, maxLife: 55 }); triggerScreenShake(10, 15); triggerScreenFlash('#ff69b4', 0.6); }
        // BEE
        else if (vfx === 'swarmCloud') { visualEffects.push({ type: 'beeSwarmVfx', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 40, maxLife: 40 }); triggerScreenFlash('#ffc107', 0.3); }
        else if (vfx === 'queensWrath') { visualEffects.push({ type: 'queensWrathVfx', x: opponent.x, y: opponent.y - opponent.height * 0.3, life: 55, maxLife: 55 }); triggerScreenShake(10, 15); triggerScreenFlash('#ffc107', 0.5); }
        // TEACHER
        else if (vfx === 'rulerSlap') { visualEffects.push({ type: 'rulerSlapVfx', x: opponent.x, y: opponent.y - opponent.height * 0.3, life: 25, maxLife: 25 }); triggerScreenShake(6, 10); triggerScreenFlash('#2e8b57', 0.3); }
        else if (vfx === 'detention') { visualEffects.push({ type: 'detentionVfx', x: opponent.x, y: opponent.y, life: 50, maxLife: 50 }); triggerScreenShake(8, 12); triggerScreenFlash('#2e8b57', 0.5); }
        // PLUMBER
        else if (vfx === 'pipeWrench') { visualEffects.push({ type: 'spinCycle', x: this.x, y: this.y - this.height * 0.4, life: 28, maxLife: 28 }); triggerScreenFlash('#4169e1', 0.3); }
        else if (vfx === 'floodBurst') { visualEffects.push({ type: 'floodRinse', life: 40, maxLife: 40 }); triggerScreenFlash('#4169e1', 0.4); }
        else if (vfx === 'cloggedExplosion') { visualEffects.push({ type: 'clogExplosionVfx', x: opponent.x, y: opponent.y - opponent.height * 0.5, life: 40, maxLife: 40 }); triggerScreenShake(12, 16); triggerScreenFlash('#8b4513', 0.6); }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.facing, 1);
        ctx.globalAlpha = this.hit ? 0.5 + Math.sin(Date.now() * 0.05) * 0.3 : 1;

        // Rage aura — white/gold for Light, red for others
        if (this.rageActive) {
            const pulse = 0.4 + Math.sin(Date.now() * 0.006) * 0.2;
            const isLight = this.style === 'light';
            const auraGrd = ctx.createRadialGradient(0, -this.height * 0.5, 5, 0, -this.height * 0.5, isLight ? 85 : 70);
            if (isLight) {
                auraGrd.addColorStop(0, `rgba(255, 255, 240, ${pulse * 0.5})`);
                auraGrd.addColorStop(0.4, `rgba(255, 215, 0, ${pulse * 0.3})`);
                auraGrd.addColorStop(1, 'rgba(255, 215, 0, 0)');
            } else {
                auraGrd.addColorStop(0, `rgba(255, 30, 0, ${pulse * 0.4})`);
                auraGrd.addColorStop(0.5, `rgba(255, 0, 0, ${pulse * 0.2})`);
                auraGrd.addColorStop(1, 'rgba(255, 0, 0, 0)');
            }
            ctx.fillStyle = auraGrd;
            ctx.beginPath(); ctx.arc(0, -this.height * 0.5, isLight ? 85 : 70, 0, Math.PI * 2); ctx.fill();
            // Light rage has radiant rays
            if (isLight) {
                ctx.globalAlpha = pulse * 0.3;
                ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
                for (let r = 0; r < 6; r++) {
                    const ra = Date.now() * 0.003 + (r / 6) * Math.PI * 2;
                    ctx.beginPath(); ctx.moveTo(Math.cos(ra) * 25, -this.height * 0.5 + Math.sin(ra) * 25);
                    ctx.lineTo(Math.cos(ra) * 75, -this.height * 0.5 + Math.sin(ra) * 75); ctx.stroke();
                }
                ctx.globalAlpha = this.hit ? 0.5 + Math.sin(Date.now() * 0.05) * 0.3 : 1;
            }
        }
        // Domain active aura
        if (this.domainActive) {
            const pulse = 0.3 + Math.sin(Date.now() * 0.004) * 0.15;
            const domainColor = STYLES[this.style]?.color || '#0af';
            ctx.globalAlpha = pulse;
            const dg = ctx.createRadialGradient(0, -this.height * 0.5, 10, 0, -this.height * 0.5, 80);
            dg.addColorStop(0, domainColor); dg.addColorStop(0.5, `${domainColor}66`); dg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = dg;
            ctx.beginPath(); ctx.arc(0, -this.height * 0.5, 80, 0, Math.PI * 2); ctx.fill();
            // Floating kanji/symbol
            ctx.font = 'bold 18px serif'; ctx.textAlign = 'center'; ctx.fillStyle = domainColor;
            ctx.globalAlpha = pulse * 0.7;
            ctx.fillText('Domain', 0, -this.height - 20);
            ctx.globalAlpha = this.hit ? 0.5 + Math.sin(Date.now() * 0.05) * 0.3 : 1;
        }
        // Rage available indicator — subtle pulse
        if (this.rageAvailable && !this.rageActive) {
            const pulse = 0.15 + Math.sin(Date.now() * 0.004) * 0.1;
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, -this.height * 0.5, 55, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = this.hit ? 0.5 + Math.sin(Date.now() * 0.05) * 0.3 : 1;
        }

        // Domain available indicator — blue/element pulse
        if (this.domainAvailable && !this.domainActive) {
            const pulse = 0.2 + Math.sin(Date.now() * 0.005) * 0.15;
            const domainColor = STYLES[this.style]?.color || '#0af';
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = domainColor; ctx.lineWidth = 3;
            ctx.setLineDash([8, 4]);
            ctx.beginPath(); ctx.arc(0, -this.height * 0.5, 60, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = this.hit ? 0.5 + Math.sin(Date.now() * 0.05) * 0.3 : 1;
        }

        // ── Washing Machine Rage: draw washing machine instead of stickman ──
        if (this.rageActive && this.style === 'washingmachine') {
            const wobble = Math.sin(Date.now() * 0.02) * 3;
            const drumAngle = Date.now() * 0.015;
            ctx.translate(wobble, 0);
            // Machine body
            ctx.fillStyle = '#ddd'; ctx.strokeStyle = '#999'; ctx.lineWidth = 3;
            ctx.fillRect(-30, -90, 60, 85);
            ctx.strokeRect(-30, -90, 60, 85);
            // Control panel top
            ctx.fillStyle = '#bbb';
            ctx.fillRect(-30, -90, 60, 18);
            ctx.strokeRect(-30, -90, 60, 18);
            // Buttons
            ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(-15, -81, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#2ecc71'; ctx.beginPath(); ctx.arc(0, -81, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#3498db'; ctx.beginPath(); ctx.arc(15, -81, 4, 0, Math.PI * 2); ctx.fill();
            // Drum window
            ctx.fillStyle = '#1a3a5c';
            ctx.beginPath(); ctx.arc(0, -48, 24, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#888'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0, -48, 24, 0, Math.PI * 2); ctx.stroke();
            // Spinning clothes inside drum
            const clothes = ['#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#9b59b6'];
            for (let c = 0; c < clothes.length; c++) {
                const ca = drumAngle + (c / clothes.length) * Math.PI * 2;
                ctx.fillStyle = clothes[c];
                ctx.beginPath(); ctx.arc(Math.cos(ca) * 14, -48 + Math.sin(ca) * 14, 5, 0, Math.PI * 2); ctx.fill();
            }
            // Glass reflection
            ctx.globalAlpha = 0.2; ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-6, -54, 10, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
            // Legs
            ctx.fillStyle = '#999';
            ctx.fillRect(-25, -5, 8, 5);
            ctx.fillRect(17, -5, 8, 5);
            // Soap suds floating around
            if (Math.random() < 0.5) {
                particles.push({ x: this.x + (Math.random() - 0.5) * 60, y: this.y - 20 - Math.random() * 70,
                    vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2,
                    life: 12 + Math.random() * 10, maxLife: 22, color: '#e8f4f8' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Lightning Rage: electric humanoid ──
        if (this.rageActive && this.style === 'lightning') {
            const t = Date.now() * 0.01;
            ctx.shadowColor = '#00cfff'; ctx.shadowBlur = 25;
            // Electric body outline — jagged lines
            ctx.strokeStyle = '#00cfff'; ctx.lineWidth = 3;
            const jitter = () => (Math.random() - 0.5) * 6;
            // Head (crackling circle)
            ctx.beginPath(); ctx.arc(jitter(), -this.height + jitter(), 14, 0, Math.PI * 2); ctx.stroke();
            // Torso — zigzag line
            ctx.beginPath(); ctx.moveTo(jitter(), -this.height + 25);
            ctx.lineTo(5 + jitter(), -this.height * 0.7 + jitter());
            ctx.lineTo(-3 + jitter(), -this.height * 0.55 + jitter());
            ctx.lineTo(jitter(), -this.height * 0.4); ctx.stroke();
            // Arms — forked lightning
            const armY = -this.height + 35;
            ctx.beginPath(); ctx.moveTo(0, armY);
            ctx.lineTo(20 + jitter(), armY - 10 + jitter());
            ctx.lineTo(35 + jitter(), armY - 15 + jitter()); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, armY);
            ctx.lineTo(-20 + jitter(), armY + 5 + jitter());
            ctx.lineTo(-35 + jitter(), armY + jitter()); ctx.stroke();
            // Legs — zigzag
            ctx.beginPath(); ctx.moveTo(0, -this.height * 0.4);
            ctx.lineTo(10 + jitter(), -25 + jitter()); ctx.lineTo(8 + jitter(), 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -this.height * 0.4);
            ctx.lineTo(-10 + jitter(), -25 + jitter()); ctx.lineTo(-8 + jitter(), 0); ctx.stroke();
            // Inner glow fill
            ctx.fillStyle = 'rgba(0,207,255,0.15)';
            ctx.beginPath(); ctx.ellipse(0, -this.height * 0.5, 20, 45, 0, 0, Math.PI * 2); ctx.fill();
            // Crackling sparks
            for (let i = 0; i < 3; i++) {
                const sx = (Math.random() - 0.5) * 50, sy = -Math.random() * this.height;
                ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#00cfff';
                ctx.fillRect(sx, sy, 2, 2);
            }
            if (Math.random() < 0.4) {
                particles.push({ x: this.x + (Math.random() - 0.5) * 40, y: this.y - Math.random() * this.height,
                    vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 2,
                    life: 8 + Math.random() * 6, maxLife: 14, color: '#00cfff' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Fire Rage: fire elemental ──
        if (this.rageActive && this.style === 'fire') {
            const t = Date.now() * 0.008;
            ctx.shadowColor = '#ff4500'; ctx.shadowBlur = 30;
            // Flame body — gradient oval
            const fg = ctx.createRadialGradient(0, -this.height * 0.5, 5, 0, -this.height * 0.5, 50);
            fg.addColorStop(0, '#fff7a0'); fg.addColorStop(0.3, '#ffa500');
            fg.addColorStop(0.6, '#ff4500'); fg.addColorStop(1, 'rgba(255,69,0,0)');
            ctx.fillStyle = fg;
            ctx.beginPath(); ctx.ellipse(0, -this.height * 0.5, 28, 48, 0, 0, Math.PI * 2); ctx.fill();
            // Flickering flame tips
            for (let i = 0; i < 5; i++) {
                const a = t + (i / 5) * Math.PI * 2;
                const fx = Math.cos(a) * 15, fy = -this.height * 0.3 + Math.sin(a) * 20 - 30;
                const h = 15 + Math.sin(t * 2 + i) * 8;
                ctx.fillStyle = i % 2 === 0 ? '#ff6600' : '#ffcc00';
                ctx.beginPath(); ctx.moveTo(fx - 6, fy); ctx.lineTo(fx, fy - h); ctx.lineTo(fx + 6, fy); ctx.closePath(); ctx.fill();
            }
            // Eyes — white hot
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-6, -this.height + 5, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(6, -this.height + 5, 4, 0, Math.PI * 2); ctx.fill();
            // Ember particles
            if (Math.random() < 0.6) {
                particles.push({ x: this.x + (Math.random() - 0.5) * 40, y: this.y - Math.random() * this.height,
                    vx: (Math.random() - 0.5) * 2, vy: -3 - Math.random() * 2,
                    life: 15 + Math.random() * 10, maxLife: 25, color: Math.random() > 0.5 ? '#ff4500' : '#ffa500' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Water Rage: water elemental ──
        if (this.rageActive && this.style === 'water') {
            const t = Date.now() * 0.005;
            ctx.shadowColor = '#00bfff'; ctx.shadowBlur = 20;
            // Flowing water body
            const wg = ctx.createLinearGradient(0, -this.height, 0, 0);
            wg.addColorStop(0, 'rgba(0,100,200,0.8)'); wg.addColorStop(0.5, 'rgba(0,180,255,0.6)');
            wg.addColorStop(1, 'rgba(0,220,255,0.3)');
            ctx.fillStyle = wg;
            // Wavy body shape
            ctx.beginPath(); ctx.moveTo(-20, 0);
            for (let y = 0; y <= this.height; y += 5) {
                const wave = Math.sin(t + y * 0.08) * 8;
                ctx.lineTo(-18 + wave, -y);
            }
            for (let y = this.height; y >= 0; y -= 5) {
                const wave = Math.sin(t + y * 0.08 + 1) * 8;
                ctx.lineTo(18 + wave, -y);
            }
            ctx.closePath(); ctx.fill();
            // Head — water orb
            ctx.fillStyle = 'rgba(0,150,255,0.7)';
            ctx.beginPath(); ctx.arc(0, -this.height, 16, 0, Math.PI * 2); ctx.fill();
            // Eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-5, -this.height, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5, -this.height, 3, 0, Math.PI * 2); ctx.fill();
            // Droplets
            if (Math.random() < 0.5) {
                particles.push({ x: this.x + (Math.random() - 0.5) * 40, y: this.y - Math.random() * this.height,
                    vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 2,
                    life: 10 + Math.random() * 8, maxLife: 18, color: '#00bfff' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Wind Rage: tornado/wind spirit ──
        if (this.rageActive && this.style === 'wind') {
            const t = Date.now() * 0.006;
            ctx.shadowColor = '#a0f0a0'; ctx.shadowBlur = 15;
            // Tornado funnel — stacked ellipses getting wider toward bottom
            for (let i = 0; i < 8; i++) {
                const y = -this.height + i * (this.height / 8);
                const w = 8 + i * 4;
                const offset = Math.sin(t + i * 0.7) * (3 + i * 2);
                ctx.globalAlpha = 0.35 - i * 0.02;
                ctx.strokeStyle = i % 2 === 0 ? '#c0ffc0' : '#80e080'; ctx.lineWidth = 2.5;
                ctx.beginPath(); ctx.ellipse(offset, y, w, 5, Math.sin(t + i) * 0.3, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.globalAlpha = 1;
            // Swirling debris particles
            for (let i = 0; i < 4; i++) {
                const a = t * 2 + (i / 4) * Math.PI * 2;
                const r = 10 + i * 6;
                const dy = -this.height * 0.5 + Math.sin(t + i) * 20;
                ctx.fillStyle = 'rgba(200,255,200,0.5)';
                ctx.beginPath(); ctx.arc(Math.cos(a) * r, dy + Math.sin(a) * 5, 3, 0, Math.PI * 2); ctx.fill();
            }
            // Eyes in the storm
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-5, -this.height + 5, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5, -this.height + 5, 3, 0, Math.PI * 2); ctx.fill();
            if (Math.random() < 0.3) {
                particles.push({ x: this.x + (Math.random() - 0.5) * 50, y: this.y - Math.random() * this.height,
                    vx: (Math.random() - 0.5) * 6, vy: -1 - Math.random() * 3,
                    life: 10 + Math.random() * 8, maxLife: 18, color: '#c0ffc0' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Earth Rage: rock golem ──
        if (this.rageActive && this.style === 'earth') {
            const t = Date.now() * 0.003;
            ctx.shadowColor = '#ff8c00'; ctx.shadowBlur = 10;
            // Blocky stone body
            ctx.fillStyle = '#6b5b4f'; ctx.strokeStyle = '#4a3a2f'; ctx.lineWidth = 2;
            // Torso — large rectangle
            ctx.fillRect(-22, -85, 44, 50); ctx.strokeRect(-22, -85, 44, 50);
            // Head — square
            ctx.fillRect(-14, -this.height - 5, 28, 25); ctx.strokeRect(-14, -this.height - 5, 28, 25);
            // Arms — thick rectangles
            ctx.fillRect(-38, -80, 16, 40); ctx.strokeRect(-38, -80, 16, 40);
            ctx.fillRect(22, -80, 16, 40); ctx.strokeRect(22, -80, 16, 40);
            // Legs
            ctx.fillRect(-18, -35, 14, 35); ctx.strokeRect(-18, -35, 14, 35);
            ctx.fillRect(4, -35, 14, 35); ctx.strokeRect(4, -35, 14, 35);
            // Glowing cracks
            ctx.strokeStyle = '#ff8c00'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(-10, -75); ctx.lineTo(5, -65); ctx.lineTo(-8, -55); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(10, -70); ctx.lineTo(15, -60); ctx.stroke();
            // Glowing eyes
            ctx.fillStyle = '#ff8c00';
            ctx.fillRect(-9, -this.height + 2, 6, 4);
            ctx.fillRect(3, -this.height + 2, 6, 4);
            // Rock debris
            if (Math.random() < 0.3) {
                particles.push({ x: this.x + (Math.random() - 0.5) * 50, y: this.y - 5,
                    vx: (Math.random() - 0.5) * 2, vy: -2 - Math.random() * 3,
                    life: 10 + Math.random() * 10, maxLife: 20, color: '#8b7355' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Acid Rage: acid blob monster ──
        if (this.rageActive && this.style === 'acid') {
            const t = Date.now() * 0.006;
            ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 20;
            // Amorphous blob body
            const ag = ctx.createRadialGradient(0, -this.height * 0.45, 5, 0, -this.height * 0.45, 45);
            ag.addColorStop(0, '#7fff00'); ag.addColorStop(0.5, '#39ff14'); ag.addColorStop(1, 'rgba(0,100,0,0.3)');
            ctx.fillStyle = ag;
            ctx.beginPath();
            ctx.moveTo(-25, 0);
            for (let a = 0; a <= Math.PI; a += 0.2) {
                const r = 30 + Math.sin(t * 2 + a * 3) * 8;
                ctx.lineTo(-Math.cos(a) * r, -Math.sin(a) * this.height * 0.9);
            }
            ctx.closePath(); ctx.fill();
            // Bubbles inside
            for (let i = 0; i < 4; i++) {
                const bx = Math.sin(t + i * 1.5) * 12, by = -20 - i * 18 + Math.cos(t + i) * 5;
                ctx.globalAlpha = 0.4; ctx.fillStyle = '#b0ff50';
                ctx.beginPath(); ctx.arc(bx, by, 4 + Math.sin(t + i) * 2, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
            // Eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-8, -this.height * 0.7, 5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(8, -this.height * 0.7, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(-7, -this.height * 0.7, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(9, -this.height * 0.7, 2, 0, Math.PI * 2); ctx.fill();
            // Acid drips
            if (Math.random() < 0.5) {
                particles.push({ x: this.x + (Math.random() - 0.5) * 40, y: this.y - Math.random() * 30,
                    vx: (Math.random() - 0.5) * 1, vy: 2 + Math.random() * 2,
                    life: 12 + Math.random() * 8, maxLife: 20, color: '#39ff14' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Light Rage: angel form ──
        if (this.rageActive && this.style === 'light') {
            const t = Date.now() * 0.004;
            ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 30;
            // Golden glow aura
            const lg = ctx.createRadialGradient(0, -this.height * 0.5, 10, 0, -this.height * 0.5, 60);
            lg.addColorStop(0, 'rgba(255,215,0,0.4)'); lg.addColorStop(1, 'rgba(255,215,0,0)');
            ctx.fillStyle = lg;
            ctx.beginPath(); ctx.arc(0, -this.height * 0.5, 60, 0, Math.PI * 2); ctx.fill();
            // Body — golden figure
            ctx.fillStyle = '#ffd700'; ctx.strokeStyle = '#daa520'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(0, -this.height * 0.5, 15, 35, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            // Head
            ctx.fillStyle = '#fff8dc';
            ctx.beginPath(); ctx.arc(0, -this.height + 2, 13, 0, Math.PI * 2); ctx.fill();
            // Halo
            ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.ellipse(0, -this.height - 14, 14, 4, 0, 0, Math.PI * 2); ctx.stroke();
            // Wings
            ctx.fillStyle = 'rgba(255,255,240,0.7)'; ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1;
            // Left wing
            ctx.beginPath(); ctx.moveTo(-10, -75);
            ctx.quadraticCurveTo(-55, -90 + Math.sin(t) * 5, -45, -55);
            ctx.quadraticCurveTo(-50, -40, -10, -50); ctx.closePath(); ctx.fill(); ctx.stroke();
            // Right wing
            ctx.beginPath(); ctx.moveTo(10, -75);
            ctx.quadraticCurveTo(55, -90 + Math.sin(t) * 5, 45, -55);
            ctx.quadraticCurveTo(50, -40, 10, -50); ctx.closePath(); ctx.fill(); ctx.stroke();
            // Eyes
            ctx.fillStyle = '#ffd700';
            ctx.beginPath(); ctx.arc(-4, -this.height + 2, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(4, -this.height + 2, 2, 0, Math.PI * 2); ctx.fill();
            // Light particles
            if (Math.random() < 0.4) {
                particles.push({ x: this.x + (Math.random() - 0.5) * 60, y: this.y - Math.random() * this.height,
                    vx: (Math.random() - 0.5) * 1.5, vy: -1 - Math.random() * 2,
                    life: 12 + Math.random() * 8, maxLife: 20, color: '#ffd700' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Dark Rage: shadow demon ──
        if (this.rageActive && this.style === 'dark') {
            const t = Date.now() * 0.005;
            ctx.shadowColor = '#8b00ff'; ctx.shadowBlur = 25;
            // Dark aura
            const dg = ctx.createRadialGradient(0, -this.height * 0.5, 10, 0, -this.height * 0.5, 55);
            dg.addColorStop(0, 'rgba(80,0,120,0.5)'); dg.addColorStop(1, 'rgba(30,0,50,0)');
            ctx.fillStyle = dg;
            ctx.beginPath(); ctx.arc(0, -this.height * 0.5, 55, 0, Math.PI * 2); ctx.fill();
            // Demon body
            ctx.fillStyle = '#1a0030';
            ctx.beginPath(); ctx.ellipse(0, -this.height * 0.5, 18, 38, 0, 0, Math.PI * 2); ctx.fill();
            // Head
            ctx.beginPath(); ctx.arc(0, -this.height + 2, 14, 0, Math.PI * 2); ctx.fill();
            // Horns
            ctx.fillStyle = '#4a004a';
            ctx.beginPath(); ctx.moveTo(-10, -this.height - 2); ctx.lineTo(-18, -this.height - 25);
            ctx.lineTo(-6, -this.height - 8); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(10, -this.height - 2); ctx.lineTo(18, -this.height - 25);
            ctx.lineTo(6, -this.height - 8); ctx.closePath(); ctx.fill();
            // Glowing eyes
            ctx.fillStyle = '#ff00ff';
            ctx.beginPath(); ctx.arc(-5, -this.height + 2, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5, -this.height + 2, 3, 0, Math.PI * 2); ctx.fill();
            // Wisps of dark energy
            for (let i = 0; i < 3; i++) {
                const wa = t + (i / 3) * Math.PI * 2;
                ctx.globalAlpha = 0.3; ctx.fillStyle = '#8b00ff';
                ctx.beginPath(); ctx.arc(Math.cos(wa) * 30, -this.height * 0.5 + Math.sin(wa) * 25, 5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
            if (Math.random() < 0.3) {
                particles.push({ x: this.x + (Math.random() - 0.5) * 50, y: this.y - Math.random() * this.height,
                    vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2,
                    life: 10 + Math.random() * 8, maxLife: 18, color: '#8b00ff' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Shadow Rage: shadow ninja ──
        if (this.rageActive && this.style === 'shadow') {
            const t = Date.now() * 0.006;
            ctx.shadowColor = '#222'; ctx.shadowBlur = 15;
            // Sleek dark silhouette
            ctx.fillStyle = '#0a0a0a';
            // Body — slim shape
            ctx.beginPath(); ctx.moveTo(-12, 0);
            ctx.lineTo(-15, -this.height * 0.4); ctx.lineTo(-12, -this.height * 0.8);
            ctx.lineTo(0, -this.height - 5); ctx.lineTo(12, -this.height * 0.8);
            ctx.lineTo(15, -this.height * 0.4); ctx.lineTo(12, 0); ctx.closePath(); ctx.fill();
            // Scarf/flowing cloth
            ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 3;
            const scarfWave = Math.sin(t) * 15;
            ctx.beginPath(); ctx.moveTo(5, -this.height * 0.85);
            ctx.quadraticCurveTo(20 + scarfWave, -this.height * 0.7, 15 + scarfWave * 1.5, -this.height * 0.5); ctx.stroke();
            // Red glowing eyes
            ctx.fillStyle = '#ff0000'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(-5, -this.height + 3, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5, -this.height + 3, 2.5, 0, Math.PI * 2); ctx.fill();
            // Shadow afterimages
            ctx.globalAlpha = 0.15; ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.ellipse(-8, -this.height * 0.5, 12, 35, -0.1, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(8, -this.height * 0.5, 12, 35, 0.1, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
            if (Math.random() < 0.3) {
                particles.push({ x: this.x + (Math.random() - 0.5) * 30, y: this.y - Math.random() * this.height,
                    vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 2,
                    life: 8 + Math.random() * 6, maxLife: 14, color: '#111' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Portal Rage: dimensional being ──
        if (this.rageActive && this.style === 'portal') {
            const t = Date.now() * 0.005;
            ctx.shadowColor = '#9b59b6'; ctx.shadowBlur = 20;
            // Body outline — shimmering rift
            const pg = ctx.createLinearGradient(-20, -this.height, 20, 0);
            pg.addColorStop(0, '#9b59b6'); pg.addColorStop(0.3, '#3498db');
            pg.addColorStop(0.6, '#e74c3c'); pg.addColorStop(1, '#9b59b6');
            ctx.fillStyle = pg;
            ctx.beginPath(); ctx.ellipse(0, -this.height * 0.5, 22, 45, 0, 0, Math.PI * 2); ctx.fill();
            // Swirling portal rings on body
            for (let i = 0; i < 3; i++) {
                const ry = -this.height * 0.3 - i * 22;
                const ra = t + i * 1.2;
                ctx.strokeStyle = i === 0 ? '#9b59b6' : i === 1 ? '#3498db' : '#e74c3c';
                ctx.lineWidth = 2; ctx.globalAlpha = 0.6;
                ctx.beginPath(); ctx.ellipse(Math.sin(ra) * 5, ry, 15 + Math.sin(ra) * 5, 6, Math.sin(ra * 0.5) * 0.3, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.globalAlpha = 1;
            // Head — portal orb
            ctx.fillStyle = '#1a0a2e';
            ctx.beginPath(); ctx.arc(0, -this.height, 14, 0, Math.PI * 2); ctx.fill();
            // Portal eye (single)
            const eg = ctx.createRadialGradient(0, -this.height, 0, 0, -this.height, 8);
            eg.addColorStop(0, '#fff'); eg.addColorStop(0.5, '#9b59b6'); eg.addColorStop(1, '#3498db');
            ctx.fillStyle = eg;
            ctx.beginPath(); ctx.arc(0, -this.height, 6, 0, Math.PI * 2); ctx.fill();
            // Rift particles
            if (Math.random() < 0.4) {
                const pc = ['#9b59b6', '#3498db', '#e74c3c'][Math.floor(Math.random() * 3)];
                particles.push({ x: this.x + (Math.random() - 0.5) * 50, y: this.y - Math.random() * this.height,
                    vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
                    life: 10 + Math.random() * 8, maxLife: 18, color: pc });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Corruption Rage: glitched figure ──
        if (this.rageActive && this.style === 'corruption') {
            const t = Date.now();
            ctx.shadowColor = '#ff0040'; ctx.shadowBlur = 15;
            // Main body — shifts randomly
            const glitchX = (Math.random() - 0.5) * 8;
            ctx.fillStyle = '#1a1a2e';
            ctx.beginPath(); ctx.ellipse(glitchX, -this.height * 0.5, 18, 40, 0, 0, Math.PI * 2); ctx.fill();
            // Glitch slices — horizontal tears
            for (let i = 0; i < 5; i++) {
                const sy = -this.height + 10 + i * 18 + (Math.random() - 0.5) * 5;
                const sw = 30 + Math.random() * 15;
                const sx = (Math.random() - 0.5) * 12;
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,0,64,0.6)' : 'rgba(0,255,128,0.4)';
                ctx.fillRect(sx - sw / 2, sy, sw, 3);
            }
            // Head with static
            ctx.fillStyle = '#0a0a15';
            ctx.beginPath(); ctx.arc(glitchX * 0.5, -this.height + 2, 13, 0, Math.PI * 2); ctx.fill();
            // RGB-shifted eyes
            ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.arc(-6, -this.height + 2, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#00ff00'; ctx.beginPath(); ctx.arc(-4, -this.height + 3, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#0000ff'; ctx.beginPath(); ctx.arc(6, -this.height + 2, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ff00ff'; ctx.beginPath(); ctx.arc(8, -this.height + 3, 3, 0, Math.PI * 2); ctx.fill();
            // Static noise
            ctx.globalAlpha = 0.3;
            for (let i = 0; i < 10; i++) {
                const nx = (Math.random() - 0.5) * 40, ny = -Math.random() * this.height;
                ctx.fillStyle = `rgb(${Math.random() * 255|0},${Math.random() * 255|0},${Math.random() * 255|0})`;
                ctx.fillRect(nx, ny, 3 + Math.random() * 4, 2);
            }
            ctx.globalAlpha = 1;
            if (Math.random() < 0.3) {
                particles.push({ x: this.x + (Math.random() - 0.5) * 50, y: this.y - Math.random() * this.height,
                    vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 3,
                    life: 6 + Math.random() * 6, maxLife: 12, color: '#ff0040' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Crystal Rage: crystal golem ──
        if (this.rageActive && this.style === 'crystal') {
            const t = Date.now() * 0.004;
            ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 20;
            // Crystal body — faceted polygon shapes
            const drawCrystal = (cx, cy, w, h, color) => {
                ctx.fillStyle = color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx, cy - h / 2); ctx.lineTo(cx + w / 2, cy - h / 4);
                ctx.lineTo(cx + w / 2, cy + h / 4); ctx.lineTo(cx, cy + h / 2);
                ctx.lineTo(cx - w / 2, cy + h / 4); ctx.lineTo(cx - w / 2, cy - h / 4);
                ctx.closePath(); ctx.fill(); ctx.stroke();
            };
            // Torso
            drawCrystal(0, -this.height * 0.55, 36, 45, 'rgba(0,200,255,0.6)');
            // Head
            drawCrystal(0, -this.height + 2, 22, 24, 'rgba(100,220,255,0.7)');
            // Arms
            drawCrystal(-28, -this.height * 0.55, 14, 30, 'rgba(0,180,220,0.5)');
            drawCrystal(28, -this.height * 0.55, 14, 30, 'rgba(0,180,220,0.5)');
            // Legs
            drawCrystal(-10, -18, 14, 35, 'rgba(0,160,200,0.5)');
            drawCrystal(10, -18, 14, 35, 'rgba(0,160,200,0.5)');
            // Light refraction sparkles
            for (let i = 0; i < 3; i++) {
                const sx = (Math.random() - 0.5) * 40, sy = -Math.random() * this.height;
                ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.5 + Math.random() * 0.5;
                ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
            // Glowing eyes
            ctx.fillStyle = '#00ffff';
            ctx.beginPath(); ctx.arc(-5, -this.height + 2, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5, -this.height + 2, 2.5, 0, Math.PI * 2); ctx.fill();
            if (Math.random() < 0.3) {
                particles.push({ x: this.x + (Math.random() - 0.5) * 50, y: this.y - Math.random() * this.height,
                    vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2,
                    life: 12 + Math.random() * 8, maxLife: 20, color: '#00ffff' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Samurai Rage: armored samurai ──
        if (this.rageActive && this.style === 'samurai') {
            const t = Date.now() * 0.004;
            ctx.shadowColor = '#ff4444'; ctx.shadowBlur = 15;
            // Armor body
            ctx.fillStyle = '#2c2c3e'; ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2;
            // Shoulder armor (sode)
            ctx.fillRect(-35, -85, 14, 20); ctx.strokeRect(-35, -85, 14, 20);
            ctx.fillRect(21, -85, 14, 20); ctx.strokeRect(21, -85, 14, 20);
            // Chest plate (do)
            ctx.fillStyle = '#3a3a50';
            ctx.fillRect(-20, -85, 40, 45); ctx.strokeRect(-20, -85, 40, 45);
            // Chest emblem
            ctx.fillStyle = '#c0392b';
            ctx.beginPath(); ctx.arc(0, -65, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffd700'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('\u6b66', 0, -62);
            // Helmet (kabuto)
            ctx.fillStyle = '#2c2c3e';
            ctx.beginPath(); ctx.arc(0, -this.height, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            // Helmet crest (maedate)
            ctx.fillStyle = '#c0392b';
            ctx.beginPath(); ctx.moveTo(0, -this.height - 14); ctx.lineTo(-8, -this.height - 28);
            ctx.lineTo(8, -this.height - 28); ctx.closePath(); ctx.fill();
            // Face mask (menpo) — visor slit
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(-10, -this.height - 2, 20, 8);
            ctx.fillStyle = '#ff4444';
            ctx.fillRect(-7, -this.height, 14, 3);
            // Legs (suneate)
            ctx.fillStyle = '#2c2c3e';
            ctx.fillRect(-15, -35, 12, 35); ctx.strokeRect(-15, -35, 12, 35);
            ctx.fillRect(3, -35, 12, 35); ctx.strokeRect(3, -35, 12, 35);
            // Glowing katana
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.shadowColor = '#ff4444'; ctx.shadowBlur = 15;
            const sAngle = -0.5 + Math.sin(t) * 0.3;
            ctx.beginPath(); ctx.moveTo(25, -70);
            ctx.lineTo(25 + Math.cos(sAngle) * 55, -70 + Math.sin(sAngle) * 55); ctx.stroke();
            ctx.strokeStyle = '#ff6666'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(26, -70);
            ctx.lineTo(26 + Math.cos(sAngle) * 45, -70 + Math.sin(sAngle) * 45); ctx.stroke();
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Rubber Duck Rage: giant rubber duck ──
        if (this.rageActive && this.style === 'rubberduck') {
            const t = Date.now() * 0.004;
            const bob = Math.sin(t) * 3;
            ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 15;
            // Duck body — large yellow oval
            ctx.fillStyle = '#ffdd00';
            ctx.beginPath(); ctx.ellipse(0, -35 + bob, 30, 28, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#e6c200'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(0, -35 + bob, 30, 28, 0, 0, Math.PI * 2); ctx.stroke();
            // Duck head — upper circle
            ctx.fillStyle = '#ffdd00';
            ctx.beginPath(); ctx.arc(8, -75 + bob, 20, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#e6c200'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(8, -75 + bob, 20, 0, Math.PI * 2); ctx.stroke();
            // Beak
            ctx.fillStyle = '#ff8c00';
            ctx.beginPath(); ctx.moveTo(22, -78 + bob); ctx.lineTo(38, -73 + bob);
            ctx.lineTo(22, -68 + bob); ctx.closePath(); ctx.fill();
            // Eye
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(14, -80 + bob, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(15, -81 + bob, 1.5, 0, Math.PI * 2); ctx.fill();
            // Wing
            ctx.fillStyle = '#e6c200';
            ctx.beginPath(); ctx.ellipse(-22, -38 + bob, 12, 18, -0.3, 0, Math.PI * 2); ctx.fill();
            // Tail
            ctx.fillStyle = '#ffdd00';
            ctx.beginPath(); ctx.moveTo(-28, -40 + bob); ctx.lineTo(-38, -50 + bob);
            ctx.lineTo(-30, -35 + bob); ctx.closePath(); ctx.fill();
            // Water ripples below
            ctx.strokeStyle = 'rgba(100,200,255,0.4)'; ctx.lineWidth = 1.5;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath(); ctx.ellipse(0, -5, 25 + i * 8 + Math.sin(t + i) * 3, 4, 0, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Keyboard Rage: keyboard mech ──
        if (this.rageActive && this.style === 'keyboard') {
            const t = Date.now() * 0.005;
            ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 15;
            // Body — keyboard-shaped rectangle
            ctx.fillStyle = '#2a2a2a'; ctx.strokeStyle = '#444'; ctx.lineWidth = 2;
            ctx.fillRect(-28, -85, 56, 55); ctx.strokeRect(-28, -85, 56, 55);
            // Key grid
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 5; col++) {
                    const kx = -22 + col * 10, ky = -80 + row * 12;
                    const pressed = Math.sin(t * 3 + row + col * 1.5) > 0.7;
                    ctx.fillStyle = pressed ? '#00ff88' : '#444';
                    ctx.fillRect(kx, ky, 8, 9);
                    ctx.strokeStyle = '#555'; ctx.lineWidth = 0.5;
                    ctx.strokeRect(kx, ky, 8, 9);
                }
            }
            // Screen face (head)
            ctx.fillStyle = '#111';
            ctx.fillRect(-16, -this.height - 3, 32, 22);
            ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 1;
            ctx.strokeRect(-16, -this.height - 3, 32, 22);
            // Screen text face
            ctx.fillStyle = '#00ff88'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
            const faces = ['>_<', 'O_O', '^_^', 'X_X'];
            ctx.fillText(faces[Math.floor(t * 0.5) % faces.length], 0, -this.height + 12);
            // Arms — cables
            ctx.strokeStyle = '#666'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-28, -65); ctx.lineTo(-40, -50); ctx.lineTo(-38, -30); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(28, -65); ctx.lineTo(40, -50); ctx.lineTo(38, -30); ctx.stroke();
            // Legs
            ctx.fillStyle = '#333';
            ctx.fillRect(-15, -30, 10, 30); ctx.fillRect(5, -30, 10, 30);
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Chef Rage: giant chef ──
        if (this.rageActive && this.style === 'chef') {
            const t = Date.now() * 0.004;
            ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
            // Chef hat (toque)
            ctx.fillStyle = '#fff'; ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1.5;
            ctx.fillRect(-14, -this.height - 30, 28, 28);
            ctx.strokeRect(-14, -this.height - 30, 28, 28);
            // Hat puffs
            ctx.beginPath(); ctx.arc(-8, -this.height - 30, 10, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(8, -this.height - 30, 10, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(0, -this.height - 33, 10, 0, Math.PI * 2); ctx.fill();
            // Head
            ctx.fillStyle = '#f4c896';
            ctx.beginPath(); ctx.arc(0, -this.height + 3, 13, 0, Math.PI * 2); ctx.fill();
            // Mustache
            ctx.fillStyle = '#4a3020';
            ctx.beginPath(); ctx.ellipse(-5, -this.height + 8, 6, 3, -0.2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(5, -this.height + 8, 6, 3, 0.2, 0, Math.PI * 2); ctx.fill();
            // Apron body
            ctx.fillStyle = '#fff';
            ctx.fillRect(-18, -80, 36, 50);
            ctx.strokeStyle = '#ddd'; ctx.strokeRect(-18, -80, 36, 50);
            // Apron string
            ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(-18, -60); ctx.lineTo(-25, -55); ctx.lineTo(-18, -50); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(18, -60); ctx.lineTo(25, -55); ctx.lineTo(18, -50); ctx.stroke();
            // Giant frying pan in hand
            ctx.fillStyle = '#555'; ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
            // Handle
            ctx.fillRect(25, -70, 30, 5);
            // Pan
            ctx.beginPath(); ctx.arc(25, -65, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#444';
            ctx.beginPath(); ctx.arc(25, -65, 14, 0, Math.PI * 2); ctx.fill();
            // Legs
            ctx.fillStyle = '#333';
            ctx.fillRect(-12, -30, 10, 30); ctx.fillRect(2, -30, 10, 30);
            // Shoes
            ctx.fillStyle = '#222';
            ctx.fillRect(-14, -3, 14, 5); ctx.fillRect(0, -3, 14, 5);
            // Steam particles
            if (Math.random() < 0.3) {
                particles.push({ x: this.x + 25 * this.facing, y: this.y - 70,
                    vx: (Math.random() - 0.5) * 1.5, vy: -2 - Math.random() * 2,
                    life: 10 + Math.random() * 8, maxLife: 18, color: '#ddd' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── DJ Rage: DJ booth form ──
        if (this.rageActive && this.style === 'dj') {
            const t = Date.now() * 0.006;
            ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 20;
            // DJ booth base
            ctx.fillStyle = '#1a1a2e'; ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
            ctx.fillRect(-30, -55, 60, 50); ctx.strokeRect(-30, -55, 60, 50);
            // Turntables (two records)
            const spin = t * 3;
            for (let side = -1; side <= 1; side += 2) {
                const cx = side * 13;
                ctx.fillStyle = '#111';
                ctx.beginPath(); ctx.arc(cx, -35, 12, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#333'; ctx.beginPath(); ctx.arc(cx, -35, 12, 0, Math.PI * 2); ctx.stroke();
                // Record grooves
                ctx.strokeStyle = '#222'; ctx.lineWidth = 0.5;
                for (let r = 3; r <= 10; r += 3) {
                    ctx.beginPath(); ctx.arc(cx, -35, r, 0, Math.PI * 2); ctx.stroke();
                }
                // Record label
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath(); ctx.arc(cx, -35, 3, 0, Math.PI * 2); ctx.fill();
                // Spinning line
                ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(cx, -35);
                ctx.lineTo(cx + Math.cos(spin + side) * 10, -35 + Math.sin(spin + side) * 10); ctx.stroke();
            }
            // Mixer in center
            ctx.fillStyle = '#222'; ctx.fillRect(-4, -42, 8, 20);
            // Fader
            ctx.fillStyle = '#ff00ff'; ctx.fillRect(-2, -38 + Math.sin(t) * 5, 4, 4);
            // Speakers (on sides)
            for (let side = -1; side <= 1; side += 2) {
                ctx.fillStyle = '#222';
                ctx.fillRect(side * 30 - 8, -85, 16, 30);
                ctx.strokeStyle = '#333'; ctx.strokeRect(side * 30 - 8, -85, 16, 30);
                // Speaker cones
                ctx.fillStyle = '#444';
                ctx.beginPath(); ctx.arc(side * 30, -75, 5, 0, Math.PI * 2); ctx.fill();
                const pulse = Math.sin(t * 4) * 1.5;
                ctx.beginPath(); ctx.arc(side * 30, -65, 3 + pulse, 0, Math.PI * 2); ctx.fill();
            }
            // Head with headphones
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(0, -this.height + 2, 12, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#333';
            ctx.fillRect(-16, -this.height, 5, 10); ctx.fillRect(11, -this.height, 5, 10);
            ctx.strokeStyle = '#333'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0, -this.height - 2, 15, Math.PI, 0); ctx.stroke();
            // Sound wave particles
            if (Math.random() < 0.4) {
                particles.push({ x: this.x + (Math.random() > 0.5 ? 30 : -30) * this.facing, y: this.y - 75,
                    vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 3,
                    life: 8 + Math.random() * 6, maxLife: 14, color: Math.random() > 0.5 ? '#ff00ff' : '#00ffff' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Pigeon Rage: actual pigeon ──
        if (this.rageActive && this.style === 'pigeon') {
            const t = Date.now() * 0.005;
            const bob = Math.sin(t * 2) * 2;
            ctx.shadowColor = '#aaa'; ctx.shadowBlur = 8;
            // Body — plump oval
            ctx.fillStyle = '#8e8e8e';
            ctx.beginPath(); ctx.ellipse(0, -35 + bob, 25, 22, 0.1, 0, Math.PI * 2); ctx.fill();
            // Chest — iridescent purple/green
            const cg = ctx.createLinearGradient(-10, -45, 10, -25);
            cg.addColorStop(0, '#6a5acd'); cg.addColorStop(0.5, '#2e8b57'); cg.addColorStop(1, '#6a5acd');
            ctx.fillStyle = cg;
            ctx.beginPath(); ctx.ellipse(8, -40 + bob, 12, 14, 0.2, 0, Math.PI * 2); ctx.fill();
            // Head
            ctx.fillStyle = '#7a7a7a';
            ctx.beginPath(); ctx.arc(18, -58 + bob, 10, 0, Math.PI * 2); ctx.fill();
            // Beak
            ctx.fillStyle = '#c0c0c0';
            ctx.beginPath(); ctx.moveTo(26, -60 + bob); ctx.lineTo(34, -57 + bob);
            ctx.lineTo(26, -55 + bob); ctx.closePath(); ctx.fill();
            // Beak tip — pinkish
            ctx.fillStyle = '#e0b0a0';
            ctx.beginPath(); ctx.arc(27, -57.5 + bob, 2, 0, Math.PI * 2); ctx.fill();
            // Eye
            ctx.fillStyle = '#ff6600';
            ctx.beginPath(); ctx.arc(22, -60 + bob, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(22.5, -60 + bob, 1.5, 0, Math.PI * 2); ctx.fill();
            // Wing
            ctx.fillStyle = '#6e6e6e';
            ctx.beginPath(); ctx.moveTo(-5, -45 + bob);
            ctx.quadraticCurveTo(-30, -55 + bob + Math.sin(t * 3) * 8, -25, -30 + bob);
            ctx.lineTo(-5, -25 + bob); ctx.closePath(); ctx.fill();
            // Tail feathers
            ctx.fillStyle = '#5e5e5e';
            ctx.beginPath(); ctx.moveTo(-20, -35 + bob); ctx.lineTo(-38, -40 + bob);
            ctx.lineTo(-35, -30 + bob); ctx.lineTo(-20, -28 + bob); ctx.closePath(); ctx.fill();
            // Feet — orange
            ctx.strokeStyle = '#e08040'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-5, -13 + bob); ctx.lineTo(-8, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-5, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(5, -13 + bob); ctx.lineTo(8, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(11, 0); ctx.stroke();
            // Coo particles
            if (Math.random() < 0.2) {
                particles.push({ x: this.x + 34 * this.facing, y: this.y - 57,
                    vx: this.facing * 2, vy: -1,
                    life: 10 + Math.random() * 6, maxLife: 16, color: '#ddd' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Selfie Rage: giant floating face ──
        if (this.rageActive && this.style === 'selfie') {
            const t = Date.now() * 0.004;
            const bob = Math.sin(t) * 3;
            ctx.shadowColor = '#ff69b4'; ctx.shadowBlur = 20;
            // Giant floating head
            const headR = 40;
            const cy = -this.height * 0.5 + bob;
            // Glow aura
            const sg = ctx.createRadialGradient(0, cy, headR * 0.5, 0, cy, headR * 1.5);
            sg.addColorStop(0, 'rgba(255,105,180,0.3)'); sg.addColorStop(1, 'rgba(255,105,180,0)');
            ctx.fillStyle = sg;
            ctx.beginPath(); ctx.arc(0, cy, headR * 1.5, 0, Math.PI * 2); ctx.fill();
            // Face image or fallback circle
            if (faceImgLoaded) {
                ctx.save(); ctx.beginPath(); ctx.arc(0, cy, headR, 0, Math.PI * 2); ctx.clip();
                ctx.drawImage(faceImg, -headR, cy - headR, headR * 2, headR * 2);
                ctx.restore();
            } else {
                ctx.fillStyle = '#f4c896';
                ctx.beginPath(); ctx.arc(0, cy, headR, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#000';
                ctx.beginPath(); ctx.arc(-12, cy - 5, 4, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(12, cy - 5, 4, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(0, cy + 10, 10, 0, Math.PI); ctx.stroke();
            }
            // Ring around face
            ctx.strokeStyle = '#ff69b4'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0, cy, headR + 3, 0, Math.PI * 2); ctx.stroke();
            // Sparkle emojis floating around
            ctx.fillStyle = '#ff69b4'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
            for (let i = 0; i < 4; i++) {
                const a = t + (i / 4) * Math.PI * 2;
                const ox = Math.cos(a) * (headR + 15), oy = cy + Math.sin(a) * (headR + 15);
                ctx.fillText('\u2728', ox, oy);
            }
            if (Math.random() < 0.3) {
                particles.push({ x: this.x + (Math.random() - 0.5) * 60, y: this.y - this.height * 0.5,
                    vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2,
                    life: 10 + Math.random() * 8, maxLife: 18, color: '#ff69b4' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Ice Rage: ice giant ──
        if (this.rageActive && this.style === 'ice') {
            const t = Date.now() * 0.004;
            ctx.shadowColor = '#87ceeb'; ctx.shadowBlur = 20;
            // Frozen crystalline body
            ctx.fillStyle = 'rgba(135,206,235,0.6)'; ctx.strokeStyle = '#b0e0ff'; ctx.lineWidth = 1.5;
            // Torso — angular ice
            ctx.beginPath();
            ctx.moveTo(0, -this.height + 20); ctx.lineTo(-22, -70); ctx.lineTo(-25, -40);
            ctx.lineTo(-15, -10); ctx.lineTo(15, -10); ctx.lineTo(25, -40);
            ctx.lineTo(22, -70); ctx.closePath(); ctx.fill(); ctx.stroke();
            // Head — ice shard crown
            ctx.fillStyle = 'rgba(180,230,255,0.7)';
            ctx.beginPath(); ctx.arc(0, -this.height + 5, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            // Ice crown spikes
            ctx.fillStyle = 'rgba(200,240,255,0.8)';
            const spikes = [[-10, -8], [-4, -15], [4, -15], [10, -8]];
            for (const [sx, sy] of spikes) {
                ctx.beginPath(); ctx.moveTo(sx - 3, -this.height - 2);
                ctx.lineTo(sx, -this.height + sy - 10); ctx.lineTo(sx + 3, -this.height - 2); ctx.closePath(); ctx.fill();
            }
            // Arms — chunky ice
            ctx.fillStyle = 'rgba(135,206,235,0.5)';
            ctx.fillRect(-38, -75, 14, 38); ctx.strokeRect(-38, -75, 14, 38);
            ctx.fillRect(24, -75, 14, 38); ctx.strokeRect(24, -75, 14, 38);
            // Legs
            ctx.fillRect(-16, -10, 12, 10); ctx.strokeRect(-16, -10, 12, 10);
            ctx.fillRect(4, -10, 12, 10); ctx.strokeRect(4, -10, 12, 10);
            // Glowing eyes
            ctx.fillStyle = '#00bfff';
            ctx.beginPath(); ctx.arc(-5, -this.height + 5, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5, -this.height + 5, 2.5, 0, Math.PI * 2); ctx.fill();
            // Frost aura particles
            if (Math.random() < 0.4) {
                particles.push({ x: this.x + (Math.random() - 0.5) * 60, y: this.y - Math.random() * this.height,
                    vx: (Math.random() - 0.5) * 1.5, vy: -0.5 - Math.random() * 1.5,
                    life: 15 + Math.random() * 10, maxLife: 25, color: Math.random() > 0.5 ? '#b0e0ff' : '#fff' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Gravity Rage: dark matter sphere with orbiting rings ──
        if (this.rageActive && this.style === 'gravity') {
            const t = Date.now() * 0.004;
            ctx.shadowColor = '#6a0dad'; ctx.shadowBlur = 25;
            const cy = -this.height * 0.5;
            // Dark matter core
            const gg = ctx.createRadialGradient(0, cy, 0, 0, cy, 35);
            gg.addColorStop(0, '#0d0015'); gg.addColorStop(0.5, '#1a0030'); gg.addColorStop(1, 'rgba(30,0,60,0)');
            ctx.fillStyle = gg;
            ctx.beginPath(); ctx.arc(0, cy, 35, 0, Math.PI * 2); ctx.fill();
            // Bright inner singularity
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(0, cy, 4, 0, Math.PI * 2); ctx.fill();
            // Orbiting rings
            for (let i = 0; i < 3; i++) {
                const a = t * (1 + i * 0.3) + (i * Math.PI * 2 / 3);
                const tilt = 0.3 + i * 0.4;
                ctx.strokeStyle = ['#9b59b6', '#3498db', '#e74c3c'][i];
                ctx.lineWidth = 2; ctx.globalAlpha = 0.7;
                ctx.save();
                ctx.translate(0, cy);
                ctx.rotate(a);
                ctx.scale(1, Math.sin(tilt));
                ctx.beginPath(); ctx.arc(0, 0, 28 + i * 6, 0, Math.PI * 2); ctx.stroke();
                ctx.restore();
            }
            ctx.globalAlpha = 1;
            // Orbiting debris dots
            for (let i = 0; i < 5; i++) {
                const oa = t * 2 + (i / 5) * Math.PI * 2;
                const or = 25 + i * 4;
                ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.6;
                ctx.beginPath(); ctx.arc(Math.cos(oa) * or, cy + Math.sin(oa) * or * 0.4, 2, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
            if (Math.random() < 0.3) {
                const angle = Math.random() * Math.PI * 2;
                particles.push({ x: this.x + Math.cos(angle) * 50, y: this.y + cy + Math.sin(angle) * 50,
                    vx: -Math.cos(angle) * 2, vy: -Math.sin(angle) * 2,
                    life: 10 + Math.random() * 8, maxLife: 18, color: '#6a0dad' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Time Rage: clockwork being ──
        if (this.rageActive && this.style === 'time') {
            const t = Date.now() * 0.003;
            ctx.shadowColor = '#daa520'; ctx.shadowBlur = 15;
            // Gear body — large central gear
            ctx.fillStyle = '#b8860b'; ctx.strokeStyle = '#8b6914'; ctx.lineWidth = 2;
            // Torso gear
            const gearTeeth = 10;
            ctx.beginPath();
            for (let i = 0; i < gearTeeth * 2; i++) {
                const a = (i / (gearTeeth * 2)) * Math.PI * 2 + t;
                const r = i % 2 === 0 ? 28 : 22;
                ctx.lineTo(Math.cos(a) * r, -55 + Math.sin(a) * r);
            }
            ctx.closePath(); ctx.fill(); ctx.stroke();
            // Inner gear hole
            ctx.fillStyle = '#654321';
            ctx.beginPath(); ctx.arc(0, -55, 12, 0, Math.PI * 2); ctx.fill();
            // Clock face head
            ctx.fillStyle = '#f5deb3';
            ctx.beginPath(); ctx.arc(0, -this.height + 2, 15, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#8b6914'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, -this.height + 2, 15, 0, Math.PI * 2); ctx.stroke();
            // Clock numbers (12, 3, 6, 9)
            ctx.fillStyle = '#333'; ctx.font = '6px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('12', 0, -this.height - 7);
            ctx.fillText('3', 10, -this.height + 4);
            ctx.fillText('6', 0, -this.height + 14);
            ctx.fillText('9', -10, -this.height + 4);
            // Spinning clock hands
            ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
            // Hour hand
            const hourA = t * 0.5 - Math.PI / 2;
            ctx.beginPath(); ctx.moveTo(0, -this.height + 2);
            ctx.lineTo(Math.cos(hourA) * 8, -this.height + 2 + Math.sin(hourA) * 8); ctx.stroke();
            // Minute hand
            const minA = t * 2 - Math.PI / 2;
            ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, -this.height + 2);
            ctx.lineTo(Math.cos(minA) * 11, -this.height + 2 + Math.sin(minA) * 11); ctx.stroke();
            // Small gears (arms)
            for (let side = -1; side <= 1; side += 2) {
                ctx.fillStyle = '#b8860b'; ctx.beginPath();
                for (let i = 0; i < 8; i++) {
                    const a = (i / 8) * Math.PI * 2 - t * 2;
                    const r = i % 2 === 0 ? 10 : 7;
                    ctx.lineTo(side * 35 + Math.cos(a) * r, -55 + Math.sin(a) * r);
                }
                ctx.closePath(); ctx.fill(); ctx.stroke();
            }
            // Legs — pendulums
            ctx.strokeStyle = '#8b6914'; ctx.lineWidth = 3;
            const pendulumA = Math.sin(t * 2) * 0.3;
            ctx.beginPath(); ctx.moveTo(-8, -30);
            ctx.lineTo(-8 + Math.sin(pendulumA) * 10, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(8, -30);
            ctx.lineTo(8 + Math.sin(pendulumA + 1) * 10, 0); ctx.stroke();
            // Pendulum bobs
            ctx.fillStyle = '#daa520';
            ctx.beginPath(); ctx.arc(-8 + Math.sin(pendulumA) * 10, 0, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(8 + Math.sin(pendulumA + 1) * 10, 0, 4, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Vampire Rage: vampire bat form ──
        if (this.rageActive && this.style === 'vampire') {
            const t = Date.now() * 0.006;
            ctx.shadowColor = '#8b0000'; ctx.shadowBlur = 20;
            const wingFlap = Math.sin(t * 2) * 0.3;
            // Body — dark oval
            ctx.fillStyle = '#1a0a0a';
            ctx.beginPath(); ctx.ellipse(0, -50, 15, 25, 0, 0, Math.PI * 2); ctx.fill();
            // Head
            ctx.beginPath(); ctx.arc(0, -80, 12, 0, Math.PI * 2); ctx.fill();
            // Ears — pointed
            ctx.beginPath(); ctx.moveTo(-8, -88); ctx.lineTo(-14, -100); ctx.lineTo(-4, -90); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(8, -88); ctx.lineTo(14, -100); ctx.lineTo(4, -90); ctx.closePath(); ctx.fill();
            // Red eyes
            ctx.fillStyle = '#ff0000'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(-5, -82, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5, -82, 2.5, 0, Math.PI * 2); ctx.fill();
            // Fangs
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.moveTo(-4, -73); ctx.lineTo(-3, -67); ctx.lineTo(-2, -73); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(2, -73); ctx.lineTo(3, -67); ctx.lineTo(4, -73); ctx.closePath(); ctx.fill();
            // Wings — large bat wings
            ctx.fillStyle = '#2a0a0a'; ctx.strokeStyle = '#1a0a0a'; ctx.lineWidth = 1.5;
            ctx.shadowBlur = 0;
            // Left wing
            ctx.save(); ctx.translate(-15, -55); ctx.rotate(-wingFlap);
            ctx.beginPath(); ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-20, -25, -50, -15);
            ctx.lineTo(-45, -5); ctx.lineTo(-35, -10); ctx.lineTo(-30, 0);
            ctx.lineTo(-20, -5); ctx.lineTo(-15, 5); ctx.closePath();
            ctx.fill(); ctx.stroke(); ctx.restore();
            // Right wing
            ctx.save(); ctx.translate(15, -55); ctx.rotate(wingFlap);
            ctx.beginPath(); ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(20, -25, 50, -15);
            ctx.lineTo(45, -5); ctx.lineTo(35, -10); ctx.lineTo(30, 0);
            ctx.lineTo(20, -5); ctx.lineTo(15, 5); ctx.closePath();
            ctx.fill(); ctx.stroke(); ctx.restore();
            // Feet — claws
            ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-5, -25); ctx.lineTo(-8, -15); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(5, -25); ctx.lineTo(8, -15); ctx.stroke();
            if (Math.random() < 0.3) {
                particles.push({ x: this.x + (Math.random() - 0.5) * 60, y: this.y - 50,
                    vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2,
                    life: 8 + Math.random() * 6, maxLife: 14, color: '#4a0000' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Dragon Rage: full dragon ──
        if (this.rageActive && this.style === 'dragon') {
            const t = Date.now() * 0.005;
            ctx.shadowColor = '#ff4500'; ctx.shadowBlur = 25;
            const wingFlap = Math.sin(t * 1.5) * 0.25;
            // Main body — large muscular torso
            ctx.fillStyle = '#2d5016'; ctx.strokeStyle = '#1a3a0a'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(0, -45, 22, 30, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            // Belly scales
            ctx.fillStyle = '#8fba60';
            ctx.beginPath(); ctx.ellipse(3, -40, 12, 22, 0.1, 0, Math.PI * 2); ctx.fill();
            // Long neck
            ctx.fillStyle = '#2d5016';
            ctx.beginPath(); ctx.moveTo(-5, -70); ctx.quadraticCurveTo(-10, -90, 5, -105);
            ctx.lineTo(12, -100); ctx.quadraticCurveTo(5, -85, 8, -70); ctx.closePath(); ctx.fill(); ctx.stroke();
            // Head
            ctx.beginPath(); ctx.ellipse(8, -108, 14, 10, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            // Snout
            ctx.beginPath(); ctx.moveTo(18, -112); ctx.lineTo(30, -110); ctx.lineTo(18, -105); ctx.closePath(); ctx.fill();
            // Horns
            ctx.fillStyle = '#8b7355';
            ctx.beginPath(); ctx.moveTo(2, -115); ctx.lineTo(-5, -128); ctx.lineTo(6, -116); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(10, -117); ctx.lineTo(8, -130); ctx.lineTo(14, -118); ctx.closePath(); ctx.fill();
            // Eye
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath(); ctx.arc(16, -112, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(16.5, -112, 1.5, 0, Math.PI * 2); ctx.fill();
            // Nostril smoke
            ctx.fillStyle = '#ff4500'; ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.arc(28, -110 + Math.sin(t * 3) * 2, 2, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
            // Left wing
            ctx.fillStyle = '#3a6b1e'; ctx.strokeStyle = '#1a3a0a'; ctx.lineWidth = 1.5;
            ctx.save(); ctx.translate(-18, -60); ctx.rotate(-wingFlap - 0.2);
            ctx.beginPath(); ctx.moveTo(0, 0);
            ctx.lineTo(-15, -30); ctx.lineTo(-45, -35); ctx.lineTo(-55, -20);
            ctx.lineTo(-40, -10); ctx.lineTo(-50, 0); ctx.lineTo(-35, 5);
            ctx.lineTo(-20, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
            // Wing membrane
            ctx.fillStyle = 'rgba(100,160,60,0.3)';
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-45, -35); ctx.lineTo(-35, 5); ctx.closePath(); ctx.fill();
            ctx.restore();
            // Right wing
            ctx.save(); ctx.translate(18, -60); ctx.rotate(wingFlap + 0.2);
            ctx.fillStyle = '#3a6b1e';
            ctx.beginPath(); ctx.moveTo(0, 0);
            ctx.lineTo(15, -30); ctx.lineTo(45, -35); ctx.lineTo(55, -20);
            ctx.lineTo(40, -10); ctx.lineTo(50, 0); ctx.lineTo(35, 5);
            ctx.lineTo(20, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'rgba(100,160,60,0.3)';
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(45, -35); ctx.lineTo(35, 5); ctx.closePath(); ctx.fill();
            ctx.restore();
            // Tail — curving behind
            ctx.strokeStyle = '#2d5016'; ctx.lineWidth = 8; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(-15, -25);
            ctx.quadraticCurveTo(-35, -15, -45, -25);
            ctx.quadraticCurveTo(-55, -35, -50, -45); ctx.stroke();
            // Tail spike
            ctx.fillStyle = '#8b7355';
            ctx.beginPath(); ctx.moveTo(-48, -45); ctx.lineTo(-58, -50); ctx.lineTo(-48, -40); ctx.closePath(); ctx.fill();
            // Legs — thick
            ctx.fillStyle = '#2d5016'; ctx.strokeStyle = '#1a3a0a'; ctx.lineWidth = 1.5;
            ctx.fillRect(-15, -18, 10, 18); ctx.strokeRect(-15, -18, 10, 18);
            ctx.fillRect(5, -18, 10, 18); ctx.strokeRect(5, -18, 10, 18);
            // Claws
            ctx.fillStyle = '#555';
            for (let lx of [-15, 5]) {
                for (let c = 0; c < 3; c++) {
                    ctx.beginPath(); ctx.moveTo(lx + c * 4, 0); ctx.lineTo(lx + c * 4 + 1, 4);
                    ctx.lineTo(lx + c * 4 + 3, 0); ctx.closePath(); ctx.fill();
                }
            }
            // Fire breath particles
            if (Math.random() < 0.5) {
                particles.push({ x: this.x + 30 * this.facing, y: this.y - 110,
                    vx: this.facing * (3 + Math.random() * 3), vy: (Math.random() - 0.5) * 2,
                    life: 10 + Math.random() * 8, maxLife: 18, color: Math.random() > 0.5 ? '#ff4500' : '#ffa500' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Necro Rage: lich/skeleton ──
        if (this.rageActive && this.style === 'necro') {
            const t = Date.now() * 0.005;
            ctx.shadowColor = '#00ff00'; ctx.shadowBlur = 15;
            // Robes
            ctx.fillStyle = '#1a0a2e';
            ctx.beginPath(); ctx.moveTo(-18, -30); ctx.lineTo(-22, -75);
            ctx.lineTo(0, -85); ctx.lineTo(22, -75); ctx.lineTo(18, -30);
            ctx.lineTo(20, 0); ctx.lineTo(-20, 0); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#2a1a3e'; ctx.lineWidth = 1.5; ctx.stroke();
            // Skull head
            ctx.fillStyle = '#e8e0d0';
            ctx.beginPath(); ctx.arc(0, -this.height + 2, 13, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1; ctx.stroke();
            // Eye sockets — dark with green glow
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(-5, -this.height + 1, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5, -this.height + 1, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#00ff00'; ctx.shadowColor = '#00ff00'; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(-5, -this.height + 1, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5, -this.height + 1, 2, 0, Math.PI * 2); ctx.fill();
            // Jaw
            ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1; ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.moveTo(-6, -this.height + 10); ctx.lineTo(-4, -this.height + 14);
            ctx.lineTo(4, -this.height + 14); ctx.lineTo(6, -this.height + 10); ctx.stroke();
            // Green flame crown
            ctx.shadowColor = '#00ff00'; ctx.shadowBlur = 12;
            for (let i = 0; i < 5; i++) {
                const fx = -8 + i * 4, fh = 8 + Math.sin(t * 3 + i) * 5;
                ctx.fillStyle = `rgba(0, ${180 + Math.sin(t + i) * 75}, 0, 0.7)`;
                ctx.beginPath(); ctx.moveTo(fx - 3, -this.height - 8);
                ctx.lineTo(fx, -this.height - 8 - fh); ctx.lineTo(fx + 3, -this.height - 8); ctx.closePath(); ctx.fill();
            }
            // Bony hands extending from sleeves
            ctx.fillStyle = '#e8e0d0'; ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1; ctx.shadowBlur = 0;
            // Left hand
            ctx.beginPath(); ctx.moveTo(-22, -65); ctx.lineTo(-30, -60); ctx.lineTo(-28, -55);
            ctx.lineTo(-22, -58); ctx.closePath(); ctx.fill(); ctx.stroke();
            // Right hand
            ctx.beginPath(); ctx.moveTo(22, -65); ctx.lineTo(30, -60); ctx.lineTo(28, -55);
            ctx.lineTo(22, -58); ctx.closePath(); ctx.fill(); ctx.stroke();
            // Soul particles
            if (Math.random() < 0.4) {
                particles.push({ x: this.x + (Math.random() - 0.5) * 40, y: this.y - Math.random() * this.height,
                    vx: (Math.random() - 0.5) * 1.5, vy: -2 - Math.random() * 2,
                    life: 12 + Math.random() * 8, maxLife: 20, color: '#00ff00' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Magnet Rage: metallic humanoid with magnetic field ──
        if (this.rageActive && this.style === 'magnet') {
            const t = Date.now() * 0.005;
            ctx.shadowColor = '#c0c0c0'; ctx.shadowBlur = 15;
            // Metallic body
            const mg = ctx.createLinearGradient(-15, -this.height, 15, 0);
            mg.addColorStop(0, '#d0d0d0'); mg.addColorStop(0.3, '#808080');
            mg.addColorStop(0.5, '#e0e0e0'); mg.addColorStop(0.7, '#808080'); mg.addColorStop(1, '#a0a0a0');
            ctx.fillStyle = mg;
            ctx.beginPath(); ctx.ellipse(0, -this.height * 0.5, 18, 40, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#666'; ctx.lineWidth = 1.5; ctx.stroke();
            // Head — chrome sphere
            ctx.fillStyle = '#c0c0c0';
            ctx.beginPath(); ctx.arc(0, -this.height + 2, 13, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#888'; ctx.stroke();
            // Reflection on head
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath(); ctx.arc(-4, -this.height - 2, 5, 0, Math.PI * 2); ctx.fill();
            // Eyes — blue energy
            ctx.fillStyle = '#4488ff';
            ctx.beginPath(); ctx.arc(-5, -this.height + 2, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5, -this.height + 2, 2.5, 0, Math.PI * 2); ctx.fill();
            // Magnetic field lines — red and blue arcs
            ctx.lineWidth = 1.5; ctx.globalAlpha = 0.4;
            for (let i = 0; i < 4; i++) {
                const fieldR = 35 + i * 10;
                const offset = Math.sin(t + i) * 0.2;
                // Red pole (top)
                ctx.strokeStyle = '#ff4444';
                ctx.beginPath(); ctx.arc(0, -this.height * 0.5, fieldR, -Math.PI * 0.7 + offset, -Math.PI * 0.3 + offset); ctx.stroke();
                // Blue pole (bottom)
                ctx.strokeStyle = '#4444ff';
                ctx.beginPath(); ctx.arc(0, -this.height * 0.5, fieldR, Math.PI * 0.3 + offset, Math.PI * 0.7 + offset); ctx.stroke();
            }
            ctx.globalAlpha = 1;
            // Floating metal debris
            for (let i = 0; i < 3; i++) {
                const da = t * 1.5 + (i / 3) * Math.PI * 2;
                const dr = 40 + Math.sin(t + i) * 5;
                ctx.fillStyle = '#888';
                ctx.fillRect(Math.cos(da) * dr - 3, -this.height * 0.5 + Math.sin(da) * dr - 3, 6, 6);
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Mech Rage: full mech suit ──
        if (this.rageActive && this.style === 'mech') {
            const t = Date.now() * 0.004;
            ctx.shadowColor = '#00aaff'; ctx.shadowBlur = 15;
            // Bulky robot body
            ctx.fillStyle = '#4a5568'; ctx.strokeStyle = '#2d3748'; ctx.lineWidth = 2;
            // Torso — wide rectangle
            ctx.fillRect(-25, -85, 50, 50); ctx.strokeRect(-25, -85, 50, 50);
            // Chest reactor
            const reactPulse = 0.5 + Math.sin(t * 3) * 0.3;
            ctx.fillStyle = `rgba(0,170,255,${reactPulse})`;
            ctx.beginPath(); ctx.arc(0, -65, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(0, -65, 3, 0, Math.PI * 2); ctx.fill();
            // Visor head
            ctx.fillStyle = '#2d3748';
            ctx.fillRect(-14, -this.height - 3, 28, 22); ctx.strokeRect(-14, -this.height - 3, 28, 22);
            // Visor slit
            ctx.fillStyle = '#00aaff'; ctx.shadowColor = '#00aaff'; ctx.shadowBlur = 8;
            ctx.fillRect(-10, -this.height + 3, 20, 5);
            ctx.shadowBlur = 0;
            // Arms — bulky with shoulder pads
            ctx.fillStyle = '#4a5568';
            // Left arm
            ctx.fillRect(-40, -88, 15, 12); ctx.strokeRect(-40, -88, 15, 12); // shoulder
            ctx.fillRect(-38, -76, 12, 35); ctx.strokeRect(-38, -76, 12, 35); // arm
            // Right arm
            ctx.fillRect(25, -88, 15, 12); ctx.strokeRect(25, -88, 15, 12);
            ctx.fillRect(26, -76, 12, 35); ctx.strokeRect(26, -76, 12, 35);
            // Hands — weapon barrels
            ctx.fillStyle = '#333';
            ctx.fillRect(-40, -42, 14, 8); ctx.fillRect(26, -42, 14, 8);
            // Legs — thick
            ctx.fillStyle = '#4a5568';
            ctx.fillRect(-20, -35, 15, 35); ctx.strokeRect(-20, -35, 15, 35);
            ctx.fillRect(5, -35, 15, 35); ctx.strokeRect(5, -35, 15, 35);
            // Feet — large
            ctx.fillRect(-23, -3, 20, 5); ctx.fillRect(3, -3, 20, 5);
            // Jet exhaust
            if (Math.random() < 0.4) {
                for (let side = -1; side <= 1; side += 2) {
                    particles.push({ x: this.x + side * 12, y: this.y,
                        vx: (Math.random() - 0.5) * 1.5, vy: 3 + Math.random() * 3,
                        life: 6 + Math.random() * 4, maxLife: 10, color: Math.random() > 0.5 ? '#ff8800' : '#ffcc00' });
                }
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Pizza Rage: pizza monster ──
        if (this.rageActive && this.style === 'pizza') {
            const t = Date.now() * 0.004;
            ctx.shadowColor = '#ff8c00'; ctx.shadowBlur = 12;
            // Circular pizza body
            const pizzaR = 35;
            const cy = -this.height * 0.5;
            // Crust edge
            ctx.fillStyle = '#d4a050';
            ctx.beginPath(); ctx.arc(0, cy, pizzaR, 0, Math.PI * 2); ctx.fill();
            // Sauce
            ctx.fillStyle = '#cc3300';
            ctx.beginPath(); ctx.arc(0, cy, pizzaR - 5, 0, Math.PI * 2); ctx.fill();
            // Cheese
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath(); ctx.arc(0, cy, pizzaR - 8, 0, Math.PI * 2); ctx.fill();
            // Pepperoni eyes
            ctx.fillStyle = '#aa2200';
            ctx.beginPath(); ctx.arc(-10, cy - 5, 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(10, cy - 5, 6, 0, Math.PI * 2); ctx.fill();
            // Eye pupils
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(-9, cy - 6, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(11, cy - 6, 2.5, 0, Math.PI * 2); ctx.fill();
            // Mouth
            ctx.strokeStyle = '#aa2200'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, cy + 5, 10, 0.1, Math.PI - 0.1); ctx.stroke();
            // Extra pepperoni spots
            const pepPos = [[-15, 10], [12, 12], [0, -15], [-18, -8], [16, -10]];
            ctx.fillStyle = '#aa2200';
            for (const [px, py] of pepPos) {
                ctx.beginPath(); ctx.arc(px, cy + py, 4, 0, Math.PI * 2); ctx.fill();
            }
            // Cheese dripping
            ctx.fillStyle = '#ffdd44';
            for (let i = 0; i < 4; i++) {
                const dx = -15 + i * 10, dLen = 8 + Math.sin(t + i) * 5;
                ctx.beginPath(); ctx.moveTo(dx - 3, cy + pizzaR - 5);
                ctx.quadraticCurveTo(dx, cy + pizzaR + dLen, dx + 3, cy + pizzaR - 5); ctx.fill();
            }
            // Arms (breadstick arms)
            ctx.fillStyle = '#d4a050'; ctx.strokeStyle = '#b8883a'; ctx.lineWidth = 1;
            ctx.save(); ctx.translate(-pizzaR, cy);
            ctx.rotate(-0.3 + Math.sin(t) * 0.2);
            ctx.fillRect(-20, -4, 20, 8); ctx.strokeRect(-20, -4, 20, 8); ctx.restore();
            ctx.save(); ctx.translate(pizzaR, cy);
            ctx.rotate(0.3 - Math.sin(t) * 0.2);
            ctx.fillRect(0, -4, 20, 8); ctx.strokeRect(0, -4, 20, 8); ctx.restore();
            // Legs
            ctx.fillStyle = '#d4a050';
            ctx.fillRect(-10, cy + pizzaR - 5, 8, 20 + (cy + pizzaR - 5 > -20 ? 0 : -(cy + pizzaR - 5 + 20)));
            ctx.fillRect(2, cy + pizzaR - 5, 8, 20 + (cy + pizzaR - 5 > -20 ? 0 : -(cy + pizzaR - 5 + 20)));
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Cat Rage: giant cat ──
        if (this.rageActive && this.style === 'cat') {
            const t = Date.now() * 0.004;
            const purr = Math.sin(t * 3) * 1.5;
            ctx.shadowColor = '#ffa500'; ctx.shadowBlur = 10;
            // Body — sitting cat oval
            ctx.fillStyle = '#ff8c42';
            ctx.beginPath(); ctx.ellipse(0, -35 + purr, 25, 28, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#cc6622'; ctx.lineWidth = 1.5; ctx.stroke();
            // Head
            ctx.fillStyle = '#ff8c42';
            ctx.beginPath(); ctx.arc(0, -72 + purr, 18, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#cc6622'; ctx.stroke();
            // Ears — pointed triangles
            ctx.fillStyle = '#ff8c42'; ctx.strokeStyle = '#cc6622';
            ctx.beginPath(); ctx.moveTo(-12, -85 + purr); ctx.lineTo(-18, -100 + purr);
            ctx.lineTo(-5, -88 + purr); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(12, -85 + purr); ctx.lineTo(18, -100 + purr);
            ctx.lineTo(5, -88 + purr); ctx.closePath(); ctx.fill(); ctx.stroke();
            // Inner ears
            ctx.fillStyle = '#ffb0b0';
            ctx.beginPath(); ctx.moveTo(-11, -85 + purr); ctx.lineTo(-15, -95 + purr);
            ctx.lineTo(-7, -87 + purr); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(11, -85 + purr); ctx.lineTo(15, -95 + purr);
            ctx.lineTo(7, -87 + purr); ctx.closePath(); ctx.fill();
            // Eyes — big and bright
            ctx.fillStyle = '#2ecc71';
            ctx.beginPath(); ctx.ellipse(-7, -74 + purr, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(7, -74 + purr, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
            // Pupils — vertical slits
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.ellipse(-7, -74 + purr, 2, 5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(7, -74 + purr, 2, 5, 0, 0, Math.PI * 2); ctx.fill();
            // Nose
            ctx.fillStyle = '#ff6699';
            ctx.beginPath(); ctx.moveTo(-2, -68 + purr); ctx.lineTo(2, -68 + purr);
            ctx.lineTo(0, -66 + purr); ctx.closePath(); ctx.fill();
            // Whiskers
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
            for (let side = -1; side <= 1; side += 2) {
                ctx.beginPath(); ctx.moveTo(side * 8, -68 + purr); ctx.lineTo(side * 28, -72 + purr); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(side * 8, -66 + purr); ctx.lineTo(side * 28, -66 + purr); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(side * 8, -64 + purr); ctx.lineTo(side * 28, -60 + purr); ctx.stroke();
            }
            // Front paws
            ctx.fillStyle = '#ff8c42';
            ctx.beginPath(); ctx.ellipse(-12, -8, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(12, -8, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
            // Tail — curving up
            ctx.strokeStyle = '#ff8c42'; ctx.lineWidth = 6; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(-20, -25 + purr);
            ctx.quadraticCurveTo(-35, -20 + purr, -38, -40 + purr);
            ctx.quadraticCurveTo(-40, -55 + purr, -30, -60 + purr); ctx.stroke();
            // Tail tip
            ctx.strokeStyle = '#cc6622'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(-32, -55 + purr); ctx.lineTo(-30, -60 + purr); ctx.stroke();
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Banana Rage: banana person ──
        if (this.rageActive && this.style === 'banana') {
            const t = Date.now() * 0.004;
            const sway = Math.sin(t) * 3;
            ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 12;
            // Banana body — curved shape
            ctx.fillStyle = '#ffe135';
            ctx.beginPath();
            ctx.moveTo(-8, 0); ctx.quadraticCurveTo(-20 + sway, -40, -15 + sway, -75);
            ctx.quadraticCurveTo(-5 + sway, -95, 5 + sway, -90);
            ctx.quadraticCurveTo(15 + sway, -80, 12, -40);
            ctx.quadraticCurveTo(10, -10, 8, 0); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#ccb020'; ctx.lineWidth = 2; ctx.stroke();
            // Brown tip top
            ctx.fillStyle = '#8b6914';
            ctx.beginPath(); ctx.ellipse(0 + sway, -92, 5, 4, 0.3, 0, Math.PI * 2); ctx.fill();
            // Brown tip bottom
            ctx.beginPath(); ctx.ellipse(0, -2, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
            // Face on banana
            ctx.fillStyle = '#000';
            // Eyes
            ctx.beginPath(); ctx.arc(-4 + sway * 0.5, -65, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(6 + sway * 0.5, -63, 3, 0, Math.PI * 2); ctx.fill();
            // Eye shine
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-3 + sway * 0.5, -66, 1, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(7 + sway * 0.5, -64, 1, 0, Math.PI * 2); ctx.fill();
            // Smile
            ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(1 + sway * 0.5, -58, 6, 0.2, Math.PI - 0.2); ctx.stroke();
            // Arms — thin lines
            ctx.strokeStyle = '#ffe135'; ctx.lineWidth = 4; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(-12, -55 + sway);
            ctx.lineTo(-28, -45 + Math.sin(t * 2) * 8); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(10, -50 + sway);
            ctx.lineTo(26, -40 + Math.sin(t * 2 + 1) * 8); ctx.stroke();
            // Legs
            ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-10, 10); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(10, 10); ctx.stroke();
            // Shoes
            ctx.fillStyle = '#8b4513';
            ctx.beginPath(); ctx.ellipse(-12, 11, 5, 3, -0.2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(12, 11, 5, 3, 0.2, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Grandma Rage: super grandma ──
        if (this.rageActive && this.style === 'grandma') {
            const t = Date.now() * 0.004;
            ctx.shadowColor = '#ff69b4'; ctx.shadowBlur = 15;
            // Cape — flowing behind
            ctx.fillStyle = '#c0392b';
            ctx.beginPath(); ctx.moveTo(-10, -80); ctx.quadraticCurveTo(-30 + Math.sin(t) * 5, -50, -25 + Math.sin(t) * 8, -5);
            ctx.lineTo(10, -5); ctx.quadraticCurveTo(5, -50, -10, -80); ctx.closePath(); ctx.fill();
            // Body — dress
            ctx.fillStyle = '#9b59b6';
            ctx.beginPath(); ctx.moveTo(-15, -30); ctx.lineTo(-18, -75);
            ctx.lineTo(18, -75); ctx.lineTo(15, -30);
            ctx.lineTo(18, 0); ctx.lineTo(-18, 0); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#7d3c98'; ctx.lineWidth = 1.5; ctx.stroke();
            // Head
            ctx.fillStyle = '#f4c896';
            ctx.beginPath(); ctx.arc(0, -this.height + 3, 13, 0, Math.PI * 2); ctx.fill();
            // Hair bun — gray
            ctx.fillStyle = '#c0c0c0';
            ctx.beginPath(); ctx.arc(0, -this.height - 5, 10, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(-8, -this.height + 8, 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(8, -this.height + 8, 6, 0, Math.PI * 2); ctx.fill();
            // Glasses
            ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(-6, -this.height + 2, 5, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(6, -this.height + 2, 5, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-1, -this.height + 2); ctx.lineTo(1, -this.height + 2); ctx.stroke();
            // Eyes behind glasses
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(-6, -this.height + 2, 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(6, -this.height + 2, 1.5, 0, Math.PI * 2); ctx.fill();
            // Glowing purse — held in hand
            ctx.fillStyle = '#8b4513'; ctx.strokeStyle = '#654321'; ctx.lineWidth = 1.5;
            ctx.fillRect(20, -55, 16, 14); ctx.strokeRect(20, -55, 16, 14);
            ctx.beginPath(); ctx.arc(28, -55, 6, Math.PI, 0); ctx.stroke(); // handle
            // Purse glow
            ctx.fillStyle = 'rgba(255,215,0,0.5)'; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(28, -48, 10, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Giant slippers
            ctx.fillStyle = '#ff69b4';
            ctx.beginPath(); ctx.ellipse(-8, 2, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(8, 2, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
            // Pom poms on slippers
            ctx.fillStyle = '#ff1493';
            ctx.beginPath(); ctx.arc(-12, 0, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(12, 0, 4, 0, Math.PI * 2); ctx.fill();
            // Power sparkles
            if (Math.random() < 0.3) {
                particles.push({ x: this.x + 28 * this.facing, y: this.y - 48,
                    vx: (Math.random() - 0.5) * 3, vy: -2 - Math.random() * 2,
                    life: 10 + Math.random() * 6, maxLife: 16, color: '#ffd700' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Painter Rage: paint elemental ──
        if (this.rageActive && this.style === 'painter') {
            const t = Date.now() * 0.004;
            ctx.shadowColor = '#ff6eb4'; ctx.shadowBlur = 15;
            const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#e91e63', '#00bcd4'];
            // Body — constantly color-shifting blob
            const bodyColor = colors[Math.floor(t * 0.5) % colors.length];
            const bg = ctx.createRadialGradient(0, -this.height * 0.5, 5, 0, -this.height * 0.5, 40);
            bg.addColorStop(0, bodyColor); bg.addColorStop(0.7, colors[(Math.floor(t * 0.5) + 3) % colors.length]);
            bg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = bg;
            ctx.beginPath(); ctx.ellipse(0, -this.height * 0.5, 25, 42, 0, 0, Math.PI * 2); ctx.fill();
            // Head
            ctx.fillStyle = colors[(Math.floor(t * 0.7) + 1) % colors.length];
            ctx.beginPath(); ctx.arc(0, -this.height + 2, 14, 0, Math.PI * 2); ctx.fill();
            // Beret
            ctx.fillStyle = colors[(Math.floor(t * 0.3) + 2) % colors.length];
            ctx.beginPath(); ctx.ellipse(0, -this.height - 6, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(3, -this.height - 8, 4, 0, Math.PI * 2); ctx.fill();
            // Eyes — paint splat style
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-5, -this.height + 2, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5, -this.height + 2, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(-5, -this.height + 2, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5, -this.height + 2, 2, 0, Math.PI * 2); ctx.fill();
            // Paint drips from body
            for (let i = 0; i < 5; i++) {
                const dx = -15 + i * 8;
                const dLen = 10 + Math.sin(t * 2 + i) * 6;
                ctx.fillStyle = colors[(i + Math.floor(t)) % colors.length];
                ctx.beginPath(); ctx.moveTo(dx - 3, -10);
                ctx.quadraticCurveTo(dx, -10 + dLen, dx + 3, -10); ctx.fill();
            }
            // Paint splash particles
            if (Math.random() < 0.5) {
                particles.push({ x: this.x + (Math.random() - 0.5) * 50, y: this.y - Math.random() * this.height,
                    vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 3,
                    life: 10 + Math.random() * 8, maxLife: 18,
                    color: colors[Math.floor(Math.random() * colors.length)] });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Bee Rage: giant bee ──
        if (this.rageActive && this.style === 'bee') {
            const t = Date.now() * 0.006;
            const buzz = Math.sin(t * 6) * 2;
            ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 10;
            // Wings — translucent, fast flapping
            ctx.fillStyle = 'rgba(200,230,255,0.4)'; ctx.strokeStyle = 'rgba(150,200,255,0.6)'; ctx.lineWidth = 1;
            const wingAngle = Math.sin(t * 8) * 0.4;
            // Left wing
            ctx.save(); ctx.translate(-8, -60 + buzz); ctx.rotate(-0.3 - wingAngle);
            ctx.beginPath(); ctx.ellipse(0, 0, 25, 10, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.restore();
            // Right wing
            ctx.save(); ctx.translate(8, -60 + buzz); ctx.rotate(0.3 + wingAngle);
            ctx.beginPath(); ctx.ellipse(0, 0, 25, 10, 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.restore();
            // Body — striped oval
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath(); ctx.ellipse(0, -40 + buzz, 18, 28, 0, 0, Math.PI * 2); ctx.fill();
            // Black stripes
            ctx.fillStyle = '#111';
            for (let i = 0; i < 4; i++) {
                const sy = -55 + buzz + i * 12;
                ctx.fillRect(-17, sy, 34, 5);
            }
            // Head — round
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath(); ctx.arc(0, -72 + buzz, 12, 0, Math.PI * 2); ctx.fill();
            // Eyes — large compound eyes
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.ellipse(-7, -74 + buzz, 5, 6, -0.2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(7, -74 + buzz, 5, 6, 0.2, 0, Math.PI * 2); ctx.fill();
            // Eye highlight
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-6, -76 + buzz, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(8, -76 + buzz, 2, 0, Math.PI * 2); ctx.fill();
            // Antennae
            ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(-5, -82 + buzz); ctx.quadraticCurveTo(-10, -95 + buzz, -15, -92 + buzz); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(5, -82 + buzz); ctx.quadraticCurveTo(10, -95 + buzz, 15, -92 + buzz); ctx.stroke();
            // Antenna tips
            ctx.fillStyle = '#333';
            ctx.beginPath(); ctx.arc(-15, -92 + buzz, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(15, -92 + buzz, 2, 0, Math.PI * 2); ctx.fill();
            // Stinger
            ctx.fillStyle = '#333';
            ctx.beginPath(); ctx.moveTo(-3, -12 + buzz); ctx.lineTo(0, -2 + buzz);
            ctx.lineTo(3, -12 + buzz); ctx.closePath(); ctx.fill();
            // Legs — 6 tiny legs
            ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
            for (let i = 0; i < 3; i++) {
                const ly = -30 + buzz + i * 8;
                ctx.beginPath(); ctx.moveTo(-15, ly); ctx.lineTo(-22, ly + 5); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(15, ly); ctx.lineTo(22, ly + 5); ctx.stroke();
            }
            // Buzz particles
            if (Math.random() < 0.3) {
                particles.push({ x: this.x + (Math.random() - 0.5) * 30, y: this.y - 60,
                    vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 2,
                    life: 6 + Math.random() * 4, maxLife: 10, color: '#ffdd00' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Teacher Rage: strict teacher form ──
        if (this.rageActive && this.style === 'teacher') {
            const t = Date.now() * 0.004;
            ctx.shadowColor = '#8b0000'; ctx.shadowBlur = 10;
            // Body — suit/blazer
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(-18, -80, 36, 50); ctx.strokeStyle = '#1a252f'; ctx.lineWidth = 1.5; ctx.stroke();
            // Shirt collar
            ctx.fillStyle = '#ecf0f1';
            ctx.beginPath(); ctx.moveTo(-8, -80); ctx.lineTo(0, -70); ctx.lineTo(8, -80); ctx.closePath(); ctx.fill();
            // Tie
            ctx.fillStyle = '#c0392b';
            ctx.beginPath(); ctx.moveTo(-3, -80); ctx.lineTo(0, -72); ctx.lineTo(3, -80); ctx.closePath(); ctx.fill();
            ctx.fillRect(-2, -72, 4, 12);
            // Head
            ctx.fillStyle = '#f4c896';
            ctx.beginPath(); ctx.arc(0, -this.height + 3, 13, 0, Math.PI * 2); ctx.fill();
            // Glasses — stern rectangular
            ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
            ctx.strokeRect(-11, -this.height, 9, 6);
            ctx.strokeRect(2, -this.height, 9, 6);
            ctx.beginPath(); ctx.moveTo(-2, -this.height + 3); ctx.lineTo(2, -this.height + 3); ctx.stroke();
            // Eyes behind glasses — glaring
            ctx.fillStyle = '#000';
            ctx.fillRect(-9, -this.height + 1, 5, 2);
            ctx.fillRect(4, -this.height + 1, 5, 2);
            // Hair — tight bun
            ctx.fillStyle = '#4a3020';
            ctx.beginPath(); ctx.arc(0, -this.height - 3, 10, Math.PI, 0); ctx.fill();
            ctx.beginPath(); ctx.arc(0, -this.height - 6, 6, 0, Math.PI * 2); ctx.fill();
            // Ruler sword — in right hand, glowing
            ctx.fillStyle = '#deb887'; ctx.strokeStyle = '#8b7355'; ctx.lineWidth = 1;
            const rulerAngle = -0.5 + Math.sin(t * 2) * 0.4;
            ctx.save(); ctx.translate(22, -60); ctx.rotate(rulerAngle);
            ctx.fillRect(-2, 0, 4, 50); ctx.strokeRect(-2, 0, 4, 50);
            // Ruler markings
            ctx.strokeStyle = '#333'; ctx.lineWidth = 0.5;
            for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.moveTo(-2, 5 + i * 5); ctx.lineTo(0, 5 + i * 5); ctx.stroke(); }
            ctx.restore();
            // Textbook shield — in left hand
            ctx.fillStyle = '#c0392b';
            ctx.save(); ctx.translate(-25, -60); ctx.rotate(0.2);
            ctx.fillRect(-10, -8, 20, 25); ctx.strokeStyle = '#8b0000'; ctx.lineWidth = 1; ctx.strokeRect(-10, -8, 20, 25);
            ctx.fillStyle = '#ffd700'; ctx.font = '7px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('MATH', 0, 7);
            ctx.restore();
            // Legs — dress pants
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(-12, -30, 10, 30); ctx.fillRect(2, -30, 10, 30);
            // Shoes
            ctx.fillStyle = '#111';
            ctx.fillRect(-14, -3, 13, 5); ctx.fillRect(1, -3, 13, 5);
            ctx.shadowBlur = 0; ctx.restore();
            return;
        }

        // ── Plumber Rage: plumber mech ──
        if (this.rageActive && this.style === 'plumber') {
            const t = Date.now() * 0.004;
            ctx.shadowColor = '#3498db'; ctx.shadowBlur = 12;
            // Pipe armor body — chunky cylindrical look
            ctx.fillStyle = '#7f8c8d'; ctx.strokeStyle = '#5d6d7e'; ctx.lineWidth = 2;
            // Torso — pipe sections
            ctx.fillRect(-22, -82, 44, 48); ctx.strokeRect(-22, -82, 44, 48);
            // Pipe joints on torso
            ctx.fillStyle = '#95a5a6';
            ctx.fillRect(-24, -82, 48, 6); ctx.fillRect(-24, -40, 48, 6);
            ctx.fillRect(-24, -60, 48, 6);
            // Head — pipe cap
            ctx.fillStyle = '#7f8c8d';
            ctx.beginPath(); ctx.arc(0, -this.height + 2, 14, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#5d6d7e'; ctx.stroke();
            // Cap visor
            ctx.fillStyle = '#34495e';
            ctx.fillRect(-12, -this.height - 4, 24, 8);
            // Eye slits
            ctx.fillStyle = '#3498db';
            ctx.fillRect(-8, -this.height - 1, 6, 3);
            ctx.fillRect(2, -this.height - 1, 6, 3);
            // Wrench arm (left)
            ctx.fillStyle = '#95a5a6';
            ctx.fillRect(-38, -75, 14, 35); ctx.strokeRect(-38, -75, 14, 35);
            // Wrench head
            ctx.fillStyle = '#bdc3c7';
            ctx.beginPath(); ctx.moveTo(-38, -42); ctx.lineTo(-45, -35); ctx.lineTo(-38, -28);
            ctx.lineTo(-30, -28); ctx.lineTo(-24, -35); ctx.lineTo(-30, -42); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#7f8c8d';
            ctx.fillRect(-38, -38, 8, 6); // wrench jaw gap
            // Plunger arm (right)
            ctx.fillStyle = '#95a5a6';
            ctx.fillRect(24, -75, 14, 35); ctx.strokeRect(24, -75, 14, 35);
            // Plunger
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(29, -45, 4, 25);
            ctx.fillStyle = '#c0392b';
            ctx.beginPath(); ctx.arc(31, -20, 10, 0, Math.PI); ctx.fill();
            // Legs — pipes
            ctx.fillStyle = '#7f8c8d';
            ctx.fillRect(-16, -34, 12, 34); ctx.strokeRect(-16, -34, 12, 34);
            ctx.fillRect(4, -34, 12, 34); ctx.strokeRect(4, -34, 12, 34);
            // Pipe joint rings on legs
            ctx.fillStyle = '#95a5a6';
            ctx.fillRect(-17, -18, 14, 4); ctx.fillRect(3, -18, 14, 4);
            // Boots — heavy
            ctx.fillStyle = '#5d6d7e';
            ctx.fillRect(-18, -3, 16, 5); ctx.fillRect(2, -3, 16, 5);
            // Water drip particles
            if (Math.random() < 0.3) {
                particles.push({ x: this.x + (Math.random() - 0.5) * 40, y: this.y - 20,
                    vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 2,
                    life: 10 + Math.random() * 6, maxLife: 16, color: '#3498db' });
            }
            ctx.shadowBlur = 0; ctx.restore();
            return;
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
        if (this.rageActive) { ctx.shadowColor = this.style === 'light' ? '#ffd700' : '#ff0000'; ctx.shadowBlur = 18; }
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
        // Samurai sword in hand
        if (this.style === 'samurai') {
            const armY = -this.height + 35;
            const swordAngle = this.casting ? -0.8 - Math.sin(this.castTimer / 15 * Math.PI) * 1.2 : -0.3;
            const handX = this.casting ? 20 + Math.sin(this.castTimer / 15 * Math.PI) * 25 : 15;
            const handY = armY + (this.casting ? -10 : 20);
            const sLen = 45;
            // Blade
            ctx.strokeStyle = '#e8eef4'; ctx.lineWidth = 3; ctx.lineCap = 'round';
            ctx.shadowColor = '#fff'; ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(handX, handY);
            ctx.lineTo(handX + Math.cos(swordAngle) * sLen, handY + Math.sin(swordAngle) * sLen);
            ctx.stroke();
            // Blade shine
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(handX + 2, handY);
            ctx.lineTo(handX + 2 + Math.cos(swordAngle) * sLen * 0.7, handY + Math.sin(swordAngle) * sLen * 0.7);
            ctx.stroke();
            // Guard (tsuba)
            ctx.strokeStyle = '#b08030'; ctx.lineWidth = 3; ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(handX + Math.cos(swordAngle + Math.PI / 2) * 5, handY + Math.sin(swordAngle + Math.PI / 2) * 5);
            ctx.lineTo(handX + Math.cos(swordAngle - Math.PI / 2) * 5, handY + Math.sin(swordAngle - Math.PI / 2) * 5);
            ctx.stroke();
            // Handle (tsuka)
            ctx.strokeStyle = '#4a3020'; ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(handX, handY);
            ctx.lineTo(handX - Math.cos(swordAngle) * 12, handY - Math.sin(swordAngle) * 12);
            ctx.stroke();
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
    count = Math.floor((count || 12) * 1.8);
    for (let i = 0; i < (count || 12); i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 4 + Math.random() * 12;
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
    else if (style === 'light') { visualEffects.push({ type: 'screenRadiance', life: 55, maxLife: 55 }); triggerScreenFlash('#ffd700', 0.8); }
    else if (style === 'dark') { visualEffects.push({ type: 'screenDarkness', life: 55, maxLife: 55 }); triggerScreenFlash('#000', 0.7); }
    else if (style === 'shadow') { visualEffects.push({ type: 'screenShadow', life: 55, maxLife: 55 }); triggerScreenFlash('#000', 0.5); }
    else if (style === 'portal') { visualEffects.push({ type: 'screenPortal', x, y, life: 55, maxLife: 55 }); triggerScreenFlash('#e056de', 0.6); }
    else if (style === 'washingmachine') { visualEffects.push({ type: 'screenFlood', life: 55, maxLife: 55 }); triggerScreenFlash('#87ceeb', 0.5); }
    else if (style === 'corruption') { visualEffects.push({ type: 'screenCorruption', life: 60, maxLife: 60 }); triggerScreenFlash('#ff0055', 0.7); }
    else if (style === 'crystal') { visualEffects.push({ type: 'screenCrystal', life: 55, maxLife: 55 }); triggerScreenFlash('#00e5ff', 0.7); }
    else if (style === 'rubberduck') { visualEffects.push({ type: 'screenDucks', life: 55, maxLife: 55 }); triggerScreenFlash('#ffeb3b', 0.7); }
    else if (style === 'keyboard') { visualEffects.push({ type: 'blueScreen', life: 60, maxLife: 60 }); triggerScreenFlash('#0078d7', 0.8); }
    else if (style === 'chef') { visualEffects.push({ type: 'kitchenNightmare', x: x, y: y, life: 60, maxLife: 60 }); triggerScreenFlash('#ff5722', 0.7); }
    else if (style === 'dj') { visualEffects.push({ type: 'dropTheBeat', life: 60, maxLife: 60 }); triggerScreenFlash('#e040fb', 0.8); }
    else if (style === 'pigeon') { visualEffects.push({ type: 'flockAttack', x: x, life: 60, maxLife: 60 }); triggerScreenFlash('#9e9e9e', 0.6); }
    else if (style === 'samurai') { visualEffects.push({ type: 'screenAshura', life: 55, maxLife: 55 }); triggerScreenFlash('#fff', 0.8); }
    else if (style === 'selfie') { visualEffects.push({ type: 'screenViral', life: 60, maxLife: 60 }); triggerScreenFlash('#fff', 0.8); }
    else if (style === 'ice') { visualEffects.push({ type: 'frostOverlay', life: 60, maxLife: 60 }); triggerScreenFlash('#88cfff', 0.7); }
    else if (style === 'gravity') { visualEffects.push({ type: 'screenDarkness', life: 55, maxLife: 55 }); triggerScreenFlash('#9b59b6', 0.7); }
    else if (style === 'time') { visualEffects.push({ type: 'eclipse', life: 60, maxLife: 60 }); triggerScreenFlash('#f0e68c', 0.8); }
    else if (style === 'vampire') { visualEffects.push({ type: 'screenDarkness', life: 60, maxLife: 60 }); triggerScreenFlash('#8b0000', 0.8); }
    else if (style === 'dragon') { visualEffects.push({ type: 'screenInferno', life: 60, maxLife: 60 }); triggerScreenFlash('#ff4500', 0.8); }
    else if (style === 'necro') { visualEffects.push({ type: 'screenDarkness', life: 60, maxLife: 60 }); triggerScreenFlash('#556b2f', 0.7); }
    else if (style === 'magnet') { visualEffects.push({ type: 'screenLightningStorm', life: 55, maxLife: 55 }); triggerScreenFlash('#c0c0c0', 0.7); }
    else if (style === 'mech') { visualEffects.push({ type: 'screenInferno', life: 60, maxLife: 60 }); triggerScreenFlash('#ff4400', 0.8); }
    else if (style === 'pizza') { visualEffects.push({ type: 'screenInferno', life: 55, maxLife: 55 }); triggerScreenFlash('#ff6347', 0.7); }
    else if (style === 'cat') { visualEffects.push({ type: 'screenShadow', life: 55, maxLife: 55 }); triggerScreenFlash('#dda0dd', 0.7); }
    else if (style === 'banana') { visualEffects.push({ type: 'screenRadiance', life: 55, maxLife: 55 }); triggerScreenFlash('#ffe135', 0.8); }
    else if (style === 'grandma') { visualEffects.push({ type: 'screenInferno', life: 55, maxLife: 55 }); triggerScreenFlash('#deb887', 0.7); }
    else if (style === 'painter') { visualEffects.push({ type: 'screenCorruption', life: 60, maxLife: 60 }); triggerScreenFlash('#ff69b4', 0.8); }
    else if (style === 'bee') { visualEffects.push({ type: 'screenRadiance', life: 55, maxLife: 55 }); triggerScreenFlash('#ffc107', 0.7); }
    else if (style === 'teacher') { visualEffects.push({ type: 'screenDarkness', life: 55, maxLife: 55 }); triggerScreenFlash('#2e8b57', 0.7); }
    else if (style === 'plumber') { visualEffects.push({ type: 'screenFlood', life: 60, maxLife: 60 }); triggerScreenFlash('#4169e1', 0.7); }
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

        // ── Unlock Notification ──
        if (vfx.type === 'unlockNotification') {
            const prog = 1 - a;
            const slideIn = Math.min(prog * 5, 1);
            const y = 80 + slideIn * 40;
            ctx.globalAlpha = a;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(canvas.width / 2 - 150, y - 25, 300, 50);
            ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 2;
            ctx.strokeRect(canvas.width / 2 - 150, y - 25, 300, 50);
            ctx.font = 'bold 16px "Segoe UI",Arial,sans-serif';
            ctx.textAlign = 'center'; ctx.fillStyle = '#f39c12';
            ctx.fillText('NEW STYLE UNLOCKED!', canvas.width / 2, y - 5);
            ctx.font = '14px "Segoe UI",Arial,sans-serif'; ctx.fillStyle = '#fff';
            ctx.fillText(vfx.styleName, canvas.width / 2, y + 15);
        }

        // ── Instant Attack Target Warning ──
        if (vfx.type === 'instantTarget') {
            const prog = 1 - a;
            const pulse = Math.sin(Date.now() * 0.03) * 0.3 + 0.5;
            // Warning circle shrinking toward target
            ctx.globalAlpha = a * pulse;
            ctx.strokeStyle = vfx.color; ctx.lineWidth = 2;
            ctx.shadowColor = vfx.color; ctx.shadowBlur = 12;
            const r = vfx.hitRadius * (1.5 - prog * 0.8);
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r, 0, Math.PI * 2); ctx.stroke();
            // Crosshair lines
            ctx.globalAlpha = a * 0.4;
            ctx.beginPath(); ctx.moveTo(vfx.x - r, vfx.y); ctx.lineTo(vfx.x + r, vfx.y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(vfx.x, vfx.y - r); ctx.lineTo(vfx.x, vfx.y + r); ctx.stroke();
            // Inner dot
            ctx.globalAlpha = a * 0.6; ctx.fillStyle = vfx.color;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, 4, 0, Math.PI * 2); ctx.fill();
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

        // ── Holy Beam (Light Rage) ──
        if (vfx.type === 'holyBeam') {
            const prog = 1 - a; const reveal = Math.min(prog * 5, 1);
            const beamLen = (vfx.x2 - vfx.x1) * reveal; const endX = vfx.x1 + beamLen;
            ctx.globalAlpha = a * 0.4; ctx.strokeStyle = '#b8960c'; ctx.lineWidth = 45 * a;
            ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 60;
            ctx.beginPath(); ctx.moveTo(vfx.x1, vfx.y1); ctx.lineTo(endX, vfx.y1); ctx.stroke();
            ctx.globalAlpha = a * 0.7; ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 24 * a;
            ctx.beginPath(); ctx.moveTo(vfx.x1, vfx.y1); ctx.lineTo(endX, vfx.y1); ctx.stroke();
            ctx.globalAlpha = a * 0.9; ctx.strokeStyle = '#fffacd'; ctx.lineWidth = 12 * a;
            ctx.beginPath(); ctx.moveTo(vfx.x1, vfx.y1); ctx.lineTo(endX, vfx.y1); ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 5 * a;
            ctx.beginPath(); ctx.moveTo(vfx.x1, vfx.y1); ctx.lineTo(endX, vfx.y1); ctx.stroke();
            if (vfx.life % 2 === 0) { for (let i = 0; i < 4; i++) {
                const px = vfx.x1 + Math.random() * beamLen;
                particles.push({ x: px, y: vfx.y1 + (Math.random() - 0.5) * 20,
                    vx: (Math.random() - 0.5) * 3, vy: -2 - Math.random() * 4,
                    life: 8 + Math.random() * 6, maxLife: 14, color: '#ffd700' });
            }} ctx.shadowBlur = 0;
        }
        // ── Dark Beam (Dark Rage) ──
        if (vfx.type === 'darkBeam') {
            const prog = 1 - a; const reveal = Math.min(prog * 5, 1);
            const beamLen = (vfx.x2 - vfx.x1) * reveal; const endX = vfx.x1 + beamLen;
            ctx.globalAlpha = a * 0.4; ctx.strokeStyle = '#1a0030'; ctx.lineWidth = 45 * a;
            ctx.shadowColor = '#8e44ad'; ctx.shadowBlur = 60;
            ctx.beginPath(); ctx.moveTo(vfx.x1, vfx.y1); ctx.lineTo(endX, vfx.y1); ctx.stroke();
            ctx.globalAlpha = a * 0.7; ctx.strokeStyle = '#6c3483'; ctx.lineWidth = 24 * a;
            ctx.beginPath(); ctx.moveTo(vfx.x1, vfx.y1); ctx.lineTo(endX, vfx.y1); ctx.stroke();
            ctx.globalAlpha = a * 0.9; ctx.strokeStyle = '#8e44ad'; ctx.lineWidth = 12 * a;
            ctx.beginPath(); ctx.moveTo(vfx.x1, vfx.y1); ctx.lineTo(endX, vfx.y1); ctx.stroke();
            ctx.strokeStyle = '#bb88dd'; ctx.lineWidth = 4 * a;
            ctx.beginPath(); ctx.moveTo(vfx.x1, vfx.y1); ctx.lineTo(endX, vfx.y1); ctx.stroke();
            if (vfx.life % 2 === 0) { for (let i = 0; i < 4; i++) {
                const px = vfx.x1 + Math.random() * beamLen;
                particles.push({ x: px, y: vfx.y1 + (Math.random() - 0.5) * 20,
                    vx: (Math.random() - 0.5) * 3, vy: -2 - Math.random() * 4,
                    life: 8 + Math.random() * 6, maxLife: 14, color: '#8e44ad' });
            }} ctx.shadowBlur = 0;
        }

        // ── Hydro Cannon (Water Rage) ──
        if (vfx.type === 'hydroCannon') {
            const prog = 1 - a;
            const reveal = Math.min(prog * 5, 1);
            const beamLen = (vfx.x2 - vfx.x1) * reveal;
            const endX = vfx.x1 + beamLen;
            ctx.globalAlpha = a * 0.4;
            ctx.strokeStyle = '#1a5276'; ctx.lineWidth = 45 * a;
            ctx.shadowColor = '#3498db'; ctx.shadowBlur = 50;
            ctx.beginPath(); ctx.moveTo(vfx.x1, vfx.y1); ctx.lineTo(endX, vfx.y1); ctx.stroke();
            ctx.globalAlpha = a * 0.7;
            ctx.strokeStyle = '#3498db'; ctx.lineWidth = 24 * a;
            ctx.beginPath(); ctx.moveTo(vfx.x1, vfx.y1); ctx.lineTo(endX, vfx.y1); ctx.stroke();
            ctx.globalAlpha = a * 0.9;
            ctx.strokeStyle = '#85c1e9'; ctx.lineWidth = 12 * a;
            ctx.beginPath(); ctx.moveTo(vfx.x1, vfx.y1); ctx.lineTo(endX, vfx.y1); ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 5 * a;
            ctx.beginPath(); ctx.moveTo(vfx.x1, vfx.y1); ctx.lineTo(endX, vfx.y1); ctx.stroke();
            if (vfx.life % 2 === 0) {
                for (let i = 0; i < 4; i++) {
                    const px = vfx.x1 + Math.random() * beamLen;
                    particles.push({ x: px, y: vfx.y1 + (Math.random() - 0.5) * 25,
                        vx: (Math.random() - 0.5) * 3, vy: -2 - Math.random() * 4,
                        life: 8 + Math.random() * 6, maxLife: 14, color: '#aed6f1' });
                }
            }
            ctx.shadowBlur = 0;
        }

        // ── Abyssal Flood (Water Rage) ──
        if (vfx.type === 'abyssalFlood') {
            const prog = 1 - a;
            const waveX = (vfx.dir > 0 ? -200 : canvas.width + 200) + vfx.dir * prog * (canvas.width + 400);
            const waveH = 250;
            // Dark underwater tint
            ctx.globalAlpha = a * 0.3;
            ctx.fillStyle = '#0a2540';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Rising water level
            const waterLevel = groundY - prog * 150 * a;
            ctx.globalAlpha = a * 0.4;
            ctx.fillStyle = 'rgba(41, 128, 185, 0.5)';
            ctx.fillRect(0, waterLevel, canvas.width, canvas.height - waterLevel);
            // Massive wave
            ctx.globalAlpha = a * 0.7;
            ctx.shadowColor = '#2980b9'; ctx.shadowBlur = 30;
            ctx.fillStyle = 'rgba(52, 152, 219, 0.6)';
            ctx.beginPath();
            ctx.moveTo(waveX - 150, canvas.height);
            ctx.quadraticCurveTo(waveX - 60, groundY - waveH * 0.5, waveX, groundY - waveH);
            ctx.quadraticCurveTo(waveX + 80, groundY - waveH * 1.1, waveX + 120, groundY - waveH * 0.5);
            ctx.quadraticCurveTo(waveX + 160, groundY, waveX + 200, canvas.height);
            ctx.closePath(); ctx.fill();
            // Foam cap
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(waveX - 20, groundY - waveH * 0.9);
            ctx.quadraticCurveTo(waveX + 80, groundY - waveH * 1.1, waveX + 120, groundY - waveH * 0.5);
            ctx.stroke();
            // Bubbles
            if (vfx.life % 2 === 0) {
                for (let i = 0; i < 5; i++) {
                    particles.push({ x: Math.random() * canvas.width, y: groundY + Math.random() * 30,
                        vx: (Math.random() - 0.5) * 2, vy: -3 - Math.random() * 5,
                        life: 10 + Math.random() * 10, maxLife: 20, color: '#aed6f1' });
                }
            }
            ctx.shadowBlur = 0;
        }

        // ── Frost Overlay (Water Rage - Frozen Graveyard) ──
        if (vfx.type === 'frostOverlay') {
            const prog = 1 - a;
            ctx.globalAlpha = a * 0.3;
            // Frost edges on screen
            const edgeW = 120 * a;
            const fg1 = ctx.createLinearGradient(0, 0, edgeW, 0);
            fg1.addColorStop(0, 'rgba(174,214,241,0.7)'); fg1.addColorStop(1, 'rgba(174,214,241,0)');
            ctx.fillStyle = fg1; ctx.fillRect(0, 0, edgeW, canvas.height);
            const fg2 = ctx.createLinearGradient(canvas.width, 0, canvas.width - edgeW, 0);
            fg2.addColorStop(0, 'rgba(174,214,241,0.7)'); fg2.addColorStop(1, 'rgba(174,214,241,0)');
            ctx.fillStyle = fg2; ctx.fillRect(canvas.width - edgeW, 0, edgeW, canvas.height);
            const fg3 = ctx.createLinearGradient(0, 0, 0, edgeW);
            fg3.addColorStop(0, 'rgba(214,234,248,0.6)'); fg3.addColorStop(1, 'rgba(214,234,248,0)');
            ctx.fillStyle = fg3; ctx.fillRect(0, 0, canvas.width, edgeW);
            // Ice crystals on edges
            if (vfx.life % 4 === 0) {
                particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height * 0.3,
                    vx: (Math.random() - 0.5) * 1, vy: 0.5 + Math.random(),
                    life: 15 + Math.random() * 10, maxLife: 25, color: '#d4efdf' });
            }
        }

        // ── Divine Smite (Lightning Rage) ──
        if (vfx.type === 'divineSmite') {
            const prog = 1 - a;
            // Massive pillar of light from sky
            const pillarW = 80 * a;
            ctx.globalAlpha = a * 0.6;
            const pg = ctx.createLinearGradient(vfx.x, 0, vfx.x, groundY);
            pg.addColorStop(0, 'rgba(241,196,15,0)'); pg.addColorStop(0.3, 'rgba(241,196,15,0.5)');
            pg.addColorStop(0.7, 'rgba(255,255,255,0.8)'); pg.addColorStop(1, '#f1c40f');
            ctx.fillStyle = pg;
            ctx.fillRect(vfx.x - pillarW / 2, 0, pillarW, groundY);
            // Inner bright core
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillRect(vfx.x - pillarW / 4, 0, pillarW / 2, groundY);
            // Ground impact circle
            ctx.globalAlpha = a * 0.7;
            const cr = prog * 200;
            ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 6;
            ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 30;
            ctx.beginPath(); ctx.arc(vfx.x, groundY, cr, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // ── Plasma Field (Lightning Rage) ──
        if (vfx.type === 'plasmaField') {
            const prog = 1 - a;
            const r = 60 + prog * 180;
            ctx.globalAlpha = a * 0.4;
            // Electric field sphere
            ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 40;
            const pfg = ctx.createRadialGradient(vfx.x, vfx.y, 0, vfx.x, vfx.y, r);
            pfg.addColorStop(0, 'rgba(255,255,255,0.3)'); pfg.addColorStop(0.3, 'rgba(241,196,15,0.2)');
            pfg.addColorStop(0.7, 'rgba(241,196,15,0.1)'); pfg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = pfg;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r, 0, Math.PI * 2); ctx.fill();
            // Crackling arcs across the field
            ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2; ctx.globalAlpha = a * 0.7;
            for (let i = 0; i < 6; i++) {
                const a1 = Math.random() * Math.PI * 2;
                const a2 = a1 + (Math.random() - 0.5) * 2;
                ctx.beginPath();
                ctx.moveTo(vfx.x + Math.cos(a1) * r * 0.3, vfx.y + Math.sin(a1) * r * 0.3);
                ctx.lineTo(vfx.x + Math.cos(a2) * r * 0.9, vfx.y + Math.sin(a2) * r * 0.9);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }

        // ── Earthquake (Earth Rage) ──
        if (vfx.type === 'earthquake') {
            const prog = 1 - a;
            // Ground cracking across entire screen
            ctx.globalAlpha = a * 0.6;
            ctx.strokeStyle = '#8b5e3c'; ctx.lineWidth = 4;
            ctx.shadowColor = '#a0522d'; ctx.shadowBlur = 10;
            for (let i = 0; i < 12; i++) {
                const sx = (i / 12) * canvas.width;
                ctx.beginPath(); ctx.moveTo(sx, groundY);
                let cy = groundY;
                for (let j = 0; j < 4; j++) {
                    cy -= 20 + Math.random() * 30;
                    ctx.lineTo(sx + (Math.random() - 0.5) * 40, cy);
                }
                ctx.stroke();
            }
            // Dust from ground
            if (vfx.life % 2 === 0) {
                for (let i = 0; i < 6; i++) {
                    particles.push({ x: Math.random() * canvas.width, y: groundY,
                        vx: (Math.random() - 0.5) * 6, vy: -4 - Math.random() * 8,
                        life: 10 + Math.random() * 10, maxLife: 20,
                        color: `hsl(28, 35%, ${35 + Math.random() * 25}%)` });
                }
            }
            ctx.shadowBlur = 0;
        }

        // ── Toxic Overlay (Acid Rage) ──
        if (vfx.type === 'toxicOverlay') {
            ctx.globalAlpha = a * 0.2;
            ctx.fillStyle = '#39ff14';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Toxic drips from top
            ctx.globalAlpha = a * 0.5;
            for (let i = 0; i < 10; i++) {
                const dx = (i / 10) * canvas.width + Math.sin(Date.now() * 0.002 + i) * 15;
                const dripH = (Math.sin(Date.now() * 0.004 + i * 1.5) * 0.5 + 0.5) * 120 * a;
                ctx.fillStyle = 'rgba(57,255,20,0.4)';
                ctx.fillRect(dx - 5, 0, 10, dripH);
            }
        }

        // ── Light VFX ──
        if (vfx.type === 'radiantBurst') {
            const prog = 1 - a; const r = 40 + prog * 160;
            ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 40;
            // Expanding golden rings
            ctx.globalAlpha = a * 0.6; ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 8 * a;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#fffacd'; ctx.lineWidth = 4 * a;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r * 0.65, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * a;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r * 0.3, 0, Math.PI * 2); ctx.stroke();
            // Brilliant light rays shooting outward
            ctx.globalAlpha = a * 0.7;
            for (let i = 0; i < 12; i++) {
                const ra = (i / 12) * Math.PI * 2;
                const rayLen = r * (0.8 + Math.sin(i * 3.7) * 0.3);
                ctx.strokeStyle = i % 2 === 0 ? '#ffd700' : '#fff'; ctx.lineWidth = (3 - (i % 3)) * a;
                ctx.beginPath(); ctx.moveTo(vfx.x + Math.cos(ra) * r * 0.15, vfx.y + Math.sin(ra) * r * 0.15);
                ctx.lineTo(vfx.x + Math.cos(ra) * rayLen, vfx.y + Math.sin(ra) * rayLen); ctx.stroke();
            }
            // Center flash
            if (prog < 0.3) {
                ctx.globalAlpha = (0.3 - prog) / 0.3 * 0.7;
                const fg = ctx.createRadialGradient(vfx.x, vfx.y, 0, vfx.x, vfx.y, 80);
                fg.addColorStop(0, '#fff'); fg.addColorStop(0.3, '#ffd700'); fg.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(vfx.x, vfx.y, 80, 0, Math.PI * 2); ctx.fill();
            }
            // Sparkle particles
            if (vfx.life % 2 === 0) {
                for (let i = 0; i < 4; i++) {
                    const sa = Math.random() * Math.PI * 2; const ss = 3 + Math.random() * 5;
                    particles.push({ x: vfx.x, y: vfx.y, vx: Math.cos(sa) * ss, vy: Math.sin(sa) * ss,
                        life: 8 + Math.random() * 8, maxLife: 16, color: '#ffd700' });
                }
            }
            ctx.shadowBlur = 0;
        }
        if (vfx.type === 'judgmentPillar') {
            const prog = 1 - a;
            const pillarW = 90 * a;
            ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 50;
            // Massive pillar of divine light
            ctx.globalAlpha = a * 0.7;
            const pg = ctx.createLinearGradient(vfx.x, 0, vfx.x, groundY);
            pg.addColorStop(0, 'rgba(255,215,0,0)'); pg.addColorStop(0.2, 'rgba(255,215,0,0.5)');
            pg.addColorStop(0.5, 'rgba(255,250,200,0.8)'); pg.addColorStop(0.8, 'rgba(255,255,255,0.9)'); pg.addColorStop(1, '#ffd700');
            ctx.fillStyle = pg; ctx.fillRect(vfx.x - pillarW / 2, 0, pillarW, groundY);
            // Inner white-hot core
            ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(vfx.x - pillarW / 4, 0, pillarW / 2, groundY);
            // Ground impact ring
            ctx.globalAlpha = a * 0.8;
            const cr = prog * 200;
            ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 6; ctx.shadowBlur = 30;
            ctx.beginPath(); ctx.arc(vfx.x, groundY, cr, 0, Math.PI * 2); ctx.stroke();
            // Holy runes/symbols floating up
            ctx.globalAlpha = a * 0.5; ctx.strokeStyle = '#fffacd'; ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const ry = groundY - prog * 300 - i * 60;
                const rx = vfx.x + Math.sin(Date.now() * 0.005 + i) * 20;
                ctx.beginPath(); ctx.arc(rx, ry, 8, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(rx, ry - 12); ctx.lineTo(rx, ry + 12); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(rx - 10, ry); ctx.lineTo(rx + 10, ry); ctx.stroke();
            }
            // Ascending light particles
            if (vfx.life % 2 === 0) {
                for (let i = 0; i < 5; i++) {
                    particles.push({ x: vfx.x + (Math.random() - 0.5) * pillarW, y: groundY - Math.random() * groundY,
                        vx: (Math.random() - 0.5) * 2, vy: -3 - Math.random() * 4,
                        life: 10 + Math.random() * 8, maxLife: 18, color: '#ffd700' });
                }
            }
            ctx.shadowBlur = 0;
        }
        if (vfx.type === 'screenRadiance') {
            ctx.globalAlpha = a * 0.25; ctx.fillStyle = '#ffd700'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Light rays from center
            ctx.globalAlpha = a * 0.15;
            for (let i = 0; i < 12; i++) { const ra = (i / 12) * Math.PI * 2 + Date.now() * 0.001;
                ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 8;
                ctx.beginPath(); ctx.moveTo(canvas.width / 2, canvas.height / 2);
                ctx.lineTo(canvas.width / 2 + Math.cos(ra) * canvas.width, canvas.height / 2 + Math.sin(ra) * canvas.height); ctx.stroke();
            }
        }

        // ── Dark VFX ──
        if (vfx.type === 'voidGrip') {
            const prog = 1 - a; ctx.shadowColor = '#8e44ad'; ctx.shadowBlur = 30;
            // Dark void center
            ctx.globalAlpha = a * 0.8;
            const vg = ctx.createRadialGradient(vfx.x, vfx.y, 0, vfx.x, vfx.y, 40 * a);
            vg.addColorStop(0, '#000'); vg.addColorStop(0.5, '#1a0a2e'); vg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = vg; ctx.beginPath(); ctx.arc(vfx.x, vfx.y, 40 * a, 0, Math.PI * 2); ctx.fill();
            // Menacing tendrils reaching from all directions
            ctx.strokeStyle = '#6c3483'; ctx.lineWidth = 5;
            for (let i = 0; i < 8; i++) {
                const ta = (i / 8) * Math.PI * 2 + Date.now() * 0.005;
                const tr = 100 * a; const reveal = Math.min(prog * 3, 1);
                ctx.globalAlpha = a * 0.7;
                ctx.beginPath(); ctx.moveTo(vfx.x + Math.cos(ta) * tr, vfx.y + Math.sin(ta) * tr);
                ctx.quadraticCurveTo(vfx.x + Math.cos(ta + 0.3) * tr * 0.5 * reveal, vfx.y + Math.sin(ta + 0.3) * tr * 0.5 * reveal, vfx.x, vfx.y);
                ctx.stroke();
                // Tendril tips glow
                ctx.fillStyle = '#8e44ad'; ctx.beginPath();
                ctx.arc(vfx.x + Math.cos(ta) * tr, vfx.y + Math.sin(ta) * tr, 4, 0, Math.PI * 2); ctx.fill();
            }
            // Purple energy pulse
            ctx.globalAlpha = a * 0.3; ctx.strokeStyle = '#8e44ad'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, 30 + prog * 50, 0, Math.PI * 2); ctx.stroke();
            // Dark mist particles
            if (vfx.life % 2 === 0) { for (let i = 0; i < 3; i++) {
                const sa = Math.random() * Math.PI * 2;
                particles.push({ x: vfx.x + Math.cos(sa) * 60, y: vfx.y + Math.sin(sa) * 60,
                    vx: -Math.cos(sa) * 3, vy: -Math.sin(sa) * 3,
                    life: 8 + Math.random() * 6, maxLife: 14, color: '#6c3483' });
            }} ctx.shadowBlur = 0;
        }
        if (vfx.type === 'abyss') {
            const prog = 1 - a; const r = Math.min(prog * 3, 1) * 160;
            ctx.shadowColor = '#8e44ad'; ctx.shadowBlur = 35;
            // Dark pit in the ground
            ctx.globalAlpha = a * 0.8; ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.ellipse(vfx.x, vfx.y, r, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
            // Concentric rings
            for (let i = 0; i < 4; i++) {
                const rr = r * (1 - i * 0.2);
                ctx.strokeStyle = `rgba(142,68,173,${0.7 - i * 0.15})`; ctx.lineWidth = 3 - i * 0.5;
                ctx.beginPath(); ctx.ellipse(vfx.x, vfx.y, rr, rr * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
            }
            // Things being sucked in — spiral lines
            ctx.strokeStyle = '#6c3483'; ctx.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
                const sa = (i / 6) * Math.PI * 2 + Date.now() * 0.008;
                const spiralR = r * 1.3;
                ctx.globalAlpha = a * 0.5; ctx.beginPath();
                ctx.moveTo(vfx.x + Math.cos(sa) * spiralR, vfx.y + Math.sin(sa) * spiralR * 0.3);
                ctx.quadraticCurveTo(vfx.x + Math.cos(sa + 1) * spiralR * 0.5, vfx.y + Math.sin(sa + 1) * spiralR * 0.15, vfx.x, vfx.y);
                ctx.stroke();
            }
            // Purple mist erupting
            if (vfx.life % 2 === 0) { for (let i = 0; i < 5; i++) {
                particles.push({ x: vfx.x + (Math.random() - 0.5) * r * 2, y: vfx.y,
                    vx: (Math.random() - 0.5) * 3, vy: -3 - Math.random() * 6,
                    life: 12 + Math.random() * 10, maxLife: 22, color: '#8e44ad' });
            }} ctx.shadowBlur = 0;
        }
        if (vfx.type === 'screenDarkness') {
            ctx.globalAlpha = a * 0.5; ctx.fillStyle = '#0a001e'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Purple lightning
            if (vfx.life % 5 === 0) { ctx.globalAlpha = a * 0.6; ctx.strokeStyle = '#8e44ad'; ctx.lineWidth = 2;
                ctx.beginPath(); let bx = Math.random() * canvas.width, by = 0; ctx.moveTo(bx, by);
                while (by < canvas.height) { bx += (Math.random() - 0.5) * 60; by += 30 + Math.random() * 50; ctx.lineTo(bx, by); }
                ctx.stroke();
            }
        }

        // ── Shadow VFX ──
        if (vfx.type === 'phantomSlash') {
            const prog = 1 - a; const reveal = Math.min(prog * 5, 1);
            ctx.shadowColor = '#aaa'; ctx.shadowBlur = 20;
            // Multiple afterimage slashes
            for (let s = 0; s < 3; s++) {
                const offset = s * 5; const alpha = a * (0.8 - s * 0.2);
                const slashAngle = vfx.dir > 0 ? -0.6 : 2.5;
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = s === 0 ? '#ccc' : '#777'; ctx.lineWidth = (8 - s * 2) * a;
                ctx.beginPath(); ctx.arc(vfx.x - offset * vfx.dir, vfx.y, 60 + s * 5, slashAngle, slashAngle + reveal * 1.6); ctx.stroke();
            }
            // White flash core
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 * a; ctx.globalAlpha = a * 0.9;
            const slashAngle = vfx.dir > 0 ? -0.6 : 2.5;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, 50, slashAngle, slashAngle + reveal * 1.6); ctx.stroke();
            // Shadow particles from slash
            if (vfx.life % 2 === 0) { for (let i = 0; i < 3; i++) {
                const sa = slashAngle + Math.random() * reveal * 1.6;
                particles.push({ x: vfx.x + Math.cos(sa) * 55, y: vfx.y + Math.sin(sa) * 55,
                    vx: Math.cos(sa) * 3, vy: Math.sin(sa) * 3,
                    life: 6 + Math.random() * 4, maxLife: 10, color: '#888' });
            }} ctx.shadowBlur = 0;
        }
        if (vfx.type === 'eclipse') {
            const prog = 1 - a;
            // Darkness spreading across screen
            ctx.globalAlpha = a * 0.6; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Black sun with corona
            const sunX = canvas.width / 2, sunY = canvas.height * 0.35, sunR = 80;
            ctx.globalAlpha = a * 0.9;
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();
            // Silvery corona
            ctx.shadowColor = '#708090'; ctx.shadowBlur = 50;
            ctx.strokeStyle = '#aaa'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(sunX, sunY, sunR + 3, 0, Math.PI * 2); ctx.stroke();
            // Corona rays
            ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
            for (let i = 0; i < 16; i++) {
                const ra = (i / 16) * Math.PI * 2 + Date.now() * 0.002;
                const rayLen = 20 + Math.sin(Date.now() * 0.008 + i * 2) * 15;
                ctx.globalAlpha = a * (0.3 + Math.sin(i * 1.5) * 0.15);
                ctx.beginPath(); ctx.moveTo(sunX + Math.cos(ra) * (sunR + 5), sunY + Math.sin(ra) * (sunR + 5));
                ctx.lineTo(sunX + Math.cos(ra) * (sunR + 5 + rayLen), sunY + Math.sin(ra) * (sunR + 5 + rayLen)); ctx.stroke();
            }
            // Shadow tendrils from the eclipse
            if (vfx.life % 3 === 0) {
                particles.push({ x: sunX + (Math.random() - 0.5) * 200, y: sunY + sunR,
                    vx: (Math.random() - 0.5) * 4, vy: 3 + Math.random() * 5,
                    life: 15 + Math.random() * 10, maxLife: 25, color: '#444' });
            }
            ctx.shadowBlur = 0;
        }
        if (vfx.type === 'screenShadow') {
            ctx.globalAlpha = a * 0.45; ctx.fillStyle = '#111'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Shadow tendrils from edges
            ctx.globalAlpha = a * 0.4;
            for (let i = 0; i < 8; i++) { const sx = (i / 8) * canvas.width;
                ctx.fillStyle = '#000'; ctx.beginPath();
                ctx.moveTo(sx, canvas.height); ctx.quadraticCurveTo(sx + 30, canvas.height - 200 * a, sx + 60, canvas.height);
                ctx.fill();
            }
        }

        // ── Portal VFX ──
        if (vfx.type === 'warpPortal') {
            const prog = 1 - a; const r = Math.min(prog * 4, 1) * 65;
            ctx.shadowColor = '#e056de'; ctx.shadowBlur = 35;
            // Dark dimensional void
            ctx.globalAlpha = a * 0.8;
            const vg = ctx.createRadialGradient(vfx.x, vfx.y, 0, vfx.x, vfx.y, r * 0.6);
            vg.addColorStop(0, '#000'); vg.addColorStop(0.5, '#1a0030'); vg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = vg; ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r * 0.6, 0, Math.PI * 2); ctx.fill();
            // Multiple spinning portal rings
            for (let i = 0; i < 4; i++) {
                const ra = Date.now() * 0.012 + i * 1.2;
                const ringR = r * (1 - i * 0.1);
                ctx.strokeStyle = `hsla(300, 70%, ${55 + i * 12}%, ${0.8 - i * 0.15})`; ctx.lineWidth = (4 - i) * a;
                ctx.beginPath(); ctx.ellipse(vfx.x, vfx.y, ringR, ringR * 0.4, ra, 0, Math.PI * 2); ctx.stroke();
            }
            // Energy burst from portal
            ctx.strokeStyle = '#e056de'; ctx.lineWidth = 2; ctx.globalAlpha = a * 0.5;
            for (let i = 0; i < 6; i++) {
                const ba = (i / 6) * Math.PI * 2 + Date.now() * 0.008;
                ctx.beginPath(); ctx.moveTo(vfx.x + Math.cos(ba) * r * 0.3, vfx.y + Math.sin(ba) * r * 0.12);
                ctx.lineTo(vfx.x + Math.cos(ba) * r * 1.2, vfx.y + Math.sin(ba) * r * 0.48); ctx.stroke();
            }
            // Portal particles
            if (vfx.life % 2 === 0) { for (let i = 0; i < 3; i++) {
                const pa = Math.random() * Math.PI * 2;
                particles.push({ x: vfx.x + Math.cos(pa) * r, y: vfx.y + Math.sin(pa) * r * 0.4,
                    vx: -Math.cos(pa) * 4, vy: -Math.sin(pa) * 2,
                    life: 6 + Math.random() * 6, maxLife: 12, color: '#e056de' });
            }} ctx.shadowBlur = 0;
        }
        if (vfx.type === 'voidGate') {
            const prog = 1 - a; const r = Math.min(prog * 3, 1) * 150;
            ctx.shadowColor = '#e056de'; ctx.shadowBlur = 50;
            // Dark screen overlay
            ctx.globalAlpha = a * 0.15; ctx.fillStyle = '#1a0020'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Massive void center
            ctx.globalAlpha = a * 0.9;
            const vg = ctx.createRadialGradient(vfx.x, vfx.y, 0, vfx.x, vfx.y, r * 0.5);
            vg.addColorStop(0, '#000'); vg.addColorStop(0.6, '#0a0018'); vg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = vg; ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r * 0.5, 0, Math.PI * 2); ctx.fill();
            // Massive spinning rings
            for (let i = 0; i < 5; i++) {
                const ra = Date.now() * 0.006 + i * 1.1;
                const ringR = r * (1.1 - i * 0.08);
                ctx.strokeStyle = `hsla(300, 70%, ${45 + i * 10}%, ${0.7 - i * 0.1})`; ctx.lineWidth = (6 - i) * a;
                ctx.beginPath(); ctx.ellipse(vfx.x, vfx.y, ringR, ringR * 0.35, ra, 0, Math.PI * 2); ctx.stroke();
            }
            // Reality distortion lines being sucked in
            ctx.strokeStyle = '#bb6bd9'; ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                const sa = (i / 8) * Math.PI * 2 + Date.now() * 0.005;
                ctx.globalAlpha = a * 0.4;
                ctx.beginPath();
                ctx.moveTo(vfx.x + Math.cos(sa) * r * 2, vfx.y + Math.sin(sa) * r * 0.7);
                ctx.quadraticCurveTo(vfx.x + Math.cos(sa + 0.5) * r * 0.8, vfx.y + Math.sin(sa + 0.5) * r * 0.3, vfx.x, vfx.y);
                ctx.stroke();
            }
            // Heavy particle suction
            if (vfx.life % 2 === 0) { for (let i = 0; i < 5; i++) {
                const pa = Math.random() * Math.PI * 2;
                particles.push({ x: vfx.x + Math.cos(pa) * r * 1.5, y: vfx.y + Math.sin(pa) * r * 0.5,
                    vx: -Math.cos(pa) * 5, vy: -Math.sin(pa) * 2,
                    life: 8 + Math.random() * 8, maxLife: 16, color: '#e056de' });
            }} ctx.shadowBlur = 0;
        }
        if (vfx.type === 'screenPortal') {
            ctx.globalAlpha = a * 0.3; ctx.fillStyle = '#1a0020'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Multiple small portals across screen
            ctx.globalAlpha = a * 0.5;
            for (let i = 0; i < 6; i++) { const px = ((i * 173 + 50) % canvas.width); const py = ((i * 97 + 80) % (groundY * 0.8));
                ctx.strokeStyle = '#e056de'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.ellipse(px, py, 25 + Math.sin(Date.now() * 0.005 + i) * 8, 10, Date.now() * 0.003 + i, 0, Math.PI * 2); ctx.stroke();
            }
        }

        // ── Washing Machine VFX ──
        if (vfx.type === 'spinCycle') {
            const prog = 1 - a; const r = 50 + prog * 80;
            ctx.globalAlpha = a * 0.6; ctx.shadowColor = '#87ceeb'; ctx.shadowBlur = 15;
            // Spinning water ring
            for (let i = 0; i < 8; i++) { const sa = (i / 8) * Math.PI * 2 + Date.now() * 0.02;
                ctx.strokeStyle = `hsla(197, 60%, ${60 + i * 4}%, ${0.5})`;
                ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(vfx.x + Math.cos(sa) * r * 0.3, vfx.y + Math.sin(sa) * r * 0.3, r * 0.4, sa, sa + 1.2); ctx.stroke();
            }
            // Soap bubbles
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            for (let b = 0; b < 5; b++) { const ba = Date.now() * 0.01 + b * 1.2;
                ctx.beginPath(); ctx.arc(vfx.x + Math.cos(ba) * r * 0.6, vfx.y + Math.sin(ba) * r * 0.6, 4 + Math.random() * 4, 0, Math.PI * 2); ctx.fill();
            } ctx.shadowBlur = 0;
        }
        if (vfx.type === 'floodRinse') {
            const prog = 1 - a;
            ctx.globalAlpha = a * 0.3; ctx.fillStyle = '#87ceeb'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Water rising from bottom
            const waterH = prog * 200 * a;
            ctx.globalAlpha = a * 0.5; ctx.fillStyle = 'rgba(135,206,235,0.4)';
            ctx.fillRect(0, groundY - waterH, canvas.width, waterH + canvas.height - groundY);
            // Bubbles
            if (vfx.life % 2 === 0) { for (let i = 0; i < 5; i++) {
                particles.push({ x: Math.random() * canvas.width, y: groundY - Math.random() * waterH,
                    vx: (Math.random() - 0.5) * 2, vy: -2 - Math.random() * 3,
                    life: 8 + Math.random() * 8, maxLife: 16, color: '#e8f4f8' });
            }}
        }
        if (vfx.type === 'soapPuddle') {
            ctx.globalAlpha = a * 0.35; ctx.fillStyle = '#b0e0e6';
            ctx.shadowColor = '#87ceeb'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.ellipse(vfx.x, vfx.y, 40, 8, 0, 0, Math.PI * 2); ctx.fill();
            // Bubbles on puddle
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            for (let b = 0; b < 3; b++) { const bx = vfx.x + (Math.random() - 0.5) * 50;
                ctx.beginPath(); ctx.arc(bx, vfx.y - Math.random() * 5, 2 + Math.random() * 3, 0, Math.PI * 2); ctx.fill();
            } ctx.shadowBlur = 0;
        }
        if (vfx.type === 'screenFlood') {
            ctx.globalAlpha = a * 0.3; ctx.fillStyle = '#87ceeb'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Bubbles everywhere
            if (vfx.life % 2 === 0) { for (let i = 0; i < 8; i++) {
                particles.push({ x: Math.random() * canvas.width, y: canvas.height,
                    vx: (Math.random() - 0.5) * 3, vy: -4 - Math.random() * 8,
                    life: 12 + Math.random() * 12, maxLife: 24, color: '#e8f4f8' });
            }}
            // Soap suds from top
            ctx.globalAlpha = a * 0.4;
            for (let i = 0; i < 12; i++) { const sx = (i / 12) * canvas.width;
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.beginPath(); ctx.arc(sx, Math.sin(Date.now() * 0.003 + i) * 15, 12 + Math.sin(i) * 5, 0, Math.PI * 2); ctx.fill();
            }
        }

        // ── Corruption VFX ──
        if (vfx.type === 'decayPulse') {
            const prog = 1 - a; const r = Math.min(prog * 4, 1) * 140;
            ctx.shadowColor = '#ff0055'; ctx.shadowBlur = 25;
            // Corrupted ground spreading
            ctx.globalAlpha = a * 0.7; ctx.fillStyle = '#1a0010';
            ctx.beginPath(); ctx.ellipse(vfx.x, vfx.y, r, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
            // Glowing corruption veins
            ctx.strokeStyle = '#ff0055'; ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                const ca = (i / 8) * Math.PI * 2;
                const cr = r * (0.5 + Math.sin(Date.now() * 0.01 + i * 2) * 0.3);
                ctx.globalAlpha = a * 0.6;
                ctx.beginPath(); ctx.moveTo(vfx.x, vfx.y);
                ctx.quadraticCurveTo(vfx.x + Math.cos(ca) * cr * 0.6, vfx.y + Math.sin(ca) * cr * 0.15,
                    vfx.x + Math.cos(ca) * cr, vfx.y + Math.sin(ca) * cr * 0.25); ctx.stroke();
            }
            // Glitchy pixels rising from corruption
            if (vfx.life % 2 === 0) { for (let i = 0; i < 4; i++) {
                particles.push({ x: vfx.x + (Math.random() - 0.5) * r * 2, y: vfx.y,
                    vx: (Math.random() - 0.5) * 3, vy: -2 - Math.random() * 5,
                    life: 10 + Math.random() * 8, maxLife: 18,
                    color: Math.random() > 0.5 ? '#ff0055' : '#ff3377' });
            }} ctx.shadowBlur = 0;
        }
        if (vfx.type === 'totalCorruption') {
            const prog = 1 - a;
            // Screen distortion — horizontal scan lines
            ctx.globalAlpha = a * 0.4;
            ctx.fillStyle = '#1a0010'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Glitch scan lines
            ctx.globalAlpha = a * 0.6;
            for (let i = 0; i < 20; i++) {
                const ly = (Date.now() * 0.5 + i * 47) % canvas.height;
                const lh = 2 + Math.random() * 4;
                const shift = (Math.random() - 0.5) * 30 * a;
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,0,85,0.3)' : 'rgba(0,255,200,0.2)';
                ctx.fillRect(shift, ly, canvas.width, lh);
            }
            // RGB split blocks
            ctx.globalAlpha = a * 0.3;
            for (let i = 0; i < 8; i++) {
                const bx = Math.random() * canvas.width;
                const by = Math.random() * canvas.height;
                const bw = 30 + Math.random() * 80;
                const bh = 5 + Math.random() * 20;
                ctx.fillStyle = ['#ff0000', '#00ff00', '#0000ff', '#ff0055'][Math.floor(Math.random() * 4)];
                ctx.fillRect(bx, by, bw, bh);
            }
            // Corruption particles everywhere
            if (vfx.life % 2 === 0) { for (let i = 0; i < 6; i++) {
                particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
                    life: 8 + Math.random() * 8, maxLife: 16,
                    color: Math.random() > 0.5 ? '#ff0055' : '#00ffcc' });
            }}
        }
        if (vfx.type === 'corruptionBeam') {
            const prog = 1 - a;
            const reveal = Math.min(prog * 5, 1);
            const beamLen = (vfx.x2 - vfx.x1) * reveal;
            const endX = vfx.x1 + beamLen;
            // Glitchy beam — shifts position
            const glitchY = vfx.y1 + Math.sin(Date.now() * 0.05) * 4;
            ctx.globalAlpha = a * 0.4;
            ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 35 * a;
            ctx.beginPath(); ctx.moveTo(vfx.x1, glitchY + 3); ctx.lineTo(endX, glitchY + 3); ctx.stroke();
            ctx.globalAlpha = a * 0.5;
            ctx.strokeStyle = '#ff0055'; ctx.lineWidth = 28 * a; ctx.shadowColor = '#ff0055'; ctx.shadowBlur = 40;
            ctx.beginPath(); ctx.moveTo(vfx.x1, glitchY - 2); ctx.lineTo(endX, glitchY - 2); ctx.stroke();
            ctx.globalAlpha = a * 0.8;
            ctx.strokeStyle = '#ff3377'; ctx.lineWidth = 14 * a;
            ctx.beginPath(); ctx.moveTo(vfx.x1, glitchY); ctx.lineTo(endX, glitchY); ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 4 * a;
            ctx.beginPath(); ctx.moveTo(vfx.x1, glitchY); ctx.lineTo(endX, glitchY); ctx.stroke();
            // Glitch blocks along beam
            if (vfx.life % 2 === 0) { for (let i = 0; i < 4; i++) {
                const px = vfx.x1 + Math.random() * beamLen;
                ctx.globalAlpha = a * 0.5;
                ctx.fillStyle = Math.random() > 0.5 ? '#ff0055' : '#00ffcc';
                ctx.fillRect(px - 8, glitchY - 10 - Math.random() * 15, 16 + Math.random() * 20, 4 + Math.random() * 8);
            }}
            ctx.shadowBlur = 0;
        }
        if (vfx.type === 'screenCorruption') {
            const prog = 1 - a;
            // Heavy screen distortion
            ctx.globalAlpha = a * 0.5;
            ctx.fillStyle = '#0a0005'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Massive glitch scan lines
            ctx.globalAlpha = a * 0.7;
            for (let i = 0; i < 30; i++) {
                const ly = (Date.now() * 0.8 + i * 37) % canvas.height;
                const lh = 1 + Math.random() * 6;
                const shift = (Math.random() - 0.5) * 50 * a;
                ctx.fillStyle = ['rgba(255,0,85,0.4)', 'rgba(0,255,200,0.3)', 'rgba(255,255,255,0.2)'][Math.floor(Math.random() * 3)];
                ctx.fillRect(shift, ly, canvas.width, lh);
            }
            // Large corruption blocks
            ctx.globalAlpha = a * 0.35;
            for (let i = 0; i < 12; i++) {
                const bx = Math.random() * canvas.width;
                const by = Math.random() * canvas.height;
                ctx.fillStyle = ['#ff0055', '#00ffcc', '#ff0000', '#0000ff'][Math.floor(Math.random() * 4)];
                ctx.fillRect(bx, by, 40 + Math.random() * 120, 3 + Math.random() * 25);
            }
            // Corruption particles
            if (vfx.life % 2 === 0) { for (let i = 0; i < 8; i++) {
                particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
                    life: 6 + Math.random() * 8, maxLife: 14,
                    color: Math.random() > 0.5 ? '#ff0055' : '#00ffcc' });
            }}
        }

        // ── Crystal VFX ──
        if (vfx.type === 'prismBeam') {
            const prog = 1 - a; const reveal = Math.min(prog * 5, 1);
            const endX = vfx.x1 + (vfx.x2 - vfx.x1) * reveal;
            ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 40;
            // Rainbow beam — multiple colored layers
            const colors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#00e5ff', '#0044ff', '#8800ff'];
            for (let c = 0; c < colors.length; c++) {
                ctx.globalAlpha = a * 0.4; ctx.strokeStyle = colors[c]; ctx.lineWidth = (16 - c * 2) * a;
                ctx.beginPath(); ctx.moveTo(vfx.x1, vfx.y1 + (c - 3) * 3); ctx.lineTo(endX, vfx.y1 + (c - 3) * 3); ctx.stroke();
            }
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 * a; ctx.globalAlpha = a * 0.8;
            ctx.beginPath(); ctx.moveTo(vfx.x1, vfx.y1); ctx.lineTo(endX, vfx.y1); ctx.stroke();
            ctx.shadowBlur = 0;
        }
        if (vfx.type === 'diamondStorm' || vfx.type === 'screenCrystal') {
            const prog = 1 - a;
            ctx.globalAlpha = a * 0.3; ctx.fillStyle = '#001a22'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = a * 0.7;
            for (let i = 0; i < 15; i++) {
                const cx = (i * 127 + Date.now() * 0.06) % canvas.width;
                const cy = (i * 89 + Date.now() * 0.04) % (groundY * 0.9);
                const cr = 8 + Math.sin(i * 2.3) * 4;
                ctx.save(); ctx.translate(cx, cy); ctx.rotate(Date.now() * 0.005 + i);
                ctx.fillStyle = `hsl(${187 + i * 5}, 100%, ${60 + i * 2}%)`;
                ctx.beginPath(); ctx.moveTo(0, -cr); ctx.lineTo(cr * 0.6, 0); ctx.lineTo(0, cr); ctx.lineTo(-cr * 0.6, 0); ctx.closePath(); ctx.fill();
                ctx.restore();
            }
        }

        // ── Rubber Duck VFX ──
        if (vfx.type === 'squeakBlast') {
            const prog = 1 - a; const r = 40 + prog * 140;
            ctx.globalAlpha = a * 0.6; ctx.shadowColor = '#ffeb3b'; ctx.shadowBlur = 25;
            ctx.strokeStyle = '#ffeb3b'; ctx.lineWidth = 6 * a;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 * a;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r * 0.5, 0, Math.PI * 2); ctx.stroke();
            if (prog < 0.4) { ctx.globalAlpha = a; ctx.font = `bold ${30 + prog * 40}px sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffeb3b'; ctx.fillText('SQUEAK!', vfx.x, vfx.y - r * 0.3); }
            ctx.shadowBlur = 0;
        }
        if (vfx.type === 'duckArmy' || vfx.type === 'screenDucks') {
            const prog = 1 - a;
            ctx.globalAlpha = a * 0.2; ctx.fillStyle = '#332200'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = a * 0.8;
            for (let d = 0; d < 12; d++) {
                const dx = (d * 143 + Date.now() * 0.08) % (canvas.width + 80) - 40;
                const dy = groundY - 20 - Math.sin(Date.now() * 0.005 + d) * 15;
                ctx.save(); ctx.translate(dx, dy);
                ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ff8f00'; ctx.beginPath(); ctx.moveTo(10, -2); ctx.lineTo(18, 0); ctx.lineTo(10, 2); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-3, -4, 2, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
        }

        // ── Keyboard Warrior VFX ──
        if (vfx.type === 'capsLock') {
            const prog = 1 - a;
            ctx.globalAlpha = a * 0.8; ctx.font = `bold ${20 + prog * 30}px "Segoe UI",Arial,sans-serif`; ctx.textAlign = 'center';
            const words = ['NOOB!!!', 'GG EZ', 'L + RATIO', 'GET REKT', 'SKILL ISSUE', 'MAD?'];
            for (let i = 0; i < 4; i++) {
                const wx = vfx.x + (Math.random() - 0.5) * 150; const wy = vfx.y - prog * 80 - i * 25;
                ctx.fillStyle = `hsl(${i * 60}, 80%, 60%)`; ctx.fillText(words[(i + Math.floor(Date.now() * 0.002)) % words.length], wx, wy);
            }
        }
        if (vfx.type === 'blueScreen') {
            ctx.globalAlpha = a * 0.85; ctx.fillStyle = '#0078d7'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = 'bold 40px "Segoe UI",Consolas,monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
            ctx.fillText(':(', canvas.width / 2, canvas.height * 0.3);
            ctx.font = '18px "Segoe UI",sans-serif';
            ctx.fillText('Your opponent ran into a problem.', canvas.width / 2, canvas.height * 0.45);
            ctx.font = '14px "Segoe UI",sans-serif'; ctx.globalAlpha = a * 0.6;
            ctx.fillText('Error: SKILL_NOT_FOUND', canvas.width / 2, canvas.height * 0.55);
        }

        // ── Chef VFX ──
        if (vfx.type === 'kitchenNightmare') {
            const prog = 1 - a;
            ctx.globalAlpha = a * 0.3; ctx.fillStyle = '#1a0500'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = a * 0.8; ctx.font = `bold ${30 + prog * 20}px "Segoe UI",sans-serif`; ctx.textAlign = 'center';
            const shouts = ["IT'S RAW!", 'DONKEY!', 'IDIOT SANDWICH!', 'SHUT IT DOWN!', 'DISGUSTING!'];
            for (let i = 0; i < 3; i++) {
                const sx = canvas.width * 0.2 + i * canvas.width * 0.3; const sy = canvas.height * 0.3 + i * 40 + Math.sin(Date.now() * 0.008 + i) * 15;
                ctx.fillStyle = i % 2 === 0 ? '#ff5722' : '#fff'; ctx.fillText(shouts[(i + Math.floor(Date.now() * 0.001)) % shouts.length], sx, sy);
            }
        }

        // ── DJ VFX ──
        if (vfx.type === 'bassDrop') {
            const prog = 1 - a;
            ctx.shadowColor = '#e040fb'; ctx.shadowBlur = 30;
            for (let i = 0; i < 5; i++) {
                const r = prog * 200 + i * 30; ctx.globalAlpha = a * (0.5 - i * 0.08);
                ctx.strokeStyle = `hsl(${291 + i * 20}, 80%, 60%)`; ctx.lineWidth = (6 - i) * a;
                ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r, 0, Math.PI * 2); ctx.stroke();
            }
            if (prog < 0.3) { ctx.globalAlpha = a; ctx.font = `bold ${40 + prog * 60}px sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#e040fb'; ctx.fillText('DROP!', vfx.x, vfx.y - 60); }
            ctx.shadowBlur = 0;
        }
        if (vfx.type === 'dropTheBeat') {
            const prog = 1 - a;
            ctx.globalAlpha = a * 0.3; ctx.fillStyle = '#0a000f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Pulsing equalizer bars
            ctx.globalAlpha = a * 0.7;
            for (let i = 0; i < 20; i++) {
                const bx = (i / 20) * canvas.width; const bw = canvas.width / 20 - 4;
                const bh = (80 + Math.sin(Date.now() * 0.015 + i * 0.8) * 60) * a;
                ctx.fillStyle = `hsl(${291 + i * 8}, 80%, ${50 + Math.sin(Date.now() * 0.01 + i) * 20}%)`;
                ctx.fillRect(bx + 2, groundY - bh, bw, bh);
            }
        }

        // ── Pigeon VFX ──
        if (vfx.type === 'featherStorm') {
            const prog = 1 - a;
            ctx.globalAlpha = a * 0.7;
            for (let i = 0; i < 12; i++) {
                const fx = vfx.x + Math.sin(Date.now() * 0.005 + i * 2) * (40 + prog * 60);
                const fy = vfx.y - prog * 100 + i * 8 + Math.cos(Date.now() * 0.004 + i) * 15;
                ctx.save(); ctx.translate(fx, fy); ctx.rotate(Date.now() * 0.008 + i);
                ctx.fillStyle = i % 3 === 0 ? '#bbb' : i % 3 === 1 ? '#888' : '#ddd';
                ctx.beginPath(); ctx.ellipse(0, 0, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
        }
        if (vfx.type === 'flockAttack') {
            const prog = 1 - a;
            ctx.globalAlpha = a * 0.2; ctx.fillStyle = '#111'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = a * 0.7;
            for (let p = 0; p < 15; p++) {
                const px = (p * 97 + Date.now() * 0.12) % (canvas.width + 100) - 50;
                const py = 80 + p * 30 + Math.sin(Date.now() * 0.008 + p) * 20;
                ctx.save(); ctx.translate(px, py);
                ctx.fillStyle = '#888'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#666'; ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(12, 0); ctx.lineTo(6, 2); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-2, -2, 1.5, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#777'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(-3, -6); ctx.quadraticCurveTo(-12, -14 + Math.sin(Date.now() * 0.02 + p) * 4, -8, -4); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(3, -6); ctx.quadraticCurveTo(12, -14 + Math.sin(Date.now() * 0.02 + p + 1) * 4, 8, -4); ctx.stroke();
                ctx.restore();
            }
        }

        // ── Samurai VFX ──
        if (vfx.type === 'shishiSonson') {
            const prog = 1 - a; const reveal = Math.min(prog * 6, 1);
            // Ultra-fast horizontal slash line
            const sx = vfx.x1; const sy = vfx.y1;
            const ex = sx + (vfx.x2 - sx) * reveal; const ey = sy + (vfx.y2 - sy) * reveal;
            ctx.shadowColor = '#fff'; ctx.shadowBlur = 20;
            // Outer slash glow
            ctx.globalAlpha = a * 0.4; ctx.strokeStyle = '#c8d6e5'; ctx.lineWidth = 16 * a;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
            // Main slash
            ctx.globalAlpha = a * 0.8; ctx.strokeStyle = '#e8eef4'; ctx.lineWidth = 6 * a;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
            // White core
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * a;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
            // Slash spark at the tip
            if (reveal > 0.5) {
                ctx.globalAlpha = a * 0.7; ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(ex, ey, 6 * a, 0, Math.PI * 2); ctx.fill();
            }
            // Speed lines behind the slash
            ctx.globalAlpha = a * 0.3; ctx.strokeStyle = '#aab7c4'; ctx.lineWidth = 1;
            for (let i = 0; i < 5; i++) {
                const ly = sy + (Math.random() - 0.5) * 30;
                ctx.beginPath(); ctx.moveTo(sx - vfx.dir * 20, ly); ctx.lineTo(sx - vfx.dir * (40 + Math.random() * 40), ly); ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }
        if (vfx.type === 'ashura') {
            const prog = 1 - a;
            const scaleIn = Math.min(prog * 5, 1);
            // Darken screen
            ctx.globalAlpha = a * 0.4; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Three-headed demon silhouette behind the caster
            if (prog < 0.6) {
                ctx.globalAlpha = a * 0.5; ctx.shadowColor = '#c8d6e5'; ctx.shadowBlur = 30;
                // 6 arm silhouettes (3 on each side)
                ctx.strokeStyle = '#8899aa'; ctx.lineWidth = 4;
                for (let arm = 0; arm < 6; arm++) {
                    const angle = -Math.PI * 0.8 + (arm / 5) * Math.PI * 1.6;
                    const armLen = 60 + Math.sin(arm * 1.7) * 15;
                    ctx.beginPath(); ctx.moveTo(vfx.casterX, vfx.casterY - 50);
                    ctx.lineTo(vfx.casterX + Math.cos(angle) * armLen, vfx.casterY - 50 + Math.sin(angle) * armLen); ctx.stroke();
                    // Sword at end of each arm
                    const sx = vfx.casterX + Math.cos(angle) * armLen;
                    const sy = vfx.casterY - 50 + Math.sin(angle) * armLen;
                    ctx.strokeStyle = '#dde4ec'; ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(angle) * 35, sy + Math.sin(angle) * 35); ctx.stroke();
                }
                // 3 head silhouettes
                ctx.fillStyle = '#667788';
                for (let h = -1; h <= 1; h++) {
                    ctx.beginPath(); ctx.arc(vfx.casterX + h * 25, vfx.casterY - 90 - Math.abs(h) * 10, 14, 0, Math.PI * 2); ctx.fill();
                    // Glowing eyes
                    ctx.fillStyle = '#ff4444';
                    ctx.beginPath(); ctx.arc(vfx.casterX + h * 25 - 4, vfx.casterY - 92 - Math.abs(h) * 10, 2, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(vfx.casterX + h * 25 + 4, vfx.casterY - 92 - Math.abs(h) * 10, 2, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#667788';
                }
                ctx.shadowBlur = 0;
            }
            // MASSIVE crossing slashes across the screen
            ctx.shadowColor = '#fff'; ctx.shadowBlur = 15;
            const slashAngles = [-0.3, 0, 0.3, -0.6, 0.6, -Math.PI * 0.4, Math.PI * 0.4, -0.15, 0.15];
            for (let s = 0; s < 9; s++) {
                const slashReveal = Math.min((prog - s * 0.03) * 8, 1);
                if (slashReveal <= 0) continue;
                const sa = slashAngles[s];
                const len = canvas.width * 0.8 * slashReveal;
                ctx.globalAlpha = a * (0.6 - s * 0.04);
                ctx.strokeStyle = s < 3 ? '#fff' : '#c8d6e5'; ctx.lineWidth = (5 - s * 0.3) * a;
                ctx.beginPath();
                ctx.moveTo(vfx.x - Math.cos(sa) * len * 0.5, vfx.y - Math.sin(sa) * len * 0.5);
                ctx.lineTo(vfx.x + Math.cos(sa) * len * 0.5, vfx.y + Math.sin(sa) * len * 0.5);
                ctx.stroke();
            }
            // Slash particles
            if (vfx.life % 2 === 0) { for (let i = 0; i < 6; i++) {
                const pa = Math.random() * Math.PI * 2; const ps = 3 + Math.random() * 6;
                particles.push({ x: vfx.x + (Math.random() - 0.5) * 200, y: vfx.y + (Math.random() - 0.5) * 100,
                    vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps,
                    life: 8 + Math.random() * 8, maxLife: 16, color: '#c8d6e5' });
            }}
            ctx.shadowBlur = 0;
        }
        if (vfx.type === 'screenAshura') {
            const prog = 1 - a;
            ctx.globalAlpha = a * 0.5; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Many slashes crossing the screen
            ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
            for (let s = 0; s < 15; s++) {
                const sa = (s / 15) * Math.PI - Math.PI * 0.5;
                const reveal = Math.min((prog - s * 0.02) * 6, 1);
                if (reveal <= 0) continue;
                const cx = canvas.width / 2, cy = canvas.height * 0.4;
                const len = Math.max(canvas.width, canvas.height) * reveal;
                ctx.globalAlpha = a * 0.5;
                ctx.strokeStyle = s % 3 === 0 ? '#fff' : '#aab7c4'; ctx.lineWidth = (3 - (s % 3)) * a;
                ctx.beginPath();
                ctx.moveTo(cx - Math.cos(sa) * len * 0.5, cy - Math.sin(sa) * len * 0.5);
                ctx.lineTo(cx + Math.cos(sa) * len * 0.5, cy + Math.sin(sa) * len * 0.5);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }

        // ── Face VFX ──
        if (vfx.type === 'grinBeam') {
            const prog = 1 - a; const reveal = Math.min(prog * 4, 1);
            const faceR = 40;
            ctx.globalAlpha = a * 0.9; ctx.shadowColor = '#ffaa88'; ctx.shadowBlur = 25;
            // Actual face photo at origin
            if (faceImgLoaded) {
                ctx.save(); ctx.beginPath(); ctx.arc(vfx.x1, vfx.y1, faceR, 0, Math.PI * 2); ctx.clip();
                ctx.drawImage(faceImg, vfx.x1 - faceR, vfx.y1 - faceR, faceR * 2, faceR * 2);
                ctx.restore();
            }
            // BEAM from the face
            ctx.globalAlpha = a * 0.5;
            const beamEndX = vfx.x1 + vfx.dir * canvas.width * reveal;
            const beamY = vfx.y1 + 10;
            ctx.strokeStyle = '#ffcc66'; ctx.lineWidth = 30 * a; ctx.shadowColor = '#ffaa88'; ctx.shadowBlur = 30;
            ctx.beginPath(); ctx.moveTo(vfx.x1, beamY); ctx.lineTo(beamEndX, beamY); ctx.stroke();
            ctx.strokeStyle = '#ffddaa'; ctx.lineWidth = 16 * a;
            ctx.beginPath(); ctx.moveTo(vfx.x1, beamY); ctx.lineTo(beamEndX, beamY); ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 6 * a;
            ctx.beginPath(); ctx.moveTo(vfx.x1, beamY); ctx.lineTo(beamEndX, beamY); ctx.stroke();
            ctx.shadowBlur = 0;
        }
        if (vfx.type === 'theFace') {
            const prog = 1 - a;
            const scaleIn = Math.min(prog * 4, 1);
            const faceR = scaleIn * 200;
            const fx = canvas.width / 2, fy = vfx.y;
            // Darken background
            ctx.globalAlpha = a * 0.5; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // THE MASSIVE ACTUAL FACE PHOTO
            if (faceImgLoaded && faceR > 10) {
                ctx.globalAlpha = a * 0.95; ctx.shadowColor = '#ffaa88'; ctx.shadowBlur = 60;
                ctx.save();
                ctx.beginPath(); ctx.arc(fx, fy, faceR, 0, Math.PI * 2); ctx.clip();
                ctx.drawImage(faceImg, fx - faceR, fy - faceR, faceR * 2, faceR * 2);
                ctx.restore();
                // Glowing border
                ctx.strokeStyle = '#ffaa88'; ctx.lineWidth = 5 * a;
                ctx.beginPath(); ctx.arc(fx, fy, faceR, 0, Math.PI * 2); ctx.stroke();
            }
            // Impact shockwave
            if (prog > 0.3 && prog < 0.7) {
                const shockR = (prog - 0.3) / 0.4 * 350;
                ctx.globalAlpha = a * 0.4; ctx.strokeStyle = '#ffaa88'; ctx.lineWidth = 8;
                ctx.beginPath(); ctx.arc(fx, fy, shockR, 0, Math.PI * 2); ctx.stroke();
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(fx, fy, shockR * 0.7, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }
        if (vfx.type === 'screenViral') {
            const prog = 1 - a;
            // Multiple ACTUAL FACE PHOTOS floating across screen
            ctx.globalAlpha = a * 0.15; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            if (faceImgLoaded) {
                for (let i = 0; i < 10; i++) {
                    const fx = (i * 163 + Date.now() * 0.04) % canvas.width;
                    const fy = (i * 97 + Date.now() * 0.03) % canvas.height;
                    const fr = 22 + Math.sin(i * 2.3) * 10;
                    ctx.globalAlpha = a * 0.5;
                    ctx.save(); ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2); ctx.clip();
                    ctx.drawImage(faceImg, fx - fr, fy - fr, fr * 2, fr * 2);
                    ctx.restore();
                }
            }
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

        // ── Frost Nova (Ice) ──
        if (vfx.type === 'frostNova') {
            const prog = 1 - a;
            const r = 30 + prog * 200;
            ctx.shadowColor = '#88cfff'; ctx.shadowBlur = 35;
            // Expanding icy ring
            ctx.globalAlpha = a * 0.7;
            ctx.strokeStyle = '#88cfff'; ctx.lineWidth = 8 * a;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#aed6f1'; ctx.lineWidth = 4 * a;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r * 0.65, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * a;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r * 0.3, 0, Math.PI * 2); ctx.stroke();
            // Frost shards radiating outward
            ctx.globalAlpha = a * 0.8;
            for (let i = 0; i < 16; i++) {
                const sa = (i / 16) * Math.PI * 2 + prog * 0.5;
                const shardLen = r * 0.25;
                const sx = vfx.x + Math.cos(sa) * r * 0.85;
                const sy = vfx.y + Math.sin(sa) * r * 0.85;
                ctx.strokeStyle = i % 2 === 0 ? '#fff' : '#88cfff'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(sx, sy);
                ctx.lineTo(sx + Math.cos(sa) * shardLen, sy + Math.sin(sa) * shardLen); ctx.stroke();
            }
            // Center frost flash
            if (prog < 0.3) {
                ctx.globalAlpha = (0.3 - prog) / 0.3 * 0.6;
                const fg = ctx.createRadialGradient(vfx.x, vfx.y, 0, vfx.x, vfx.y, 80);
                fg.addColorStop(0, '#fff'); fg.addColorStop(0.4, '#aed6f1'); fg.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(vfx.x, vfx.y, 80, 0, Math.PI * 2); ctx.fill();
            }
            // Ice particles
            if (vfx.life % 2 === 0) { for (let i = 0; i < 4; i++) {
                const pa = Math.random() * Math.PI * 2; const ps = 3 + Math.random() * 5;
                particles.push({ x: vfx.x + Math.cos(pa) * r * 0.5, y: vfx.y + Math.sin(pa) * r * 0.5,
                    vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps,
                    life: 8 + Math.random() * 8, maxLife: 16, color: '#aed6f1' });
            }} ctx.shadowBlur = 0;
        }

        // ── Gravity Well ──
        if (vfx.type === 'gravityWell') {
            const prog = 1 - a;
            const r = vfx.radius || 120;
            ctx.shadowColor = '#9b59b6'; ctx.shadowBlur = 30;
            // Dark vortex center
            ctx.globalAlpha = a * 0.85;
            const vg = ctx.createRadialGradient(vfx.x, vfx.y, 0, vfx.x, vfx.y, r * 0.5);
            vg.addColorStop(0, '#000'); vg.addColorStop(0.4, '#1a0030'); vg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = vg; ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r * 0.5, 0, Math.PI * 2); ctx.fill();
            // Concentric rings being pulled inward
            for (let i = 0; i < 5; i++) {
                const ringR = r * (1 - i * 0.15) * (1 - prog * 0.3);
                ctx.globalAlpha = a * (0.6 - i * 0.1);
                ctx.strokeStyle = `hsl(${280 + i * 8}, 70%, ${35 + i * 8}%)`; ctx.lineWidth = (4 - i * 0.5) * a;
                ctx.beginPath(); ctx.arc(vfx.x, vfx.y, ringR, 0, Math.PI * 2); ctx.stroke();
            }
            // Swirling spiral lines being sucked in
            ctx.strokeStyle = '#8e44ad'; ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                const sa = (i / 8) * Math.PI * 2 + Date.now() * 0.01;
                ctx.globalAlpha = a * 0.5;
                ctx.beginPath();
                ctx.moveTo(vfx.x + Math.cos(sa) * r * 1.2, vfx.y + Math.sin(sa) * r * 1.2);
                ctx.quadraticCurveTo(vfx.x + Math.cos(sa + 0.8) * r * 0.5, vfx.y + Math.sin(sa + 0.8) * r * 0.5, vfx.x, vfx.y);
                ctx.stroke();
            }
            // Particles spiraling inward
            if (vfx.life % 2 === 0) { for (let i = 0; i < 3; i++) {
                const pa = Math.random() * Math.PI * 2;
                particles.push({ x: vfx.x + Math.cos(pa) * r, y: vfx.y + Math.sin(pa) * r,
                    vx: -Math.cos(pa) * 4, vy: -Math.sin(pa) * 4,
                    life: 8 + Math.random() * 6, maxLife: 14, color: '#9b59b6' });
            }} ctx.shadowBlur = 0;
        }

        // ── Time Stop VFX ──
        if (vfx.type === 'timeStopVfx') {
            const prog = 1 - a;
            // Golden/sepia screen overlay
            ctx.globalAlpha = a * 0.45;
            ctx.fillStyle = '#3a2a00'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = a * 0.15;
            ctx.fillStyle = '#f0e68c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Clock faces
            ctx.globalAlpha = a * 0.7;
            for (let i = 0; i < 5; i++) {
                const cx = canvas.width * (0.15 + i * 0.18);
                const cy = canvas.height * (0.25 + Math.sin(i * 2.1) * 0.15);
                const cr = 25 + i * 5;
                ctx.strokeStyle = '#daa520'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.stroke();
                // Clock ticks
                for (let t = 0; t < 12; t++) {
                    const ta = (t / 12) * Math.PI * 2 - Math.PI / 2;
                    ctx.beginPath();
                    ctx.moveTo(cx + Math.cos(ta) * cr * 0.85, cy + Math.sin(ta) * cr * 0.85);
                    ctx.lineTo(cx + Math.cos(ta) * cr * 0.95, cy + Math.sin(ta) * cr * 0.95);
                    ctx.stroke();
                }
                // Spinning clock hands (frozen at different angles)
                const handA = Date.now() * 0.001 + i * 1.3;
                ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(handA) * cr * 0.6, cy + Math.sin(handA) * cr * 0.6); ctx.stroke();
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(handA * 3) * cr * 0.75, cy + Math.sin(handA * 3) * cr * 0.75); ctx.stroke();
                // Center dot
                ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
            }
        }

        // ── Slow Zone VFX ──
        if (vfx.type === 'slowZoneVfx') {
            const prog = 1 - a;
            const r = 60 + prog * 100;
            ctx.shadowColor = '#daa520'; ctx.shadowBlur = 20;
            // Distortion ring
            ctx.globalAlpha = a * 0.6;
            ctx.strokeStyle = '#f0e68c'; ctx.lineWidth = 6 * a;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#daa520'; ctx.lineWidth = 3 * a;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r * 0.7, 0, Math.PI * 2); ctx.stroke();
            // Clock-like ticks around the ring
            ctx.globalAlpha = a * 0.8;
            ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
            for (let t = 0; t < 12; t++) {
                const ta = (t / 12) * Math.PI * 2 + Date.now() * 0.002;
                ctx.beginPath();
                ctx.moveTo(vfx.x + Math.cos(ta) * r * 0.88, vfx.y + Math.sin(ta) * r * 0.88);
                ctx.lineTo(vfx.x + Math.cos(ta) * r, vfx.y + Math.sin(ta) * r);
                ctx.stroke();
            }
            // Inner golden glow
            if (prog < 0.4) {
                ctx.globalAlpha = (0.4 - prog) / 0.4 * 0.3;
                const fg = ctx.createRadialGradient(vfx.x, vfx.y, 0, vfx.x, vfx.y, r * 0.6);
                fg.addColorStop(0, '#ffd700'); fg.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r * 0.6, 0, Math.PI * 2); ctx.fill();
            }
            ctx.shadowBlur = 0;
        }

        // ── Bat Swarm VFX (Vampire) ──
        if (vfx.type === 'batSwarmVfx') {
            const prog = 1 - a;
            ctx.globalAlpha = a * 0.8;
            for (let i = 0; i < 10; i++) {
                const ba = Date.now() * 0.008 + i * 0.63;
                const orbR = 30 + i * 8 + Math.sin(Date.now() * 0.005 + i) * 15;
                const bx = vfx.x + Math.cos(ba) * orbR;
                const by = vfx.y + Math.sin(ba * 0.7) * orbR * 0.6;
                const sz = 6 + Math.sin(i * 1.5) * 2;
                ctx.save(); ctx.translate(bx, by);
                // Bat shape: M-like wings + body
                ctx.fillStyle = i % 3 === 0 ? '#2c0000' : '#1a0000';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(-sz * 1.5, -sz * 1.2, -sz * 2.5, -sz * 0.3);
                ctx.quadraticCurveTo(-sz * 1.5, sz * 0.2, -sz * 0.8, -sz * 0.2);
                ctx.quadraticCurveTo(-sz * 0.3, sz * 0.4, 0, sz * 0.3);
                ctx.quadraticCurveTo(sz * 0.3, sz * 0.4, sz * 0.8, -sz * 0.2);
                ctx.quadraticCurveTo(sz * 1.5, sz * 0.2, sz * 2.5, -sz * 0.3);
                ctx.quadraticCurveTo(sz * 1.5, -sz * 1.2, 0, 0);
                ctx.fill();
                // Red eyes
                ctx.fillStyle = '#ff0000';
                ctx.beginPath(); ctx.arc(-sz * 0.2, -sz * 0.1, 1.2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(sz * 0.2, -sz * 0.1, 1.2, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
        }

        // ── Life Drain VFX (Vampire) ──
        if (vfx.type === 'lifeDrainVfx') {
            const prog = 1 - a;
            ctx.shadowColor = '#8b0000'; ctx.shadowBlur = 15;
            ctx.globalAlpha = a * 0.7;
            // Red energy particles flowing from opponent to caster
            const dx = vfx.x1 - vfx.x2; const dy = vfx.y1 - vfx.y2;
            for (let i = 0; i < 12; i++) {
                const t = (i / 12 + Date.now() * 0.002) % 1;
                const px = vfx.x2 + dx * t + Math.sin(t * Math.PI * 4 + i) * 15;
                const py = vfx.y2 + dy * t + Math.cos(t * Math.PI * 4 + i) * 15;
                const pr = 3 + Math.sin(t * Math.PI) * 3;
                ctx.fillStyle = i % 2 === 0 ? '#8b0000' : '#dc143c';
                ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
            }
            // Connecting beam
            ctx.globalAlpha = a * 0.3;
            ctx.strokeStyle = '#8b0000'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(vfx.x2, vfx.y2); ctx.lineTo(vfx.x1, vfx.y1); ctx.stroke();
            // Spawn drifting red particles along path
            if (vfx.life % 3 === 0) {
                const rt = Math.random();
                particles.push({ x: vfx.x2 + dx * rt, y: vfx.y2 + dy * rt,
                    vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2,
                    life: 8 + Math.random() * 6, maxLife: 14, color: '#dc143c' });
            }
            ctx.shadowBlur = 0;
        }

        // ── Blood Moon VFX (Vampire) ──
        if (vfx.type === 'bloodMoonVfx') {
            const prog = 1 - a;
            // Dark red overlay
            ctx.globalAlpha = a * 0.4;
            ctx.fillStyle = '#1a0000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Large blood moon at top
            const moonX = canvas.width / 2; const moonY = canvas.height * 0.2; const moonR = 70;
            ctx.globalAlpha = a * 0.9;
            ctx.shadowColor = '#8b0000'; ctx.shadowBlur = 60;
            ctx.fillStyle = '#8b0000'; ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2); ctx.fill();
            // Darker inner shadow
            ctx.fillStyle = '#5a0000'; ctx.beginPath(); ctx.arc(moonX + 10, moonY - 5, moonR * 0.7, 0, Math.PI * 2); ctx.fill();
            // Crimson corona
            ctx.strokeStyle = '#dc143c'; ctx.lineWidth = 3; ctx.globalAlpha = a * 0.6;
            ctx.beginPath(); ctx.arc(moonX, moonY, moonR + 8, 0, Math.PI * 2); ctx.stroke();
            // Blood rays
            for (let i = 0; i < 10; i++) {
                const ra = (i / 10) * Math.PI * 2 + Date.now() * 0.001;
                const rayLen = 20 + Math.sin(Date.now() * 0.005 + i * 2) * 10;
                ctx.strokeStyle = '#8b0000'; ctx.lineWidth = 2; ctx.globalAlpha = a * 0.4;
                ctx.beginPath(); ctx.moveTo(moonX + Math.cos(ra) * (moonR + 10), moonY + Math.sin(ra) * (moonR + 10));
                ctx.lineTo(moonX + Math.cos(ra) * (moonR + 10 + rayLen), moonY + Math.sin(ra) * (moonR + 10 + rayLen)); ctx.stroke();
            }
            // Dripping blood particles
            if (vfx.life % 3 === 0) {
                particles.push({ x: moonX + (Math.random() - 0.5) * moonR, y: moonY + moonR,
                    vx: (Math.random() - 0.5) * 2, vy: 3 + Math.random() * 4,
                    life: 15 + Math.random() * 10, maxLife: 25, color: '#8b0000' });
            }
            ctx.shadowBlur = 0;
        }

        // ── Dragon Roar VFX ──
        if (vfx.type === 'dragonRoarVfx') {
            const prog = 1 - a;
            ctx.shadowColor = '#ff4500'; ctx.shadowBlur = 40;
            // Multiple expanding shockwave rings
            for (let i = 0; i < 4; i++) {
                const delay = i * 0.08;
                const ringProg = Math.max(0, prog - delay);
                if (ringProg <= 0) continue;
                const r = ringProg * 280;
                ctx.globalAlpha = a * (0.7 - i * 0.15);
                ctx.strokeStyle = i === 0 ? '#ff4500' : i === 1 ? '#ff6600' : '#ff8c00'; ctx.lineWidth = (8 - i * 1.5) * a;
                ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r, 0, Math.PI * 2); ctx.stroke();
            }
            // Fiery center glow
            if (prog < 0.3) {
                ctx.globalAlpha = (0.3 - prog) / 0.3 * 0.7;
                const fg = ctx.createRadialGradient(vfx.x, vfx.y, 0, vfx.x, vfx.y, 100);
                fg.addColorStop(0, '#fff'); fg.addColorStop(0.3, '#ff4500'); fg.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(vfx.x, vfx.y, 100, 0, Math.PI * 2); ctx.fill();
            }
            // Fire particles from roar
            if (vfx.life % 2 === 0) { for (let i = 0; i < 5; i++) {
                const pa = Math.random() * Math.PI * 2; const ps = 4 + Math.random() * 7;
                particles.push({ x: vfx.x, y: vfx.y, vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps,
                    life: 10 + Math.random() * 10, maxLife: 20,
                    color: `hsl(${15 + Math.random() * 20}, 100%, ${50 + Math.random() * 30}%)` });
            }} ctx.shadowBlur = 0;
        }

        // ── Tail Sweep VFX (Dragon) ──
        if (vfx.type === 'tailSweepVfx') {
            const prog = 1 - a;
            const reveal = Math.min(prog * 5, 1);
            ctx.shadowColor = '#ff4500'; ctx.shadowBlur = 25;
            // Wide arc slash along ground
            const sweepAngle = reveal * Math.PI * 0.8;
            const startAngle = Math.PI - sweepAngle / 2;
            const arcR = 120;
            // Outer glow arc
            ctx.globalAlpha = a * 0.5;
            ctx.strokeStyle = '#ff4500'; ctx.lineWidth = 18 * a;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, arcR, startAngle, startAngle + sweepAngle); ctx.stroke();
            // Main arc
            ctx.globalAlpha = a * 0.8;
            ctx.strokeStyle = '#ff6600'; ctx.lineWidth = 8 * a;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, arcR, startAngle, startAngle + sweepAngle); ctx.stroke();
            // White core
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 * a;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, arcR, startAngle, startAngle + sweepAngle); ctx.stroke();
            // Ground dust at sweep
            if (vfx.life % 2 === 0) { for (let i = 0; i < 3; i++) {
                particles.push({ x: vfx.x + (Math.random() - 0.5) * 200, y: vfx.y,
                    vx: (Math.random() - 0.5) * 6, vy: -2 - Math.random() * 4,
                    life: 8 + Math.random() * 6, maxLife: 14,
                    color: `hsl(${20 + Math.random() * 15}, 80%, ${40 + Math.random() * 30}%)` });
            }} ctx.shadowBlur = 0;
        }

        // ── Skeleton Rise VFX (Necro) ──
        if (vfx.type === 'skeletonRiseVfx') {
            const prog = 1 - a;
            const riseH = Math.min(prog * 4, 1) * 60;
            ctx.shadowColor = '#556b2f'; ctx.shadowBlur = 20;
            ctx.globalAlpha = a * 0.8;
            // Green glow from ground
            const gg = ctx.createRadialGradient(vfx.x, vfx.y, 0, vfx.x, vfx.y, 80);
            gg.addColorStop(0, 'rgba(85,107,47,0.5)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(vfx.x, vfx.y, 80, 0, Math.PI * 2); ctx.fill();
            // Multiple skeletal hands reaching up
            for (let h = 0; h < 4; h++) {
                const hx = vfx.x + (h - 1.5) * 35;
                const hy = vfx.y;
                ctx.strokeStyle = '#d2b48c'; ctx.lineWidth = 3;
                // Forearm
                ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, hy - riseH); ctx.stroke();
                // Palm
                ctx.beginPath(); ctx.moveTo(hx - 6, hy - riseH); ctx.lineTo(hx + 6, hy - riseH); ctx.stroke();
                // Fingers (5 bony fingers)
                for (let f = 0; f < 5; f++) {
                    const fx = hx - 6 + f * 3;
                    const fLen = 8 + Math.sin(f * 1.2 + vfx.life * 0.1) * 3;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.moveTo(fx, hy - riseH);
                    ctx.lineTo(fx + (f - 2) * 1.5, hy - riseH - fLen); ctx.stroke();
                }
            }
            // Green wisps
            if (vfx.life % 3 === 0) {
                particles.push({ x: vfx.x + (Math.random() - 0.5) * 100, y: vfx.y,
                    vx: (Math.random() - 0.5) * 2, vy: -2 - Math.random() * 3,
                    life: 10 + Math.random() * 8, maxLife: 18, color: '#556b2f' });
            }
            ctx.shadowBlur = 0;
        }

        // ── Soul Drain VFX (Necro) ──
        if (vfx.type === 'soulDrainVfx') {
            const prog = 1 - a;
            ctx.shadowColor = '#556b2f'; ctx.shadowBlur = 15;
            ctx.globalAlpha = a * 0.7;
            // Ghostly green wisps flowing from opponent to caster
            const dx = vfx.x1 - vfx.x2; const dy = vfx.y1 - vfx.y2;
            for (let i = 0; i < 10; i++) {
                const t = (i / 10 + Date.now() * 0.002) % 1;
                const px = vfx.x2 + dx * t + Math.sin(t * Math.PI * 3 + i) * 20;
                const py = vfx.y2 + dy * t + Math.cos(t * Math.PI * 3 + i) * 20;
                const pr = 4 + Math.sin(t * Math.PI) * 4;
                // Ghostly wisp shape
                ctx.fillStyle = i % 3 === 0 ? '#7cfc00' : i % 3 === 1 ? '#556b2f' : '#9acd32';
                ctx.globalAlpha = a * (0.4 + Math.sin(t * Math.PI) * 0.3);
                ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
                // Wisp tail
                ctx.strokeStyle = '#556b2f'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(px, py);
                ctx.quadraticCurveTo(px - dx * 0.05, py - dy * 0.05 + 8, px - dx * 0.08, py - dy * 0.08); ctx.stroke();
            }
            // Connecting spectral line
            ctx.globalAlpha = a * 0.2;
            ctx.strokeStyle = '#7cfc00'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(vfx.x2, vfx.y2); ctx.lineTo(vfx.x1, vfx.y1); ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // ── Cheese Stretch VFX (Pizza) ──
        if (vfx.type === 'cheeseStretchVfx') {
            const prog = 1 - a;
            ctx.globalAlpha = a * 0.8;
            ctx.shadowColor = '#ff8c00'; ctx.shadowBlur = 10;
            // Stretchy cheese lines between two points
            for (let i = 0; i < 6; i++) {
                const wobble = Math.sin(Date.now() * 0.008 + i * 1.3) * (20 + i * 5);
                const sag = 30 + i * 8;
                ctx.strokeStyle = i % 2 === 0 ? '#ffa500' : '#ffcc00'; ctx.lineWidth = (4 - i * 0.4) * a;
                ctx.beginPath();
                ctx.moveTo(vfx.x1, vfx.y1 + (i - 2.5) * 8);
                const cpx = (vfx.x1 + vfx.x2) / 2 + wobble;
                const cpy = (vfx.y1 + vfx.y2) / 2 + sag;
                ctx.quadraticCurveTo(cpx, cpy, vfx.x2, vfx.y2 + (i - 2.5) * 8);
                ctx.stroke();
            }
            // Dripping cheese blobs
            if (vfx.life % 3 === 0) {
                const t = Math.random();
                const mx = vfx.x1 + (vfx.x2 - vfx.x1) * t;
                const my = (vfx.y1 + vfx.y2) / 2 + 20;
                particles.push({ x: mx, y: my, vx: (Math.random() - 0.5) * 1, vy: 2 + Math.random() * 3,
                    life: 8 + Math.random() * 6, maxLife: 14, color: '#ffa500' });
            }
            ctx.shadowBlur = 0;
        }

        // ── Cat Army VFX ──
        if (vfx.type === 'catArmyVfx') {
            const prog = 1 - a;
            ctx.globalAlpha = a * 0.15; ctx.fillStyle = '#1a001a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = a * 0.8;
            for (let c = 0; c < 12; c++) {
                const cx = (c * 113 + Date.now() * 0.1) % (canvas.width + 100) - 50;
                const cy = groundY - 15 - Math.abs(Math.sin(Date.now() * 0.006 + c)) * 20;
                const sz = 8 + (c % 3) * 4;
                ctx.save(); ctx.translate(cx, cy);
                // Body
                ctx.fillStyle = ['#333', '#666', '#ff8c00', '#888', '#222'][c % 5];
                ctx.beginPath(); ctx.ellipse(0, 0, sz * 1.2, sz * 0.7, 0, 0, Math.PI * 2); ctx.fill();
                // Head
                ctx.beginPath(); ctx.arc(sz * 0.9, -sz * 0.3, sz * 0.55, 0, Math.PI * 2); ctx.fill();
                // Ears (triangles)
                ctx.beginPath(); ctx.moveTo(sz * 0.55, -sz * 0.7); ctx.lineTo(sz * 0.75, -sz * 1.2); ctx.lineTo(sz * 0.95, -sz * 0.7); ctx.fill();
                ctx.beginPath(); ctx.moveTo(sz * 0.85, -sz * 0.7); ctx.lineTo(sz * 1.05, -sz * 1.2); ctx.lineTo(sz * 1.25, -sz * 0.7); ctx.fill();
                // Eyes
                ctx.fillStyle = '#0f0'; ctx.beginPath(); ctx.arc(sz * 0.78, -sz * 0.4, 1.5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(sz * 1.02, -sz * 0.4, 1.5, 0, Math.PI * 2); ctx.fill();
                // Tail
                ctx.strokeStyle = ctx.fillStyle = ['#333', '#666', '#ff8c00', '#888', '#222'][c % 5];
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(-sz * 1.1, 0);
                ctx.quadraticCurveTo(-sz * 1.6, -sz * 0.8, -sz * 1.3, -sz * 1.1); ctx.stroke();
                ctx.restore();
            }
        }

        // ── Potassium Blast VFX (Banana) ──
        if (vfx.type === 'potassiumBlast') {
            const prog = 1 - a;
            const r = 40 + prog * 200;
            ctx.shadowColor = '#ffe135'; ctx.shadowBlur = 35;
            // Yellow explosion ring
            ctx.globalAlpha = a * 0.7;
            ctx.strokeStyle = '#ffe135'; ctx.lineWidth = 8 * a;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 4 * a;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r * 0.6, 0, Math.PI * 2); ctx.stroke();
            // Banana-shaped fragments flying outward
            ctx.globalAlpha = a * 0.8;
            for (let i = 0; i < 8; i++) {
                const ba = (i / 8) * Math.PI * 2 + prog * 1.5;
                const bDist = r * 0.5 + prog * 40;
                const bx = vfx.x + Math.cos(ba) * bDist;
                const by = vfx.y + Math.sin(ba) * bDist;
                ctx.save(); ctx.translate(bx, by); ctx.rotate(ba + prog * 3);
                // Banana shape: curved arc
                ctx.strokeStyle = '#ffe135'; ctx.lineWidth = 4; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.arc(0, 0, 10, 0.3, Math.PI - 0.3); ctx.stroke();
                ctx.restore();
            }
            // Center flash
            if (prog < 0.25) {
                ctx.globalAlpha = (0.25 - prog) / 0.25 * 0.7;
                const fg = ctx.createRadialGradient(vfx.x, vfx.y, 0, vfx.x, vfx.y, 80);
                fg.addColorStop(0, '#fff'); fg.addColorStop(0.3, '#ffe135'); fg.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(vfx.x, vfx.y, 80, 0, Math.PI * 2); ctx.fill();
            }
            // Yellow/green particles
            if (vfx.life % 2 === 0) { for (let i = 0; i < 4; i++) {
                const pa = Math.random() * Math.PI * 2; const ps = 4 + Math.random() * 6;
                particles.push({ x: vfx.x, y: vfx.y, vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps,
                    life: 8 + Math.random() * 8, maxLife: 16,
                    color: Math.random() > 0.5 ? '#ffe135' : '#7fff00' });
            }} ctx.shadowBlur = 0;
        }

        // ── Chancla VFX (Grandma) ──
        if (vfx.type === 'chanclaVfx') {
            const prog = 1 - a;
            const slamProg = Math.min(prog * 4, 1);
            // Giant slipper descending from above
            const slipperY = vfx.y - 200 * (1 - slamProg);
            const slipperX = vfx.x;
            const rotation = prog * Math.PI * 4; // spinning
            ctx.save();
            ctx.translate(slipperX, slipperY);
            ctx.rotate(slamProg < 1 ? rotation : 0);
            ctx.globalAlpha = a * 0.9;
            ctx.shadowColor = '#deb887'; ctx.shadowBlur = 20;
            // Slipper body (rectangle with rounded end)
            ctx.fillStyle = '#8b4513';
            ctx.beginPath();
            ctx.moveTo(-15, -30); ctx.lineTo(15, -30);
            ctx.lineTo(18, 25); ctx.quadraticCurveTo(0, 35, -18, 25);
            ctx.closePath(); ctx.fill();
            // Strap
            ctx.strokeStyle = '#deb887'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(-12, -10); ctx.quadraticCurveTo(0, -20, 12, -10); ctx.stroke();
            // Sole line
            ctx.strokeStyle = '#5a2d0c'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-15, 20); ctx.lineTo(15, 20); ctx.stroke();
            ctx.restore();
            // Impact ring when slammed
            if (slamProg >= 0.9) {
                const impactR = (prog - 0.225) * 400;
                if (impactR > 0) {
                    ctx.globalAlpha = a * 0.6;
                    ctx.strokeStyle = '#deb887'; ctx.lineWidth = 6 * a;
                    ctx.beginPath(); ctx.arc(vfx.x, vfx.y, impactR, 0, Math.PI * 2); ctx.stroke();
                }
                // Impact lines
                ctx.strokeStyle = '#8b4513'; ctx.lineWidth = 3;
                for (let i = 0; i < 8; i++) {
                    const la = (i / 8) * Math.PI * 2;
                    const ll = 20 + prog * 40;
                    ctx.beginPath(); ctx.moveTo(vfx.x + Math.cos(la) * 15, vfx.y + Math.sin(la) * 15);
                    ctx.lineTo(vfx.x + Math.cos(la) * ll, vfx.y + Math.sin(la) * ll); ctx.stroke();
                }
            }
            ctx.shadowBlur = 0;
        }

        // ── Paint Explosion VFX (Painter) ──
        if (vfx.type === 'paintExplosion') {
            const prog = 1 - a;
            ctx.globalAlpha = a * 0.25; ctx.fillStyle = '#111'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Random colored paint blobs splattering
            ctx.globalAlpha = a * 0.7;
            if (!vfx.blobs) {
                vfx.blobs = [];
                for (let i = 0; i < 25; i++) {
                    vfx.blobs.push({
                        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
                        r: 15 + Math.random() * 50,
                        color: `hsl(${Math.random() * 360}, 80%, 55%)`,
                        delay: Math.random() * 0.5
                    });
                }
            }
            for (const blob of vfx.blobs) {
                if (prog < blob.delay) continue;
                const blobProg = Math.min((prog - blob.delay) / 0.3, 1);
                const br = blob.r * blobProg;
                ctx.fillStyle = blob.color;
                ctx.beginPath(); ctx.arc(blob.x, blob.y, br, 0, Math.PI * 2); ctx.fill();
                // Splatter drips
                ctx.fillStyle = blob.color;
                for (let d = 0; d < 3; d++) {
                    const da = Math.random() * Math.PI * 2;
                    ctx.beginPath(); ctx.arc(blob.x + Math.cos(da) * br * 1.2, blob.y + Math.sin(da) * br * 1.2, br * 0.2, 0, Math.PI * 2); ctx.fill();
                }
            }
        }

        // ── Paint Stroke VFX (Painter) ──
        if (vfx.type === 'paintStrokeVfx') {
            const prog = 1 - a;
            const reveal = Math.min(prog * 5, 1);
            ctx.shadowBlur = 15;
            // Rainbow-colored slash segments
            const colors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#00aaff', '#0044ff', '#8800ff', '#ff00ff'];
            const dx = vfx.x2 - vfx.x1; const dy = vfx.y2 - vfx.y1;
            for (let i = 0; i < colors.length; i++) {
                const t0 = i / colors.length; const t1 = (i + 1) / colors.length;
                if (t0 > reveal) break;
                const tEnd = Math.min(t1, reveal);
                ctx.globalAlpha = a * 0.8;
                ctx.strokeStyle = colors[i]; ctx.lineWidth = (12 - i * 0.5) * a;
                ctx.shadowColor = colors[i];
                ctx.beginPath();
                ctx.moveTo(vfx.x1 + dx * t0, vfx.y1 + dy * t0 + Math.sin(t0 * Math.PI * 3) * 10);
                ctx.lineTo(vfx.x1 + dx * tEnd, vfx.y1 + dy * tEnd + Math.sin(tEnd * Math.PI * 3) * 10);
                ctx.stroke();
            }
            // Paint splatter particles
            if (vfx.life % 2 === 0) {
                const t = Math.random() * reveal;
                const px = vfx.x1 + dx * t; const py = vfx.y1 + dy * t;
                particles.push({ x: px, y: py, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
                    life: 8 + Math.random() * 6, maxLife: 14,
                    color: colors[Math.floor(Math.random() * colors.length)] });
            }
            ctx.shadowBlur = 0;
        }

        // ── Bee Swarm VFX ──
        if (vfx.type === 'beeSwarmVfx') {
            const prog = 1 - a;
            ctx.globalAlpha = a * 0.8;
            for (let b = 0; b < 14; b++) {
                // Erratic buzzing movement
                const ba = Date.now() * 0.012 + b * 0.45;
                const orbR = 25 + b * 6 + Math.sin(Date.now() * 0.008 + b * 2.3) * 15;
                const bx = vfx.x + Math.cos(ba) * orbR + Math.sin(Date.now() * 0.015 + b) * 10;
                const by = vfx.y + Math.sin(ba * 1.3) * orbR * 0.5 + Math.cos(Date.now() * 0.012 + b) * 8;
                const sz = 4 + (b % 3);
                ctx.save(); ctx.translate(bx, by);
                // Bee body (yellow/black stripes)
                ctx.fillStyle = '#ffc107';
                ctx.beginPath(); ctx.ellipse(0, 0, sz * 1.3, sz * 0.7, 0, 0, Math.PI * 2); ctx.fill();
                // Black stripes
                ctx.fillStyle = '#000';
                ctx.fillRect(-sz * 0.3, -sz * 0.7, sz * 0.3, sz * 1.4);
                ctx.fillRect(sz * 0.3, -sz * 0.7, sz * 0.3, sz * 1.4);
                // Wings
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                const wingFlap = Math.sin(Date.now() * 0.04 + b) * 0.3;
                ctx.beginPath(); ctx.ellipse(-sz * 0.2, -sz * 0.8 - wingFlap * 3, sz * 0.6, sz * 0.3, -0.3, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(sz * 0.2, -sz * 0.8 - wingFlap * 3, sz * 0.6, sz * 0.3, 0.3, 0, Math.PI * 2); ctx.fill();
                // Stinger
                ctx.fillStyle = '#000';
                ctx.beginPath(); ctx.moveTo(sz * 1.3, 0); ctx.lineTo(sz * 1.8, -1); ctx.lineTo(sz * 1.8, 1); ctx.closePath(); ctx.fill();
                ctx.restore();
            }
        }

        // ── Queen's Wrath VFX (Bee) ──
        if (vfx.type === 'queensWrathVfx') {
            const prog = 1 - a;
            const descend = Math.min(prog * 3, 1);
            ctx.globalAlpha = a * 0.2; ctx.fillStyle = '#1a1500'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Giant queen bee descending
            const qx = vfx.x; const qy = -80 + descend * (vfx.y + 30);
            const sz = 25;
            ctx.globalAlpha = a * 0.9;
            ctx.save(); ctx.translate(qx, qy);
            ctx.shadowColor = '#ffc107'; ctx.shadowBlur = 30;
            // Large body
            ctx.fillStyle = '#ffc107';
            ctx.beginPath(); ctx.ellipse(0, 0, sz * 1.5, sz, 0, 0, Math.PI * 2); ctx.fill();
            // Black stripes
            ctx.fillStyle = '#000';
            for (let s = -1; s <= 1; s++) {
                ctx.fillRect(s * sz * 0.6 - sz * 0.15, -sz, sz * 0.3, sz * 2);
            }
            // Crown
            ctx.fillStyle = '#ffd700'; ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-sz * 0.6, -sz * 0.9);
            ctx.lineTo(-sz * 0.4, -sz * 1.5); ctx.lineTo(-sz * 0.1, -sz * 1.0);
            ctx.lineTo(sz * 0.15, -sz * 1.5); ctx.lineTo(sz * 0.4, -sz * 1.0);
            ctx.lineTo(sz * 0.6, -sz * 1.5); ctx.lineTo(sz * 0.7, -sz * 0.9);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            // Wings
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            const wf = Math.sin(Date.now() * 0.03) * 5;
            ctx.beginPath(); ctx.ellipse(-sz * 0.5, -sz * 1.2 - wf, sz * 1.2, sz * 0.5, -0.3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(sz * 0.5, -sz * 1.2 - wf, sz * 1.2, sz * 0.5, 0.3, 0, Math.PI * 2); ctx.fill();
            // Stinger
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.moveTo(sz * 1.5, 0); ctx.lineTo(sz * 2.2, -2); ctx.lineTo(sz * 2.2, 2); ctx.closePath(); ctx.fill();
            ctx.restore();
            // Stinger projectiles flying at opponent
            if (descend >= 0.8 && vfx.life % 3 === 0) {
                for (let i = 0; i < 3; i++) {
                    const sa = Math.random() * Math.PI * 0.5 + Math.PI * 0.25;
                    particles.push({ x: qx, y: qy + sz, vx: Math.cos(sa) * 6 * (Math.random() > 0.5 ? 1 : -1), vy: Math.abs(Math.sin(sa)) * 8,
                        life: 10 + Math.random() * 8, maxLife: 18, color: '#000' });
                }
            }
            ctx.shadowBlur = 0;
        }

        // ── Ruler Slap VFX (Teacher) ──
        if (vfx.type === 'rulerSlapVfx') {
            const prog = 1 - a;
            const slamProg = Math.min(prog * 6, 1);
            // Ruler descending and slamming
            const rulerAngle = slamProg < 1 ? -Math.PI / 4 + slamProg * Math.PI / 4 : 0;
            const rulerX = vfx.x; const rulerY = vfx.y - 40 * (1 - slamProg);
            ctx.save(); ctx.translate(rulerX, rulerY); ctx.rotate(rulerAngle);
            ctx.globalAlpha = a * 0.9;
            // Ruler body
            ctx.fillStyle = '#8b6914'; ctx.fillRect(-60, -6, 120, 12);
            // Ruler markings
            ctx.strokeStyle = '#4a3500'; ctx.lineWidth = 1;
            for (let m = 0; m < 12; m++) {
                const mx = -55 + m * 10;
                ctx.beginPath(); ctx.moveTo(mx, -6); ctx.lineTo(mx, m % 2 === 0 ? 0 : -3); ctx.stroke();
            }
            // Metal edge
            ctx.fillStyle = '#aaa'; ctx.fillRect(-60, 5, 120, 2);
            ctx.restore();
            // Impact effects when slammed
            if (slamProg >= 0.9) {
                ctx.globalAlpha = a * 0.7;
                // Impact lines radiating
                ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 3;
                for (let i = 0; i < 10; i++) {
                    const la = (i / 10) * Math.PI * 2;
                    const inner = 15; const outer = 15 + prog * 50;
                    ctx.beginPath();
                    ctx.moveTo(vfx.x + Math.cos(la) * inner, vfx.y + Math.sin(la) * inner);
                    ctx.lineTo(vfx.x + Math.cos(la) * outer, vfx.y + Math.sin(la) * outer);
                    ctx.stroke();
                }
                // Red impact flash
                ctx.globalAlpha = a * 0.3;
                ctx.fillStyle = '#ff0000';
                ctx.beginPath(); ctx.arc(vfx.x, vfx.y, 30, 0, Math.PI * 2); ctx.fill();
            }
            ctx.shadowBlur = 0;
        }

        // ── Detention VFX (Teacher) ──
        if (vfx.type === 'detentionVfx') {
            const prog = 1 - a;
            const descend = Math.min(prog * 4, 1);
            ctx.globalAlpha = a * 0.3; ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Vertical bars descending around opponent
            ctx.globalAlpha = a * 0.8;
            const barCount = 8; const barW = 6;
            const cageW = 120; const cageH = 180;
            const cx = vfx.x; const cy = vfx.y;
            for (let b = 0; b < barCount; b++) {
                const bx = cx - cageW / 2 + (b / (barCount - 1)) * cageW;
                const barTop = cy - cageH * descend;
                const barBot = cy;
                // Bar gradient
                const bg = ctx.createLinearGradient(bx, barTop, bx + barW, barTop);
                bg.addColorStop(0, '#777'); bg.addColorStop(0.5, '#bbb'); bg.addColorStop(1, '#666');
                ctx.fillStyle = bg;
                ctx.fillRect(bx - barW / 2, barTop, barW, barBot - barTop);
            }
            // Horizontal bars (top and bottom)
            if (descend > 0.8) {
                ctx.fillStyle = '#999';
                ctx.fillRect(cx - cageW / 2 - 5, cy - cageH * descend, cageW + 10, 8);
                ctx.fillRect(cx - cageW / 2 - 5, cy - 4, cageW + 10, 8);
            }
            // Impact shake effect
            if (descend >= 0.95 && prog < 0.35) {
                if (vfx.life % 3 === 0) {
                    particles.push({ x: cx + (Math.random() - 0.5) * cageW, y: cy,
                        vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 3,
                        life: 6 + Math.random() * 4, maxLife: 10, color: '#888' });
                }
            }
        }

        // ── Clog Explosion VFX (Plumber) ──
        if (vfx.type === 'clogExplosionVfx') {
            const prog = 1 - a;
            const r = 30 + prog * 180;
            ctx.shadowColor = '#8b4513'; ctx.shadowBlur = 25;
            // Brown dirty explosion ring
            ctx.globalAlpha = a * 0.6;
            ctx.strokeStyle = '#8b4513'; ctx.lineWidth = 8 * a;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#a0522d'; ctx.lineWidth = 4 * a;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, r * 0.6, 0, Math.PI * 2); ctx.stroke();
            // Pipe fragments flying outward
            ctx.globalAlpha = a * 0.8;
            for (let i = 0; i < 6; i++) {
                const fa = (i / 6) * Math.PI * 2 + prog * 2;
                const fd = r * 0.4 + prog * 30;
                const fx = vfx.x + Math.cos(fa) * fd;
                const fy = vfx.y + Math.sin(fa) * fd;
                ctx.save(); ctx.translate(fx, fy); ctx.rotate(fa + prog * 4);
                ctx.fillStyle = '#808080';
                ctx.fillRect(-8, -3, 16, 6);
                ctx.fillStyle = '#666'; ctx.fillRect(-8, -3, 4, 6);
                ctx.restore();
            }
            // Brown/dirty center splash
            if (prog < 0.3) {
                ctx.globalAlpha = (0.3 - prog) / 0.3 * 0.5;
                const fg = ctx.createRadialGradient(vfx.x, vfx.y, 0, vfx.x, vfx.y, 70);
                fg.addColorStop(0, '#deb887'); fg.addColorStop(0.5, '#8b4513'); fg.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(vfx.x, vfx.y, 70, 0, Math.PI * 2); ctx.fill();
            }
            // Brown particles
            if (vfx.life % 2 === 0) { for (let i = 0; i < 5; i++) {
                const pa = Math.random() * Math.PI * 2; const ps = 3 + Math.random() * 6;
                particles.push({ x: vfx.x, y: vfx.y, vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps,
                    life: 10 + Math.random() * 8, maxLife: 18,
                    color: Math.random() > 0.5 ? '#8b4513' : '#808080' });
            }} ctx.shadowBlur = 0;
        }

        // ── Domain Expansion Activation ──
        if (vfx.type === 'domainExpansion') {
            const prog = 1 - a;
            // Dark overlay expanding outward
            const expandR = prog * Math.max(canvas.width, canvas.height);
            ctx.globalAlpha = a * 0.4;
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, expandR, 0, Math.PI * 2); ctx.fill();
            // Colored ring expanding
            ctx.globalAlpha = a * 0.8;
            ctx.strokeStyle = vfx.color; ctx.lineWidth = 8 * a;
            ctx.shadowColor = vfx.color; ctx.shadowBlur = 40;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, expandR * 0.9, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 * a;
            ctx.beginPath(); ctx.arc(vfx.x, vfx.y, expandR * 0.85, 0, Math.PI * 2); ctx.stroke();
            // Text flash
            if (prog > 0.2 && prog < 0.6) {
                const textAlpha = Math.sin((prog - 0.2) / 0.4 * Math.PI);
                ctx.globalAlpha = textAlpha * a;
                ctx.font = `bold ${60 + prog * 40}px "Segoe UI",Arial,sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillStyle = vfx.color;
                ctx.shadowColor = vfx.color; ctx.shadowBlur = 30;
                ctx.fillText('DOMAIN EXPANSION', canvas.width / 2, canvas.height * 0.35);
                ctx.font = `bold ${30 + prog * 20}px "Segoe UI",Arial,sans-serif`;
                ctx.fillStyle = '#fff';
                const styleName = STYLES[vfx.style]?.name || vfx.style;
                ctx.fillText(styleName.toUpperCase(), canvas.width / 2, canvas.height * 0.35 + 55);
            }
            // Border lines
            ctx.globalAlpha = a * 0.6;
            ctx.strokeStyle = vfx.color; ctx.lineWidth = 4;
            const borderGrow = Math.min(prog * 3, 1);
            const bw = canvas.width * borderGrow; const bh = canvas.height * borderGrow;
            const bx = (canvas.width - bw) / 2; const by = (canvas.height - bh) / 2;
            ctx.strokeRect(bx + 10, by + 10, bw - 20, bh - 20);
            ctx.strokeRect(bx + 20, by + 20, bw - 40, bh - 40);
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
                        if (p.owner.domainActive) damage = Math.floor(damage * 1.4);
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

        if (!p.isAcidMonster && !p.isRageTornado && !p.isTornadoDebris) {
            p.x += p.vx;
            p.y += (p.vy || 0);
            p.life--;
        }

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
                        if (p.owner.domainActive) damage = Math.floor(damage * 1.4);
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

        // ── Rage Tornado (Wind Rage) ──
        if (p.isRageTornado) {
            p.x += p.vx;
            p.life--;
            // Spin figures
            for (const fig of p.figures) fig.angle += 0.09;
            // Continuous wind particles
            if (Math.random() < 0.7) {
                for (let d = 0; d < 3; d++) {
                    const dy = Math.random() * 300;
                    particles.push({ x: p.x + (Math.random() - 0.5) * 80, y: groundY - dy,
                        vx: Math.sin(Date.now() * 0.01) * 5, vy: -2 - Math.random() * 3,
                        life: 8 + Math.random() * 6, maxLife: 14,
                        color: `hsl(170, 50%, ${45 + Math.random() * 30}%)` });
                }
            }
            // Rumble shake
            if (p.life % 10 === 0) triggerScreenShake(4, 4);
            // Hit detection — can hit repeatedly with cooldown
            if (p.hitCooldown > 0) p.hitCooldown--;
            if (p.hitCooldown <= 0) {
                const dist = Math.abs(p.x - p.target.x);
                if (dist < p.radius + 40) {
                    let damage = p.atk.damage;
                    if (p.owner.domainActive) damage = Math.floor(damage * 1.4);
                    let kb = 8;
                    if (p.target.blocking) { damage = Math.floor(damage * (1 - p.atk.blockReduction)); kb *= 0.5; }
                    p.target.health = Math.max(0, p.target.health - damage);
                    p.target.hitTimer = 10; p.target.hit = true;
                    p.target.vy = -6; p.target.onGround = false;
                    triggerScreenShake(8, 10);
                    spawnElementParticles(p.target.x, p.target.y - p.target.height * 0.5, p.styleData, 30);
                    p.hitCooldown = 40;
                }
            }
            // Expire — fling debris (figures and cows)
            if (p.life <= 0 || p.x < -120 || p.x > canvas.width + 120) {
                triggerScreenShake(10, 12);
                for (const fig of p.figures) {
                    const speed = 8 + Math.random() * 6;
                    const fAngle = fig.angle + (Math.random() - 0.5) * 0.8;
                    projectiles.push({
                        x: p.x + Math.cos(fig.angle) * fig.dist,
                        y: groundY - fig.height * 280,
                        vx: Math.cos(fAngle) * speed,
                        vy: -4 + Math.sin(fAngle) * speed,
                        radius: 22, owner: p.owner, target: p.target,
                        atk: { damage: 8, knockback: 12, blockReduction: 0.4 },
                        styleData: p.styleData, life: 150, trail: [],
                        isTornadoDebris: true, debrisType: fig.type,
                        rotation: Math.random() * Math.PI * 2,
                        rotSpeed: (Math.random() - 0.5) * 0.2,
                    });
                }
                projectiles.splice(i, 1);
                continue;
            }
            continue;
        }

        // ── Tornado Debris (spinning figures/cows) ──
        if (p.isTornadoDebris) {
            p.x += p.vx; p.y += p.vy;
            p.vy += 0.3; // gravity
            p.rotation += p.rotSpeed;
            p.life--;
            // Hit detection
            const dx = p.x - p.target.x;
            const dy = p.y - (p.target.y - p.target.height * 0.5);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < p.radius + 30) {
                let damage = p.atk.damage;
                if (p.owner.domainActive) damage = Math.floor(damage * 1.4);
                if (p.target.blocking) damage = Math.floor(damage * (1 - p.atk.blockReduction));
                p.target.health = Math.max(0, p.target.health - damage);
                p.target.hitTimer = 10; p.target.hit = true;
                p.target.x += (p.vx > 0 ? 1 : -1) * p.atk.knockback;
                triggerScreenShake(5, 6);
                spawnElementParticles(p.x, p.y, p.styleData, 15);
                visualEffects.push({ type: 'impactRing', x: p.x, y: p.y, life: 12, maxLife: 12, color: '#1abc9c' });
                projectiles.splice(i, 1); continue;
            }
            if (p.life <= 0 || p.y > canvas.height + 50 || p.x < -100 || p.x > canvas.width + 100) {
                projectiles.splice(i, 1); continue;
            }
            continue;
        }

        // Glitch fragments move erratically
        if (p.isGlitch) { p.vy += (Math.random() - 0.5) * 1.5; p.vy *= 0.95; }
        p.trail.push({ x: p.x, y: p.y, alpha: 1 });
        if (p.trail.length > 35) p.trail.shift();
        for (const t of p.trail) t.alpha *= 0.87;

        // Hit detection
        const hitY = p.isMeteor ? p.y : (p.target.y - p.target.height * 0.5);
        const dx = p.x - p.target.x;
        const dy = p.y - hitY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < p.radius + 30) {
            let damage = p.atk.damage;
            if (p.owner.rageActive) damage = Math.floor(damage * 1.5);
            if (p.owner.domainActive) damage = Math.floor(damage * 1.4);
            damage = p.owner.applyComboBonus(damage);
            let kb = p.atk.knockback;
            if (p.target.blocking) {
                damage = Math.floor(damage * (1 - p.atk.blockReduction));
                kb *= (1 - p.atk.blockReduction);
            }
            p.target.health = Math.max(0, p.target.health - damage);
            spawnDamageNumber(p.target.x, p.target.y - p.target.height - 10, damage, p.styleData.color);
            p.owner.addCombo();
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
            // Soap blast leaves a puddle on the ground
            if (p.isSoapBlast) {
                visualEffects.push({ type: 'soapPuddle', x: p.x, y: groundY, life: 180, maxLife: 180 });
            }
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
            ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 53;
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
            ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 75;
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
            if (Math.random() < 0.8) {
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
            ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 60;
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
            ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 120;
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
            ctx.shadowColor = '#3498db'; ctx.shadowBlur = 22;
            const wg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            wg.addColorStop(0, '#fff');
            wg.addColorStop(0.3, '#85c1e9');
            wg.addColorStop(0.7, '#3498db');
            wg.addColorStop(1, 'rgba(52,152,219,0)');
            ctx.fillStyle = wg;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Drips
            if (Math.random() < 0.6) {
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
            ctx.shadowColor = '#2980b9'; ctx.shadowBlur = 30;
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
            if (Math.random() < 0.7) {
                particles.push({ x: p.x + dir * 20, y: groundY - waveH + Math.random() * 20,
                    vx: dir * (2 + Math.random() * 3), vy: -1 - Math.random() * 3,
                    life: 8 + Math.random() * 6, maxLife: 14, color: '#aed6f1' });
            }
        }

        // ─── WATER: Ice Spike ───
        // ─── WATER: Tsunami ───
        else if (draw === 'tsunami') {
            const dir = p.vx > 0 ? 1 : -1;
            const waveH = 180;
            const waveW = 110;
            ctx.save();
            ctx.translate(p.x, groundY);
            ctx.globalAlpha = 0.8;
            ctx.shadowColor = '#1a5276'; ctx.shadowBlur = 45;
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
            if (Math.random() < 0.9) {
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
            ctx.shadowColor = '#1abc9c'; ctx.shadowBlur = 18;
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
            const isRage = p.isRageTornado;
            const h = isRage ? 320 : 140;
            const baseW = isRage ? 70 : 30;
            const rings = isRage ? 18 : 10;
            ctx.save();
            ctx.translate(p.x, groundY);
            ctx.globalAlpha = isRage ? 0.85 : 0.7;
            ctx.shadowColor = '#1abc9c'; ctx.shadowBlur = isRage ? 53 : 22;
            // Funnel shape — wider at bottom, narrow at top, spinning lines
            for (let j = 0; j < rings; j++) {
                const t = j / rings;
                const y = -t * h;
                const w = (1 - t * 0.6) * baseW;
                const offset = Math.sin(Date.now() * 0.012 + j * 0.8) * w * 0.5;
                ctx.strokeStyle = `hsla(170, 60%, ${50 + j * 2}%, ${0.4 + t * 0.3})`;
                ctx.lineWidth = isRage ? (5 - t * 2.5) : (3 - t * 1.5);
                ctx.beginPath();
                ctx.ellipse(offset, y, w, isRage ? 12 : 6, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

            // ── Spinning figures inside rage tornado ──
            if (isRage && p.figures) {
                for (const fig of p.figures) {
                    const fy = -fig.height * h;
                    const fx = Math.cos(fig.angle) * fig.dist;
                    const spin = fig.angle * 2;
                    ctx.globalAlpha = 0.8;

                    if (fig.type === 'stickman') {
                        // Mini stickman
                        ctx.save();
                        ctx.translate(fx, fy);
                        ctx.rotate(spin);
                        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2; ctx.lineCap = 'round';
                        ctx.beginPath(); ctx.arc(0, -14, 5, 0, Math.PI * 2); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 4); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(-8, 1); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(8, 1); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(-6, 14); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(6, 14); ctx.stroke();
                        ctx.restore();
                    } else if (fig.type === 'cow') {
                        // Mini cow
                        ctx.save();
                        ctx.translate(fx, fy);
                        ctx.rotate(spin);
                        const sc = 0.9;
                        ctx.scale(sc, sc);
                        // Body
                        ctx.fillStyle = '#f5f5f5';
                        ctx.fillRect(-14, -7, 28, 14);
                        // Spots
                        ctx.fillStyle = '#333';
                        ctx.beginPath(); ctx.arc(-5, -2, 4, 0, Math.PI * 2); ctx.fill();
                        ctx.beginPath(); ctx.arc(7, 3, 3, 0, Math.PI * 2); ctx.fill();
                        // Head
                        ctx.fillStyle = '#f5f5f5';
                        ctx.beginPath(); ctx.arc(16, -5, 6, 0, Math.PI * 2); ctx.fill();
                        // Eyes
                        ctx.fillStyle = '#000';
                        ctx.beginPath(); ctx.arc(18, -6, 1.5, 0, Math.PI * 2); ctx.fill();
                        // Horns
                        ctx.strokeStyle = '#a08060'; ctx.lineWidth = 1.5;
                        ctx.beginPath(); ctx.moveTo(14, -10); ctx.lineTo(12, -15); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(18, -10); ctx.lineTo(20, -15); ctx.stroke();
                        // Legs
                        ctx.strokeStyle = '#ccc'; ctx.lineWidth = 2;
                        ctx.beginPath(); ctx.moveTo(-9, 7); ctx.lineTo(-9, 16); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(-3, 7); ctx.lineTo(-3, 16); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(5, 7); ctx.lineTo(5, 16); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(11, 7); ctx.lineTo(11, 16); ctx.stroke();
                        ctx.restore();
                    }
                }
            }

            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
            ctx.restore();
            // Debris particles
            if (Math.random() < (isRage ? 1.0 : 0.7)) {
                const dy = Math.random() * h;
                particles.push({ x: p.x + (Math.random() - 0.5) * (isRage ? 90 : 40), y: groundY - dy,
                    vx: Math.sin(Date.now() * 0.01) * (isRage ? 7 : 4), vy: -1 - Math.random() * (isRage ? 4 : 2),
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
            if (Math.random() < 0.6) {
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
            ctx.shadowColor = '#a0522d'; ctx.shadowBlur = 18;
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
            ctx.shadowColor = '#4a2800'; ctx.shadowBlur = 38;

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
            if (Math.random() < 0.9) {
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
            ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 30;
            const ag = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 1.3);
            ag.addColorStop(0, '#fff'); ag.addColorStop(0.25, '#7fff00');
            ag.addColorStop(0.6, '#39ff14'); ag.addColorStop(1, 'rgba(57,255,20,0)');
            ctx.fillStyle = ag;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 1.3, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Acid drips
            if (Math.random() < 0.6) {
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
            ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 38;
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
            ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 60;
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
            ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 30;
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
            ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 12;
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
                ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 22;
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
            if (Math.random() < 0.6) {
                particles.push({ x: p.x + (Math.random() - 0.5) * 200, y: groundY - Math.random() * 30,
                    vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2,
                    life: 15 + Math.random() * 10, maxLife: 25,
                    color: 'rgba(57, 255, 20, 0.4)' });
            }

            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // ─── LIGHT: Holy Bolt ───
        else if (draw === 'holyBolt') {
            // Golden trail
            for (const t of p.trail) {
                ctx.globalAlpha = t.alpha * 0.5;
                const tr = p.radius * (0.3 + t.alpha * 0.5);
                ctx.fillStyle = `hsl(45, 100%, ${60 + (1 - t.alpha) * 30}%)`;
                ctx.beginPath(); ctx.arc(t.x, t.y, tr, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 53;
            // Outer glow
            const og = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2);
            og.addColorStop(0, 'rgba(255,215,0,0.4)'); og.addColorStop(1, 'rgba(255,215,0,0)');
            ctx.fillStyle = og; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2); ctx.fill();
            // Core
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#fffacd'); g.addColorStop(0.6, '#ffd700'); g.addColorStop(1, 'rgba(255,215,0,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
            // Spinning light rays
            ctx.strokeStyle = 'rgba(255,215,0,0.6)'; ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const ra = Date.now() * 0.01 + (i / 4) * Math.PI * 2;
                ctx.beginPath(); ctx.moveTo(p.x + Math.cos(ra) * p.radius * 0.4, p.y + Math.sin(ra) * p.radius * 0.4);
                ctx.lineTo(p.x + Math.cos(ra) * p.radius * 1.8, p.y + Math.sin(ra) * p.radius * 1.8); ctx.stroke();
            }
            ctx.shadowBlur = 0;
            // Sparkle particles
            if (Math.random() < 0.8) {
                particles.push({ x: p.x + (Math.random() - 0.5) * 15, y: p.y + (Math.random() - 0.5) * 15,
                    vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
                    life: 6 + Math.random() * 5, maxLife: 11, color: '#ffd700' });
            }
        }
        // ─── LIGHT: Divine Ray ───
        else if (draw === 'divineRay') {
            // Brilliant holy trail
            for (const t of p.trail) {
                ctx.globalAlpha = t.alpha * 0.6;
                const tr = p.radius * t.alpha * 0.9;
                ctx.fillStyle = `hsl(45, 100%, ${55 + (1 - t.alpha) * 35}%)`;
                ctx.beginPath(); ctx.arc(t.x, t.y, tr, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 90;
            // Massive outer glow
            const og = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2.5);
            og.addColorStop(0, 'rgba(255,250,205,0.5)'); og.addColorStop(0.4, 'rgba(255,215,0,0.2)'); og.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = og; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2); ctx.fill();
            // Bright core
            const fg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 1.4);
            fg.addColorStop(0, '#fff'); fg.addColorStop(0.15, '#fffde8'); fg.addColorStop(0.4, '#ffd700');
            fg.addColorStop(0.7, 'rgba(255,215,0,0.4)'); fg.addColorStop(1, 'rgba(255,215,0,0)');
            ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 1.4, 0, Math.PI * 2); ctx.fill();
            // Radiating light beams
            ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                const ra = Date.now() * 0.006 + (i / 8) * Math.PI * 2;
                const r1 = p.radius * 0.5, r2 = p.radius * 2 + Math.sin(Date.now() * 0.015 + i) * 10;
                ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.02 + i) * 0.2;
                ctx.beginPath(); ctx.moveTo(p.x + Math.cos(ra) * r1, p.y + Math.sin(ra) * r1);
                ctx.lineTo(p.x + Math.cos(ra) * r2, p.y + Math.sin(ra) * r2); ctx.stroke();
            }
            ctx.globalAlpha = 1; ctx.shadowBlur = 0;
            // Holy sparkles
            if (Math.random() < 0.8) {
                particles.push({ x: p.x + (Math.random() - 0.5) * p.radius, y: p.y + (Math.random() - 0.5) * p.radius,
                    vx: (Math.random() - 0.5) * 4, vy: -1 - Math.random() * 3,
                    life: 8 + Math.random() * 8, maxLife: 16, color: '#fffacd' });
            }
        }
        // ─── DARK: Shadow Bolt ───
        else if (draw === 'shadowBolt') {
            // Dark wispy trail
            for (const t of p.trail) {
                ctx.globalAlpha = t.alpha * 0.5;
                ctx.fillStyle = `rgba(108,52,131,${t.alpha * 0.6})`;
                ctx.beginPath(); ctx.arc(t.x, t.y, p.radius * (0.3 + t.alpha * 0.4), 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1; ctx.shadowColor = '#8e44ad'; ctx.shadowBlur = 45;
            // Void center
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 1.5);
            g.addColorStop(0, '#000'); g.addColorStop(0.2, '#1a0a2e'); g.addColorStop(0.5, '#6c3483');
            g.addColorStop(0.8, 'rgba(142,68,173,0.3)'); g.addColorStop(1, 'rgba(142,68,173,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 1.5, 0, Math.PI * 2); ctx.fill();
            // Swirling dark energy
            ctx.strokeStyle = '#8e44ad'; ctx.lineWidth = 2;
            for (let i = 0; i < 5; i++) {
                const sa = Date.now() * 0.012 + (i / 5) * Math.PI * 2;
                const sr = p.radius * (0.6 + Math.sin(Date.now() * 0.008 + i) * 0.3);
                ctx.globalAlpha = 0.5; ctx.beginPath();
                ctx.arc(p.x + Math.cos(sa) * sr * 0.3, p.y + Math.sin(sa) * sr * 0.3, sr * 0.4, sa, sa + 1.5); ctx.stroke();
            }
            ctx.globalAlpha = 1; ctx.shadowBlur = 0;
            // Dark wisps
            if (Math.random() < 0.7) {
                particles.push({ x: p.x + (Math.random() - 0.5) * 15, y: p.y + (Math.random() - 0.5) * 15,
                    vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2,
                    life: 8 + Math.random() * 6, maxLife: 14, color: '#6c3483' });
            }
        }
        // ─── DARK: Dark Orb ───
        else if (draw === 'darkOrb') {
            ctx.globalAlpha = 1; ctx.shadowColor = '#8e44ad'; ctx.shadowBlur = 75;
            // Massive dark aura
            const og = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2);
            og.addColorStop(0, 'rgba(10,0,20,0.5)'); og.addColorStop(0.5, 'rgba(108,52,131,0.2)'); og.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = og; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2); ctx.fill();
            // Void sphere
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            g.addColorStop(0, '#000'); g.addColorStop(0.3, '#0a0014'); g.addColorStop(0.7, '#3d1560'); g.addColorStop(1, 'rgba(142,68,173,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
            // Orbiting dark tendrils
            ctx.strokeStyle = '#8e44ad'; ctx.lineWidth = 3;
            for (let i = 0; i < 6; i++) {
                const ta = Date.now() * 0.008 + (i / 6) * Math.PI * 2;
                const tr = p.radius * (1 + Math.sin(Date.now() * 0.01 + i * 2) * 0.3);
                ctx.globalAlpha = 0.6; ctx.beginPath();
                ctx.moveTo(p.x + Math.cos(ta) * p.radius * 0.4, p.y + Math.sin(ta) * p.radius * 0.4);
                ctx.quadraticCurveTo(p.x + Math.cos(ta + 0.5) * tr, p.y + Math.sin(ta + 0.5) * tr,
                    p.x + Math.cos(ta + 1) * p.radius * 0.6, p.y + Math.sin(ta + 1) * p.radius * 0.6); ctx.stroke();
            }
            ctx.globalAlpha = 1; ctx.shadowBlur = 0;
            // Particles being pulled in
            if (Math.random() < 0.8) {
                const pa = Math.random() * Math.PI * 2;
                particles.push({ x: p.x + Math.cos(pa) * p.radius * 1.8, y: p.y + Math.sin(pa) * p.radius * 1.8,
                    vx: -Math.cos(pa) * 4, vy: -Math.sin(pa) * 4,
                    life: 8 + Math.random() * 6, maxLife: 14, color: '#8e44ad' });
            }
        }
        // ─── SHADOW: Shadow Strike ───
        else if (draw === 'shadowStrike') {
            const dir = p.vx > 0 ? 1 : -1;
            // Ghost afterimage trail
            for (const t of p.trail) {
                ctx.globalAlpha = t.alpha * 0.3;
                ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(dir > 0 ? -0.3 : Math.PI + 0.3);
                ctx.fillStyle = '#444'; ctx.beginPath();
                ctx.moveTo(22, 0); ctx.lineTo(-8, -7); ctx.lineTo(-14, 0); ctx.lineTo(-8, 7); ctx.closePath(); ctx.fill();
                ctx.restore();
            }
            ctx.globalAlpha = 1; ctx.shadowColor = '#aaa'; ctx.shadowBlur = 22;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(dir > 0 ? -0.3 : Math.PI + 0.3);
            // Blade body
            ctx.fillStyle = '#444'; ctx.beginPath();
            ctx.moveTo(24, 0); ctx.lineTo(-8, -8); ctx.lineTo(-16, 0); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill();
            // Inner bright edge
            ctx.fillStyle = '#aaa'; ctx.beginPath();
            ctx.moveTo(22, 0); ctx.lineTo(-4, -4); ctx.lineTo(-8, 0); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
            // Sharp tip glow
            ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(20, 0, 3, 0, Math.PI * 2); ctx.fill();
            ctx.restore(); ctx.shadowBlur = 0;
            // Shadow wisps
            if (Math.random() < 0.6) {
                particles.push({ x: p.x - dir * 10, y: p.y + (Math.random() - 0.5) * 10,
                    vx: -dir * (1 + Math.random() * 2), vy: (Math.random() - 0.5) * 2,
                    life: 5 + Math.random() * 4, maxLife: 9, color: '#555' });
            }
        }
        // ─── SHADOW: Shadow Clone ───
        else if (draw === 'shadowClone') {
            // Ghostly afterimage trail
            for (const t of p.trail) {
                if (t.alpha < 0.3) continue;
                ctx.globalAlpha = t.alpha * 0.2;
                ctx.save(); ctx.translate(t.x, t.y);
                ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.arc(0, -22, 9, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(0, 6); ctx.stroke();
                ctx.restore();
            }
            ctx.globalAlpha = 0.75; ctx.shadowColor = '#708090'; ctx.shadowBlur = 30;
            ctx.save(); ctx.translate(p.x, p.y);
            // Dark aura around clone
            const cg = ctx.createRadialGradient(0, -10, 5, 0, -10, 35);
            cg.addColorStop(0, 'rgba(50,50,50,0.3)'); cg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, -10, 35, 0, Math.PI * 2); ctx.fill();
            // Ghost stickman — detailed
            ctx.strokeStyle = '#666'; ctx.lineWidth = 3; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.arc(0, -22, 9, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(0, 6); ctx.stroke();
            const armSwing = Math.sin(Date.now() * 0.01) * 8;
            ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(-12 + armSwing, 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(12 - armSwing, 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(-8, 18); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(8, 18); ctx.stroke();
            // Glowing eyes
            ctx.fillStyle = '#b0b0b0'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.arc(-4, -23, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(4, -23, 2, 0, Math.PI * 2); ctx.fill();
            ctx.restore(); ctx.shadowBlur = 0;
            // Shadow particles
            if (Math.random() < 0.6) {
                particles.push({ x: p.x + (Math.random() - 0.5) * 20, y: p.y + (Math.random() - 0.5) * 30,
                    vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random(), life: 8 + Math.random() * 5, maxLife: 13, color: '#555' });
            }
        }
        // ─── PORTAL: Rift Shot ───
        else if (draw === 'riftShot') {
            // Dimensional trail
            for (const t of p.trail) {
                ctx.globalAlpha = t.alpha * 0.4;
                ctx.strokeStyle = '#e056de'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(t.x, t.y, p.radius * 0.5 * t.alpha, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.globalAlpha = 1; ctx.shadowColor = '#e056de'; ctx.shadowBlur = 45;
            // Swirling portal ball
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 1.3);
            g.addColorStop(0, '#0a0014'); g.addColorStop(0.3, '#6a1b6a'); g.addColorStop(0.6, '#e056de');
            g.addColorStop(0.85, 'rgba(224,86,222,0.3)'); g.addColorStop(1, 'rgba(224,86,222,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 1.3, 0, Math.PI * 2); ctx.fill();
            // Spinning ring
            ctx.strokeStyle = '#e056de'; ctx.lineWidth = 2;
            const ringAngle = Date.now() * 0.012;
            ctx.beginPath(); ctx.ellipse(p.x, p.y, p.radius * 1.1, p.radius * 0.4, ringAngle, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.ellipse(p.x, p.y, p.radius * 0.8, p.radius * 0.3, ringAngle + 1.5, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
            // Dimensional particles
            if (Math.random() < 0.7) {
                const pa = Math.random() * Math.PI * 2;
                particles.push({ x: p.x + Math.cos(pa) * p.radius, y: p.y + Math.sin(pa) * p.radius,
                    vx: -Math.cos(pa) * 3, vy: -Math.sin(pa) * 3,
                    life: 6 + Math.random() * 4, maxLife: 10, color: '#e056de' });
            }
        }
        // ─── PORTAL: Dimensional Rift ───
        else if (draw === 'dimensionalRift') {
            ctx.globalAlpha = 0.9; ctx.shadowColor = '#e056de'; ctx.shadowBlur = 60;
            // Dark void center
            const vg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 0.6);
            vg.addColorStop(0, '#000'); vg.addColorStop(0.5, '#1a0020'); vg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = vg; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 0.6, 0, Math.PI * 2); ctx.fill();
            // Multiple spinning portal rings at different angles
            for (let i = 0; i < 4; i++) {
                const ra = Date.now() * 0.006 + i * 1.3;
                const ringR = p.radius * (1.1 - i * 0.08);
                ctx.strokeStyle = `hsla(300, 70%, ${50 + i * 10}%, ${0.7 - i * 0.1})`; ctx.lineWidth = (5 - i);
                ctx.beginPath(); ctx.ellipse(p.x, p.y, ringR, ringR * 0.35, ra, 0, Math.PI * 2); ctx.stroke();
            }
            // Energy wisps being drawn in
            ctx.strokeStyle = '#bb6bd9'; ctx.lineWidth = 1.5;
            for (let i = 0; i < 4; i++) {
                const wa = Date.now() * 0.01 + i * 1.57;
                const wr = p.radius * 1.5;
                ctx.globalAlpha = 0.4;
                ctx.beginPath();
                ctx.moveTo(p.x + Math.cos(wa) * wr, p.y + Math.sin(wa) * wr * 0.4);
                ctx.quadraticCurveTo(p.x + Math.cos(wa + 0.5) * wr * 0.5, p.y + Math.sin(wa + 0.5) * wr * 0.2, p.x, p.y);
                ctx.stroke();
            }
            ctx.globalAlpha = 1; ctx.shadowBlur = 0;
            // Particles spiraling in
            if (Math.random() < 0.8) {
                const pa = Math.random() * Math.PI * 2;
                particles.push({ x: p.x + Math.cos(pa) * p.radius * 1.5, y: p.y + Math.sin(pa) * p.radius * 0.5,
                    vx: -Math.cos(pa) * 4, vy: -Math.sin(pa) * 2,
                    life: 8 + Math.random() * 6, maxLife: 14, color: '#e056de' });
            }
        }
        // ─── CRYSTAL: Crystal Shard ───
        else if (draw === 'crystalShard') {
            const dir = p.vx > 0 ? 1 : -1;
            for (const t of p.trail) { ctx.globalAlpha = t.alpha * 0.3; ctx.fillStyle = '#00e5ff';
                ctx.beginPath(); ctx.arc(t.x, t.y, p.radius * 0.3, 0, Math.PI * 2); ctx.fill(); }
            ctx.globalAlpha = 1; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 22;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(dir > 0 ? -0.3 : Math.PI + 0.3);
            ctx.fillStyle = '#00e5ff'; ctx.beginPath();
            ctx.moveTo(20, 0); ctx.lineTo(0, -8); ctx.lineTo(-12, 0); ctx.lineTo(0, 8); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#80f0ff'; ctx.beginPath();
            ctx.moveTo(16, 0); ctx.lineTo(2, -4); ctx.lineTo(-4, 0); ctx.lineTo(2, 4); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(12, 0, 3, 0, Math.PI * 2); ctx.fill();
            ctx.restore(); ctx.shadowBlur = 0;
        }
        // ─── CRYSTAL: Crystal Cage ───
        else if (draw === 'crystalCage') {
            ctx.globalAlpha = 1; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 30;
            ctx.save(); ctx.translate(p.x, p.y);
            for (let s = -2; s <= 2; s++) {
                const sh = 30 + Math.abs(s) * 15; const sx = s * 14;
                ctx.fillStyle = `hsl(187, 100%, ${55 + Math.abs(s) * 8}%)`;
                ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx - 6, -sh * 0.4); ctx.lineTo(sx, -sh); ctx.lineTo(sx + 6, -sh * 0.4); ctx.closePath(); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.moveTo(sx + 2, -2); ctx.lineTo(sx + 4, -sh * 0.6); ctx.lineTo(sx + 1, -sh * 0.3); ctx.closePath(); ctx.fill();
            }
            ctx.restore(); ctx.shadowBlur = 0;
        }
        // ─── RUBBER DUCK: Duck Shot ───
        else if (draw === 'duckShot') {
            ctx.globalAlpha = 1; ctx.shadowColor = '#ffeb3b'; ctx.shadowBlur = 15;
            ctx.save(); ctx.translate(p.x, p.y);
            ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.arc(0, 0, p.radius * 0.8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ff8f00'; ctx.beginPath(); ctx.moveTo(p.radius * 0.6, -2); ctx.lineTo(p.radius * 1.1, 0); ctx.lineTo(p.radius * 0.6, 2); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-3, -4, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-2, -5, 1, 0, Math.PI * 2); ctx.fill();
            ctx.restore(); ctx.shadowBlur = 0;
        }
        // ─── RUBBER DUCK: Bath Bomb ───
        else if (draw === 'bathBomb') {
            for (const t of p.trail) { ctx.globalAlpha = t.alpha * 0.3;
                ctx.fillStyle = `hsl(${(Date.now() * 0.1 + t.x) % 360}, 70%, 70%)`;
                ctx.beginPath(); ctx.arc(t.x, t.y, p.radius * 0.4, 0, Math.PI * 2); ctx.fill(); }
            ctx.globalAlpha = 1; ctx.shadowColor = '#ff69b4'; ctx.shadowBlur = 20;
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#ff69b4'); g.addColorStop(0.6, '#da70d6'); g.addColorStop(1, 'rgba(218,112,214,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            if (Math.random() < 0.7) { particles.push({ x: p.x + (Math.random()-0.5)*15, y: p.y + (Math.random()-0.5)*15,
                vx: (Math.random()-0.5)*3, vy: -1-Math.random()*2, life: 8+Math.random()*6, maxLife: 14,
                color: `hsl(${Math.random()*360}, 70%, 70%)` }); }
        }
        // ─── KEYBOARD: Key Throw ───
        else if (draw === 'keyThrow') {
            const dir = p.vx > 0 ? 1 : -1;
            ctx.globalAlpha = 1; ctx.shadowColor = '#607d8b'; ctx.shadowBlur = 10;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Date.now() * 0.012 * dir);
            ctx.fillStyle = '#37474f'; ctx.fillRect(-8, -8, 16, 16);
            ctx.strokeStyle = '#546e7a'; ctx.lineWidth = 1.5; ctx.strokeRect(-8, -8, 16, 16);
            ctx.fillStyle = '#eceff1'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
            const keys = ['W','A','S','D','Q','E','R','F','X','Z'];
            ctx.fillText(keys[Math.floor(p.x * 0.1) % keys.length], 0, 4);
            ctx.restore(); ctx.shadowBlur = 0;
        }
        // ─── CHEF: Pan Toss ───
        else if (draw === 'panToss') {
            const dir = p.vx > 0 ? 1 : -1;
            ctx.globalAlpha = 1; ctx.shadowColor = '#ff5722'; ctx.shadowBlur = 10;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Date.now() * 0.015 * dir);
            ctx.fillStyle = '#444'; ctx.beginPath(); ctx.arc(0, 0, p.radius * 0.7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(0, 0, p.radius * 0.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#666'; ctx.fillRect(p.radius * 0.5, -3, p.radius * 0.6, 6);
            ctx.restore(); ctx.shadowBlur = 0;
        }
        // ─── CHEF: Knife Throw ───
        else if (draw === 'knifeThrow') {
            const dir = p.vx > 0 ? 1 : -1;
            ctx.globalAlpha = 1; ctx.shadowColor = '#ccc'; ctx.shadowBlur = 10;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Date.now() * 0.025 * dir);
            ctx.fillStyle = '#ccc'; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-2, -3); ctx.lineTo(-2, 3); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#5d4037'; ctx.fillRect(-10, -3, 8, 6);
            ctx.restore(); ctx.shadowBlur = 0;
        }
        // ─── DJ: Vinyl Disc ───
        else if (draw === 'vinylDisc') {
            const dir = p.vx > 0 ? 1 : -1;
            ctx.globalAlpha = 1; ctx.shadowColor = '#e040fb'; ctx.shadowBlur = 15;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Date.now() * 0.02);
            ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
            for (let r = 4; r < p.radius; r += 4) { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); }
            ctx.fillStyle = '#e040fb'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
            ctx.restore(); ctx.shadowBlur = 0;
        }
        // ─── DJ: Speaker Blast ───
        else if (draw === 'speakerBlast') {
            ctx.globalAlpha = 0.8; ctx.shadowColor = '#e040fb'; ctx.shadowBlur = 20;
            for (let i = 0; i < 4; i++) {
                const r = p.radius * (0.5 + i * 0.3) + Math.sin(Date.now() * 0.02 + i) * 5;
                ctx.strokeStyle = `hsla(291, 80%, ${50 + i * 10}%, ${0.5 - i * 0.1})`;
                ctx.lineWidth = 3 - i * 0.5; ctx.beginPath(); ctx.arc(p.x, p.y, r, -0.8, 0.8); ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }
        // ─── PIGEON: Peck Shot ───
        else if (draw === 'peckShot') {
            const dir = p.vx > 0 ? 1 : -1;
            ctx.globalAlpha = 1; ctx.shadowColor = '#9e9e9e'; ctx.shadowBlur = 8;
            ctx.save(); ctx.translate(p.x, p.y); ctx.scale(dir, 1);
            ctx.fillStyle = '#888'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#666'; ctx.beginPath(); ctx.moveTo(5, -1); ctx.lineTo(12, 0); ctx.lineTo(5, 1); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-1, -2, 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.restore(); ctx.shadowBlur = 0;
        }
        // ─── PIGEON: Poop Bomb ───
        else if (draw === 'poopBomb') {
            ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(p.x, groundY + 3, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1; ctx.shadowColor = '#795548'; ctx.shadowBlur = 8;
            ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 0.7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#4e342e'; ctx.beginPath(); ctx.arc(p.x, p.y - p.radius * 0.4, p.radius * 0.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#3e2723'; ctx.beginPath(); ctx.arc(p.x, p.y - p.radius * 0.7, p.radius * 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 0.4; ctx.strokeStyle = '#795548'; ctx.lineWidth = 1.5;
            for (let s = 0; s < 3; s++) { const sx = p.x + (Math.random()-0.5) * 15;
                ctx.beginPath(); ctx.moveTo(sx, p.y - p.radius); ctx.lineTo(sx, p.y - p.radius - 10 - Math.random() * 10); ctx.stroke(); }
            ctx.globalAlpha = 1;
        }
        // ─── SAMURAI: Oni Giri (three crossing slashes) ───
        else if (draw === 'oniGiri') {
            const dir = p.vx > 0 ? 1 : -1;
            // Slash trail
            for (const t of p.trail) {
                if (t.alpha < 0.2) continue;
                ctx.globalAlpha = t.alpha * 0.3; ctx.strokeStyle = '#c8d6e5'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(t.x - 8, t.y - 8); ctx.lineTo(t.x + 8, t.y + 8); ctx.stroke();
            }
            ctx.globalAlpha = 1; ctx.shadowColor = '#fff'; ctx.shadowBlur = 22;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Date.now() * 0.015 * dir);
            // Three crossing slash lines
            ctx.strokeStyle = '#e8eef4'; ctx.lineWidth = 4; ctx.lineCap = 'round';
            for (let s = 0; s < 3; s++) {
                const sa = (s / 3) * Math.PI;
                ctx.beginPath();
                ctx.moveTo(Math.cos(sa) * -p.radius, Math.sin(sa) * -p.radius);
                ctx.lineTo(Math.cos(sa) * p.radius, Math.sin(sa) * p.radius);
                ctx.stroke();
            }
            // White core
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
            for (let s = 0; s < 3; s++) {
                const sa = (s / 3) * Math.PI;
                ctx.beginPath();
                ctx.moveTo(Math.cos(sa) * -p.radius * 0.6, Math.sin(sa) * -p.radius * 0.6);
                ctx.lineTo(Math.cos(sa) * p.radius * 0.6, Math.sin(sa) * p.radius * 0.6);
                ctx.stroke();
            }
            ctx.restore(); ctx.shadowBlur = 0;
            // Slash sparks
            if (Math.random() < 0.7) {
                particles.push({ x: p.x + (Math.random() - 0.5) * 15, y: p.y + (Math.random() - 0.5) * 15,
                    vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
                    life: 5 + Math.random() * 4, maxLife: 9, color: '#dde4ec' });
            }
        }
        // ─── SAMURAI: Dragon Twister (slash tornado) ───
        else if (draw === 'dragonTwister') {
            const isRage = p.isDragonTwisterRage;
            const h = isRage ? 260 : 160;
            const baseW = isRage ? 55 : 35;
            ctx.save(); ctx.translate(p.x, groundY);
            ctx.globalAlpha = 0.8; ctx.shadowColor = '#c8d6e5'; ctx.shadowBlur = 30;
            // Spinning slash tornado
            for (let j = 0; j < 12; j++) {
                const t = j / 12;
                const y = -t * h;
                const w = (1 - t * 0.5) * baseW;
                const offset = Math.sin(Date.now() * 0.015 + j * 0.7) * w * 0.4;
                // Slash arcs instead of normal tornado rings
                ctx.strokeStyle = j % 2 === 0 ? '#e8eef4' : '#aab7c4';
                ctx.lineWidth = isRage ? 4 : 2.5;
                ctx.beginPath();
                ctx.arc(offset, y, w, Date.now() * 0.02 + j * 0.5, Date.now() * 0.02 + j * 0.5 + 2);
                ctx.stroke();
                // Sword shapes at some levels
                if (j % 3 === 0) {
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
                    const sAngle = Date.now() * 0.01 + j;
                    ctx.beginPath();
                    ctx.moveTo(offset + Math.cos(sAngle) * w * 0.3, y + Math.sin(sAngle) * 8);
                    ctx.lineTo(offset + Math.cos(sAngle) * w * 1.2, y + Math.sin(sAngle) * 8);
                    ctx.stroke();
                }
            }
            ctx.shadowBlur = 0; ctx.restore();
            // Wind/slash particles
            if (Math.random() < 0.8) {
                particles.push({ x: p.x + (Math.random() - 0.5) * baseW * 2, y: groundY - Math.random() * h,
                    vx: Math.sin(Date.now() * 0.01) * (isRage ? 6 : 4), vy: -1 - Math.random() * 2,
                    life: 6 + Math.random() * 5, maxLife: 11, color: '#c8d6e5' });
            }
        }

        // ─── FACE: Face Shot (flying face — actual photo) ───
        else if (draw === 'faceShot') {
            // Trail of smaller faces
            if (faceImgLoaded) {
                for (const t of p.trail) {
                    if (t.alpha < 0.3) continue;
                    ctx.globalAlpha = t.alpha * 0.25;
                    const ts = p.radius * 0.8;
                    ctx.save(); ctx.beginPath(); ctx.arc(t.x, t.y, ts, 0, Math.PI * 2); ctx.clip();
                    ctx.drawImage(faceImg, t.x - ts, t.y - ts, ts * 2, ts * 2);
                    ctx.restore();
                }
            }
            ctx.globalAlpha = 1; ctx.shadowColor = '#ffaa88'; ctx.shadowBlur = 22;
            const r = p.radius;
            if (faceImgLoaded) {
                ctx.save(); ctx.translate(p.x, p.y);
                ctx.rotate(Math.sin(Date.now() * 0.01) * 0.3);
                ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
                ctx.drawImage(faceImg, -r, -r, r * 2, r * 2);
                ctx.restore();
            }
            ctx.shadowBlur = 0;
        }
        // ─── FACE: Head Slam (giant face photo dropping from sky) ───
        else if (draw === 'headSlam') {
            const r = p.radius;
            // Shadow on ground
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.ellipse(p.x, groundY + 3, r * 0.7, 10, 0, 0, Math.PI * 2); ctx.fill();
            // Giant face photo
            if (faceImgLoaded) {
                ctx.globalAlpha = 1; ctx.shadowColor = '#ffaa88'; ctx.shadowBlur = 45;
                ctx.save(); ctx.translate(p.x, p.y);
                ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
                ctx.drawImage(faceImg, -r, -r, r * 2, r * 2);
                ctx.restore();
            }
            ctx.shadowBlur = 0;
            // Speed lines
            ctx.globalAlpha = 0.4; ctx.strokeStyle = '#ffaa88'; ctx.lineWidth = 2;
            for (let s = 0; s < 4; s++) {
                const sx = p.x + (Math.random() - 0.5) * r;
                ctx.beginPath(); ctx.moveTo(sx, p.y - r); ctx.lineTo(sx, p.y - r - 20 - Math.random() * 30); ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        // ─── CORRUPTION: Tainted Shot ───
        else if (draw === 'taintedShot') {
            // Glitchy corrupted trail — squares instead of circles
            for (const t of p.trail) {
                ctx.globalAlpha = t.alpha * 0.5;
                const s = p.radius * (0.3 + t.alpha * 0.4);
                ctx.fillStyle = Math.random() > 0.5 ? '#ff0055' : '#00ffcc';
                ctx.fillRect(t.x - s / 2 + (Math.random() - 0.5) * 4, t.y - s / 2 + (Math.random() - 0.5) * 4, s, s);
            }
            ctx.globalAlpha = 1; ctx.shadowColor = '#ff0055'; ctx.shadowBlur = 38;
            // Core — flickering between positions
            const gx = p.x + Math.sin(Date.now() * 0.08) * 3;
            const gy = p.y + Math.cos(Date.now() * 0.06) * 3;
            const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, p.radius * 1.3);
            g.addColorStop(0, '#fff'); g.addColorStop(0.2, '#ff3377'); g.addColorStop(0.5, '#ff0055');
            g.addColorStop(0.8, 'rgba(255,0,85,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, p.radius * 1.3, 0, Math.PI * 2); ctx.fill();
            // RGB split ghost
            ctx.globalAlpha = 0.3; ctx.fillStyle = '#00ffcc';
            ctx.beginPath(); ctx.arc(gx + 4, gy - 2, p.radius * 0.7, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1; ctx.shadowBlur = 0;
            // Corrupted pixel particles
            if (Math.random() < 0.8) {
                particles.push({ x: p.x + (Math.random() - 0.5) * 12, y: p.y + (Math.random() - 0.5) * 12,
                    vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
                    life: 6 + Math.random() * 5, maxLife: 11, color: Math.random() > 0.5 ? '#ff0055' : '#00ffcc' });
            }
        }
        // ─── CORRUPTION: Glitch Fragment ───
        else if (draw === 'glitchFragment') {
            ctx.globalAlpha = 0.85;
            const gx = p.x + Math.sin(Date.now() * 0.1 + (p.glitchOffset || 0)) * 5;
            const gy = p.y + Math.cos(Date.now() * 0.08 + (p.glitchOffset || 0)) * 5;
            // Flickering square shape
            ctx.shadowColor = '#ff0055'; ctx.shadowBlur = 18;
            ctx.fillStyle = '#ff0055';
            const s = p.radius * 1.5;
            ctx.save(); ctx.translate(gx, gy); ctx.rotate(Date.now() * 0.015 + (p.glitchOffset || 0));
            ctx.fillRect(-s / 2, -s / 2, s, s);
            // Inner cyan ghost
            ctx.globalAlpha = 0.4; ctx.fillStyle = '#00ffcc';
            ctx.fillRect(-s / 2 + 2, -s / 2 - 2, s, s);
            ctx.restore(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        }

        // ─── WASHING MACHINE: Soap Blast ───
        else if (draw === 'soapBlast') {
            for (const t of p.trail) { ctx.globalAlpha = t.alpha * 0.3; ctx.fillStyle = '#b0e0e6';
                ctx.beginPath(); ctx.arc(t.x, t.y, p.radius * 0.4, 0, Math.PI * 2); ctx.fill(); }
            ctx.globalAlpha = 1; ctx.shadowColor = '#87ceeb'; ctx.shadowBlur = 22;
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#e8f4f8'); g.addColorStop(0.6, '#87ceeb'); g.addColorStop(1, 'rgba(135,206,235,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
            // Soap bubble sheen
            ctx.globalAlpha = 0.3; ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(p.x - 4, p.y - 4, p.radius * 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1; ctx.shadowBlur = 0;
            // Dripping soap
            if (Math.random() < 0.5) { particles.push({ x: p.x, y: p.y + p.radius * 0.5,
                vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 2,
                life: 8 + Math.random() * 4, maxLife: 12, color: '#e8f4f8' }); }
        }
        // ─── WASHING MACHINE: Bubble Barrage ───
        else if (draw === 'bubbleBarrage') {
            ctx.globalAlpha = 0.7; ctx.shadowColor = '#87ceeb'; ctx.shadowBlur = 12;
            // Rainbow-tinted bubble
            const hue = (p.x * 0.5 + Date.now() * 0.05) % 360;
            ctx.strokeStyle = `hsla(${hue}, 60%, 70%, 0.6)`; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
            // Shine
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath(); ctx.arc(p.x - p.radius * 0.25, p.y - p.radius * 0.25, p.radius * 0.25, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        }

        // ─── ICE projectiles ───
        else if (draw === 'icicleThrow') {
            ctx.globalAlpha = 0.9; ctx.shadowColor = '#88cfff'; ctx.shadowBlur = 12;
            ctx.fillStyle = '#aed6f1'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(p.x + p.vx * 2, p.y); ctx.lineTo(p.x - 6, p.y - 8); ctx.lineTo(p.x - 6, p.y + 8); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.shadowBlur = 0;
        }
        else if (draw === 'iceWall') {
            ctx.globalAlpha = 0.85; ctx.shadowColor = '#88cfff'; ctx.shadowBlur = 15;
            ctx.fillStyle = '#85c1e9'; ctx.fillRect(p.x - 20, p.y - 40, 40, 80);
            ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(p.x - 12, p.y - 35, 10, 70);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(p.x - 20, p.y - 40, 40, 80);
            ctx.shadowBlur = 0;
        }
        // ─── GRAVITY projectiles ───
        else if (draw === 'gravityPull') {
            ctx.globalAlpha = 0.8; ctx.shadowColor = '#9b59b6'; ctx.shadowBlur = 15;
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            g.addColorStop(0, '#000'); g.addColorStop(0.5, '#9b59b6'); g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#bb88dd'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 0.6, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
        }
        // ─── TIME projectiles ───
        else if (draw === 'timeJab') {
            ctx.globalAlpha = 0.9; ctx.shadowColor = '#f0e68c'; ctx.shadowBlur = 10;
            ctx.strokeStyle = '#f0e68c'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 0.7, 0, Math.PI * 2); ctx.stroke();
            // Clock hands
            const a1 = Date.now() * 0.01; const a2 = Date.now() * 0.003;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(a1) * 8, p.y + Math.sin(a1) * 8); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(a2) * 6, p.y + Math.sin(a2) * 6); ctx.stroke();
            ctx.shadowBlur = 0;
        }
        else if (draw === 'rewindStrike') {
            ctx.globalAlpha = 0.85; ctx.shadowColor = '#f0e68c'; ctx.shadowBlur = 15;
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            g.addColorStop(0, '#fff'); g.addColorStop(0.4, '#f0e68c'); g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        }
        // ─── VAMPIRE projectiles ───
        else if (draw === 'bloodDart') {
            ctx.globalAlpha = 0.9; ctx.shadowColor = '#8b0000'; ctx.shadowBlur = 10;
            ctx.fillStyle = '#8b0000';
            ctx.beginPath(); ctx.moveTo(p.x + p.vx * 2, p.y); ctx.lineTo(p.x - 6, p.y - 6); ctx.lineTo(p.x - 3, p.y); ctx.lineTo(p.x - 6, p.y + 6); ctx.closePath(); ctx.fill();
            ctx.shadowBlur = 0;
        }
        // ─── DRAGON projectiles ───
        else if (draw === 'flameClaw') {
            ctx.globalAlpha = 0.85; ctx.shadowColor = '#ff4500'; ctx.shadowBlur = 18;
            for (let c = 0; c < 3; c++) {
                const cy = p.y + (c - 1) * 10;
                ctx.strokeStyle = c === 1 ? '#fff' : '#ff4500'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(p.x - 12, cy + 6); ctx.quadraticCurveTo(p.x, cy - 4, p.x + 15, cy); ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }
        // ─── NECRO projectiles ───
        else if (draw === 'boneThrow') {
            ctx.globalAlpha = 0.9; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Date.now() * 0.01);
            ctx.fillStyle = '#e8e8d0'; ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1;
            ctx.fillRect(-12, -3, 24, 6); ctx.strokeRect(-12, -3, 24, 6);
            ctx.beginPath(); ctx.arc(-12, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(12, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.restore();
        }
        else if (draw === 'skeletonSummon') {
            ctx.globalAlpha = 0.8; ctx.shadowColor = '#556b2f'; ctx.shadowBlur = 10;
            ctx.strokeStyle = '#e8e8d0'; ctx.lineWidth = 2; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.arc(p.x, p.y - 15, 8, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(p.x, p.y - 7); ctx.lineTo(p.x, p.y + 10); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(p.x - 10, p.y); ctx.lineTo(p.x + 10, p.y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(p.x, p.y + 10); ctx.lineTo(p.x - 7, p.y + 22); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(p.x, p.y + 10); ctx.lineTo(p.x + 7, p.y + 22); ctx.stroke();
            ctx.fillStyle = '#556b2f'; ctx.beginPath(); ctx.arc(p.x - 3, p.y - 16, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(p.x + 3, p.y - 16, 2, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        }
        // ─── MAGNET projectiles ───
        else if (draw === 'metalShard') {
            ctx.globalAlpha = 0.9; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Date.now() * 0.015);
            ctx.fillStyle = '#c0c0c0'; ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(6, 0); ctx.lineTo(0, 10); ctx.lineTo(-6, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(6, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
            ctx.restore();
        }
        // ─── MECH projectiles ───
        else if (draw === 'rocketPunch') {
            ctx.globalAlpha = 0.9; ctx.shadowColor = '#708090'; ctx.shadowBlur = 10;
            ctx.fillStyle = '#708090'; ctx.fillRect(p.x - 15, p.y - 10, 30, 20);
            ctx.fillStyle = '#555'; ctx.fillRect(p.x + (p.vx > 0 ? 10 : -25), p.y - 6, 15, 12);
            ctx.fillStyle = '#ff4400';
            for (let f = 0; f < 3; f++) {
                const fx = p.x - (p.vx > 0 ? 15 : -15) + (Math.random()-0.5)*6;
                ctx.beginPath(); ctx.arc(fx, p.y + (Math.random()-0.5)*8, 4 + Math.random()*4, 0, Math.PI * 2); ctx.fill();
            }
            ctx.shadowBlur = 0;
        }
        else if (draw === 'missile') {
            ctx.globalAlpha = 0.9; ctx.fillStyle = '#556'; ctx.fillRect(p.x - 8, p.y - 4, 16, 8);
            ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.moveTo(p.x + (p.vx > 0 ? 8 : -8), p.y); ctx.lineTo(p.x + (p.vx > 0 ? 14 : -14), p.y - 3); ctx.lineTo(p.x + (p.vx > 0 ? 14 : -14), p.y + 3); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ff6600'; ctx.beginPath(); ctx.arc(p.x - (p.vx > 0 ? 8 : -8), p.y, 3 + Math.random()*2, 0, Math.PI * 2); ctx.fill();
        }
        // ─── PIZZA projectiles ───
        else if (draw === 'sliceThrow') {
            ctx.globalAlpha = 0.9; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Date.now() * 0.01);
            ctx.fillStyle = '#f4a460'; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(-10, 10); ctx.lineTo(10, 10); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(-7, 8); ctx.lineTo(7, 8); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ffe4b5'; for (let d = 0; d < 3; d++) { ctx.beginPath(); ctx.arc(-3 + d*3, d*3 - 2, 2, 0, Math.PI * 2); ctx.fill(); }
            ctx.restore();
        }
        else if (draw === 'fullPie') {
            ctx.globalAlpha = 0.9; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Date.now() * 0.005);
            ctx.shadowColor = '#ff6347'; ctx.shadowBlur = 20;
            ctx.fillStyle = '#f4a460'; ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffe4b5'; for (let d = 0; d < 8; d++) { const da = (d/8)*Math.PI*2; ctx.beginPath(); ctx.arc(Math.cos(da)*18, Math.sin(da)*18, 4, 0, Math.PI * 2); ctx.fill(); }
            ctx.strokeStyle = '#f4a460'; ctx.lineWidth = 2; for (let s = 0; s < 8; s++) { const sa = (s/8)*Math.PI*2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(sa)*35, Math.sin(sa)*35); ctx.stroke(); }
            ctx.restore(); ctx.shadowBlur = 0;
        }
        // ─── CAT projectiles ───
        else if (draw === 'hairball') {
            ctx.globalAlpha = 0.9; ctx.fillStyle = '#8b7355';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 0.7, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#6b5335'; ctx.lineWidth = 1;
            for (let h = 0; h < 5; h++) { const ha = Math.random()*Math.PI*2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(ha)*p.radius, p.y + Math.sin(ha)*p.radius); ctx.stroke(); }
        }
        else if (draw === 'laserPointer') {
            ctx.globalAlpha = 0.9; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 20;
            ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        }
        // ─── BANANA projectiles ───
        else if (draw === 'peelToss') {
            ctx.globalAlpha = 0.9; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Date.now() * 0.015);
            ctx.fillStyle = '#ffe135'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#ccb100'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 0, 10, 5, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
        else if (draw === 'bananaBoomerang') {
            ctx.globalAlpha = 0.9; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Date.now() * 0.02);
            ctx.fillStyle = '#ffe135'; ctx.strokeStyle = '#ccb100'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, 15, -0.5, Math.PI + 0.5); ctx.lineWidth = 8; ctx.stroke();
            ctx.restore();
        }
        // ─── GRANDMA projectiles ───
        else if (draw === 'slipperThrow') {
            ctx.globalAlpha = 0.9; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Date.now() * 0.015);
            ctx.fillStyle = '#8b4513'; ctx.fillRect(-12, -5, 24, 10);
            ctx.fillStyle = '#a0522d'; ctx.fillRect(-10, -7, 8, 4);
            ctx.restore();
        }
        else if (draw === 'cookieBarrage') {
            ctx.globalAlpha = 0.9; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Date.now() * 0.008);
            ctx.fillStyle = '#d2a06d'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#4a2c0a'; for (let c = 0; c < 3; c++) { ctx.beginPath(); ctx.arc(Math.cos(c*2.1)*4, Math.sin(c*2.1)*4, 2, 0, Math.PI * 2); ctx.fill(); }
            ctx.restore();
        }
        // ─── PAINTER projectiles ───
        else if (draw === 'paintSplash') {
            const hue = (p.x * 0.5 + Date.now() * 0.05) % 360;
            ctx.globalAlpha = 0.85; ctx.shadowColor = `hsl(${hue}, 80%, 60%)`; ctx.shadowBlur = 12;
            ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 0.8, 0, Math.PI * 2); ctx.fill();
            for (let s = 0; s < 4; s++) { const sa = Math.random()*Math.PI*2; ctx.beginPath(); ctx.arc(p.x + Math.cos(sa)*p.radius*0.5, p.y + Math.sin(sa)*p.radius*0.5, 4, 0, Math.PI * 2); ctx.fill(); }
            ctx.shadowBlur = 0;
        }
        else if (draw === 'canvasSlam') {
            ctx.globalAlpha = 0.9; ctx.fillStyle = '#fff'; ctx.fillRect(p.x - 30, p.y - 25, 60, 50);
            ctx.strokeStyle = '#8b4513'; ctx.lineWidth = 3; ctx.strokeRect(p.x - 30, p.y - 25, 60, 50);
            const colors = ['#e74c3c', '#3498db', '#f39c12', '#2ecc71'];
            for (let s = 0; s < 6; s++) { ctx.fillStyle = colors[s % colors.length]; ctx.beginPath(); ctx.arc(p.x + (Math.random()-0.5)*40, p.y + (Math.random()-0.5)*30, 5 + Math.random()*5, 0, Math.PI * 2); ctx.fill(); }
        }
        // ─── BEE projectiles ───
        else if (draw === 'stingShot') {
            ctx.globalAlpha = 0.9; ctx.fillStyle = '#333';
            ctx.beginPath(); ctx.moveTo(p.x + p.vx * 1.5, p.y); ctx.lineTo(p.x - 5, p.y - 4); ctx.lineTo(p.x - 5, p.y + 4); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ffc107'; ctx.beginPath(); ctx.arc(p.x - 5, p.y, 4, 0, Math.PI * 2); ctx.fill();
        }
        else if (draw === 'honeyTrap') {
            ctx.globalAlpha = 0.7; ctx.shadowColor = '#ffc107'; ctx.shadowBlur = 10;
            ctx.fillStyle = 'rgba(255,193,7,0.5)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,215,0,0.3)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        }
        // ─── TEACHER projectiles ───
        else if (draw === 'chalkThrow') {
            ctx.globalAlpha = 0.9; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Date.now() * 0.012);
            ctx.fillStyle = '#fff'; ctx.fillRect(-8, -3, 16, 6);
            ctx.restore();
        }
        else if (draw === 'homeworkAvalanche') {
            ctx.globalAlpha = 0.9; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(Date.now() * 0.005 + p.x) * 0.5);
            ctx.fillStyle = '#fff'; ctx.fillRect(-10, -13, 20, 26);
            ctx.strokeStyle = '#aaa'; ctx.lineWidth = 0.5;
            for (let l = 0; l < 5; l++) { ctx.beginPath(); ctx.moveTo(-7, -9 + l * 5); ctx.lineTo(7, -9 + l * 5); ctx.stroke(); }
            ctx.restore();
        }
        // ─── PLUMBER projectiles ───
        else if (draw === 'plungerToss') {
            ctx.globalAlpha = 0.9; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Date.now() * 0.01);
            ctx.fillStyle = '#8b4513'; ctx.fillRect(-2, -14, 4, 20);
            ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(0, 6, 8, 0, Math.PI); ctx.fill();
            ctx.restore();
        }

        // ─── TORNADO DEBRIS (spinning stickmen/cows) ───
        else if (p.isTornadoDebris) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.globalAlpha = 0.9;
            if (p.debrisType === 'stickman') {
                ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.arc(0, -12, 5, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, 5); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(-8, 3); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(8, 3); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(-6, 14); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(6, 14); ctx.stroke();
            } else {
                ctx.scale(0.9, 0.9);
                ctx.fillStyle = '#f5f5f5';
                ctx.fillRect(-14, -7, 28, 14);
                ctx.fillStyle = '#333';
                ctx.beginPath(); ctx.arc(-5, -2, 4, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(7, 3, 3, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#f5f5f5';
                ctx.beginPath(); ctx.arc(16, -5, 6, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#000';
                ctx.beginPath(); ctx.arc(18, -6, 1.5, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#a08060'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(14, -10); ctx.lineTo(12, -15); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(18, -10); ctx.lineTo(20, -15); ctx.stroke();
                ctx.strokeStyle = '#ccc'; ctx.lineWidth = 2;
                for (const lx of [-9, -3, 5, 11]) { ctx.beginPath(); ctx.moveTo(lx, 7); ctx.lineTo(lx, 16); ctx.stroke(); }
            }
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
        ctx.shadowBlur = 22;
        const size = 4 + a * 10;
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
    particles.length = 0;
    damageNumbers.length = 0;
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
    if (keys['q']) { player1.activateDomain(); keys['q'] = false; }
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
        if (keys['4'])  { player2.activateDomain(); keys['4'] = false; }
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
    // AI activates domain when available
    if (player2.domainAvailable && !player2.domainActive) {
        player2.activateDomain();
    }
}

// ── Drawing ──
let hellFade = 0; // 0 = normal, 1 = full hell

function drawBackground() {
    // Check for active domain
    const domainPlayer = [player1, player2].find(p => p.domainActive);
    if (domainPlayer) {
        drawDomainBackground(domainPlayer.style);
        return;
    }

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

function drawDomainBackground(style) {
    const t = Date.now() * 0.001;
    ctx.globalAlpha = 1;
    switch (style) {
        case 'lightning': {
            // Dark sky with constant lightning bolts
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            g.addColorStop(0, '#0a0a1a'); g.addColorStop(0.5, '#1a0a2e'); g.addColorStop(1, '#0a0a0f');
            ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Lightning bolts
            ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 2; ctx.shadowColor = '#ffff00'; ctx.shadowBlur = 20;
            for (let i = 0; i < 5; i++) {
                const seed = Math.floor(t * 3 + i * 17) % 100;
                if (seed < 30) {
                    let bx = ((i * 197 + Math.floor(t * 2)) % canvas.width);
                    let by = 0;
                    ctx.globalAlpha = 0.6 + Math.random() * 0.4;
                    ctx.beginPath(); ctx.moveTo(bx, by);
                    for (let s = 0; s < 8; s++) {
                        bx += (Math.random() - 0.5) * 60;
                        by += canvas.height / 8;
                        ctx.lineTo(bx, by);
                    }
                    ctx.stroke();
                }
            }
            ctx.shadowBlur = 0; ctx.globalAlpha = 1;
            // Ground
            ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = '#ffff44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        case 'fire': {
            // Volcanic/hell landscape with lava
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            g.addColorStop(0, '#2a0a00'); g.addColorStop(0.4, '#4a1500'); g.addColorStop(1, '#1a0500');
            ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Lava cracks on ground
            ctx.fillStyle = '#ff4400';
            for (let i = 0; i < 8; i++) {
                const lx = (i * 127 + Math.sin(t + i) * 20) % canvas.width;
                ctx.globalAlpha = 0.4 + Math.sin(t * 2 + i) * 0.3;
                ctx.fillRect(lx, groundY - 2, 40 + Math.sin(t + i * 3) * 20, 8);
            }
            ctx.globalAlpha = 1;
            // Ember particles in bg
            ctx.fillStyle = '#ff6600';
            for (let i = 0; i < 20; i++) {
                const ex = (i * 71 + t * 30) % canvas.width;
                const ey = groundY - ((i * 53 + t * 40) % (groundY * 0.8));
                ctx.globalAlpha = 0.3 + Math.sin(t * 3 + i) * 0.2;
                ctx.fillRect(ex, ey, 3, 3);
            }
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#2a0800'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = '#ff4400'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        case 'water': {
            // Underwater scene with bubbles
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            g.addColorStop(0, '#001a33'); g.addColorStop(0.5, '#003366'); g.addColorStop(1, '#001122');
            ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Light rays from above
            ctx.globalAlpha = 0.08;
            for (let i = 0; i < 5; i++) {
                const rx = canvas.width * (i + 0.5) / 5 + Math.sin(t + i) * 30;
                ctx.fillStyle = '#66ccff';
                ctx.beginPath(); ctx.moveTo(rx - 20, 0); ctx.lineTo(rx + 20, 0);
                ctx.lineTo(rx + 60 + Math.sin(t) * 20, canvas.height); ctx.lineTo(rx - 60 + Math.sin(t) * 20, canvas.height);
                ctx.fill();
            }
            // Bubbles
            ctx.globalAlpha = 0.4; ctx.strokeStyle = '#88ccff'; ctx.lineWidth = 1;
            for (let i = 0; i < 15; i++) {
                const bx = (i * 83 + Math.sin(t * 0.5 + i) * 30) % canvas.width;
                const by = (groundY - (t * 30 + i * 67) % groundY);
                const br = 3 + (i % 4) * 2;
                ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#002244'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = '#3399cc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        case 'wind': {
            // Stormy sky with swirling clouds
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            g.addColorStop(0, '#2a2a3a'); g.addColorStop(0.5, '#3a3a4a'); g.addColorStop(1, '#1a1a2a');
            ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Swirling wind lines
            ctx.strokeStyle = '#aaccaa'; ctx.lineWidth = 1;
            for (let i = 0; i < 12; i++) {
                ctx.globalAlpha = 0.2 + Math.sin(t + i * 0.5) * 0.1;
                const wy = (i * 50 + Math.sin(t * 2 + i) * 30) % (groundY - 20);
                ctx.beginPath();
                ctx.moveTo(-20, wy);
                for (let s = 0; s < 6; s++) {
                    ctx.lineTo(canvas.width * s / 5, wy + Math.sin(t * 3 + s + i) * 20);
                }
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#2a2a2a'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = '#88aa88'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        case 'earth': {
            // Canyon/cave with stalactites
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            g.addColorStop(0, '#2a1a0a'); g.addColorStop(0.5, '#3a2a1a'); g.addColorStop(1, '#1a0f05');
            ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Stalactites from top
            ctx.fillStyle = '#4a3a2a';
            for (let i = 0; i < 10; i++) {
                const sx = (i + 0.5) * canvas.width / 10;
                const sh = 30 + Math.sin(i * 1.5) * 20;
                ctx.beginPath(); ctx.moveTo(sx - 10, 0); ctx.lineTo(sx + 10, 0); ctx.lineTo(sx, sh); ctx.fill();
            }
            // Rock texture on ground
            ctx.fillStyle = '#3a2a1a'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.fillStyle = '#4a3a2a';
            for (let i = 0; i < 8; i++) {
                ctx.fillRect((i * 137) % canvas.width, groundY + 2, 50, 10);
            }
            ctx.strokeStyle = '#8b7355'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        case 'ice': {
            // Frozen tundra with aurora borealis
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            g.addColorStop(0, '#0a1a2a'); g.addColorStop(0.3, '#102030'); g.addColorStop(1, '#0a0f1a');
            ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Aurora borealis
            for (let i = 0; i < 3; i++) {
                ctx.globalAlpha = 0.15 + Math.sin(t * 0.5 + i) * 0.08;
                const ay = 40 + i * 30 + Math.sin(t * 0.3 + i * 2) * 20;
                const aGrd = ctx.createLinearGradient(0, ay - 20, 0, ay + 20);
                aGrd.addColorStop(0, 'rgba(0,255,128,0)');
                aGrd.addColorStop(0.5, i % 2 === 0 ? '#00ff88' : '#00aaff');
                aGrd.addColorStop(1, 'rgba(0,255,128,0)');
                ctx.fillStyle = aGrd;
                ctx.beginPath();
                ctx.moveTo(0, ay);
                for (let s = 0; s <= 10; s++) {
                    ctx.lineTo(canvas.width * s / 10, ay + Math.sin(t + s * 0.7 + i) * 15);
                }
                ctx.lineTo(canvas.width, ay + 40); ctx.lineTo(0, ay + 40);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            // Icy ground
            ctx.fillStyle = '#1a2a3a'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = '#88ddff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        case 'dragon': {
            // Volcanic sky with dragon silhouettes
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            g.addColorStop(0, '#1a0500'); g.addColorStop(0.4, '#3a1000'); g.addColorStop(1, '#0a0200');
            ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Flying dragon silhouette
            ctx.fillStyle = '#000'; ctx.globalAlpha = 0.4;
            const dx = (t * 50) % (canvas.width + 200) - 100;
            const dy = 60 + Math.sin(t * 2) * 20;
            ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx + 30, dy - 15);
            ctx.lineTo(dx + 50, dy - 5); ctx.lineTo(dx + 70, dy - 20);
            ctx.lineTo(dx + 60, dy); ctx.lineTo(dx + 80, dy + 5);
            ctx.lineTo(dx + 40, dy + 5); ctx.lineTo(dx + 20, dy + 10);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#1a0800'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = '#ff4400'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        case 'vampire': {
            // Dark castle with blood moon
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            g.addColorStop(0, '#0a0008'); g.addColorStop(0.5, '#1a0010'); g.addColorStop(1, '#0a0005');
            ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Blood moon
            ctx.fillStyle = '#cc0000'; ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.arc(canvas.width * 0.8, 60, 35, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 0.3; ctx.fillStyle = '#ff0000';
            ctx.beginPath(); ctx.arc(canvas.width * 0.8, 60, 45, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
            // Castle silhouette
            ctx.fillStyle = '#0a0008';
            ctx.fillRect(canvas.width * 0.1, groundY - 80, 30, 80);
            ctx.fillRect(canvas.width * 0.1 - 5, groundY - 90, 40, 15);
            ctx.fillRect(canvas.width * 0.85, groundY - 100, 35, 100);
            ctx.fillRect(canvas.width * 0.85 - 5, groundY - 110, 45, 15);
            ctx.fillStyle = '#0a0005'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = '#880044'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        case 'dark': {
            // Void/abyss with floating dark orbs
            ctx.fillStyle = '#050508'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Dark floating orbs
            for (let i = 0; i < 8; i++) {
                const ox = (i * 131 + Math.sin(t * 0.5 + i) * 40) % canvas.width;
                const oy = (i * 89 + Math.cos(t * 0.3 + i) * 30) % (groundY - 20);
                const or = 10 + (i % 3) * 5;
                const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, or);
                og.addColorStop(0, 'rgba(80,0,120,0.4)'); og.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = og; ctx.beginPath(); ctx.arc(ox, oy, or, 0, Math.PI * 2); ctx.fill();
            }
            ctx.fillStyle = '#080810'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = '#440066'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        case 'light': {
            // Heavenly clouds with golden rays
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            g.addColorStop(0, '#fffbe0'); g.addColorStop(0.3, '#fff5c0'); g.addColorStop(1, '#e0d8a0');
            ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Golden rays
            ctx.globalAlpha = 0.1;
            for (let i = 0; i < 8; i++) {
                const ra = (i / 8) * Math.PI + Math.sin(t * 0.2) * 0.1;
                ctx.fillStyle = '#ffd700';
                ctx.beginPath(); ctx.moveTo(canvas.width * 0.5, 0);
                ctx.lineTo(canvas.width * 0.5 + Math.cos(ra) * canvas.width, canvas.height);
                ctx.lineTo(canvas.width * 0.5 + Math.cos(ra + 0.15) * canvas.width, canvas.height);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            // Clouds
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            for (let i = 0; i < 5; i++) {
                const cx = (i * 200 + t * 10) % (canvas.width + 100) - 50;
                const cy = 30 + i * 25;
                ctx.beginPath(); ctx.arc(cx, cy, 25, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(cx + 20, cy - 5, 20, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(cx + 35, cy + 3, 18, 0, Math.PI * 2); ctx.fill();
            }
            ctx.fillStyle = '#e8e0b0'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        case 'shadow': {
            // Noir black and white scene
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            g.addColorStop(0, '#1a1a1a'); g.addColorStop(0.5, '#2a2a2a'); g.addColorStop(1, '#0a0a0a');
            ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Noir shadow streaks
            ctx.globalAlpha = 0.15;
            for (let i = 0; i < 6; i++) {
                ctx.fillStyle = '#000';
                const sx = (i * canvas.width / 6) + Math.sin(t + i) * 10;
                ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx + 40, 0);
                ctx.lineTo(sx + 80, canvas.height); ctx.lineTo(sx + 40, canvas.height); ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#111'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        case 'necro': {
            // Graveyard with green fog
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            g.addColorStop(0, '#0a0f0a'); g.addColorStop(0.5, '#0a1a0a'); g.addColorStop(1, '#050a05');
            ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Green fog
            for (let i = 0; i < 6; i++) {
                ctx.globalAlpha = 0.1 + Math.sin(t * 0.5 + i) * 0.05;
                const fg = ctx.createRadialGradient(
                    (i * 170 + Math.sin(t * 0.3 + i) * 40) % canvas.width, groundY - 30,
                    0, (i * 170 + Math.sin(t * 0.3 + i) * 40) % canvas.width, groundY - 30, 80);
                fg.addColorStop(0, '#00ff44'); fg.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = fg; ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.globalAlpha = 1;
            // Gravestones
            ctx.fillStyle = '#333';
            for (let i = 0; i < 4; i++) {
                const gx = canvas.width * (i + 0.5) / 4;
                ctx.fillRect(gx - 8, groundY - 25, 16, 25);
                ctx.beginPath(); ctx.arc(gx, groundY - 25, 8, Math.PI, 0); ctx.fill();
            }
            ctx.fillStyle = '#0a0f0a'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = '#00aa22'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        case 'gravity': {
            // Space with stars and black hole
            ctx.fillStyle = '#020208'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Stars
            ctx.fillStyle = '#fff';
            for (let i = 0; i < 50; i++) {
                const sx = (i * 97 + Math.floor(t * 0.5) * (i % 3)) % canvas.width;
                const sy = (i * 53) % groundY;
                ctx.globalAlpha = 0.3 + Math.sin(t * 2 + i) * 0.3;
                ctx.fillRect(sx, sy, 1.5, 1.5);
            }
            // Black hole
            ctx.globalAlpha = 1;
            const bhx = canvas.width * 0.5; const bhy = groundY * 0.3;
            for (let r = 50; r > 5; r -= 5) {
                ctx.globalAlpha = 0.1;
                ctx.fillStyle = r > 30 ? '#220044' : '#000';
                ctx.beginPath(); ctx.arc(bhx, bhy, r, 0, Math.PI * 2); ctx.fill();
            }
            // Accretion ring
            ctx.globalAlpha = 0.4; ctx.strokeStyle = '#8844ff'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.ellipse(bhx, bhy, 55, 15, Math.sin(t * 0.3) * 0.2, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#080810'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = '#6633cc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        case 'time': {
            // Clockwork gears background
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            g.addColorStop(0, '#1a1a10'); g.addColorStop(0.5, '#2a2a18'); g.addColorStop(1, '#0a0a08');
            ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Gears
            ctx.strokeStyle = '#aa8833'; ctx.lineWidth = 2;
            const gears = [{x: canvas.width*0.2, y: groundY*0.3, r: 40, s: 1},
                           {x: canvas.width*0.7, y: groundY*0.5, r: 55, s: -0.7},
                           {x: canvas.width*0.5, y: groundY*0.15, r: 30, s: 1.2}];
            for (const gear of gears) {
                ctx.globalAlpha = 0.25;
                ctx.save(); ctx.translate(gear.x, gear.y); ctx.rotate(t * gear.s);
                ctx.beginPath(); ctx.arc(0, 0, gear.r, 0, Math.PI * 2); ctx.stroke();
                const teeth = Math.floor(gear.r / 5);
                for (let tt = 0; tt < teeth; tt++) {
                    const a = (tt / teeth) * Math.PI * 2;
                    ctx.beginPath(); ctx.moveTo(Math.cos(a) * gear.r, Math.sin(a) * gear.r);
                    ctx.lineTo(Math.cos(a) * (gear.r + 8), Math.sin(a) * (gear.r + 8)); ctx.stroke();
                }
                ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.stroke();
                ctx.restore();
            }
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#1a1a10'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = '#aa8833'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        case 'acid': {
            // Toxic wasteland with bubbling pools
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            g.addColorStop(0, '#0a1a00'); g.addColorStop(0.5, '#1a2a00'); g.addColorStop(1, '#0a0f00');
            ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Toxic pools
            for (let i = 0; i < 4; i++) {
                const px = (i + 0.5) * canvas.width / 4;
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#33ff00';
                ctx.beginPath(); ctx.ellipse(px, groundY + 10, 35, 8, 0, 0, Math.PI * 2); ctx.fill();
                // Bubbles
                const bubY = groundY + 5 - Math.abs(Math.sin(t * 2 + i * 1.5)) * 15;
                ctx.globalAlpha = 0.5;
                ctx.beginPath(); ctx.arc(px + Math.sin(t + i) * 10, bubY, 3, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#0a1200'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = '#44ff00'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        case 'portal': {
            // Multiverse rifts in space
            ctx.fillStyle = '#08080f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Stars
            ctx.fillStyle = '#fff';
            for (let i = 0; i < 30; i++) {
                ctx.globalAlpha = 0.2 + Math.sin(t + i) * 0.15;
                ctx.fillRect((i * 97) % canvas.width, (i * 61) % groundY, 1.5, 1.5);
            }
            // Portal rifts
            for (let i = 0; i < 3; i++) {
                const rx = canvas.width * (i + 0.5) / 3 + Math.sin(t + i * 2) * 20;
                const ry = groundY * 0.3 + i * 40;
                ctx.globalAlpha = 0.35;
                ctx.strokeStyle = i === 0 ? '#ff00ff' : i === 1 ? '#00ffff' : '#ffaa00';
                ctx.lineWidth = 3;
                ctx.save(); ctx.translate(rx, ry); ctx.rotate(t * 0.5 + i);
                ctx.beginPath(); ctx.ellipse(0, 0, 25, 12, 0, 0, Math.PI * 2); ctx.stroke();
                ctx.restore();
            }
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#0a0a12'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = '#cc44ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        case 'crystal': {
            // Crystal cave with refracting light
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            g.addColorStop(0, '#1a0a2a'); g.addColorStop(0.5, '#2a1a3a'); g.addColorStop(1, '#0f0518');
            ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Crystals
            const colors = ['#ff44ff', '#44ffff', '#ffff44', '#ff88ff', '#88ffff'];
            for (let i = 0; i < 7; i++) {
                ctx.globalAlpha = 0.3 + Math.sin(t + i * 0.7) * 0.15;
                ctx.fillStyle = colors[i % colors.length];
                const cx = (i + 0.3) * canvas.width / 7;
                const ch = 20 + (i % 3) * 15;
                ctx.beginPath();
                ctx.moveTo(cx - 6, groundY); ctx.lineTo(cx, groundY - ch); ctx.lineTo(cx + 6, groundY);
                ctx.fill();
                // Top crystals
                if (i % 2 === 0) {
                    ctx.beginPath(); ctx.moveTo(cx + 50 - 5, 0); ctx.lineTo(cx + 50, ch * 0.7); ctx.lineTo(cx + 55, 0); ctx.fill();
                }
            }
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#1a0a2a'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = '#cc44ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        case 'mech': {
            // Industrial factory with sparks
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            g.addColorStop(0, '#1a1a1a'); g.addColorStop(0.5, '#2a2a2a'); g.addColorStop(1, '#0f0f0f');
            ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Steel beams
            ctx.fillStyle = '#444'; ctx.globalAlpha = 0.4;
            ctx.fillRect(0, 0, 15, canvas.height); ctx.fillRect(canvas.width - 15, 0, 15, canvas.height);
            ctx.fillRect(0, 0, canvas.width, 10);
            // Cross beams
            for (let i = 0; i < 3; i++) {
                const bx = canvas.width * (i + 0.5) / 3;
                ctx.fillRect(bx - 5, 0, 10, groundY);
            }
            // Sparks
            ctx.fillStyle = '#ffaa00';
            for (let i = 0; i < 6; i++) {
                if (Math.sin(t * 4 + i * 2) > 0.5) {
                    ctx.globalAlpha = 0.6;
                    const sx = (i * 163) % canvas.width;
                    const sy = 10 + (i * 47) % (groundY * 0.3);
                    ctx.fillRect(sx, sy, 2, 2);
                    ctx.fillRect(sx + 3, sy + 4, 1.5, 1.5);
                }
            }
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#222'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = '#666'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        case 'cat': {
            // Moonlit rooftops
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            g.addColorStop(0, '#0a0a1f'); g.addColorStop(0.5, '#151530'); g.addColorStop(1, '#0a0a15');
            ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Moon
            ctx.fillStyle = '#eee'; ctx.globalAlpha = 0.8;
            ctx.beginPath(); ctx.arc(canvas.width * 0.75, 50, 30, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 0.2; ctx.fillStyle = '#ddd';
            ctx.beginPath(); ctx.arc(canvas.width * 0.75, 50, 40, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
            // Rooftop silhouettes
            ctx.fillStyle = '#0a0a15';
            ctx.fillRect(0, groundY - 20, canvas.width * 0.25, 20);
            ctx.fillRect(canvas.width * 0.3, groundY - 35, canvas.width * 0.15, 35);
            ctx.fillRect(canvas.width * 0.55, groundY - 15, canvas.width * 0.2, 15);
            ctx.fillRect(canvas.width * 0.8, groundY - 30, canvas.width * 0.2, 30);
            // Stars
            ctx.fillStyle = '#fff';
            for (let i = 0; i < 20; i++) {
                ctx.globalAlpha = 0.3 + Math.sin(t + i) * 0.2;
                ctx.fillRect((i * 67) % canvas.width, (i * 31) % (groundY - 60), 1.5, 1.5);
            }
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#0f0f1a'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = '#334'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        case 'bee': {
            // Giant honeycomb pattern
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            g.addColorStop(0, '#2a1a00'); g.addColorStop(0.5, '#3a2a00'); g.addColorStop(1, '#1a1000');
            ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Honeycomb
            ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 2; ctx.globalAlpha = 0.25;
            const hexR = 30;
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 12; col++) {
                    const hx = col * hexR * 1.8 + (row % 2) * hexR * 0.9;
                    const hy = row * hexR * 1.6;
                    ctx.beginPath();
                    for (let s = 0; s < 6; s++) {
                        const a = (s / 6) * Math.PI * 2 - Math.PI / 6;
                        const px = hx + Math.cos(a) * hexR;
                        const py = hy + Math.sin(a) * hexR;
                        if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                    }
                    ctx.closePath(); ctx.stroke();
                    // Some cells filled with honey
                    if ((row + col) % 3 === 0) {
                        ctx.fillStyle = 'rgba(255,170,0,0.1)'; ctx.fill();
                    }
                }
            }
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#2a1a00'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        case 'pizza': {
            // Pizza oven interior
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            g.addColorStop(0, '#2a1500'); g.addColorStop(0.3, '#3a2000'); g.addColorStop(1, '#1a0a00');
            ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Oven arch
            ctx.strokeStyle = '#aa5500'; ctx.lineWidth = 6; ctx.globalAlpha = 0.4;
            ctx.beginPath(); ctx.arc(canvas.width / 2, groundY, canvas.width * 0.45, Math.PI, 0); ctx.stroke();
            ctx.strokeStyle = '#883300'; ctx.lineWidth = 12;
            ctx.beginPath(); ctx.arc(canvas.width / 2, groundY, canvas.width * 0.48, Math.PI, 0); ctx.stroke();
            // Fire glow at back
            ctx.globalAlpha = 0.15;
            const fg = ctx.createRadialGradient(canvas.width / 2, groundY * 0.5, 10, canvas.width / 2, groundY * 0.5, 120);
            fg.addColorStop(0, '#ff6600'); fg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = fg; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#2a1500'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = '#cc6600'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        case 'painter': {
            // Art gallery with paint-splattered walls
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            g.addColorStop(0, '#f5f0e0'); g.addColorStop(0.5, '#e8e0d0'); g.addColorStop(1, '#d0c8b0');
            ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Paint splatters
            const splatterColors = ['#ff0044', '#0044ff', '#ffcc00', '#00cc44', '#ff6600', '#8800ff'];
            for (let i = 0; i < 12; i++) {
                ctx.globalAlpha = 0.2 + Math.sin(t * 0.3 + i) * 0.1;
                ctx.fillStyle = splatterColors[i % splatterColors.length];
                const sx = (i * 89) % canvas.width; const sy = (i * 67) % (groundY - 10);
                ctx.beginPath(); ctx.arc(sx, sy, 8 + (i % 5) * 4, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#c8c0a8'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = '#888'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        case 'teacher': {
            // Classroom with chalkboard
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            g.addColorStop(0, '#1a3a1a'); g.addColorStop(0.7, '#2a4a2a'); g.addColorStop(1, '#1a2a1a');
            ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Chalkboard border
            ctx.strokeStyle = '#8b7355'; ctx.lineWidth = 8; ctx.globalAlpha = 0.5;
            ctx.strokeRect(20, 10, canvas.width - 40, groundY - 30);
            // Chalk text/equations
            ctx.globalAlpha = 0.3; ctx.font = '14px serif'; ctx.fillStyle = '#fff';
            ctx.fillText('E = mc^2', 50, 50); ctx.fillText('a^2 + b^2 = c^2', canvas.width * 0.6, 80);
            ctx.fillText('FIGHT!', canvas.width * 0.4, 45);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#8b7355'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = '#aa9060'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        case 'plumber': {
            // Underground pipes
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
            g.addColorStop(0, '#1a1a1a'); g.addColorStop(0.5, '#222'); g.addColorStop(1, '#0f0f0f');
            ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Pipes
            ctx.strokeStyle = '#44aa44'; ctx.lineWidth = 8; ctx.globalAlpha = 0.4;
            // Horizontal pipes
            ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(canvas.width, 30); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, groundY * 0.5); ctx.lineTo(canvas.width * 0.4, groundY * 0.5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(canvas.width * 0.6, groundY * 0.5); ctx.lineTo(canvas.width, groundY * 0.5); ctx.stroke();
            // Vertical pipes
            ctx.beginPath(); ctx.moveTo(canvas.width * 0.4, groundY * 0.5); ctx.lineTo(canvas.width * 0.4, groundY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(canvas.width * 0.6, 30); ctx.lineTo(canvas.width * 0.6, groundY * 0.5); ctx.stroke();
            // Joints
            ctx.fillStyle = '#55bb55';
            ctx.fillRect(canvas.width * 0.4 - 8, groundY * 0.5 - 8, 16, 16);
            ctx.fillRect(canvas.width * 0.6 - 8, groundY * 0.5 - 8, 16, 16);
            // Dripping water
            ctx.fillStyle = '#4488ff'; ctx.globalAlpha = 0.5;
            const dripY = (t * 60) % (groundY - 30);
            ctx.fillRect(canvas.width * 0.4, 30 + dripY, 3, 8);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = '#44aa44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            break;
        }
        default: {
            // Generic dark arena with colored ambient glow
            ctx.fillStyle = '#0a0a0f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            const styleColor = STYLES[style]?.color || '#0af';
            ctx.globalAlpha = 0.15;
            const dg = ctx.createRadialGradient(canvas.width / 2, groundY * 0.4, 10, canvas.width / 2, groundY * 0.4, canvas.width * 0.5);
            dg.addColorStop(0, styleColor); dg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = dg; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#0a0a12'; ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
            ctx.strokeStyle = styleColor; ctx.globalAlpha = 0.5;
            ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width, groundY); ctx.stroke();
            ctx.globalAlpha = 1;
            break;
        }
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
    document.getElementById('round-info').textContent = trainingMode ? 'TRAINING MODE' : `Round ${currentRound}  |  ${p1Wins} - ${p2Wins}`;
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
// ── Combo Meter ──
// ── Damage Numbers ──
function spawnDamageNumber(x, y, damage, color) {
    damageNumbers.push({ x, y, damage, color: color || '#fff', life: 50, vy: -2 });
}

function updateDamageNumbers() {
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        const d = damageNumbers[i];
        d.y += d.vy; d.vy *= 0.97; d.life--;
        if (d.life <= 0) damageNumbers.splice(i, 1);
    }
}

function drawDamageNumbers() {
    for (const d of damageNumbers) {
        const a = d.life / 50;
        ctx.globalAlpha = a;
        ctx.font = `bold ${16 + d.damage}px "Segoe UI",Arial,sans-serif`;
        ctx.textAlign = 'center';
        ctx.shadowColor = d.color; ctx.shadowBlur = 8;
        ctx.fillStyle = d.color;
        ctx.fillText('-' + d.damage, d.x, d.y);
        ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
}

function drawComboMeters() {
    drawComboMeter(player1, 32, 165);
    drawComboMeter(player2, canvas.width - 132, 165);
}

function drawComboMeter(player, x, y) {
    if (player.combo < 2) return; // Only show at 2+ hits
    const scale = Math.min(1 + player.combo * 0.05, 1.5);
    const pulse = Math.sin(Date.now() * 0.01) * 0.1 + 0.9;

    ctx.save();
    ctx.translate(x + 50, y);

    // Combo count
    ctx.font = `bold ${Math.floor(22 * scale)}px "Segoe UI",Arial,sans-serif`;
    ctx.textAlign = 'center';
    ctx.globalAlpha = pulse;

    // Color shifts with combo: white → yellow → orange → red
    let color;
    if (player.combo < 5) color = '#fff';
    else if (player.combo < 8) color = '#f1c40f';
    else if (player.combo < 12) color = '#e67e22';
    else color = '#e74c3c';

    ctx.shadowColor = color; ctx.shadowBlur = 12;
    ctx.fillStyle = color;
    ctx.fillText(player.combo + ' HIT', 0, 0);

    // Combo bonus text
    if (player.comboDamageBonus > 0) {
        ctx.font = '11px "Segoe UI",Arial,sans-serif';
        ctx.fillStyle = '#aaa'; ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.7;
        ctx.fillText('+' + Math.round(player.comboDamageBonus * 100) + '% DMG', 0, 16);
    }

    // Timer bar showing combo decay
    const timerW = 60;
    const timerH = 3;
    const timerRatio = player.comboTimer / 90;
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#333'; ctx.fillRect(-timerW / 2, 20, timerW, timerH);
    ctx.fillStyle = color; ctx.globalAlpha = 0.7;
    ctx.fillRect(-timerW / 2, 20, timerW * timerRatio, timerH);

    ctx.restore();
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
}

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

function drawDomainBars() {
    drawDomainBar(player1, 32, canvas.width * 0.25);
    drawDomainBar(player2, canvas.width - 32 - canvas.width * 0.25, canvas.width * 0.25);
}

function drawDomainBar(player, x, w) {
    if (!player.domainAvailable && !player.domainActive && !player.domainUsed) return;
    const y = 72; const h = 6;
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x, y, w, h);
    if (player.domainActive) {
        const fill = player.domainTimer / (25 * 60);
        const domainColor = STYLES[player.style]?.color || '#0af';
        ctx.fillStyle = domainColor;
        ctx.fillRect(x, y, w * fill, h);
        // "DOMAIN" label
        ctx.font = '9px "Segoe UI",Arial,sans-serif';
        ctx.fillStyle = domainColor; ctx.textAlign = 'center';
        ctx.fillText('DOMAIN', x + w / 2, y - 2);
    } else if (player.domainAvailable) {
        const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
        const domainColor = STYLES[player.style]?.color || '#0af';
        ctx.fillStyle = domainColor; ctx.globalAlpha = pulse;
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;
        ctx.font = '9px "Segoe UI",Arial,sans-serif';
        ctx.fillStyle = domainColor; ctx.textAlign = 'center';
        ctx.fillText('DOMAIN READY [Q/4]', x + w / 2, y - 2);
    }
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
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
    else p1Wins++; // tie-breaker: P1 wins draws to prevent endless games
    if (p1Wins >= ROUNDS_TO_WIN) endGame('Player 1 Wins!');
    else if (p2Wins >= ROUNDS_TO_WIN) endGame('Player 2 Wins!');
    else { currentRound++; resetPositions(); startTimer(); }
}
function endGame(text) {
    gameState = 'result';
    clearInterval(timerInterval);
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
        drawProjectiles(); drawVisualEffects(); drawParticles(); drawCooldowns(); drawRageBars(); drawDomainBars(); drawComboMeters();
        ctx.restore();
        drawScreenFlash();
        updateUI();
        return;
    }

    handleInput();
    if (aiMode || trainingMode) handleAI();
    player1.update(player2); player2.update(player1);
    updateParticles(); updateProjectiles(); updateVisualEffects();
    updateDamageNumbers();
    updateScreenShake();

    // Training mode: opponent auto-regens health slowly
    if (trainingMode) {
        if (player2.health < MAX_HEALTH && player2.health > 0) {
            player2.health = Math.min(MAX_HEALTH, player2.health + 0.15);
        }
        if (player2.health <= 0) {
            player2.health = MAX_HEALTH; // instant full heal on KO
            player2.hitTimer = 0; player2.hit = false;
        }
    }

    // Apply screen shake
    ctx.save();
    ctx.translate(shakeOffsetX, shakeOffsetY);

    drawBackground();
    player1.draw(); player2.draw();
    drawProjectiles(); drawVisualEffects(); drawParticles(); drawCooldowns(); drawRageBars(); drawDomainBars(); drawComboMeters();
    drawDamageNumbers();

    ctx.restore();

    drawScreenFlash();
    updateUI();
    if (!trainingMode) checkRoundEnd();

    // Training mode HUD
    if (trainingMode) {
        ctx.font = '14px "Segoe UI",Arial,sans-serif';
        ctx.textAlign = 'center'; ctx.fillStyle = '#2ecc71'; ctx.globalAlpha = 0.6;
        ctx.fillText('TRAINING MODE — Opponent auto-heals', canvas.width / 2, groundY + 30);
        ctx.globalAlpha = 1;
    }
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
        const style = btn.dataset.style;
        const player = parseInt(btn.dataset.player);
        btn.closest('.select-side').querySelectorAll('.style-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        if (player === 1) p1Style = style; else p2Style = style;
        showAttackPreview(player, style);
        if (p1Style && p2Style) document.getElementById('fight-btn').classList.remove('hidden');
    });
});

function goToSelect(useAI, isTraining) {
    aiMode = useAI;
    trainingMode = isTraining || false;
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('select-screen').classList.remove('hidden');
    setupStyleSelect();
    document.getElementById('p2-select-title').textContent = trainingMode ? 'Training Dummy' : aiMode ? 'AI (Blue)' : 'Player 2 (Blue)';
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
    clearInterval(timerInterval);
    particles.length = 0; projectiles.length = 0; visualEffects.length = 0;
    resetPositions();
    document.getElementById('p1-name').textContent = 'P1 ' + STYLES[p1Style].name;
    document.getElementById('p2-name').textContent = 'P2 ' + STYLES[p2Style].name;
    document.getElementById('select-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('ui-overlay').style.display = 'block';
    damageNumbers.length = 0;
    if (trainingMode) {
        document.getElementById('timer').textContent = '∞';
        document.getElementById('round-info').textContent = 'TRAINING MODE';
    } else {
        startTimer();
    }
}

document.getElementById('start-2p-btn').addEventListener('click', () => goToSelect(false));
document.getElementById('start-ai-btn').addEventListener('click', () => goToSelect(true));
document.getElementById('start-train-btn').addEventListener('click', () => goToSelect(true, true));
document.getElementById('fight-btn').addEventListener('click', startFight);
document.getElementById('rematch-btn').addEventListener('click', startFight);
document.getElementById('reselect-btn').addEventListener('click', () => {
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('select-screen').classList.remove('hidden');
    setupStyleSelect();
});

function goToMainMenu() {
    gameState = 'menu';
    clearInterval(timerInterval);
    document.getElementById('select-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('ui-overlay').style.display = 'none';
    document.getElementById('start-screen').classList.remove('hidden');
}

document.getElementById('back-to-menu-btn').addEventListener('click', goToMainMenu);
document.getElementById('result-back-menu-btn').addEventListener('click', goToMainMenu);

gameState = 'menu';
gameLoop();
