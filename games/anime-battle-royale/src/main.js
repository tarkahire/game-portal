// Anime Battle Royale — entry point
import * as THREE from 'three';
import { CLASSES } from './classes/definitions.js';
import { buildArena, ARENA_RADIUS, collidesCover } from './arena.js';
import { Fighter, rollBotCharacters } from './fighter.js';
import { PlayerCamera } from './camera.js';
import { castAbility, castM1, tickVfx, clearVfx } from './abilities.js';
import { BotBrain } from './ai.js';
import { Storm } from './storm.js';
import { initVfx, tickAllVfx } from './vfx.js';

// === Three.js setup ===
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
// Cap below 2 — characters are 100+ meshes each so fragment cost is the
// bottleneck on retina, and 1.5 still looks crisp.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);

let scene = null;
let camera = null;
let pCam = null;
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
    canvas.requestPointerLock?.();

    // Fresh scene
    if (scene) {
        clearVfx(scene);
        for (const f of fighters) scene.remove(f.mesh);
    }
    if (pCam) { pCam.dispose(); pCam = null; }
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
    // Face center: forward = (-sin(yaw), -cos(yaw)) -> yaw = atan2(x, z)
    player.yaw = Math.atan2(player.x, player.z);
    scene.add(player.mesh);
    fighters.push(player);

    const botKeys = rollBotCharacters(selectedKey, spawnCount - 1);
    for (let i = 0; i < botKeys.length; i++) {
        const ang = playerSpawnAng + ((i + 1) / spawnCount) * Math.PI * 2;
        const f = new Fighter(botKeys[i], false);
        f.setPos(Math.cos(ang) * spawnR, Math.sin(ang) * spawnR);
        f.yaw = Math.atan2(f.x, f.z);
        scene.add(f.mesh);
        fighters.push(f);
        bots.push(new BotBrain(f));
    }

    pCam = new PlayerCamera(camera, canvas);
    pCam.install();
    pCam.setFighter(player);

    initVfx(scene, camera);

    // Compile every material's shader up-front. With 9 detailed character
    // models the lazy first-render compile was hanging the opening frame
    // long enough to look like a hard freeze.
    try { renderer.compile(scene, camera); } catch (e) { console.warn('[br] precompile failed', e); }

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
    if (k === ' ' && !e.repeat) {
        // Dash — ignore the OS key-repeat stream (was teleporting the
        // player ~30 times/sec straight off-arena, which spiralled into
        // a freeze as bots all repathed onto the storm-killed player).
        if (player.alive) {
            const fwd = pCam.forwardXZ();
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

// Browser sometimes steals ESC and exits pointer lock without firing our
// keydown handler — auto-pause on lock loss so controls never silently go
// dead with the game still running underneath.
document.addEventListener('pointerlockchange', () => {
    if (!running || paused) return;
    if (document.pointerLockElement !== canvas) togglePause();
});

function togglePause() {
    paused = !paused;
    pauseEl.style.display = paused ? 'flex' : 'none';
    if (paused) document.exitPointerLock?.();
    else { canvas.requestPointerLock?.(); lastFrame = performance.now(); }
}

let _lastDashAt = 0;
function doPlayerDash(dx, dz) {
    const now = performance.now();
    // Soft min-interval so finger-mashing can't overrun the i-frame window.
    if (now - _lastDashAt < 220) return;
    _lastDashAt = now;
    player.invulnUntil = now + 240;
    const newX = player.x + dx * 6;
    const newZ = player.z + dz * 6;
    if (collidesCover(arenaCover, newX, newZ, 0.5)) return;
    // Clamp inside playable arena so a dash can never punt the player into
    // the storm and trigger a death-spiral with all bots repathing.
    const r = Math.hypot(newX, newZ);
    const maxR = ARENA_RADIUS - 1;
    if (r > maxR) {
        const k = maxR / r;
        player.x = newX * k;
        player.z = newZ * k;
    } else {
        player.x = newX;
        player.z = newZ;
    }
}

function tryCastAbility(slot) {
    if (!player.character.abilities[slot]) return;
    if (!player.canUse(slot)) return;
    const fwd = pCam.forwardXZ();
    castAbility(player.character.abilities[slot], player,
        { scene, fighters, dirX: fwd.x, dirZ: fwd.z, cover: arenaCover, pCam, isPlayer: true });
    player.triggerCD(slot, player.character.abilityCooldowns[slot] || 5000);
}

function tryPlayerM1() {
    const now = performance.now();
    if (now < player.cooldowns.m1) return;
    if (!player.alive) return;
    const fwd = pCam.forwardXZ();
    castM1(player, { scene, fighters, dirX: fwd.x, dirZ: fwd.z });
    player.cooldowns.m1 = now + (player.character.attackSpeed || 250);
}

// === Game loop ===
function gameLoop() {
    if (!running) return;
    if (paused) { lastFrame = performance.now(); requestAnimationFrame(gameLoop); return; }

    // Wrap the whole frame so a single thrown error can't kill the rAF
    // chain (which previously presented as a hard freeze).
    try {
        gameLoopBody();
    } catch (e) {
        console.error('[br] frame error', e);
    }
    requestAnimationFrame(gameLoop);
}

function gameLoopBody() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;

    // Player movement is handled by PlayerCamera.update()
    pCam.update(dt, { cover: arenaCover });
    if (player.alive && mouseDown) tryPlayerM1();

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

    // Tick fighter animations — skip the limb-pivot work for fighters far
    // off-camera. 40m radius keeps anyone the player can plausibly see live.
    const camPos = camera.position;
    const ANIM_DIST_SQ = 40 * 40;
    for (const f of fighters) {
        if (!f.alive) continue;
        const dx = f.x - camPos.x, dz = f.z - camPos.z;
        f.tick(dt, (dx * dx + dz * dz) < ANIM_DIST_SQ);
    }

    // Billboard HP bars + name tags toward camera (cached refs)
    for (const f of fighters) {
        if (!f.alive) continue;
        if (f.hpBar) f.hpBar.lookAt(camPos);
        if (f.nameTag) f.nameTag.lookAt(camPos);
    }

    // VFX (active orbs/projectiles + particle system + slashes + dmg numbers)
    tickVfx(scene, dt, { scene, fighters });
    tickAllVfx(dt);

    // Storm
    storm.update(dt, fighters);

    // Camera
    // Camera position updated inside pCam.update() above

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
