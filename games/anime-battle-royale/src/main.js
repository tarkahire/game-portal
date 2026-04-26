// Anime Battle Royale — entry point
import * as THREE from 'three';
import { CLASSES } from './classes/definitions.js';
import { buildArena, ARENA_RADIUS, collidesCover } from './arena.js';
import { Fighter, rollBotCharacters } from './fighter.js';
import { ThirdPersonCamera } from './camera.js';
import { castAbility, castM1, tickVfx, clearVfx } from './abilities.js';
import { BotBrain } from './ai.js';
import { Storm } from './storm.js';

// === Three.js setup ===
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);

let scene = null;
let camera = null;
let tpCamera = null;
let arenaCover = [];
let fighters = [];
let player = null;
let bots = [];
let storm = null;
let lastFrame = performance.now();
let running = false;
let paused = false;
let matchEnding = false;

// Input state
const keys = new Set();
let mouseDown = false;

// Selected character (defaults to gojo until user picks)
let selectedKey = 'gojo';

// === Screens ===
const screens = {
    title:    document.getElementById('title-screen'),
    select:   document.getElementById('select-screen'),
    howto:    document.getElementById('howto-screen'),
    gameover: document.getElementById('gameover-screen')
};
const hudEl = document.getElementById('hud');
const pauseEl = document.getElementById('pause-overlay');

function showScreen(name) {
    for (const k of Object.keys(screens)) {
        screens[k].classList.toggle('active', k === name);
    }
    hudEl.style.display = name === null ? 'block' : 'none';
}

// === Build character grid ===
function buildCharGrid() {
    const grid = document.getElementById('char-grid');
    grid.innerHTML = '';
    for (const key of Object.keys(CLASSES)) {
        const c = CLASSES[key];
        const card = document.createElement('div');
        card.className = 'char-card';
        card.dataset.key = key;
        card.innerHTML = `
            <div class="char-swatch" style="background:${c.color};color:${c.color}"></div>
            <div class="char-name">${c.name}</div>
            <div class="char-type">${c.type}</div>
            <div class="char-stats">HP ${c.maxHp} · SPD ${c.speed} · DMG ${c.attackDamage}</div>
        `;
        card.addEventListener('click', () => {
            grid.querySelectorAll('.char-card').forEach(el => el.classList.remove('selected'));
            card.classList.add('selected');
            selectedKey = key;
            document.getElementById('btn-start-match').disabled = false;
        });
        grid.appendChild(card);
    }
}

// === Match setup ===
function startMatch() {
    showScreen(null);
    document.body.requestPointerLock?.();

    // Fresh scene
    if (scene) {
        // Dispose previous fighters' meshes
        clearVfx(scene);
        for (const f of fighters) scene.remove(f.mesh);
    }
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 400);
    const arena = buildArena(scene);
    arenaCover = arena.cover;
    storm = new Storm(scene);

    // Spawn 9 fighters around the arena edge
    fighters = [];
    bots = [];
    const spawnCount = 9;
    const playerSpawnAng = Math.random() * Math.PI * 2;
    player = new Fighter(selectedKey, true);
    const spawnR = ARENA_RADIUS - 8;
    player.setPos(Math.cos(playerSpawnAng) * spawnR, Math.sin(playerSpawnAng) * spawnR);
    player.yaw = Math.atan2(-player.x, -player.z);
    scene.add(player.mesh);
    fighters.push(player);

    const botKeys = rollBotCharacters(selectedKey, spawnCount - 1);
    for (let i = 0; i < botKeys.length; i++) {
        const ang = playerSpawnAng + ((i + 1) / spawnCount) * Math.PI * 2;
        const f = new Fighter(botKeys[i], false);
        f.setPos(Math.cos(ang) * spawnR, Math.sin(ang) * spawnR);
        f.yaw = Math.atan2(-f.x, -f.z);
        scene.add(f.mesh);
        fighters.push(f);
        bots.push(new BotBrain(f));
    }

    tpCamera = new ThirdPersonCamera(camera, player);
    tpCamera.install(canvas);

    // HUD
    document.getElementById('hud-char-name').textContent = player.character.name;
    document.getElementById('hud-killfeed').innerHTML = '';
    updateAbilityBarLabels();

    paused = false;
    matchEnding = false;
    running = true;
    lastFrame = performance.now();
    requestAnimationFrame(gameLoop);
}

function updateAbilityBarLabels() {
    for (const slot of ['z', 'x', 'c', 'v', 'f']) {
        const slotEl = document.querySelector(`.ability-slot[data-key="${slot}"]`);
        if (!slotEl) continue;
        const name = player.character.abilities[slot];
        slotEl.querySelector('.cd').textContent = name ? 'READY' : '---';
        slotEl.title = name || '';
    }
}

// === Input ===
window.addEventListener('keydown', (e) => {
    if (!running) return;
    const k = e.key.toLowerCase();
    keys.add(k);
    if (k === 'escape') togglePause();
    if (paused) return;

    // Abilities
    if (['z', 'x', 'c', 'v', 'f'].includes(k)) {
        tryCastAbility(k);
    }
    if (k === ' ') {
        // Dash
        if (player.alive) {
            const fwd = tpCamera.forwardXZ();
            // If moving, dash in movement direction; else forward
            let dx = player.vx, dz = player.vz;
            const len = Math.hypot(dx, dz);
            if (len < 0.1) { dx = fwd.x; dz = fwd.z; }
            else { dx /= len; dz /= len; }
            doPlayerDash(dx, dz);
        }
    }
});
window.addEventListener('keyup', (e) => {
    keys.delete(e.key.toLowerCase());
});
window.addEventListener('mousedown', (e) => {
    if (!running || paused) return;
    if (e.button === 0) mouseDown = true;
});
window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouseDown = false;
});
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (camera) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }
});

function togglePause() {
    paused = !paused;
    pauseEl.style.display = paused ? 'flex' : 'none';
    if (paused) document.exitPointerLock?.();
    else { document.body.requestPointerLock?.(); lastFrame = performance.now(); }
}

function doPlayerDash(dx, dz) {
    player.invulnUntil = performance.now() + 240;
    player.x += dx * 6;
    player.z += dz * 6;
    // Cover collision: bail if collides
    if (collidesCover(arenaCover, player.x, player.z, 0.5)) {
        player.x -= dx * 6; player.z -= dz * 6;
    }
}

function tryCastAbility(slot) {
    if (!player.character.abilities[slot]) return;
    if (!player.canUse(slot)) return;
    const fwd = tpCamera.forwardXZ();
    castAbility(player.character.abilities[slot], player,
        { scene, fighters, dirX: fwd.x, dirZ: fwd.z, cover: arenaCover });
    player.triggerCD(slot, player.character.abilityCooldowns[slot] || 5000);
}

function tryPlayerM1() {
    const now = performance.now();
    if (now < player.cooldowns.m1) return;
    if (!player.alive) return;
    const fwd = tpCamera.forwardXZ();
    castM1(player, { scene, fighters, dirX: fwd.x, dirZ: fwd.z });
    player.cooldowns.m1 = now + (player.character.attackSpeed || 250);
}

// === Game loop ===
function gameLoop() {
    if (!running) return;
    if (paused) { lastFrame = performance.now(); requestAnimationFrame(gameLoop); return; }

    const now = performance.now();
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;

    // Player movement
    if (player.alive) {
        const fwd = tpCamera.forwardXZ();
        const right = tpCamera.rightXZ();
        let mvX = 0, mvZ = 0;
        if (keys.has('w') || keys.has('arrowup'))    { mvX += fwd.x;   mvZ += fwd.z; }
        if (keys.has('s') || keys.has('arrowdown'))  { mvX -= fwd.x;   mvZ -= fwd.z; }
        if (keys.has('a') || keys.has('arrowleft'))  { mvX -= right.x; mvZ -= right.z; }
        if (keys.has('d') || keys.has('arrowright')) { mvX += right.x; mvZ += right.z; }
        const mlen = Math.hypot(mvX, mvZ);
        if (mlen > 0) { mvX /= mlen; mvZ /= mlen; }
        const sprintMul = keys.has('shift') ? 1.5 : 1.0;
        const buffMul = (now < player.buffUntil) ? player.buffMul : 1.0;
        const sp = player.speed * sprintMul * buffMul;
        const nx = player.x + mvX * sp * dt;
        const nz = player.z + mvZ * sp * dt;
        if (!collidesCover(arenaCover, nx, player.z, 0.5)) player.x = nx;
        if (!collidesCover(arenaCover, player.x, nz, 0.5)) player.z = nz;
        // Clamp to outer bounds
        const r = Math.hypot(player.x, player.z);
        if (r > ARENA_RADIUS + 5) { player.x = player.x / r * (ARENA_RADIUS + 5); player.z = player.z / r * (ARENA_RADIUS + 5); }
        player.vx = mvX * sp; player.vz = mvZ * sp;
        player.mesh.position.set(player.x, 0, player.z);
        player.yaw = Math.atan2(fwd.x, fwd.z);

        if (mouseDown) tryPlayerM1();
    }

    // Bots
    for (const b of bots) b.tick(dt, { scene, fighters, cover: arenaCover, stormRadius: storm.radius });

    // Detect new deaths (for killfeed)
    for (const f of fighters) {
        if (!f.alive && !f._deathLogged) {
            f._deathLogged = true;
            const killer = f.lastDamageBy;
            const killerName = killer ? killer.character.name : 'the storm';
            const isPlayerKill = killer === player;
            const isPlayerDeath = f === player;
            pushKillMsg(`${killerName} eliminated ${f.character.name}`, isPlayerKill || isPlayerDeath);
        }
    }

    // Tick fighter animations
    for (const f of fighters) f.tick(dt);

    // Billboard HP bars + name tags toward camera
    for (const f of fighters) {
        if (!f.alive) continue;
        const bar = f.mesh.getObjectByName('hpBar');
        const tag = f.mesh.getObjectByName('nameTag');
        if (bar) bar.lookAt(camera.position);
        if (tag) tag.lookAt(camera.position);
    }

    // VFX
    tickVfx(scene, dt, { scene, fighters });

    // Storm
    storm.update(dt, fighters);

    // Camera
    tpCamera.update();

    // HUD updates
    updateHud();

    // Win/loss detection
    if (!matchEnding) {
        const aliveCount = fighters.filter(f => f.alive).length;
        const playerAlive = player.alive;
        if (!playerAlive) {
            matchEnding = true;
            player.placement = aliveCount + 1; // alive bots are above us
            setTimeout(() => endMatch(false), 600);
        } else if (aliveCount === 1) {
            matchEnding = true;
            player.placement = 1;
            setTimeout(() => endMatch(true), 800);
        }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(gameLoop);
}

function updateHud() {
    const ratio = Math.max(0, player.hp / player.maxHp);
    document.getElementById('hud-hp-bar').style.width = `${ratio * 100}%`;
    document.getElementById('hud-hp-text').textContent = `${Math.max(0, Math.ceil(player.hp))}/${player.maxHp}`;
    document.getElementById('hud-alive').textContent = `Alive: ${fighters.filter(f => f.alive).length}`;
    document.getElementById('hud-storm').textContent = storm.timerLabel();

    // Cooldowns
    const now = performance.now();
    for (const slot of ['z', 'x', 'c', 'v', 'f']) {
        const slotEl = document.querySelector(`.ability-slot[data-key="${slot}"]`);
        if (!slotEl) continue;
        if (!player.character.abilities[slot]) {
            slotEl.querySelector('.cd').textContent = '---';
            slotEl.classList.remove('cooling');
            continue;
        }
        const remain = (player.cooldowns[slot] || 0) - now;
        if (remain > 0) {
            slotEl.classList.add('cooling');
            slotEl.querySelector('.cd').textContent = `${(remain / 1000).toFixed(1)}s`;
        } else {
            slotEl.classList.remove('cooling');
            slotEl.querySelector('.cd').textContent = 'READY';
        }
    }

    drawMinimap();
}

function drawMinimap() {
    const c = document.getElementById('minimap-canvas');
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, c.width, c.height);
    const cx = c.width / 2, cy = c.height / 2;
    const scale = (c.width / 2 - 4) / ARENA_RADIUS;

    // Arena circle
    ctx.strokeStyle = '#00ffee';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, ARENA_RADIUS * scale, 0, Math.PI * 2); ctx.stroke();
    // Storm circle
    ctx.strokeStyle = '#ff0080';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, storm.radius * scale, 0, Math.PI * 2); ctx.stroke();

    // Fighters
    for (const f of fighters) {
        if (!f.alive) continue;
        const px = cx + f.x * scale;
        const py = cy + f.z * scale;
        ctx.fillStyle = f === player ? '#ffffff' : f.character.color;
        ctx.beginPath(); ctx.arc(px, py, f === player ? 4 : 2.5, 0, Math.PI * 2); ctx.fill();
    }
}

function pushKillMsg(text, highlight) {
    const feed = document.getElementById('hud-killfeed');
    const div = document.createElement('div');
    div.className = 'kill-msg';
    div.textContent = text;
    if (highlight) { div.style.borderLeftColor = '#00ffee'; div.style.color = '#00ffee'; }
    feed.appendChild(div);
    setTimeout(() => div.remove(), 5000);
}

function endMatch(victory) {
    running = false;
    document.exitPointerLock?.();
    showScreen('gameover');
    document.getElementById('gameover-title').textContent = victory ? 'VICTORY ROYALE!' : 'YOU DIED';
    const stats = document.getElementById('gameover-stats');
    stats.innerHTML = `
        <div class="stat-row"><span class="label">Character</span><span class="value">${player.character.name}</span></div>
        <div class="stat-row"><span class="label">Kills</span><span class="value">${player.kills}</span></div>
        <div class="stat-row"><span class="label">Placement</span><span class="value">#${player.placement || (victory ? 1 : '?')}</span></div>
        <div class="stat-row"><span class="label">HP Remaining</span><span class="value">${Math.max(0, Math.ceil(player.hp))}/${player.maxHp}</span></div>
    `;
}

// === Wire up screen buttons ===
buildCharGrid();
showScreen('title');

document.getElementById('btn-play').addEventListener('click', () => showScreen('select'));
document.getElementById('btn-howto').addEventListener('click', () => showScreen('howto'));
document.getElementById('btn-back-howto').addEventListener('click', () => showScreen('title'));
document.getElementById('btn-back-select').addEventListener('click', () => showScreen('title'));
document.getElementById('btn-start-match').addEventListener('click', () => startMatch());
document.getElementById('btn-replay').addEventListener('click', () => { showScreen('select'); });
document.getElementById('btn-menu').addEventListener('click', () => showScreen('title'));
document.getElementById('btn-resume').addEventListener('click', () => togglePause());
document.getElementById('btn-quit').addEventListener('click', () => {
    paused = false; pauseEl.style.display = 'none';
    running = false;
    showScreen('title');
});

// Auto-select first character on first visit so the Drop In button works
const firstCard = document.querySelector('.char-card');
if (firstCard) {
    firstCard.click();
}
