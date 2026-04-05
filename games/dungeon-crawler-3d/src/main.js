// ═══════════════════════════════════════════════════════════════
//  DUNGEON CRAWLER 3D — Main entry point
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { TILE, WALL_HEIGHT, EYE_HEIGHT, PAL } from './constants.js';
import { generateDungeon, getRoomAt } from './dungeon/generator.js';
import { buildDungeonMesh } from './dungeon/meshBuilder.js';
import { createTorchLights, updateTorchLights, syncTorchVisibility } from './dungeon/torchLights.js';
import { FPSCamera } from './player/fpsCamera.js';
import { createEnemyMesh, billboardEnemy, animateEnemyMesh } from './enemies/meshFactory.js';

// ─── GLOBALS ────────────────────────────────────────────────
let scene, camera, renderer;
let fpsCamera;
let dungeon, dungeonMesh, torchLights;
let playerLight; // short-range light attached to player
let enemies3D = []; // { data, mesh }
let gameState = 'title';
let currentFloor = 1;
let clock;

// Enemy definitions (ported from 2D)
const ENEMY_TYPES = {
    skeleton: { name: 'Skeleton', hp: 25, speed: 1.2, damage: 6, attackSpeed: 800, range: 25, type: 'melee', xp: 10, color: '#b0a890', radius: 0.4 },
    archerSkeleton: { name: 'Archer', hp: 18, speed: 0.9, damage: 8, attackSpeed: 1200, range: 8, type: 'ranged', xp: 15, color: '#a09878', radius: 0.4 },
    slime: { name: 'Slime', hp: 35, speed: 0.7, damage: 5, attackSpeed: 1000, range: 1, type: 'melee', xp: 12, color: '#3a7a3a', radius: 0.5, splits: true },
    bat: { name: 'Bat', hp: 12, speed: 2.8, damage: 4, attackSpeed: 600, range: 0.8, type: 'melee', xp: 8, color: '#5a4a6a', radius: 0.3 },
    darkKnight: { name: 'Dark Knight', hp: 60, speed: 1.0, damage: 12, attackSpeed: 1000, range: 1.2, type: 'melee', xp: 25, color: '#3a3a4a', radius: 0.5 },
    necromancer: { name: 'Necromancer', hp: 30, speed: 0.8, damage: 10, attackSpeed: 2000, range: 7, type: 'summoner', xp: 30, color: '#5a2a5a', radius: 0.4 },
};

// ─── INIT ───────────────────────────────────────────────────
function init() {
    clock = new THREE.Clock();

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(PAL.fog);
    scene.fog = new THREE.FogExp2(PAL.fog, 0.008);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.getElementById('game-canvas') });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false; // disabled for performance
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;

    // Ambient light — bright base
    const ambient = new THREE.AmbientLight('#2a2a3e', 1.2);
    scene.add(ambient);

    // Hemisphere light — strong fill
    const hemi = new THREE.HemisphereLight('#1a2a3a', '#0a0a14', 0.8);
    scene.add(hemi);

    // Player light — very bright, long range
    playerLight = new THREE.PointLight('#00ffcc', 3.5, TILE * 10, 1.2);
    scene.add(playerLight);

    // FPS Camera controller
    fpsCamera = new FPSCamera(camera, renderer.domElement);

    // Window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // UI bindings
    document.getElementById('btn-start').addEventListener('click', () => {
        startGame();
    });

    // Start on title screen
    showScreen('title-screen');
}

// ─── GAME FLOW ──────────────────────────────────────────────
function startGame() {
    currentFloor = 1;
    loadFloor(currentFloor);
    gameState = 'playing';
    showScreen(null);
    document.getElementById('hud').style.display = '';
    // Prompt pointer lock
    renderer.domElement.requestPointerLock();
}

function loadFloor(floor) {
    // Clean up previous
    if (dungeonMesh) { scene.remove(dungeonMesh); dungeonMesh = null; }
    if (torchLights) { for (const l of torchLights) scene.remove(l); }
    for (const e of enemies3D) { scene.remove(e.mesh); }
    enemies3D = [];

    // Generate dungeon
    dungeon = generateDungeon(floor);
    dungeon.rooms[0].explored = true;

    // Build 3D dungeon
    dungeonMesh = buildDungeonMesh(dungeon);
    scene.add(dungeonMesh);

    // Torch lights
    torchLights = createTorchLights(dungeon, scene);
    syncTorchVisibility(torchLights, dungeon);

    // Place player at start room
    const startRoom = dungeon.rooms[0];
    fpsCamera.setPosition(startRoom.cx + 0.5, startRoom.cy + 0.5);

    // Spawn enemies
    spawnEnemies(floor);

    // Update HUD
    updateHUD();
}

function spawnEnemies(floor) {
    const types = Object.keys(ENEMY_TYPES);
    const available = floor < 3 ? types.slice(0, 4) : types;

    for (const room of dungeon.rooms) {
        if (room.type === 'start' || room.type === 'shop' || room.type === 'boss') continue;

        const count = room.type === 'treasure' ? 2 : 3 + Math.floor(Math.random() * (2 + floor));
        for (let i = 0; i < count; i++) {
            const type = available[Math.floor(Math.random() * available.length)];
            const def = ENEMY_TYPES[type];
            const mult = 1 + (floor - 1) * 0.25;
            const ex = room.x + 1 + Math.floor(Math.random() * (room.w - 2)) + 0.5;
            const ez = room.y + 1 + Math.floor(Math.random() * (room.h - 2)) + 0.5;

            const enemy = {
                ...def,
                enemyType: type,
                hp: Math.round(def.hp * mult),
                maxHp: Math.round(def.hp * mult),
                damage: Math.round(def.damage * mult),
                x: ex, z: ez,
                alive: true,
                lastAttack: 0,
                room: room,
            };

            const mesh = createEnemyMesh(type, false);
            mesh.position.set(ex * TILE, 0, ez * TILE);
            mesh.visible = false; // hidden until room explored
            scene.add(mesh);

            enemies3D.push({ data: enemy, mesh });
        }
    }
}

// ─── UPDATE ─────────────────────────────────────────────────
function update() {
    if (gameState !== 'playing') return;

    const dt = clock.getDelta();
    const time = clock.getElapsedTime() * 1000; // ms

    // Update FPS camera
    fpsCamera.update(dt, dungeon.map);

    // Player light follows camera
    playerLight.position.copy(camera.position);

    // Room discovery
    const playerTileX = fpsCamera.posX;
    const playerTileZ = fpsCamera.posZ;
    const currentRoom = getRoomAt(dungeon.rooms, playerTileX, playerTileZ);
    if (currentRoom && !currentRoom.explored) {
        currentRoom.explored = true;
        syncTorchVisibility(torchLights, dungeon);
    }

    // Update torch flicker
    updateTorchLights(torchLights, time);

    // Update enemies
    for (const e of enemies3D) {
        if (!e.data.alive) continue;

        // Visibility — only show in explored rooms
        const eRoom = getRoomAt(dungeon.rooms, e.data.x, e.data.z);
        e.mesh.visible = eRoom ? eRoom.explored : false;

        if (!e.mesh.visible) continue;

        // Billboard toward camera
        billboardEnemy(e.mesh, camera.position);

        // Animate
        animateEnemyMesh(e.mesh, e.data.enemyType, time);

        // Simple AI — move toward player if in same room and close
        const dx = playerTileX - e.data.x;
        const dz = playerTileZ - e.data.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 12 && dist > e.data.radius + 0.3) {
            const spd = e.data.speed * dt;
            e.data.x += (dx / dist) * spd;
            e.data.z += (dz / dist) * spd;
            e.mesh.position.set(e.data.x * TILE, 0, e.data.z * TILE);
        }
    }

    // Update HUD
    updateHUD();
}

// ─── HUD ────────────────────────────────────────────────────
function updateHUD() {
    document.getElementById('hud-floor').textContent = `Floor ${currentFloor}`;

    // Minimap
    drawMinimap();
}

function drawMinimap() {
    const canvas = document.getElementById('minimap-canvas');
    const ctx = canvas.getContext('2d');
    const size = 120;
    const scale = size / Math.max(60, 60);

    ctx.fillStyle = 'rgba(10,10,15,0.85)';
    ctx.fillRect(0, 0, size, size);

    for (const rm of dungeon.rooms) {
        if (!rm.explored) {
            ctx.fillStyle = '#060612';
        } else if (rm.type === 'boss') {
            ctx.fillStyle = '#ff0055';
        } else if (rm.type === 'treasure') {
            ctx.fillStyle = '#eeff00';
        } else if (rm.type === 'shop') {
            ctx.fillStyle = '#00ffee';
        } else {
            ctx.fillStyle = '#1a1a3a';
        }
        ctx.fillRect(rm.x * scale, rm.y * scale, rm.w * scale, rm.h * scale);
    }

    // Player dot
    ctx.fillStyle = '#fff';
    const px = fpsCamera.posX * scale;
    const pz = fpsCamera.posZ * scale;
    ctx.fillRect(px - 1.5, pz - 1.5, 3, 3);

    // Direction indicator
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, pz);
    ctx.lineTo(px + Math.sin(fpsCamera.yaw) * 6, pz - Math.cos(fpsCamera.yaw) * 6);
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

// ─── START ──────────────────────────────────────────────────
init();
gameLoop();
