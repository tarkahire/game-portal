// ═══════════════════════════════════════════════════════════════
//  DUNGEON CRAWLER 3D — Main game
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { TILE, WALL_HEIGHT, EYE_HEIGHT, PAL } from './constants.js';
import { generateDungeon, getRoomAt } from './dungeon/generator.js';
import { buildDungeonMesh } from './dungeon/meshBuilder.js';
import { createTorchLights, updateTorchLights, syncTorchVisibility } from './dungeon/torchLights.js';
import { FPSCamera } from './player/fpsCamera.js';
import { createEnemyMesh, billboardEnemy, animateEnemyMesh } from './enemies/meshFactory.js';
import { CLASSES } from './classes/definitions.js';
import { NET, createRoom, joinRoom, hostSelectClass, clientSelectClass, hostStartGame, broadcastGameState, getLastState, cleanupNetwork } from './network/network.js';

// ─── GLOBALS ────────────────────────────────────────────────
let scene, camera, renderer;
let fpsCamera;
let dungeon, dungeonMesh, torchLights;
let playerLight;
let enemies3D = [];
let projectiles3D = [];
let minions3D = [];
let gameState = 'title';
let currentFloor = 1;
let clock;
let selectedClasses = [];
let coopMode = false;
let p2ClassSelect = false;

// Player state
let player = null;
let lives = 5;
let runStats = { enemiesKilled: 0, goldCollected: 0, floorsCleared: 0, bossesKilled: 0, itemsFound: 0 };

// Enemy definitions
const ENEMY_TYPES = {
    skeleton: { name: 'Skeleton', hp: 25, speed: 1.2, damage: 6, attackSpeed: 800, range: 1.5, type: 'melee', xp: 10, radius: 0.4 },
    archerSkeleton: { name: 'Archer', hp: 18, speed: 0.9, damage: 8, attackSpeed: 1200, range: 8, type: 'ranged', xp: 15, radius: 0.4 },
    slime: { name: 'Slime', hp: 35, speed: 0.7, damage: 5, attackSpeed: 1000, range: 1, type: 'melee', xp: 12, radius: 0.5 },
    bat: { name: 'Bat', hp: 12, speed: 2.8, damage: 4, attackSpeed: 600, range: 0.8, type: 'melee', xp: 8, radius: 0.3 },
    darkKnight: { name: 'Dark Knight', hp: 60, speed: 1.0, damage: 12, attackSpeed: 1000, range: 1.2, type: 'melee', xp: 25, radius: 0.5 },
    necromancer: { name: 'Necromancer', hp: 30, speed: 0.8, damage: 10, attackSpeed: 2000, range: 7, type: 'summoner', xp: 30, radius: 0.4 },
};
const BOSSES = [
    { name: 'Bone King', hp: 200, speed: 1.0, damage: 15, attackSpeed: 1200, range: 2, type: 'melee', xp: 100, radius: 0.8, meshType: 'skeleton' },
    { name: 'Slime Mother', hp: 250, speed: 0.5, damage: 10, attackSpeed: 1500, range: 1.5, type: 'melee', xp: 120, radius: 1.0, meshType: 'slime' },
    { name: 'Shadow Wraith', hp: 180, speed: 2.0, damage: 18, attackSpeed: 1000, range: 7, type: 'ranged', xp: 150, radius: 0.7, meshType: 'necromancer' },
    { name: 'Dragon Hatchling', hp: 300, speed: 1.5, damage: 20, attackSpeed: 1400, range: 6, type: 'ranged', xp: 180, radius: 0.9, meshType: 'darkKnight' },
    { name: 'Lich Lord', hp: 400, speed: 1.2, damage: 22, attackSpeed: 1000, range: 8, type: 'ranged', xp: 250, radius: 0.8, meshType: 'necromancer' },
];

// Projectile material
let projGeo, projMatPlayer, projMatEnemy;

// ─── INIT ───────────────────────────────────────────────────
function init() {
    clock = new THREE.Clock();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(PAL.fog);
    scene.fog = new THREE.FogExp2(PAL.fog, 0.008);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);

    renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.getElementById('game-canvas') });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;

    const ambient = new THREE.AmbientLight('#2a2a3e', 1.2);
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight('#1a2a3a', '#0a0a14', 0.8);
    scene.add(hemi);
    playerLight = new THREE.PointLight('#00ffcc', 3.5, TILE * 10, 1.2);
    scene.add(playerLight);

    fpsCamera = new FPSCamera(camera, renderer.domElement);

    // Shared projectile geometry — big and glowing
    projGeo = new THREE.SphereGeometry(0.3, 8, 8);
    projMatPlayer = new THREE.MeshBasicMaterial({ color: '#00ffcc' });
    projMatEnemy = new THREE.MeshBasicMaterial({ color: '#ff4400' });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Build class select grids
    buildClassGrid('class-grid', false);
    buildClassGrid('lobby-class-grid', true);

    // UI bindings
    document.getElementById('btn-solo').onclick = () => startRun(false);
    document.getElementById('btn-coop').onclick = () => { alert('2P Local requires two mice — use Online Co-op to play together across devices!'); showScreen('online-screen'); };
    document.getElementById('btn-online').onclick = () => showScreen('online-screen');
    document.getElementById('btn-back-online').onclick = () => { cleanupNetwork(); showScreen('title-screen'); };

    // Online co-op buttons
    document.getElementById('btn-create-room').onclick = () => {
        const code = createRoom(
            (status) => { document.getElementById('lobby-status').textContent = status; },
            (players) => { updateLobbyUI(players); },
            null
        );
        document.getElementById('room-code-display').textContent = code;
        showScreen('lobby-screen');
        buildClassGrid('lobby-class-grid', true);
        // Re-bind lobby class cards for host
        document.querySelectorAll('#lobby-class-grid .class-card').forEach(card => {
            card.onclick = () => {
                const classId = card.dataset.class;
                hostSelectClass(classId, (players) => updateLobbyUI(players));
                card.classList.add('selected');
            };
        });
    };

    document.getElementById('btn-join-room').onclick = () => {
        const code = document.getElementById('join-code-input').value;
        if (!code || code.length < 4) return;
        joinRoom(code,
            (status) => { document.getElementById('lobby-status').textContent = status; },
            (players) => { updateLobbyUI(players); },
            (data) => {
                // Host started the game — we received classes + dungeon
                selectedClasses = data.classes;
                coopMode = true;
                startGame();
            }
        );
        document.getElementById('room-code-display').textContent = code.toUpperCase();
        showScreen('lobby-screen');
        buildClassGrid('lobby-class-grid', true);
        // Re-bind lobby class cards for client
        document.querySelectorAll('#lobby-class-grid .class-card').forEach(card => {
            card.onclick = () => {
                const classId = card.dataset.class;
                clientSelectClass(classId);
                card.classList.add('selected');
                document.getElementById('lobby-status').textContent = 'Ready!';
            };
        });
    };

    document.getElementById('btn-start-online').onclick = () => {
        if (!NET.isHost) return;
        const classes = NET.lobbyPlayers.map(lp => lp.classId || 'angel');
        selectedClasses = classes;
        coopMode = true;
        startGame();
        // Send dungeon + classes to clients
        hostStartGame({
            map: dungeon.map,
            rooms: dungeon.rooms.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h, type: r.type, explored: r.explored, cx: r.cx, cy: r.cy })),
            torches: dungeon.torches, floor: dungeon.floor
        }, selectedClasses);
    };

    document.getElementById('btn-leave-lobby').onclick = () => { cleanupNetwork(); showScreen('title-screen'); };
    document.getElementById('btn-back-title').onclick = () => showScreen('title-screen');
    document.getElementById('btn-retry').onclick = () => { showScreen('class-screen'); p2ClassSelect = false; selectedClasses = []; };
    document.getElementById('btn-menu').onclick = () => showScreen('title-screen');
    document.getElementById('btn-resume').onclick = resumeGame;
    document.getElementById('btn-quit').onclick = () => { gameState = 'title'; document.getElementById('pause-overlay').style.display = 'none'; document.getElementById('hud').style.display = 'none'; showScreen('title-screen'); document.exitPointerLock(); };

    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Escape') {
            if (gameState === 'playing') { gameState = 'paused'; document.getElementById('pause-overlay').style.display = ''; document.exitPointerLock(); }
            else if (gameState === 'paused') resumeGame();
        }
        if (gameState === 'playing' && fpsCamera.locked) {
            if (e.code === 'KeyE') playerSpecial();
            if (e.code === 'KeyR') playerSecondary();
            if (e.code === 'KeyQ') playerQAbility();
            if (e.code === 'KeyF') playerFAbility();
            if (e.code === 'Space') playerDodge();
        }
    });

    // Mouse attack
    renderer.domElement.addEventListener('mousedown', (e) => {
        if (e.button === 0 && gameState === 'playing' && fpsCamera.locked) playerAttack();
    });

    showScreen('title-screen');
}

// ─── CLASS SELECT GRID (generated from CLASSES) ─────────────
function buildClassGrid(containerId, isLobby) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    grid.innerHTML = '';
    for (const [id, cls] of Object.entries(CLASSES)) {
        const card = document.createElement('div');
        card.className = 'class-card';
        card.dataset.class = id;
        card.innerHTML = `<div class="class-icon" style="background:radial-gradient(circle,${cls.color} 40%,#111 100%)"></div>
            <h3>${cls.name}</h3>
            <p class="class-desc">${cls.attackType} | ${cls.specialName}</p>
            <p class="class-stats-line">HP:${cls.maxHp} ATK:${cls.attackDamage} SPD:${cls.speed.toFixed(1)}</p>`;
        card.onclick = () => {
            if (isLobby) { /* TODO: lobby class select */ return; }
            selectClass(id);
        };
        grid.appendChild(card);
    }
}

// ─── LOBBY UI ───────────────────────────────────────────────
function updateLobbyUI(players) {
    const list = document.getElementById('lobby-players');
    list.innerHTML = '';
    players.forEach((lp, i) => {
        const div = document.createElement('div');
        div.className = 'lobby-player';
        const label = i === 0 ? 'Host' : `Player ${i + 1}`;
        const cls = lp.classId ? (CLASSES[lp.classId]?.name || lp.classId) : 'Choosing...';
        const ready = lp.ready ? ' ✓' : '';
        div.innerHTML = `<span>${label}</span><span>${cls}${ready}</span>`;
        list.appendChild(div);
    });
    // Show start button for host when 2+ players
    const startBtn = document.getElementById('btn-start-online');
    if (startBtn) startBtn.style.display = (NET.isHost && players.length >= 2) ? '' : 'none';
}

// ─── GAME FLOW ──────────────────────────────────────────────
function startRun(coop) {
    coopMode = coop;
    p2ClassSelect = false;
    selectedClasses = [];
    document.getElementById('p2-class-label').style.display = 'none';
    showScreen('class-screen');
}

function selectClass(classId) {
    // Highlight
    document.querySelectorAll('#class-grid .class-card').forEach(c => c.classList.remove('selected'));
    document.querySelector(`#class-grid .class-card[data-class="${classId}"]`)?.classList.add('selected');

    if (!p2ClassSelect) {
        selectedClasses = [classId];
        if (coopMode) {
            p2ClassSelect = true;
            document.getElementById('p2-class-label').style.display = '';
            return;
        }
    } else {
        selectedClasses.push(classId);
    }
    startGame();
}

function startGame() {
    currentFloor = 1;
    lives = 5;
    runStats = { enemiesKilled: 0, goldCollected: 0, floorsCleared: 0, bossesKilled: 0, itemsFound: 0 };

    const cls = CLASSES[selectedClasses[0]];
    player = {
        classId: selectedClasses[0], cls,
        hp: cls.maxHp, maxHp: cls.maxHp,
        speed: cls.speed, damage: cls.attackDamage,
        attackSpeed: cls.attackSpeed, attackRange: cls.attackRange,
        attackType: cls.attackType, defense: 0,
        lastAttack: 0, lastSpecial: 0,
        specialCooldown: cls.specialCooldown,
        level: 1, xp: 0, xpToNext: 50,
        alive: true, dodgeCd: 0, invincible: 0,
    };
    fpsCamera.speed = cls.speed;

    loadFloor(currentFloor);
    gameState = 'playing';
    showScreen(null);
    document.getElementById('hud').style.display = '';
    renderer.domElement.requestPointerLock();

    // Init Katakuri portals if needed
    if (player.classId === 'katakuri') initKataPortals();

    // Create player model for 3rd person view
    if (fpsCamera.playerModel) scene.remove(fpsCamera.playerModel);
    const pm = new THREE.Group();
    const bodyCol = player.cls.color;
    // Body cylinder
    const pmBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 1.2, 6), new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.5 }));
    pmBody.position.y = 1.0;
    pm.add(pmBody);
    // Head sphere
    const pmHead = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), new THREE.MeshStandardMaterial({ color: '#e8d0b0', roughness: 0.5 }));
    pmHead.position.y = 1.85;
    pm.add(pmHead);
    // Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    pm.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), eyeMat).translateX(-0.1).translateY(1.9).translateZ(0.2));
    pm.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), eyeMat).translateX(0.1).translateY(1.9).translateZ(0.2));
    // Legs
    const legMat = new THREE.MeshStandardMaterial({ color: '#1a1a2e' });
    pm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.6, 4), legMat).translateX(-0.12).translateY(0.3));
    pm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.6, 4), legMat).translateX(0.12).translateY(0.3));
    // Class name label
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 128; labelCanvas.height = 32;
    const lctx = labelCanvas.getContext('2d');
    lctx.fillStyle = bodyCol; lctx.font = 'bold 16px monospace'; lctx.textAlign = 'center';
    lctx.fillText(player.cls.name, 64, 20);
    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true }));
    labelSprite.scale.set(1.5, 0.4, 1);
    labelSprite.position.y = 2.3;
    pm.add(labelSprite);
    pm.visible = false; // hidden in 1st person by default
    scene.add(pm);
    fpsCamera.playerModel = pm;
}

function loadFloor(floor) {
    if (dungeonMesh) { scene.remove(dungeonMesh); }
    if (torchLights) { for (const l of torchLights) scene.remove(l); }
    for (const e of enemies3D) { scene.remove(e.mesh); if (e.label) scene.remove(e.label); }
    for (const p of projectiles3D) { scene.remove(p.mesh); }
    // Keep permanent minions (shadows, clones, dogs) across floors
    const keepMinions = minions3D.filter(m => m.data.life === Infinity);
    const removeMinions = minions3D.filter(m => m.data.life !== Infinity);
    for (const m of removeMinions) { scene.remove(m.mesh); }
    minions3D = keepMinions;
    enemies3D = [];
    projectiles3D = [];

    dungeon = generateDungeon(floor);
    dungeon.rooms[0].explored = true;

    dungeonMesh = buildDungeonMesh(dungeon);
    scene.add(dungeonMesh);

    torchLights = createTorchLights(dungeon, scene);
    syncTorchVisibility(torchLights, dungeon);

    const startRoom = dungeon.rooms[0];
    fpsCamera.setPosition(startRoom.cx + 0.5, startRoom.cy + 0.5);

    spawnEnemies(floor);
    updateHUD();
}

function spawnEnemies(floor) {
    const types = Object.keys(ENEMY_TYPES);
    const available = floor < 3 ? types.slice(0, 4) : types;

    for (const room of dungeon.rooms) {
        if (room.type === 'start' || room.type === 'shop') continue;

        if (room.type === 'boss') {
            // Spawn boss
            const bossDef = BOSSES[Math.min(floor - 1, BOSSES.length - 1)];
            const mult = 1 + (floor - 1) * 0.15;
            const boss = {
                ...bossDef,
                hp: Math.round(bossDef.hp * mult), maxHp: Math.round(bossDef.hp * mult),
                damage: Math.round(bossDef.damage * mult),
                x: room.cx + 0.5, z: room.cy + 0.5,
                alive: true, isBoss: true, lastAttack: 0, room,
                enemyType: bossDef.meshType || 'skeleton',
            };
            const mesh = createEnemyMesh(boss.enemyType, true);
            mesh.position.set(boss.x * TILE, 0, boss.z * TILE);
            mesh.visible = false;
            scene.add(mesh);

            // BOSS label sprite
            const label = createBossLabel(bossDef.name);
            label.position.set(boss.x * TILE, 4.5, boss.z * TILE);
            label.visible = false;
            scene.add(label);

            enemies3D.push({ data: boss, mesh, label });
            continue;
        }

        const count = room.type === 'treasure' ? 2 : 3 + Math.floor(Math.random() * (2 + floor));
        for (let i = 0; i < count; i++) {
            const type = available[Math.floor(Math.random() * available.length)];
            const def = ENEMY_TYPES[type];
            const mult = 1 + (floor - 1) * 0.25;
            const ex = room.x + 1 + Math.floor(Math.random() * (room.w - 2)) + 0.5;
            const ez = room.y + 1 + Math.floor(Math.random() * (room.h - 2)) + 0.5;
            const enemy = {
                ...def, enemyType: type,
                hp: Math.round(def.hp * mult), maxHp: Math.round(def.hp * mult),
                damage: Math.round(def.damage * mult),
                x: ex, z: ez, alive: true, isBoss: false, lastAttack: 0, room,
            };
            const mesh = createEnemyMesh(type, false);
            mesh.position.set(ex * TILE, 0, ez * TILE);
            mesh.visible = false;
            scene.add(mesh);
            enemies3D.push({ data: enemy, mesh, label: null });
        }
    }
}

function createBossLabel(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff0055';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BOSS', 128, 28);
    ctx.fillStyle = '#ffcccc';
    ctx.font = '18px monospace';
    ctx.fillText(name, 128, 52);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(3, 0.75, 1);
    return sprite;
}

function nextFloor() {
    currentFloor++;
    runStats.floorsCleared++;
    if (player && !player.alive) {
        player.alive = true;
        player.hp = Math.round(player.maxHp * 0.5);
    } else if (player) {
        player.hp = Math.min(player.hp + 20, player.maxHp);
    }
    loadFloor(currentFloor);
}

function gameOver() {
    gameState = 'gameover';
    document.getElementById('hud').style.display = 'none';
    document.exitPointerLock();
    document.getElementById('gameover-title').textContent = 'YOU DIED';
    document.getElementById('gameover-stats').innerHTML = `
        <div class="stat-line"><span>Floor Reached</span><span>${currentFloor}</span></div>
        <div class="stat-line"><span>Enemies Killed</span><span>${runStats.enemiesKilled}</span></div>
        <div class="stat-line"><span>Bosses Slain</span><span>${runStats.bossesKilled}</span></div>
        <div class="stat-line"><span>Gold Found</span><span>${runStats.goldCollected}</span></div>`;
    showScreen('gameover-screen');
}

function resumeGame() {
    gameState = 'playing';
    document.getElementById('pause-overlay').style.display = 'none';
    renderer.domElement.requestPointerLock();
}

// ─── VISUAL EFFECTS ─────────────────────────────────────────
let meleeSlashes = [];

function spawnMeleeSlash(color) {
    // Create a bright arc in front of the camera
    const slashGeo = new THREE.TorusGeometry(1.2, 0.08, 4, 16, Math.PI * 0.7);
    const slashMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    const slash = new THREE.Mesh(slashGeo, slashMat);

    // Position in front of camera
    const dirX = -Math.sin(fpsCamera.yaw);
    const dirZ = -Math.cos(fpsCamera.yaw);
    slash.position.set(
        fpsCamera.posX * TILE + dirX * 2,
        EYE_HEIGHT - 0.3,
        fpsCamera.posZ * TILE + dirZ * 2
    );
    slash.rotation.set(0, -fpsCamera.yaw + Math.PI / 2, Math.PI / 4);

    // Glow
    const glowLight = new THREE.PointLight(color, 3, TILE * 2, 2);
    slash.add(glowLight);

    scene.add(slash);
    meleeSlashes.push({ mesh: slash, life: 8 });
}

function updateMeleeSlashes() {
    for (let i = meleeSlashes.length - 1; i >= 0; i--) {
        const s = meleeSlashes[i];
        s.life--;
        s.mesh.material.opacity = s.life / 8 * 0.9;
        s.mesh.scale.multiplyScalar(1.06);
        s.mesh.rotation.z += 0.15;
        if (s.life <= 0) {
            scene.remove(s.mesh);
            s.mesh.geometry.dispose();
            s.mesh.material.dispose();
            meleeSlashes.splice(i, 1);
        }
    }
}

// ─── KATAKURI 3D PORTAL SYSTEM ──────────────────────────────
let kataPortals = []; // 3D torus meshes orbiting player
let kataFists = [];   // flying dough fist projectiles
let kataPortIdx = 0;
const KATA_PORT_COUNT = 2; // just left and right like Blox Fruits
const KATA_PORT_RADIUS = 0.6; // right next to the player

function initKataPortals() {
    clearKataPortals();
    const isHaki = player && player._haki;
    const color = isHaki ? '#1565c0' : '#f5f0e0';
    const emissive = isHaki ? '#0d47a1' : '#d4c4a0';

    for (let i = 0; i < 2; i++) {
        // Big white/cream donut portal
        const torus = new THREE.Mesh(
            new THREE.TorusGeometry(0.7, 0.15, 10, 20),
            new THREE.MeshBasicMaterial({ color: '#f5f0e8' })
        );
        // Dark hole center
        const hole = new THREE.Mesh(
            new THREE.CircleGeometry(0.45, 14),
            new THREE.MeshBasicMaterial({ color: '#0a0008', side: THREE.DoubleSide })
        );
        torus.add(hole);
        scene.add(torus);
        kataPortals.push(torus);
    }
}

function clearKataPortals() {
    for (const p of kataPortals) scene.remove(p);
    kataPortals = [];
    for (const f of kataFists) scene.remove(f.mesh);
    kataFists = [];
}

function updateKataPortals(time) {
    if (!player || player.classId !== 'katakuri' || kataPortals.length === 0) return;
    const px = fpsCamera.posX * TILE, pz = fpsCamera.posZ * TILE;
    const yaw = fpsCamera.yaw;
    const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);

    // Two donuts: left and right of player, slightly forward, facing forward
    for (let i = 0; i < kataPortals.length; i++) {
        const side = i === 0 ? -1 : 1; // left then right
        const perpX = -Math.cos(yaw) * side;
        const perpZ = Math.sin(yaw) * side;
        const portalX = px + perpX * KATA_PORT_RADIUS * TILE + fwdX * 0.8;
        const portalZ = pz + perpZ * KATA_PORT_RADIUS * TILE + fwdZ * 0.8;
        const bob = Math.sin(time * 0.003 + i * 1.5) * 0.15;
        kataPortals[i].position.set(portalX, EYE_HEIGHT + 0.3 + bob, portalZ);
        // Face forward (where player is looking)
        kataPortals[i].lookAt(portalX + fwdX * 5, EYE_HEIGHT + 0.3, portalZ + fwdZ * 5);
        // Pulse the next-to-fire donut
        const isActive = i === (player._m1Side || 0);
        kataPortals[i].scale.setScalar(isActive ? 1.15 : 1.0);
    }

    // Update flying fists (pooled — hide on completion, don't remove)
    for (let i = kataFists.length - 1; i >= 0; i--) {
        const f = kataFists[i];
        f.life--;
        if (f.life <= 0) {
            // Impact — damage AoE at target
            const tx = f.mesh.position.x / TILE, tz = f.mesh.position.z / TILE;
            for (const e of enemies3D) {
                if (!e.data.alive) continue;
                if (Math.hypot(e.data.x - tx, e.data.z - tz) < 1.5) dealDamageToEnemy(e, f.damage);
            }
            f.mesh.visible = false; // return to pool
            kataFists.splice(i, 1);
            continue;
        }
        const progress = 1 - (f.life / f.maxLife);
        f.mesh.position.lerpVectors(f.start, f.target, progress);
    }
}

// Pool of reusable fist meshes to avoid creating/destroying
const KATA_FIST_POOL_SIZE = 20;
let kataFistPool = [];
let kataFistPoolInit = false;

function ensureFistPool() {
    if (kataFistPoolInit) return;
    kataFistPoolInit = true;
    const col = '#1a1a3a'; // dark navy like the big fists
    const geo = new THREE.BoxGeometry(0.6, 0.5, 0.45);
    const mat = new THREE.MeshBasicMaterial({ color: col });
    for (let i = 0; i < KATA_FIST_POOL_SIZE; i++) {
        const m = new THREE.Mesh(geo, mat.clone());
        m.visible = false;
        scene.add(m);
        kataFistPool.push(m);
    }
}

function kataFireFist(fromPortalIdx, targetX, targetY, targetZ, damage) {
    if (fromPortalIdx >= kataPortals.length) return;
    ensureFistPool();
    // Find an unused fist from pool
    let fist = null;
    for (const f of kataFistPool) { if (!f.visible) { fist = f; break; } }
    if (!fist) return; // pool exhausted, skip

    const portal = kataPortals[fromPortalIdx];
    const isHaki = player && player._haki;
    fist.material.color.set(isHaki ? '#1565c0' : '#f5f0e0');
    fist.position.copy(portal.position);
    fist.visible = true;

    const start = portal.position.clone();
    const target = new THREE.Vector3(targetX + (Math.random()-0.5)*1.5, targetY, targetZ + (Math.random()-0.5)*1.5);

    kataFists.push({ mesh: fist, start, target, life: 12, maxLife: 12, damage });
}

// ─── COMBAT ─────────────────────────────────────────────────
function playerAttack() {
    if (!player || !player.alive) return;
    const now = performance.now();
    if (now - player.lastAttack < player.attackSpeed) return;
    player.lastAttack = now;

    // Katakuri — Dough M1: reuse 2 pre-built punch meshes, just reposition
    if (player.classId === 'katakuri') {
        if (kataPortals.length === 0) initKataPortals();
        // Create reusable punches once
        if (!player._punchMeshes) {
            player._punchMeshes = [];
            const isHaki = player._haki;
            const fistCol = isHaki ? '#0d47a1' : '#1a1a3a'; // dark navy/indigo
            const armCol = isHaki ? '#1565c0' : '#1a1a3a';   // navy arm too
            for (let s = 0; s < 2; s++) {
                const g = new THREE.Group();
                // Dough arm — white/cream cylinder
                const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 3.5, 5), new THREE.MeshBasicMaterial({ color: armCol }));
                arm.rotation.x = Math.PI / 2; arm.position.z = 1.75;
                g.add(arm);
                // Big blocky dark fist — box shape like a giant boxing glove
                const fistBox = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.7), new THREE.MeshStandardMaterial({ color: fistCol, roughness: 0.4, metalness: 0.2 }));
                fistBox.position.z = 3.8;
                g.add(fistBox);
                // Knuckle ridges on the front face
                for (let k = 0; k < 4; k++) {
                    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.15), new THREE.MeshBasicMaterial({ color: fistCol }));
                    ridge.position.set((k - 1.5) * 0.2, 0.25, 4.15);
                    g.add(ridge);
                }
                // Slight bevel/wrist connection
                const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.3, 5), new THREE.MeshBasicMaterial({ color: fistCol }));
                wrist.rotation.x = Math.PI / 2; wrist.position.z = 3.35;
                g.add(wrist);
                g.visible = false;
                scene.add(g);
                player._punchMeshes.push(g);
            }
        }

        const px = fpsCamera.posX, pz = fpsCamera.posZ;
        const yaw = fpsCamera.yaw;
        let fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);

        // Lock-on: find nearest enemy in front and aim at them
        let lockTarget = null, lockDist = Infinity;
        for (const e of enemies3D) {
            if (!e.data.alive) continue;
            const dx = e.data.x - px, dz = e.data.z - pz;
            const d = Math.hypot(dx, dz);
            if (d > 6) continue;
            let ad = Math.atan2(-dx, -dz) - yaw;
            while (ad > Math.PI) ad -= Math.PI * 2; while (ad < -Math.PI) ad += Math.PI * 2;
            if (Math.abs(ad) < Math.PI * 0.7 && d < lockDist) { lockDist = d; lockTarget = e; }
        }
        // If locked, aim fist at that enemy
        let aimX = fwdX, aimZ = fwdZ;
        if (lockTarget) {
            const dx = lockTarget.data.x - px, dz = lockTarget.data.z - pz;
            const d = Math.hypot(dx, dz);
            aimX = dx / d; aimZ = dz / d;
        }

        // Alternate side — punch comes FROM the portal
        if (player._m1Side === undefined) player._m1Side = 0;
        player._m1Side = (player._m1Side + 1) % 2;

        // Get the actual portal position
        const portal = kataPortals[player._m1Side];
        if (!portal) return;
        const donutX = portal.position.x;
        const donutZ = portal.position.z;

        // Show punch mesh originating from portal, aimed at target
        const punch = player._punchMeshes[player._m1Side];
        punch.position.copy(portal.position);
        const aimWorldX = donutX + aimX * 5, aimWorldZ = donutZ + aimZ * 5;
        punch.lookAt(aimWorldX, portal.position.y, aimWorldZ);
        punch.visible = true;
        clearTimeout(punch._hideTimer);
        punch._hideTimer = setTimeout(() => { punch.visible = false; }, 400);

        // Damage + knockback enemies in aimed direction
        for (const e of enemies3D) {
            if (!e.data.alive) continue;
            const dx = e.data.x - px, dz = e.data.z - pz;
            const d = Math.hypot(dx, dz);
            if (d > 4) continue;
            const eAim = Math.atan2(dx, dz);
            const pAim = Math.atan2(aimX, aimZ);
            let ad = eAim - pAim;
            while (ad > Math.PI) ad -= Math.PI * 2; while (ad < -Math.PI) ad += Math.PI * 2;
            if (Math.abs(ad) < Math.PI * 0.5) {
                dealDamageToEnemy(e, player.damage);
                // Push enemy back
                e.data.x += aimX * 0.8;
                e.data.z += aimZ * 0.8;
                e.mesh.position.set(e.data.x * TILE, 0, e.data.z * TILE);
            }
        }
        return;
    }

    if (player.attackType === 'melee') {
        // Melee — hit enemies in arc in front of camera
        const yaw = fpsCamera.yaw;
        for (const e of enemies3D) {
            if (!e.data.alive) continue;
            const dx = e.data.x - fpsCamera.posX;
            const dz = e.data.z - fpsCamera.posZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > player.attackRange / TILE + e.data.radius) continue;
            const angleToEnemy = Math.atan2(-dx, -dz);
            let angleDiff = angleToEnemy - yaw;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            if (Math.abs(angleDiff) < Math.PI * 0.5) {
                dealDamageToEnemy(e, player.damage);
            }
        }
        // Visible melee slash arc
        spawnMeleeSlash(player.cls.color);
    } else {
        // Ranged — spawn glowing projectile
        const spd = 14;
        const dirX = -Math.sin(fpsCamera.yaw);
        const dirZ = -Math.cos(fpsCamera.yaw);
        const mesh = new THREE.Mesh(projGeo, new THREE.MeshBasicMaterial({ color: player.cls.color }));
        mesh.position.set(fpsCamera.posX * TILE + dirX * 0.8, EYE_HEIGHT - 0.3, fpsCamera.posZ * TILE + dirZ * 0.8);
        scene.add(mesh);
        // Glow light on projectile
        const glow = new THREE.PointLight(player.cls.color, 2, TILE * 3, 2);
        mesh.add(glow);
        projectiles3D.push({
            mesh, vx: dirX * spd, vz: dirZ * spd,
            damage: player.damage, owner: 'player',
            traveled: 0, range: player.attackRange / TILE * TILE,
        });
    }
}

function playerSpecial() {
    if (!player || !player.alive) return;
    const now = performance.now();
    if (now - player.lastSpecial < player.specialCooldown) return;
    player.lastSpecial = now;
    const px = fpsCamera.posX, pz = fpsCamera.posZ;
    const yaw = fpsCamera.yaw;
    const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);

    // Helpers
    const aoeHit = (range, dmgMult) => { for (const e of enemies3D) { if (!e.data.alive) continue; if (Math.hypot(e.data.x-px,e.data.z-pz)<range) dealDamageToEnemy(e, Math.round(player.damage*dmgMult)); }};
    const coneHit = (range, halfAngle, dmgMult) => { for (const e of enemies3D) { if (!e.data.alive) continue; const dx=e.data.x-px,dz=e.data.z-pz; const dist=Math.hypot(dx,dz); if(dist>range)continue; const a=Math.atan2(-dx,-dz); let d=a-yaw; while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2; if(Math.abs(d)<halfAngle) dealDamageToEnemy(e, Math.round(player.damage*dmgMult)); }};
    const stunNear = (range, dur) => { for (const e of enemies3D) { if (!e.data.alive) continue; if (Math.hypot(e.data.x-px,e.data.z-pz)<range) e.data.lastAttack = now + dur; }};
    const shootProj = (color, spd, dmg, count, spread) => { for (let i=0;i<count;i++){const a=yaw+(i-(count-1)/2)*(spread||0.12);const dx=-Math.sin(a),dz=-Math.cos(a);const m=new THREE.Mesh(projGeo,new THREE.MeshBasicMaterial({color}));m.position.set(px*TILE+dx*0.8,EYE_HEIGHT-0.3,pz*TILE+dz*0.8);m.add(new THREE.PointLight(color,2,TILE*3,2));scene.add(m);projectiles3D.push({mesh:m,vx:dx*(spd||14),vz:dz*(spd||14),damage:Math.round(dmg),owner:'player',traveled:0,range:45});}};
    const dash = (speed, dur, dmgMult, range) => { fpsCamera.speed=speed; player.invincible=now+dur; player._dashEnd=now+dur; player._dashRestore=player.speed; coneHit(range||6, 0.5, dmgMult||1.5); };
    const summon = (type, count, data) => { for(let i=0;i<count;i++){const a=(i/count)*Math.PI*2; spawnMinion(type,px+Math.cos(a)*1.5,pz+Math.sin(a)*1.5,data);} };

    switch (player.classId) {
        case 'angel': // Divine Wings — speed + heal allies
            player.hp = Math.min(player.hp + 25, player.maxHp);
            fpsCamera.speed = player.speed * 1.5; player._wingsEnd = now + 5000;
            spawnMeleeSlash('#f0e68c'); break;
        case 'demon': // Summon 3 Imps
            summon('imp', 3, { hp:20, damage:6, speed:2.5, radius:0.3, attackRange:1.5, attackSpeed:600, life:now+8000, color:'#ff4444' });
            spawnMeleeSlash('#cc2222'); break;
        case 'draco': // Dragon Beam — long directional damage
            coneHit(8, 0.3, 2); spawnMeleeSlash('#9c27b0');
            shootProj('#9c27b0', 18, player.damage*2, 1, 0); break;
        case 'healer': // Healing Circle
            player._healCircle = { x:px, z:pz, end:now+4000, lastHeal:0 };
            spawnMeleeSlash('#43a047'); break;
        case 'lightning': // Lightning Net — trap+shock
            stunNear(4, 3000); aoeHit(4, 1.5); spawnMeleeSlash('#ffeb3b'); break;
        case 'portal': // Rift Pull — teleport enemies to you
            for (const e of enemies3D) { if(!e.data.alive)continue; const d=Math.hypot(e.data.x-px,e.data.z-pz); if(d<10&&d>1){const a=Math.random()*Math.PI*2; e.data.x=px+Math.cos(a)*1.5; e.data.z=pz+Math.sin(a)*1.5; e.mesh.position.set(e.data.x*TILE,0,e.data.z*TILE); stunNear(2,1000);}}
            spawnMeleeSlash('#00bcd4'); break;
        case 'katakuri': { // Dough Fist Fusillade — rapid fists from both donuts
            if (kataPortals.length === 0) initKataPortals();
            const fX = -Math.sin(yaw), fZ = -Math.cos(yaw);
            const targetX = (px + fX * 6) * TILE, targetZ = (pz + fZ * 6) * TILE;
            // 16 fists alternating from left and right donut
            for (let f = 0; f < 16; f++) {
                const portalIdx = f % 2; // alternate left/right
                setTimeout(() => {
                    kataFireFist(portalIdx, targetX + (Math.random()-0.5)*3, EYE_HEIGHT*0.5, targetZ + (Math.random()-0.5)*3, Math.round(player.damage * 2));
                }, f * 60);
            }
            spawnMeleeSlash(player._haki ? '#1565c0' : '#c62828'); break; }
        case 'naruto': // Shadow Clones — 8 permanent
            summon('clone', 8, { hp:9999, damage:Math.round(player.damage*0.6), speed:player.speed, radius:0.35, attackRange:1.5, attackSpeed:400, life:Infinity, color:'#ff8f00' });
            spawnMeleeSlash('#ff8f00'); break;
        case 'megumi': // Divine Dogs — 8 fiends
            summon('dog_divine', 8, { hp:30, damage:8, speed:3.5, radius:0.4, attackRange:1.8, attackSpeed:400, life:now+10000, color:'#1a237e' });
            spawnMeleeSlash('#283593'); break;
        case 'jinwoo': // Shadow Army
            player._shadowSpawning = true; player._lastShadowSpawn = now;
            { const ex = minions3D.filter(m=>m.data.type==='shadow').length;
            for(let i=0;i<3&&ex+i<8;i++){const a=((ex+i)/8)*Math.PI*2; spawnMinion('shadow',px+Math.cos(a)*1.5,pz+Math.sin(a)*1.5,{hp:20,damage:6,speed:3.2,radius:0.4,attackRange:2,attackSpeed:800,life:Infinity,color:'#6a3aaa'});}}
            spawnMeleeSlash('#7c4dff'); break;
        case 'frog': // Electric Tongue — AoE grab+damage
            aoeHit(5, 2); stunNear(5, 1500); player.hp = Math.min(player.hp+10, player.maxHp);
            spawnMeleeSlash('#76ff03'); break;
        case 'beeswarm': // Split Swarm — invincible scatter+sting
            player.invincible = now + 1500; aoeHit(3, 2);
            spawnMeleeSlash('#fdd835'); break;
        case 'trex': // Dino Stomp — huge AoE + stun
            aoeHit(5, 2); stunNear(8, 2500); spawnMeleeSlash('#4e342e'); break;
        case 'wendigo': { // Devour — eat nearest non-boss enemy
            let target=null, closest=Infinity;
            for(const e of enemies3D){if(!e.data.alive||e.data.isBoss)continue;const d=Math.hypot(e.data.x-px,e.data.z-pz);if(d<3&&d<closest){closest=d;target=e;}}
            if(target){dealDamageToEnemy(target,9999);player.damage+=1;player.maxHp+=5;player.hp=Math.min(player.hp+15,player.maxHp);}
            spawnMeleeSlash('#b0bec5'); break; }
        case 'alienqueen': // Lay Eggs — 12 face-huggers
            summon('facehugger', 12, { hp:12, damage:5, speed:4.0, radius:0.2, attackRange:1, attackSpeed:500, life:now+8000, color:'#1b5e20' });
            spawnMeleeSlash('#76ff03'); break;
        case 'comet': // Comet Dash — fire trail dash
            dash(player.speed*4, 600, 2.5, 6); spawnMeleeSlash('#ff6f00'); break;
        case 'telekinesis': { // TK Throw — grab+hurl enemy
            let target=null,closest=Infinity;
            for(const e of enemies3D){if(!e.data.alive)continue;const d=Math.hypot(e.data.x-px,e.data.z-pz);if(d<6&&d<closest){closest=d;target=e;}}
            if(target){dealDamageToEnemy(target,Math.round(player.damage*1.5));target.data.x+=fwdX*5;target.data.z+=fwdZ*5;target.mesh.position.set(target.data.x*TILE,0,target.data.z*TILE);
            for(const e2 of enemies3D){if(!e2.data.alive||e2===target)continue;if(Math.hypot(e2.data.x-target.data.x,e2.data.z-target.data.z)<2)dealDamageToEnemy(e2,Math.round(player.damage*2));}}
            spawnMeleeSlash('#7c4dff'); break; }
        case 'mindcontrol': { // Possess — convert enemy to ally
            let target=null,closest=Infinity;
            for(const e of enemies3D){if(!e.data.alive||e.data.isBoss)continue;const d=Math.hypot(e.data.x-px,e.data.z-pz);if(d<5&&d<closest){closest=d;target=e;}}
            if(target){target.data.alive=false;target.mesh.visible=false;
            spawnMinion('possessed',target.data.x,target.data.z,{hp:target.data.maxHp,damage:target.data.damage,speed:target.data.speed||2,radius:0.4,attackRange:2,attackSpeed:500,life:now+6000,color:'#e040fb'});}
            spawnMeleeSlash('#e040fb'); break; }
        case 'chimera': { // Switch Head — fire/lightning/poison cycle
            if(!player._chimeraHead) player._chimeraHead=0;
            player._chimeraHead=(player._chimeraHead+1)%3;
            const colors=['#ff6f00','#ffeb3b','#76ff03'];
            const mults=[1.5,1.2,1.6];
            aoeHit(4, mults[player._chimeraHead]);
            if(player._chimeraHead===1) stunNear(4,2000);
            spawnMeleeSlash(colors[player._chimeraHead]); break; }
        case 'mimic': { // Copy — kill+copy nearest enemy
            let target=null,closest=Infinity;
            for(const e of enemies3D){if(!e.data.alive||e.data.isBoss)continue;const d=Math.hypot(e.data.x-px,e.data.z-pz);if(d<3&&d<closest){closest=d;target=e;}}
            if(target){dealDamageToEnemy(target,9999);player.damage=Math.round(player.damage*1.5);player._mimicEnd=now+6000;}
            spawnMeleeSlash('#8d6e63'); break; }
        case 'supernova': { // Charge & Release
            if(!player._novaCharge)player._novaCharge=now;
            const chg=Math.min(now-player._novaCharge,10000)/10000;
            aoeHit(3+chg*8, 1+chg*4);
            player._novaCharge=now;
            spawnMeleeSlash('#fff176'); break; }
        case 'puppet': // Strings — slam enemies together
            { const caught=[];
            for(const e of enemies3D){if(!e.data.alive||caught.length>=4)continue;if(Math.hypot(e.data.x-px,e.data.z-pz)<5){caught.push(e);stunNear(5,1500);}}
            if(caught.length>=2){const cx=caught.reduce((s,e)=>s+e.data.x,0)/caught.length,cz=caught.reduce((s,e)=>s+e.data.z,0)/caught.length;
            for(const e of caught){e.data.x=cx;e.data.z=cz;e.mesh.position.set(cx*TILE,0,cz*TILE);dealDamageToEnemy(e,Math.round(player.damage*2));}}
            else if(caught.length===1) dealDamageToEnemy(caught[0],Math.round(player.damage*1.5));
            spawnMeleeSlash('#9c27b0'); break; }
        case 'medusa': // Stone Gaze — cone petrify + 3x damage
            coneHit(5, 0.5, 3); stunNear(5, 3000); spawnMeleeSlash('#4caf50'); break;
        case 'cerberus': // Triple Breath — 3 directional cones
            for(let h=-1;h<=1;h++) { const a=yaw+h*0.4;
            for(const e of enemies3D){if(!e.data.alive)continue;const dx=e.data.x-px,dz=e.data.z-pz;const along=-dx*Math.sin(a)-dz*Math.cos(a);const perp=Math.abs(dx*Math.cos(a)-dz*Math.sin(a));if(along>0&&along<5&&perp<1.5)dealDamageToEnemy(e,Math.round(player.damage*(h===0?1.3:1)));}}
            spawnMeleeSlash('#ff6f00'); break;
        case 'minotaur': // Bull Charge
            dash(player.speed*3, 800, 2.5, 6); spawnMeleeSlash('#5d4037'); break;
        case 'anubis': // Death Mark — mark+explode on death
            for(const e of enemies3D){if(!e.data.alive)continue;if(Math.hypot(e.data.x-px,e.data.z-pz)<6){e.data._deathMark=true; dealDamageToEnemy(e,Math.round(player.damage*0.5));}}
            spawnMeleeSlash('#fdd835'); break;
        case 'thor': // Mjolnir — 3 piercing hammer projectiles
            shootProj('#42a5f5', 16, player.damage*1.8, 3, 0.1); spawnMeleeSlash('#42a5f5'); break;
        case 'venom': // Tentacle Burst — 8 directional hits
            for(let t=0;t<8;t++){const a=yaw+(t/8)*Math.PI*2;
            for(const e of enemies3D){if(!e.data.alive)continue;const dx=e.data.x-px,dz=e.data.z-pz;const along=-dx*Math.sin(a)-dz*Math.cos(a);const perp=Math.abs(dx*Math.cos(a)-dz*Math.sin(a));if(along>0&&along<3.5&&perp<0.8)dealDamageToEnemy(e,Math.round(player.damage*1.3));}}
            spawnMeleeSlash('#222222'); break;
        case 'cordyceps': // Infect — enemies rise as zombies on death
            for(const e of enemies3D){if(!e.data.alive)continue;if(Math.hypot(e.data.x-px,e.data.z-pz)<5){e.data._infected=true;dealDamageToEnemy(e,Math.round(player.damage*1.5));}}
            spawnMeleeSlash('#ff8f00'); break;
        case 'leech': { // Latch On — drain continuously
            let target=null,closest=Infinity;
            for(const e of enemies3D){if(!e.data.alive)continue;const d=Math.hypot(e.data.x-px,e.data.z-pz);if(d<3&&d<closest){closest=d;target=e;}}
            if(target){player._leechTarget=target;player._leechEnd=now+4000;stunNear(3,4000);}
            spawnMeleeSlash('#880e4f'); break; }
        case 'chrono': // Rewind — restore HP
            { const restore = player._hpHistory ? Math.max(...player._hpHistory) : player.hp;
            player.hp = Math.min(restore, player.maxHp); player._hpHistory = [];
            spawnMeleeSlash('#00bcd4'); break; }
        case 'dimcutter': // Portal Slash — teleport enemies away
            for(const e of enemies3D){if(!e.data.alive)continue;if(Math.hypot(e.data.x-px,e.data.z-pz)<4){const rm=dungeon.rooms[Math.floor(Math.random()*dungeon.rooms.length)];e.data.x=rm.cx+0.5;e.data.z=rm.cy+0.5;e.mesh.position.set(e.data.x*TILE,0,e.data.z*TILE);dealDamageToEnemy(e,Math.round(player.damage*1.5));}}
            spawnMeleeSlash('#00e5ff'); break;
        case 'paradox': // Time Echo — summon clone
            spawnMinion('clone',px+fwdX*1.5,pz+fwdZ*1.5,{hp:40,damage:Math.round(player.damage*0.8),speed:player.speed,radius:0.35,attackRange:1.8,attackSpeed:400,life:now+8000,color:'#ff80ab'});
            spawnMeleeSlash('#ff80ab'); break;
        case 'drummer': { // Beat Drop — combo counter
            if(!player._drumCombo)player._drumCombo=0; player._drumCombo++;
            const c=player._drumCombo; aoeHit(2+c*0.5, 0.5+c*0.3);
            if(c>=7) player._drumCombo=0;
            spawnMeleeSlash('#ff5722'); break; }
        case 'siren': // Lure Song — pull enemies in+damage
            for(const e of enemies3D){if(!e.data.alive)continue;const d=Math.hypot(e.data.x-px,e.data.z-pz);if(d<7){const a=Math.atan2(px-e.data.x,pz-e.data.z);e.data.x+=Math.sin(a)*2;e.data.z+=Math.cos(a)*2;e.mesh.position.set(e.data.x*TILE,0,e.data.z*TILE);stunNear(2,2000);if(d<2)dealDamageToEnemy(e,Math.round(player.damage*2.5));}}
            spawnMeleeSlash('#80deea'); break;
        case 'mercury': // Reshape — blade wave dash
            dash(player.speed*3, 500, 2, 5); spawnMeleeSlash('#b0bec5'); break;
        case 'acid': // Dissolve — acid AoE, strip defense
            aoeHit(4, 1.5); spawnMeleeSlash('#76ff03'); break;
        case 'smoke': // Smoke Bomb — invincible+poison AoE
            player.invincible = now + 2500; aoeHit(3, 1.5); spawnMeleeSlash('#546e7a'); break;
        case 'antcolony': // Swarm Rush — wave of projectiles
            shootProj('#5d4037', 10, player.damage*0.8, 8, 0.08); spawnMeleeSlash('#795548'); break;
        case 'ratking': { // Rat Horde — summon or sacrifice
            const rats = minions3D.filter(m=>m.data.type==='rat').length;
            if(rats>=6){let healed=0;for(let i=minions3D.length-1;i>=0;i--){if(minions3D[i].data.type==='rat'){healed+=5;scene.remove(minions3D[i].mesh);minions3D.splice(i,1);}}player.hp=Math.min(player.hp+healed,player.maxHp);}
            else summon('rat',3,{hp:8,damage:4,speed:3.5,radius:0.2,attackRange:1,attackSpeed:400,life:now+12000,color:'#757575'});
            spawnMeleeSlash('#616161'); break; }
        case 'locust': // Plague Cloud — expanding damage
            if(!player._locustSize)player._locustSize=2; player._locustSize=Math.min(player._locustSize+1,8);
            aoeHit(player._locustSize, 0.6); spawnMeleeSlash('#827717'); break;
        case 'mechashark': // Torpedo+Sonar — piercing shot+reveal map
            shootProj('#37474f', 18, player.damage*2.5, 1, 0);
            for(const rm of dungeon.rooms)rm.explored=true; syncTorchVisibility(torchLights,dungeon);
            spawnMeleeSlash('#4fc3f7'); break;
        case 'ghostrider': // Hellfire Chain — 6 directional whips
            for(let c=0;c<6;c++){const a=yaw+c*Math.PI/3;
            for(const e of enemies3D){if(!e.data.alive)continue;const dx=e.data.x-px,dz=e.data.z-pz;const along=-dx*Math.sin(a)-dz*Math.cos(a);if(along>0&&along<4&&Math.abs(dx*Math.cos(a)-dz*Math.sin(a))<1)dealDamageToEnemy(e,Math.round(player.damage*1.8));}}
            spawnMeleeSlash('#ff6f00'); break;
        case 'icephoenix': // Frost Dive — freeze+shatter
            dash(player.speed*3, 400, 3, 5); stunNear(5, 3000); spawnMeleeSlash('#e1f5fe'); break;
        case 'plaguerat': // Sneeze — cone poison, stacks
            if(!player._poisonCount)player._poisonCount=0;
            coneHit(5, 0.5, 1+player._poisonCount*0.2); player._poisonCount++;
            spawnMeleeSlash('#33691e'); break;
        case 'carddealer': { // Draw Card — random effect
            const card=Math.floor(Math.random()*4);
            if(card===0) player.hp=Math.min(player.hp+30,player.maxHp);
            else if(card===1) aoeHit(5,2);
            else if(card===2){fpsCamera.speed=player.speed*1.5;player._wingsEnd=now+5000;}
            else aoeHit(8,3);
            spawnMeleeSlash('#d32f2f'); break; }
        case 'diceroller': { // Roll Dice
            const roll=1+Math.floor(Math.random()*6);
            if(roll===6) aoeHit(5,5);
            else { player._dmgBuff=1+roll*0.3; player._dmgBuffEnd=now+3000; }
            spawnMeleeSlash('#ffffff'); break; }
        case 'chessking': { // Summon Pawns or Castle swap
            const pawns=minions3D.filter(m=>m.data.type==='pawn').length;
            if(pawns>0){let furthest=null,maxD=0;for(const m of minions3D){if(m.data.type!=='pawn')continue;const d=Math.hypot(m.data.x-px,m.data.z-pz);if(d>maxD){maxD=d;furthest=m;}}
            if(furthest){const tx=furthest.data.x,tz=furthest.data.z;furthest.data.x=px;furthest.data.z=pz;furthest.mesh.position.set(px*TILE,0,pz*TILE);fpsCamera.setPosition(tx,tz);}}
            else summon('pawn',4,{hp:15,damage:5,speed:2.5,radius:0.25,attackRange:1.2,attackSpeed:600,life:now+15000,color:'#fdd835'});
            spawnMeleeSlash('#fdd835'); break; }
        case 'rage': // Unleash — spend rage meter
            if(!player._rageMeter)player._rageMeter=0;
            if(player._rageMeter>=50){player._rageMeter=0;player._dmgBuff=2;player._dmgBuffEnd=now+5000;fpsCamera.speed=player.speed*2;player._wingsEnd=now+5000;player.invincible=now+1000;}
            spawnMeleeSlash('#d50000'); break;
        case 'fear': // Nightmare — push+2x damage
            for(const e of enemies3D){if(!e.data.alive)continue;const d=Math.hypot(e.data.x-px,e.data.z-pz);if(d<6){const a=Math.atan2(e.data.x-px,e.data.z-pz);e.data.x+=Math.sin(a)*2;e.data.z+=Math.cos(a)*2;e.mesh.position.set(e.data.x*TILE,0,e.data.z*TILE);dealDamageToEnemy(e,Math.round(player.damage*2));}}
            spawnMeleeSlash('#4a148c'); break;
        case 'love': { // Charm — permanently convert enemy
            const charmed=minions3D.filter(m=>m.data.type==='charmed').length;
            if(charmed>=3)break;
            let target=null,closest=Infinity;
            for(const e of enemies3D){if(!e.data.alive||e.data.isBoss)continue;const d=Math.hypot(e.data.x-px,e.data.z-pz);if(d<5&&d<closest){closest=d;target=e;}}
            if(target){target.data.alive=false;target.mesh.visible=false;
            spawnMinion('charmed',target.data.x,target.data.z,{hp:target.data.maxHp,damage:target.data.damage,speed:target.data.speed||2,radius:0.4,attackRange:1.5,attackSpeed:500,life:Infinity,color:'#e91e63'});}
            spawnMeleeSlash('#e91e63'); break; }
        case 'chaos': { // Random ability from any class
            const allClasses=Object.keys(CLASSES).filter(c=>c!=='chaos');
            const rc=allClasses[Math.floor(Math.random()*allClasses.length)];
            const old=player.classId; player.classId=rc; player.lastSpecial=0;
            playerSpecial(); player.classId=old; break; }
        case 'suisui': // Dive — teleport to cursor direction + uppercut
            { const tx=px+fwdX*6, tz=pz+fwdZ*6; fpsCamera.setPosition(tx,tz);
            player.invincible=now+800; aoeHit(3,2.5); stunNear(3,1000);
            spawnMeleeSlash('#e91e63'); break; }
        case 'ink': { // Draw Soldier — consume ink (simplified: just summon)
            spawnMinion('inkSoldier',px+fwdX*1.5,pz+fwdZ*1.5,{hp:40,damage:8,speed:2.8,radius:0.35,attackRange:1.5,attackSpeed:450,life:now+12000,color:'#263238'});
            spawnMeleeSlash('#263238'); break; }
        case 'dog': // Pack Howl — 6 permanent dogs + stun
            summon('dog_pack',6,{hp:40,damage:Math.round(player.damage*0.7),speed:3.8,radius:0.35,attackRange:1.5,attackSpeed:350,life:Infinity,color:'#8d6e63'});
            stunNear(8,1500); spawnMeleeSlash('#a1887f'); break;
        case 'kitsune': { // Fox Fire
            const count=player._kitsuneForm?8:3;
            shootProj('#00e5ff',14,player.damage*(player._kitsuneForm?1.5:1),count,0.12);
            if(!player._kitsuneForm){if(!player._tailsMeter)player._tailsMeter=0;player._tailsMeter=Math.min(9,player._tailsMeter+0.3);}
            break; }
        default: // Fallback AoE
            aoeHit(4, 2); spawnMeleeSlash(player.cls.color);
    }
}

// ─── SECONDARY ABILITIES (R KEY) ────────────────────────────
function playerSecondary() {
    if (!player || !player.alive) return;
    const now = performance.now();
    if (!player._secondaryCd) player._secondaryCd = 0;
    const px = fpsCamera.posX, pz = fpsCamera.posZ;
    const yaw = fpsCamera.yaw;
    const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);

    switch (player.classId) {
        case 'katakuri': { // Restless Dough Barrage — rapid fists from both donuts
            if (now - player._secondaryCd < 4000) return; player._secondaryCd = now;
            if (kataPortals.length === 0) initKataPortals();
            const fX = -Math.sin(yaw), fZ = -Math.cos(yaw);
            // 12 rapid fists alternating left/right donut
            for (let f = 0; f < 12; f++) {
                const dist = 2.5 + Math.random() * 3;
                setTimeout(() => {
                    kataFireFist(f % 2, (px+fX*dist)*TILE+(Math.random()-0.5)*1.5, EYE_HEIGHT*0.5, (pz+fZ*dist)*TILE+(Math.random()-0.5)*1.5, Math.round(player.damage * (player._haki ? 1.2 : 0.8)));
                }, f * 50);
            }
            for (let s = 0; s < 3; s++) setTimeout(() => spawnMeleeSlash(player._haki ? '#1565c0' : '#c62828'), s * 120);
            break; }
        case 'naruto':
            if (now - player._secondaryCd < 3000) return; player._secondaryCd = now;
            for(const e of enemies3D){if(!e.data.alive)continue;if(Math.hypot(e.data.x-px,e.data.z-pz)<2.5)dealDamageToEnemy(e,Math.round(player.damage*2));}
            spawnMeleeSlash('#42a5f5'); break;
        case 'kitsune':
            if (now - player._secondaryCd < 2500) return; player._secondaryCd = now;
            fpsCamera.speed = player.speed * 3; player.invincible = now + 500; player._dashEnd = now + 500; player._dashRestore = player.speed;
            for(const e of enemies3D){if(!e.data.alive)continue;const dx=e.data.x-px,dz=e.data.z-pz;const along=-dx*fwdX-dz*fwdZ;const perp=Math.abs(dx*fwdZ-dz*fwdX);if(along>0&&along<6&&perp<1.5)dealDamageToEnemy(e,Math.round(player.damage*2));}
            spawnMeleeSlash('#00e5ff'); break;
        case 'dog':
            if (now - player._secondaryCd < 3000) return; player._secondaryCd = now;
            for(const m of minions3D){if((m.data.type==='dog_pack'||m.data.type==='puppy')){ m.data.damage=Math.round(m.data.damage*2); m.data._frenzyEnd=now+5000;}}
            spawnMeleeSlash('#ff8f00'); break;
        case 'ink':
            if (now - player._secondaryCd < 4000) return; player._secondaryCd = now;
            for(const e of enemies3D){if(!e.data.alive)continue;const dx=e.data.x-px,dz=e.data.z-pz;const along=-dx*fwdX-dz*fwdZ;const perp=Math.abs(dx*fwdZ-dz*fwdX);if(along>0&&along<8&&perp<2)dealDamageToEnemy(e,Math.round(player.damage*2));}
            spawnMeleeSlash('#111111'); break;
        case 'suisui':
            if (now - player._secondaryCd < 3000) return; player._secondaryCd = now;
            fpsCamera.speed = player.speed * 3; player.invincible = now + 700; player._dashEnd = now + 700; player._dashRestore = player.speed;
            for(const e of enemies3D){if(!e.data.alive)continue;const dx=e.data.x-px,dz=e.data.z-pz;const along=-dx*fwdX-dz*fwdZ;const perp=Math.abs(dx*fwdZ-dz*fwdX);if(along>0&&along<8&&perp<1.5)dealDamageToEnemy(e,Math.round(player.damage*2));}
            spawnMeleeSlash('#e91e63'); break;
        default: break;
    }
}

// ─── Q ABILITIES ────────────────────────────────────────────
function playerQAbility() {
    if (!player || !player.alive) return;
    const now = performance.now();
    const px = fpsCamera.posX, pz = fpsCamera.posZ;

    switch (player.classId) {
        case 'jinwoo': // Recall shadows
            for(const m of minions3D){if(m.data.type==='shadow'){m.data.x=px+(Math.random()-0.5)*2;m.data.z=pz+(Math.random()-0.5)*2;}}
            break;
        case 'katakuri': // Haki — permanent damage boost + recolor portals blue
            if(!player._haki){player._haki=true;player.damage=Math.round(player.damage*1.4);
            // Recolor all portals to blue
            for (const p of kataPortals) {
                p.material.color.set('#1565c0'); p.material.emissive.set('#0d47a1');
                p.children.forEach(c => { if(c.material && c.material.color) { if(c.geometry.type !== 'CircleGeometry') c.material.color.set('#1565c0'); }});
            }}
            spawnMeleeSlash('#1565c0'); break;
        case 'dog': { // Alpha Howl — 3x buff all dogs
            if(!player._alphaCd)player._alphaCd=0;if(now-player._alphaCd<12000)break;player._alphaCd=now;
            for(const m of minions3D){if(m.data.type==='dog_pack'||m.data.type==='puppy'){m.data.damage*=3;m.data._alphaEnd=now+8000;}}
            player.damage=Math.round(player.damage*2); player._dmgBuffEnd=now+8000;
            spawnMeleeSlash('#ff3d00'); break; }
        case 'ink': { // Masterpiece — big golem
            spawnMinion('inkGolem',px-Math.sin(fpsCamera.yaw)*2,pz-Math.cos(fpsCamera.yaw)*2,
                {hp:120,damage:20,speed:2,radius:0.6,attackRange:2,attackSpeed:500,life:now+15000,color:'#111111'});
            spawnMeleeSlash('#263238'); break; }
        case 'suisui': { // Whirlpool — pull enemies in
            if(!player._whirlCd)player._whirlCd=0;if(now-player._whirlCd<6000)break;player._whirlCd=now;
            player._whirlpool={x:px,z:pz,end:now+4000};
            spawnMeleeSlash('#e91e63'); break; }
        default: break;
    }
}

// ─── F ABILITY ──────────────────────────────────────────────
let kataGrabHands = []; // 2 pre-built grab hand meshes (reusable)
let kataGrabArms = [];  // 2 arm cylinders connecting hand to portal
let kataGrabbedEnemies = []; // currently held enemies
let kataGrabInited = false;
let kataThrownEnemies = []; // enemies currently flying after being thrown

function initKataGrabHands() {
    if (kataGrabInited) return;
    kataGrabInited = true;
    const isHaki = player && player._haki;
    const col = isHaki ? '#0d47a1' : '#1a1a3a';

    for (let i = 0; i < 2; i++) {
        // Hand — palm + fingers + thumb
        const hand = new THREE.Group();
        hand.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.3), new THREE.MeshBasicMaterial({ color: col })));
        for (let f = 0; f < 4; f++) {
            const finger = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), new THREE.MeshBasicMaterial({ color: col }));
            finger.position.set((f - 1.5) * 0.15, 0.5, 0);
            hand.add(finger);
        }
        const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.12), new THREE.MeshBasicMaterial({ color: col }));
        thumb.position.set(-0.4, 0.15, 0); thumb.rotation.z = 0.5;
        hand.add(thumb);
        hand.visible = false;
        scene.add(hand);
        kataGrabHands.push(hand);

        // Arm — cylinder that stretches from portal to hand
        const arm = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.18, 1, 4),
            new THREE.MeshBasicMaterial({ color: col })
        );
        arm.visible = false;
        scene.add(arm);
        kataGrabArms.push(arm);
    }
}

function playerFAbility() {
    if (!player || !player.alive) return;

    if (player.classId === 'katakuri') {
        initKataGrabHands();

        // If already holding — THROW in the direction player is facing
        if (kataGrabbedEnemies.length > 0) {
            const yaw = fpsCamera.yaw;
            const throwDirX = -Math.sin(yaw), throwDirZ = -Math.cos(yaw);
            const throwSpeed = 50; // tiles per second (200px/s equivalent — very fast)

            for (const grabbed of kataGrabbedEnemies) {
                grabbed.enemy.data.lastAttack = performance.now(); // unstun
                // Launch enemy as a projectile
                kataThrownEnemies.push({
                    enemy: grabbed.enemy,
                    vx: throwDirX * throwSpeed,
                    vz: throwDirZ * throwSpeed,
                    life: 2.0, // seconds of flight
                });
            }
            for (const h of kataGrabHands) h.visible = false;
            for (const a of kataGrabArms) a.visible = false;
            kataGrabbedEnemies = [];
            return;
        }

        // GRAB — find 2 nearest enemies
        const px = fpsCamera.posX, pz = fpsCamera.posZ;
        const candidates = [];
        for (const e of enemies3D) {
            if (!e.data.alive || e.data.isBoss) continue;
            const d = Math.hypot(e.data.x - px, e.data.z - pz);
            if (d < 8) candidates.push({ e, d });
        }
        candidates.sort((a, b) => a.d - b.d);
        const toGrab = candidates.slice(0, 2);
        if (toGrab.length === 0) return;

        for (let i = 0; i < toGrab.length; i++) {
            const enemy = toGrab[i].e;
            // Stun indefinitely while grabbed
            enemy.data.lastAttack = performance.now() + 999999;
            kataGrabbedEnemies.push({ enemy, portalIdx: i, handIdx: i });
            kataGrabHands[i].visible = true;
            kataGrabArms[i].visible = true;
        }
        return;
    }

    // Other classes
    if (player.classId === 'jinwoo') { /* Arise boss placeholder */ }
}

// Update grabbed enemies — carry them with the player, arm connects to portal
function updateKataGrab() {
    if (kataGrabbedEnemies.length === 0) return;
    const px = fpsCamera.posX, pz = fpsCamera.posZ;
    const yaw = fpsCamera.yaw;

    for (let i = kataGrabbedEnemies.length - 1; i >= 0; i--) {
        const grabbed = kataGrabbedEnemies[i];
        if (!grabbed.enemy.data.alive) {
            kataGrabHands[grabbed.handIdx].visible = false;
            kataGrabArms[grabbed.handIdx].visible = false;
            kataGrabbedEnemies.splice(i, 1);
            continue;
        }

        // Enemy follows player — offset to the side + forward
        const side = grabbed.portalIdx === 0 ? -1 : 1;
        const perpX = -Math.cos(yaw) * side;
        const perpZ = Math.sin(yaw) * side;
        const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);
        const holdX = px + perpX * 1.5 + fwdX * 2.5;
        const holdZ = pz + perpZ * 1.5 + fwdZ * 2.5;

        grabbed.enemy.data.x = holdX;
        grabbed.enemy.data.z = holdZ;
        grabbed.enemy.mesh.position.set(holdX * TILE, 0, holdZ * TILE);
        grabbed.enemy.data.lastAttack = performance.now() + 999999; // keep stunned

        // Position hand at enemy
        const handY = EYE_HEIGHT * 0.5;
        kataGrabHands[grabbed.handIdx].position.set(holdX * TILE, handY, holdZ * TILE);
        kataGrabHands[grabbed.handIdx].lookAt(px * TILE, handY, pz * TILE);
        kataGrabHands[grabbed.handIdx].rotateY(Math.PI);

        // Arm stretches from portal to hand
        const portal = kataPortals[grabbed.portalIdx];
        if (portal) {
            const armMesh = kataGrabArms[grabbed.handIdx];
            const pPos = portal.position;
            const hPos = kataGrabHands[grabbed.handIdx].position;
            // Position arm at midpoint, scale to distance
            const midX = (pPos.x + hPos.x) / 2;
            const midY = (pPos.y + hPos.y) / 2;
            const midZ = (pPos.z + hPos.z) / 2;
            const dist = pPos.distanceTo(hPos);
            armMesh.position.set(midX, midY, midZ);
            armMesh.scale.set(1, dist, 1);
            armMesh.lookAt(hPos);
            armMesh.rotateX(Math.PI / 2);
        }
    }
}

// ─── THROWN ENEMIES (Katakuri F throw) ──────────────────────
function updateThrownEnemies(dt) {
    for (let i = kataThrownEnemies.length - 1; i >= 0; i--) {
        const t = kataThrownEnemies[i];
        if (!t.enemy.data.alive) { kataThrownEnemies.splice(i, 1); continue; }

        t.life -= dt;
        if (t.life <= 0) { kataThrownEnemies.splice(i, 1); continue; }

        const moveX = t.vx * dt;
        const moveZ = t.vz * dt;
        const newX = t.enemy.data.x + moveX;
        const newZ = t.enemy.data.z + moveZ;
        const r = t.enemy.data.radius || 0.4;

        // Check wall collision — if hits wall, lose half HP
        const hitsWall = !isWalkable(dungeon.map, newX, newZ);
        if (hitsWall) {
            const dmg = Math.round(t.enemy.data.maxHp * 0.5);
            dealDamageToEnemy(t.enemy, dmg);
            // Stop movement
            t.vx *= -0.3; t.vz *= -0.3; // small bounce
            t.life = Math.min(t.life, 0.3); // expire soon
            spawnMeleeSlash('#ff4444');
            continue;
        }

        // Check collision with other enemies — both lose half HP
        let hitEnemy = false;
        for (const e of enemies3D) {
            if (!e.data.alive || e === t.enemy) continue;
            if (Math.hypot(e.data.x - newX, e.data.z - newZ) < r + (e.data.radius || 0.4)) {
                // Both lose half HP
                const dmg1 = Math.round(t.enemy.data.maxHp * 0.5);
                const dmg2 = Math.round(e.data.maxHp * 0.5);
                dealDamageToEnemy(t.enemy, dmg1);
                dealDamageToEnemy(e, dmg2);
                // Knock the hit enemy away too
                const angle = Math.atan2(e.data.x - newX, e.data.z - newZ);
                e.data.x += Math.sin(angle) * 1.5;
                e.data.z += Math.cos(angle) * 1.5;
                e.mesh.position.set(e.data.x * TILE, 0, e.data.z * TILE);
                hitEnemy = true;
                t.life = Math.min(t.life, 0.3);
                spawnMeleeSlash('#ff4444');
                break;
            }
        }

        // Move the thrown enemy
        t.enemy.data.x = newX;
        t.enemy.data.z = newZ;
        t.enemy.mesh.position.set(newX * TILE, 0, newZ * TILE);

        // Slow down over time (friction)
        t.vx *= 0.98;
        t.vz *= 0.98;
    }
}

// ─── MINION SYSTEM ──────────────────────────────────────────
function spawnMinion(type, tileX, tileZ, data) {
    const group = new THREE.Group();
    const S = data.radius * 2;
    const color = data.color;

    // Body
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(S * 0.4, S * 0.35, S * 1.5, 6), bodyMat);
    body.position.y = S * 0.9;
    group.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(S * 0.3, 6, 6), bodyMat);
    head.position.y = S * 1.8;
    group.add(head);

    // Glowing eyes
    const eyeColor = type === 'shadow' ? '#448aff' : type === 'imp' ? '#ff0000' : '#ffffff';
    const eyeMat = new THREE.MeshBasicMaterial({ color: eyeColor });
    const eyeGeo = new THREE.SphereGeometry(S * 0.08, 4, 4);
    group.add(new THREE.Mesh(eyeGeo, eyeMat).translateX(-S * 0.12).translateY(S * 1.85).translateZ(S * 0.2));
    group.add(new THREE.Mesh(eyeGeo, eyeMat).translateX(S * 0.12).translateY(S * 1.85).translateZ(S * 0.2));

    // Type-specific details
    if (type === 'shadow') {
        // Hood
        const hood = new THREE.Mesh(new THREE.ConeGeometry(S * 0.35, S * 0.5, 6), new THREE.MeshStandardMaterial({ color: '#1a1040' }));
        hood.position.y = S * 2.1;
        group.add(hood);
        // Blue flame aura
        const aura = new THREE.PointLight('#448aff', 1, TILE * 2, 2);
        aura.position.y = S * 1.5;
        group.add(aura);
    }
    if (type === 'imp') {
        // Horns
        const hornGeo = new THREE.ConeGeometry(S * 0.08, S * 0.3, 4);
        const hornMat = new THREE.MeshStandardMaterial({ color: '#880000' });
        group.add(new THREE.Mesh(hornGeo, hornMat).translateX(-S * 0.15).translateY(S * 2.1));
        group.add(new THREE.Mesh(hornGeo, hornMat).translateX(S * 0.15).translateY(S * 2.1));
    }

    group.position.set(tileX * TILE, 0, tileZ * TILE);
    scene.add(group);

    minions3D.push({
        mesh: group,
        data: { ...data, type, x: tileX, z: tileZ, lastAttack: performance.now(), alive: true }
    });
}

function updateMinions(dt, now) {
    const px = fpsCamera.posX, pz = fpsCamera.posZ;

    for (let i = minions3D.length - 1; i >= 0; i--) {
        const m = minions3D[i];
        if (now > m.data.life || m.data.hp <= 0) {
            scene.remove(m.mesh);
            minions3D.splice(i, 1);
            continue;
        }
        // Clones are immortal
        if (m.data.type === 'clone') m.data.hp = m.data.maxHp || 9999;

        // Find nearest enemy
        let nearestEnemy = null, nearestDist = Infinity;
        for (const e of enemies3D) {
            if (!e.data.alive) continue;
            const d = Math.hypot(e.data.x - m.data.x, e.data.z - m.data.z);
            if (d < nearestDist) { nearestDist = d; nearestEnemy = e; }
        }

        // Chase enemy if close, otherwise follow player
        let targetX, targetZ;
        if (nearestEnemy && nearestDist < 8) {
            targetX = nearestEnemy.data.x;
            targetZ = nearestEnemy.data.z;

            // Attack if in range
            if (nearestDist < m.data.attackRange && now - m.data.lastAttack > m.data.attackSpeed) {
                m.data.lastAttack = now;
                dealDamageToEnemy(nearestEnemy, m.data.damage);
            }
        } else {
            targetX = px;
            targetZ = pz;
        }

        // Move toward target
        const dx = targetX - m.data.x, dz = targetZ - m.data.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const followDist = nearestEnemy && nearestDist < 8 ? m.data.attackRange * 0.8 : 2;
        if (dist > followDist) {
            const spd = Math.min(m.data.speed * dt, dist * 0.15);
            m.data.x += (dx / dist) * spd;
            m.data.z += (dz / dist) * spd;
        }

        // Teleport if too far from player
        const playerDist = Math.hypot(px - m.data.x, pz - m.data.z);
        if (playerDist > 15) {
            m.data.x = px + (Math.random() - 0.5) * 2;
            m.data.z = pz + (Math.random() - 0.5) * 2;
        }

        m.mesh.position.set(m.data.x * TILE, 0, m.data.z * TILE);

        // Billboard toward camera
        m.mesh.lookAt(camera.position.x, m.mesh.position.y, camera.position.z);
    }
}

function playerDodge() {
    if (!player || !player.alive) return;
    const now = performance.now();
    if (now < player.dodgeCd) return;
    player.dodgeCd = now + 800;
    player.invincible = now + 300;
    fpsCamera.speed = player.speed * 3;
    setTimeout(() => { fpsCamera.speed = player.speed; }, 300);
}

function dealDamageToEnemy(e, dmg) {
    e.data.hp -= dmg;
    // Flash enemy red
    e.mesh.traverse(child => { if (child.isMesh && child.material) child.material.emissive?.set('#ff0000'); });
    setTimeout(() => { e.mesh.traverse(child => { if (child.isMesh && child.material && child.material.emissive) child.material.emissive.set('#000000'); }); }, 100);

    if (e.data.hp <= 0) {
        e.data.alive = false;
        e.mesh.visible = false;
        if (e.label) e.label.visible = false;
        runStats.enemiesKilled++;
        if (e.data.isBoss) runStats.bossesKilled++;

        // XP
        if (player) {
            player.xp += e.data.xp;
            if (player.xp >= player.xpToNext) {
                player.xp -= player.xpToNext;
                player.level++;
                player.xpToNext = Math.round(player.xpToNext * 1.3);
                player.maxHp += 5;
                player.hp = Math.min(player.hp + 10, player.maxHp);
                player.damage += 1;
            }
        }

        // Cordyceps — infected enemies rise as zombies
        if (e.data._infected && player) {
            spawnMinion('zombie', e.data.x, e.data.z,
                { hp: Math.round(e.data.maxHp * 0.4), damage: Math.round(e.data.damage * 0.5), speed: 1.5, radius: 0.4, attackRange: 1.5, attackSpeed: 600, life: performance.now() + 10000, color: '#ff8f00' });
        }
        // Anubis — death mark explosion
        if (e.data._deathMark && player) {
            for (const e2 of enemies3D) { if (!e2.data.alive || e2 === e) continue;
                if (Math.hypot(e2.data.x - e.data.x, e2.data.z - e.data.z) < 3) dealDamageToEnemy(e2, Math.round(player.damage * 1.5)); }
        }
        // Dog passive — 50% puppy on kill
        if (player && player.classId === 'dog' && Math.random() < 0.5) {
            spawnMinion('dog_pack', e.data.x, e.data.z,
                { hp: 25, damage: Math.round(player.damage * 0.4), speed: 3.5, radius: 0.3, attackRange: 1.2, attackSpeed: 400, life: Infinity, color: '#d7ccc8' });
        }

        // Gold
        const gold = Math.floor((5 + Math.random() * 10) * (e.data.isBoss ? 5 : 1));
        runStats.goldCollected += gold;

        // Boss kill — generate stairs
        if (e.data.isBoss) {
            // Auto-advance to next floor after a beat
            setTimeout(() => { if (gameState === 'playing') nextFloor(); }, 1500);
        }
    }
}

function dealDamageToPlayer(dmg) {
    if (!player || !player.alive) return;
    const now = performance.now();
    if (now < player.invincible) return;
    const reduced = Math.max(1, dmg - player.defense);
    player.hp -= reduced;
    // Rage class — charge meter on damage
    if (player.classId === 'rage') { if (!player._rageMeter) player._rageMeter = 0; player._rageMeter = Math.min(50, player._rageMeter + reduced); }
    player.invincible = now + 200;

    // Red flash on screen
    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,0,0,0.3);z-index:4;pointer-events:none;';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 150);

    if (player.hp <= 0) {
        player.alive = false;
        lives--;
        if (lives <= 0) { gameOver(); }
        else {
            // Respawn on next floor
            setTimeout(() => { if (gameState === 'playing') nextFloor(); }, 1000);
        }
    }
}

// ─── UPDATE ─────────────────────────────────────────────────
function update() {
    if (gameState !== 'playing') return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.getElapsedTime() * 1000;
    const now = performance.now();

    fpsCamera.update(dt, dungeon.map);
    playerLight.position.copy(camera.position);

    const px = fpsCamera.posX, pz = fpsCamera.posZ;

    // Room discovery
    const currentRoom = getRoomAt(dungeon.rooms, px, pz);
    if (currentRoom && !currentRoom.explored) {
        currentRoom.explored = true;
        syncTorchVisibility(torchLights, dungeon);
    }

    updateTorchLights(torchLights, time);
    updateMeleeSlashes();
    updateMinions(dt, now);
    updateKataPortals(time);
    updateKataGrab();
    updateThrownEnemies(dt);

    // Dash speed restore
    if (player._dashEnd && now > player._dashEnd) { fpsCamera.speed = player._dashRestore || player.speed; player._dashEnd = 0; }
    // Damage buff expiry
    if (player._dmgBuffEnd && now > player._dmgBuffEnd) { player._dmgBuff = 1; player._dmgBuffEnd = 0; }
    // Mimic form expiry
    if (player._mimicEnd && now > player._mimicEnd) { player._mimicEnd = 0; }
    // Whirlpool pull
    if (player._whirlpool && now < player._whirlpool.end) {
        for (const e of enemies3D) { if (!e.data.alive) continue;
            const d = Math.hypot(e.data.x - player._whirlpool.x, e.data.z - player._whirlpool.z);
            if (d < 7 && d > 0.5) { const a = Math.atan2(player._whirlpool.x-e.data.x, player._whirlpool.z-e.data.z); e.data.x += Math.sin(a)*dt*2; e.data.z += Math.cos(a)*dt*2; e.mesh.position.set(e.data.x*TILE,0,e.data.z*TILE); }
        }
    } else { player._whirlpool = null; }
    // Leech drain
    if (player._leechTarget && now < player._leechEnd) {
        const t = player._leechTarget; if (t.data.alive) { dealDamageToEnemy(t, 1); player.hp = Math.min(player.hp+1, player.maxHp); }
        else player._leechTarget = null;
    } else { player._leechTarget = null; }
    // Chrono HP history
    if (player.classId === 'chrono') { if (!player._hpHistory) player._hpHistory = []; player._hpHistory.push(player.hp); if (player._hpHistory.length > 180) player._hpHistory.shift(); }
    // Rage meter on damage (handled in dealDamageToPlayer)
    // Angel wings speed expiry
    if (player._wingsEnd && now > player._wingsEnd) {
        fpsCamera.speed = player.speed;
        player._wingsEnd = 0;
    }
    // Healer circle passive
    if (player._healCircle && now < player._healCircle.end) {
        if (now - player._healCircle.lastHeal > 500) {
            player._healCircle.lastHeal = now;
            const dist = Math.hypot(px - player._healCircle.x, pz - player._healCircle.z);
            if (dist < 4) player.hp = Math.min(player.hp + 5, player.maxHp);
        }
    }
    // Jin-Woo passive — spawn shadow every 2s up to 8
    if (player.classId === 'jinwoo' && player._shadowSpawning) {
        if (!player._lastShadowSpawn) player._lastShadowSpawn = 0;
        if (now - player._lastShadowSpawn >= 2000) {
            player._lastShadowSpawn = now;
            const existing = minions3D.filter(m => m.data.type === 'shadow').length;
            if (existing < 8) {
                const angle = (existing / 8) * Math.PI * 2;
                spawnMinion('shadow', px + Math.cos(angle) * 1.5, pz + Math.sin(angle) * 1.5,
                    { hp: 20, damage: 6, speed: 3.2, radius: 0.4, attackRange: 2, attackSpeed: 800, life: Infinity, color: '#6a3aaa' });
            }
        }
    }
    // Dog passive — 50% puppy on kill is handled in dealDamageToEnemy

    // Update enemies
    for (const e of enemies3D) {
        if (!e.data.alive) continue;

        const distToPlayer = Math.hypot(px - e.data.x, pz - e.data.z);
        const eRoom = getRoomAt(dungeon.rooms, e.data.x, e.data.z);
        e.mesh.visible = distToPlayer < 15 || (eRoom ? eRoom.explored : false);
        if (e.label) e.label.visible = e.mesh.visible;

        if (!e.mesh.visible) continue;

        billboardEnemy(e.mesh, camera.position);
        if (e.label) e.label.position.set(e.data.x * TILE, e.data.isBoss ? 5.5 : 3.5, e.data.z * TILE);
        animateEnemyMesh(e.mesh, e.data.enemyType, time);

        // AI — chase and attack player (with wall collision)
        if (distToPlayer < 12 && distToPlayer > e.data.radius) {
            const dx = px - e.data.x, dz = pz - e.data.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > e.data.radius + 0.3) {
                const spd = e.data.speed * dt;
                const moveX = (dx / dist) * spd;
                const moveZ = (dz / dist) * spd;
                const r = e.data.radius;
                const newX = e.data.x + moveX;
                const newZ = e.data.z + moveZ;
                // Axis-separated wall collision (same as player)
                if (isWalkable(dungeon.map, newX - r, e.data.z) && isWalkable(dungeon.map, newX + r, e.data.z)) {
                    e.data.x = newX;
                }
                if (isWalkable(dungeon.map, e.data.x, newZ - r) && isWalkable(dungeon.map, e.data.x, newZ + r)) {
                    e.data.z = newZ;
                }
                e.mesh.position.set(e.data.x * TILE, 0, e.data.z * TILE);
            }
            // Attack
            if (distToPlayer < e.data.range + 0.5 && now - e.data.lastAttack > e.data.attackSpeed) {
                e.data.lastAttack = now;
                if (e.data.type === 'ranged' || e.data.type === 'summoner') {
                    // Ranged enemy — shoot projectile
                    const angle = Math.atan2(px - e.data.x, pz - e.data.z);
                    const mesh = new THREE.Mesh(projGeo, projMatEnemy);
                    mesh.position.set(e.data.x * TILE, 1.2, e.data.z * TILE);
                    scene.add(mesh);
                    projectiles3D.push({
                        mesh, vx: Math.sin(angle) * 8, vz: Math.cos(angle) * 8,
                        damage: e.data.damage, owner: 'enemy', traveled: 0, range: 40,
                    });
                } else {
                    dealDamageToPlayer(e.data.damage);
                }
            }
        }
    }

    // Update projectiles
    for (let i = projectiles3D.length - 1; i >= 0; i--) {
        const p = projectiles3D[i];
        const dx = p.vx * dt, dz = p.vz * dt;
        p.mesh.position.x += dx;
        p.mesh.position.z += dz;
        p.traveled += Math.sqrt(dx * dx + dz * dz);

        // Wall collision
        const tileX = p.mesh.position.x / TILE, tileZ = p.mesh.position.z / TILE;
        const col = Math.floor(tileX), row = Math.floor(tileZ);
        if (row < 0 || row >= 60 || col < 0 || col >= 60 || dungeon.map[row][col] === 0) {
            scene.remove(p.mesh); projectiles3D.splice(i, 1); continue;
        }

        if (p.traveled > p.range) { scene.remove(p.mesh); projectiles3D.splice(i, 1); continue; }

        if (p.owner === 'player') {
            for (const e of enemies3D) {
                if (!e.data.alive) continue;
                const dist = Math.hypot(e.data.x - tileX, e.data.z - tileZ);
                if (dist < e.data.radius + 0.3) {
                    dealDamageToEnemy(e, p.damage);
                    scene.remove(p.mesh); projectiles3D.splice(i, 1); break;
                }
            }
        } else {
            const dist = Math.hypot(px - tileX, pz - tileZ);
            if (dist < 0.5) {
                dealDamageToPlayer(p.damage);
                scene.remove(p.mesh); projectiles3D.splice(i, 1);
            }
        }
    }

    updateHUD();
}

// ─── HUD ────────────────────────────────────────────────────
function updateHUD() {
    if (!player) return;
    const now = performance.now();

    document.getElementById('hud-class-name').textContent = `${player.cls.name} Lv.${player.level}`;
    document.getElementById('hud-hp-bar').style.width = `${Math.max(0, player.hp / player.maxHp * 100)}%`;
    document.getElementById('hud-hp-text').textContent = `${Math.ceil(player.hp)}/${player.maxHp}`;
    document.getElementById('hud-xp-bar').style.width = `${player.xp / player.xpToNext * 100}%`;

    const specialReady = now - player.lastSpecial >= player.specialCooldown;
    document.getElementById('hud-special-cd').textContent = `[ ${player.cls.specialName} ] ${specialReady ? 'READY' : Math.ceil((player.specialCooldown - (now - player.lastSpecial)) / 1000) + 's'}`;
    document.getElementById('hud-special-cd').style.color = specialReady ? '#daa520' : '#444';

    document.getElementById('hud-floor').textContent = `Floor ${currentFloor}`;
    document.getElementById('hud-lives').textContent = `Lives: ${lives}`;
    document.getElementById('hud-lives').style.color = lives > 2 ? '#00ffcc' : lives > 1 ? '#ffeb3b' : '#ff0055';
    document.getElementById('hud-gold').textContent = `Gold: ${runStats.goldCollected}`;

    // Boss HP bar
    const boss = enemies3D.find(e => e.data.isBoss && e.data.alive);
    const bossBar = document.getElementById('hud-boss-bar');
    if (boss && boss.mesh.visible) {
        bossBar.style.display = '';
        document.getElementById('hud-boss-name').textContent = boss.data.name;
        document.getElementById('hud-boss-hp').style.width = `${Math.max(0, boss.data.hp / boss.data.maxHp * 100)}%`;
    } else {
        bossBar.style.display = 'none';
    }

    drawMinimap();
}

function drawMinimap() {
    const canvas = document.getElementById('minimap-canvas');
    const ctx = canvas.getContext('2d');
    const size = 120, scale = size / 60;

    ctx.fillStyle = 'rgba(10,10,15,0.85)';
    ctx.fillRect(0, 0, size, size);

    for (const rm of dungeon.rooms) {
        if (!rm.explored) ctx.fillStyle = '#060612';
        else if (rm.type === 'boss') ctx.fillStyle = '#ff0055';
        else if (rm.type === 'treasure') ctx.fillStyle = '#eeff00';
        else if (rm.type === 'shop') ctx.fillStyle = '#00ffee';
        else ctx.fillStyle = '#1a1a3a';
        ctx.fillRect(rm.x * scale, rm.y * scale, rm.w * scale, rm.h * scale);
    }

    // Enemy dots
    for (const e of enemies3D) {
        if (!e.data.alive) continue;
        ctx.fillStyle = e.data.isBoss ? '#ff0055' : '#ff4444';
        ctx.fillRect(e.data.x * scale - 1, e.data.z * scale - 1, e.data.isBoss ? 3 : 2, e.data.isBoss ? 3 : 2);
    }

    ctx.fillStyle = '#fff';
    ctx.fillRect(fpsCamera.posX * scale - 1.5, fpsCamera.posZ * scale - 1.5, 3, 3);
    ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(fpsCamera.posX * scale, fpsCamera.posZ * scale);
    ctx.lineTo(fpsCamera.posX * scale - Math.sin(fpsCamera.yaw) * 6, fpsCamera.posZ * scale - Math.cos(fpsCamera.yaw) * 6);
    ctx.stroke();
}

// ─── SCREEN MANAGEMENT ──────────────────────────────────────
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    if (id) document.getElementById(id).classList.add('active');
}

// ─── GAME LOOP ──────────────────────────────────────────────
function gameLoop() {
    update();
    renderer.render(scene, camera);
    requestAnimationFrame(gameLoop);
}

init();
gameLoop();
