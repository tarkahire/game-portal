// ═══════════════════════════════════════════════════════════════
//  DUNGEON CRAWLER 3D — Main game
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { TILE, WALL_HEIGHT, EYE_HEIGHT, PAL } from './constants.js';
import { generateDungeon, getRoomAt, isWalkable } from './dungeon/generator.js';
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
            if (e.code === 'KeyZ') fruitAbility('z');
            if (e.code === 'KeyX') fruitAbility('x');
            if (e.code === 'KeyC') fruitAbility('c');
            if (e.code === 'KeyV') fruitAbility('v');
            if (e.code === 'KeyF') fruitAbility('f');
            if (e.code === 'KeyQ') playerDodge();
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

// ─── PLAYER MODEL BUILDERS ──────────────────────────────────
function buildGenericPlayerModel(cls) {
    const pm = new THREE.Group();
    const bodyCol = cls.color;
    const pmBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 1.2, 6), new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.5 }));
    pmBody.position.y = 1.0; pm.add(pmBody);
    const pmHead = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), new THREE.MeshStandardMaterial({ color: '#e8d0b0', roughness: 0.5 }));
    pmHead.position.y = 1.85; pm.add(pmHead);
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    pm.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), eyeMat).translateX(-0.1).translateY(1.9).translateZ(0.2));
    pm.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), eyeMat).translateX(0.1).translateY(1.9).translateZ(0.2));
    const legMat = new THREE.MeshStandardMaterial({ color: '#1a1a2e' });
    pm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.6, 4), legMat).translateX(-0.12).translateY(0.3));
    pm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.6, 4), legMat).translateX(0.12).translateY(0.3));
    addPlayerLabel(pm, cls.name, bodyCol);
    return pm;
}

function addPlayerLabel(pm, name, color) {
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 128; labelCanvas.height = 32;
    const lctx = labelCanvas.getContext('2d');
    lctx.fillStyle = color; lctx.font = 'bold 16px monospace'; lctx.textAlign = 'center';
    lctx.fillText(name, 64, 20);
    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true }));
    labelSprite.scale.set(1.5, 0.4, 1);
    labelSprite.position.y = 2.3;
    pm.add(labelSprite);
}

// ─── BEAST FRUIT TRANSFORM MODELS ───────────────────────────
function buildDragonModel() {
    const pm = new THREE.Group();
    const greenMat = new THREE.MeshStandardMaterial({ color: '#2e7d32', emissive: '#1b5e20', emissiveIntensity: 0.2, roughness: 0.5 });
    const darkGreen = new THREE.MeshStandardMaterial({ color: '#1b5e20', roughness: 0.6 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: '#4caf50', emissive: '#388e3c', emissiveIntensity: 0.1, roughness: 0.4 });
    const hornMat = new THREE.MeshStandardMaterial({ color: '#3e2723', roughness: 0.7, metalness: 0.3 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#ffeb3b' });

    // ── Muscular torso ──
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 1.8, 8), greenMat);
    torso.position.y = 1.3; pm.add(torso);
    // Broad chest/shoulders
    const chest = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.6, 0.7), greenMat);
    chest.position.y = 2.0; pm.add(chest);
    // Lighter belly
    const belly = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.15), bellyMat);
    belly.position.set(0, 1.4, 0.25); pm.add(belly);

    // ── Neck + Head ──
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.5, 6), greenMat);
    neck.position.y = 2.4; pm.add(neck);
    // Dragon head — angular snout
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.5), darkGreen);
    head.position.set(0, 2.8, 0.1); pm.add(head);
    // Snout/jaw extending forward
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.4), darkGreen);
    snout.position.set(0, 2.65, 0.45); pm.add(snout);
    // Lower jaw
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.35), new THREE.MeshStandardMaterial({ color: '#1a1a1a' }));
    jaw.position.set(0, 2.55, 0.4); pm.add(jaw);
    // Glowing yellow eyes
    pm.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat).translateX(-0.14).translateY(2.88).translateZ(0.32));
    pm.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat).translateX(0.14).translateY(2.88).translateZ(0.32));
    // Eye glow
    pm.add(new THREE.PointLight('#ffeb3b', 0.8, TILE, 2).translateY(2.9).translateZ(0.3));

    // ── Horns (curved back) ──
    for (let s = -1; s <= 1; s += 2) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.5, 5), hornMat);
        horn.position.set(s * 0.18, 3.1, -0.1);
        horn.rotation.x = 0.4; horn.rotation.z = s * 0.2;
        pm.add(horn);
    }

    // ── Bat-like Wings (articulated — separate pivots for flapping) ──
    for (let s = -1; s <= 1; s += 2) {
        const wingPivot = new THREE.Group();
        wingPivot.position.set(s * 0.6, 2.1, -0.2);
        // Upper wing membrane — large flat triangle
        const wingGeo = new THREE.BufferGeometry();
        const verts = new Float32Array([
            0, 0, 0,
            s * 1.8, 0.3, -0.3,
            s * 1.2, -1.0, 0.1,
            0, 0, 0,
            s * 1.2, -1.0, 0.1,
            s * 0.3, -0.8, 0.2,
        ]);
        wingGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        wingGeo.computeVertexNormals();
        const wingMat = new THREE.MeshStandardMaterial({ color: '#2e7d32', emissive: '#1b5e20', emissiveIntensity: 0.15, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
        wingPivot.add(new THREE.Mesh(wingGeo, wingMat));
        // Wing bone/strut
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 1.6, 4), hornMat);
        strut.position.set(s * 0.9, -0.3, -0.1);
        strut.rotation.z = s * 0.5;
        wingPivot.add(strut);
        pm.add(wingPivot);
        if (s === -1) pm._leftWing = wingPivot; else pm._rightWing = wingPivot;
    }

    // ── Arms with claws ──
    for (let s = -1; s <= 1; s += 2) {
        // Shoulder
        pm.add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), greenMat).translateX(s * 0.7).translateY(2.05));
        // Upper arm
        pm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.6, 5), greenMat).translateX(s * 0.75).translateY(1.6));
        // Forearm
        pm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 5), greenMat).translateX(s * 0.8).translateY(1.15));
        // Clawed hand
        const hand = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.15), darkGreen);
        hand.position.set(s * 0.82, 0.85, 0.05); pm.add(hand);
        // 3 claws per hand
        for (let c = 0; c < 3; c++) {
            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.15, 4), new THREE.MeshStandardMaterial({ color: '#e0e0e0', metalness: 0.6 }));
            claw.position.set(s * 0.82 + (c - 1) * 0.06, 0.78, 0.12);
            claw.rotation.x = Math.PI * 0.7;
            pm.add(claw);
        }
    }

    // ── Legs ──
    for (let s = -1; s <= 1; s += 2) {
        pm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.7, 6), greenMat).translateX(s * 0.25).translateY(0.4));
        pm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.4, 5), darkGreen).translateX(s * 0.25).translateY(0.05));
        // Feet with claws
        pm.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.25), darkGreen).translateX(s * 0.25).translateY(-0.15).translateZ(0.05));
    }

    // ── Spiked tail ──
    const tail1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.8, 5), greenMat);
    tail1.position.set(0, 0.6, -0.5); tail1.rotation.x = 0.6; pm.add(tail1);
    const tail2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.03, 0.7, 5), greenMat);
    tail2.position.set(0, 0.35, -1.0); tail2.rotation.x = 0.8; pm.add(tail2);
    // Tail spike
    pm.add(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), hornMat).translateY(0.2).translateZ(-1.35));

    // ── Spine spikes (along back) ──
    for (let i = 0; i < 5; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.18, 4), hornMat);
        spike.position.set(0, 1.8 + i * 0.25, -0.3);
        spike.rotation.x = 0.3;
        pm.add(spike);
    }

    // ── Fire aura glow ──
    pm.add(new THREE.PointLight('#4caf50', 2, TILE * 4, 2).translateY(1.5));
    pm.add(new THREE.PointLight('#ffeb3b', 1, TILE * 2, 2).translateY(2.8).translateZ(0.4));

    return pm;
}

function buildLeopardModel() {
    const pm = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: '#64ffda', emissive: '#1de9b6', emissiveIntensity: 0.2, roughness: 0.4 });
    const spotMat = new THREE.MeshStandardMaterial({ color: '#00695c', roughness: 0.5 });
    pm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 1.5, 8), mat).translateY(1.1));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), mat);
    head.position.y = 2.0; head.scale.set(1, 0.9, 1.1); pm.add(head);
    for (let s = -1; s <= 1; s += 2) pm.add(new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), mat).translateX(s * 0.15).translateY(2.3));
    pm.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 5), new THREE.MeshBasicMaterial({color:'#ffd600'})).translateX(-0.1).translateY(2.05).translateZ(0.24));
    pm.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 5), new THREE.MeshBasicMaterial({color:'#ffd600'})).translateX(0.1).translateY(2.05).translateZ(0.24));
    for (let i = 0; i < 8; i++) pm.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), spotMat).translateX((Math.random()-0.5)*0.4).translateY(0.8+Math.random()).translateZ((Math.random()-0.5)*0.3));
    for (let s = -1; s <= 1; s += 2) { pm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.7, 5), mat).translateX(s*0.4).translateY(1.4)); }
    pm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 1, 5), mat).translateZ(-0.4).translateY(0.7));
    for (let s = -1; s <= 1; s += 2) pm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.6, 5), mat).translateX(s*0.15).translateY(0.35));
    pm.add(new THREE.PointLight('#64ffda', 2, TILE * 4, 2));
    return pm;
}

function buildBuddhaModel() {
    const pm = new THREE.Group();
    const goldMat = new THREE.MeshStandardMaterial({ color: '#ffd600', emissive: '#ffab00', emissiveIntensity: 0.5, metalness: 0.4, roughness: 0.3 });
    pm.add(new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 10), goldMat).translateY(1.2));
    pm.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), goldMat).translateY(2.3));
    pm.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), goldMat).translateY(2.75));
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#fff176' });
    pm.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.04), eyeMat).translateX(-0.12).translateY(2.35).translateZ(0.35));
    pm.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.04), eyeMat).translateX(0.12).translateY(2.35).translateZ(0.35));
    for (let s = -1; s <= 1; s += 2) {
        pm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.9, 6), goldMat).translateX(s*0.85).translateY(1.5));
        pm.add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), goldMat).translateX(s*0.9).translateY(0.95));
    }
    for (let s = -1; s <= 1; s += 2) pm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.6, 6), goldMat).translateX(s*0.3).translateY(0.25));
    pm.add(new THREE.PointLight('#ffd600', 4, TILE * 6, 2));
    return pm;
}

function buildPhoenixModel() {
    const pm = new THREE.Group();
    const blueMat = new THREE.MeshStandardMaterial({ color: '#00bcd4', emissive: '#00838f', emissiveIntensity: 0.4, roughness: 0.4 });
    const flameMat = new THREE.MeshStandardMaterial({ color: '#ffeb3b', emissive: '#ffd600', emissiveIntensity: 0.6, roughness: 0.3 });
    pm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 1.2, 8), blueMat).translateY(1.1));
    pm.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), blueMat).translateY(1.9));
    pm.add(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), flameMat).translateY(1.85).translateZ(0.25));
    pm.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 5), new THREE.MeshBasicMaterial({color:'#fff176'})).translateX(-0.08).translateY(1.95).translateZ(0.18));
    pm.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 5), new THREE.MeshBasicMaterial({color:'#fff176'})).translateX(0.08).translateY(1.95).translateZ(0.18));
    for (let s = -1; s <= 1; s += 2) {
        const wing = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.8, 3), flameMat);
        wing.position.set(s * 1, 1.5, -0.2); wing.rotation.z = s * 0.6; pm.add(wing);
        pm.add(new THREE.PointLight('#00bcd4', 1.5, TILE * 2, 2).translateX(s * 0.8).translateY(1.5));
    }
    for (let i = 0; i < 3; i++) pm.add(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.8, 4), blueMat).translateX((i-1)*0.15).translateY(0.6).translateZ(-0.4));
    for (let s = -1; s <= 1; s += 2) pm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.5, 4), flameMat).translateX(s*0.12).translateY(0.3));
    pm.add(new THREE.PointLight('#00bcd4', 3, TILE * 5, 2));
    return pm;
}

function buildVenomModel() {
    const pm = new THREE.Group();
    const venomMat = new THREE.MeshStandardMaterial({ color: '#2e7d32', emissive: '#76ff03', emissiveIntensity: 0.4, roughness: 0.5 });
    const darkMat = new THREE.MeshStandardMaterial({ color: '#1b5e20', roughness: 0.7 });
    pm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 1.8, 8), venomMat).translateY(1.2));
    for (let h = -1; h <= 1; h++) {
        pm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.8, 5), venomMat).translateX(h*0.3).translateY(2.4));
        pm.add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), darkMat).translateX(h*0.3).translateY(2.9).translateZ(0.1));
        const eMat = new THREE.MeshBasicMaterial({ color: '#76ff03' });
        pm.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), eMat).translateX(h*0.3-0.06).translateY(2.95).translateZ(0.22));
        pm.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), eMat).translateX(h*0.3+0.06).translateY(2.95).translateZ(0.22));
    }
    for (let s = -1; s <= 1; s += 2) pm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.8, 5), venomMat).translateX(s*0.55).translateY(1.5));
    for (let s = -1; s <= 1; s += 2) pm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.7, 5), darkMat).translateX(s*0.25).translateY(0.3));
    pm.add(new THREE.PointLight('#76ff03', 3, TILE * 5, 2));
    return pm;
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

    // Reset fruit state
    player._transformed = false;
    player._flying = false;
    player._abilityCds = { z: 0, x: 0, c: 0, v: 0, f: 0 };
    player._comboStep = 0;
    player._comboTimer = 0;

    // Create player model for 3rd person view
    if (fpsCamera.playerModel) scene.remove(fpsCamera.playerModel);
    let pm;
    if (player.classId === 'dragon') {
        pm = buildDragonModel();
        pm.scale.setScalar(0.6); // scaled down to fit dungeon
        addPlayerLabel(pm, 'DRAGON', '#2e7d32');
        player._flying = true; // dragon always flies
        fpsCamera.flyHeight = 1.5; // hover above ground
    } else {
        pm = buildGenericPlayerModel(player.cls);
        fpsCamera.flyHeight = 0;
    }
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

// ── Screen Shake ──
let shakeIntensity = 0;
let shakeDuration = 0;
let shakeTime = 0;

function screenShake(intensity, duration) {
    shakeIntensity = Math.max(shakeIntensity, intensity);
    shakeDuration = Math.max(shakeDuration, duration);
    shakeTime = 0;
}

function updateScreenShake(dt) {
    if (shakeDuration <= 0) return;
    shakeTime += dt * 1000;
    if (shakeTime >= shakeDuration) {
        shakeDuration = 0;
        shakeIntensity = 0;
        return;
    }
    const decay = 1 - shakeTime / shakeDuration;
    const amp = shakeIntensity * decay;
    camera.position.x += (Math.random() - 0.5) * amp;
    camera.position.y += (Math.random() - 0.5) * amp * 0.5;
    camera.position.z += (Math.random() - 0.5) * amp;
}

// ── Hitstop (brief freeze on big hits) ──
let hitstopUntil = 0;

function triggerHitstop(durationMs) {
    hitstopUntil = Math.max(hitstopUntil, performance.now() + durationMs);
}

// ── Floating Damage Numbers ──
const dmgNumbers = [];

function spawnDmgNumber(worldX, worldY, worldZ, amount, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 48;
    const ctx = canvas.getContext('2d');
    ctx.font = `bold ${amount > 20 ? 36 : 28}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.fillText(amount, 66, 36);
    ctx.fillStyle = color || '#ffffff';
    ctx.fillText(amount, 64, 34);
    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    const s = amount > 30 ? 1.8 : amount > 15 ? 1.3 : 0.9;
    sprite.scale.set(s, s * 0.4, 1);
    sprite.position.set(worldX + (Math.random() - 0.5) * 0.5, worldY, worldZ + (Math.random() - 0.5) * 0.5);
    scene.add(sprite);
    dmgNumbers.push({ sprite, life: 40, vy: 0.04 + Math.random() * 0.02 });
}

function updateDmgNumbers() {
    for (let i = dmgNumbers.length - 1; i >= 0; i--) {
        const d = dmgNumbers[i];
        d.life--;
        d.sprite.position.y += d.vy;
        d.sprite.material.opacity = d.life / 40;
        if (d.life <= 0) {
            scene.remove(d.sprite);
            d.sprite.material.map.dispose();
            d.sprite.material.dispose();
            dmgNumbers.splice(i, 1);
        }
    }
}

// ── Speed Lines (screen-space overlay during dodge/dash) ──
let speedLineDiv = null;

function showSpeedLines(durationMs) {
    if (!speedLineDiv) {
        speedLineDiv = document.createElement('div');
        speedLineDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:3;background:radial-gradient(ellipse at center,transparent 40%,rgba(255,255,255,0.15) 100%);opacity:0;transition:opacity 0.05s;';
        document.body.appendChild(speedLineDiv);
    }
    speedLineDiv.style.opacity = '1';
    speedLineDiv.style.background = 'radial-gradient(ellipse at center,transparent 30%,rgba(200,220,255,0.2) 70%,rgba(255,255,255,0.35) 100%)';
    setTimeout(() => { if (speedLineDiv) speedLineDiv.style.opacity = '0'; }, durationMs);
}

// ── FOV Punch (briefly widen FOV for speed feel) ──
let fovPunchTarget = 0;
let fovPunchDecay = 0;
const BASE_FOV = 75;

function fovPunch(amount, decayRate) {
    fovPunchTarget = Math.max(fovPunchTarget, amount);
    fovPunchDecay = decayRate || 0.15;
}

function updateFovPunch() {
    if (fovPunchTarget > 0.1) {
        camera.fov = BASE_FOV + fovPunchTarget;
        fovPunchTarget *= (1 - fovPunchDecay);
        camera.updateProjectionMatrix();
    } else if (camera.fov !== BASE_FOV) {
        camera.fov = BASE_FOV;
        fovPunchTarget = 0;
        camera.updateProjectionMatrix();
    }
}

// ── Improved Slash Trail (multiple trail segments) ──
const slashTrails = [];
const SLASH_POOL_SIZE = 8;
let slashPool = [];
let slashPoolInit = false;

// Impact spark particles
const sparkPool = [];
const SPARK_POOL_SIZE = 30;
let sparkPoolInit = false;

function initSlashPool() {
    if (slashPoolInit) return;
    slashPoolInit = true;
    // Slash planes — flat quads that face the camera, with gradient
    for (let i = 0; i < SLASH_POOL_SIZE; i++) {
        // Curved slash shape — PlaneGeometry curved via vertex displacement
        const geo = new THREE.PlaneGeometry(2.0, 0.4, 12, 1);
        const pos = geo.attributes.position;
        for (let v = 0; v < pos.count; v++) {
            const x = pos.getX(v);
            // Curve into an arc
            const t = (x + 1) / 2; // 0..1
            pos.setY(v, pos.getY(v) + Math.sin(t * Math.PI) * 0.6);
        }
        geo.computeVertexNormals();
        const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false;
        scene.add(mesh);
        slashPool.push(mesh);
    }
}

function initSparkPool() {
    if (sparkPoolInit) return;
    sparkPoolInit = true;
    for (let i = 0; i < SPARK_POOL_SIZE; i++) {
        const geo = new THREE.SphereGeometry(0.08, 4, 4);
        const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false;
        scene.add(mesh);
        sparkPool.push({ mesh, vx: 0, vy: 0, vz: 0, life: 0 });
    }
}

function spawnImpactSparks(worldX, worldY, worldZ, color, count) {
    initSparkPool();
    for (let i = 0; i < count; i++) {
        let spark = null;
        for (const s of sparkPool) { if (!s.mesh.visible) { spark = s; break; } }
        if (!spark) continue;
        spark.mesh.position.set(worldX, worldY, worldZ);
        spark.mesh.material.color.set(color);
        spark.mesh.material.opacity = 1;
        spark.mesh.visible = true;
        spark.vx = (Math.random() - 0.5) * 8;
        spark.vy = Math.random() * 6 + 2;
        spark.vz = (Math.random() - 0.5) * 8;
        spark.life = 15 + Math.random() * 10;
        spark.maxLife = spark.life;
    }
}

function spawnMeleeSlash(color) {
    initSlashPool();
    const yaw = fpsCamera.yaw;
    const pitch = fpsCamera.pitch || 0;
    const fly = fpsCamera.flyHeight || 0;
    const dirX = -Math.sin(yaw);
    const dirZ = -Math.cos(yaw);
    const baseX = fpsCamera.posX * TILE + dirX * 2;
    const baseY = EYE_HEIGHT + fly + Math.sin(pitch) * 1.5;
    const baseZ = fpsCamera.posZ * TILE + dirZ * 2;

    // Combo step determines slash angle (alternating diagonal)
    const step = player?._comboStep || 0;
    const angles = [0.7, -0.7, 0.5, -0.9]; // alternating diagonal tilts
    const tilt = angles[step % 4];

    // Spawn 2 layered slash planes — one bright, one faded trail
    for (let t = 0; t < 2; t++) {
        let mesh = null;
        for (const s of slashPool) { if (!s.visible) { mesh = s; break; } }
        if (!mesh) continue;

        mesh.position.set(baseX, baseY, baseZ);
        // Billboard: face the camera
        mesh.lookAt(camera.position);
        // Then apply diagonal tilt
        mesh.rotateZ(tilt + t * 0.15);
        mesh.material.color.set(color);
        mesh.material.opacity = t === 0 ? 0.9 : 0.5;
        const sc = 0.8 + t * 0.3;
        mesh.scale.set(sc, sc, sc);
        mesh.visible = true;
        slashTrails.push({ mesh, life: 8 + t * 3, maxLife: 8 + t * 3 });
    }
}

function updateMeleeSlashes() {
    for (let i = slashTrails.length - 1; i >= 0; i--) {
        const s = slashTrails[i];
        s.life--;
        const t = s.life / s.maxLife;
        s.mesh.material.opacity = t * 0.85;
        s.mesh.scale.multiplyScalar(1.03);
        if (s.life <= 0) {
            s.mesh.visible = false;
            slashTrails.splice(i, 1);
        }
    }
    // Update sparks
    for (const sp of sparkPool) {
        if (!sp.mesh.visible) continue;
        sp.life--;
        sp.mesh.position.x += sp.vx * 0.016;
        sp.mesh.position.y += sp.vy * 0.016;
        sp.mesh.position.z += sp.vz * 0.016;
        sp.vy -= 15 * 0.016; // gravity
        sp.mesh.material.opacity = sp.life / sp.maxLife;
        sp.mesh.scale.setScalar(sp.life / sp.maxLife);
        if (sp.life <= 0) sp.mesh.visible = false;
    }
}

// ── Walking Animation (3rd person leg/arm bob) ──
let walkCycle = 0;

function updateWalkAnimation(dt) {
    const pm = fpsCamera.playerModel;
    if (!pm || !fpsCamera.thirdPerson) return;

    const moving = fpsCamera.keys['KeyW'] || fpsCamera.keys['KeyS'] ||
                   fpsCamera.keys['KeyA'] || fpsCamera.keys['KeyD'] ||
                   fpsCamera.keys['ArrowUp'] || fpsCamera.keys['ArrowDown'] ||
                   fpsCamera.keys['ArrowLeft'] || fpsCamera.keys['ArrowRight'];

    walkCycle += dt * (moving ? 10 : 4); // slower idle cycle when not moving

    // Dragon — wing flapping + hover bob (always active)
    if (player.classId === 'dragon' || (player._transformed && player.cls?.type === 'beast')) {
        const flapSpeed = moving ? 8 : 3;
        const flapAngle = Math.sin(walkCycle * flapSpeed * 0.3) * (moving ? 0.6 : 0.3);
        if (pm._leftWing) pm._leftWing.rotation.z = -flapAngle - 0.2;
        if (pm._rightWing) pm._rightWing.rotation.z = flapAngle + 0.2;
        // Hover bob
        const hoverBob = Math.sin(walkCycle * 1.5) * 0.1;
        const fly = fpsCamera.flyHeight || 0;
        pm.position.y = fly + hoverBob;
        // Slight forward lean when moving
        if (pm.children[0]) {
            // lean the whole model forward slightly
        }
        return;
    }

    // Generic walk bob
    if (moving) {
        const bob = Math.abs(Math.sin(walkCycle * 2)) * 0.08;
        pm.position.y = (fpsCamera.flyHeight || 0) + bob;
    } else {
        pm.position.y = fpsCamera.flyHeight || 0;
    }
}


// ─── COMBAT — M1 COMBO SYSTEM (4-hit chain like Blox Fruits) ────
const COMBO_WINDOW = 600; // ms to continue combo
const COMBO_STEPS = [
    { dmgMult: 1.0, kb: 0.3, slashScale: 1.0 },
    { dmgMult: 1.0, kb: 0.3, slashScale: 1.1 },
    { dmgMult: 1.2, kb: 0.5, slashScale: 1.2 },
    { dmgMult: 1.5, kb: 1.5, slashScale: 1.4 }, // finisher — extra KB
];

function playerAttack() {
    if (!player || !player.alive) return;
    const now = performance.now();
    if (now - player.lastAttack < player.attackSpeed) return;
    player.lastAttack = now;

    // Combo chain logic
    if (!player._comboStep) player._comboStep = 0;
    if (!player._comboTimer) player._comboTimer = 0;

    // If within combo window, advance step; otherwise reset
    if (now - player._comboTimer > COMBO_WINDOW) player._comboStep = 0;
    const step = COMBO_STEPS[player._comboStep];
    player._comboTimer = now;

    const px = fpsCamera.posX, pz = fpsCamera.posZ;
    const yaw = fpsCamera.yaw;
    const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);
    const range = 3.0 + (player._transformed ? 1.5 : 0);
    const dmg = Math.round(player.damage * step.dmgMult);
    const isFinisher = player._comboStep === 3;

    // Hit enemies in arc in front
    for (const e of enemies3D) {
        if (!e.data.alive) continue;
        const dx = e.data.x - px, dz = e.data.z - pz;
        const d = Math.hypot(dx, dz);
        if (d > range || d < 0.1) continue;
        const a = Math.atan2(-dx, -dz);
        let ad = a - yaw;
        while (ad > Math.PI) ad -= Math.PI * 2;
        while (ad < -Math.PI) ad += Math.PI * 2;
        if (Math.abs(ad) < Math.PI * 0.5) {
            dealDamageToEnemy(e, dmg);
            // Knockback
            e.data.x += (dx / d) * step.kb;
            e.data.z += (dz / d) * step.kb;
            e.mesh.position.set(e.data.x * TILE, 0, e.data.z * TILE);
        }
    }

    // Visual effects per step
    spawnMeleeSlash(player.cls.color);

    // Finisher (4th hit) — extra effects
    if (isFinisher) {
        screenShake(0.25, 100);
        triggerHitstop(50);
        fovPunch(8, 0.15);
        // Double slash for impact
        setTimeout(() => spawnMeleeSlash(player.cls.color), 50);
    }

    // Advance combo
    player._comboStep = (player._comboStep + 1) % 4;
}

// ─── FRUIT ABILITY DISPATCHER (Z/X/C/V/F) ──────────────────
function fruitAbility(slot) {
    if (!player || !player.alive) return;
    const now = performance.now();
    const px = fpsCamera.posX, pz = fpsCamera.posZ;
    const yaw = fpsCamera.yaw;
    const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);

    // Cooldown check per slot
    if (!player._abilityCds) player._abilityCds = { z: 0, x: 0, c: 0, v: 0, f: 0 };
    const cd = player.cls.abilityCooldowns?.[slot] || 5000;
    if (now - player._abilityCds[slot] < cd) return;
    player._abilityCds[slot] = now;

    // Helpers (same as old system)
    const aoeHit = (range, dmgMult) => { for (const e of enemies3D) { if (!e.data.alive) continue; if (Math.hypot(e.data.x-px,e.data.z-pz)<range) dealDamageToEnemy(e, Math.round(player.damage*dmgMult)); }};
    const coneHit = (range, halfAngle, dmgMult) => { for (const e of enemies3D) { if (!e.data.alive) continue; const dx=e.data.x-px,dz=e.data.z-pz; const dist=Math.hypot(dx,dz); if(dist>range)continue; const a=Math.atan2(-dx,-dz); let d=a-yaw; while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2; if(Math.abs(d)<halfAngle) dealDamageToEnemy(e, Math.round(player.damage*dmgMult)); }};
    const stunNear = (range, dur) => { for (const e of enemies3D) { if (!e.data.alive) continue; if (Math.hypot(e.data.x-px,e.data.z-pz)<range) e.data.lastAttack = now + dur; }};
    const shootProj = (color, spd, dmg, count, spread) => { for (let i=0;i<count;i++){const a=yaw+(i-(count-1)/2)*(spread||0.12);const dx=-Math.sin(a),dz=-Math.cos(a);const m=new THREE.Mesh(projGeo,new THREE.MeshBasicMaterial({color}));m.position.set(px*TILE+dx*0.8,EYE_HEIGHT-0.3,pz*TILE+dz*0.8);m.add(new THREE.PointLight(color,2,TILE*3,2));scene.add(m);projectiles3D.push({mesh:m,vx:dx*(spd||14),vz:dz*(spd||14),damage:Math.round(dmg),owner:'player',traveled:0,range:45});}};
    const doDash = (speed, dur, dmgMult, range) => { fpsCamera.speed=speed; player.invincible=now+dur; player._dashEnd=now+dur; player._dashRestore=player.speed; coneHit(range||6, 0.5, dmgMult||1.5); showSpeedLines(dur); fovPunch(10, 0.12); };
    const summon = (type, count, data) => { for(let i=0;i<count;i++){const a=(i/count)*Math.PI*2; spawnMinion(type,px+Math.cos(a)*1.5,pz+Math.sin(a)*1.5,data);} };
    const pullEnemies = (range, strength) => { for (const e of enemies3D) { if (!e.data.alive) continue; const dx=px-e.data.x,dz=pz-e.data.z; const d=Math.hypot(dx,dz); if(d<range&&d>1){e.data.x+=(dx/d)*strength;e.data.z+=(dz/d)*strength;e.mesh.position.set(e.data.x*TILE,0,e.data.z*TILE);}}};
    const toggleFlight = () => { if(player._flying){player._flying=false;fpsCamera.speed=player.speed;}else{player._flying=true;fpsCamera.speed=player.speed*2;} spawnMeleeSlash(player.cls.color); };

    // Beast transform helper
    const beastTransform = (statMult, scaleFactor, auraColor, modelBuilder) => {
        if (player._transformed) return;
        player._transformed = true;
        player.damage = Math.round(player.damage * statMult.dmg);
        player.maxHp = Math.round(player.maxHp * statMult.hp);
        player.hp = player.maxHp;
        player.speed *= statMult.spd;
        fpsCamera.speed = player.speed;
        player.attackSpeed = Math.round(player.attackSpeed * 0.7);
        if (fpsCamera.playerModel) scene.remove(fpsCamera.playerModel);
        const pm = modelBuilder();
        pm.scale.setScalar(scaleFactor);
        addPlayerLabel(pm, player.cls.name.toUpperCase(), auraColor);
        pm.visible = fpsCamera.thirdPerson;
        scene.add(pm);
        fpsCamera.playerModel = pm;
        player.invincible = now + 2000;
        aoeHit(6, 2); stunNear(6, 2000);
        screenShake(0.5, 300); triggerHitstop(80);
        spawnMeleeSlash(auraColor);
        setTimeout(() => spawnMeleeSlash(auraColor), 200);
        setTimeout(() => spawnMeleeSlash(auraColor), 400);
    };

    // ─── FRUIT ABILITIES ────────────────────────────────────────
    const id = player.classId;

    // ══════ DOUGH ══════
    if (id === 'dough') {
        if (slot === 'z') { // Roller Donut — rolling projectile
            shootProj('#f5f0e0', 10, player.damage * 2, 1, 0);
            spawnMeleeSlash('#f5f0e0');
        } else if (slot === 'x') { // Restless Dough Barrage — rapid fists forward
            for (let f = 0; f < 10; f++) {
                const dist = 2 + Math.random() * 3;
                setTimeout(() => {
                    shootProj('#f5f0e0', 16, player.damage * 0.8, 1, (Math.random()-0.5)*0.3);
                }, f * 60);
            }
            spawnMeleeSlash('#f5f0e0');
        } else if (slot === 'c') { // Dough Fist Fusillade — channeled barrage
            player._fusilladeActive = true;
            player._fusilladeEnd = now + 5000;
            player._fusilladeHits = 0;
            player._fusilladeMaxHits = 16;
            player._fusilladeLastPunch = 0;
            player._fusilladeSide = 0;
        } else if (slot === 'v') { // Unstoppable Dough — big AoE slam
            aoeHit(6, 3); stunNear(6, 2500);
            screenShake(0.4, 200); triggerHitstop(60);
            spawnMeleeSlash('#f5f0e0');
        } else if (slot === 'f') { // Dough Flight
            toggleFlight();
        }
    }

    // ══════ DRAGON ══════
    else if (id === 'dragon') {
        if (slot === 'z') { // Fire Breath — cone of fire
            coneHit(6, 0.5, 2); spawnMeleeSlash('#ff6600');
            shootProj('#ff3d00', 12, player.damage, 3, 0.15);
        } else if (slot === 'x') { // Dragon Claw — dash + claw swipe
            doDash(player.speed * 4, 300, 2.5, 5);
            spawnMeleeSlash('#ff6600');
        } else if (slot === 'c') { // Fire Shower — rain fireballs in area
            for (let i = 0; i < 8; i++) {
                setTimeout(() => {
                    const ox = (Math.random()-0.5)*6, oz = (Math.random()-0.5)*6;
                    const m = new THREE.Mesh(projGeo, new THREE.MeshBasicMaterial({color:'#ff3d00'}));
                    m.position.set((px+fwdX*4+ox)*TILE, 6, (pz+fwdZ*4+oz)*TILE);
                    m.add(new THREE.PointLight('#ff6600',2,TILE*3,2));
                    scene.add(m);
                    projectiles3D.push({mesh:m, vx:0, vz:0, vy:-12, damage:Math.round(player.damage*1.5), owner:'player', traveled:0, range:20});
                }, i * 100);
            }
            spawnMeleeSlash('#ff6600');
        } else if (slot === 'v') { // Dragon Transform
            beastTransform({dmg:1.8, hp:1.5, spd:1.3}, 2.0, '#ff6600', buildDragonModel);
        } else if (slot === 'f') { // Dragon Flight
            toggleFlight();
        }
    }

    // ══════ LEOPARD ══════
    else if (id === 'leopard') {
        if (slot === 'z') { // Prowl Punch — fast dash punch
            doDash(player.speed * 5, 200, 2, 4);
            spawnMeleeSlash('#64ffda');
        } else if (slot === 'x') { // Spiraling Frenzy — rapid multi-hit
            for (let i = 0; i < 6; i++) {
                setTimeout(() => { aoeHit(3, 1); spawnMeleeSlash('#64ffda'); }, i * 80);
            }
        } else if (slot === 'c') { // Predator Leap — long range pounce
            doDash(player.speed * 6, 400, 3, 6);
            screenShake(0.3, 150);
            spawnMeleeSlash('#64ffda');
        } else if (slot === 'v') { // Leopard Transform
            beastTransform({dmg:1.6, hp:1.2, spd:1.8}, 1.3, '#64ffda', buildLeopardModel);
        } else if (slot === 'f') { // Leopard Rush — speed boost
            doDash(player.speed * 4, 500, 1.5, 4);
        }
    }

    // ══════ BUDDHA ══════
    else if (id === 'buddha') {
        if (slot === 'z') { // Impact Fist — shockwave punch
            aoeHit(5, 2); stunNear(5, 1500);
            screenShake(0.3, 150);
            spawnMeleeSlash('#ffd600');
        } else if (slot === 'x') { // Shift — teleport forward
            fpsCamera.setPosition(px + fwdX * 5, pz + fwdZ * 5);
            player.invincible = now + 500;
            aoeHit(3, 2);
            spawnMeleeSlash('#ffd600');
        } else if (slot === 'c') { // Heavenly Stomp — massive ground pound
            aoeHit(8, 3); stunNear(8, 3000);
            screenShake(0.6, 300); triggerHitstop(80);
            spawnMeleeSlash('#ffd600');
        } else if (slot === 'v') { // Buddha Transform — giant golden form
            beastTransform({dmg:1.5, hp:2.5, spd:0.8}, 3.0, '#ffd600', buildBuddhaModel);
        } else if (slot === 'f') { // Zen Dash
            doDash(player.speed * 3, 400, 2, 5);
        }
    }

    // ══════ LIGHT ══════
    else if (id === 'light') {
        if (slot === 'z') { // Light Beam — fast long-range projectile
            shootProj('#ffeb3b', 25, player.damage * 1.5, 1, 0);
            spawnMeleeSlash('#ffeb3b');
        } else if (slot === 'x') { // Barrage of Light — multi-shot
            shootProj('#ffeb3b', 20, player.damage, 5, 0.1);
            spawnMeleeSlash('#fff9c4');
        } else if (slot === 'c') { // Light Speed Kick — ultra fast dash
            doDash(player.speed * 6, 250, 2, 8);
            spawnMeleeSlash('#ffeb3b');
        } else if (slot === 'v') { // Divine Arrow — massive beam
            shootProj('#fff176', 30, player.damage * 4, 1, 0);
            screenShake(0.3, 150);
            spawnMeleeSlash('#ffeb3b');
        } else if (slot === 'f') { // Light Flight
            toggleFlight();
        }
    }

    // ══════ DARK ══════
    else if (id === 'dark') {
        if (slot === 'z') { // Dimensional Slash — dark projectile
            shootProj('#1a1a2e', 14, player.damage * 2, 1, 0);
            spawnMeleeSlash('#311b92');
        } else if (slot === 'x') { // Dark Vortex — pull enemies + AoE
            pullEnemies(6, 2); aoeHit(5, 2); stunNear(5, 1500);
            spawnMeleeSlash('#1a1a2e');
        } else if (slot === 'c') { // Black Hole — massive pull + damage
            pullEnemies(8, 3); aoeHit(6, 3); stunNear(6, 3000);
            screenShake(0.4, 200);
            spawnMeleeSlash('#1a1a2e');
        } else if (slot === 'v') { // World of Darkness — damage everything
            aoeHit(10, 4); stunNear(10, 3000);
            screenShake(0.6, 300); triggerHitstop(80);
            spawnMeleeSlash('#311b92');
        } else if (slot === 'f') { // Dark Flight
            toggleFlight();
        }
    }

    // ══════ FLAME ══════
    else if (id === 'flame') {
        if (slot === 'z') { // Fire Bullets
            shootProj('#ff5722', 16, player.damage * 1.5, 3, 0.15);
            spawnMeleeSlash('#ff5722');
        } else if (slot === 'x') { // Fire Column — AoE fire pillar
            aoeHit(4, 2.5); stunNear(4, 1000);
            spawnMeleeSlash('#ff5722');
        } else if (slot === 'c') { // Fire Fist — projectile + explosion
            shootProj('#ff3d00', 12, player.damage * 3, 1, 0);
            screenShake(0.2, 100);
            spawnMeleeSlash('#ff5722');
        } else if (slot === 'v') { // Flame Destroyer — huge fire AoE
            aoeHit(8, 3.5); stunNear(8, 2000);
            screenShake(0.5, 250);
            spawnMeleeSlash('#ff5722');
        } else if (slot === 'f') { // Flame Flight
            toggleFlight();
        }
    }

    // ══════ ICE ══════
    else if (id === 'ice') {
        if (slot === 'z') { // Ice Spears — freezing projectiles
            shootProj('#4fc3f7', 14, player.damage * 1.5, 3, 0.12);
            stunNear(3, 1000);
            spawnMeleeSlash('#4fc3f7');
        } else if (slot === 'x') { // Glacial Surge — freeze wave
            coneHit(6, 0.5, 2); stunNear(6, 2500);
            spawnMeleeSlash('#b3e5fc');
        } else if (slot === 'c') { // Ice Bird — giant ice projectile
            shootProj('#e1f5fe', 10, player.damage * 4, 1, 0);
            screenShake(0.2, 100);
            spawnMeleeSlash('#4fc3f7');
        } else if (slot === 'v') { // Absolute Zero — freeze everything
            aoeHit(8, 3); stunNear(10, 4000);
            screenShake(0.5, 250);
            spawnMeleeSlash('#e1f5fe');
        } else if (slot === 'f') { // Ice Flight
            toggleFlight();
        }
    }

    // ══════ MAGMA ══════
    else if (id === 'magma') {
        if (slot === 'z') { // Magma Fist — lava projectile
            shootProj('#ff3d00', 10, player.damage * 2, 1, 0);
            spawnMeleeSlash('#ff3d00');
        } else if (slot === 'x') { // Magma Eruption — cone eruption
            coneHit(7, 0.4, 2.5);
            spawnMeleeSlash('#dd2c00');
        } else if (slot === 'c') { // Magma Hound — tracking fire wolf
            shootProj('#ff6d00', 8, player.damage * 3, 1, 0);
            screenShake(0.3, 150);
            spawnMeleeSlash('#ff3d00');
        } else if (slot === 'v') { // Volcanic Storm — massive AoE
            aoeHit(10, 4); stunNear(8, 2500);
            screenShake(0.6, 300); triggerHitstop(60);
            spawnMeleeSlash('#dd2c00');
        } else if (slot === 'f') { // Magma Flight
            toggleFlight();
        }
    }

    // ══════ PHOENIX ══════
    else if (id === 'phoenix') {
        if (slot === 'z') { // Blue Flames — healing fire
            shootProj('#00bcd4', 14, player.damage * 1.5, 3, 0.15);
            player.hp = Math.min(player.hp + 10, player.maxHp);
            spawnMeleeSlash('#00bcd4');
        } else if (slot === 'x') { // Flame Gatling — rapid blue fire
            shootProj('#26c6da', 18, player.damage, 8, 0.08);
            spawnMeleeSlash('#00bcd4');
        } else if (slot === 'c') { // Regeneration Flame — big heal + AoE
            player.hp = Math.min(player.hp + 40, player.maxHp);
            aoeHit(5, 2);
            spawnMeleeSlash('#80deea');
        } else if (slot === 'v') { // Phoenix Transform
            beastTransform({dmg:1.4, hp:1.3, spd:1.5}, 1.5, '#00bcd4', buildPhoenixModel);
            // Phoenix also heals over time when transformed
            player._phoenixHeal = true;
        } else if (slot === 'f') { // Phoenix Flight
            toggleFlight();
        }
    }

    // ══════ RUMBLE ══════
    else if (id === 'rumble') {
        if (slot === 'z') { // Thunder Bolt — fast electric shot
            shootProj('#ffd740', 22, player.damage * 2, 1, 0);
            stunNear(3, 800);
            spawnMeleeSlash('#ffd740');
        } else if (slot === 'x') { // Lightning Storm — AoE + stun
            aoeHit(5, 2); stunNear(6, 2500);
            screenShake(0.3, 150);
            spawnMeleeSlash('#ffeb3b');
        } else if (slot === 'c') { // Sky Judgement — big lightning strike
            aoeHit(4, 3.5); stunNear(5, 3000);
            screenShake(0.5, 200); triggerHitstop(50);
            spawnMeleeSlash('#ffd740');
        } else if (slot === 'v') { // Thunderstorm — massive electric AoE
            aoeHit(10, 3); stunNear(10, 3000);
            screenShake(0.6, 300);
            spawnMeleeSlash('#ffeb3b');
        } else if (slot === 'f') { // Rumble Flight
            toggleFlight();
        }
    }

    // ══════ QUAKE ══════
    else if (id === 'quake') {
        if (slot === 'z') { // Quake Punch — shockwave forward
            coneHit(5, 0.4, 2.5);
            screenShake(0.4, 200);
            spawnMeleeSlash('#ffab00');
        } else if (slot === 'x') { // Quake Erupt — ground smash
            aoeHit(6, 2.5); stunNear(6, 2000);
            screenShake(0.5, 250);
            spawnMeleeSlash('#ff8f00');
        } else if (slot === 'c') { // Sea Quake — massive quake
            aoeHit(8, 3); stunNear(8, 3000);
            screenShake(0.7, 350); triggerHitstop(80);
            spawnMeleeSlash('#ffab00');
        } else if (slot === 'v') { // Tsunami — screen-wide destruction
            aoeHit(12, 4); stunNear(12, 3500);
            screenShake(1.0, 500); triggerHitstop(100);
            spawnMeleeSlash('#ff8f00');
            setTimeout(() => spawnMeleeSlash('#ffab00'), 150);
        } else if (slot === 'f') { // Quake Dash
            doDash(player.speed * 3, 400, 2, 5);
        }
    }

    // ══════ VENOM ══════
    else if (id === 'venom') {
        if (slot === 'z') { // Poison Daggers — poison projectiles
            shootProj('#76ff03', 14, player.damage * 1.5, 3, 0.2);
            spawnMeleeSlash('#76ff03');
        } else if (slot === 'x') { // Toxic Fog — poison AoE cloud
            aoeHit(5, 2);
            // Poison DOT — damage over time for 4s
            player._venomCloud = { x: px, z: pz, end: now + 4000, lastTick: 0 };
            spawnMeleeSlash('#64dd17');
        } else if (slot === 'c') { // Venom Shower — rain poison
            for (let i = 0; i < 6; i++) {
                setTimeout(() => shootProj('#76ff03', 8, player.damage, 2, 0.3), i * 100);
            }
            spawnMeleeSlash('#76ff03');
        } else if (slot === 'v') { // Hydra Transform
            beastTransform({dmg:1.7, hp:1.6, spd:1.1}, 1.8, '#76ff03', buildVenomModel);
        } else if (slot === 'f') { // Venom Dash
            doDash(player.speed * 3, 400, 1.5, 4);
        }
    }

    // ══════ SPIRIT ══════
    else if (id === 'spirit') {
        if (slot === 'z') { // Spirit Bomb — fire spirit projectile
            shootProj('#ff6600', 14, player.damage * 2, 1, 0);
            spawnMeleeSlash('#ff8a65');
        } else if (slot === 'x') { // Ice Spirit — ice projectile
            shootProj('#4fc3f7', 14, player.damage * 2, 1, 0);
            stunNear(3, 1000);
            spawnMeleeSlash('#b3e5fc');
        } else if (slot === 'c') { // Fire Spirit — fire AoE
            aoeHit(5, 2.5);
            shootProj('#ff3d00', 10, player.damage, 4, 0.2);
            spawnMeleeSlash('#ff6600');
        } else if (slot === 'v') { // Spirit Convergence — both spirits merge
            aoeHit(8, 3.5); stunNear(8, 2500);
            shootProj('#ff6600', 16, player.damage * 2, 3, 0.15);
            shootProj('#4fc3f7', 16, player.damage * 2, 3, 0.15);
            screenShake(0.5, 250);
            spawnMeleeSlash('#ff8a65');
        } else if (slot === 'f') { // Spirit Flight
            toggleFlight();
        }
    }

    // ══════ SOUND ══════
    else if (id === 'sound') {
        if (slot === 'z') { // Sound Blast — sonic wave
            coneHit(6, 0.5, 2); stunNear(4, 1000);
            spawnMeleeSlash('#e040fb');
        } else if (slot === 'x') { // Rhythmic Barrage — rapid beats
            for (let i = 0; i < 5; i++) {
                setTimeout(() => { aoeHit(3, 1.2); spawnMeleeSlash('#e040fb'); }, i * 100);
            }
        } else if (slot === 'c') { // Tempo Charge — speed buff + damage
            player.speed *= 1.5; fpsCamera.speed = player.speed;
            player.damage = Math.round(player.damage * 1.3);
            player._tempoEnd = now + 6000;
            spawnMeleeSlash('#ce93d8');
        } else if (slot === 'v') { // Fortissimo — massive sonic explosion
            aoeHit(10, 3.5); stunNear(10, 3000);
            screenShake(0.6, 300); triggerHitstop(60);
            spawnMeleeSlash('#e040fb');
            setTimeout(() => spawnMeleeSlash('#ce93d8'), 100);
        } else if (slot === 'f') { // Sound Dash
            doDash(player.speed * 3, 300, 1.5, 4);
        }
    }
}

// Keep old function names as no-ops so nothing crashes
function playerSpecial() { fruitAbility('z'); }
function playerSecondary() { fruitAbility('x'); }
function playerQAbility() { fruitAbility('c'); }
function playerFAbility() { fruitAbility('v'); }



// ─── FRUIT EFFECTS UPDATE (per-frame) ───────────────────────
function updateFruitEffects(now, dt) {
    if (!player || !player.alive) return;
    const px = fpsCamera.posX, pz = fpsCamera.posZ;

    // Dough Fusillade — channeled fist barrage
    if (player._fusilladeActive) {
        if (now > player._fusilladeEnd || player._fusilladeHits >= player._fusilladeMaxHits) {
            player._fusilladeActive = false;
        } else if (now - player._fusilladeLastPunch > 312) {
            player._fusilladeLastPunch = now;
            player._fusilladeHits++;
            const yaw = fpsCamera.yaw;
            const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);
            let lockTarget = null, lockDist = Infinity;
            for (const e of enemies3D) { if (!e.data.alive) continue; const d = Math.hypot(e.data.x-px,e.data.z-pz); if(d<12&&d<lockDist){lockDist=d;lockTarget=e;}}
            let aimX = (px+fwdX*8)*TILE, aimZ = (pz+fwdZ*8)*TILE;
            if (lockTarget) { aimX = lockTarget.data.x*TILE; aimZ = lockTarget.data.z*TILE; }
            const m = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.4,0.4), new THREE.MeshBasicMaterial({color:'#f5f0e0'}));
            m.position.set(px*TILE, EYE_HEIGHT, pz*TILE);
            m.add(new THREE.PointLight('#f5f0e0',1,TILE*2,2));
            scene.add(m);
            const ddx=aimX-px*TILE, ddz=aimZ-pz*TILE, dd=Math.hypot(ddx,ddz)||1;
            projectiles3D.push({mesh:m, vx:(ddx/dd)*18, vz:(ddz/dd)*18, damage:Math.round(player.damage*1.8), owner:'player', traveled:0, range:40});
            if (lockTarget) {
                const tdx=px-lockTarget.data.x, tdz=pz-lockTarget.data.z, td=Math.hypot(tdx,tdz);
                if(td>1.5){lockTarget.data.x+=(tdx/td)*0.4;lockTarget.data.z+=(tdz/td)*0.4;lockTarget.mesh.position.set(lockTarget.data.x*TILE,0,lockTarget.data.z*TILE);}
                lockTarget.data.lastAttack=now+400;
            }
        }
    }

    // Venom cloud DOT
    if (player._venomCloud && now < player._venomCloud.end) {
        if (now - player._venomCloud.lastTick > 500) {
            player._venomCloud.lastTick = now;
            for (const e of enemies3D) { if (!e.data.alive) continue; if (Math.hypot(e.data.x-player._venomCloud.x,e.data.z-player._venomCloud.z)<5) dealDamageToEnemy(e, Math.round(player.damage*0.5)); }
        }
    } else { player._venomCloud = null; }

    // Sound tempo buff expiry
    if (player._tempoEnd && now > player._tempoEnd) {
        player.speed /= 1.5; fpsCamera.speed = player.speed;
        player.damage = Math.round(player.damage / 1.3);
        player._tempoEnd = 0;
    }

    // Phoenix heal over time when transformed
    if (player._phoenixHeal && player._transformed) {
        if (!player._phoenixLastHeal) player._phoenixLastHeal = 0;
        if (now - player._phoenixLastHeal > 2000) { player._phoenixLastHeal = now; player.hp = Math.min(player.hp+5, player.maxHp); }
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
    // VFX
    showSpeedLines(300);
    fovPunch(15, 0.12);
}

function dealDamageToEnemy(e, dmg) {
    e.data.hp -= dmg;

    // ── Impact sparks on hit ──
    const sparkColor = player?.cls?.color || '#ffffff';
    spawnImpactSparks(e.data.x * TILE, 1.5, e.data.z * TILE, sparkColor, dmg > 20 ? 8 : 4);

    // ── Hit reaction: flash white→red, scale bump, recoil ──
    e.mesh.traverse(c => { if (c.isMesh && c.material && c.material.emissive) c.material.emissive.set('#ffffff'); });
    setTimeout(() => {
        e.mesh.traverse(c => { if (c.isMesh && c.material && c.material.emissive) c.material.emissive.set('#ff0000'); });
    }, 50);
    setTimeout(() => {
        e.mesh.traverse(c => { if (c.isMesh && c.material && c.material.emissive) c.material.emissive.set('#000000'); });
    }, 150);

    // Scale bump (squash & stretch)
    e.mesh.scale.set(1.2, 0.8, 1.2);
    setTimeout(() => { if (e.mesh) e.mesh.scale.set(0.9, 1.15, 0.9); }, 60);
    setTimeout(() => { if (e.mesh) e.mesh.scale.set(1, 1, 1); }, 150);

    // Bounce up on big hits
    if (dmg > 15) {
        e.mesh.position.y = 0.3 + dmg * 0.02;
        setTimeout(() => { if (e.mesh) e.mesh.position.y = 0; }, 200);
    }

    // Floating damage number
    const numColor = dmg > 30 ? '#ff1744' : dmg > 15 ? '#ffab00' : '#ffffff';
    spawnDmgNumber(e.data.x * TILE, 2.5, e.data.z * TILE, dmg, numColor);

    // Screen shake (scales with damage)
    const shakeAmt = Math.min(dmg * 0.015, 0.4);
    screenShake(shakeAmt, 80 + dmg * 2);

    // Hitstop on big hits
    if (dmg > 25) triggerHitstop(40);
    if (dmg > 50) triggerHitstop(80);

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

        // (Old class-specific death hooks removed — Blox Fruits system)

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
    let reduced = Math.max(1, dmg - player.defense);
    // Buddha damage reduction when transformed
    if (player.classId === 'buddha' && player._transformed) {
        reduced = Math.max(1, Math.round(reduced * 0.5));
    }
    player.hp -= reduced;
    // Rage class — charge meter on damage
    if (player.classId === 'rage') { if (!player._rageMeter) player._rageMeter = 0; player._rageMeter = Math.min(50, player._rageMeter + reduced); }
    player.invincible = now + 200;

    // Red vignette flash on screen
    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:4;pointer-events:none;background:radial-gradient(ellipse at center,transparent 40%,rgba(255,0,0,0.5) 100%);';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 200);

    // Screen shake when taking damage
    screenShake(0.3 + reduced * 0.02, 150);
    if (reduced > 10) triggerHitstop(30);

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
    updateScreenShake(dt);
    updateFovPunch();
    playerLight.position.copy(camera.position);

    const px = fpsCamera.posX, pz = fpsCamera.posZ;

    // Room discovery
    const currentRoom = getRoomAt(dungeon.rooms, px, pz);
    if (currentRoom && !currentRoom.explored) {
        currentRoom.explored = true;
        syncTorchVisibility(torchLights, dungeon);
    }

    // Hitstop — freeze game logic briefly on big hits
    if (performance.now() < hitstopUntil) {
        updateScreenShake(dt);
        updateFovPunch();
        updateDmgNumbers();
        renderer.render(scene, camera);
        return;
    }

    updateTorchLights(torchLights, time);
    updateMeleeSlashes();
    updateDmgNumbers();
    updateWalkAnimation(dt);
    updateMinions(dt, now);
    // (old Katakuri portal update removed — Blox Fruits system)
    updateFruitEffects(now, dt);

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

    // Ability cooldown bar (Z/X/C/V/F)
    const slots = document.querySelectorAll('#hud-ability-bar .ability-slot');
    const cds = player._abilityCds || { z:0, x:0, c:0, v:0, f:0 };
    const abilCds = player.cls.abilityCooldowns || {};
    const keys = ['z','x','c','v','f'];
    slots.forEach((slot, i) => {
        const key = keys[i];
        const cd = abilCds[key] || 5000;
        const elapsed = now - (cds[key] || 0);
        const ready = elapsed >= cd;
        const cdEl = slot.querySelector('.ability-cd');
        if (cdEl) {
            cdEl.textContent = ready ? 'READY' : Math.ceil((cd - elapsed) / 1000) + 's';
            cdEl.style.color = ready ? '#0ff' : '#666';
        }
        slot.style.borderColor = ready ? '#ff0080' : '#333';
    });

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
