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
let fpsSword = null; // 1st-person viewmodel sword (child of camera)
let swordSwing = null; // active sword swing animation state

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
    scene.add(camera); // camera must be in scene graph for child objects (viewmodel sword) to render

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

// ─── GOJO SATORU 3D MODEL ───────────────────────────────────
function buildGojoModel() {
    const pm = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: '#f0d5b8', roughness: 0.5 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.6 }); // dark navy/black jacket
    const innerMat = new THREE.MeshStandardMaterial({ color: '#2c2c44', roughness: 0.6 }); // slightly lighter inner
    const pantsMat = new THREE.MeshStandardMaterial({ color: '#111122', roughness: 0.7 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: '#0a0a15', roughness: 0.8 });
    const blindfoldMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.4 });
    const hairMat = new THREE.MeshStandardMaterial({ color: '#e8e8f0', roughness: 0.6 }); // white/silver hair

    // ── Torso pivot (for body lean) ──
    const torsoPivot = new THREE.Group();
    torsoPivot.position.y = 0.65;

    // Upper body — jacket/coat
    const upperBody = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.9, 8), jacketMat);
    upperBody.position.y = 0.5; torsoPivot.add(upperBody);
    // Chest width — broader shoulders
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.25, 0.35), jacketMat);
    shoulders.position.y = 0.85; torsoPivot.add(shoulders);
    // Collar / high neck of the uniform
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.2, 6), jacketMat);
    collar.position.y = 1.05; torsoPivot.add(collar);
    // Inner shirt visible at collar
    const innerShirt = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 6), innerMat);
    innerShirt.position.set(0, 1.0, 0.08); torsoPivot.add(innerShirt);

    // ── Neck ──
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.15, 6), skinMat);
    neck.position.y = 1.15; torsoPivot.add(neck);

    // ── Head ──
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), skinMat);
    head.position.y = 1.4; head.scale.set(1, 1.05, 0.95); torsoPivot.add(head);

    // Jaw / chin definition
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), skinMat);
    chin.position.set(0, 1.25, 0.12); chin.scale.set(1.2, 0.7, 1); torsoPivot.add(chin);

    // ── Blindfold (wrapped around eyes) ──
    const blindfold = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.22), blindfoldMat);
    blindfold.position.set(0, 1.43, 0.05); torsoPivot.add(blindfold);
    // Blindfold wrapping around sides
    for (let s = -1; s <= 1; s += 2) {
        const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.12), blindfoldMat);
        wrap.position.set(s * 0.22, 1.43, -0.04); torsoPivot.add(wrap);
    }
    // Blindfold tail (hanging strip on right side)
    const bfTail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.04), blindfoldMat);
    bfTail.position.set(0.24, 1.35, -0.06);
    bfTail.rotation.z = -0.3;
    torsoPivot.add(bfTail);

    // ── Hair (spiky white) ──
    // Base hair volume
    const hairBase = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), hairMat);
    hairBase.position.y = 1.5; hairBase.scale.set(1.05, 0.9, 1);
    torsoPivot.add(hairBase);
    // Spiky hair strands — upward and slightly forward/sideways
    const spikePositions = [
        { x: 0, y: 1.7, z: 0.05, rx: -0.3, rz: 0, h: 0.22 },
        { x: 0.08, y: 1.68, z: 0.03, rx: -0.2, rz: 0.3, h: 0.2 },
        { x: -0.08, y: 1.68, z: 0.03, rx: -0.2, rz: -0.3, h: 0.2 },
        { x: 0.15, y: 1.63, z: -0.02, rx: 0, rz: 0.5, h: 0.18 },
        { x: -0.15, y: 1.63, z: -0.02, rx: 0, rz: -0.5, h: 0.18 },
        { x: 0.05, y: 1.67, z: -0.1, rx: 0.3, rz: 0.2, h: 0.16 },
        { x: -0.05, y: 1.67, z: -0.1, rx: 0.3, rz: -0.2, h: 0.16 },
        { x: 0, y: 1.65, z: -0.12, rx: 0.4, rz: 0, h: 0.15 },
        { x: 0.12, y: 1.6, z: 0.06, rx: -0.15, rz: 0.4, h: 0.17 },
        { x: -0.12, y: 1.6, z: 0.06, rx: -0.15, rz: -0.4, h: 0.17 },
    ];
    for (const sp of spikePositions) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, sp.h, 4), hairMat);
        spike.position.set(sp.x, sp.y, sp.z);
        spike.rotation.set(sp.rx, 0, sp.rz);
        torsoPivot.add(spike);
    }

    // ── Nose ──
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 4), skinMat);
    nose.position.set(0, 1.36, 0.2);
    nose.rotation.x = Math.PI * 0.6;
    torsoPivot.add(nose);

    // ── Mouth (subtle line) ──
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.01),
        new THREE.MeshBasicMaterial({ color: '#cc8888' }));
    mouth.position.set(0.01, 1.3, 0.19); torsoPivot.add(mouth);

    // ── Ears ──
    for (let s = -1; s <= 1; s += 2) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 5), skinMat);
        ear.position.set(s * 0.2, 1.4, 0);
        ear.scale.set(0.6, 1, 0.6);
        torsoPivot.add(ear);
    }

    // ── Right arm (articulated at shoulder) ──
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.4, 0.82, 0);
    // Shoulder joint sphere
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), jacketMat));
    // Upper arm
    const rUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.45, 5), jacketMat);
    rUpperArm.position.y = -0.28; rightArmPivot.add(rUpperArm);
    // Elbow
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), jacketMat).translateY(-0.52));
    // Forearm
    const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.4, 5), jacketMat);
    rForearm.position.y = -0.75; rightArmPivot.add(rForearm);
    // Hand
    const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), skinMat);
    rHand.position.set(0, -0.98, 0.02); rightArmPivot.add(rHand);
    // Fingers (subtle)
    for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.05, 3), skinMat);
        finger.position.set((f - 1.5) * 0.018, -1.04, 0.03);
        rightArmPivot.add(finger);
    }
    torsoPivot.add(rightArmPivot);
    pm._rightArm = rightArmPivot;

    // ── Left arm (articulated at shoulder) ──
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.4, 0.82, 0);
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), jacketMat));
    const lUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.45, 5), jacketMat);
    lUpperArm.position.y = -0.28; leftArmPivot.add(lUpperArm);
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), jacketMat).translateY(-0.52));
    const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.4, 5), jacketMat);
    lForearm.position.y = -0.75; leftArmPivot.add(lForearm);
    const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), skinMat);
    lHand.position.set(0, -0.98, 0.02); leftArmPivot.add(lHand);
    for (let f = 0; f < 4; f++) {
        leftArmPivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.05, 3), skinMat).translateX((f-1.5)*0.018).translateY(-1.04).translateZ(0.03));
    }
    torsoPivot.add(leftArmPivot);
    pm._leftArm = leftArmPivot;

    pm.add(torsoPivot);
    pm._torso = torsoPivot;

    // ── Right leg (articulated at hip) ──
    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.1, 0.65, 0);
    // Hip joint
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), pantsMat));
    // Thigh
    const rThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.45, 5), pantsMat);
    rThigh.position.y = -0.28; rightLegPivot.add(rThigh);
    // Knee
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), pantsMat).translateY(-0.52));
    // Shin
    const rShin = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.42, 5), pantsMat);
    rShin.position.y = -0.75; rightLegPivot.add(rShin);
    // Shoe
    const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.16), shoeMat);
    rShoe.position.set(0, -0.98, 0.03); rightLegPivot.add(rShoe);
    pm.add(rightLegPivot);
    pm._rightLeg = rightLegPivot;

    // ── Left leg (articulated at hip) ──
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.1, 0.65, 0);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), pantsMat));
    const lThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.45, 5), pantsMat);
    lThigh.position.y = -0.28; leftLegPivot.add(lThigh);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), pantsMat).translateY(-0.52));
    const lShin = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.42, 5), pantsMat);
    lShin.position.y = -0.75; leftLegPivot.add(lShin);
    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.16), shoeMat);
    lShoe.position.set(0, -0.98, 0.03); leftLegPivot.add(lShoe);
    pm.add(leftLegPivot);
    pm._leftLeg = leftLegPivot;

    // ── Belt / waist line ──
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.23, 0.06, 8),
        new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.5 }));
    belt.position.y = 0.62; pm.add(belt);

    // ── Infinity aura (subtle blue glow around character) ──
    const aura = new THREE.PointLight('#4fc3f7', 0.8, TILE * 3, 2);
    aura.position.y = 1.2; pm.add(aura);
    pm._auraLight = aura;

    // Mark as Gojo for animation system
    pm._isGojo = true;

    return pm;
}

// ─── GOJO WALK/IDLE ANIMATION ───────────────────────────────
function updateGojoAnimation(pm, dt, moving, walkCycle) {
    if (!pm._isGojo) return false; // not Gojo, skip

    const t = walkCycle;

    if (moving) {
        // ── Walking ──
        const stride = 0.6; // how far legs swing
        const armSwing = 0.5; // how far arms swing
        const bodyBob = Math.abs(Math.sin(t * 2)) * 0.06;
        const bodyLean = Math.sin(t) * 0.03; // slight side-to-side lean

        // Legs — opposite phase (right forward when left back)
        if (pm._rightLeg) pm._rightLeg.rotation.x = Math.sin(t) * stride;
        if (pm._leftLeg) pm._leftLeg.rotation.x = Math.sin(t + Math.PI) * stride;

        // Arms — swing opposite to legs (natural walk)
        if (pm._rightArm) pm._rightArm.rotation.x = Math.sin(t + Math.PI) * armSwing;
        if (pm._leftArm) pm._leftArm.rotation.x = Math.sin(t) * armSwing;

        // Torso — slight lean forward + side sway
        if (pm._torso) {
            pm._torso.rotation.x = 0.05; // lean forward slightly
            pm._torso.rotation.z = bodyLean;
        }

        // Vertical bob
        pm.position.y = (fpsCamera.flyHeight || 0) + bodyBob;

        // Aura pulses slightly brighter when moving
        if (pm._auraLight) pm._auraLight.intensity = 0.8 + Math.sin(t * 3) * 0.3;
    } else {
        // ── Idle — breathing + subtle sway ──
        const breath = Math.sin(t * 0.6) * 0.02;
        const idleSway = Math.sin(t * 0.3) * 0.01;

        // Arms relax at sides with gentle sway
        if (pm._rightArm) pm._rightArm.rotation.x = breath + 0.05;
        if (pm._leftArm) pm._leftArm.rotation.x = breath + 0.05;

        // Legs straight
        if (pm._rightLeg) pm._rightLeg.rotation.x = 0;
        if (pm._leftLeg) pm._leftLeg.rotation.x = 0;

        // Torso — slight breathing rise/fall
        if (pm._torso) {
            pm._torso.rotation.x = breath;
            pm._torso.rotation.z = idleSway;
        }

        pm.position.y = fpsCamera.flyHeight || 0;

        // Calm aura
        if (pm._auraLight) pm._auraLight.intensity = 0.6 + Math.sin(t * 0.5) * 0.15;
    }

    return true; // handled
}

// ─── RYOMEN SUKUNA 3D MODEL ────────────────────────────────
function buildSukunaModel() {
    const pm = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: '#e8c8a8', roughness: 0.5 });
    const tattooSkinMat = new THREE.MeshStandardMaterial({ color: '#c8a888', roughness: 0.5 }); // slightly darker where tattoos sit
    const tattooMat = new THREE.MeshBasicMaterial({ color: '#1a1a1a' }); // black tattoo lines
    const hakamaMat = new THREE.MeshStandardMaterial({ color: '#1a0a1a', roughness: 0.7 }); // dark purple-black hakama
    const sashMat = new THREE.MeshStandardMaterial({ color: '#3a1a2a', roughness: 0.6 });
    const hairMat = new THREE.MeshStandardMaterial({ color: '#f5c8d0', roughness: 0.5 }); // pink-ish hair
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#ff2244' }); // red eyes
    const pupilMat = new THREE.MeshBasicMaterial({ color: '#000000' });
    const nailMat = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.3 }); // dark painted nails
    const shoeMat = new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.8 });

    // ── Torso pivot ──
    const torsoPivot = new THREE.Group();
    torsoPivot.position.y = 0.65;

    // Upper body — bare muscular torso (Sukuna's Heian era form)
    const upperBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.9, 8), tattooSkinMat);
    upperBody.position.y = 0.5; torsoPivot.add(upperBody);
    // Broader shoulders — muscular build
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.28, 0.38), tattooSkinMat);
    shoulders.position.y = 0.88; torsoPivot.add(shoulders);

    // Tattoo lines on torso (black line segments on the body)
    const tattooParts = [
        // Chest center vertical line
        { w: 0.02, h: 0.5, d: 0.01, x: 0, y: 0.6, z: 0.27 },
        // Left chest horizontal
        { w: 0.2, h: 0.02, d: 0.01, x: -0.1, y: 0.7, z: 0.27 },
        // Right chest horizontal
        { w: 0.2, h: 0.02, d: 0.01, x: 0.1, y: 0.7, z: 0.27 },
        // Left shoulder band
        { w: 0.02, h: 0.15, d: 0.01, x: -0.32, y: 0.85, z: 0.16 },
        // Right shoulder band
        { w: 0.02, h: 0.15, d: 0.01, x: 0.32, y: 0.85, z: 0.16 },
        // Abdomen horizontal lines
        { w: 0.25, h: 0.015, d: 0.01, x: 0, y: 0.4, z: 0.26 },
        { w: 0.2, h: 0.015, d: 0.01, x: 0, y: 0.3, z: 0.25 },
    ];
    for (const tp of tattooParts) {
        const tat = new THREE.Mesh(new THREE.BoxGeometry(tp.w, tp.h, tp.d), tattooMat);
        tat.position.set(tp.x, tp.y, tp.z);
        torsoPivot.add(tat);
    }

    // ── Neck (thick, muscular) ──
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.15, 6), tattooSkinMat);
    neck.position.y = 1.15; torsoPivot.add(neck);

    // ── Head ──
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 10), skinMat);
    head.position.y = 1.4; head.scale.set(1, 1.05, 0.95); torsoPivot.add(head);

    // Jaw — strong angular jaw
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), skinMat);
    chin.position.set(0, 1.24, 0.13); chin.scale.set(1.3, 0.6, 1); torsoPivot.add(chin);

    // ── Face tattoos (black lines on face) ──
    // Line down nose bridge
    const faceTat1 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.12, 0.01), tattooMat);
    faceTat1.position.set(0, 1.4, 0.22); torsoPivot.add(faceTat1);
    // Lines on cheeks (left)
    const faceTat2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.01), tattooMat);
    faceTat2.position.set(-0.12, 1.37, 0.18); torsoPivot.add(faceTat2);
    // Lines on cheeks (right)
    const faceTat3 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.01), tattooMat);
    faceTat3.position.set(0.12, 1.37, 0.18); torsoPivot.add(faceTat3);
    // Forehead line
    const faceTat4 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, 0.01), tattooMat);
    faceTat4.position.set(0, 1.52, 0.2); torsoPivot.add(faceTat4);

    // ── Eyes — 4 eyes (2 normal + 2 below) — Sukuna's true form ──
    const eyeGeo = new THREE.SphereGeometry(0.035, 6, 6);
    const pupilGeo = new THREE.SphereGeometry(0.018, 4, 4);
    // Upper pair
    for (let s = -1; s <= 1; s += 2) {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(s * 0.09, 1.44, 0.2);
        torsoPivot.add(eye);
        const pupil = new THREE.Mesh(pupilGeo, pupilMat);
        pupil.position.set(s * 0.09, 1.44, 0.23);
        torsoPivot.add(pupil);
    }
    // Lower pair (smaller, slightly below)
    const smallEyeGeo = new THREE.SphereGeometry(0.025, 5, 5);
    const smallPupilGeo = new THREE.SphereGeometry(0.013, 4, 4);
    for (let s = -1; s <= 1; s += 2) {
        const eye = new THREE.Mesh(smallEyeGeo, eyeMat);
        eye.position.set(s * 0.07, 1.37, 0.2);
        torsoPivot.add(eye);
        const pupil = new THREE.Mesh(smallPupilGeo, pupilMat);
        pupil.position.set(s * 0.07, 1.37, 0.225);
        torsoPivot.add(pupil);
    }

    // ── Nose ──
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 4), skinMat);
    nose.position.set(0, 1.38, 0.22);
    nose.rotation.x = Math.PI * 0.6;
    torsoPivot.add(nose);

    // ── Mouth — confident smirk ──
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.01),
        new THREE.MeshBasicMaterial({ color: '#992244' }));
    mouth.position.set(0.01, 1.3, 0.21); torsoPivot.add(mouth);
    // Slight upward curve on one side (smirk)
    const smirk = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.01, 0.01),
        new THREE.MeshBasicMaterial({ color: '#992244' }));
    smirk.position.set(0.05, 1.305, 0.21);
    smirk.rotation.z = 0.3;
    torsoPivot.add(smirk);

    // ── Ears ──
    for (let s = -1; s <= 1; s += 2) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 5), skinMat);
        ear.position.set(s * 0.21, 1.42, 0);
        ear.scale.set(0.6, 1, 0.6);
        torsoPivot.add(ear);
    }

    // ── Hair — pink, slicked back with some spikes ──
    const hairBase = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), hairMat);
    hairBase.position.y = 1.5; hairBase.scale.set(1.05, 0.85, 1.05);
    torsoPivot.add(hairBase);
    // Slicked back spikes
    const hairSpikes = [
        { x: 0, y: 1.65, z: -0.08, rx: 0.5, rz: 0, h: 0.2 },
        { x: 0.1, y: 1.62, z: -0.06, rx: 0.4, rz: 0.3, h: 0.18 },
        { x: -0.1, y: 1.62, z: -0.06, rx: 0.4, rz: -0.3, h: 0.18 },
        { x: 0.06, y: 1.66, z: -0.02, rx: 0.3, rz: 0.15, h: 0.16 },
        { x: -0.06, y: 1.66, z: -0.02, rx: 0.3, rz: -0.15, h: 0.16 },
        { x: 0.15, y: 1.58, z: -0.04, rx: 0.3, rz: 0.5, h: 0.15 },
        { x: -0.15, y: 1.58, z: -0.04, rx: 0.3, rz: -0.5, h: 0.15 },
        // A few forward-hanging strands
        { x: 0.05, y: 1.6, z: 0.12, rx: -0.4, rz: 0.2, h: 0.12 },
        { x: -0.04, y: 1.6, z: 0.1, rx: -0.3, rz: -0.1, h: 0.1 },
    ];
    for (const sp of hairSpikes) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.035, sp.h, 4), hairMat);
        spike.position.set(sp.x, sp.y, sp.z);
        spike.rotation.set(sp.rx, 0, sp.rz);
        torsoPivot.add(spike);
    }

    // ── Right arm (muscular, tattooed) ──
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.42, 0.85, 0);
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), tattooSkinMat));
    const rUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.45, 5), tattooSkinMat);
    rUpperArm.position.y = -0.28; rightArmPivot.add(rUpperArm);
    // Arm tattoo bands
    for (let b = 0; b < 2; b++) {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.076, 0.015, 6), tattooMat);
        band.position.y = -0.15 - b * 0.18; rightArmPivot.add(band);
    }
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), tattooSkinMat).translateY(-0.52));
    const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.4, 5), tattooSkinMat);
    rForearm.position.y = -0.75; rightArmPivot.add(rForearm);
    // Hand
    const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.07), skinMat);
    rHand.position.set(0, -0.98, 0.02); rightArmPivot.add(rHand);
    // Dark nails (clawed)
    for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.06, 3), nailMat);
        finger.position.set((f - 1.5) * 0.02, -1.06, 0.03);
        rightArmPivot.add(finger);
    }
    // ── Sword (cursed blade held in right hand) ──
    const swordGroup = new THREE.Group();
    swordGroup.position.set(0, -1.04, 0.04);
    swordGroup.rotation.x = Math.PI / 2; // blade points forward (outward from hand)
    // Hilt wrap
    const hiltMat = new THREE.MeshStandardMaterial({ color: '#2a1a1a', roughness: 0.6 });
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 5), hiltMat);
    swordGroup.add(hilt);
    // Hilt wrap bands
    const wrapMat = new THREE.MeshStandardMaterial({ color: '#4a2030', roughness: 0.5 });
    for (let w = 0; w < 3; w++) {
        const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.015, 5), wrapMat);
        wrap.position.y = -0.05 + w * 0.05;
        swordGroup.add(wrap);
    }
    // Guard (tsuba) — flat disc
    const guardMat = new THREE.MeshStandardMaterial({ color: '#333333', metalness: 0.6, roughness: 0.3 });
    const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 6), guardMat);
    guard.position.y = 0.09;
    swordGroup.add(guard);
    // Blade — long, slightly tapered, dark with red edge glow
    const bladeMat = new THREE.MeshStandardMaterial({ color: '#1a1a2a', metalness: 0.8, roughness: 0.15 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.7, 0.008), bladeMat);
    blade.position.y = 0.45;
    swordGroup.add(blade);
    // Blade edge glow (thin red strip along cutting edge)
    const edgeGlowMat = new THREE.MeshBasicMaterial({ color: '#ff2244', transparent: true, opacity: 0.6 });
    const edgeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.7, 0.012), edgeGlowMat);
    edgeGlow.position.set(0.014, 0.45, 0);
    swordGroup.add(edgeGlow);
    // Blade tip — pointed
    const tipMat = new THREE.MeshStandardMaterial({ color: '#1a1a2a', metalness: 0.8, roughness: 0.15 });
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.08, 4), tipMat);
    tip.position.y = 0.84;
    swordGroup.add(tip);
    // Pommel (bottom cap)
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 5), guardMat);
    pommel.position.y = -0.09;
    swordGroup.add(pommel);
    rightArmPivot.add(swordGroup);
    torsoPivot.add(rightArmPivot);
    pm._rightArm = rightArmPivot;

    // ── Left arm (mirrored) ──
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.42, 0.85, 0);
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), tattooSkinMat));
    const lUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.45, 5), tattooSkinMat);
    lUpperArm.position.y = -0.28; leftArmPivot.add(lUpperArm);
    for (let b = 0; b < 2; b++) {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.076, 0.015, 6), tattooMat);
        band.position.y = -0.15 - b * 0.18; leftArmPivot.add(band);
    }
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), tattooSkinMat).translateY(-0.52));
    const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.4, 5), tattooSkinMat);
    lForearm.position.y = -0.75; leftArmPivot.add(lForearm);
    const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.07), skinMat);
    lHand.position.set(0, -0.98, 0.02); leftArmPivot.add(lHand);
    for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.06, 3), nailMat);
        finger.position.set((f - 1.5) * 0.02, -1.06, 0.03);
        leftArmPivot.add(finger);
    }
    torsoPivot.add(leftArmPivot);
    pm._leftArm = leftArmPivot;

    pm.add(torsoPivot);
    pm._torso = torsoPivot;

    // ── Right leg ──
    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.11, 0.65, 0);
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.065, 5, 5), hakamaMat));
    const rThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.45, 5), hakamaMat);
    rThigh.position.y = -0.28; rightLegPivot.add(rThigh);
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), hakamaMat).translateY(-0.52));
    const rShin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.42, 5), hakamaMat);
    rShin.position.y = -0.75; rightLegPivot.add(rShin);
    const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.16), shoeMat);
    rShoe.position.set(0, -0.98, 0.03); rightLegPivot.add(rShoe);
    pm.add(rightLegPivot);
    pm._rightLeg = rightLegPivot;

    // ── Left leg ──
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.11, 0.65, 0);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.065, 5, 5), hakamaMat));
    const lThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.45, 5), hakamaMat);
    lThigh.position.y = -0.28; leftLegPivot.add(lThigh);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), hakamaMat).translateY(-0.52));
    const lShin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.42, 5), hakamaMat);
    lShin.position.y = -0.75; leftLegPivot.add(lShin);
    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.16), shoeMat);
    lShoe.position.set(0, -0.98, 0.03); leftLegPivot.add(lShoe);
    pm.add(leftLegPivot);
    pm._leftLeg = leftLegPivot;

    // ── Sash / waist wrap ──
    const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.25, 0.08, 8), sashMat);
    sash.position.y = 0.64; pm.add(sash);

    // ── Cursed energy aura (menacing red glow) ──
    const aura = new THREE.PointLight('#ff2244', 0.6, TILE * 3, 2);
    aura.position.y = 1.2; pm.add(aura);
    pm._auraLight = aura;

    pm._isSukuna = true;

    return pm;
}

// ─── SUKUNA WALK/IDLE ANIMATION ────────────────────────────
function updateSukunaAnimation(pm, dt, moving, walkCycle) {
    if (!pm._isSukuna) return false;

    const t = walkCycle;

    if (moving) {
        // Aggressive confident stride
        const stride = 0.65;
        const armSwing = 0.4;
        const bodyBob = Math.abs(Math.sin(t * 2)) * 0.05;

        if (pm._rightLeg) pm._rightLeg.rotation.x = Math.sin(t) * stride;
        if (pm._leftLeg) pm._leftLeg.rotation.x = Math.sin(t + Math.PI) * stride;

        // Arms swing with slightly bent posture (menacing)
        if (pm._rightArm) pm._rightArm.rotation.x = Math.sin(t + Math.PI) * armSwing - 0.1;
        if (pm._leftArm) pm._leftArm.rotation.x = Math.sin(t) * armSwing - 0.1;

        if (pm._torso) {
            pm._torso.rotation.x = 0.07; // lean forward — aggressive posture
            pm._torso.rotation.z = Math.sin(t) * 0.04;
        }

        pm.position.y = (fpsCamera.flyHeight || 0) + bodyBob;

        // Aura flares when moving
        if (pm._auraLight) pm._auraLight.intensity = 0.8 + Math.sin(t * 4) * 0.4;
    } else {
        // Idle — menacing stillness with slow breathing
        const breath = Math.sin(t * 0.5) * 0.02;

        // Arms slightly away from body (confident stance)
        if (pm._rightArm) {
            pm._rightArm.rotation.x = 0.08 + breath;
            pm._rightArm.rotation.z = -0.1;
        }
        if (pm._leftArm) {
            pm._leftArm.rotation.x = 0.08 + breath;
            pm._leftArm.rotation.z = 0.1;
        }

        if (pm._rightLeg) pm._rightLeg.rotation.x = 0;
        if (pm._leftLeg) pm._leftLeg.rotation.x = 0;

        if (pm._torso) {
            pm._torso.rotation.x = breath;
            pm._torso.rotation.z = 0;
        }

        pm.position.y = fpsCamera.flyHeight || 0;

        // Slow pulsing aura
        if (pm._auraLight) pm._auraLight.intensity = 0.5 + Math.sin(t * 0.4) * 0.2;
    }

    return true;
}

// ─── TOJI FUSHIGURO 3D MODEL ───────────────────────────────
function buildTojiModel() {
    const pm = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: '#d4b896', roughness: 0.5 });
    const scarSkinMat = new THREE.MeshStandardMaterial({ color: '#c0a080', roughness: 0.5 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.6 }); // black fitted shirt
    const pantsMat = new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.7 }); // dark cargo pants
    const beltMat = new THREE.MeshStandardMaterial({ color: '#4a3a2a', roughness: 0.5 }); // brown utility belt
    const hairMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.6 }); // black messy hair
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#1a3a1a' }); // dark green eyes
    const pupilMat = new THREE.MeshBasicMaterial({ color: '#000000' });
    const shoeMat = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.8 });
    const scarMat = new THREE.MeshBasicMaterial({ color: '#9a7a6a' }); // lip scar

    // ── Torso pivot ──
    const torsoPivot = new THREE.Group();
    torsoPivot.position.y = 0.65;

    // Upper body — fitted black shirt, muscular build
    const upperBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.9, 8), shirtMat);
    upperBody.position.y = 0.5; torsoPivot.add(upperBody);
    // Broad shoulders — Toji is built
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.26, 0.36), shirtMat);
    shoulders.position.y = 0.88; torsoPivot.add(shoulders);
    // Shirt collar — V-neck showing some chest
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.12, 6), shirtMat);
    collar.position.y = 1.02; torsoPivot.add(collar);
    // Exposed chest at V-neck
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.04), skinMat);
    chest.position.set(0, 0.98, 0.14); torsoPivot.add(chest);

    // ── Neck (thick, muscular) ──
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.14, 6), skinMat);
    neck.position.y = 1.13; torsoPivot.add(neck);

    // ── Head ──
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 10), skinMat);
    head.position.y = 1.38; head.scale.set(1, 1.03, 0.95); torsoPivot.add(head);

    // Strong jaw
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), skinMat);
    chin.position.set(0, 1.22, 0.12); chin.scale.set(1.3, 0.55, 1); torsoPivot.add(chin);

    // ── Scar on lip (right side) ──
    const scar = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.04, 0.01), scarMat);
    scar.position.set(0.05, 1.28, 0.21); torsoPivot.add(scar);

    // ── Eyes — sharp, narrow, green ──
    const eyeGeo = new THREE.SphereGeometry(0.03, 6, 6);
    const pupilGeo = new THREE.SphereGeometry(0.016, 4, 4);
    for (let s = -1; s <= 1; s += 2) {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(s * 0.085, 1.42, 0.2);
        torsoPivot.add(eye);
        const pupil = new THREE.Mesh(pupilGeo, pupilMat);
        pupil.position.set(s * 0.085, 1.42, 0.225);
        torsoPivot.add(pupil);
    }
    // Brow ridge — slightly furrowed, gives a stern look
    for (let s = -1; s <= 1; s += 2) {
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.02), skinMat);
        brow.position.set(s * 0.085, 1.46, 0.19);
        brow.rotation.z = s * -0.15; // angled inward — stern
        torsoPivot.add(brow);
    }

    // ── Nose ──
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.065, 4), skinMat);
    nose.position.set(0, 1.37, 0.22);
    nose.rotation.x = Math.PI * 0.6;
    torsoPivot.add(nose);

    // ── Mouth — slight smirk ──
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.01),
        new THREE.MeshBasicMaterial({ color: '#aa7766' }));
    mouth.position.set(0, 1.28, 0.2); torsoPivot.add(mouth);

    // ── Ears ──
    for (let s = -1; s <= 1; s += 2) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 5), skinMat);
        ear.position.set(s * 0.21, 1.4, 0);
        ear.scale.set(0.6, 1, 0.6);
        torsoPivot.add(ear);
    }

    // ── Hair — black, messy, medium length with bangs falling over forehead ──
    const hairBase = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), hairMat);
    hairBase.position.y = 1.48; hairBase.scale.set(1.05, 0.85, 1.05);
    torsoPivot.add(hairBase);
    // Messy spikes — less neat than Sukuna, more wild
    const hairSpikes = [
        // Top tufts
        { x: 0, y: 1.62, z: 0, rx: -0.1, rz: 0, h: 0.14 },
        { x: 0.08, y: 1.6, z: 0.02, rx: -0.15, rz: 0.25, h: 0.13 },
        { x: -0.08, y: 1.6, z: 0.02, rx: -0.15, rz: -0.25, h: 0.13 },
        { x: 0.14, y: 1.56, z: -0.02, rx: 0.1, rz: 0.5, h: 0.11 },
        { x: -0.14, y: 1.56, z: -0.02, rx: 0.1, rz: -0.5, h: 0.11 },
        // Back hair
        { x: 0, y: 1.55, z: -0.14, rx: 0.5, rz: 0, h: 0.14 },
        { x: 0.08, y: 1.53, z: -0.12, rx: 0.4, rz: 0.2, h: 0.12 },
        { x: -0.08, y: 1.53, z: -0.12, rx: 0.4, rz: -0.2, h: 0.12 },
        // Front bangs falling over forehead
        { x: 0.04, y: 1.55, z: 0.14, rx: -0.7, rz: 0.1, h: 0.14 },
        { x: -0.03, y: 1.56, z: 0.13, rx: -0.6, rz: -0.15, h: 0.13 },
        { x: 0.1, y: 1.53, z: 0.11, rx: -0.5, rz: 0.3, h: 0.11 },
        { x: -0.1, y: 1.54, z: 0.1, rx: -0.5, rz: -0.25, h: 0.1 },
    ];
    for (const sp of hairSpikes) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, sp.h, 4), hairMat);
        spike.position.set(sp.x, sp.y, sp.z);
        spike.rotation.set(sp.rx, 0, sp.rz);
        torsoPivot.add(spike);
    }

    // ── Right arm (muscular, bare below short sleeve) ──
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.44, 0.85, 0);
    // Shoulder
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), shirtMat));
    // Upper arm — shirt sleeve
    const rUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.25, 5), shirtMat);
    rUpperArm.position.y = -0.18; rightArmPivot.add(rUpperArm);
    // Lower upper arm — bare skin
    const rLowerUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.2, 5), skinMat);
    rLowerUpper.position.y = -0.38; rightArmPivot.add(rLowerUpper);
    // Elbow
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), skinMat).translateY(-0.5));
    // Forearm — bare, muscular
    const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.4, 5), skinMat);
    rForearm.position.y = -0.73; rightArmPivot.add(rForearm);
    // Hand
    const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.07), skinMat);
    rHand.position.set(0, -0.96, 0.02); rightArmPivot.add(rHand);
    // Fingers
    for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, 0.05, 3), skinMat);
        finger.position.set((f - 1.5) * 0.02, -1.02, 0.03);
        rightArmPivot.add(finger);
    }
    // ── Inverted Spear of Heaven (held in right hand) ──
    const spearGroup = new THREE.Group();
    spearGroup.position.set(0, -1.0, 0.04);
    spearGroup.rotation.x = Math.PI / 2; // spear points forward from hand
    // Shaft — long dark wooden pole
    const shaftMat = new THREE.MeshStandardMaterial({ color: '#3a2a1a', roughness: 0.7 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.4, 5), shaftMat);
    spearGroup.add(shaft);
    // Shaft wrap near grip
    const gripWrapMat = new THREE.MeshStandardMaterial({ color: '#5a4a3a', roughness: 0.5 });
    for (let w = 0; w < 4; w++) {
        const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.012, 5), gripWrapMat);
        wrap.position.y = -0.15 + w * 0.06;
        spearGroup.add(wrap);
    }
    // Spear head — dark metallic blade, wider at base tapering to point
    const spearHeadMat = new THREE.MeshStandardMaterial({ color: '#2a2a3a', metalness: 0.85, roughness: 0.15 });
    const spearHead = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 4), spearHeadMat);
    spearHead.position.y = 0.81;
    spearGroup.add(spearHead);
    // Spear head base collar
    const collarMat = new THREE.MeshStandardMaterial({ color: '#555555', metalness: 0.6, roughness: 0.3 });
    const spearCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.04, 6), collarMat);
    spearCollar.position.y = 0.69;
    spearGroup.add(spearCollar);
    // Butt cap
    const buttCap = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 5), collarMat);
    buttCap.position.y = -0.71;
    spearGroup.add(buttCap);
    // ── Inventory Curse (purple worm coiled around shaft) ──
    const wormMat = new THREE.MeshStandardMaterial({ color: '#5a2d82', roughness: 0.4, metalness: 0.1 });
    const wormBellyMat = new THREE.MeshStandardMaterial({ color: '#7a4da2', roughness: 0.5 });
    // Body segments spiraling around shaft
    const wormSegs = 12;
    for (let i = 0; i < wormSegs; i++) {
        const t = i / wormSegs;
        const angle = t * Math.PI * 3; // 1.5 full wraps
        const radius = 0.035;
        const segSize = 0.02 + Math.sin(t * Math.PI) * 0.008; // thicker in middle
        const seg = new THREE.Mesh(new THREE.SphereGeometry(segSize, 5, 5), wormMat);
        seg.position.set(
            Math.cos(angle) * radius,
            -0.3 + t * 0.9, // climb from lower shaft to near spear head
            Math.sin(angle) * radius
        );
        seg.scale.set(1, 1.3, 1); // slightly elongated
        spearGroup.add(seg);
    }
    // Worm head — near the spear blade, peeking out
    const wormHead = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), wormMat);
    wormHead.position.set(0.03, 0.62, 0.02);
    wormHead.scale.set(1.2, 1, 1);
    spearGroup.add(wormHead);
    // Worm eyes — tiny glowing dots
    const wormEyeMat = new THREE.MeshBasicMaterial({ color: '#ff44ff' });
    for (let s = -1; s <= 1; s += 2) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.006, 4, 4), wormEyeMat);
        eye.position.set(0.03 + s * 0.012, 0.63, 0.04);
        spearGroup.add(eye);
    }
    // Worm mouth — small dark slit
    const wormMouth = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.005, 0.005),
        new THREE.MeshBasicMaterial({ color: '#1a0a2a' }));
    wormMouth.position.set(0.03, 0.615, 0.045);
    spearGroup.add(wormMouth);
    // Tail tip — near the butt end, thinner
    const tailSegs = 4;
    for (let i = 0; i < tailSegs; i++) {
        const t = i / tailSegs;
        const angle = Math.PI * 3 + t * Math.PI * 0.8;
        const segSize = 0.015 - t * 0.003;
        const tail = new THREE.Mesh(new THREE.SphereGeometry(segSize, 4, 4), wormBellyMat);
        tail.position.set(
            Math.cos(angle) * 0.03,
            -0.35 - t * 0.2,
            Math.sin(angle) * 0.03
        );
        spearGroup.add(tail);
    }
    rightArmPivot.add(spearGroup);
    torsoPivot.add(rightArmPivot);
    pm._rightArm = rightArmPivot;

    // ── Left arm (mirrored) ──
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.44, 0.85, 0);
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), shirtMat));
    const lUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.25, 5), shirtMat);
    lUpperArm.position.y = -0.18; leftArmPivot.add(lUpperArm);
    const lLowerUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.2, 5), skinMat);
    lLowerUpper.position.y = -0.38; leftArmPivot.add(lLowerUpper);
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), skinMat).translateY(-0.5));
    const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.4, 5), skinMat);
    lForearm.position.y = -0.73; leftArmPivot.add(lForearm);
    const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.07), skinMat);
    lHand.position.set(0, -0.96, 0.02); leftArmPivot.add(lHand);
    for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, 0.05, 3), skinMat);
        finger.position.set((f - 1.5) * 0.02, -1.02, 0.03);
        leftArmPivot.add(finger);
    }
    torsoPivot.add(leftArmPivot);
    pm._leftArm = leftArmPivot;

    pm.add(torsoPivot);
    pm._torso = torsoPivot;

    // ── Right leg ──
    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.11, 0.65, 0);
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.065, 5, 5), pantsMat));
    const rThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.45, 5), pantsMat);
    rThigh.position.y = -0.28; rightLegPivot.add(rThigh);
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), pantsMat).translateY(-0.52));
    const rShin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.42, 5), pantsMat);
    rShin.position.y = -0.75; rightLegPivot.add(rShin);
    const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.17), shoeMat);
    rShoe.position.set(0, -0.98, 0.03); rightLegPivot.add(rShoe);
    pm.add(rightLegPivot);
    pm._rightLeg = rightLegPivot;

    // ── Left leg ──
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.11, 0.65, 0);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.065, 5, 5), pantsMat));
    const lThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.45, 5), pantsMat);
    lThigh.position.y = -0.28; leftLegPivot.add(lThigh);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), pantsMat).translateY(-0.52));
    const lShin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.42, 5), pantsMat);
    lShin.position.y = -0.75; leftLegPivot.add(lShin);
    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.17), shoeMat);
    lShoe.position.set(0, -0.98, 0.03); leftLegPivot.add(lShoe);
    pm.add(leftLegPivot);
    pm._leftLeg = leftLegPivot;

    // ── Utility belt ──
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.25, 0.07, 8), beltMat);
    belt.position.y = 0.63; pm.add(belt);
    // Belt pouches
    for (let s = -1; s <= 1; s += 2) {
        const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04),
            new THREE.MeshStandardMaterial({ color: '#3a2a1a', roughness: 0.6 }));
        pouch.position.set(s * 0.22, 0.6, 0.1);
        pm.add(pouch);
    }

    // No cursed energy aura — Toji has zero CE (Heavenly Restriction)
    // Instead, a very faint green tint from physical power
    pm._isToji = true;

    return pm;
}

// ─── TOJI WALK/IDLE ANIMATION ──────────────────────────────
function updateTojiAnimation(pm, dt, moving, walkCycle) {
    if (!pm._isToji) return false;

    const t = walkCycle;

    if (moving) {
        // Fast, light-footed assassin run — longer stride, lower bounce
        const stride = 0.75;
        const armSwing = 0.55;
        const bodyBob = Math.abs(Math.sin(t * 2)) * 0.04; // less bounce — efficient runner

        // Legs — fast, wide stride
        if (pm._rightLeg) pm._rightLeg.rotation.x = Math.sin(t) * stride;
        if (pm._leftLeg) pm._leftLeg.rotation.x = Math.sin(t + Math.PI) * stride;

        // Arms — one pumps, the other trails back slightly (assassin run)
        if (pm._rightArm) {
            pm._rightArm.rotation.x = Math.sin(t + Math.PI) * armSwing;
            pm._rightArm.rotation.z = 0;
        }
        if (pm._leftArm) {
            pm._leftArm.rotation.x = Math.sin(t) * armSwing * 0.7; // left arm swings less
            pm._leftArm.rotation.z = 0.05;
        }

        // Torso — lean forward more (sprinting posture)
        if (pm._torso) {
            pm._torso.rotation.x = 0.1;
            pm._torso.rotation.z = Math.sin(t) * 0.03;
        }

        pm.position.y = (fpsCamera.flyHeight || 0) + bodyBob;
    } else {
        // Idle — relaxed but alert, weight on one leg
        const breath = Math.sin(t * 0.5) * 0.015;

        // Right arm relaxed at side
        if (pm._rightArm) {
            pm._rightArm.rotation.x = 0.03 + breath;
            pm._rightArm.rotation.z = -0.05;
        }
        // Left arm — hand in pocket / resting on belt
        if (pm._leftArm) {
            pm._leftArm.rotation.x = 0.15;
            pm._leftArm.rotation.z = 0.12;
        }

        // Legs — slight asymmetric stance
        if (pm._rightLeg) pm._rightLeg.rotation.x = 0;
        if (pm._leftLeg) pm._leftLeg.rotation.x = 0.05; // one leg slightly forward

        if (pm._torso) {
            pm._torso.rotation.x = breath;
            pm._torso.rotation.z = 0.02; // slight lean
        }

        pm.position.y = fpsCamera.flyHeight || 0;
    }

    return true;
}

// ─── BROOK 3D MODEL ────────────────────────────────────────
function buildBrookModel() {
    const pm = new THREE.Group();
    const boneMat = new THREE.MeshStandardMaterial({ color: '#f5f0e0', roughness: 0.4, metalness: 0.1 });
    const darkBoneMat = new THREE.MeshStandardMaterial({ color: '#d8d0b8', roughness: 0.5 });
    const suitMat = new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.6 }); // black suit
    const shirtMat = new THREE.MeshStandardMaterial({ color: '#e8e0d0', roughness: 0.5 }); // white shirt underneath
    const tieMat = new THREE.MeshStandardMaterial({ color: '#cc8800', roughness: 0.5 }); // orange/yellow cravat
    const pantsMat = new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.7 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.8 });
    const afroMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9 }); // big black afro
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#000000' }); // hollow eye sockets

    // ── Torso pivot ──
    const torsoPivot = new THREE.Group();
    torsoPivot.position.y = 0.65;

    // Upper body — suit jacket (Brook is very tall and thin)
    const upperBody = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 1.0, 6), suitMat);
    upperBody.position.y = 0.55; torsoPivot.add(upperBody);
    // Shoulders — narrow, bony
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.25), suitMat);
    shoulders.position.y = 0.95; torsoPivot.add(shoulders);
    // White shirt V at chest
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.04), shirtMat);
    shirt.position.set(0, 0.85, 0.12); torsoPivot.add(shirt);
    // Cravat / bow tie — orange-yellow
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.03), tieMat);
    tie.position.set(0, 0.93, 0.13); torsoPivot.add(tie);
    // Suit jacket lapels
    for (let s = -1; s <= 1; s += 2) {
        const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.03), suitMat);
        lapel.position.set(s * 0.07, 0.85, 0.13);
        lapel.rotation.z = s * 0.15;
        torsoPivot.add(lapel);
    }

    // ── Neck — thin bony ──
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.18, 5), boneMat);
    neck.position.y = 1.15; torsoPivot.add(neck);

    // ── Skull head ──
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), boneMat);
    skull.position.y = 1.42; skull.scale.set(1, 1.1, 0.95); torsoPivot.add(skull);
    // Jaw — separate lower jaw bone
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), darkBoneMat);
    jaw.position.set(0, 1.28, 0.08); jaw.scale.set(1.2, 0.5, 0.9); torsoPivot.add(jaw);
    // Teeth — upper row
    for (let t = 0; t < 5; t++) {
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.015), boneMat);
        tooth.position.set((t - 2) * 0.025, 1.31, 0.16);
        torsoPivot.add(tooth);
    }
    // Teeth — lower row
    for (let t = 0; t < 5; t++) {
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.015), darkBoneMat);
        tooth.position.set((t - 2) * 0.025, 1.27, 0.15);
        torsoPivot.add(tooth);
    }

    // ── Eye sockets — hollow dark holes ──
    for (let s = -1; s <= 1; s += 2) {
        const socket = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
        socket.position.set(s * 0.07, 1.46, 0.16);
        torsoPivot.add(socket);
        // Tiny soul light inside each eye
        const soulLight = new THREE.Mesh(new THREE.SphereGeometry(0.012, 4, 4),
            new THREE.MeshBasicMaterial({ color: '#88ccff' }));
        soulLight.position.set(s * 0.07, 1.46, 0.17);
        torsoPivot.add(soulLight);
    }
    // Nose hole — just a dark triangle indent
    const noseHole = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.03, 3),
        new THREE.MeshBasicMaterial({ color: '#1a1a1a' }));
    noseHole.position.set(0, 1.39, 0.19);
    noseHole.rotation.x = Math.PI;
    torsoPivot.add(noseHole);

    // ── AFRO — big round black afro ──
    const afro = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), afroMat);
    afro.position.y = 1.55; afro.scale.set(1.1, 1.0, 1.05);
    torsoPivot.add(afro);

    // ── Right arm (bony, suit sleeve) ──
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.34, 0.9, 0);
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), suitMat));
    // Upper arm — suit sleeve
    const rUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.45, 4), suitMat);
    rUpperArm.position.y = -0.28; rightArmPivot.add(rUpperArm);
    // Elbow joint — bone
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 4, 4), boneMat).translateY(-0.52));
    // Forearm — bone (no flesh, he's a skeleton)
    const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.4, 4), boneMat);
    rForearm.position.y = -0.73; rightArmPivot.add(rForearm);
    // Hand — bony
    const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.05), boneMat);
    rHand.position.set(0, -0.96, 0.02); rightArmPivot.add(rHand);
    // Bony fingers
    for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.005, 0.05, 3), boneMat);
        finger.position.set((f - 1.5) * 0.015, -1.01, 0.03);
        rightArmPivot.add(finger);
    }
    // ── Soul Solid cane sword (held in right hand) ──
    const caneGroup = new THREE.Group();
    caneGroup.position.set(0, -1.0, 0.04);
    caneGroup.rotation.x = Math.PI / 2; // cane points forward
    // Cane shaft — elegant dark purple-black
    const caneMat = new THREE.MeshStandardMaterial({ color: '#1a0a2a', roughness: 0.4, metalness: 0.2 });
    const caneShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.1, 5), caneMat);
    caneGroup.add(caneShaft);
    // Cane handle — curved hook shape (skull/music note motif)
    const handleMat = new THREE.MeshStandardMaterial({ color: '#d4af37', metalness: 0.7, roughness: 0.2 }); // gold
    // Hook curve
    const hookCurve = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 5, 8, Math.PI), handleMat);
    hookCurve.position.set(0.04, -0.58, 0);
    hookCurve.rotation.z = Math.PI / 2;
    caneGroup.add(hookCurve);
    // Hook grip top
    const hookTop = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 5), handleMat);
    hookTop.position.y = -0.56;
    caneGroup.add(hookTop);
    // Cane tip — small metal cap
    const tipMat = new THREE.MeshStandardMaterial({ color: '#888888', metalness: 0.6, roughness: 0.3 });
    const caneTip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.008, 0.03, 5), tipMat);
    caneTip.position.y = 0.57;
    caneGroup.add(caneTip);
    // Hidden blade inside — faint icy blue glow at the seam
    const seamGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.008, 6),
        new THREE.MeshBasicMaterial({ color: '#88ccff', transparent: true, opacity: 0.5 }));
    seamGlow.position.y = -0.3;
    caneGroup.add(seamGlow);
    rightArmPivot.add(caneGroup);
    torsoPivot.add(rightArmPivot);
    pm._rightArm = rightArmPivot;

    // ── Left arm (mirrored) ──
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.34, 0.9, 0);
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), suitMat));
    const lUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.45, 4), suitMat);
    lUpperArm.position.y = -0.28; leftArmPivot.add(lUpperArm);
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 4, 4), boneMat).translateY(-0.52));
    const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.4, 4), boneMat);
    lForearm.position.y = -0.73; leftArmPivot.add(lForearm);
    const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.05), boneMat);
    lHand.position.set(0, -0.96, 0.02); leftArmPivot.add(lHand);
    for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.005, 0.05, 3), boneMat);
        finger.position.set((f - 1.5) * 0.015, -1.01, 0.03);
        leftArmPivot.add(finger);
    }
    torsoPivot.add(leftArmPivot);
    pm._leftArm = leftArmPivot;

    pm.add(torsoPivot);
    pm._torso = torsoPivot;

    // ── Right leg (thin bone legs in suit pants) ──
    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.08, 0.65, 0);
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), pantsMat));
    const rThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.5, 4), pantsMat);
    rThigh.position.y = -0.3; rightLegPivot.add(rThigh);
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), pantsMat).translateY(-0.56));
    const rShin = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.46, 4), pantsMat);
    rShin.position.y = -0.8; rightLegPivot.add(rShin);
    // Pointy dress shoes
    const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.16), shoeMat);
    rShoe.position.set(0, -1.05, 0.04); rightLegPivot.add(rShoe);
    // Shoe tip
    const rShoeTip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 4), shoeMat);
    rShoeTip.position.set(0, -1.05, 0.14); rShoeTip.rotation.x = Math.PI / 2;
    rightLegPivot.add(rShoeTip);
    pm.add(rightLegPivot);
    pm._rightLeg = rightLegPivot;

    // ── Left leg ──
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.08, 0.65, 0);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), pantsMat));
    const lThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.5, 4), pantsMat);
    lThigh.position.y = -0.3; leftLegPivot.add(lThigh);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), pantsMat).translateY(-0.56));
    const lShin = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.46, 4), pantsMat);
    lShin.position.y = -0.8; leftLegPivot.add(lShin);
    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.16), shoeMat);
    lShoe.position.set(0, -1.05, 0.04); leftLegPivot.add(lShoe);
    const lShoeTip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 4), shoeMat);
    lShoeTip.position.set(0, -1.05, 0.14); lShoeTip.rotation.x = Math.PI / 2;
    leftLegPivot.add(lShoeTip);
    pm.add(leftLegPivot);
    pm._leftLeg = leftLegPivot;

    // ── Soul aura — faint icy blue glow ──
    const aura = new THREE.PointLight('#88ccff', 0.5, TILE * 3, 2);
    aura.position.y = 1.2; pm.add(aura);
    pm._auraLight = aura;

    pm._isBrook = true;
    return pm;
}

// ─── BROOK WALK/IDLE ANIMATION ─────────────────────────────
function updateBrookAnimation(pm, dt, moving, walkCycle) {
    if (!pm._isBrook) return false;

    const t = walkCycle;

    if (moving) {
        // Lanky, bouncy, jaunty skeleton run — long strides, lots of bounce
        const stride = 0.7;
        const armSwing = 0.6;
        const bodyBob = Math.abs(Math.sin(t * 2)) * 0.1; // exaggerated bounce

        if (pm._rightLeg) pm._rightLeg.rotation.x = Math.sin(t) * stride;
        if (pm._leftLeg) pm._leftLeg.rotation.x = Math.sin(t + Math.PI) * stride;

        // Arms swing wide — floppy skeleton energy
        if (pm._rightArm) {
            pm._rightArm.rotation.x = Math.sin(t + Math.PI) * armSwing;
            pm._rightArm.rotation.z = Math.sin(t * 2) * 0.1; // slight flail
        }
        if (pm._leftArm) {
            pm._leftArm.rotation.x = Math.sin(t) * armSwing;
            pm._leftArm.rotation.z = Math.sin(t * 2 + 1) * -0.1;
        }

        // Torso — slight forward lean + exaggerated side sway
        if (pm._torso) {
            pm._torso.rotation.x = 0.06;
            pm._torso.rotation.z = Math.sin(t) * 0.06; // more sway than others
        }

        pm.position.y = (fpsCamera.flyHeight || 0) + bodyBob;

        if (pm._auraLight) pm._auraLight.intensity = 0.5 + Math.sin(t * 3) * 0.2;
    } else {
        // Idle — gentleman skeleton pose, slight head tilt, body sway
        const breath = Math.sin(t * 0.4) * 0.02;
        const sway = Math.sin(t * 0.25) * 0.025;

        // Right arm relaxed, left arm slightly out (gentleman stance)
        if (pm._rightArm) {
            pm._rightArm.rotation.x = 0.05 + breath;
            pm._rightArm.rotation.z = -0.08;
        }
        if (pm._leftArm) {
            pm._leftArm.rotation.x = 0.1 + breath;
            pm._leftArm.rotation.z = 0.15; // hand slightly out
        }

        if (pm._rightLeg) pm._rightLeg.rotation.x = 0;
        if (pm._leftLeg) pm._leftLeg.rotation.x = 0;

        if (pm._torso) {
            pm._torso.rotation.x = breath;
            pm._torso.rotation.z = sway; // gentle sway side to side
        }

        pm.position.y = fpsCamera.flyHeight || 0;

        if (pm._auraLight) pm._auraLight.intensity = 0.4 + Math.sin(t * 0.3) * 0.15;
    }

    return true;
}

// ─── 1ST-PERSON VIEWMODEL SWORD (visible when looking down) ─
function buildFPSSword() {
    const group = new THREE.Group();

    const hiltMat = new THREE.MeshStandardMaterial({ color: '#2a1a1a', roughness: 0.6 });
    const wrapMat = new THREE.MeshStandardMaterial({ color: '#4a2030', roughness: 0.5 });
    const guardMat = new THREE.MeshStandardMaterial({ color: '#333333', metalness: 0.6, roughness: 0.3 });
    const bladeMat = new THREE.MeshStandardMaterial({ color: '#1a1a2a', metalness: 0.8, roughness: 0.15 });
    const edgeGlowMat = new THREE.MeshBasicMaterial({ color: '#ff2244', transparent: true, opacity: 0.6 });
    const tipMat = new THREE.MeshStandardMaterial({ color: '#1a1a2a', metalness: 0.8, roughness: 0.15 });

    // Hilt
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 5), hiltMat);
    group.add(hilt);
    // Wrap bands
    for (let w = 0; w < 3; w++) {
        const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.012, 5), wrapMat);
        wrap.position.y = -0.04 + w * 0.04;
        group.add(wrap);
    }
    // Guard
    const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 6), guardMat);
    guard.position.y = 0.07;
    group.add(guard);
    // Blade
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.5, 0.006), bladeMat);
    blade.position.y = 0.33;
    group.add(blade);
    // Edge glow
    const edgeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.5, 0.009), edgeGlowMat);
    edgeGlow.position.set(0.01, 0.33, 0);
    group.add(edgeGlow);
    // Tip
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.06, 4), tipMat);
    tip.position.y = 0.61;
    group.add(tip);
    // Pommel
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.017, 5, 5), guardMat);
    pommel.position.y = -0.07;
    group.add(pommel);

    // Position in camera space: lower-right, angled forward
    group.position.set(0.25, -0.35, -0.4);
    group.rotation.set(-0.3, 0, -0.15); // slight tilt

    return group;
}

// ─── 1ST-PERSON VIEWMODEL SPEAR (Toji) ─────────────────────
function buildFPSSpear() {
    const group = new THREE.Group();

    const shaftMat = new THREE.MeshStandardMaterial({ color: '#3a2a1a', roughness: 0.7 });
    const gripWrapMat = new THREE.MeshStandardMaterial({ color: '#5a4a3a', roughness: 0.5 });
    const headMat = new THREE.MeshStandardMaterial({ color: '#2a2a3a', metalness: 0.85, roughness: 0.15 });
    const collarMat = new THREE.MeshStandardMaterial({ color: '#555555', metalness: 0.6, roughness: 0.3 });
    const glowMat = new THREE.MeshBasicMaterial({ color: '#2a6e3f', transparent: true, opacity: 0.3 });

    // Shaft — long pole
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 5), shaftMat);
    group.add(shaft);
    // Grip wraps
    for (let w = 0; w < 4; w++) {
        const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.01, 5), gripWrapMat);
        wrap.position.y = -0.12 + w * 0.05;
        group.add(wrap);
    }
    // Spear head collar
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.016, 0.03, 6), collarMat);
    collar.position.y = 0.5;
    group.add(collar);
    // Spear head — pointed blade
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16, 4), headMat);
    head.position.y = 0.6;
    group.add(head);
    // Butt cap
    const butt = new THREE.Mesh(new THREE.SphereGeometry(0.014, 5, 5), collarMat);
    butt.position.y = -0.51;
    group.add(butt);

    // ── Inventory Curse (purple worm coiled around shaft) ──
    const wormMat = new THREE.MeshStandardMaterial({ color: '#5a2d82', roughness: 0.4, metalness: 0.1 });
    const wormBellyMat = new THREE.MeshStandardMaterial({ color: '#7a4da2', roughness: 0.5 });
    const fpsWormSegs = 10;
    for (let i = 0; i < fpsWormSegs; i++) {
        const t = i / fpsWormSegs;
        const angle = t * Math.PI * 2.5;
        const radius = 0.025;
        const segSize = 0.014 + Math.sin(t * Math.PI) * 0.005;
        const seg = new THREE.Mesh(new THREE.SphereGeometry(segSize, 4, 4), wormMat);
        seg.position.set(
            Math.cos(angle) * radius,
            -0.2 + t * 0.65,
            Math.sin(angle) * radius
        );
        seg.scale.set(1, 1.3, 1);
        group.add(seg);
    }
    // Worm head peeking near blade
    const fpsWormHead = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 5), wormMat);
    fpsWormHead.position.set(0.022, 0.46, 0.015);
    fpsWormHead.scale.set(1.2, 1, 1);
    group.add(fpsWormHead);
    // Eyes
    const fpsWormEyeMat = new THREE.MeshBasicMaterial({ color: '#ff44ff' });
    for (let s = -1; s <= 1; s += 2) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.004, 3, 3), fpsWormEyeMat);
        eye.position.set(0.022 + s * 0.008, 0.465, 0.03);
        group.add(eye);
    }

    // Position in camera space: lower-right, angled forward and more extended
    group.position.set(0.2, -0.3, -0.5);
    group.rotation.set(-0.2, 0, -0.1);

    return group;
}

// ─── 1ST-PERSON VIEWMODEL SOUL CANE (Brook) ────────────────
function buildFPSCane() {
    const group = new THREE.Group();

    const caneMat = new THREE.MeshStandardMaterial({ color: '#1a0a2a', roughness: 0.4, metalness: 0.2 });
    const handleMat = new THREE.MeshStandardMaterial({ color: '#d4af37', metalness: 0.7, roughness: 0.2 });
    const tipMat = new THREE.MeshStandardMaterial({ color: '#888888', metalness: 0.6, roughness: 0.3 });

    // Cane shaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.85, 5), caneMat);
    group.add(shaft);
    // Hook handle
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 5, 8, Math.PI), handleMat);
    hook.position.set(0.03, -0.44, 0);
    hook.rotation.z = Math.PI / 2;
    group.add(hook);
    // Hook top ball
    const hookBall = new THREE.Mesh(new THREE.SphereGeometry(0.014, 5, 5), handleMat);
    hookBall.position.y = -0.43;
    group.add(hookBall);
    // Tip cap
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.006, 0.025, 5), tipMat);
    tip.position.y = 0.44;
    group.add(tip);
    // Blue seam glow (hidden blade)
    const seam = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.006, 6),
        new THREE.MeshBasicMaterial({ color: '#88ccff', transparent: true, opacity: 0.5 }));
    seam.position.y = -0.22;
    group.add(seam);

    // Position in camera space
    group.position.set(0.22, -0.32, -0.45);
    group.rotation.set(-0.25, 0, -0.12);

    return group;
}

// Cane swing patterns — elegant fencing thrusts and iaido draws
const CANE_SWINGS = [
    // Step 0: quick thrust forward
    { startRot: { x: -0.25, y: 0, z: -0.12 }, endRot: { x: -0.25, y: 0, z: -0.12 },
      startPos: { x: 0.22, y: -0.32, z: -0.3 }, endPos: { x: 0.22, y: -0.28, z: -0.85 }, dur: 110 },
    // Step 1: upward draw slash (pulling blade out)
    { startRot: { x: 0.2, y: 0.15, z: -0.1 }, endRot: { x: -0.7, y: -0.1, z: 0.1 },
      startPos: { x: 0.25, y: -0.45, z: -0.35 }, endPos: { x: 0.15, y: 0.0, z: -0.6 }, dur: 130 },
    // Step 2: elegant side sweep
    { startRot: { x: -0.25, y: 0.4, z: -0.2 }, endRot: { x: -0.25, y: -0.4, z: 0.2 },
      startPos: { x: 0.35, y: -0.3, z: -0.4 }, endPos: { x: -0.1, y: -0.3, z: -0.5 }, dur: 120 },
    // Step 3 (finisher): iaido — pull blade, wide slash, resheathe
    { startRot: { x: -1.2, y: 0.3, z: -0.6 }, endRot: { x: 0.3, y: -0.3, z: 0.4 },
      startPos: { x: 0.3, y: -0.1, z: -0.3 }, endPos: { x: -0.05, y: -0.45, z: -0.6 }, dur: 160 },
];

const CANE_REST = { x: 0.22, y: -0.32, z: -0.45, rx: -0.25, ry: 0, rz: -0.12 };

// Spear swing patterns — thrusts and sweeps instead of slashes
const SPEAR_SWINGS = [
    // Step 0: straight poke — spear jabs forward
    { startRot: { x: -0.2, y: 0, z: -0.1 }, endRot: { x: -0.2, y: 0, z: -0.1 },
      startPos: { x: 0.2, y: -0.3, z: -0.35 }, endPos: { x: 0.2, y: -0.28, z: -0.9 }, dur: 100 },
    // Step 1: poke slightly angled right
    { startRot: { x: -0.2, y: 0.15, z: -0.05 }, endRot: { x: -0.2, y: 0.15, z: -0.05 },
      startPos: { x: 0.25, y: -0.32, z: -0.35 }, endPos: { x: 0.25, y: -0.26, z: -0.9 }, dur: 100 },
    // Step 2: poke slightly angled left
    { startRot: { x: -0.2, y: -0.15, z: -0.1 }, endRot: { x: -0.2, y: -0.15, z: -0.1 },
      startPos: { x: 0.15, y: -0.28, z: -0.35 }, endPos: { x: 0.15, y: -0.24, z: -0.9 }, dur: 100 },
    // Step 3 (finisher): dash-thrust — pulls back then lunges far forward
    { startRot: { x: -0.15, y: 0, z: -0.1 }, endRot: { x: -0.15, y: 0, z: -0.1 },
      startPos: { x: 0.2, y: -0.25, z: -0.15 }, endPos: { x: 0.2, y: -0.25, z: -1.1 }, dur: 150 },
];

const SPEAR_REST = { x: 0.2, y: -0.3, z: -0.5, rx: -0.2, ry: 0, rz: -0.1 };

// ─── SWORD SWING ANIMATION ─────────────────────────────────
// Swing patterns per combo step — diagonal slashes alternating sides
const SWORD_SWINGS = [
    // Step 0: top-right to bottom-left diagonal slash
    { startRot: { x: -1.2, y: 0.3, z: -0.8 }, endRot: { x: 0.4, y: -0.3, z: 0.5 },
      startPos: { x: 0.35, y: 0.0, z: -0.3 }, endPos: { x: -0.1, y: -0.5, z: -0.5 }, dur: 150 },
    // Step 1: top-left to bottom-right diagonal slash
    { startRot: { x: -1.2, y: -0.4, z: 0.8 }, endRot: { x: 0.4, y: 0.3, z: -0.5 },
      startPos: { x: -0.1, y: 0.0, z: -0.3 }, endPos: { x: 0.35, y: -0.5, z: -0.5 }, dur: 150 },
    // Step 2: horizontal right-to-left sweep
    { startRot: { x: -0.3, y: 0.6, z: -0.4 }, endRot: { x: -0.3, y: -0.6, z: 0.4 },
      startPos: { x: 0.45, y: -0.2, z: -0.3 }, endPos: { x: -0.2, y: -0.2, z: -0.5 }, dur: 140 },
    // Step 3 (finisher): big overhead slam
    { startRot: { x: -1.8, y: 0, z: 0 }, endRot: { x: 0.6, y: 0, z: 0 },
      startPos: { x: 0.15, y: 0.2, z: -0.25 }, endPos: { x: 0.15, y: -0.6, z: -0.55 }, dur: 200 },
];

// Resting position of the viewmodel sword
const SWORD_REST = { x: 0.25, y: -0.35, z: -0.4, rx: -0.3, ry: 0, rz: -0.15 };

function triggerSwordSwing(comboStep) {
    // Pick the right swing set based on character
    const isToji = player?.classId === 'toji';
    const isBrook = player?.classId === 'brook';
    const swings = isToji ? SPEAR_SWINGS : isBrook ? CANE_SWINGS : SWORD_SWINGS;
    const pattern = swings[comboStep % swings.length];
    swordSwing = {
        startTime: performance.now(),
        dur: pattern.dur,
        returnDur: 120,
        pattern,
        phase: 'swing',
        _restPos: isToji ? SPEAR_REST : isBrook ? CANE_REST : SWORD_REST,
    };

    // 3rd person arm swing
    const pm = fpsCamera.playerModel;
    if (pm && pm._rightArm) {
        const armSwings = isToji ? [
            { x: -1.3, z: 0 },     // poke
            { x: -1.3, z: -0.15 }, // poke right
            { x: -1.3, z: 0.15 },  // poke left
            { x: -1.6, z: 0 },     // dash-thrust
        ] : isBrook ? [
            { x: -1.3, z: 0 },     // thrust
            { x: -1.6, z: 0.4 },   // upward draw
            { x: -0.3, z: -0.7 },  // side sweep
            { x: -1.8, z: -0.5 },  // iaido slash
        ] : [
            { x: -1.5, z: -0.6 },
            { x: -1.5, z: 0.6 },
            { x: -0.3, z: -0.8 },
            { x: -2.0, z: 0 },
        ];
        const armTarget = armSwings[comboStep % armSwings.length];
        pm._rightArm.rotation.x = armTarget.x;
        pm._rightArm.rotation.z = armTarget.z;
        setTimeout(() => {
            if (pm._rightArm) {
                pm._rightArm.rotation.x = 0.05;
                pm._rightArm.rotation.z = 0;
            }
        }, pattern.dur + 100);
    }
}

function updateSwordSwing() {
    if (!fpsSword || !swordSwing) return;

    const now = performance.now();
    const elapsed = now - swordSwing.startTime;
    const p = swordSwing.pattern;

    if (swordSwing.phase === 'swing') {
        const t = Math.min(elapsed / swordSwing.dur, 1);
        // Ease-out for snappy feel
        const ease = 1 - Math.pow(1 - t, 3);

        fpsSword.position.set(
            p.startPos.x + (p.endPos.x - p.startPos.x) * ease,
            p.startPos.y + (p.endPos.y - p.startPos.y) * ease,
            p.startPos.z + (p.endPos.z - p.startPos.z) * ease
        );
        fpsSword.rotation.set(
            p.startRot.x + (p.endRot.x - p.startRot.x) * ease,
            p.startRot.y + (p.endRot.y - p.startRot.y) * ease,
            p.startRot.z + (p.endRot.z - p.startRot.z) * ease
        );

        if (t >= 1) {
            swordSwing.phase = 'return';
            swordSwing.startTime = now;
        }
    } else if (swordSwing.phase === 'return') {
        const t = Math.min((elapsed) / swordSwing.returnDur, 1);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const rest = swordSwing._restPos || SWORD_REST;

        fpsSword.position.set(
            p.endPos.x + (rest.x - p.endPos.x) * ease,
            p.endPos.y + (rest.y - p.endPos.y) * ease,
            p.endPos.z + (rest.z - p.endPos.z) * ease
        );
        fpsSword.rotation.set(
            p.endRot.x + (rest.rx - p.endRot.x) * ease,
            p.endRot.y + (rest.ry - p.endRot.y) * ease,
            p.endRot.z + (rest.rz - p.endRot.z) * ease
        );

        if (t >= 1) {
            swordSwing = null;
            fpsSword.position.set(rest.x, rest.y, rest.z);
            fpsSword.rotation.set(rest.rx, rest.ry, rest.rz);
        }
    }
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
    if (player.classId === 'gojo') {
        pm = buildGojoModel();
        addPlayerLabel(pm, 'GOJO', '#4fc3f7');
    } else if (player.classId === 'sukuna') {
        pm = buildSukunaModel();
        addPlayerLabel(pm, 'SUKUNA', '#ff2244');
    } else if (player.classId === 'toji') {
        pm = buildTojiModel();
        addPlayerLabel(pm, 'TOJI', '#2a6e3f');
    } else if (player.classId === 'brook') {
        pm = buildBrookModel();
        addPlayerLabel(pm, 'BROOK', '#88ccff');
    } else {
        pm = buildGenericPlayerModel(player.cls);
    }
    fpsCamera.flyHeight = 0;
    pm.visible = false;
    scene.add(pm);
    fpsCamera.playerModel = pm;

    // 1st-person viewmodel weapon
    if (fpsSword) { camera.remove(fpsSword); fpsSword = null; }
    if (player.classId === 'sukuna') {
        fpsSword = buildFPSSword();
        camera.add(fpsSword);
    } else if (player.classId === 'toji') {
        fpsSword = buildFPSSpear();
        camera.add(fpsSword);
    } else if (player.classId === 'brook') {
        fpsSword = buildFPSCane();
        camera.add(fpsSword);
    }
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

// ═══════════════════════════════════════════════════════════════
//  PARTICLE ENGINE + EFFECT PRESETS
// ═══════════════════════════════════════════════════════════════

// ── Particle Pool ──
const PARTICLE_POOL_SIZE = 300;
const particles = [];
let particlePoolReady = false;

function initParticlePool() {
    if (particlePoolReady) return;
    particlePoolReady = true;
    const geo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
        const mat = new THREE.MeshBasicMaterial({
            color: '#ffffff', transparent: true, opacity: 0,
            side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false;
        scene.add(mesh);
        particles.push({
            mesh, vx: 0, vy: 0, vz: 0,
            life: 0, maxLife: 0, size: 1, sizeEnd: 0,
            gravity: 0, drag: 0
        });
    }
}

// Core emitter — config: { color, count, speed, spread, gravity, life, size, sizeEnd, drag, blending, yOffset }
function emitParticles(x, y, z, config) {
    initParticlePool();
    const c = config;
    const count = c.count || 10;
    const colors = Array.isArray(c.color) ? c.color : [c.color || '#ff6600'];
    for (let i = 0; i < count; i++) {
        let p = null;
        for (const pp of particles) { if (!pp.mesh.visible) { p = pp; break; } }
        if (!p) continue;

        const col = colors[Math.floor(Math.random() * colors.length)];
        p.mesh.material.color.set(col);
        p.mesh.material.blending = c.additive !== false ? THREE.AdditiveBlending : THREE.NormalBlending;
        p.mesh.material.opacity = c.opacity || 1;
        p.mesh.visible = true;

        const spread = c.spread || 1;
        p.mesh.position.set(
            x + (Math.random() - 0.5) * spread,
            y + (Math.random() - 0.5) * spread * 0.5 + (c.yOffset || 0),
            z + (Math.random() - 0.5) * spread
        );

        const spd = c.speed || 3;
        if (c.direction) {
            // Directional emission
            p.vx = c.direction.x * spd + (Math.random() - 0.5) * spd * 0.4;
            p.vy = c.direction.y * spd + (Math.random() - 0.5) * spd * 0.3;
            p.vz = c.direction.z * spd + (Math.random() - 0.5) * spd * 0.4;
        } else {
            // Radial burst
            const angle = Math.random() * Math.PI * 2;
            const upward = c.upward || 0.5;
            p.vx = Math.cos(angle) * spd * (0.5 + Math.random() * 0.5);
            p.vy = (Math.random() * upward + upward * 0.5) * spd;
            p.vz = Math.sin(angle) * spd * (0.5 + Math.random() * 0.5);
        }

        const sz = c.size || 0.3;
        p.size = sz + Math.random() * sz * 0.5;
        p.sizeEnd = c.sizeEnd !== undefined ? c.sizeEnd : 0;
        p.mesh.scale.setScalar(p.size);

        p.life = (c.life || 20) + Math.random() * (c.lifeVar || 10);
        p.maxLife = p.life;
        p.gravity = c.gravity !== undefined ? c.gravity : -8;
        p.drag = c.drag || 0.98;
    }
}

function updateParticles(dt) {
    for (const p of particles) {
        if (!p.mesh.visible) continue;
        p.life--;
        if (p.life <= 0) { p.mesh.visible = false; continue; }

        const t = p.life / p.maxLife; // 1 → 0
        // Move
        p.vx *= p.drag; p.vy *= p.drag; p.vz *= p.drag;
        p.vy += p.gravity * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        // Fade + shrink
        p.mesh.material.opacity = t * (p.maxLife > 30 ? 0.7 : 1);
        const s = p.sizeEnd + (p.size - p.sizeEnd) * t;
        p.mesh.scale.setScalar(s);
        // Billboard — face camera
        p.mesh.lookAt(camera.position);
    }
}

// ── EFFECT PRESETS ──────────────────────────────────────────

// Fire burst at a point
function fireEffect(x, y, z, intensity) {
    const n = intensity || 1;
    emitParticles(x, y, z, {
        color: ['#ff6600', '#ff8800', '#ffaa00', '#ffcc00', '#ff4400'],
        count: Math.round(20 * n), speed: 3 * n, spread: 0.5 * n,
        gravity: -2, life: 20, lifeVar: 15, size: 0.3 * n, sizeEnd: 0.05,
        upward: 1.5, drag: 0.96
    });
    // Embers (small, slower, longer lived)
    emitParticles(x, y, z, {
        color: ['#ff4400', '#cc2200'], count: Math.round(8 * n),
        speed: 1.5, spread: 0.3, gravity: -1, life: 30, lifeVar: 20,
        size: 0.1, sizeEnd: 0, upward: 2, drag: 0.99
    });
    // Light flash
    lightFlash(x, y, z, '#ff6600', 3 * n, 300);
}

// Fire breath cone — particles streaming in a direction
function fireBreathEffect(x, y, z, dirX, dirY, dirZ, duration, intensity) {
    const n = intensity || 1;
    const burstCount = Math.round(duration / 50);
    for (let i = 0; i < burstCount; i++) {
        setTimeout(() => {
            emitParticles(x, y, z, {
                color: ['#ff6600', '#ff8800', '#ffcc00', '#ffffff'],
                count: Math.round(6 * n), speed: 10 * n, spread: 0.3,
                direction: { x: dirX, y: dirY, z: dirZ },
                gravity: -1, life: 12, lifeVar: 6, size: 0.25 * n, sizeEnd: 0.4 * n,
                drag: 0.95
            });
        }, i * 50);
    }
    lightFlash(x, y, z, '#ff8800', 4 * n, duration);
}

// Beam effect — stretched glowing cylinder
function beamEffect(startX, startY, startZ, endX, endY, endZ, color, duration, width) {
    const dx = endX - startX, dy = endY - startY, dz = endZ - startZ;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const midX = (startX + endX) / 2, midY = (startY + endY) / 2, midZ = (startZ + endZ) / 2;

    const geo = new THREE.CylinderGeometry(width || 0.15, width || 0.15, len, 6);
    const mat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false
    });
    const beam = new THREE.Mesh(geo, mat);
    beam.position.set(midX, midY, midZ);
    beam.lookAt(endX, endY, endZ);
    beam.rotateX(Math.PI / 2);
    scene.add(beam);

    // Glow
    const glow = new THREE.PointLight(color, 3, TILE * 4, 2);
    glow.position.set(midX, midY, midZ);
    scene.add(glow);

    // Outer glow cylinder
    const outerGeo = new THREE.CylinderGeometry((width || 0.15) * 2.5, (width || 0.15) * 2.5, len, 6);
    const outerMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.2,
        blending: THREE.AdditiveBlending, depthWrite: false
    });
    const outer = new THREE.Mesh(outerGeo, outerMat);
    outer.position.copy(beam.position);
    outer.rotation.copy(beam.rotation);
    scene.add(outer);

    // Particles along beam
    const steps = Math.max(3, Math.round(len / 2));
    for (let i = 0; i < steps; i++) {
        const t = i / steps;
        emitParticles(
            startX + dx * t, startY + dy * t, startZ + dz * t,
            { color: [color, '#ffffff'], count: 3, speed: 1.5, spread: 0.3,
              gravity: 0, life: 10, size: 0.15, sizeEnd: 0, drag: 0.95 }
        );
    }

    // Fade and remove
    const dur = duration || 400;
    const startTime = performance.now();
    const animateBeam = () => {
        const elapsed = performance.now() - startTime;
        const t = 1 - elapsed / dur;
        if (t <= 0) {
            scene.remove(beam); scene.remove(outer); scene.remove(glow);
            beam.geometry.dispose(); beam.material.dispose();
            outer.geometry.dispose(); outer.material.dispose();
            return;
        }
        mat.opacity = t * 0.9;
        outerMat.opacity = t * 0.2;
        glow.intensity = t * 3;
        requestAnimationFrame(animateBeam);
    };
    requestAnimationFrame(animateBeam);
}

// Ground ring — expanding circle on the floor
function groundRing(x, z, color, maxRadius, duration) {
    const geo = new THREE.RingGeometry(0.1, 0.3, 24);
    const mat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.8,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.set(x, 0.08, z);
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);

    const dur = duration || 600;
    const startTime = performance.now();
    const animateRing = () => {
        const elapsed = performance.now() - startTime;
        const t = elapsed / dur;
        if (t >= 1) {
            scene.remove(ring); ring.geometry.dispose(); ring.material.dispose();
            return;
        }
        const r = t * (maxRadius || 3);
        ring.scale.setScalar(r);
        mat.opacity = (1 - t) * 0.8;
        requestAnimationFrame(animateRing);
    };
    requestAnimationFrame(animateRing);
}

// Ground crack/decal — stays longer
function groundDecal(x, z, color, radius, duration) {
    const geo = new THREE.CircleGeometry(radius || 1.5, 16);
    const mat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.5,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const decal = new THREE.Mesh(geo, mat);
    decal.position.set(x, 0.06, z);
    decal.rotation.x = -Math.PI / 2;
    scene.add(decal);
    const dur = duration || 2000;
    setTimeout(() => {
        const fadeStart = performance.now();
        const fade = () => {
            const t = (performance.now() - fadeStart) / 500;
            if (t >= 1) { scene.remove(decal); decal.geometry.dispose(); decal.material.dispose(); return; }
            mat.opacity = (1 - t) * 0.5;
            requestAnimationFrame(fade);
        };
        fade();
    }, dur);
}

// Light flash — brief bright point light
function lightFlash(x, y, z, color, intensity, duration) {
    const light = new THREE.PointLight(color, intensity || 3, TILE * 6, 2);
    light.position.set(x, y, z);
    scene.add(light);
    const dur = duration || 200;
    const startTime = performance.now();
    const animateLight = () => {
        const t = (performance.now() - startTime) / dur;
        if (t >= 1) { scene.remove(light); return; }
        light.intensity = (1 - t) * (intensity || 3);
        requestAnimationFrame(animateLight);
    };
    requestAnimationFrame(animateLight);
}

// Screen flash overlay
function screenFlash(color, duration) {
    const flash = document.createElement('div');
    flash.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:${color};opacity:0.4;z-index:5;pointer-events:none;transition:opacity ${duration || 300}ms;`;
    document.body.appendChild(flash);
    setTimeout(() => { flash.style.opacity = '0'; }, 20);
    setTimeout(() => flash.remove(), (duration || 300) + 50);
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

    // Per-character animation
    if (updateGojoAnimation(pm, dt, moving, walkCycle)) return;
    if (updateSukunaAnimation(pm, dt, moving, walkCycle)) return;
    if (updateTojiAnimation(pm, dt, moving, walkCycle)) return;
    if (updateBrookAnimation(pm, dt, moving, walkCycle)) return;

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
    const isSukuna = player.classId === 'sukuna';
    const isToji = player.classId === 'toji';
    const isBrook = player.classId === 'brook';
    const hasWeaponCombo = isSukuna || isToji || isBrook;
    // Weapon combo characters do less M1 damage — the real kill is the 4th hit execute
    const dmg = hasWeaponCombo ? Math.round(player.damage * step.dmgMult * 0.25) : Math.round(player.damage * step.dmgMult);
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
            // Weapon combo tracker — track consecutive M1 hits per enemy
            if (hasWeaponCombo) {
                if (e.data._weaponCombo === undefined) e.data._weaponCombo = 0;
                if (e.data._weaponLastStep === undefined) e.data._weaponLastStep = -1;
                if (player._comboStep === 0) {
                    e.data._weaponCombo = 1;
                    e.data._weaponLastStep = 0;
                } else if (player._comboStep === e.data._weaponLastStep + 1) {
                    e.data._weaponCombo++;
                    e.data._weaponLastStep = player._comboStep;
                } else {
                    e.data._weaponCombo = 1;
                    e.data._weaponLastStep = player._comboStep;
                }
            }

            // On finisher (4th hit) — if enemy caught all 4, execute with bisection
            if (hasWeaponCombo && isFinisher && e.data._weaponCombo >= 4) {
                sukunaBisect(e);
                e.data._weaponCombo = 0;
                e.data._weaponLastStep = -1;
            } else {
                // Weapon combo M1s can't kill — leave at 1 HP so bisect can finish
                const actualDmg = (hasWeaponCombo && e.data.hp - dmg <= 0) ? Math.max(0, e.data.hp - 1) : dmg;
                dealDamageToEnemy(e, actualDmg);
                // Weapon users use less KB to keep enemies in combo range
                const kb = hasWeaponCombo ? step.kb * 0.3 : step.kb;
                e.data.x += (dx / d) * kb;
                e.data.z += (dz / d) * kb;
                e.mesh.position.set(e.data.x * TILE, 0, e.data.z * TILE);
            }
        }
    }

    // Visual effects per step
    spawnMeleeSlash(player.cls.color);
    const fly = fpsCamera.flyHeight || 0;
    const hitX = px * TILE + fwdX * 2, hitY = EYE_HEIGHT + fly, hitZ = pz * TILE + fwdZ * 2;

    // Per-character M1 VFX — add character-specific hit effects here

    // Weapon swing animation (1st person viewmodel + 3rd person arm)
    if (hasWeaponCombo) {
        triggerSwordSwing(player._comboStep);
    }

    // Finisher (4th hit) — extra effects
    if (isFinisher) {
        screenShake(0.25, 100);
        triggerHitstop(50);
        fovPunch(8, 0.15);
        setTimeout(() => spawnMeleeSlash(player.cls.color), 50);

        // Toji dash-thrust — lunge forward on 4th hit
        if (isToji) {
            fpsCamera.posX += fwdX * 2;
            fpsCamera.posZ += fwdZ * 2;
            fovPunch(14, 0.12);
            player.invincible = performance.now() + 300;
        }
    }

    // Advance combo
    player._comboStep = (player._comboStep + 1) % 4;
}

// ─── ABILITY DISPATCHER (Z/X/C/V/F) — clean slate ──────────────
function fruitAbility(slot) {
    if (!player || !player.alive) return;
    const now = performance.now();
    const px = fpsCamera.posX, pz = fpsCamera.posZ;
    const yaw = fpsCamera.yaw;
    const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);
    const worldPx = px * TILE, worldPz = pz * TILE;

    // Cooldown check
    if (!player._abilityCds) player._abilityCds = { z: 0, x: 0, c: 0, v: 0, f: 0 };
    const cd = player.cls.abilityCooldowns?.[slot] || 5000;
    if (now - player._abilityCds[slot] < cd) return;
    player._abilityCds[slot] = now;

    // Helpers
    const aoeHit = (range, dmgMult) => { for (const e of enemies3D) { if (!e.data.alive) continue; if (Math.hypot(e.data.x-px,e.data.z-pz)<range) dealDamageToEnemy(e, Math.round(player.damage*dmgMult)); }};
    const stunNear = (range, dur) => { for (const e of enemies3D) { if (!e.data.alive) continue; if (Math.hypot(e.data.x-px,e.data.z-pz)<range) e.data.lastAttack = now + dur; }};
    const pullEnemies = (cx, cz, range, strength) => { for (const e of enemies3D) { if (!e.data.alive) continue; const dx=cx-e.data.x,dz=cz-e.data.z; const d=Math.hypot(dx,dz); if(d<range&&d>0.5){e.data.x+=(dx/d)*strength;e.data.z+=(dz/d)*strength;e.mesh.position.set(e.data.x*TILE,0,e.data.z*TILE);}}};

    const id = player.classId;

    // ══════ GOJO ══════
    if (id === 'gojo') {
        if (slot === 'z') { // Cursed Technique Lapse: Blue — gravitational pull
            // Target point: 5 tiles ahead
            const targetX = px + fwdX * 5, targetZ = pz + fwdZ * 5;
            const tWorldX = targetX * TILE, tWorldZ = targetZ * TILE;

            // Blue orb — glowing sphere that appears at target location
            const orbGeo = new THREE.SphereGeometry(0.4, 12, 12);
            const orbMat = new THREE.MeshBasicMaterial({
                color: '#1565c0', transparent: true, opacity: 0.8,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            const orb = new THREE.Mesh(orbGeo, orbMat);
            orb.position.set(tWorldX, EYE_HEIGHT * 0.6, tWorldZ);
            scene.add(orb);

            // Inner bright core
            const coreGeo = new THREE.SphereGeometry(0.15, 8, 8);
            const coreMat = new THREE.MeshBasicMaterial({
                color: '#82b1ff', transparent: true, opacity: 1,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            const core = new THREE.Mesh(coreGeo, coreMat);
            orb.add(core);

            // Distortion rings spinning around the orb
            for (let r = 0; r < 3; r++) {
                const ring = new THREE.Mesh(
                    new THREE.TorusGeometry(0.5 + r * 0.15, 0.02, 6, 16),
                    new THREE.MeshBasicMaterial({ color: '#4fc3f7', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })
                );
                ring.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
                orb.add(ring);
            }

            // Blue glow light
            const blueLight = new THREE.PointLight('#1565c0', 5, TILE * 6, 2);
            orb.add(blueLight);

            // Particles getting sucked INTO the orb (converging)
            emitParticles(tWorldX, EYE_HEIGHT * 0.6, tWorldZ, {
                color: ['#1565c0', '#1e88e5', '#42a5f5', '#82b1ff'],
                count: 30, speed: 4, spread: 3,
                gravity: 0, life: 20, lifeVar: 10,
                size: 0.12, sizeEnd: 0.02, drag: 0.92,
                // Particles move INWARD (negative speed pulls toward center)
                direction: { x: 0, y: 0, z: 0 }
            });

            // Ground ring at target
            groundRing(tWorldX, tWorldZ, '#1565c0', 3, 800);
            groundDecal(tWorldX, tWorldZ, '#0d47a1', 2, 2000);

            // Pull enemies toward the blue orb over 1.5 seconds
            const pullInterval = setInterval(() => {
                pullEnemies(targetX, targetZ, 6, 0.8);
                // Sucking particles each tick
                emitParticles(tWorldX, EYE_HEIGHT * 0.6, tWorldZ, {
                    color: ['#1565c0', '#42a5f5'], count: 5, speed: 2, spread: 2.5,
                    gravity: 0, life: 8, size: 0.08, sizeEnd: 0, drag: 0.9
                });
            }, 100);

            // Damage enemies near the orb every 300ms
            let blueTicks = 0;
            const dmgInterval = setInterval(() => {
                blueTicks++;
                for (const e of enemies3D) {
                    if (!e.data.alive) continue;
                    if (Math.hypot(e.data.x - targetX, e.data.z - targetZ) < 3) {
                        dealDamageToEnemy(e, Math.round(player.damage * 0.8));
                    }
                }
                // Spin the rings
                if (orb.parent) {
                    orb.children.forEach(c => {
                        if (c.geometry?.type === 'TorusGeometry') {
                            c.rotation.x += 0.15;
                            c.rotation.y += 0.1;
                        }
                    });
                }
            }, 300);

            // Implode after 1.5s — final damage burst
            setTimeout(() => {
                clearInterval(pullInterval);
                clearInterval(dmgInterval);
                // Final burst — crush everything that got pulled in
                for (const e of enemies3D) {
                    if (!e.data.alive) continue;
                    if (Math.hypot(e.data.x - targetX, e.data.z - targetZ) < 3.5) {
                        dealDamageToEnemy(e, Math.round(player.damage * 2));
                    }
                }
                stunNear(4, 1500);
                // Implosion VFX
                emitParticles(tWorldX, EYE_HEIGHT * 0.6, tWorldZ, {
                    color: ['#0d47a1', '#1565c0', '#1e88e5', '#ffffff'],
                    count: 40, speed: 6, spread: 0.5,
                    gravity: 0, life: 15, lifeVar: 8,
                    size: 0.2, sizeEnd: 0, drag: 0.94, upward: 1
                });
                lightFlash(tWorldX, EYE_HEIGHT * 0.6, tWorldZ, '#1565c0', 8, 400);
                groundRing(tWorldX, tWorldZ, '#42a5f5', 4, 500);
                screenShake(0.4, 200);
                triggerHitstop(50);
                // Remove orb
                scene.remove(orb);
                orbMat.dispose(); orbGeo.dispose();
            }, 1500);

            // Hand pose — Gojo reaches forward
            if (fpsCamera.playerModel?._rightArm) {
                const arm = fpsCamera.playerModel._rightArm;
                arm.rotation.x = -1.2; // arm extended forward
                setTimeout(() => { arm.rotation.x = 0.05; }, 1500);
            }

            screenShake(0.15, 100);
            lightFlash(worldPx, EYE_HEIGHT, worldPz, '#4fc3f7', 2, 200);
        }

        else if (slot === 'x') { // Cursed Technique Reversal: Red — repulsion blast
            const spawnX = worldPx + fwdX * 1.5, spawnZ = worldPz + fwdZ * 1.5;

            // Red orb charges at player's hand then fires forward
            const orbGeo = new THREE.SphereGeometry(0.35, 10, 10);
            const orbMat = new THREE.MeshBasicMaterial({
                color: '#d50000', transparent: true, opacity: 0.9,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            const orb = new THREE.Mesh(orbGeo, orbMat);
            // Inner white-hot core
            orb.add(new THREE.Mesh(
                new THREE.SphereGeometry(0.12, 8, 8),
                new THREE.MeshBasicMaterial({ color: '#ff8a80', blending: THREE.AdditiveBlending, transparent: true, opacity: 1, depthWrite: false })
            ));
            orb.add(new THREE.PointLight('#d50000', 6, TILE * 5, 2));
            orb.position.set(spawnX, EYE_HEIGHT - 0.2, spawnZ);
            scene.add(orb);

            // Charge particles converging to hand (200ms)
            emitParticles(spawnX, EYE_HEIGHT - 0.2, spawnZ, {
                color: ['#d50000', '#ff1744', '#ff5252', '#ff8a80'],
                count: 20, speed: 3, spread: 2,
                gravity: 0, life: 8, size: 0.1, sizeEnd: 0, drag: 0.88
            });

            // Left arm forward pose
            if (fpsCamera.playerModel?._leftArm) {
                fpsCamera.playerModel._leftArm.rotation.x = -1.3;
                setTimeout(() => { if (fpsCamera.playerModel?._leftArm) fpsCamera.playerModel._leftArm.rotation.x = 0.05; }, 800);
            }

            // After 200ms charge — fire the red orb forward as projectile
            setTimeout(() => {
                // Launch as fast projectile
                const projMat = new THREE.MeshBasicMaterial({
                    color: '#d50000', transparent: true, opacity: 0.9,
                    blending: THREE.AdditiveBlending, depthWrite: false
                });
                const proj = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 10), projMat);
                proj.position.copy(orb.position);
                proj.add(new THREE.PointLight('#ff1744', 5, TILE * 5, 2));
                // Outer glow shell
                const shell = new THREE.Mesh(
                    new THREE.SphereGeometry(0.8, 8, 8),
                    new THREE.MeshBasicMaterial({ color: '#ff1744', transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false })
                );
                proj.add(shell);
                scene.add(proj);

                // Remove charge orb
                scene.remove(orb); orbGeo.dispose(); orbMat.dispose();

                // Custom projectile with trail + explosion on hit
                const redProj = {
                    mesh: proj, vx: fwdX * 16, vz: fwdZ * 16,
                    damage: Math.round(player.damage * 3), owner: 'player',
                    traveled: 0, range: 50,
                    _isRed: true // flag for custom explosion
                };
                projectiles3D.push(redProj);

                // Trail particles as it flies
                const trailInt = setInterval(() => {
                    if (!proj.parent) { clearInterval(trailInt); return; }
                    emitParticles(proj.position.x, proj.position.y, proj.position.z, {
                        color: ['#d50000', '#ff1744', '#ff5252'],
                        count: 4, speed: 1.5, spread: 0.3,
                        gravity: 0, life: 8, size: 0.15, sizeEnd: 0, drag: 0.95
                    });
                }, 50);

                screenShake(0.3, 150);
                lightFlash(spawnX, EYE_HEIGHT, spawnZ, '#ff1744', 4, 200);
            }, 200);

            // Red pushes enemies AWAY on impact — handled in dealDamageToEnemy via knockback
            // The projectile system already handles collision; we add explosion VFX
            // by checking _isRed flag in the projectile update (added to updateFruitEffects)
            player._redActive = true;
        }

        else if (slot === 'c') { // Hollow Purple — CUTSCENE: front view, blue+red merge, fire
            // ── FREEZE EVERYTHING ──
            player.invincible = now + 5000;
            const savedGameState = gameState;
            // Pause enemy AI by setting a cutscene flag
            player._cutsceneActive = true;

            // Save camera state
            const savedCamPos = camera.position.clone();
            const savedCamQuat = camera.quaternion.clone();
            const savedLocked = fpsCamera.locked;
            fpsCamera.locked = false; // prevent mouse input during cutscene

            // Show player model for cutscene
            const pm = fpsCamera.playerModel;
            if (pm) pm.visible = true;

            // ── POSITION CAMERA: front view of Gojo ──
            // Camera faces Gojo from the front, slightly above
            const frontDist = 3.5;
            const camX = worldPx + fwdX * frontDist;
            const camZ = worldPz + fwdZ * frontDist;
            const camY = EYE_HEIGHT + 0.5;
            camera.position.set(camX, camY, camZ);
            camera.lookAt(worldPx, EYE_HEIGHT - 0.2, worldPz);

            // Arms out to sides
            if (pm?._rightArm) pm._rightArm.rotation.set(-0.5, 0, -0.8);
            if (pm?._leftArm) pm._leftArm.rotation.set(-0.5, 0, 0.8);

            // Darken screen edges
            const vignette = document.createElement('div');
            vignette.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:5;pointer-events:none;background:radial-gradient(ellipse at center,transparent 30%,rgba(0,0,0,0.7) 100%);';
            document.body.appendChild(vignette);

            // ── BLUE ORB (left side of Gojo) ──
            const perpX = Math.cos(yaw), perpZ = -Math.sin(yaw); // perpendicular to facing
            const blueOrbPos = new THREE.Vector3(worldPx - perpX * 2, EYE_HEIGHT + 0.5, worldPz - perpZ * 2);
            const blueOrb = new THREE.Mesh(
                new THREE.SphereGeometry(0.6, 14, 14),
                new THREE.MeshBasicMaterial({ color: '#1565c0', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
            );
            blueOrb.position.copy(blueOrbPos);
            blueOrb.add(new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 10),
                new THREE.MeshBasicMaterial({ color: '#82b1ff', blending: THREE.AdditiveBlending, transparent: true, opacity: 1, depthWrite: false })));
            blueOrb.add(new THREE.PointLight('#1565c0', 6, TILE * 5, 2));
            // Spinning rings
            for (let r = 0; r < 2; r++) {
                const ring = new THREE.Mesh(
                    new THREE.TorusGeometry(0.7 + r * 0.2, 0.02, 6, 16),
                    new THREE.MeshBasicMaterial({ color: '#42a5f5', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })
                );
                ring.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
                blueOrb.add(ring);
            }
            scene.add(blueOrb);

            // ── RED ORB (right side of Gojo) ──
            const redOrbPos = new THREE.Vector3(worldPx + perpX * 2, EYE_HEIGHT + 0.5, worldPz + perpZ * 2);
            const redOrb = new THREE.Mesh(
                new THREE.SphereGeometry(0.6, 14, 14),
                new THREE.MeshBasicMaterial({ color: '#d50000', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
            );
            redOrb.position.copy(redOrbPos);
            redOrb.add(new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 10),
                new THREE.MeshBasicMaterial({ color: '#ff8a80', blending: THREE.AdditiveBlending, transparent: true, opacity: 1, depthWrite: false })));
            redOrb.add(new THREE.PointLight('#d50000', 6, TILE * 5, 2));
            for (let r = 0; r < 2; r++) {
                const ring = new THREE.Mesh(
                    new THREE.TorusGeometry(0.7 + r * 0.2, 0.02, 6, 16),
                    new THREE.MeshBasicMaterial({ color: '#ff5252', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })
                );
                ring.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
                redOrb.add(ring);
            }
            scene.add(redOrb);

            // Blue + red particles swirling around their respective orbs
            const orbParticleInt = setInterval(() => {
                if (!blueOrb.parent) { clearInterval(orbParticleInt); return; }
                emitParticles(blueOrb.position.x, blueOrb.position.y, blueOrb.position.z, {
                    color: ['#1565c0', '#42a5f5', '#82b1ff'], count: 4, speed: 1.5, spread: 0.8,
                    gravity: 0, life: 10, size: 0.1, sizeEnd: 0, drag: 0.93
                });
                emitParticles(redOrb.position.x, redOrb.position.y, redOrb.position.z, {
                    color: ['#d50000', '#ff1744', '#ff8a80'], count: 4, speed: 1.5, spread: 0.8,
                    gravity: 0, life: 10, size: 0.1, sizeEnd: 0, drag: 0.93
                });
                // Spin rings
                blueOrb.children.forEach(c => { if (c.geometry?.type === 'TorusGeometry') { c.rotation.x += 0.08; c.rotation.y += 0.06; }});
                redOrb.children.forEach(c => { if (c.geometry?.type === 'TorusGeometry') { c.rotation.x += 0.08; c.rotation.y += 0.06; }});
            }, 60);

            screenShake(0.15, 1500);

            // ── At 1000ms: ORBS SMASH TOGETHER ──
            const mergeStart = 1000;
            const mergeDur = 500;
            const mergeCenter = new THREE.Vector3(worldPx, EYE_HEIGHT + 0.3, worldPz);

            // Animate orbs sliding toward center
            let mergeFrame = 0;
            const mergeAnim = setInterval(() => {
                mergeFrame++;
                const t = Math.min(mergeFrame / (mergeDur / 33), 1);
                const ease = t * t; // ease-in
                blueOrb.position.lerpVectors(blueOrbPos, mergeCenter, ease);
                redOrb.position.lerpVectors(redOrbPos, mergeCenter, ease);
                // Orbs shrink slightly as they merge
                const s = 1 - ease * 0.4;
                blueOrb.scale.setScalar(s);
                redOrb.scale.setScalar(s);
                // Camera slowly zooms in
                const zoomT = ease * 0.3;
                camera.position.set(camX - fwdX * zoomT * 2, camY, camZ - fwdZ * zoomT * 2);
                camera.lookAt(mergeCenter.x, mergeCenter.y, mergeCenter.z);
                // Arms come together
                if (pm?._rightArm) pm._rightArm.rotation.set(-1.0 * ease - 0.5, 0, -0.8 + ease * 0.8);
                if (pm?._leftArm) pm._leftArm.rotation.set(-1.0 * ease - 0.5, 0, 0.8 - ease * 0.8);

                if (t >= 1) clearInterval(mergeAnim);
            }, 33);

            // ── At 1500ms: COLLISION — purple orb forms ──
            setTimeout(() => {
                clearInterval(orbParticleInt);
                scene.remove(blueOrb); scene.remove(redOrb);

                // FLASH on collision
                screenFlash('rgba(255,255,255,0.6)', 200);
                screenShake(0.6, 300);
                triggerHitstop(120);

                // Purple orb appears
                const purpleOrb = new THREE.Mesh(
                    new THREE.SphereGeometry(0.8, 14, 14),
                    new THREE.MeshBasicMaterial({ color: '#7c4dff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
                );
                purpleOrb.position.copy(mergeCenter);
                purpleOrb.add(new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 10),
                    new THREE.MeshBasicMaterial({ color: '#ea80fc', blending: THREE.AdditiveBlending, transparent: true, opacity: 1, depthWrite: false })));
                purpleOrb.add(new THREE.PointLight('#7c4dff', 10, TILE * 8, 2));
                // Distortion rings
                for (let r = 0; r < 3; r++) {
                    const ring = new THREE.Mesh(
                        new THREE.TorusGeometry(1.0 + r * 0.2, 0.025, 6, 20),
                        new THREE.MeshBasicMaterial({ color: '#b388ff', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })
                    );
                    ring.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
                    purpleOrb.add(ring);
                }
                scene.add(purpleOrb);

                // Explosion of blue + red + purple particles at merge point
                emitParticles(mergeCenter.x, mergeCenter.y, mergeCenter.z, {
                    color: ['#1565c0', '#d50000', '#7c4dff', '#ea80fc', '#ffffff'],
                    count: 50, speed: 5, spread: 0.5,
                    gravity: 0, life: 15, lifeVar: 8,
                    size: 0.15, sizeEnd: 0, drag: 0.95, upward: 0.5
                });

                // Grow purple orb briefly
                let growFrame = 0;
                const growAnim = setInterval(() => {
                    growFrame++;
                    purpleOrb.scale.setScalar(1 + growFrame * 0.05);
                    purpleOrb.children.forEach(c => { if (c.geometry?.type === 'TorusGeometry') { c.rotation.x += 0.12; c.rotation.y += 0.08; }});
                    emitParticles(mergeCenter.x, mergeCenter.y, mergeCenter.z, {
                        color: ['#7c4dff', '#b388ff'], count: 3, speed: 2, spread: 1,
                        gravity: 0, life: 8, size: 0.1, sizeEnd: 0, drag: 0.93
                    });
                    if (growFrame > 15) clearInterval(growAnim);
                }, 40);

                // ── At 2200ms: SNAP BACK + FIRE ──
                setTimeout(() => {
                    // Remove cutscene elements
                    vignette.remove();
                    scene.remove(purpleOrb);
                    player._cutsceneActive = false;
                    fpsCamera.locked = savedLocked;

                    // Restore camera
                    camera.position.copy(savedCamPos);
                    camera.quaternion.copy(savedCamQuat);
                    if (pm) pm.visible = fpsCamera.thirdPerson;

                    // Arms push forward to fire
                    if (pm?._rightArm) pm._rightArm.rotation.set(-1.5, 0, 0);
                    if (pm?._leftArm) pm._leftArm.rotation.set(-1.5, 0, 0);
                    setTimeout(() => {
                        if (pm?._rightArm) pm._rightArm.rotation.set(0.05, 0, 0);
                        if (pm?._leftArm) pm._leftArm.rotation.set(0.05, 0, 0);
                    }, 600);

                    // ── FIRE HUGE PURPLE BALL FORWARD ──
                    const fireX = worldPx + fwdX * 1.5, fireZ = worldPz + fwdZ * 1.5;
                    const projOrb = new THREE.Mesh(
                        new THREE.SphereGeometry(1.0, 14, 14),
                        new THREE.MeshBasicMaterial({ color: '#7c4dff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
                    );
                    projOrb.position.set(fireX, EYE_HEIGHT, fireZ);
                    projOrb.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 10),
                        new THREE.MeshBasicMaterial({ color: '#ffffff', blending: THREE.AdditiveBlending, transparent: true, opacity: 0.8, depthWrite: false })));
                    projOrb.add(new THREE.PointLight('#7c4dff', 8, TILE * 8, 2));
                    // Outer shell
                    projOrb.add(new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 10),
                        new THREE.MeshBasicMaterial({ color: '#b388ff', transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false })));
                    scene.add(projOrb);

                    projectiles3D.push({
                        mesh: projOrb, vx: fwdX * 12, vz: fwdZ * 12,
                        damage: Math.round(player.damage * 6), owner: 'player',
                        traveled: 0, range: 60, _isHollowPurple: true
                    });

                    // Trail particles as it flies
                    const trailInt = setInterval(() => {
                        if (!projOrb.parent) { clearInterval(trailInt); return; }
                        emitParticles(projOrb.position.x, projOrb.position.y, projOrb.position.z, {
                            color: ['#7c4dff', '#b388ff', '#ea80fc', '#ffffff'],
                            count: 6, speed: 2, spread: 0.5,
                            gravity: 0, life: 12, size: 0.2, sizeEnd: 0, drag: 0.96
                        });
                        // Ground scorch under the ball
                        groundDecal(projOrb.position.x, projOrb.position.z, '#7c4dff', 1, 2000);
                    }, 50);

                    screenShake(0.5, 400);
                    lightFlash(fireX, EYE_HEIGHT, fireZ, '#7c4dff', 8, 300);
                    screenFlash('rgba(124,77,255,0.3)', 200);
                }, 700);
            }, mergeStart + mergeDur);
        }

        else if (slot === 'v') { // Domain Expansion: Unlimited Void
            // Both hands form a specific pose
            if (fpsCamera.playerModel?._rightArm) fpsCamera.playerModel._rightArm.rotation.x = -0.8;
            if (fpsCamera.playerModel?._leftArm) fpsCamera.playerModel._leftArm.rotation.x = -0.8;

            // Screen goes dark briefly
            screenFlash('rgba(0,0,0,0.8)', 1500);
            screenShake(0.5, 1000);

            // Expanding dome of void energy
            const domeGeo = new THREE.SphereGeometry(1, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
            const domeMat = new THREE.MeshBasicMaterial({
                color: '#1a1a3e', transparent: true, opacity: 0.4,
                side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
            });
            const dome = new THREE.Mesh(domeGeo, domeMat);
            dome.position.set(worldPx, 0.1, worldPz);
            scene.add(dome);

            // Inner void pattern — grid of faint lines
            const innerGeo = new THREE.SphereGeometry(0.8, 8, 8);
            const innerMat = new THREE.MeshBasicMaterial({
                color: '#311b92', wireframe: true, transparent: true, opacity: 0.3,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            const inner = new THREE.Mesh(innerGeo, innerMat);
            dome.add(inner);

            // Void light
            const voidLight = new THREE.PointLight('#7c4dff', 4, TILE * 10, 2);
            dome.add(voidLight);

            // Expand the dome over 500ms
            let expandFrame = 0;
            const expandAnim = setInterval(() => {
                expandFrame++;
                const s = expandFrame * 0.8;
                dome.scale.setScalar(Math.min(s, 10));
                inner.rotation.x += 0.02;
                inner.rotation.y += 0.03;
                // Void particles swirling inside
                const angle = expandFrame * 0.3;
                emitParticles(
                    worldPx + Math.cos(angle) * s * 0.3, 1.5, worldPz + Math.sin(angle) * s * 0.3,
                    { color: ['#311b92', '#7c4dff', '#b388ff'], count: 3, speed: 1, spread: 1,
                      gravity: 0, life: 12, size: 0.1, sizeEnd: 0, drag: 0.95 }
                );
                if (expandFrame > 15) clearInterval(expandAnim);
            }, 33);

            // At 800ms — domain activates: freeze + damage all enemies on the floor
            setTimeout(() => {
                // Freeze ALL enemies
                for (const e of enemies3D) {
                    if (!e.data.alive) continue;
                    // Stun for 5 seconds (Unlimited Void disables brain)
                    e.data.lastAttack = performance.now() + 5000;
                    // Damage tick
                    dealDamageToEnemy(e, Math.round(player.damage * 2));
                    // Visual — turn enemies slightly purple
                    e.mesh.traverse(c => { if (c.isMesh && c.material && c.material.emissive) c.material.emissive.set('#311b92'); });
                }

                // Continuous damage ticks every 500ms for 5 seconds
                let ticks = 0;
                const dmgTick = setInterval(() => {
                    ticks++;
                    for (const e of enemies3D) {
                        if (!e.data.alive) continue;
                        dealDamageToEnemy(e, Math.round(player.damage * 1));
                    }
                    // Swirling void particles
                    const a = ticks * 0.5;
                    for (let i = 0; i < 6; i++) {
                        const pa = a + (i / 6) * Math.PI * 2;
                        emitParticles(
                            worldPx + Math.cos(pa) * 4, 1, worldPz + Math.sin(pa) * 4,
                            { color: ['#311b92', '#7c4dff'], count: 2, speed: 0.8, spread: 0.5,
                              gravity: 0.5, life: 10, size: 0.08, sizeEnd: 0, drag: 0.97 }
                        );
                    }
                    if (ticks >= 10) {
                        clearInterval(dmgTick);
                        // Domain collapses
                        // Remove dome
                        scene.remove(dome);
                        domeGeo.dispose(); domeMat.dispose();
                        // Un-purple enemies
                        for (const e of enemies3D) {
                            if (e.data.alive) e.mesh.traverse(c => { if (c.isMesh && c.material && c.material.emissive) c.material.emissive.set('#000000'); });
                        }
                        // Collapse VFX
                        emitParticles(worldPx, 2, worldPz, {
                            color: ['#311b92', '#7c4dff', '#ffffff'],
                            count: 50, speed: 5, spread: 2,
                            gravity: -2, life: 20, lifeVar: 10,
                            size: 0.15, sizeEnd: 0, drag: 0.96, upward: 1
                        });
                        groundRing(worldPx, worldPz, '#7c4dff', 8, 800);
                        screenShake(0.4, 200);
                        lightFlash(worldPx, 2, worldPz, '#7c4dff', 6, 400);
                        // Arms return
                        if (fpsCamera.playerModel?._rightArm) fpsCamera.playerModel._rightArm.rotation.x = 0.05;
                        if (fpsCamera.playerModel?._leftArm) fpsCamera.playerModel._leftArm.rotation.x = 0.05;
                    }
                }, 500);

                // Player is invincible during domain
                player.invincible = performance.now() + 5500;

                lightFlash(worldPx, 2, worldPz, '#311b92', 8, 800);
                triggerHitstop(80);
            }, 800);

            // Ground pattern
            groundRing(worldPx, worldPz, '#311b92', 6, 1000);
            groundDecal(worldPx, worldPz, '#1a1a3e', 5, 6000);
        }
    }

    // ══════ SUKUNA ══════
    if (id === 'sukuna') {
        if (slot === 'z') {
            // ── DISMANTLE — invisible slicing slash wave that cuts everything in a line ──
            // Sword swing animation
            triggerSwordSwing(0);
            screenShake(0.3, 150);

            // Spawn a series of slash planes traveling forward
            const spawnX = worldPx + fwdX * 1.5, spawnZ = worldPz + fwdZ * 1.5;
            const fly = fpsCamera.flyHeight || 0;

            // Multiple slash lines flying forward in quick succession
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    const dist = 2 + i * 2.5;
                    const sx = worldPx + fwdX * dist;
                    const sz = worldPz + fwdZ * dist;

                    // Thin red slash plane
                    const slashGeo = new THREE.PlaneGeometry(3, 0.04);
                    const slashMat = new THREE.MeshBasicMaterial({
                        color: '#ff2244', transparent: true, opacity: 0.9,
                        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
                    });
                    const slash = new THREE.Mesh(slashGeo, slashMat);
                    slash.position.set(sx, EYE_HEIGHT + fly, sz);
                    slash.lookAt(camera.position);
                    // Alternate diagonal angles
                    slash.rotateZ(i % 2 === 0 ? 0.5 : -0.5);
                    scene.add(slash);

                    // Red sparks at the slash
                    emitParticles(sx, EYE_HEIGHT + fly, sz, {
                        color: ['#ff2244', '#ff0000', '#ff4466'],
                        count: 6, speed: 3, spread: 1.5,
                        gravity: -4, life: 10, size: 0.08, sizeEnd: 0, drag: 0.95
                    });

                    // Hit enemies along the path
                    for (const e of enemies3D) {
                        if (!e.data.alive) continue;
                        const dx = e.data.x - (px + fwdX * dist / TILE);
                        const dz = e.data.z - (pz + fwdZ * dist / TILE);
                        if (Math.hypot(dx, dz) < 2) {
                            dealDamageToEnemy(e, Math.round(player.damage * 1.5));
                        }
                    }

                    // Fade and remove
                    const start = performance.now();
                    const fadeSlash = () => {
                        const t = (performance.now() - start) / 300;
                        if (t >= 1) { scene.remove(slash); slash.geometry.dispose(); slash.material.dispose(); return; }
                        slashMat.opacity = (1 - t) * 0.9;
                        slash.scale.x = 1 + t * 0.5;
                        requestAnimationFrame(fadeSlash);
                    };
                    requestAnimationFrame(fadeSlash);
                }, i * 60);
            }

            // Arm swing
            const pm = fpsCamera.playerModel;
            if (pm?._rightArm) {
                pm._rightArm.rotation.set(-1.5, 0, -0.6);
                setTimeout(() => { if (pm?._rightArm) pm._rightArm.rotation.set(0.05, 0, 0); }, 400);
            }

            lightFlash(spawnX, EYE_HEIGHT, spawnZ, '#ff2244', 3, 200);
        }

        else if (slot === 'x') {
            // ── CLEAVE — massive wide arc slash that hits everything in front ──
            triggerSwordSwing(2); // horizontal sweep
            screenShake(0.4, 200);
            triggerHitstop(60);

            const fly = fpsCamera.flyHeight || 0;

            // Giant red arc slash visual
            const arcGeo = new THREE.TorusGeometry(3, 0.04, 4, 32, Math.PI);
            const arcMat = new THREE.MeshBasicMaterial({
                color: '#ff2244', transparent: true, opacity: 0.9,
                side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
            });
            const arc = new THREE.Mesh(arcGeo, arcMat);
            arc.position.set(worldPx + fwdX * 3, EYE_HEIGHT + fly, worldPz + fwdZ * 3);
            arc.rotation.y = fpsCamera.yaw + Math.PI / 2;
            arc.rotation.x = Math.PI / 2;
            scene.add(arc);

            // Second wider arc behind it
            const arc2Geo = new THREE.TorusGeometry(3.5, 0.03, 4, 32, Math.PI);
            const arc2Mat = new THREE.MeshBasicMaterial({
                color: '#ff0000', transparent: true, opacity: 0.5,
                side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
            });
            const arc2 = new THREE.Mesh(arc2Geo, arc2Mat);
            arc2.position.copy(arc.position);
            arc2.rotation.copy(arc.rotation);
            scene.add(arc2);

            // Blood-red particles in the arc
            emitParticles(worldPx + fwdX * 3, EYE_HEIGHT + fly, worldPz + fwdZ * 3, {
                color: ['#ff2244', '#ff0000', '#cc0000', '#ff4466'],
                count: 25, speed: 5, spread: 2,
                gravity: -3, life: 15, size: 0.15, sizeEnd: 0, drag: 0.96, upward: 0.3
            });

            // Hit everything in a wide cone in front
            for (const e of enemies3D) {
                if (!e.data.alive) continue;
                const dx = e.data.x - px, dz = e.data.z - pz;
                const d = Math.hypot(dx, dz);
                if (d > 5 || d < 0.1) continue;
                const a = Math.atan2(-dx, -dz);
                let ad = a - yaw;
                while (ad > Math.PI) ad -= Math.PI * 2;
                while (ad < -Math.PI) ad += Math.PI * 2;
                if (Math.abs(ad) < Math.PI * 0.6) { // wider arc than M1
                    dealDamageToEnemy(e, Math.round(player.damage * 3));
                    // Big knockback
                    e.data.x += (dx / d) * 2;
                    e.data.z += (dz / d) * 2;
                    e.mesh.position.set(e.data.x * TILE, 0, e.data.z * TILE);
                }
            }

            // Fade arcs
            const start = performance.now();
            const fadeArc = () => {
                const t = (performance.now() - start) / 400;
                if (t >= 1) {
                    scene.remove(arc); arc.geometry.dispose(); arc.material.dispose();
                    scene.remove(arc2); arc2.geometry.dispose(); arc2.material.dispose();
                    return;
                }
                arcMat.opacity = (1 - t) * 0.9;
                arc2Mat.opacity = (1 - t) * 0.5;
                arc.scale.setScalar(1 + t * 0.3);
                arc2.scale.setScalar(1 + t * 0.4);
                requestAnimationFrame(fadeArc);
            };
            requestAnimationFrame(fadeArc);

            // Arm pose
            const pm = fpsCamera.playerModel;
            if (pm?._rightArm) {
                pm._rightArm.rotation.set(-0.3, 0, -1.2);
                setTimeout(() => { if (pm?._rightArm) pm._rightArm.rotation.set(0.05, 0, 0); }, 500);
            }

            lightFlash(worldPx + fwdX * 3, EYE_HEIGHT, worldPz + fwdZ * 3, '#ff2244', 5, 300);
            groundRing(worldPx + fwdX * 3, worldPz + fwdZ * 3, '#ff2244', 4, 600);
            fovPunch(10, 0.15);
        }

        else if (slot === 'c') {
            // ── FIRE ARROW — charge up then fire a blazing projectile from the sword ──
            triggerSwordSwing(3); // overhead slam motion (charge up)

            const fly = fpsCamera.flyHeight || 0;
            const spawnX = worldPx + fwdX * 1.5, spawnZ = worldPz + fwdZ * 1.5;

            // Charge-up: fire particles converge on sword tip
            const chargeInt = setInterval(() => {
                if (!fpsSword) { clearInterval(chargeInt); return; }
                emitParticles(spawnX, EYE_HEIGHT + fly, spawnZ, {
                    color: ['#ff6600', '#ff4400', '#ff8800', '#ffaa00'],
                    count: 4, speed: 2, spread: 1.5,
                    gravity: 0, life: 6, size: 0.1, sizeEnd: 0, drag: 0.9
                });
            }, 60);

            // Arm raised
            const pm = fpsCamera.playerModel;
            if (pm?._rightArm) pm._rightArm.rotation.set(-2.0, 0, 0);

            screenShake(0.15, 300);

            // After 400ms — fire the arrow
            setTimeout(() => {
                clearInterval(chargeInt);

                // Fire arrow projectile — flaming red/orange bolt
                const arrowGeo = new THREE.ConeGeometry(0.15, 1.2, 6);
                arrowGeo.rotateX(Math.PI / 2); // point forward
                const arrowMat = new THREE.MeshBasicMaterial({
                    color: '#ff4400', transparent: true, opacity: 0.9,
                    blending: THREE.AdditiveBlending, depthWrite: false
                });
                const arrow = new THREE.Mesh(arrowGeo, arrowMat);
                arrow.position.set(spawnX, EYE_HEIGHT + fly, spawnZ);
                arrow.rotation.y = fpsCamera.yaw + Math.PI;

                // Inner white-hot core
                arrow.add(new THREE.Mesh(
                    new THREE.ConeGeometry(0.06, 0.8, 4),
                    new THREE.MeshBasicMaterial({ color: '#ffcc00', blending: THREE.AdditiveBlending, transparent: true, opacity: 1, depthWrite: false })
                ));
                // Light
                arrow.add(new THREE.PointLight('#ff4400', 6, TILE * 6, 2));
                // Outer flame shell
                arrow.add(new THREE.Mesh(
                    new THREE.SphereGeometry(0.4, 6, 6),
                    new THREE.MeshBasicMaterial({ color: '#ff6600', transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false })
                ));
                scene.add(arrow);

                projectiles3D.push({
                    mesh: arrow, vx: fwdX * 18, vz: fwdZ * 18,
                    damage: Math.round(player.damage * 4), owner: 'player',
                    traveled: 0, range: 55, _isFireArrow: true
                });

                // Fire trail
                const trailInt = setInterval(() => {
                    if (!arrow.parent) { clearInterval(trailInt); return; }
                    emitParticles(arrow.position.x, arrow.position.y, arrow.position.z, {
                        color: ['#ff4400', '#ff6600', '#ff8800', '#ffaa00'],
                        count: 5, speed: 2, spread: 0.3,
                        gravity: -1, life: 10, size: 0.15, sizeEnd: 0, drag: 0.96, upward: 0.5
                    });
                }, 40);

                screenShake(0.4, 200);
                fovPunch(10, 0.12);
                lightFlash(spawnX, EYE_HEIGHT, spawnZ, '#ff4400', 5, 300);

                if (pm?._rightArm) {
                    pm._rightArm.rotation.set(-0.5, 0, 0);
                    setTimeout(() => { if (pm?._rightArm) pm._rightArm.rotation.set(0.05, 0, 0); }, 300);
                }
            }, 400);
        }

        else if (slot === 'v') {
            // ── MALEVOLENT SHRINE — domain expansion, damages all enemies repeatedly ──
            const pm = fpsCamera.playerModel;
            if (pm?._rightArm) pm._rightArm.rotation.set(-0.8, 0, 0);
            if (pm?._leftArm) pm._leftArm.rotation.set(-0.8, 0, 0);

            // Dark red screen flash + text
            screenFlash('rgba(100,0,0,0.8)', 1500);
            screenShake(0.6, 1200);

            // Shrine dome — dark red expanding sphere
            const domeGeo = new THREE.SphereGeometry(1, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
            const domeMat = new THREE.MeshBasicMaterial({
                color: '#3a0000', transparent: true, opacity: 0.4,
                side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
            });
            const dome = new THREE.Mesh(domeGeo, domeMat);
            dome.position.set(worldPx, 0.1, worldPz);
            scene.add(dome);

            // Expand dome
            const domeStart = performance.now();
            const expandDome = () => {
                const t = (performance.now() - domeStart) / 800;
                if (t >= 1) return;
                dome.scale.setScalar(1 + t * 8);
                requestAnimationFrame(expandDome);
            };
            requestAnimationFrame(expandDome);

            // Red slash lines appear all over the domain
            const slashInterval = setInterval(() => {
                for (let i = 0; i < 3; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 1 + Math.random() * 6;
                    const sx = worldPx + Math.cos(angle) * dist;
                    const sz = worldPz + Math.sin(angle) * dist;
                    const slashGeo = new THREE.PlaneGeometry(1.5 + Math.random(), 0.03);
                    const slashMat = new THREE.MeshBasicMaterial({
                        color: '#ff2244', transparent: true, opacity: 0.8,
                        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
                    });
                    const slash = new THREE.Mesh(slashGeo, slashMat);
                    slash.position.set(sx, 0.5 + Math.random() * 2, sz);
                    slash.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                    scene.add(slash);
                    setTimeout(() => { scene.remove(slash); slash.geometry.dispose(); slash.material.dispose(); }, 300);
                }
            }, 100);

            // Damage all enemies every 400ms — Dismantle + Cleave combo
            let ticks = 0;
            const dmgInterval = setInterval(() => {
                ticks++;
                for (const e of enemies3D) {
                    if (!e.data.alive) continue;
                    if (Math.hypot(e.data.x - px, e.data.z - pz) < 8) {
                        dealDamageToEnemy(e, Math.round(player.damage * 1.5));
                        // Red flash on hit
                        e.mesh.traverse(c => { if (c.isMesh && c.material?.emissive) c.material.emissive.set('#ff0000'); });
                        setTimeout(() => {
                            e.mesh.traverse(c => { if (c.isMesh && c.material?.emissive) c.material.emissive.set('#000000'); });
                        }, 100);
                    }
                }
                emitParticles(worldPx, 1.5, worldPz, {
                    color: ['#ff2244', '#ff0000', '#cc0000'],
                    count: 8, speed: 3, spread: 4,
                    gravity: -2, life: 12, size: 0.1, sizeEnd: 0, drag: 0.97, upward: 0.5
                });
                if (ticks >= 12) {
                    clearInterval(dmgInterval);
                    clearInterval(slashInterval);
                    // Domain collapse
                    scene.remove(dome); domeGeo.dispose(); domeMat.dispose();
                    // Final explosion
                    emitParticles(worldPx, 2, worldPz, {
                        color: ['#ff2244', '#ff0000', '#880000', '#ffffff'],
                        count: 60, speed: 6, spread: 2,
                        gravity: -3, life: 25, lifeVar: 15,
                        size: 0.2, sizeEnd: 0, drag: 0.96, upward: 1.5
                    });
                    groundRing(worldPx, worldPz, '#ff2244', 8, 800);
                    screenShake(0.5, 300);
                    lightFlash(worldPx, 2, worldPz, '#ff2244', 8, 500);
                    if (pm?._rightArm) pm._rightArm.rotation.set(0.05, 0, 0);
                    if (pm?._leftArm) pm._leftArm.rotation.set(0.05, 0, 0);
                }
            }, 400);

            // Invincible during domain
            player.invincible = performance.now() + 5500;
            groundRing(worldPx, worldPz, '#ff0000', 6, 1000);
            groundDecal(worldPx, worldPz, '#3a0000', 5, 6000);
        }

        else if (slot === 'f') {
            // ── DASH — instant teleport forward with slash trail ──
            const dashDist = 5;
            const newX = px + fwdX * dashDist;
            const newZ = pz + fwdZ * dashDist;

            // Slash trail along the dash path
            for (let i = 0; i < 4; i++) {
                const t = (i + 1) / 4;
                const tx = worldPx + fwdX * dashDist * t * TILE / TILE;
                const tz = worldPz + fwdZ * dashDist * t * TILE / TILE;
                const trailGeo = new THREE.PlaneGeometry(0.8, 2);
                const trailMat = new THREE.MeshBasicMaterial({
                    color: '#ff2244', transparent: true, opacity: 0.6 - i * 0.1,
                    side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
                });
                const trail = new THREE.Mesh(trailGeo, trailMat);
                const fly = fpsCamera.flyHeight || 0;
                trail.position.set(
                    worldPx + fwdX * TILE * dashDist * t,
                    EYE_HEIGHT + fly,
                    worldPz + fwdZ * TILE * dashDist * t
                );
                trail.lookAt(camera.position);
                scene.add(trail);
                setTimeout(() => { scene.remove(trail); trail.geometry.dispose(); trail.material.dispose(); }, 200 + i * 50);
            }

            // Damage enemies along the dash path
            for (const e of enemies3D) {
                if (!e.data.alive) continue;
                // Check if enemy is within the dash corridor
                const ex = e.data.x, ez = e.data.z;
                const toEnemyX = ex - px, toEnemyZ = ez - pz;
                const dot = toEnemyX * fwdX + toEnemyZ * fwdZ;
                if (dot > 0 && dot < dashDist) {
                    const perpDist = Math.abs(toEnemyX * fwdZ - toEnemyZ * fwdX);
                    if (perpDist < 1.5) {
                        dealDamageToEnemy(e, Math.round(player.damage * 2));
                    }
                }
            }

            // Teleport
            fpsCamera.posX = newX;
            fpsCamera.posZ = newZ;

            // VFX
            screenShake(0.2, 100);
            fovPunch(15, 0.1);
            emitParticles(worldPx, EYE_HEIGHT, worldPz, {
                color: ['#ff2244', '#ff0000'],
                count: 10, speed: 3, spread: 0.5,
                gravity: 0, life: 8, size: 0.1, sizeEnd: 0, drag: 0.95
            });
            triggerSwordSwing(1); // diagonal slash during dash

            // Brief invincibility
            player.invincible = performance.now() + 400;
        }
    }

    // ══════ TOJI ══════
    if (id === 'toji') {
        if (slot === 'z') {
            // ── INVERTED SPEAR OF HEAVEN — piercing thrust that goes through all enemies in a line ──
            triggerSwordSwing(3); // big thrust motion
            screenShake(0.3, 150);

            const fly = fpsCamera.flyHeight || 0;
            const range = 8;

            // Spear thrust trail — a line of impact going forward
            for (let i = 0; i < 6; i++) {
                setTimeout(() => {
                    const dist = 1.5 + i * 1.2;
                    const sx = worldPx + fwdX * dist;
                    const sz = worldPz + fwdZ * dist;

                    // Green-white impact flash at each point
                    const impactGeo = new THREE.PlaneGeometry(0.6, 0.6);
                    const impactMat = new THREE.MeshBasicMaterial({
                        color: '#aaffcc', transparent: true, opacity: 0.8,
                        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
                    });
                    const impact = new THREE.Mesh(impactGeo, impactMat);
                    impact.position.set(sx, EYE_HEIGHT + fly, sz);
                    impact.lookAt(camera.position);
                    scene.add(impact);

                    emitParticles(sx, EYE_HEIGHT + fly, sz, {
                        color: ['#aaffcc', '#66ddaa', '#ffffff'],
                        count: 4, speed: 2, spread: 0.5,
                        gravity: -3, life: 8, size: 0.06, sizeEnd: 0, drag: 0.95
                    });

                    // Hit enemies along the line
                    for (const e of enemies3D) {
                        if (!e.data.alive) continue;
                        const dx = e.data.x - (px + fwdX * dist / TILE);
                        const dz = e.data.z - (pz + fwdZ * dist / TILE);
                        if (Math.hypot(dx, dz) < 1.5) {
                            dealDamageToEnemy(e, Math.round(player.damage * 2));
                            // Pierce knockback — pushes enemies aside, not back
                            const perpX = -fwdZ, perpZ = fwdX;
                            const side = (dx * perpX + dz * perpZ) > 0 ? 1 : -1;
                            e.data.x += perpX * side * 0.5;
                            e.data.z += perpZ * side * 0.5;
                            e.mesh.position.set(e.data.x * TILE, 0, e.data.z * TILE);
                        }
                    }

                    // Fade impact
                    const start = performance.now();
                    const fadeImpact = () => {
                        const t = (performance.now() - start) / 200;
                        if (t >= 1) { scene.remove(impact); impact.geometry.dispose(); impact.material.dispose(); return; }
                        impactMat.opacity = (1 - t) * 0.8;
                        impact.scale.setScalar(1 + t * 0.5);
                        requestAnimationFrame(fadeImpact);
                    };
                    requestAnimationFrame(fadeImpact);
                }, i * 40);
            }

            // Arm thrust
            const pm = fpsCamera.playerModel;
            if (pm?._rightArm) {
                pm._rightArm.rotation.set(-1.6, 0, 0);
                setTimeout(() => { if (pm?._rightArm) pm._rightArm.rotation.set(0.05, 0, 0); }, 400);
            }

            // Small lunge forward
            fpsCamera.posX += fwdX * 1.5;
            fpsCamera.posZ += fwdZ * 1.5;
            fovPunch(10, 0.1);
            lightFlash(worldPx + fwdX * 3, EYE_HEIGHT, worldPz + fwdZ * 3, '#aaffcc', 3, 200);
        }

        else if (slot === 'x') {
            // ── WORM LUNGE — Inventory Curse extends from spear, bites and drags enemies in ──
            screenShake(0.25, 150);

            const fly = fpsCamera.flyHeight || 0;
            const lungeRange = 7;
            const targetX = worldPx + fwdX * lungeRange;
            const targetZ = worldPz + fwdZ * lungeRange;

            // Build worm body extending forward from player — purple segments stretching out
            const wormParts = [];
            const wormSegCount = 16;
            const wormBodyMat = new THREE.MeshStandardMaterial({ color: '#5a2d82', roughness: 0.4 });
            const wormHeadMat = new THREE.MeshStandardMaterial({ color: '#7a3db2', roughness: 0.3 });

            for (let i = 0; i < wormSegCount; i++) {
                const t = i / (wormSegCount - 1);
                const segX = worldPx + fwdX * t * lungeRange;
                const segZ = worldPz + fwdZ * t * lungeRange;
                // Sinuous wave motion
                const perpX = -fwdZ, perpZ = fwdX;
                const wave = Math.sin(t * Math.PI * 3) * 0.4;
                const segSize = 0.12 + Math.sin(t * Math.PI) * 0.06; // thicker in middle
                const seg = new THREE.Mesh(
                    new THREE.SphereGeometry(segSize, 6, 6),
                    i === wormSegCount - 1 ? wormHeadMat : wormBodyMat
                );
                seg.position.set(
                    segX + perpX * wave,
                    EYE_HEIGHT + fly - 0.3 + Math.sin(t * Math.PI * 2) * 0.2,
                    segZ + perpZ * wave
                );
                seg.scale.set(1, 0.8, 1);
                seg.visible = false; // start hidden, reveal in sequence
                scene.add(seg);
                wormParts.push(seg);
            }

            // Worm head details — big mouth and eyes at the tip
            const headPos = wormParts[wormParts.length - 1].position;
            // Glowing eyes
            const wEyeMat = new THREE.MeshBasicMaterial({ color: '#ff44ff' });
            for (let s = -1; s <= 1; s += 2) {
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), wEyeMat);
                eye.position.set(headPos.x + s * 0.08, headPos.y + 0.06, headPos.z);
                eye.visible = false;
                scene.add(eye);
                wormParts.push(eye);
            }
            // Open mouth
            const jawMat = new THREE.MeshBasicMaterial({ color: '#2a0a3a' });
            const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), jawMat);
            jaw.position.set(headPos.x, headPos.y - 0.02, headPos.z);
            jaw.scale.set(1.2, 0.5, 1);
            jaw.visible = false;
            scene.add(jaw);
            wormParts.push(jaw);

            // Animate: reveal segments in rapid sequence (worm extending outward)
            for (let i = 0; i < wormParts.length; i++) {
                setTimeout(() => { wormParts[i].visible = true; }, i * 20);
            }

            // Purple slime trail particles
            for (let i = 0; i < 8; i++) {
                setTimeout(() => {
                    const t = i / 7;
                    const sx = worldPx + fwdX * t * lungeRange;
                    const sz = worldPz + fwdZ * t * lungeRange;
                    emitParticles(sx, EYE_HEIGHT + fly - 0.3, sz, {
                        color: ['#5a2d82', '#7a4da2', '#9a6dc2'],
                        count: 3, speed: 1.5, spread: 0.4,
                        gravity: -6, life: 12, size: 0.06, sizeEnd: 0, drag: 0.96
                    });
                }, i * 30);
            }

            // Hit enemies in the line — bite damage + pull toward player
            setTimeout(() => {
                for (const e of enemies3D) {
                    if (!e.data.alive) continue;
                    const dx = e.data.x - px, dz = e.data.z - pz;
                    const d = Math.hypot(dx, dz);
                    if (d > lungeRange / TILE + 1 || d < 0.5) continue;
                    // Check if enemy is in the forward corridor
                    const dot = dx * fwdX + dz * fwdZ;
                    if (dot < 0) continue;
                    const perpDist = Math.abs(dx * fwdZ - dz * fwdX);
                    if (perpDist < 1.5) {
                        dealDamageToEnemy(e, Math.round(player.damage * 2));
                        // Pull toward player (worm drags them)
                        e.data.x -= (dx / d) * 2;
                        e.data.z -= (dz / d) * 2;
                        e.mesh.position.set(e.data.x * TILE, 0, e.data.z * TILE);
                        // Stun from bite
                        e.data.lastAttack = now + 1200;
                    }
                }
                screenShake(0.35, 150);
                triggerHitstop(40);
            }, wormSegCount * 20);

            // Retract worm — reverse disappear
            setTimeout(() => {
                for (let i = wormParts.length - 1; i >= 0; i--) {
                    setTimeout(() => {
                        scene.remove(wormParts[i]);
                        if (wormParts[i].geometry) wormParts[i].geometry.dispose();
                        if (wormParts[i].material) wormParts[i].material.dispose();
                    }, (wormParts.length - 1 - i) * 15);
                }
            }, wormSegCount * 20 + 200);

            // Arm thrust
            const pm = fpsCamera.playerModel;
            if (pm?._rightArm) {
                pm._rightArm.rotation.set(-1.3, 0, 0);
                setTimeout(() => { if (pm?._rightArm) pm._rightArm.rotation.set(0.05, 0, 0); }, 500);
            }

            lightFlash(worldPx, EYE_HEIGHT, worldPz, '#7a3db2', 3, 200);
        }

        else if (slot === 'c') {
            // ── PLAYFUL CLOUD — massive 3-section staff slam, huge AoE impact ──
            triggerSwordSwing(3); // overhead slam

            const fly = fpsCamera.flyHeight || 0;
            const impactX = worldPx + fwdX * 3;
            const impactZ = worldPz + fwdZ * 3;

            // Brief wind-up
            screenShake(0.2, 200);

            const pm = fpsCamera.playerModel;
            if (pm?._rightArm) pm._rightArm.rotation.set(-2.2, 0, 0);

            setTimeout(() => {
                // SLAM — massive ground impact
                screenShake(0.7, 400);
                triggerHitstop(100);
                fovPunch(15, 0.2);

                // Ground crack ring
                groundRing(impactX, impactZ, '#ffffff', 5, 800);
                groundDecal(impactX, impactZ, '#555555', 2.5, 3000);

                // Impact shockwave particles — dust and debris
                emitParticles(impactX, 0.5, impactZ, {
                    color: ['#aaaaaa', '#888888', '#cccccc', '#666666'],
                    count: 35, speed: 6, spread: 1,
                    gravity: -8, life: 20, lifeVar: 10,
                    size: 0.2, sizeEnd: 0.05, drag: 0.96, upward: 2
                });
                // Secondary ground dust
                emitParticles(impactX, 0.2, impactZ, {
                    color: ['#997755', '#886644'],
                    count: 20, speed: 4, spread: 2,
                    gravity: -3, life: 25, size: 0.15, sizeEnd: 0, drag: 0.97, upward: 0.3
                });

                // Hit everything in AoE — massive damage
                for (const e of enemies3D) {
                    if (!e.data.alive) continue;
                    const dx = e.data.x - (px + fwdX * 3 / TILE);
                    const dz = e.data.z - (pz + fwdZ * 3 / TILE);
                    const d = Math.hypot(dx, dz);
                    if (d < 4) {
                        const falloff = 1 - (d / 4) * 0.5; // more damage closer
                        dealDamageToEnemy(e, Math.round(player.damage * 5 * falloff));
                        // Massive knockback
                        if (d > 0.3) {
                            e.data.x += (dx / d) * 3;
                            e.data.z += (dz / d) * 3;
                            e.mesh.position.set(e.data.x * TILE, 0, e.data.z * TILE);
                        }
                        // Bounce enemies up
                        e.mesh.position.y = 1.5;
                        setTimeout(() => { if (e.mesh) e.mesh.position.y = 0; }, 400);
                    }
                }

                lightFlash(impactX, 1, impactZ, '#ffffff', 8, 400);
                screenFlash('rgba(255,255,255,0.3)', 200);

                if (pm?._rightArm) {
                    pm._rightArm.rotation.set(0.3, 0, 0);
                    setTimeout(() => { if (pm?._rightArm) pm._rightArm.rotation.set(0.05, 0, 0); }, 300);
                }
            }, 250);
        }

        else if (slot === 'v') {
            // ── HEAVENLY RESTRICTION — buff transformation, superhuman physical boost ──
            const pm = fpsCamera.playerModel;
            if (pm?._rightArm) pm._rightArm.rotation.set(-0.5, 0, -0.3);
            if (pm?._leftArm) pm._leftArm.rotation.set(-0.5, 0, 0.3);

            screenFlash('rgba(40,110,60,0.6)', 1000);
            screenShake(0.5, 800);

            // Green energy burst from body
            emitParticles(worldPx, EYE_HEIGHT, worldPz, {
                color: ['#2a6e3f', '#44aa66', '#88ffaa', '#ffffff'],
                count: 40, speed: 4, spread: 1,
                gravity: -1, life: 25, lifeVar: 15,
                size: 0.15, sizeEnd: 0, drag: 0.97, upward: 2
            });
            groundRing(worldPx, worldPz, '#2a6e3f', 4, 800);

            // Buff: massive speed + damage boost for 8 seconds
            const origSpeed = player.speed;
            const origDamage = player.damage;
            player.speed *= 1.8;
            player.damage = Math.round(player.damage * 2.5);
            fpsCamera.speed = player.speed;
            player.invincible = performance.now() + 1000; // brief invincibility on activation

            // Green aura effect around player during buff
            const aura = new THREE.PointLight('#2a6e3f', 3, TILE * 5, 2);
            aura.position.y = 1.2;
            if (pm) pm.add(aura);

            // Pulsing green particles while active
            const buffParticles = setInterval(() => {
                emitParticles(
                    fpsCamera.posX * TILE, 0.5, fpsCamera.posZ * TILE,
                    { color: ['#2a6e3f', '#44aa66'], count: 3, speed: 1.5, spread: 0.5,
                      gravity: -1, life: 10, size: 0.06, sizeEnd: 0, drag: 0.97, upward: 2 }
                );
            }, 150);

            // Speed lines effect (green tinted)
            const speedLineInt = setInterval(() => {
                const slGeo = new THREE.PlaneGeometry(0.02, 1.5);
                const slMat = new THREE.MeshBasicMaterial({
                    color: '#44aa66', transparent: true, opacity: 0.3,
                    side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
                });
                const sl = new THREE.Mesh(slGeo, slMat);
                sl.position.set(
                    fpsCamera.posX * TILE + (Math.random() - 0.5) * 4,
                    1 + Math.random() * 2,
                    fpsCamera.posZ * TILE + (Math.random() - 0.5) * 4
                );
                sl.lookAt(camera.position);
                scene.add(sl);
                setTimeout(() => { scene.remove(sl); sl.geometry.dispose(); sl.material.dispose(); }, 200);
            }, 80);

            // Revert after 8 seconds
            setTimeout(() => {
                player.speed = origSpeed;
                player.damage = origDamage;
                fpsCamera.speed = origSpeed;
                clearInterval(buffParticles);
                clearInterval(speedLineInt);
                if (pm) pm.remove(aura);
                // Deactivation flash
                emitParticles(fpsCamera.posX * TILE, 1, fpsCamera.posZ * TILE, {
                    color: ['#2a6e3f', '#44aa66', '#ffffff'],
                    count: 20, speed: 3, spread: 1,
                    gravity: -2, life: 15, size: 0.1, sizeEnd: 0, drag: 0.96, upward: 1
                });
                if (pm?._rightArm) pm._rightArm.rotation.set(0.05, 0, 0);
                if (pm?._leftArm) pm._leftArm.rotation.set(0.15, 0, 0.12);
            }, 8000);

            lightFlash(worldPx, EYE_HEIGHT, worldPz, '#2a6e3f', 5, 400);
            triggerHitstop(60);
        }

        else if (slot === 'f') {
            // ── FLASH STEP — near-instant teleport forward, faster than Sukuna's dash ──
            const dashDist = 7; // longer range than Sukuna
            const newX = px + fwdX * dashDist;
            const newZ = pz + fwdZ * dashDist;

            // After-image at old position
            const afterGeo = new THREE.CylinderGeometry(0.3, 0.25, 1.8, 6);
            const afterMat = new THREE.MeshBasicMaterial({
                color: '#2a6e3f', transparent: true, opacity: 0.4,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            const afterImage = new THREE.Mesh(afterGeo, afterMat);
            const fly = fpsCamera.flyHeight || 0;
            afterImage.position.set(worldPx, 0.9 + fly, worldPz);
            scene.add(afterImage);

            // Fade after-image
            const fadeStart = performance.now();
            const fadeAfter = () => {
                const t = (performance.now() - fadeStart) / 400;
                if (t >= 1) { scene.remove(afterImage); afterImage.geometry.dispose(); afterImage.material.dispose(); return; }
                afterMat.opacity = (1 - t) * 0.4;
                requestAnimationFrame(fadeAfter);
            };
            requestAnimationFrame(fadeAfter);

            // Damage enemies along path
            for (const e of enemies3D) {
                if (!e.data.alive) continue;
                const ex = e.data.x, ez = e.data.z;
                const toEnemyX = ex - px, toEnemyZ = ez - pz;
                const dot = toEnemyX * fwdX + toEnemyZ * fwdZ;
                if (dot > 0 && dot < dashDist) {
                    const perpDist = Math.abs(toEnemyX * fwdZ - toEnemyZ * fwdX);
                    if (perpDist < 1.5) {
                        dealDamageToEnemy(e, Math.round(player.damage * 1.5));
                    }
                }
            }

            // Teleport
            fpsCamera.posX = newX;
            fpsCamera.posZ = newZ;

            fovPunch(18, 0.08);
            player.invincible = performance.now() + 350;

            // Minimal VFX — Toji is so fast you barely see him move
            emitParticles(worldPx, EYE_HEIGHT, worldPz, {
                color: ['#2a6e3f', '#44aa66'],
                count: 6, speed: 2, spread: 0.3,
                gravity: 0, life: 6, size: 0.06, sizeEnd: 0, drag: 0.95
            });
        }
    }
}

function playerSpecial() { fruitAbility("z"); }
function playerSecondary() { fruitAbility("x"); }
function playerQAbility() { fruitAbility("c"); }
function playerFAbility() { fruitAbility("v"); }

// ─── PER-FRAME EFFECTS (clean slate) ────────────────────────────
function updateFruitEffects(now, dt) {
    // No character-specific effects yet
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

// ─── SUKUNA BISECT — cut enemy in half on full 4-hit combo ──
function sukunaBisect(e) {
    if (!e.data.alive) return; // safety — already dead
    const wx = e.data.x * TILE;
    const wz = e.data.z * TILE;
    console.log('SUKUNA BISECT!', e.data.name || e.data.type, 'at', wx, wz);

    // Big screen effects
    screenShake(0.6, 400);
    triggerHitstop(150);
    fovPunch(12, 0.2);
    screenFlash('rgba(255,0,0,0.5)', 400);

    // ── Split the enemy mesh in two halves ──
    const origMesh = e.mesh;
    origMesh.visible = false;

    // Create two halves — clone the enemy group twice, clip each
    const topHalf = origMesh.clone();
    const bottomHalf = origMesh.clone();
    topHalf.visible = true;
    bottomHalf.visible = true;
    topHalf.position.copy(origMesh.position);
    bottomHalf.position.copy(origMesh.position);
    scene.add(topHalf);
    scene.add(bottomHalf);

    // Clip: top half keeps upper part, bottom keeps lower
    // Scale Y to squish each half and offset to create the split
    topHalf.scale.set(1, 0.5, 1);
    topHalf.position.y += 1.0;
    bottomHalf.scale.set(1, 0.5, 1);
    bottomHalf.position.y += 0.0;

    // Red slash line between halves (vertical downward cut mark)
    const slashGeo = new THREE.PlaneGeometry(2.5, 0.06);
    const slashMat = new THREE.MeshBasicMaterial({
        color: '#ff0000', transparent: true, opacity: 1,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const slashLine = new THREE.Mesh(slashGeo, slashMat);
    slashLine.position.set(wx, 1.2, wz);
    slashLine.lookAt(camera.position);
    scene.add(slashLine);

    // ── BLOOD SPLASH — burst of red particles ──
    emitParticles(wx, 1.2, wz, {
        color: ['#ff0000', '#cc0000', '#880000', '#ff2222', '#aa0000'],
        count: 40,
        speed: 6,
        spread: 0.8,
        gravity: -12,
        life: 40,
        size: 0.3,
        sizeEnd: 0.05,
        yOffset: 0,
        additive: false,
        opacity: 0.9,
    });
    // Secondary smaller splatter
    emitParticles(wx, 0.5, wz, {
        color: ['#ff0000', '#990000', '#660000'],
        count: 25,
        speed: 4,
        spread: 1.2,
        gravity: -8,
        life: 30,
        size: 0.2,
        sizeEnd: 0.02,
        yOffset: 0.5,
        additive: false,
        opacity: 0.8,
    });

    // Blood pool decal on ground
    groundDecal(wx, wz, '#880000', 1.5, 3000);

    // Red light flash at kill point
    lightFlash(wx, 1.5, wz, '#ff0000', 5, 400);

    // ── Animate halves splitting apart then fading ──
    const startTime = performance.now();
    const animateSplit = () => {
        const t = (performance.now() - startTime) / 800;
        if (t >= 1) {
            scene.remove(topHalf); scene.remove(bottomHalf); scene.remove(slashLine);
            return;
        }
        const ease = 1 - Math.pow(1 - t, 2);
        // Top slides up and tilts
        topHalf.position.y = 1.0 + ease * 1.5;
        topHalf.rotation.z = ease * 0.4;
        topHalf.rotation.x = ease * -0.2;
        // Bottom slides down
        bottomHalf.position.y = ease * -0.5;
        bottomHalf.rotation.z = ease * -0.3;
        // Both fade
        topHalf.traverse(c => { if (c.isMesh && c.material) { c.material.transparent = true; c.material.opacity = 1 - ease; } });
        bottomHalf.traverse(c => { if (c.isMesh && c.material) { c.material.transparent = true; c.material.opacity = 1 - ease; } });
        // Slash line fades
        slashMat.opacity = 1 - ease;
        requestAnimationFrame(animateSplit);
    };
    requestAnimationFrame(animateSplit);

    // ── "CLEAVE" text popup ──
    spawnDmgNumber(wx, 3, wz, 'CLEAVE', '#ff2244');

    // ── Kill the enemy (gives XP, gold, triggers boss stairs etc) ──
    // Deal remaining HP as damage to trigger the death logic
    const killDmg = e.data.hp;
    dealDamageToEnemy(e, killDmg);
}

function dealDamageToPlayer(dmg) {
    if (!player || !player.alive) return;
    const now = performance.now();
    if (now < player.invincible) return;
    let reduced = Math.max(1, dmg - player.defense);
    // Per-character damage reduction — add here
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

    // Show viewmodel sword in 1st person, hide in 3rd person
    if (fpsSword) fpsSword.visible = !fpsCamera.thirdPerson;
    updateSwordSwing();

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
    updateParticles(dt);
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



        // Freeze enemies during cutscenes
        if (player._cutsceneActive) continue;

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
                    // Fire Arrow explosion on impact
                    if (p._isFireArrow) {
                        const hx = p.mesh.position.x, hz = p.mesh.position.z;
                        emitParticles(hx, EYE_HEIGHT, hz, {
                            color: ['#ff4400', '#ff6600', '#ff8800', '#ffaa00', '#ff2200'],
                            count: 35, speed: 5, spread: 1,
                            gravity: -4, life: 20, lifeVar: 10,
                            size: 0.25, sizeEnd: 0, drag: 0.96, upward: 1.5
                        });
                        lightFlash(hx, EYE_HEIGHT, hz, '#ff4400', 8, 400);
                        groundDecal(hx, hz, '#ff4400', 2, 2000);
                        groundRing(hx, hz, '#ff6600', 3, 500);
                        screenShake(0.4, 200);
                        // AoE splash damage to nearby enemies
                        for (const e2 of enemies3D) {
                            if (!e2.data.alive || e2 === e) continue;
                            if (Math.hypot(e2.data.x - tileX, e2.data.z - tileZ) < 3) {
                                dealDamageToEnemy(e2, Math.round(p.damage * 0.5));
                            }
                        }
                    }
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
