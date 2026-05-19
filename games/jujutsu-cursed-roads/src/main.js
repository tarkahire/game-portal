// ═══════════════════════════════════════════════════════════════
//  JUJUTSU — CURSED ROADS  (MVP)
//  Open-world JJK action RPG: hilly terrain, one town with
//  non-enterable houses, curse-spirit hunting, quests, grade climb,
//  name sign-in + localStorage autosave.
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { LocalStorageAdapter } from './save/localStorageAdapter.js';
import { newSave } from './save/saveAdapter.js';

// ─── GLOBALS ────────────────────────────────────────────────
let scene, camera, renderer, clock;
let state = 'signin';                  // signin | playing | paused
const adapter = new LocalStorageAdapter();
let save = null;

let player, playerModel;
const curses = [];
const projectiles = [];
const houses = [];                     // { mesh, x, z, r }
let terrainMesh;

const TOWN = { x: 0, z: 0, r: 26 };    // safe-zone radius (no curse spawns)
const WORLD = 240;                     // half-extent of the playable map

const keys = {};
let yaw = 0, pitch = -0.18;
let pointerLocked = false;
let toastTimer = 0;
let autosaveAccum = 0;
let pendingSave = null;   // new save awaiting technique choice

const GRADE_NAME = { 4: 'Grade 4', 3: 'Grade 3', 2: 'Grade 2', 1: 'Grade 1', 0: 'Special Grade' };

// ─── QUEST DEFINITIONS ──────────────────────────────────────
const QUESTS = {
    exorcism1: {
        title: 'Cleansing the Backroads',
        desc: 'Exorcise 5 cursed spirits in the hills.',
        target: 5,
        reward: { xp: 120, gold: 60 },
        giver: 'board',
    },
    exam: {
        title: 'Grade Exam',
        desc: 'Slay the manifested exam curse to earn promotion.',
        target: 1,
        giver: 'contact',
    },
};
// Level required for the exam that promotes OUT of `grade`.
function examReqLevel(grade) { return 4 + (4 - grade) * 3; }   // G4:4 G3:7 G2:10 G1:13

// ─── TERRAIN ────────────────────────────────────────────────
// Cheap analytic heightfield. Flattened toward the town so the
// settlement sits on level ground.
function terrainHeight(x, z) {
    let h = Math.sin(x * 0.018) * 4.2 + Math.cos(z * 0.021) * 3.8
          + Math.sin((x + z) * 0.011) * 5.5
          + Math.sin(x * 0.05 + z * 0.03) * 1.3;
    const dTown = Math.hypot(x - TOWN.x, z - TOWN.z);
    const flat = 1 - Math.min(1, Math.max(0, (TOWN.r + 10 - dTown) / (TOWN.r + 10)));
    return h * (0.15 + 0.85 * flat);
}

function buildTerrain() {
    const seg = 120;
    const geo = new THREE.PlaneGeometry(WORLD * 2, WORLD * 2, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const col = [];
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        const y = terrainHeight(x, z);
        pos.setY(i, y);
        // grass → rocky tint by height
        const t = Math.min(1, Math.max(0, (y + 4) / 14));
        col.push(0.10 + t * 0.18, 0.16 + t * 0.10, 0.12 + t * 0.06);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
    terrainMesh = new THREE.Mesh(geo, mat);
    scene.add(terrainMesh);

    // Scattered props
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#3a2a1c', roughness: 1 });
    const leafMat = new THREE.MeshStandardMaterial({ color: '#1d3320', roughness: 1 });
    const rockMat = new THREE.MeshStandardMaterial({ color: '#3a3f48', roughness: 1 });
    for (let i = 0; i < 260; i++) {
        const px = (Math.random() - 0.5) * WORLD * 1.9;
        const pz = (Math.random() - 0.5) * WORLD * 1.9;
        if (Math.hypot(px - TOWN.x, pz - TOWN.z) < TOWN.r + 6) continue;
        const y = terrainHeight(px, pz);
        if (Math.random() < 0.7) {
            const tree = new THREE.Group();
            const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 3.2, 6), trunkMat);
            tr.position.y = 1.6; tree.add(tr);
            const lf = new THREE.Mesh(new THREE.ConeGeometry(2.0, 4.2, 7), leafMat);
            lf.position.y = 4.6; tree.add(lf);
            tree.position.set(px, y, pz);
            scene.add(tree);
        } else {
            const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + Math.random() * 1.4, 0), rockMat);
            rk.position.set(px, y + 0.4, pz);
            rk.rotation.set(Math.random(), Math.random(), Math.random());
            scene.add(rk);
        }
    }
}

// ─── TOWN (exterior only — houses cannot be entered) ────────
let board, smith, contact;
function buildTown() {
    const wallMat = new THREE.MeshStandardMaterial({ color: '#7a6f5e', roughness: 0.95 });
    const roofMat = new THREE.MeshStandardMaterial({ color: '#5a2326', roughness: 0.9 });
    const ring = 9;
    for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const r = ring + (i % 2) * 5;
        const hx = TOWN.x + Math.cos(a) * r * 1.6;
        const hz = TOWN.z + Math.sin(a) * r * 1.6;
        const y = terrainHeight(hx, hz);
        const g = new THREE.Group();
        const w = 4 + Math.random() * 2, d = 4 + Math.random() * 2, ht = 3.4;
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, ht, d), wallMat);
        body.position.y = ht / 2; g.add(body);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 2.4, 4), roofMat);
        roof.position.y = ht + 1.1; roof.rotation.y = Math.PI / 4; g.add(roof);
        // a dark "doorway" decal so it reads as a house you just can't enter
        const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.0),
            new THREE.MeshBasicMaterial({ color: '#15100c' }));
        door.position.set(0, 1.0, d / 2 + 0.01); g.add(door);
        g.position.set(hx, y, hz);
        g.rotation.y = -a + Math.PI / 2;
        scene.add(g);
        houses.push({ x: hx, z: hz, r: Math.max(w, d) * 0.62 });
    }

    board = makeInteractable('#a06bff', TOWN.x - 4, TOWN.z - 2, 'MISSION BOARD');
    smith = makeInteractable('#ff8a3a', TOWN.x + 6, TOWN.z + 3, 'CURSED TOOL SMITH');
    contact = makeInteractable('#3adf8a', TOWN.x + 1, TOWN.z - 9, 'JUJUTSU HIGH CONTACT');
}

function makeInteractable(color, x, z, label) {
    const y = terrainHeight(x, z);
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.4, 6),
        new THREE.MeshStandardMaterial({ color: '#2a2a30', roughness: 0.8 }));
    post.position.y = 1.2; g.add(post);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12),
        new THREE.MeshBasicMaterial({ color }));
    orb.position.y = 2.7; g.add(orb);
    g.add(new THREE.PointLight(color, 1.6, 16, 2).translateY(2.7));
    g.position.set(x, y, z);
    g.userData = { x, z, label, color };
    scene.add(g);
    return g;
}

// ─── PLAYER ─────────────────────────────────────────────────
function buildPlayerModel() {
    const g = new THREE.Group();
    const uni = new THREE.MeshStandardMaterial({ color: '#10131f', roughness: 0.7 });
    const skin = new THREE.MeshStandardMaterial({ color: '#e8c8a8', roughness: 0.6 });
    const hair = new THREE.MeshStandardMaterial({ color: '#15151a', roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.0, 4, 10), uni);
    body.position.y = 1.15; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 12), skin);
    head.position.y = 2.05; g.add(head);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), hair);
    cap.position.y = 2.12; g.add(cap);
    const armM = uni;
    for (const s of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.8, 4, 8), armM);
        arm.position.set(s * 0.56, 1.25, 0); g.add(arm);
        g.userData[s > 0 ? 'rarm' : 'larm'] = arm;
    }
    for (const s of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.85, 4, 8),
            new THREE.MeshStandardMaterial({ color: '#0a0c14', roughness: 0.8 }));
        leg.position.set(s * 0.2, 0.5, 0); g.add(leg);
        g.userData[s > 0 ? 'rleg' : 'lleg'] = leg;
    }
    const aura = new THREE.PointLight('#7c4dff', 1.2, 7, 2);
    aura.position.y = 1.2; g.add(aura);
    return g;
}

function deriveStats() {
    const lv = save.level;
    player.maxHp = 90 + lv * 15;
    player.maxCe = 60 + lv * 8;
    player.damage = 14 + lv * 3;
    player.speed = 8.5;
    if (player.hp === undefined || player.hp > player.maxHp) player.hp = player.maxHp;
    if (player.ce === undefined) player.ce = player.maxCe;
}

// ─── CURSES ─────────────────────────────────────────────────
function buildCurseMesh(boss) {
    const g = new THREE.Group();
    const S = boss ? 2.6 : 1;
    const col = boss ? '#6a0e2a' : '#241830';
    const geo = new THREE.IcosahedronGeometry(0.75 * S, 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
        const n = 1 + (Math.sin(p.getX(i) * 6) * Math.cos(p.getY(i) * 5) * 0.18);
        p.setXYZ(i, p.getX(i) * n, p.getY(i) * n, p.getZ(i) * n);
    }
    geo.computeVertexNormals();
    const bodyMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.6, emissive: '#0a0010', emissiveIntensity: 0.4 });
    const body = new THREE.Mesh(geo, bodyMat);
    body.position.y = 1.0 * S; g.add(body);
    g.userData.bodyMat = bodyMat;
    const eyeMat = new THREE.MeshBasicMaterial({ color: boss ? '#ff3a3a' : '#ff5a8a' });
    for (const s of [-1, 1]) {
        const e = new THREE.Mesh(new THREE.SphereGeometry(0.1 * S, 8, 8), eyeMat);
        e.position.set(s * 0.22 * S, 1.05 * S, 0.6 * S); g.add(e);
    }
    const maw = new THREE.Mesh(new THREE.SphereGeometry(0.18 * S, 8, 7),
        new THREE.MeshBasicMaterial({ color: '#120008' }));
    maw.position.set(0, 0.82 * S, 0.62 * S); maw.scale.set(1.3, 1, 0.6); g.add(maw);
    g.add(new THREE.PointLight(boss ? '#ff2a2a' : '#aa1840', boss ? 2.4 : 1.0, boss ? 12 : 6, 2).translateY(1.0 * S));
    return g;
}

function spawnCurse(boss) {
    const a = Math.random() * Math.PI * 2;
    const dist = boss ? 14 : 22 + Math.random() * 14;
    const x = player.x + Math.cos(a) * dist;
    const z = player.z + Math.sin(a) * dist;
    if (!boss && Math.hypot(x - TOWN.x, z - TOWN.z) < TOWN.r) return;
    const mesh = buildCurseMesh(boss);
    mesh.position.set(x, terrainHeight(x, z), z);
    scene.add(mesh);
    const gradeMul = 1 + (4 - save.grade) * 0.4;
    curses.push({
        mesh, x, z, boss: !!boss,
        hp: (boss ? 320 : 34) * gradeMul, maxHp: (boss ? 320 : 34) * gradeMul,
        dmg: (boss ? 22 : 9) * gradeMul, speed: boss ? 4.2 : 3.4,
        lastHit: 0, bob: Math.random() * 6, alive: true,
        xp: boss ? 0 : 22, gold: boss ? 0 : 6,
    });
}

let curseTimer = 0;
function updateCurseDirector(dt) {
    curseTimer -= dt;
    const inTown = Math.hypot(player.x - TOWN.x, player.z - TOWN.z) < TOWN.r;
    const cap = 6 + (4 - save.grade);
    const normalCount = curses.filter(c => !c.boss).length;
    if (!inTown && curseTimer <= 0 && normalCount < cap) {
        spawnCurse(false);
        curseTimer = 1.4 + Math.random();
    }
    // despawn far normals
    for (let i = curses.length - 1; i >= 0; i--) {
        const c = curses[i];
        if (!c.boss && Math.hypot(c.x - player.x, c.z - player.z) > 70) {
            scene.remove(c.mesh); curses.splice(i, 1);
        }
    }
}

// ─── AUDIO (tiny WebAudio SFX — no asset files) ─────────────
let actx = null;
function audioInit() {
    if (actx) return;
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
}
function blip(freq, dur, type, vol, slideTo) {
    if (!actx) return;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, actx.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, actx.currentTime + dur);
    g.gain.setValueAtTime(vol == null ? 0.16 : vol, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.connect(g).connect(actx.destination);
    o.start(); o.stop(actx.currentTime + dur);
}
function sfx(name) {
    if (!actx) return;
    if (name === 'hit') blip(230, 0.10, 'square', 0.15, 90);
    else if (name === 'tech') blip(420, 0.26, 'sawtooth', 0.15, 130);
    else if (name === 'death') blip(170, 0.22, 'triangle', 0.17, 48);
    else if (name === 'hurt') blip(120, 0.16, 'sawtooth', 0.19, 60);
    else if (name === 'level') { blip(520, 0.14, 'square', 0.15); setTimeout(() => blip(800, 0.20, 'square', 0.15), 110); }
    else if (name === 'boss') blip(68, 0.75, 'sawtooth', 0.22, 38);
    else if (name === 'ui') blip(660, 0.05, 'square', 0.09);
}

// ─── VFX ────────────────────────────────────────────────────
function burst(x, y, z, color, n) {
    for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 5),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }));
        m.position.set(x, y, z);
        scene.add(m);
        const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 5;
        const v = { x: Math.cos(a) * sp, y: 3 + Math.random() * 4, z: Math.sin(a) * sp };
        const t0 = performance.now();
        const tick = () => {
            const t = (performance.now() - t0) / 600;
            if (t >= 1) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); return; }
            m.position.set(x + v.x * t, y + v.y * t - 6 * t * t, z + v.z * t);
            m.material.opacity = 0.95 * (1 - t);
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }
}

function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg; el.style.opacity = '1';
    toastTimer = 2.2;
}

// ─── COMBAT ─────────────────────────────────────────────────
let lastM1 = 0;
function meleeStrike() {
    const now = performance.now();
    if (now - lastM1 < 380) return;
    lastM1 = now;
    swingArm();
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    let hit = false;
    for (const c of curses) {
        const dx = c.x - player.x, dz = c.z - player.z;
        const d = Math.hypot(dx, dz);
        if (d > 3.0) continue;
        if ((dx / d) * fx + (dz / d) * fz < 0.25) continue; // in front
        damageCurse(c, player.damage);
        hit = true;
    }
    if (hit) { burst(player.x + fx * 2, 1.3, player.z + fz * 2, '#cbb6ff', 8); sfx('hit'); }
}

// ─── CURSED TECHNIQUES (Z primary, X secondary) ─────────────
const TECHNIQUES = {
    strike: {
        name: 'Cursed Strike', color: '#7c4dff', zName: 'Bolt', xName: 'Reversal Pull',
        z(fx, fz) { spawnTechProj(fx, fz, '#7c4dff', player.damage * 2.4, 1.6, false, 26, 1.8, 3.2, 0.4, 25); },
        x(fx, fz) {
            if (!spend(34)) return;
            const tx = player.x + fx * 7, tz = player.z + fz * 7;
            for (const c of curses) {
                const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz);
                if (d < 6) { c.x += dx * 0.55; c.z += dz * 0.55; damageCurse(c, player.damage * 1.5); }
            }
            ringFx(tx, tz, '#7c4dff'); burst(tx, 1.4, tz, '#b388ff', 16); sfx('tech');
        },
    },
    dismantle: {
        name: 'Dismantle', color: '#ff3a5a', zName: 'Cleave', xName: 'Slash Wave',
        z() { if (!spend(18)) return; coneHit(3.8, 0.35, player.damage * 1.7, '#ff3a5a'); },
        x(fx, fz) { spawnTechProj(fx, fz, '#ff3a5a', player.damage * 1.7, 2.0, true, 30, 1.7, 2.4, 0.5, 30); },
    },
    flame: {
        name: 'Flame Arrow', color: '#ff8a3a', zName: 'Arrow', xName: 'Flame Nova',
        z(fx, fz) { spawnTechProj(fx, fz, '#ff8a3a', player.damage * 2.0, 1.7, false, 30, 1.7, 3.6, 0.7, 26); },
        x() { if (!spend(40)) return; nova(6.5, player.damage * 1.6, '#ff8a3a'); },
    },
};
function curTech() { return TECHNIQUES[save && save.technique] || TECHNIQUES.strike; }
function spend(c) { if (player.ce < c) { toast('Not enough cursed energy'); return false; } player.ce -= c; return true; }
function techZ() { const fx = -Math.sin(yaw), fz = -Math.cos(yaw); curTech().z(fx, fz); swingArm(); }
function techX() { const fx = -Math.sin(yaw), fz = -Math.cos(yaw); curTech().x(fx, fz); swingArm(); }

function spawnTechProj(fx, fz, color, dmg, r, pierce, spd, life, aoe, aoeMul, ce) {
    if (!spend(ce)) return;
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 12), new THREE.MeshBasicMaterial({ color }));
    orb.add(new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 10),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 })));
    orb.add(new THREE.PointLight(color, 3, 9, 2));
    orb.position.set(player.x + fx * 1.4, 1.5, player.z + fz * 1.4);
    scene.add(orb);
    projectiles.push({ mesh: orb, vx: fx * spd, vz: fz * spd, life, dmg, r, pierce: !!pierce, color, aoe, aoeMul, hit: new Set() });
    sfx('tech');
}
function coneHit(range, minDot, dmg, color) {
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    let any = false;
    for (const c of curses.slice()) {
        const dx = c.x - player.x, dz = c.z - player.z, d = Math.hypot(dx, dz) || 1;
        if (d > range) continue;
        if ((dx / d) * fx + (dz / d) * fz < minDot) continue;
        damageCurse(c, dmg); any = true;
    }
    burst(player.x + fx * 2, 1.3, player.z + fz * 2, color, 14);
    ringFx(player.x + fx * 2, player.z + fz * 2, color);
    if (any) sfx('hit'); sfx('tech');
}
function nova(radius, dmg, color) {
    for (const c of curses.slice()) {
        if (Math.hypot(c.x - player.x, c.z - player.z) < radius) damageCurse(c, dmg);
    }
    burst(player.x, 1.3, player.z, color, 28);
    ringFx(player.x, player.z, color); sfx('tech');
}
function ringFx(x, z, color) {
    const g = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.62, 24),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    g.rotation.x = -Math.PI / 2;
    g.position.set(x, terrainHeight(x, z) + 0.1, z);
    scene.add(g);
    const t0 = performance.now();
    const tk = () => {
        const t = (performance.now() - t0) / 420;
        if (t >= 1) { scene.remove(g); g.geometry.dispose(); g.material.dispose(); return; }
        g.scale.setScalar(1 + t * 6); g.material.opacity = 0.8 * (1 - t);
        requestAnimationFrame(tk);
    };
    requestAnimationFrame(tk);
}

function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.z += p.vz * dt;
        p.mesh.position.y = terrainHeight(p.mesh.position.x, p.mesh.position.z) + 1.5;
        p.life -= dt;
        let done = p.life <= 0;
        const R = p.r || 1.6;
        for (const c of curses.slice()) {
            if (p.hit && p.hit.has(c)) continue;
            if (Math.hypot(c.x - p.mesh.position.x, c.z - p.mesh.position.z) < R) {
                damageCurse(c, p.dmg);
                if (p.hit) p.hit.add(c);
                const aoe = p.aoe || 3.2, aMul = p.aoeMul == null ? 0.4 : p.aoeMul;
                for (const c2 of curses.slice()) {
                    if (c2 !== c && Math.hypot(c2.x - c.x, c2.z - c.z) < aoe) damageCurse(c2, p.dmg * aMul);
                }
                burst(p.mesh.position.x, 1.5, p.mesh.position.z, p.color || '#b388ff', 14);
                if (!p.pierce) { done = true; break; }
            }
        }
        if (done) { scene.remove(p.mesh); projectiles.splice(i, 1); }
    }
}

function damageCurse(c, dmg) {
    if (!c.alive) return;
    c.hp -= dmg;
    c.mesh.userData.bodyMat.emissive.set('#ffffff');
    setTimeout(() => { if (c.mesh) c.mesh.userData.bodyMat.emissive.set('#0a0010'); }, 70);
    if (c.hp <= 0) {
        c.alive = false;
        scene.remove(c.mesh);
        const idx = curses.indexOf(c);
        if (idx >= 0) curses.splice(idx, 1);
        burst(c.x, 1.4, c.z, c.boss ? '#ff3a3a' : '#aa1840', c.boss ? 40 : 16);
        sfx('death');
        if (c.boss) onBossKilled();
        else {
            gainXp(c.xp);
            save.gold += c.gold;
            questProgress();
        }
    }
}

// ─── QUESTS / PROGRESSION ───────────────────────────────────
function qstate(id) {
    if (!save.quests[id]) save.quests[id] = { state: 'available', progress: 0 };
    return save.quests[id];
}

function acceptQuest(id) {
    const q = qstate(id);
    if (q.state !== 'available') return;
    q.state = 'active'; q.progress = 0;
    toast('Mission accepted: ' + QUESTS[id].title);
    if (id === 'exam') { spawnCurse(true); sfx('boss'); }
    refreshMissionHud();
    persist();
}

function questProgress() {
    for (const id of Object.keys(save.quests)) {
        const q = save.quests[id], def = QUESTS[id];
        if (!def || q.state !== 'active' || id === 'exam') continue;
        q.progress = Math.min(def.target, q.progress + 1);
        if (q.progress >= def.target) completeQuest(id);
    }
    refreshMissionHud();
}

function completeQuest(id) {
    const q = save.quests[id], def = QUESTS[id];
    if (id === 'exam') {
        const g = save.grade;
        gainXp(220 + (4 - g) * 130);
        save.gold += 130 + (4 - g) * 80;
        if (g > 0) {
            save.grade--;
            sfx('level');
            toast('PROMOTED — now ' + GRADE_NAME[save.grade] + '!');
            // Re-open for the next grade exam (gated by level in openContact)
            q.state = save.grade > 0 ? 'available' : 'done';
            q.progress = 0;
        } else {
            q.state = 'done';
            toast('Special Grade — the pinnacle, sorcerer.');
        }
    } else {
        q.state = 'done';
        if (def.reward && def.reward.xp) gainXp(def.reward.xp);
        if (def.reward && def.reward.gold) save.gold += def.reward.gold;
        toast('Mission complete: ' + def.title);
    }
    refreshMissionHud();
    persist();
}

function onBossKilled() {
    const q = save.quests.exam;
    if (q && q.state === 'active') completeQuest('exam');
}

function xpToNext(lv) { return Math.round(60 * Math.pow(lv, 1.45)); }

function gainXp(amount) {
    save.xp += amount;
    let leveled = false;
    while (save.xp >= xpToNext(save.level)) {
        save.xp -= xpToNext(save.level);
        save.level++;
        leveled = true;
    }
    if (leveled) {
        deriveStats();
        player.hp = player.maxHp; player.ce = player.maxCe;
        sfx('level');
        toast('LEVEL UP — Lv.' + save.level);
        persist();
    }
}

function damagePlayer(dmg) {
    if (state !== 'playing' || player.iframes > 0) return;
    player.hp -= dmg;
    player.iframes = 0.4;
    sfx('hurt');
    document.body.style.boxShadow = 'inset 0 0 120px rgba(200,0,40,0.5)';
    setTimeout(() => { document.body.style.boxShadow = ''; }, 140);
    if (player.hp <= 0) {
        // Respawn at town — gentle MVP penalty (no loss), curses cleared
        player.hp = player.maxHp; player.ce = player.maxCe;
        player.x = TOWN.x; player.z = TOWN.z + 6;
        for (const c of curses.slice()) { scene.remove(c.mesh); }
        curses.length = 0;
        toast('You were overwhelmed... carried back to town.');
        persist();
    }
}

// ─── OVERLAYS (board / smith / contact / pause) ─────────────
function showOverlay(html) {
    document.getElementById('overlay-card').innerHTML = html;
    document.getElementById('overlay').style.display = 'flex';
    document.exitPointerLock();
}
function hideOverlay() {
    document.getElementById('overlay').style.display = 'none';
}

function openBoard() {
    let rows = '';
    for (const id of Object.keys(QUESTS)) {
        const def = QUESTS[id];
        if (def.giver !== 'board') continue;
        const q = qstate(id);
        let act = '';
        if (q.state === 'available') act = `<button class="btn sec act" data-accept="${id}">Accept</button>`;
        else if (q.state === 'active') act = `<span style="color:#ffcf66">In progress (${q.progress}/${def.target})</span>`;
        else act = `<span style="color:#3adf8a">Done</span>`;
        rows += `<div class="row"><span>${def.title}<br><small style="color:#7a8a9a">${def.desc}</small></span>${act}</div>`;
    }
    showOverlay(`<h2>Mission Board</h2>${rows || '<p>No missions posted.</p>'}
        <p style="margin-top:1rem">Reward: XP + gold. Higher grade → tougher curses.</p>
        <button class="btn sec act" data-close="1">Close</button>`);
}

function openContact() {
    const q = qstate('exam'), g = save.grade;
    let body;
    if (g === 0) {
        body = '<p style="color:#3adf8a">Special Grade. There is no higher rank, sorcerer.</p>';
    } else if (q.state === 'active') {
        body = '<p style="color:#ffcf66">Exam underway — slay the manifested curse out in the hills.</p>';
    } else {
        const need = examReqLevel(g);
        const cleansed = qstate('exorcism1').state === 'done';
        const next = GRADE_NAME[g - 1];
        if (save.level >= need && cleansed) {
            body = `<p>Promotion exam to <b>${next}</b>. ${QUESTS.exam.desc}</p>` +
                `<button class="btn sec act" data-accept="exam">Begin Grade Exam</button>`;
        } else {
            body = `<p>To attempt promotion to <b>${next}</b>: reach <b>Lv.${need}</b>` +
                `${cleansed ? '' : ' and finish <b>Cleansing the Backroads</b>'}. (You: Lv.${save.level})</p>`;
        }
    }
    showOverlay(`<h2>Jujutsu High Contact</h2><p>Grade: <b>${GRADE_NAME[g]}</b></p>${body}
        <button class="btn sec act" data-close="1">Close</button>`);
}

function openSmith() {
    showOverlay(`<h2>Cursed Tool Smith</h2>
        <p>Gold: <b style="color:#ffe066">${save.gold}</b></p>
        <div class="row"><span>Whetstone — +6 base damage (permanent)</span>
            <button class="btn sec act" data-buy="dmg">120 g</button></div>
        <div class="row"><span>Cursed Charm — +20 max cursed energy</span>
            <button class="btn sec act" data-buy="ce">100 g</button></div>
        <p style="margin-top:0.8rem">More cursed tools &amp; full technique tree: coming in updates.</p>
        <button class="btn sec act" data-close="1">Close</button>`);
}

function chooseTechnique() {
    const rows = Object.entries(TECHNIQUES).map(([id, t]) =>
        `<div class="row"><span><b style="color:${t.color}">${t.name}</b><br>` +
        `<small style="color:#7a8a9a">Z: ${t.zName} &nbsp;·&nbsp; X: ${t.xName}</small></span>` +
        `<button class="btn sec act" data-tech="${id}">Choose</button></div>`).join('');
    showOverlay(`<h2>Choose Your Cursed Technique</h2>
        <p>Defines your <b>Z</b> (primary) and <b>X</b> (secondary). Permanent for this save.</p>
        ${rows}`);
}

function openPause() {
    showOverlay(`<h2>Paused</h2>
        <p>${save.name} — ${GRADE_NAME[save.grade]} · Lv.${save.level}</p>
        <button class="btn act" data-resume="1">Resume</button><br>
        <button class="btn sec act" data-quit="1">Save &amp; Quit to Sign-in</button>`);
}

document.getElementById('overlay').addEventListener('click', (e) => {
    const t = e.target;
    if (!t.dataset || (!t.dataset.close && !t.dataset.resume && !t.dataset.accept &&
        !t.dataset.quit && !t.dataset.buy && !t.dataset.tech)) return;
    sfx('ui');
    if (t.dataset.tech) {
        if (pendingSave) { pendingSave.technique = t.dataset.tech; hideOverlay(); startGame(pendingSave); persist(); pendingSave = null; }
        return;
    }
    if (t.dataset.close || t.dataset.resume) { hideOverlay(); if (state === 'paused') resume(); }
    else if (t.dataset.accept) { acceptQuest(t.dataset.accept); hideOverlay(); }
    else if (t.dataset.quit) { persist(); hideOverlay(); toSignin(); }
    else if (t.dataset.buy) {
        if (t.dataset.buy === 'dmg' && save.gold >= 120) { save.gold -= 120; save.flags.dmgBonus = (save.flags.dmgBonus || 0) + 6; }
        else if (t.dataset.buy === 'ce' && save.gold >= 100) { save.gold -= 100; save.flags.ceBonus = (save.flags.ceBonus || 0) + 20; }
        else { toast('Not enough gold'); return; }
        deriveStats(); persist(); openSmith();
    }
});

// ─── SAVE ───────────────────────────────────────────────────
function persist() {
    if (!save) return;
    adapter.save(save);
}

async function refreshSlots() {
    const list = document.getElementById('slot-list');
    const slots = await adapter.listSlots();
    list.innerHTML = slots.length
        ? 'Continue: ' + slots.map(n => `<span class="slot" data-slot="${n}">${n}</span>`).join(' · ')
        : '';
}

// ─── ANIMATION HELPERS ──────────────────────────────────────
let armSwing = 0;
function swingArm() { armSwing = 1; }

// ─── GAME FLOW ──────────────────────────────────────────────
function startGame(loaded) {
    save = loaded;
    if (!save.technique) save.technique = 'strike';
    document.getElementById('signin-screen').classList.remove('active');
    document.getElementById('hud').style.display = 'block';
    player = { x: TOWN.x, z: TOWN.z + 6, vy: 0, iframes: 0, hp: undefined, ce: undefined };
    deriveStats();
    player.damage += (save.flags.dmgBonus || 0);
    player.maxCe += (save.flags.ceBonus || 0);
    player.hp = player.maxHp; player.ce = player.maxCe;
    refreshMissionHud();
    state = 'playing';
    toast('Welcome, ' + save.name + ' — ' + GRADE_NAME[save.grade] + ' · ' + curTech().name);
}

function toSignin() {
    state = 'signin';
    document.getElementById('hud').style.display = 'none';
    document.getElementById('signin-screen').classList.add('active');
    for (const c of curses.slice()) scene.remove(c.mesh);
    curses.length = 0;
    refreshSlots();
}

function resume() { state = 'playing'; }

function refreshMissionHud() {
    let txt = 'Visit the Mission Board in town.';
    const ex = save.quests.exorcism1;
    const exam = save.quests.exam;
    if (exam && exam.state === 'active') txt = 'GRADE EXAM: slay the manifested curse.';
    else if (ex && ex.state === 'active') txt = `Exorcise curses (${ex.progress}/${QUESTS.exorcism1.target})`;
    else if (save.grade === 0) txt = 'Special Grade — the pinnacle. More roads in updates.';
    else if (ex && ex.state === 'done') txt = `See the Jujutsu High Contact — Grade Exam (need Lv.${examReqLevel(save.grade)}).`;
    document.getElementById('mission-text').textContent = txt;
}

// ─── INPUT ──────────────────────────────────────────────────
function initInput() {
    addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'Escape' && state === 'playing') { state = 'paused'; openPause(); }
        else if (e.code === 'KeyE' && state === 'playing') tryInteract();
        else if (e.code === 'KeyZ' && state === 'playing') techZ();
        else if (e.code === 'KeyX' && state === 'playing') techX();
        else if (e.code === 'Space' && state === 'playing') doDash();
    });
    addEventListener('keyup', (e) => { keys[e.code] = false; });
    const cv = document.getElementById('game-canvas');
    cv.addEventListener('click', () => { audioInit(); if (state === 'playing') cv.requestPointerLock(); });
    cv.addEventListener('mousedown', (e) => { if (e.button === 0 && state === 'playing' && pointerLocked) meleeStrike(); });
    document.addEventListener('pointerlockchange', () => { pointerLocked = document.pointerLockElement === cv; });
    addEventListener('mousemove', (e) => {
        if (!pointerLocked) return;
        yaw -= e.movementX * 0.0023;
        pitch = Math.max(-0.55, Math.min(0.25, pitch - e.movementY * 0.0018));
    });
    addEventListener('resize', () => {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
    });
    addEventListener('beforeunload', persist);
}

let lastDash = 0;
function doDash() {
    const now = performance.now();
    if (now - lastDash < 1500) return;
    lastDash = now;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    player.x += fx * 5; player.z += fz * 5;
    player.iframes = 0.45;
}

let nearInteract = null;
function tryInteract() {
    if (!nearInteract) return;
    if (nearInteract === board) openBoard();
    else if (nearInteract === smith) openSmith();
    else if (nearInteract === contact) openContact();
}

// ─── UPDATE ─────────────────────────────────────────────────
function update(dt) {
    if (state !== 'playing') return;

    player.iframes = Math.max(0, player.iframes - dt);
    player.ce = Math.min(player.maxCe, player.ce + dt * 7);

    // Movement relative to camera yaw
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    let mx = 0, mz = 0;
    if (keys['KeyW']) { mx += fx; mz += fz; }
    if (keys['KeyS']) { mx -= fx; mz -= fz; }
    if (keys['KeyA']) { mx -= rx; mz -= rz; }
    if (keys['KeyD']) { mx += rx; mz += rz; }
    const moving = mx || mz;
    if (moving) {
        const l = Math.hypot(mx, mz); mx /= l; mz /= l;
        const sp = player.speed * (keys['ShiftLeft'] || keys['ShiftRight'] ? 1.7 : 1) * dt;
        let nx = player.x + mx * sp, nz = player.z + mz * sp;
        // house collision — push out of footprint
        for (const h of houses) {
            const d = Math.hypot(nx - h.x, nz - h.z);
            if (d < h.r) { nx = h.x + (nx - h.x) / d * h.r; nz = h.z + (nz - h.z) / d * h.r; }
        }
        nx = Math.max(-WORLD + 4, Math.min(WORLD - 4, nx));
        nz = Math.max(-WORLD + 4, Math.min(WORLD - 4, nz));
        player.x = nx; player.z = nz;
    }

    const gy = terrainHeight(player.x, player.z);
    playerModel.position.set(player.x, gy, player.z);
    playerModel.rotation.y = yaw + Math.PI;
    // simple walk + arm-swing anim
    const t = performance.now() * 0.012;
    const sw = moving ? Math.sin(t) * 0.5 : 0;
    playerModel.userData.rleg.rotation.x = sw;
    playerModel.userData.lleg.rotation.x = -sw;
    armSwing = Math.max(0, armSwing - dt * 4);
    playerModel.userData.rarm.rotation.x = -armSwing * 2.4 + (moving ? -sw : 0);
    playerModel.userData.larm.rotation.x = moving ? sw : 0;

    // Third-person camera
    const camDist = 7, camHt = 3.4;
    const cx = player.x + Math.sin(yaw) * camDist * Math.cos(pitch);
    const cz = player.z + Math.cos(yaw) * camDist * Math.cos(pitch);
    const cy = gy + camHt - Math.sin(pitch) * 5;
    camera.position.set(cx, Math.max(terrainHeight(cx, cz) + 1.2, cy), cz);
    camera.lookAt(player.x, gy + 1.7, player.z);

    // Curses
    updateCurseDirector(dt);
    for (const c of curses) {
        const dx = player.x - c.x, dz = player.z - c.z;
        const d = Math.hypot(dx, dz) || 1;
        if (d < 30 && d > 1.6) {
            c.x += (dx / d) * c.speed * dt;
            c.z += (dz / d) * c.speed * dt;
        } else if (d <= 1.8 && performance.now() - c.lastHit > 900) {
            c.lastHit = performance.now();
            damagePlayer(c.dmg);
        }
        c.bob += dt * 4;
        c.mesh.position.set(c.x, terrainHeight(c.x, c.z) + Math.sin(c.bob) * 0.15, c.z);
        c.mesh.lookAt(player.x, c.mesh.position.y, player.z);
    }

    updateProjectiles(dt);

    // Interactables proximity
    nearInteract = null;
    for (const o of [board, smith, contact]) {
        if (Math.hypot(player.x - o.userData.x, player.z - o.userData.z) < 3.4) { nearInteract = o; break; }
    }
    const pr = document.getElementById('prompt');
    if (nearInteract) { pr.style.display = 'block'; pr.innerHTML = `Press <b>E</b> — ${nearInteract.userData.label}`; }
    else pr.style.display = 'none';

    // Town slow heal
    if (Math.hypot(player.x - TOWN.x, player.z - TOWN.z) < TOWN.r) {
        player.hp = Math.min(player.maxHp, player.hp + dt * 12);
    }

    // Autosave
    autosaveAccum += dt;
    if (autosaveAccum > 20) { autosaveAccum = 0; persist(); }
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) document.getElementById('toast').style.opacity = '0'; }

    updateHud();
}

function updateHud() {
    document.getElementById('hud-name').textContent = save.name;
    document.getElementById('hud-grade').textContent = GRADE_NAME[save.grade] + '  ·  ' + curTech().name;
    document.getElementById('hud-hp').style.width = Math.max(0, player.hp / player.maxHp * 100) + '%';
    document.getElementById('hud-hp-t').textContent = Math.ceil(player.hp) + '/' + player.maxHp;
    document.getElementById('hud-ce').style.width = (player.ce / player.maxCe * 100) + '%';
    document.getElementById('hud-ce-t').textContent = 'CE ' + Math.ceil(player.ce);
    document.getElementById('hud-xp').style.width = (save.xp / xpToNext(save.level) * 100) + '%';
    document.getElementById('hud-gold').textContent = `Gold: ${save.gold}  ·  Lv.${save.level}`;
    drawMinimap();
}

function drawMinimap() {
    const cv = document.getElementById('minimap'), g = cv.getContext('2d');
    const S = 150, sc = S / (WORLD * 1.4);
    const cx = S / 2 - player.x * sc, cy = S / 2 - player.z * sc;
    g.fillStyle = '#070a12'; g.fillRect(0, 0, S, S);
    // town
    g.fillStyle = 'rgba(160,107,255,0.25)';
    g.beginPath(); g.arc(cx + TOWN.x * sc, cy + TOWN.z * sc, TOWN.r * sc, 0, 7); g.fill();
    // interactables
    for (const o of [board, smith, contact]) {
        g.fillStyle = o.userData.color;
        g.fillRect(cx + o.userData.x * sc - 2, cy + o.userData.z * sc - 2, 4, 4);
    }
    // curses
    for (const c of curses) {
        g.fillStyle = c.boss ? '#ff3a3a' : '#ff5a8a';
        g.beginPath(); g.arc(cx + c.x * sc, cy + c.z * sc, c.boss ? 4 : 2, 0, 7); g.fill();
    }
    // player + facing
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(S / 2, S / 2, 3, 0, 7); g.fill();
    g.strokeStyle = '#a06bff'; g.beginPath(); g.moveTo(S / 2, S / 2);
    g.lineTo(S / 2 - Math.sin(yaw) * 9, S / 2 - Math.cos(yaw) * 9); g.stroke();
}

// ─── INIT ───────────────────────────────────────────────────
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0e18');
    scene.fog = new THREE.FogExp2('#0a0e18', 0.006);
    camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 600);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: false });
    renderer.setPixelRatio(1);
    renderer.setSize(innerWidth, innerHeight);
    clock = new THREE.Clock();

    scene.add(new THREE.AmbientLight('#4a4f66', 1.5));
    scene.add(new THREE.HemisphereLight('#5a6a8a', '#0e0a14', 1.0));
    const sun = new THREE.DirectionalLight('#cfd0ff', 1.1);
    sun.position.set(40, 80, 20); scene.add(sun);

    buildTerrain();
    buildTown();
    playerModel = buildPlayerModel();
    scene.add(playerModel);

    initInput();

    // Sign-in wiring
    const nameIn = document.getElementById('name-input');
    document.getElementById('btn-enter').onclick = enterPressed;
    nameIn.addEventListener('keydown', (e) => { if (e.code === 'Enter') enterPressed(); });
    document.getElementById('slot-list').addEventListener('click', (e) => {
        if (e.target.dataset.slot) { nameIn.value = e.target.dataset.slot; enterPressed(); }
    });
    refreshSlots();

    loop();
}

async function enterPressed() {
    audioInit(); sfx('ui');
    const name = (document.getElementById('name-input').value || '').trim().slice(0, 16);
    if (!name) { document.getElementById('name-input').focus(); return; }
    const existing = await adapter.load(name);
    if (existing) {
        startGame(existing);
    } else {
        // New sorcerer — pick a cursed technique first
        pendingSave = newSave(name);
        document.getElementById('signin-screen').classList.remove('active');
        chooseTechnique();
    }
}

function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    update(dt);
    renderer.render(scene, camera);
}

init();
