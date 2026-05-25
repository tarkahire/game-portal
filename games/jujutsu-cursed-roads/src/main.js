// ═══════════════════════════════════════════════════════════════
//  JUJUTSU — CURSED ROADS  (MVP)
//  Open-world JJK action RPG: hilly terrain, one town with
//  non-enterable houses, curse-spirit hunting, quests, grade climb,
//  name sign-in + localStorage autosave.
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { LocalStorageAdapter } from './save/localStorageAdapter.js';
import { newSave } from './save/saveAdapter.js';
import {
    NET, createRoom, joinRoom, sendMyPos, sendMyAction, cleanupNet,
    getNetStats,
    hostBroadcastCurseSpawn, hostBroadcastCurseState, hostBroadcastCurseDeath,
    clientSendCurseDmg, sendAdminCmd,
} from './net.js';

// ─── GLOBALS ────────────────────────────────────────────────
let scene, camera, renderer, clock;
let state = 'signin';                  // signin | playing | paused
const adapter = new LocalStorageAdapter();
let save = null;

let player, playerModel;
const curses = [];
// Rectangular AABB obstacles for buildings/walls/training dummies.
// Each entry: { minX, maxX, minZ, maxZ }. Player slides along the
// shorter overlap axis on collision.
const obstacles = [];
let terrainMesh;

// Map layout (looking down +Y, +Z = south, -Z = north):
//   z < -10:  JUJUTSU HIGH — school block + courtyard + perimeter walls
//   |z| < 10: PLAZA — paved hub with the 3 NPCs (safe zone)
//   z >  10:  TOKYO STREETS — 7 skyscrapers + road + lamps + neon signs
const TOWN = { x: 0, z: 0, r: 22 };          // plaza safe-zone radius
const WORLD = 280;                           // half-extent of the playable map (560 m wide)
const CURSE_ZONE = { minZ: 14, maxZ: 260 };  // curses spawn anywhere in the city half

const keys = {};
let yaw = 0, pitch = -0.18;
let pointerLocked = false;
let toastTimer = 0;
let autosaveAccum = 0;

const GRADE_NAME = { 4: 'Grade 4', 3: 'Grade 3', 2: 'Grade 2', 1: 'Grade 1', 0: 'Special Grade' };

// ─── QUEST DEFINITIONS ──────────────────────────────────────
const QUESTS = {
    exorcism1: {
        title: 'Patrol the City',
        desc: 'Exorcise 5 cursed spirits in the Tokyo streets.',
        target: 5,
        reward: { xp: 120, gold: 60 },
        giver: 'board',
        minLevel: 1,
    },
    exorcism2: {
        title: 'Sweep the Backstreets',
        desc: 'Exorcise 10 curses across the city.',
        target: 10,
        reward: { xp: 260, gold: 130 },
        giver: 'hunter',
        minLevel: 10,
    },
    exorcism3: {
        title: 'Cursed Spirit Hunt',
        desc: 'Exorcise 20 curses for the veteran sorcerers.',
        target: 20,
        reward: { xp: 520, gold: 260 },
        giver: 'veteran',
        minLevel: 20,
    },
    exorcism4: {
        title: 'Special Grade Watch',
        desc: 'Exorcise 30 curses for the mentor.',
        target: 30,
        reward: { xp: 880, gold: 440 },
        giver: 'mentor',
        minLevel: 30,
    },
    exorcism5: {
        title: 'The Reckoning',
        desc: 'Exorcise 50 curses for the elder sorcerer.',
        target: 50,
        reward: { xp: 1600, gold: 800 },
        giver: 'elder',
        minLevel: 40,
    },
    // (exam quest removed — grade-up is automatic every 20 levels now)
};
// (examReqLevel removed — grade-up is automatic every 20 levels)

// ─── TERRAIN ────────────────────────────────────────────────
// Flat paved ground. terrainHeight() kept as a function so the existing
// callsites (curse meshes, NPC y, camera floor clamp, player snap) keep
// working — it just returns 0 everywhere now.
function terrainHeight(_x, _z) { return 0; }

function buildTerrain() {
    // Big flat ground plane — dark asphalt-ish concrete
    const geo = new THREE.PlaneGeometry(WORLD * 2, WORLD * 2, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: '#23252b', roughness: 0.95 });
    terrainMesh = new THREE.Mesh(geo, mat);
    scene.add(terrainMesh);

    // Brighter plaza tile in the center (the safe zone the NPCs sit on)
    const plaza = new THREE.Mesh(new THREE.PlaneGeometry(TOWN.r * 2.2, TOWN.r * 2.2),
        new THREE.MeshStandardMaterial({ color: '#4a4d56', roughness: 0.9 }));
    plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.01;
    scene.add(plaza);

    // Plaza border ring (purple neon — Kaizen UI palette)
    const ring = new THREE.Mesh(new THREE.RingGeometry(TOWN.r - 0.1, TOWN.r + 0.4, 64),
        new THREE.MeshBasicMaterial({ color: '#a06bff', transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02;
    scene.add(ring);
}

// ─── JUJUTSU HIGH (north half) ──────────────────────────────
function buildSchool() {
    const wallMat = new THREE.MeshStandardMaterial({ color: '#9a9388', roughness: 0.85 });
    const roofMat = new THREE.MeshStandardMaterial({ color: '#1a1c20', roughness: 0.7 });
    const winMat  = new THREE.MeshStandardMaterial({ color: '#3a4cff', emissive: '#1a2266',
        emissiveIntensity: 0.7, roughness: 0.4, metalness: 0.3 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: '#5a5d65', roughness: 0.9 });

    // Main school block — 30 × 14 × 18 (W×H×D), centered (0, -50)
    const sx = 30, sy = 14, sz = 18, cx = 0, cz = -50;
    const block = new THREE.Group();
    block.add(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), wallMat).translateY(sy / 2));
    // 3 floors of window strips on the south (front) face
    for (let f = 0; f < 3; f++) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.92, 1.6, 0.2), winMat);
        win.position.set(0, 3 + f * 4, sz / 2 + 0.01);
        block.add(win);
    }
    block.add(new THREE.Mesh(new THREE.BoxGeometry(sx + 0.6, 0.4, sz + 0.6), roofMat).translateY(sy + 0.2));
    // "JUJUTSU HIGH" banner over the entrance — purple neon plane
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.6),
        new THREE.MeshBasicMaterial({ color: '#a06bff' }));
    sign.position.set(0, sy * 0.85, sz / 2 + 0.02);
    block.add(sign);
    block.position.set(cx, 0, cz);
    scene.add(block);
    obstacles.push({ minX: cx - sx/2, maxX: cx + sx/2, minZ: cz - sz/2, maxZ: cz + sz/2 });

    // Perimeter walls — east, west, and back; front has a gate gap
    const wallH = 3.0;
    const addWall = (minX, maxX, minZ, maxZ) => {
        const w = Math.max(0.6, maxX - minX);
        const d = Math.max(0.6, maxZ - minZ);
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), stoneMat);
        m.position.set((minX + maxX) / 2, wallH / 2, (minZ + maxZ) / 2);
        scene.add(m);
        obstacles.push({ minX, maxX, minZ, maxZ });
    };
    addWall( 39.7,  40.3, -100, -15);     // east wall
    addWall(-40.3, -39.7, -100, -15);     // west wall
    addWall(-40,    40,   -100.3, -99.7); // back wall
    addWall(-40,   -12,   -15.3, -14.7);  // front wall (west of gate)
    addWall( 12,    40,   -15.3, -14.7);  // front wall (east of gate)

    // Gate pillars on either side of the entrance
    const pillarMat = new THREE.MeshStandardMaterial({ color: '#3a3d44', roughness: 0.85, metalness: 0.2 });
    for (const px of [-9, 9]) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(1.6, 4.8, 1.6), pillarMat);
        p.position.set(px, 2.4, -15);
        scene.add(p);
        obstacles.push({ minX: px - 0.8, maxX: px + 0.8, minZ: -15.8, maxZ: -14.2 });
    }
    // Curved torii-style arch beam between the pillars
    const arch = new THREE.Mesh(new THREE.BoxGeometry(20.5, 0.6, 0.8),
        new THREE.MeshStandardMaterial({ color: '#2a1d18', roughness: 0.8 }));
    arch.position.set(0, 5.0, -15); scene.add(arch);

    // Training dummies in the courtyard
    for (const [dx, dz] of [[-15, -28], [15, -28]]) {
        const d = new THREE.Group();
        d.add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.6, 8),
            new THREE.MeshStandardMaterial({ color: '#3a2c1c', roughness: 0.95 })).translateY(1.3));
        d.add(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 1.2, 12),
            new THREE.MeshStandardMaterial({ color: '#5a3a26', roughness: 0.95 })).translateY(1.9));
        d.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10),
            new THREE.MeshStandardMaterial({ color: '#c0a878', roughness: 0.95 })).translateY(2.85));
        d.position.set(dx, 0, dz); scene.add(d);
        obstacles.push({ minX: dx - 0.5, maxX: dx + 0.5, minZ: dz - 0.5, maxZ: dz + 0.5 });
    }

    // Courtyard tile — slightly lighter ground between gate and school
    const yard = new THREE.Mesh(new THREE.PlaneGeometry(60, 30),
        new THREE.MeshStandardMaterial({ color: '#3a3d44', roughness: 0.9 }));
    yard.rotation.x = -Math.PI / 2; yard.position.set(0, 0.01, -32); scene.add(yard);
}

// ─── TOKYO STREETS (south half) ─────────────────────────────
// Procedural city: 8×6 grid of 50×50 m blocks separated by a 6 m road
// grid, with sidewalks, crosswalks, streetlamps, and per-block content
// (skyscraper / mid-rise row / park / parking lot). ~50 buildings,
// hundreds of decorations. Sized to feel like a real district.
function buildCity() {
    // ── Shared materials ──
    const concreteShades = [
        new THREE.MeshStandardMaterial({ color: '#3a3d44', roughness: 0.85 }),
        new THREE.MeshStandardMaterial({ color: '#2a2d34', roughness: 0.85 }),
        new THREE.MeshStandardMaterial({ color: '#4a4d54', roughness: 0.85 }),
        new THREE.MeshStandardMaterial({ color: '#22252b', roughness: 0.9 }),
        new THREE.MeshStandardMaterial({ color: '#33363c', roughness: 0.8 }),
    ];
    const winLit = new THREE.MeshStandardMaterial({
        color: '#a06bff', emissive: '#3a2266', emissiveIntensity: 0.9, roughness: 0.45 });
    const winLitWarm = new THREE.MeshStandardMaterial({
        color: '#ffcf66', emissive: '#5a4010', emissiveIntensity: 0.85, roughness: 0.5 });
    const winDark = new THREE.MeshStandardMaterial({
        color: '#1a1d24', roughness: 0.5 });
    const doorMat = new THREE.MeshStandardMaterial({ color: '#0a0a0c', roughness: 0.6 });
    const asphalt = new THREE.MeshStandardMaterial({ color: '#15161a', roughness: 0.95 });
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: '#5a5d63', roughness: 0.9 });
    const curbMat = new THREE.MeshStandardMaterial({ color: '#3a3d42', roughness: 0.9 });
    const stripeMat = new THREE.MeshBasicMaterial({ color: '#ffcf3a' });
    const whiteStripeMat = new THREE.MeshBasicMaterial({ color: '#d0d8e0' });
    const lampMat = new THREE.MeshStandardMaterial({ color: '#1a1c20', roughness: 0.6, metalness: 0.5 });
    const parkGround = new THREE.MeshStandardMaterial({ color: '#1d3320', roughness: 0.95 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#3a2a1c', roughness: 1 });
    const leafMat = new THREE.MeshStandardMaterial({ color: '#264c2c', roughness: 1 });
    const benchMat = new THREE.MeshStandardMaterial({ color: '#3a2c1c', roughness: 0.9 });
    const trashMat = new THREE.MeshStandardMaterial({ color: '#2a2d34', roughness: 0.85, metalness: 0.4 });
    const acMat = new THREE.MeshStandardMaterial({ color: '#7a8088', roughness: 0.7, metalness: 0.5 });
    const carColors = ['#c01030', '#1a2030', '#3a4cff', '#a06bff', '#3adf8a', '#ffcf3a', '#d0d8e0', '#5a3a26'];
    const neonPalette = ['#ff3a8a', '#3a8aff', '#3aff8a', '#ffcf3a', '#ff6a3a', '#a06bff', '#ff3a3a'];
    const vendingColors = ['#c01030', '#3a4cff', '#ffcf3a'];

    // ── Helpers ──
    const rand = (lo, hi) => lo + Math.random() * (hi - lo);
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    // Skyscraper: tall slab with window grid + maybe a neon sign +
    // rooftop AC + antenna. minSz set so the windows have room.
    function makeSkyscraper(cx, cz, w, d, h) {
        const g = new THREE.Group();
        const body = pick(concreteShades);
        g.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), body).translateY(h / 2));

        // Window grid — N face only, tight caps, ~60% skip rate.
        // Total windows per building capped at ~24.
        const rows = Math.max(3, Math.min(8, Math.floor((h - 4) / 4.5)));
        const fcols = Math.max(2, Math.min(5, Math.floor(w / 3.5)));
        const wp = winLit, wp2 = winLitWarm;
        for (let r = 0; r < rows; r++) for (let c = 0; c < fcols; c++) {
            if (Math.random() < 0.6) continue;
            const mat = Math.random() < 0.75 ? wp : wp2;
            const win = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.7, 0.12), mat);
            const u = -w / 2 + 1.6 + c * (w - 3.2) / Math.max(1, fcols - 1);
            const y = 3 + r * (h - 6) / Math.max(1, rows - 1);
            win.position.set(u, y, -d / 2 - 0.01);
            g.add(win);
        }

        // Ground-level door on the street-facing (north) side
        const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), doorMat);
        door.position.set(0, 1.2, -d / 2 - 0.02); g.add(door);

        // Neon billboard (emissive material is enough — no per-neon point
        // light; that's what was crashing the scene).
        if (Math.random() < 0.55) {
            const c = pick(neonPalette);
            const onNorth = Math.random() < 0.5;
            const neonW = w * (0.4 + Math.random() * 0.3);
            const neon = new THREE.Mesh(new THREE.BoxGeometry(neonW, 1.4, 0.3),
                new THREE.MeshBasicMaterial({ color: c }));
            const ny = h * (0.55 + Math.random() * 0.25);
            if (onNorth) { neon.position.set(0, ny, -d / 2 - 0.18); }
            else         { neon.position.set(0, ny,  d / 2 + 0.18); neon.rotation.y = Math.PI; }
            g.add(neon);
        }

        // Rooftop AC unit only (antennas + water tanks removed for perf)
        g.add(new THREE.Mesh(new THREE.BoxGeometry(w * 0.35, 0.9, d * 0.3), acMat)
            .translateY(h + 0.45));

        g.position.set(cx, 0, cz); scene.add(g);
        obstacles.push({ minX: cx - w / 2, maxX: cx + w / 2,
                         minZ: cz - d / 2, maxZ: cz + d / 2 });
    }

    // Mid-rise / shop strip: low building with awning + neon sign
    function makeShop(cx, cz, w, d, h) {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), pick(concreteShades)).translateY(h / 2));
        // One row of upper windows, capped tightly
        const cols = Math.max(2, Math.min(4, Math.floor(w / 3.0)));
        for (let c = 0; c < cols; c++) {
            if (Math.random() < 0.4) continue;
            const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.3, 0.1), winLit);
            win.position.set(-w / 2 + 1.5 + c * (w - 3) / Math.max(1, cols - 1),
                Math.max(3.6, h - 1.6), -d / 2 - 0.01);
            g.add(win);
        }
        // Awning
        const awning = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.15, 1.2),
            new THREE.MeshStandardMaterial({ color: pick(['#c01030', '#1a4a8a', '#3a8a1a', '#a06bff']) }));
        awning.position.set(0, 2.0, -d / 2 - 0.5); g.add(awning);
        // Neon sign over awning (emissive only — no point light)
        const c = pick(neonPalette);
        const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 0.55, 0.18),
            new THREE.MeshBasicMaterial({ color: c }));
        sign.position.set(0, 2.7, -d / 2 - 0.1); g.add(sign);
        // Door
        const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.0), doorMat);
        door.position.set(0, 1.0, -d / 2 - 0.02); g.add(door);

        g.position.set(cx, 0, cz); scene.add(g);
        obstacles.push({ minX: cx - w / 2, maxX: cx + w / 2,
                         minZ: cz - d / 2, maxZ: cz + d / 2 });
    }

    // Streetlamp — no point light (the emissive bulb + scene ambient
    // is enough visually, and per-lamp lights were a perf killer).
    function makeLamp(cx, cz) {
        const lp = new THREE.Group();
        lp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 5.5, 6), lampMat).translateY(2.75));
        lp.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.12), lampMat).translateX(0.5).translateY(5.3));
        lp.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8),
            new THREE.MeshBasicMaterial({ color: '#fff0c8' })).translateX(1.0).translateY(5.2));
        lp.position.set(cx, 0, cz); scene.add(lp);
    }

    // Bench
    function makeBench(cx, cz, rotY = 0) {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.5), benchMat).translateY(0.5));
        g.add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.08), benchMat).translateY(0.78).translateZ(-0.2));
        for (const lx of [-0.7, 0.7]) {
            g.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.5), benchMat)
                .translateX(lx).translateY(0.25));
        }
        g.position.set(cx, 0, cz); g.rotation.y = rotY; scene.add(g);
    }

    // Trash can
    function makeTrashCan(cx, cz) {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.9, 10), trashMat);
        t.position.set(cx, 0.45, cz); scene.add(t);
    }

    // Vending machine (simplified — 1 box, no display light)
    function makeVending(cx, cz, rotY = 0) {
        const c = pick(vendingColors);
        const m = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.9, 0.6),
            new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.25, roughness: 0.7 }));
        m.position.set(cx, 0.95, cz); m.rotation.y = rotY; scene.add(m);
        obstacles.push({ minX: cx - 0.55, maxX: cx + 0.55, minZ: cz - 0.35, maxZ: cz + 0.35 });
    }

    // Sidewalk tree
    function makeTree(cx, cz) {
        const tree = new THREE.Group();
        tree.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 2.5, 6), trunkMat).translateY(1.25));
        tree.add(new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), leafMat).translateY(3.2));
        tree.position.set(cx, 0, cz); scene.add(tree);
    }

    // Parked car (2 meshes: body + cabin, no separate wheels/glass/lights)
    function makeCar(cx, cz, rotY = 0) {
        const g = new THREE.Group();
        const c = pick(carColors);
        g.add(new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.1, 1.7),
            new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.4 })).translateY(0.65));
        g.add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 1.55),
            new THREE.MeshStandardMaterial({ color: '#0a0e18', roughness: 0.4, metalness: 0.6 })).translateX(-0.2).translateY(1.55));
        g.position.set(cx, 0, cz); g.rotation.y = rotY; scene.add(g);
        const cosR = Math.abs(Math.cos(rotY)), sinR = Math.abs(Math.sin(rotY));
        obstacles.push({
            minX: cx - 2.0 * cosR - 0.85 * sinR, maxX: cx + 2.0 * cosR + 0.85 * sinR,
            minZ: cz - 2.0 * sinR - 0.85 * cosR, maxZ: cz + 2.0 * sinR + 0.85 * cosR,
        });
    }

    // Traffic light pole — simplified to pole + box (no tri-dots)
    function makeTrafficLight(cx, cz) {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 6.0, 6), lampMat).translateY(3.0));
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5),
            new THREE.MeshStandardMaterial({ color: '#3aff8a', emissive: '#0a4020', emissiveIntensity: 0.6 }))
            .translateX(1.9).translateY(5.0));
        g.position.set(cx, 0, cz); scene.add(g);
    }

    // Park content for an empty block
    function makePark(cx, cz, w, d) {
        const grass = new THREE.Mesh(new THREE.PlaneGeometry(w, d), parkGround);
        grass.rotation.x = -Math.PI / 2; grass.position.set(cx, 0.02, cz); scene.add(grass);
        // Scatter trees
        const treeCount = 4 + Math.floor(Math.random() * 6);
        for (let i = 0; i < treeCount; i++) {
            makeTree(cx + rand(-w / 2 + 2, w / 2 - 2), cz + rand(-d / 2 + 2, d / 2 - 2));
        }
        // A bench in the middle
        makeBench(cx, cz, Math.random() < 0.5 ? 0 : Math.PI / 2);
        // Trash can nearby
        makeTrashCan(cx + rand(-3, 3), cz + rand(-3, 3));
    }

    // Parking lot
    function makeParkingLot(cx, cz, w, d) {
        const lot = new THREE.Mesh(new THREE.PlaneGeometry(w, d), asphalt);
        lot.rotation.x = -Math.PI / 2; lot.position.set(cx, 0.02, cz); scene.add(lot);
        // Lane stripes
        for (let i = -w / 2 + 3; i < w / 2 - 3; i += 3) {
            const s = new THREE.Mesh(new THREE.PlaneGeometry(0.15, d * 0.6), whiteStripeMat);
            s.rotation.x = -Math.PI / 2; s.position.set(cx + i, 0.03, cz); scene.add(s);
        }
        // Parked cars
        const carCount = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < carCount; i++) {
            const px = cx + rand(-w / 2 + 3, w / 2 - 3);
            const pz = cz + rand(-d / 2 + 2.5, d / 2 - 2.5);
            makeCar(px, pz, Math.random() < 0.5 ? 0 : Math.PI / 2);
        }
    }

    // ── Build the road grid + sidewalks ──
    // Block size = 50 (40 building area + 10 buffer for road + sidewalk)
    const BLOCK = 50, ROAD_W = 6, SIDE_W = 2.4;
    const GRID_COLS = 7, GRID_ROWS = 4;
    const XMIN = -((GRID_COLS - 1) * BLOCK) / 2;   // city centred on x=0
    const ZMIN = 35;                                 // first row of blocks just south of plaza

    // East-west roads (no centerline dashes — too many tiny meshes)
    for (let r = 0; r <= GRID_ROWS; r++) {
        const z = ZMIN - BLOCK / 2 + r * BLOCK;
        const road = new THREE.Mesh(
            new THREE.PlaneGeometry((GRID_COLS - 1) * BLOCK + 20, ROAD_W), asphalt);
        road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, z); scene.add(road);
    }
    // North-south roads
    for (let c = 0; c <= GRID_COLS - 1; c++) {
        const x = XMIN - BLOCK / 2 + c * BLOCK;
        const road = new THREE.Mesh(
            new THREE.PlaneGeometry(ROAD_W, GRID_ROWS * BLOCK + 20), asphalt);
        road.rotation.x = -Math.PI / 2; road.position.set(x, 0.02, ZMIN + (GRID_ROWS - 1) * BLOCK / 2); scene.add(road);
    }

    // Crosswalks — 3 stripes per side per intersection (was 5×2),
    // and traffic light only on every other intersection
    for (let r = 0; r <= GRID_ROWS; r++) for (let c = 0; c <= GRID_COLS - 1; c++) {
        const ix = XMIN - BLOCK / 2 + c * BLOCK;
        const iz = ZMIN - BLOCK / 2 + r * BLOCK;
        for (let i = 0; i < 3; i++) {
            const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 5.0), whiteStripeMat);
            stripe.rotation.x = -Math.PI / 2;
            stripe.position.set(ix + (i - 1) * 1.0, 0.035, iz + 4.5);
            scene.add(stripe);
            const s2 = stripe.clone(); s2.position.z = iz - 4.5; scene.add(s2);
        }
        if ((r + c) % 2 === 0) makeTrafficLight(ix + 4, iz + 4);
    }

    // ── Per-block content ──
    for (let r = 0; r < GRID_ROWS; r++) for (let c = 0; c < GRID_COLS - 1; c++) {
        const blockX = XMIN + c * BLOCK;
        const blockZ = ZMIN + r * BLOCK;
        // Skip the centermost row/col if it touches the school complex
        if (blockZ < 18) continue;
        // Lay a sidewalk slab covering the whole block area
        const sw = BLOCK - ROAD_W - 0.5;
        const sidewalk = new THREE.Mesh(new THREE.PlaneGeometry(sw, sw), sidewalkMat);
        sidewalk.rotation.x = -Math.PI / 2; sidewalk.position.set(blockX, 0.025, blockZ); scene.add(sidewalk);
        // Curb edges (4 thin raised strips around the block)
        for (const [px, pz, w2, d2] of [
            [blockX, blockZ - sw / 2 - 0.15, sw, 0.3],
            [blockX, blockZ + sw / 2 + 0.15, sw, 0.3],
            [blockX - sw / 2 - 0.15, blockZ, 0.3, sw],
            [blockX + sw / 2 + 0.15, blockZ, 0.3, sw],
        ]) {
            const curb = new THREE.Mesh(new THREE.BoxGeometry(w2, 0.2, d2), curbMat);
            curb.position.set(px, 0.1, pz); scene.add(curb);
        }

        // Lamp at each block's corner (only one per corner per pass to avoid dupes)
        if (r === 0 && c === 0) {
            // Plant lamps once per intersection (already covered by traffic lights though).
        }

        // Roll for block content
        const roll = Math.random();
        // Tighter usable area for buildings (leave room for sidewalk
        // decorations on the edges)
        const usable = sw - 4;

        if (roll < 0.55) {
            // SKYSCRAPER block: 1 big building filling most of the lot
            const bw = rand(usable * 0.65, usable * 0.92);
            const bd = rand(usable * 0.65, usable * 0.92);
            const bh = rand(22, 58);
            makeSkyscraper(blockX, blockZ, bw, bd, bh);
        } else if (roll < 0.80) {
            // ROW of 2-3 shops/mid-rises along the block
            const count = 2 + Math.floor(Math.random() * 2);
            const cellW = usable / count;
            for (let i = 0; i < count; i++) {
                const bw = cellW * 0.85;
                const bd = rand(usable * 0.55, usable * 0.75);
                const bh = rand(8, 22);
                const bx = blockX - usable / 2 + cellW * (i + 0.5);
                if (bh > 14) makeSkyscraper(bx, blockZ, bw, bd, bh);
                else makeShop(bx, blockZ, bw, bd, bh);
            }
        } else if (roll < 0.93) {
            // PARK
            makePark(blockX, blockZ, usable + 2, usable + 2);
        } else {
            // PARKING LOT
            makeParkingLot(blockX, blockZ, usable, usable);
        }

        // Lighter sidewalk decoration: 2 furniture slots per edge,
        // biased to trees + occasional lamp. Lamps are the only thing
        // here that adds a point light.
        const edgeFurniture = ['tree', 'tree', 'tree', 'lamp', 'bench', 'trash'];
        for (const edgeZ of [blockZ - sw / 2 + 1.4, blockZ + sw / 2 - 1.4]) {
            for (let i = 0; i < 2; i++) {
                const ex = blockX - sw / 2 + 6 + i * (sw - 12);
                const kind = pick(edgeFurniture);
                if      (kind === 'lamp')    makeLamp(ex, edgeZ);
                else if (kind === 'tree')    makeTree(ex, edgeZ);
                else if (kind === 'bench')   makeBench(ex, edgeZ, edgeZ < blockZ ? 0 : Math.PI);
                else if (kind === 'trash')   makeTrashCan(ex, edgeZ);
            }
        }
        // One occasional vending machine in front of every ~3rd block
        if (Math.random() < 0.3) makeVending(blockX, blockZ - sw / 2 + 1.4);
        // Street-side parked cars only every ~4th block
        if (Math.random() < 0.25) {
            makeCar(blockX - 4, blockZ - sw / 2 - 2.2, Math.PI / 2);
            makeCar(blockX + 4, blockZ - sw / 2 - 2.2, Math.PI / 2);
        }
    }

    // ── Distant skyline (just impression — no collision, far away) ──
    for (let i = 0; i < 14; i++) {
        const sx = (Math.random() - 0.5) * (WORLD * 2 + 200);
        const sz = ZMIN + GRID_ROWS * BLOCK + 60 + Math.random() * 120;
        const sw2 = 8 + Math.random() * 22;
        const sh = 30 + Math.random() * 80;
        const m = new THREE.Mesh(new THREE.BoxGeometry(sw2, sh, sw2),
            new THREE.MeshStandardMaterial({ color: '#1a1d24', roughness: 0.9 }));
        m.position.set(sx, sh / 2, sz); scene.add(m);
    }
}

// ─── CENTRAL PLAZA ──────────────────────────────────────────
let board, smith, contact, vendor;
// All quest-giver NPCs (board + the 4 tiered city givers). Used by
// tryInteract + the overhead-arrow navigation system.
const questGivers = [];
function buildPlaza() {
    // Plaza ground tile + neon ring are already built in buildTerrain.
    // Drop the 4 plaza NPCs around the center.
    board   = makeNpc('#a06bff', TOWN.x - 8, TOWN.z + 2,  'MISSION BOARD', 'board');
    smith   = makeNpc('#ff8a3a', TOWN.x + 8, TOWN.z + 4,  'CURSED TOOL SMITH', 'smith');
    contact = makeNpc('#3adf8a', TOWN.x,     TOWN.z - 7,  'JUJUTSU HIGH CONTACT', 'contact');
    vendor  = makeNpc('#d24aff', TOWN.x - 14, TOWN.z - 4, 'CURSED TECHNIQUE VENDOR', 'board');
    // Wire the plaza board as the L1 quest giver
    board.userData._questId = 'exorcism1';
    board.userData._minLevel = 1;
    questGivers.push(board);
}

// ─── SWORDS ─────────────────────────────────────────────────
// Catalog of buyable blades. Each swordsmith sells the same catalog
// (cost gates progression). For now there's only one entry — the basic
// steel blade. dmgBonus left at 0 until the user dials in numbers.
const SWORD_CATALOG = [
    { id: 'basic', name: 'Basic Steel Blade', desc: 'A reliable two-handed steel longsword. No cursed energy infused.', gold: 100, dmgBonus: 0 },
];

// Anduril-style longsword — silver tapered blade, dark wrapped grip,
// steel crossguard with flared cap ends, chunky pommel, gold inlay
// triangles on the guard caps + pommel. Grip is centred at origin so
// it sits in the right hand; blade extends along +Y by default (the
// attachment code rotates it to point out of the fingertip).
function buildBasicSword(scale = 1) {
    const grp = new THREE.Group();
    const matBlade  = new THREE.MeshStandardMaterial({ color: '#d8dde6', metalness: 0.88, roughness: 0.22 });
    const matSteel  = new THREE.MeshStandardMaterial({ color: '#3a3d44', metalness: 0.7,  roughness: 0.4  });
    const matGrip   = new THREE.MeshStandardMaterial({ color: '#1a1614', roughness: 0.85 });
    const matAccent = new THREE.MeshStandardMaterial({ color: '#c9b676', metalness: 0.55, roughness: 0.42 });

    // Blade — long tapered cylinder, then squashed on Z so it reads
    // as a flat blade instead of a rod.
    const blade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.030 * scale, 0.013 * scale, 0.90 * scale, 4),
        matBlade
    );
    blade.position.y = 0.55 * scale;
    blade.rotation.y = Math.PI / 4;      // rotate the 4-sided cross-section so an edge faces forward
    blade.scale.z = 0.30;                // flatten — flat blade, not a baton
    grp.add(blade);
    // Tip cap (small point so the tapered cylinder doesn't look open)
    const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.013 * scale, 0.05 * scale, 4),
        matBlade
    );
    tip.position.y = 1.02 * scale;
    tip.rotation.y = Math.PI / 4;
    tip.scale.z = 0.30;
    grp.add(tip);

    // Crossguard — horizontal short bar with flared cone caps
    const guard = new THREE.Mesh(
        new THREE.BoxGeometry(0.22 * scale, 0.05 * scale, 0.06 * scale),
        matSteel
    );
    guard.position.y = 0.11 * scale;
    grp.add(guard);
    for (const s of [-1, 1]) {
        const cap = new THREE.Mesh(
            new THREE.ConeGeometry(0.045 * scale, 0.07 * scale, 4),
            matSteel
        );
        cap.position.set(s * 0.13 * scale, 0.11 * scale, 0);
        cap.rotation.z = s * Math.PI / 2;
        grp.add(cap);
        // Gold triangle inlay on each cap face
        const accent = new THREE.Mesh(
            new THREE.ConeGeometry(0.018 * scale, 0.025 * scale, 3),
            matAccent
        );
        accent.position.set(s * 0.16 * scale, 0.11 * scale, 0.022 * scale);
        accent.rotation.z = s * Math.PI / 2;
        grp.add(accent);
    }

    // Grip — wrapped leather (subtle ridges via a slim cylinder + 4
    // even slimmer ring details to suggest the wrap).
    const grip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.024 * scale, 0.024 * scale, 0.17 * scale, 10),
        matGrip
    );
    grip.position.y = 0.0 * scale;
    grp.add(grip);
    for (let i = 0; i < 4; i++) {
        const wrap = new THREE.Mesh(
            new THREE.TorusGeometry(0.026 * scale, 0.004 * scale, 4, 12),
            matGrip
        );
        wrap.position.y = (-0.07 + i * 0.045) * scale;
        wrap.rotation.x = Math.PI / 2;
        grp.add(wrap);
    }

    // Pommel — chunky bulbous cap with a gold inset on each face
    const pommel = new THREE.Mesh(
        new THREE.SphereGeometry(0.038 * scale, 10, 6),
        matSteel
    );
    pommel.position.y = -0.10 * scale;
    pommel.scale.set(1, 1.3, 1);
    grp.add(pommel);
    for (const s of [-1, 1]) {
        const dot = new THREE.Mesh(
            new THREE.SphereGeometry(0.012 * scale, 6, 5),
            matAccent
        );
        dot.position.set(0, -0.10 * scale, s * 0.030 * scale);
        grp.add(dot);
    }

    return grp;
}

// Sword vendors — scattered around the map. Each one sells SWORD_CATALOG.
const swordVendors = [];
function buildSwordVendors() {
    const list = [
        { name: 'TETSU THE BLADESMITH', color: '#c0c4cc', x:  14, z:    8 },  // near plaza
        { name: 'MISTRESS KAJI',        color: '#9bb0c4', x: -30, z:   95 },  // mid-city
        { name: 'OLD MAN RENJI',        color: '#a89880', x:  40, z:  220 },  // deep south
    ];
    for (const v of list) {
        const npc = makeNpc(v.color, v.x, v.z, v.name, 'swordsmith');
        swordVendors.push(npc);
    }
}

function openSwordShop(npc) {
    const name = npc.userData.label;
    const goldUI = `<span style="color:#ffe066">${save.gold} g</span>`;
    const rows = SWORD_CATALOG.map(s => {
        const owned = (save.ownedSwords || []).includes(s.id);
        const canAfford = save.gold >= s.gold;
        let btn;
        if (owned)          btn = `<button class="btn sec act" disabled style="opacity:0.5;cursor:default;border-color:#3aff8a;color:#3aff8a">Owned</button>`;
        else if (canAfford) btn = `<button class="btn sec act" data-sword-buy="${s.id}">Buy</button>`;
        else                btn = `<button class="btn sec act" disabled style="opacity:0.4;cursor:not-allowed">Buy</button>`;
        return `<div class="shop-row">
            <span class="shop-icon">⚔</span>
            <span class="shop-body"><b>${s.name}</b><br><small style="color:#7a8a9a">${s.desc}</small></span>
            <span class="shop-cost"><span style="color:#ffe066">${s.gold} g</span></span>
            ${btn}
        </div>`;
    }).join('');
    showOverlay(`<h2 style="color:#c0c4cc">${name}</h2>
        <p>${goldUI}</p>
        <p style="margin:0.4rem 0 0.8rem;color:#7a8a9a">"Pick your steel, sorcerer. Press <b>1</b> in the world to equip from your inventory."</p>
        <div class="shop-list">${rows}</div>
        <button class="btn sec act" data-close="1" style="margin-top:1rem">Close</button>`);
}

function buySword(id) {
    const s = SWORD_CATALOG.find(x => x.id === id);
    if (!s) return;
    if (!Array.isArray(save.ownedSwords)) save.ownedSwords = [];
    if (save.ownedSwords.includes(id)) return;
    if (save.gold < s.gold) { toast('Not enough gold'); return; }
    save.gold -= s.gold;
    save.ownedSwords.push(id);
    toast(`Bought: ${s.name} — press 1 to equip`);
    sfx('level');
    persist();
    openSwordShop({ userData: { label: 'BLADESMITH' } });
}

// Toggle the local player's sword mesh visibility based on save state.
function refreshSwordModel() {
    if (!playerModel || !playerModel.userData.sword) return;
    playerModel.userData.sword.visible = !!save.equippedSword;
}

// ─── INVENTORY ──────────────────────────────────────────────
// Press 1 to open. Click a sword to equip / unequip. Press 2 anywhere
// in the world for an instant sheath. While a sword is equipped, the
// player can only use the sword's moves (M1 swings + R air-slash).
function openInventory() {
    audioInit(); sfx('ui');
    const owned = save.ownedSwords || [];
    let body;
    if (!owned.length) {
        body = '<p style="color:#7a8a9a">Empty. Visit a Bladesmith to buy a sword.</p>';
    } else {
        const rows = owned.map(id => {
            const s = SWORD_CATALOG.find(x => x.id === id);
            if (!s) return '';
            const eq = save.equippedSword === id;
            return `<button class="inv-slot${eq ? ' eq' : ''}" data-inv-toggle="${id}">
                <span class="inv-icon">⚔</span>
                <span class="inv-body"><b>${s.name}</b><br><small style="color:#7a8a9a">${s.desc}</small></span>
                <span class="inv-status">${eq ? 'EQUIPPED' : 'click to equip'}</span>
            </button>`;
        }).join('');
        body = `<div class="inv-grid">${rows}</div>`;
    }
    showOverlay(`<h2 style="color:#cfeeff">Inventory</h2>
        <p style="color:#7a8a9a"><b>1</b> open · <b>2</b> instant unequip · click an item to toggle</p>
        ${body}
        <button class="btn sec act" data-close="1" style="margin-top:1rem">Close</button>`);
}

function toggleInvSlot(id) {
    if (save.equippedSword === id) {
        save.equippedSword = null;
        toast('Sheathed');
    } else {
        save.equippedSword = id;
        toast('Equipped: ' + SWORD_CATALOG.find(s => s.id === id).name);
    }
    refreshSwordModel();
    sfx('ui');
    persist();
    openInventory();
}

function quickUnequipSword() {
    if (!save.equippedSword) { toast('No sword equipped'); return; }
    save.equippedSword = null;
    refreshSwordModel();
    toast('Sword sheathed');
    sfx('ui');
    persist();
}

// ─── SWORD MOVES ────────────────────────────────────────────
// Per-slot ready timestamps for sword-only abilities. Only R is wired
// for now: a wide-arc air-slash projectile.
const swordReady = { r: 0 };
const SWORD_AIR_SLASH_CD = 1500;       // ms

function swordAirSlash(fx, fz) {
    const now = performance.now();
    if (now < swordReady.r) return;
    swordReady.r = now + SWORD_AIR_SLASH_CD;
    // Animation — both arms slung across the body, big torque + lunge
    rArmSwing = 1; lArmSwing = 1;
    torsoTwist = -0.45;
    lungeAmount = 0.6;
    sfx('boss'); playPunchSample();
    camShake(0.16, 0.28);

    // Air-slash projectile — a vertical crescent ring that travels
    // forward at chest height, cutting through anything in its path.
    const SPEED = 28, MAX_DIST = 30, RADIUS = 2.6;
    const grp = new THREE.Group();
    // Vertical crescent — RingGeometry placed in YZ plane, tilted so
    // the arc reads as a horizontal slash from the side.
    const ringOuter = new THREE.Mesh(
        new THREE.RingGeometry(2.0, 2.55, 28, 1, -Math.PI / 3, Math.PI * 2 / 3),
        new THREE.MeshBasicMaterial({ color: '#cfeeff', transparent: true, opacity: 0.92, side: THREE.DoubleSide })
    );
    const ringInner = new THREE.Mesh(
        new THREE.RingGeometry(2.15, 2.40, 28, 1, -Math.PI / 3, Math.PI * 2 / 3),
        new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.96, side: THREE.DoubleSide })
    );
    // Default ring lies in XY (normal +Z). Rotate to XZ (normal +Y) so
    // it reads as a horizontal arc, then group-rotate around Y to face
    // the slash direction.
    ringOuter.rotation.x = -Math.PI / 2;
    ringInner.rotation.x = -Math.PI / 2;
    grp.add(ringOuter); grp.add(ringInner);
    grp.add(new THREE.PointLight('#9bf0ff', 3.2, 7, 2));
    grp.position.set(player.x + fx * 1.5, 1.5, player.z + fz * 1.5);
    grp.rotation.y = Math.atan2(fx, fz) + Math.PI / 2;   // arc opening forward
    scene.add(grp);

    let traveled = 0;
    let last = performance.now();
    const hitSet = new Set();
    const tk = () => {
        const tNow = performance.now();
        const dt2 = Math.min(0.04, (tNow - last) / 1000);
        last = tNow;
        const step = SPEED * dt2;
        grp.position.x += fx * step;
        grp.position.z += fz * step;
        traveled += step;
        // Hit detection — anything within RADIUS of the arc's centre
        for (const c of curses.slice()) {
            if (!c.alive || hitSet.has(c.id)) continue;
            const d = Math.hypot(c.x - grp.position.x, c.z - grp.position.z);
            if (d > RADIUS) continue;
            hitSet.add(c.id);
            let dmg = player.damage * 1.5;
            dmg = tryBlackFlash(c, dmg);
            const hx = c.x, hz = c.z, hb = c.boss;
            const wasAlive = c.alive;
            damageCurse(c, dmg);
            cutCurseFx({ x: hx, z: hz }, fx, fz, '#cfeeff');
            if (wasAlive && !c.alive) splitCurseChunks(hx, hz, fx, fz, hb);
        }
        if (Math.random() < 0.55) burst(grp.position.x, grp.position.y - 0.3, grp.position.z, '#cfeeff', 2);
        if (traveled >= MAX_DIST) {
            scene.remove(grp);
            ringOuter.geometry.dispose(); ringOuter.material.dispose();
            ringInner.geometry.dispose(); ringInner.material.dispose();
            return;
        }
        // Subtle fade-in at start, fade-out near end of life
        const lifeRatio = traveled / MAX_DIST;
        const o = lifeRatio < 0.1 ? lifeRatio * 10 : (1 - Math.max(0, (lifeRatio - 0.7) / 0.3));
        ringOuter.material.opacity = 0.92 * o;
        ringInner.material.opacity = 0.96 * o;
        requestAnimationFrame(tk);
    };
    requestAnimationFrame(tk);
    // Tell the network this counts as an ability cast so other players see something
    if (NET.isOnline) sendMyAction('ability', 'r');
}

// 4 additional quest-giver NPCs scattered around the Tokyo district.
// Each is gated by player level — the overhead arrow points at the
// closest unlocked one with an available (or retake-able) quest.
function buildCityQuestGivers() {
    const givers = [
        { color: '#3a8aff', label: 'CURSE HUNTER',          questId: 'exorcism2', minLevel: 10, x:  -60, z:  60 },
        { color: '#ffcf3a', label: 'VETERAN SORCERER',      questId: 'exorcism3', minLevel: 20, x:   60, z: 110 },
        { color: '#3aff8a', label: 'SPECIAL GRADE MENTOR',  questId: 'exorcism4', minLevel: 30, x:  -80, z: 150 },
        { color: '#ff3a8a', label: 'ELDER SORCERER',        questId: 'exorcism5', minLevel: 40, x:   80, z: 170 },
    ];
    for (const g of givers) {
        const npc = makeNpc(g.color, g.x, g.z, g.label, 'board');
        npc.userData._questId = g.questId;
        npc.userData._minLevel = g.minLevel;
        questGivers.push(npc);
    }
}

// ─── HUMANOID BUILDER ───────────────────────────────────────
// Construction-style anatomy: separate pelvis / abdomen / chest boxes,
// jointed shoulders → elbows → wrists, jointed hips → knees → ankles,
// wedge hands and boots, boxy head with jaw + hair cap. Joint pivots
// are exposed on userData so the same rig can be walk-animated (player)
// or posed once (NPCs).
function buildHumanoid(opts = {}) {
    const o = Object.assign({
        height: 1.0,
        skin: '#e8c8a8',
        hair: '#15151a',
        hairCap: true,
        coat: '#1a2030',
        pants: '#0a0c14',
        boots: '#15110c',
        belt: '#221a14',
        accent: null,             // chest stripe (color or null)
        collar: false,            // 'high' = raised collar cylinder
        eye: '#10131c',
    }, opts);
    const S = o.height;

    const matSkin = new THREE.MeshStandardMaterial({ color: o.skin, roughness: 0.6 });
    const matHair = new THREE.MeshStandardMaterial({ color: o.hair, roughness: 0.7 });
    const matCoat = new THREE.MeshStandardMaterial({ color: o.coat, roughness: 0.78 });
    const matPants = new THREE.MeshStandardMaterial({ color: o.pants, roughness: 0.8 });
    const matBoot = new THREE.MeshStandardMaterial({ color: o.boots, roughness: 0.85 });
    const matBelt = new THREE.MeshStandardMaterial({ color: o.belt, roughness: 0.7 });

    const g = new THREE.Group();

    // ── Pelvis (root pivot — also lets us bob the whole body) ──
    const pelvisPivot = new THREE.Group();
    pelvisPivot.position.y = 1.06 * S;
    g.add(pelvisPivot);
    pelvisPivot.add(new THREE.Mesh(
        new THREE.BoxGeometry(0.5 * S, 0.22 * S, 0.34 * S), matPants));
    const beltMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.55 * S, 0.07 * S, 0.36 * S), matBelt);
    beltMesh.position.y = 0.12 * S;
    pelvisPivot.add(beltMesh);

    // ── Lower torso (abdomen) ──
    const lowerTorsoPivot = new THREE.Group();
    lowerTorsoPivot.position.y = 0.17 * S;
    pelvisPivot.add(lowerTorsoPivot);
    lowerTorsoPivot.add(new THREE.Mesh(
        new THREE.BoxGeometry(0.48 * S, 0.24 * S, 0.32 * S), matCoat));

    // ── Upper torso (chest, broader at shoulders) ──
    const upperTorsoPivot = new THREE.Group();
    upperTorsoPivot.position.y = 0.27 * S;
    lowerTorsoPivot.add(upperTorsoPivot);
    const chest = new THREE.Mesh(
        new THREE.BoxGeometry(0.62 * S, 0.32 * S, 0.38 * S), matCoat);
    upperTorsoPivot.add(chest);
    if (o.accent) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08 * S, 0.34 * S, 0.012),
            new THREE.MeshBasicMaterial({ color: o.accent, transparent: true, opacity: 0.75 }));
        stripe.position.set(0, 0, 0.196 * S);
        chest.add(stripe);
    }
    if (o.collar === 'high') {
        const c = new THREE.Mesh(
            new THREE.CylinderGeometry(0.13 * S, 0.16 * S, 0.14 * S, 8), matCoat);
        c.position.y = 0.22 * S;
        upperTorsoPivot.add(c);
    }

    // ── Neck ──
    const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085 * S, 0.1 * S, 0.12 * S, 10), matSkin);
    neck.position.y = 0.22 * S;
    upperTorsoPivot.add(neck);

    // ── Head (boxy + jaw + hair cap) ──
    const headPivot = new THREE.Group();
    headPivot.position.y = 0.34 * S;
    upperTorsoPivot.add(headPivot);
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.26 * S, 0.30 * S, 0.26 * S), matSkin);
    head.position.y = 0.06 * S;
    headPivot.add(head);
    const jaw = new THREE.Mesh(
        new THREE.BoxGeometry(0.22 * S, 0.08 * S, 0.22 * S), matSkin);
    jaw.position.y = -0.085 * S;
    headPivot.add(jaw);
    if (o.hairCap) {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(
            0.17 * S, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), matHair);
        cap.position.y = 0.16 * S;
        cap.scale.set(1, 0.95, 1);
        headPivot.add(cap);
        const bang = new THREE.Mesh(
            new THREE.BoxGeometry(0.24 * S, 0.06 * S, 0.04 * S), matHair);
        bang.position.set(0, 0.17 * S, 0.115 * S);
        headPivot.add(bang);
    }
    for (const s of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025 * S, 6, 6),
            new THREE.MeshBasicMaterial({ color: o.eye }));
        eye.position.set(s * 0.06 * S, 0.04 * S, 0.13 * S);
        headPivot.add(eye);
    }

    // ── Arms: shoulder → elbow → wrist ──
    function buildArm(side) {
        const shoulder = new THREE.Group();
        // Shoulder pushed slightly outward so the chunkier deltoid ball
        // doesn't clip into the chest.
        shoulder.position.set(side * 0.37 * S, 0.12 * S, 0);
        upperTorsoPivot.add(shoulder);
        shoulder.add(new THREE.Mesh(
            new THREE.SphereGeometry(0.13 * S, 10, 10), matCoat));
        const upper = new THREE.Mesh(
            new THREE.CylinderGeometry(0.105 * S, 0.095 * S, 0.34 * S, 10), matCoat);
        upper.position.y = -0.19 * S;
        shoulder.add(upper);

        const elbow = new THREE.Group();
        elbow.position.y = -0.36 * S;
        shoulder.add(elbow);
        elbow.add(new THREE.Mesh(
            new THREE.SphereGeometry(0.105 * S, 10, 10), matCoat));
        const forearm = new THREE.Mesh(
            new THREE.CylinderGeometry(0.092 * S, 0.084 * S, 0.32 * S, 10), matCoat);
        forearm.position.y = -0.17 * S;
        elbow.add(forearm);

        const wrist = new THREE.Group();
        wrist.position.y = -0.34 * S;
        elbow.add(wrist);
        // Beefy fist — clearly visible at the end of every punch
        const hand = new THREE.Mesh(
            new THREE.BoxGeometry(0.14 * S, 0.15 * S, 0.10 * S), matSkin);
        hand.position.y = -0.07 * S;
        wrist.add(hand);
        const thumb = new THREE.Mesh(
            new THREE.BoxGeometry(0.06 * S, 0.08 * S, 0.07 * S), matSkin);
        thumb.position.set(side * 0.08 * S, -0.05 * S, 0);
        wrist.add(thumb);
        return { shoulder, elbow, wrist };
    }
    const armL = buildArm(-1);
    const armR = buildArm(1);

    // ── Legs: hip → knee → ankle ──
    function buildLeg(side) {
        const hip = new THREE.Group();
        hip.position.set(side * 0.13 * S, -0.1 * S, 0);
        pelvisPivot.add(hip);
        const thigh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.105 * S, 0.09 * S, 0.42 * S, 8), matPants);
        thigh.position.y = -0.22 * S;
        hip.add(thigh);

        const knee = new THREE.Group();
        knee.position.y = -0.44 * S;
        hip.add(knee);
        knee.add(new THREE.Mesh(
            new THREE.SphereGeometry(0.1 * S, 8, 8), matPants));
        const shin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.085 * S, 0.07 * S, 0.40 * S, 8), matPants);
        shin.position.y = -0.22 * S;
        knee.add(shin);

        const ankle = new THREE.Group();
        ankle.position.y = -0.42 * S;
        knee.add(ankle);
        const foot = new THREE.Mesh(
            new THREE.BoxGeometry(0.14 * S, 0.10 * S, 0.32 * S), matBoot);
        foot.position.set(0, -0.05 * S, 0.06 * S);
        ankle.add(foot);
        const toe = new THREE.Mesh(
            new THREE.BoxGeometry(0.12 * S, 0.06 * S, 0.08 * S), matBoot);
        toe.position.set(0, -0.07 * S, 0.22 * S);
        ankle.add(toe);
        return { hip, knee, ankle };
    }
    const legL = buildLeg(-1);
    const legR = buildLeg(1);

    g.userData = {
        pelvisPivot, lowerTorsoPivot, upperTorsoPivot, headPivot,
        lShoulder: armL.shoulder, lElbow: armL.elbow, lWrist: armL.wrist,
        rShoulder: armR.shoulder, rElbow: armR.elbow, rWrist: armR.wrist,
        lHip: legL.hip, lKnee: legL.knee, lAnkle: legL.ankle,
        rHip: legR.hip, rKnee: legR.knee, rAnkle: legR.ankle,
        S,
    };
    return g;
}

// A talkable human NPC (replaces the old glowing pole). Role gives them
// clothing colour + a pose + props (notice board / anvil + hammer / high
// collar). A soft ground ring + floating marker keep them findable.
function makeNpc(color, x, z, label, role) {
    const y = terrainHeight(x, z);
    let coat = '#384258';
    if (role === 'smith') coat = '#5a3a26';
    else if (role === 'contact') coat = '#0c1020';
    else if (role === 'swordsmith') coat = '#3a4b62';     // steel-blue gi

    const g = buildHumanoid({
        coat,
        pants: '#0a0c14',
        boots: '#15110c',
        belt: '#221a14',
        collar: role === 'contact' ? 'high' : false,
    });
    const ud = g.userData;

    if (role === 'board') {
        // Notice board behind the clerk
        const bp = new THREE.Group();
        bp.add(new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.5, 0.12),
            new THREE.MeshStandardMaterial({ color: '#3a2c1c', roughness: 0.9 })).translateY(2.0).translateZ(-0.95));
        for (const s of [-1, 1]) bp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 6),
            new THREE.MeshStandardMaterial({ color: '#2a2018' })).translateX(s * 0.92).translateY(1.5).translateZ(-0.95));
        for (let i = 0; i < 4; i++) {
            const n = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.52),
                new THREE.MeshBasicMaterial({ color: '#d8d2c0' }));
            n.position.set(-0.55 + (i % 2) * 0.7, 2.25 - Math.floor(i / 2) * 0.6, -0.88);
            bp.add(n);
        }
        g.add(bp);
        // Right arm raised holding a clipboard
        ud.rShoulder.rotation.x = -1.1;
        ud.rElbow.rotation.x = 0.9;
        const clip = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.44, 0.04),
            new THREE.MeshStandardMaterial({ color: '#caa86a' }));
        clip.position.set(0, -0.2, 0.08);
        ud.rWrist.add(clip);
    } else if (role === 'smith') {
        // Leather apron over chest + slight forward lean
        const apron = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.04),
            new THREE.MeshStandardMaterial({ color: '#3a2416', roughness: 0.9 }));
        apron.position.set(0, -0.04, 0.205);
        ud.upperTorsoPivot.add(apron);
        ud.upperTorsoPivot.rotation.x = 0.10;
        // Anvil to the side
        const anv = new THREE.Group();
        anv.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.9),
            new THREE.MeshStandardMaterial({ color: '#2a2d33', metalness: 0.6, roughness: 0.5 })).translateY(0.6));
        anv.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.46, 0.34),
            new THREE.MeshStandardMaterial({ color: '#23262b' })).translateY(0.23));
        anv.position.set(1.15, 0, 0.2);
        g.add(anv);
        // Hammer in right hand
        ud.rShoulder.rotation.x = -0.6;
        ud.rShoulder.rotation.z = -0.25;
        ud.rElbow.rotation.x = 0.9;
        const ham = new THREE.Group();
        ham.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6),
            new THREE.MeshStandardMaterial({ color: '#5a3a22' })));
        ham.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.16),
            new THREE.MeshStandardMaterial({ color: '#3a3d44', metalness: 0.6 })).translateY(0.4));
        ham.position.set(0, -0.32, 0);
        ham.rotation.z = 0.25;
        ud.rWrist.add(ham);
    } else if (role === 'swordsmith') {
        // Placeholder pose — relaxed stance, hands resting at the hips.
        // No sword props for now; the user is providing a reference
        // image and we'll re-mesh the visual to match.
        ud.lShoulder.rotation.set(-0.30, 0,  0.20);
        ud.rShoulder.rotation.set(-0.30, 0, -0.20);
        ud.lElbow.rotation.x = -0.55;
        ud.rElbow.rotation.x = -0.55;
    } else { // contact — arms crossed
        ud.lShoulder.rotation.set(-0.55, 0, 0.85);
        ud.rShoulder.rotation.set(-0.55, 0, -0.85);
        ud.lElbow.rotation.x = 1.45;
        ud.rElbow.rotation.x = 1.45;
    }

    // Ground ring + floating marker (kept; HUD/proximity logic reuses these)
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.18, 28),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; g.add(ring);
    g.add(new THREE.PointLight(color, 1.0, 11, 2).translateY(2.0));
    const mk = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), new THREE.MeshBasicMaterial({ color }));
    mk.position.y = 2.55; g.add(mk);

    g.position.set(x, y, z);
    g.rotation.y = Math.atan2(TOWN.x - x, TOWN.z - z);
    Object.assign(g.userData, {
        x, z, label, color,
        _head: ud.headPivot, _ring: ring, _mk: mk, _t: Math.random() * 6,
    });
    scene.add(g);
    return g;
}

// ─── PLAYER ─────────────────────────────────────────────────
function buildPlayerModel() {
    const playerScale = 0.88;   // ~12% shorter than the default rig (and the NPCs)
    const g = buildHumanoid({
        height: playerScale,
        coat: '#1a2030',     // JJK High navy
        pants: '#0a0c14',
        boots: '#15110c',
        accent: '#3a4cff',   // cyan chest stripe
    });
    const aura = new THREE.PointLight('#7c4dff', 1.2, 7, 2);
    aura.position.y = 1.2 * playerScale;
    g.add(aura);

    // Overhead quest-direction arrow. Group so we can swing it on Y
    // (yaw toward the target) while the inner arrow keeps its tilt.
    const arrow = new THREE.Group();
    arrow.position.y = 2.5 * playerScale;     // floating above the head
    arrow.visible = false;                    // hidden until target chosen
    const arrowMat = new THREE.MeshBasicMaterial({ color: '#ffe066', transparent: true, opacity: 0.95 });
    // Tip (cone pointing in +Z)
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.7, 4), arrowMat);
    tip.rotation.x = Math.PI / 2;             // cone's +Y → world +Z
    tip.position.z = 0.45;
    arrow.add(tip);
    // Shaft
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.6), arrowMat);
    shaft.position.z = -0.05;
    arrow.add(shaft);
    g.add(arrow);
    g.userData.arrow = arrow;

    // Attach a basic-sword mesh to the right wrist — hidden by default,
    // toggled visible when save.equippedSword is set. The blade points
    // out of the fingertip after the local-axis rotation below.
    const sword = buildBasicSword(playerScale);
    sword.rotation.x = Math.PI;          // flip so blade extends -Y from wrist (= "out the hand")
    sword.position.set(0, -0.06 * playerScale, 0);
    sword.visible = false;
    g.userData.rWrist.add(sword);
    g.userData.sword = sword;

    return g;
}

function deriveStats() {
    const lv = save.level;
    player.maxHp = 90 + lv * 15;
    player.maxStamina = 90 + lv * 8;       // drained by block, dash, grab, sprint
    player.maxCe = 60 + lv * 8;            // cursed-energy pool for techniques
    player.damage = 14 + lv * 3;
    player.speed = 8.5;
    if (player.hp === undefined || player.hp > player.maxHp) player.hp = player.maxHp;
    if (player.stamina === undefined || player.stamina > player.maxStamina) player.stamina = player.maxStamina;
    if (player.ce === undefined || player.ce > player.maxCe) player.ce = player.maxCe;
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

// Auto-incrementing ID assigned by whichever instance is authoritative
// (host in MP, the lone player in single-player). Used to keep every
// player's view of the same curse in sync.
let curseIdCounter = 1;
let curseStateAccum = 0;            // host's 10Hz broadcast timer

function spawnCurse(boss) {
    // Clients NEVER spawn locally — they only render curses they receive
    // from the host via curseSpawn / curseSnapshot messages.
    if (NET.isOnline && !NET.isHost) return;

    // Pick a spawn point in the city district (south half). Reject if
    // it lands inside an obstacle or the plaza safe zone.
    let x, z, tries = 0;
    do {
        if (boss) {
            // Bosses spawn closer to the player but still in the city zone
            const a = Math.random() * Math.PI * 2;
            x = player.x + Math.cos(a) * 14;
            z = Math.max(CURSE_ZONE.minZ + 4, player.z + Math.sin(a) * 14);
        } else {
            x = (Math.random() - 0.5) * 180;
            z = CURSE_ZONE.minZ + Math.random() * (CURSE_ZONE.maxZ - CURSE_ZONE.minZ);
        }
        tries++;
        if (tries > 12) return;            // give up this tick
    } while (
        Math.hypot(x - TOWN.x, z - TOWN.z) < TOWN.r ||
        inAnyObstacle(x, z)
    );
    const mesh = buildCurseMesh(boss);
    mesh.position.set(x, terrainHeight(x, z), z);
    scene.add(mesh);
    // Difficulty curve — both grade and level pump curse stats so
    // higher-tier play stays challenging. At L80 Special Grade a
    // normal curse takes 4-5 hits and hits the player for ~120.
    const gradeMul = 1 + (4 - save.grade) * 0.5;
    const levelMul = 1 + save.level * 0.04;
    const baseHp  = boss ? 380 : 40;
    const baseDmg = boss ? 28  : 14;
    const id = curseIdCounter++;
    const hpVal  = baseHp  * gradeMul * levelMul;
    const dmgVal = baseDmg * gradeMul * levelMul;
    curses.push({
        id, mesh, x, z, boss: !!boss,
        hp: hpVal, maxHp: hpVal, dmg: dmgVal,
        speed: boss ? 4.4 : 3.6,
        lastHit: 0, bob: Math.random() * 6, alive: true,
        frozenUntil: 0, iceShell: null, slamUntil: 0,
        targetX: x, targetZ: z,    // client lerp targets (unused on host)
        xp:   boss ? 0 : Math.round(22 * (1 + save.level * 0.05)),
        gold: boss ? 0 : Math.round(6  * (1 + save.level * 0.04)),
    });
    // Host: tell every client to spawn the matching visual-only curse.
    if (NET.isHost) {
        hostBroadcastCurseSpawn({ id, x, z, boss: !!boss, hp: hpVal, maxHp: hpVal });
    }
}

let curseTimer = 0;
function updateCurseDirector(dt) {
    // Director only runs on the authoritative instance (host in MP,
    // lone player in single-player). Clients receive spawn broadcasts.
    if (NET.isOnline && !NET.isHost) return;
    curseTimer -= dt;
    const inTown = Math.hypot(player.x - TOWN.x, player.z - TOWN.z) < TOWN.r;
    // More curses at higher grades — Special Grade gets a busier district
    const cap = 7 + (4 - save.grade) * 2;
    const normalCount = curses.filter(c => !c.boss).length;
    if (!inTown && curseTimer <= 0 && normalCount < cap) {
        spawnCurse(false);
        curseTimer = Math.max(0.5, 1.2 - (4 - save.grade) * 0.15) + Math.random() * 0.7;
    }
    // despawn far normals
    for (let i = curses.length - 1; i >= 0; i--) {
        const c = curses[i];
        if (!c.boss && Math.hypot(c.x - player.x, c.z - player.z) > 120) {
            scene.remove(c.mesh); curses.splice(i, 1);
        }
    }
}

// ─── AUDIO ──────────────────────────────────────────────────
// Tiny WebAudio blips (oscillator-based, no assets) for hit/death/UI,
// plus a sampled `assets/punch.m4a` recording for the melee swing —
// fetched on first audio init, silently skipped if absent.
let actx = null;
let punchBuffer = null;
function audioInit() {
    if (actx) return;
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
    if (actx) loadPunchSample();
}
async function loadPunchSample() {
    // Loaded from games/jujutsu-cursed-roads/assets/punch.m4a (path is
    // relative to the game's index.html). AAC-in-MP4 decodes fine via
    // WebAudio in all modern browsers.
    try {
        const res = await fetch('assets/punch.m4a');
        if (!res.ok) { console.log('[audio] no punch.m4a found — using synthesized hit only'); return; }
        const buf = await res.arrayBuffer();
        punchBuffer = await actx.decodeAudioData(buf);
        console.log('[audio] punch.m4a loaded');
    } catch (e) {
        console.warn('[audio] failed to load punch.m4a', e);
    }
}
function playPunchSample() {
    if (!actx || !punchBuffer) return;
    const src = actx.createBufferSource();
    src.buffer = punchBuffer;
    const g = actx.createGain();
    g.gain.value = 0.7;
    src.connect(g).connect(actx.destination);
    src.start(0);
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

// ─── HEAVY VFX HELPERS (restored for cursed techniques) ─────
// Used by Gojo's Limitless + future techniques. Each helper is a
// fire-and-forget — spawns a mesh / light / overlay that animates
// itself out via per-effect requestAnimationFrame, then disposes.

// Camera shake state — sampled in update()'s camera block
let shakeAmp = 0, shakeT = 0;
function camShake(amp, dur) { shakeAmp = Math.max(shakeAmp, amp); shakeT = Math.max(shakeT, dur); }

// Hitstop — global slowdown for `dur` seconds. We pause `state` and
// resume on a timer, simpler than juggling dt scaling everywhere.
let hitstopUntil = 0;
function hitstop(dur) { hitstopUntil = Math.max(hitstopUntil, performance.now() + dur * 1000); }

// Full-screen colour flash overlay
function screenFlash(color, ms) {
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;inset:0;z-index:7;pointer-events:none;background:${color};opacity:0.5;transition:opacity ${ms}ms`;
    document.body.appendChild(d);
    requestAnimationFrame(() => { d.style.opacity = '0'; });
    setTimeout(() => d.remove(), ms + 60);
}

// Bright temporary point light at a position
function flashLight(x, y, z, color, intensity, dur) {
    const L = new THREE.PointLight(color, intensity, 22, 2);
    L.position.set(x, y, z); scene.add(L);
    const t0 = performance.now();
    const tk = () => {
        const t = (performance.now() - t0) / dur;
        if (t >= 1) { scene.remove(L); return; }
        L.intensity = intensity * (1 - t);
        requestAnimationFrame(tk);
    };
    requestAnimationFrame(tk);
}

// Expanding flat ring on the ground (shockwave)
function shockRing(x, z, color, maxR, dur, thick) {
    const g = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.2 + (thick || 0.5), 48),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    g.rotation.x = -Math.PI / 2;
    g.position.set(x, 0.12, z);
    scene.add(g);
    const t0 = performance.now();
    const tk = () => {
        const t = (performance.now() - t0) / (dur || 480);
        if (t >= 1) { scene.remove(g); g.geometry.dispose(); g.material.dispose(); return; }
        const s = 1 + t * (maxR || 6);
        g.scale.set(s, s, s);
        g.material.opacity = 0.9 * (1 - t);
        requestAnimationFrame(tk);
    };
    requestAnimationFrame(tk);
}

// Big layered explosion: core white flash + 2 shockrings + sparks +
// light + camera shake. The Swiss-army knife of impact VFX.
function explode(x, y, z, color, power) {
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 12),
        new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95 }));
    core.position.set(x, y, z); scene.add(core);
    const t0 = performance.now();
    const tk = () => {
        const t = (performance.now() - t0) / 240;
        if (t >= 1) { scene.remove(core); core.geometry.dispose(); core.material.dispose(); return; }
        core.scale.setScalar(1 + t * power * 1.6);
        core.material.opacity = 0.95 * (1 - t);
        requestAnimationFrame(tk);
    };
    requestAnimationFrame(tk);
    shockRing(x, z, color, power * 2.4, 500, 0.6);
    shockRing(x, z, '#ffffff', power * 1.5, 360, 0.3);
    burst(x, y, z, color, 14 + power * 4);
    flashLight(x, y + 0.4, z, color, 4 + power, 280);
    camShake(0.05 + power * 0.03, 0.18);
}

// ── Black Flash universal mechanic ──
// 10% chance per M1 hit. The BF strike itself hits for 2.5× and grants
// a 4 s buff: the *next* M1 within that window also does 2×. If a
// second BF procs inside the buff window, the player gains 10 s of
// temporary god mode (works regardless of admin status).
const BF = {
    chance: 0.10,
    hitMul: 2.5,
    buffMul: 2.0,
    windowMs: 4000,
    godMs: 10000,
};
function tryBlackFlash(c, baseDmg) {
    if (Math.random() >= BF.chance) return baseDmg;
    // Proc — fire VFX + sfx + update buff state
    const now = performance.now();
    blackFlashVfx(c.x, 1.5, c.z);
    sfx('boss');
    hitstop(0.08);
    camShake(0.18, 0.28);
    // Chain check — second BF inside the still-open window?
    if (player.bfWindowUntil && now < player.bfWindowUntil) {
        player.tempGodUntil = now + BF.godMs;
        screenFlash('rgba(255,210,80,0.45)', 600);
        toast('★ BLACK FLASH x2 — GOD MODE 10s');
        player.bfWindowUntil = 0;       // reset chain
        player.bfDoubleNext = false;
    } else {
        player.bfWindowUntil = now + BF.windowMs;
        player.bfDoubleNext = true;     // next M1 gets the 2× buff
        toast('★ BLACK FLASH — next M1 ×2');
    }
    return baseDmg * BF.hitMul;
}
function blackFlashVfx(x, y, z) {
    // Black Flash — a black spatial-distortion crack with a red-hot
    // core, crackling black & red lightning bolts radiating outward.
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 12),
        new THREE.MeshBasicMaterial({ color: '#0a0008', transparent: true, opacity: 0.95 }));
    core.position.set(x, y, z); scene.add(core);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10),
        new THREE.MeshBasicMaterial({ color: '#ff2030', transparent: true, opacity: 0.95 }));
    inner.position.set(x, y, z); scene.add(inner);
    const dark = new THREE.Mesh(new THREE.RingGeometry(0.4, 1.0, 28),
        new THREE.MeshBasicMaterial({ color: '#050505', transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    dark.rotation.x = -Math.PI / 2; dark.position.set(x, 0.15, z); scene.add(dark);
    flashLight(x, y, z, '#ff1a2a', 9, 420);
    shockRing(x, z, '#ff2030', 7, 460, 0.6);
    shockRing(x, z, '#050505', 5, 380, 0.6);
    // Crackling lightning — jagged bolts radiating outward, alternating
    // pitch-black and hot red, with a fainter offset layer for density.
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + Math.random() * 0.4;
        lightningStreak(x, y, z, a, 2.2 + Math.random() * 1.8, i % 2 ? '#ff2030' : '#0a0a0a', 380);
    }
    for (let i = 0; i < 6; i++) {
        lightningStreak(x, y + (Math.random() - 0.5), z, Math.random() * Math.PI * 2,
            1.6 + Math.random() * 1.4, i % 2 ? '#ff5060' : '#1a1a1a', 300);
    }
    const t0 = performance.now();
    const tk = () => {
        const t = (performance.now() - t0) / 420;
        if (t >= 1) {
            scene.remove(core); scene.remove(inner); scene.remove(dark);
            core.geometry.dispose(); core.material.dispose();
            inner.geometry.dispose(); inner.material.dispose();
            dark.geometry.dispose(); dark.material.dispose();
            return;
        }
        core.scale.setScalar(1 + t * 4);
        core.material.opacity = 0.95 * (1 - t);
        inner.scale.setScalar(1 + t * 2.4);
        inner.material.opacity = 0.95 * Math.max(0, 1 - t * 1.3);
        dark.scale.setScalar(1 + t * 6);
        dark.material.opacity = 0.9 * (1 - t * 0.7);
        requestAnimationFrame(tk);
    };
    requestAnimationFrame(tk);
}

// Vertically rising halo around the player (used as windup/charge)
function risingHalo(centerObj, color, dur) {
    const g = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.07, 8, 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));
    g.rotation.x = Math.PI / 2;
    g.position.set(centerObj.x, 0.2, centerObj.z);
    scene.add(g);
    const t0 = performance.now();
    const tk = () => {
        const t = (performance.now() - t0) / dur;
        if (t >= 1) { scene.remove(g); g.geometry.dispose(); g.material.dispose(); return; }
        g.position.y = 0.2 + t * 3.0;
        g.scale.setScalar(1 - t * 0.4);
        g.material.opacity = 0.85 * (1 - t * 0.6);
        requestAnimationFrame(tk);
    };
    requestAnimationFrame(tk);
}

// ─── ICE / LIGHTNING FX ─────────────────────────────────────
// Shared by Naoya's freeze kit and the Black Flash mechanic.

// Jagged lightning bolt radiating outward from (x, y, z) toward
// `angle` (x-z plane). One cheap segmented, perpendicular-jittered
// THREE.Line that fades over `life` ms.
function lightningStreak(x, y, z, angle, length, color, life) {
    const segs = 6;
    const px = -Math.sin(angle), pz = Math.cos(angle);
    const pts = [];
    for (let i = 0; i <= segs; i++) {
        const t = i / segs, r = t * length;
        const jit = (i === 0 || i === segs) ? 0 : (Math.random() - 0.5) * length * 0.34;
        pts.push(new THREE.Vector3(
            x + Math.cos(angle) * r + px * jit,
            y + (Math.random() - 0.5) * 0.5,
            z + Math.sin(angle) * r + pz * jit));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    const t0 = performance.now();
    const tk = () => {
        const t = (performance.now() - t0) / (life || 320);
        if (t >= 1) { scene.remove(line); geo.dispose(); mat.dispose(); return; }
        mat.opacity = 0.95 * (1 - t);
        requestAnimationFrame(tk);
    };
    requestAnimationFrame(tk);
}

// Icy shard burst — pale-cyan cone spikes popping outward + a frost
// ring. Fired wherever a curse gets frozen.
function frostBurst(x, y, z) {
    for (let i = 0; i < 7; i++) {
        const a = Math.random() * Math.PI * 2;
        const m = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 5),
            new THREE.MeshBasicMaterial({ color: i % 2 ? '#bdf0ff' : '#7cd8ff',
                transparent: true, opacity: 0.95 }));
        m.position.set(x, y, z);
        m.rotation.z = Math.PI / 2; m.rotation.y = a;
        scene.add(m);
        const sp = 2 + Math.random() * 3;
        const t0 = performance.now();
        const tk = () => {
            const t = (performance.now() - t0) / 480;
            if (t >= 1) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); return; }
            m.position.set(x + Math.cos(a) * sp * t, y + 1.5 * t - 2 * t * t, z + Math.sin(a) * sp * t);
            m.material.opacity = 0.95 * (1 - t);
            requestAnimationFrame(tk);
        };
        requestAnimationFrame(tk);
    }
    shockRing(x, z, '#9be4ff', 3.2, 420, 0.4);
}

// Freeze a curse in place for `ms` — it stops chasing/attacking, its
// bob halts, and an ice shell wraps it (rendered in the curse loop).
function freezeCurse(c, ms) {
    if (!c || !c.alive) return;
    c.frozenUntil = Math.max(c.frozenUntil || 0, performance.now() + ms);
    frostBurst(c.x, 1.5, c.z);
}

// ─── SLASH VFX ──────────────────────────────────────────────
// A proper 3D katana arc — two tubes (outer color + bright white core)
// traced along a curved path that sweeps from upper-back through the
// forward space down to lower-forward. Looks like the trail left by a
// blade in mid-swing, not a glowing carpet on the ground.
// angleOffset (rad) tilts the arc around the forward axis — 0 = pure
// downward chop, +PI/4 = down-right diagonal, -PI/4 = down-left.
function spawnSlashArc(ox, oz, dx, dz, reach, color, angleOffset, life) {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        const yLocal = 2.6 - t * 2.2;
        const zLocal = -0.5 + t * (reach + 0.5);
        // Roll the (X=0, Y=yLocal) point around the forward Z axis by
        // angleOffset so the arc plane tilts for diagonal slashes.
        const ca = Math.cos(angleOffset), sa = Math.sin(angleOffset);
        const xR = -yLocal * sa;
        const yR =  yLocal * ca;
        pts.push(new THREE.Vector3(xR, yR, zLocal));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tubeGeom = new THREE.TubeGeometry(curve, 32, 0.14, 6, false);
    const tubeMat  = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const coreGeom = new THREE.TubeGeometry(curve, 32, 0.05, 6, false);
    const coreMat  = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.98 });
    const tube = new THREE.Mesh(tubeGeom, tubeMat);
    const core = new THREE.Mesh(coreGeom, coreMat);
    const grp = new THREE.Group();
    grp.add(tube); grp.add(core);
    grp.position.set(ox, 0, oz);
    grp.rotation.y = Math.atan2(dx, dz);
    scene.add(grp);
    const t0 = performance.now();
    const tk = () => {
        const t = (performance.now() - t0) / life;
        if (t >= 1) {
            scene.remove(grp);
            tubeGeom.dispose(); tubeMat.dispose();
            coreGeom.dispose(); coreMat.dispose();
            return;
        }
        tubeMat.opacity = 0.95 * (1 - t);
        coreMat.opacity = 0.98 * (1 - t);
        requestAnimationFrame(tk);
    };
    requestAnimationFrame(tk);
}

// Bright cut-line through a curse + perpendicular bursts so it reads
// as "they got sliced". Fires on every slash hit, lethal or not.
function cutCurseFx(c, slashDirX, slashDirZ, color) {
    const x = c.x, y = 1.4, z = c.z;
    const perpX = -slashDirZ, perpZ = slashDirX;
    const cutGeom = new THREE.PlaneGeometry(2.8, 0.1);
    const cutMat  = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.98, side: THREE.DoubleSide });
    const cut = new THREE.Mesh(cutGeom, cutMat);
    cut.position.set(x, y, z);
    cut.rotation.x = -Math.PI / 2;             // horizontal plane (cut through the body)
    cut.rotation.z = Math.atan2(slashDirX, slashDirZ);   // align along slash direction
    scene.add(cut);
    const t0 = performance.now();
    const tk = () => {
        const t = (performance.now() - t0) / 240;
        if (t >= 1) { scene.remove(cut); cutGeom.dispose(); cutMat.dispose(); return; }
        cutMat.opacity = 0.98 * (1 - t);
        cut.scale.x = 1 + t * 0.8;
        requestAnimationFrame(tk);
    };
    requestAnimationFrame(tk);
    burst(x + perpX * 0.7, y + 0.3, z + perpZ * 0.7, color, 8);
    burst(x - perpX * 0.7, y + 0.3, z - perpZ * 0.7, color, 8);
    burst(x, y + 0.2, z, '#ffffff', 4);
}

// Two flesh chunks fly apart with gravity — only on lethal slash hits.
function splitCurseChunks(x, z, slashDirX, slashDirZ, boss) {
    const perpX = -slashDirZ, perpZ = slashDirX;
    const sz = boss ? 0.95 : 0.55;
    for (let side = -1; side <= 1; side += 2) {
        const chunk = new THREE.Mesh(
            new THREE.IcosahedronGeometry(sz, 0),
            new THREE.MeshStandardMaterial({ color: '#7a1020', emissive: '#3a0008', roughness: 0.6, transparent: true })
        );
        chunk.position.set(x, 1.4, z);
        scene.add(chunk);
        const vx = perpX * side * 4 + (Math.random() - 0.5) * 1.5;
        const vz = perpZ * side * 4 + (Math.random() - 0.5) * 1.5;
        const vy = 3.5 + Math.random() * 2;
        const spin = (Math.random() - 0.5) * 0.4;
        const t0 = performance.now();
        const dur = 800;
        const tk = () => {
            const t = (performance.now() - t0) / dur;
            if (t >= 1) {
                scene.remove(chunk);
                chunk.geometry.dispose(); chunk.material.dispose();
                return;
            }
            const tt = t * dur / 1000;
            chunk.position.x = x + vx * tt;
            chunk.position.z = z + vz * tt;
            chunk.position.y = 1.4 + vy * tt - 9.8 * tt * tt * 0.5;
            if (chunk.position.y < 0.15) chunk.position.y = 0.15;
            chunk.rotation.x += spin;
            chunk.rotation.y += spin * 0.7;
            chunk.material.opacity = 1 - t * t;
            requestAnimationFrame(tk);
        };
        requestAnimationFrame(tk);
    }
}

// ─── CURSED TECHNIQUES ─────────────────────────────────────
// `TECHNIQUE_KITS[id]` maps an equipped technique to its 4 abilities
// (Z / X / C / R-domain). Each entry: { name, cost, cd, run(fx, fz) }.
// Gojo's Limitless is the flagship — everything else stubs to a toast.
const TECHNIQUE_KITS = {};   // populated below after the ability fns
// Per-ability cooldown timestamps (`abilityReady.<slot> = nextReadyMs`)
const abilityReady = { z: 0, x: 0, c: 0, r: 0, t: 0, v: 0 };
const ABILITY_SLOTS = ['z', 'x', 'c', 'r', 't', 'v'];

function castAbility(slot) {
    if (player.blocking) return;
    if (player.onWall) return;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    // SWORD MODE — the blade has its own moveset. Cursed techniques are
    // locked out; R becomes the air-slash; the rest just toast.
    if (save && save.equippedSword) {
        if (slot === 'r') { swordAirSlash(fx, fz); return; }
        toast('Sheath the blade (2) to use cursed techniques');
        return;
    }
    if (!save.equipped) { toast('No technique equipped — buy one from the Vendor'); return; }
    const kit = TECHNIQUE_KITS[save.equipped];
    if (!kit) { toast('Coming soon (placeholder technique)'); return; }
    const ab = kit[slot];
    if (!ab) return;
    const now = performance.now();
    if (now < abilityReady[slot]) return;       // on cooldown
    if (player.ce < ab.cost) { toast('Not enough cursed energy'); return; }
    abilityReady[slot] = now + ab.cd * 1000;
    player.ce -= ab.cost;
    ab.run(fx, fz);
    if (NET.isOnline) sendMyAction('ability', slot);
}

function refreshAbilityHud() {
    const kit = save && save.equipped ? TECHNIQUE_KITS[save.equipped] : null;
    for (const s of ABILITY_SLOTS) {
        const el = document.getElementById('ab-' + s);
        if (!el) continue;
        const ab = kit && kit[s];
        el.classList.toggle('empty', !ab);
        const lbl = el.querySelector('em');
        if (lbl) lbl.textContent = ab ? ab.name.split(' ')[0].slice(0, 4) : '';
    }
}

// Domain Expansion state — only one technique's domain at a time
let domainActive = null;       // { color, until, dmgEvery, lastDmg }
// Global speed modifiers used by domains (Naoya's Time-Slip slows
// curses to 0.25 and boosts player to 1.5; default 1).
let curseSpeedMul = 1;
let playerSpeedMul = 1;

// ═══ LIMITLESS — Gojo Satoru ════════════════════════════════
// Z = Lapse Blue (gravity well that yanks curses + implodes)
// X = Reversal Red (radial repulsion shockwave)
// C = Hollow Purple (windup → piercing beam)
// R = Domain Expansion: Unlimited Void (freeze + tick damage)
function gojoBlue(fx, fz) {
    const dist = 9;
    const tx = player.x + fx * dist;
    const tz = player.z + fz * dist;
    // Visual: orb + 3 rotating rings + bright blue light
    const grp = new THREE.Group();
    grp.position.set(tx, 1.6, tz); scene.add(grp);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 14),
        new THREE.MeshBasicMaterial({ color: '#3a4cff', transparent: true, opacity: 0.95 }));
    grp.add(core);
    const aura = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12),
        new THREE.MeshBasicMaterial({ color: '#3a4cff', transparent: true, opacity: 0.25 }));
    grp.add(aura);
    const rings = [];
    for (let i = 0; i < 3; i++) {
        const r = new THREE.Mesh(new THREE.TorusGeometry(1.0 + i * 0.25, 0.06, 8, 28),
            new THREE.MeshBasicMaterial({ color: i === 1 ? '#bcd0ff' : '#3a4cff', transparent: true, opacity: 0.85 }));
        r.rotation.x = Math.random() * Math.PI;
        r.rotation.y = Math.random() * Math.PI;
        grp.add(r);
        rings.push(r);
    }
    grp.add(new THREE.PointLight('#3a4cff', 3, 16, 2));
    flashLight(tx, 2.0, tz, '#3a4cff', 4, 320);
    camShake(0.08, 0.18); sfx('tech');

    // 1.4s suction phase — pulls curses inward and ticks damage
    const t0 = performance.now();
    const dur = 1400;
    const tk = () => {
        const t = (performance.now() - t0) / dur;
        for (const r of rings) { r.rotation.x += 0.08; r.rotation.y += 0.05; r.rotation.z += 0.03; }
        core.scale.setScalar(1 + Math.sin(t * 30) * 0.12);
        aura.material.opacity = 0.25 + Math.sin(t * 18) * 0.12;
        for (const c of curses) {
            const dx = tx - c.x, dz = tz - c.z;
            const d = Math.hypot(dx, dz); if (d > 8 || d < 0.5) continue;
            const pull = (1 - d / 8) * 8 * (1 / 60);
            c.x += (dx / d) * pull;
            c.z += (dz / d) * pull;
        }
        if (t < 1) requestAnimationFrame(tk);
        else {
            // Implosion — damage everything inside
            for (const c of curses.slice()) {
                if (Math.hypot(c.x - tx, c.z - tz) < 4.5) damageCurse(c, player.damage * 3.5);
            }
            explode(tx, 1.6, tz, '#3a4cff', 5);
            screenFlash('rgba(58,76,255,0.30)', 220);
            camShake(0.14, 0.24);
            scene.remove(grp);
            grp.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
        }
    };
    requestAnimationFrame(tk);
}

function gojoRed(fx, fz) {
    // Player palm-pulse: red expanding half-dome + multi-rings + cone damage
    const startX = player.x + fx * 1.6, startZ = player.z + fz * 1.6;
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.6, 18, 12),
        new THREE.MeshBasicMaterial({ color: '#ff2244', transparent: true, opacity: 0.85 }));
    sphere.position.set(startX, 1.6, startZ); scene.add(sphere);
    flashLight(startX, 1.6, startZ, '#ff2244', 6, 360);
    screenFlash('rgba(180,0,32,0.30)', 220);
    camShake(0.16, 0.26); sfx('boss');
    const t0 = performance.now();
    const dur = 380;
    const tk = () => {
        const t = (performance.now() - t0) / dur;
        sphere.scale.setScalar(1 + t * 12);
        sphere.material.opacity = 0.85 * (1 - t);
        if (t < 1) requestAnimationFrame(tk);
        else { scene.remove(sphere); sphere.geometry.dispose(); sphere.material.dispose(); }
    };
    requestAnimationFrame(tk);
    // Stacked rings rolling outward
    for (let k = 0; k < 3; k++) setTimeout(() => shockRing(startX, startZ, k === 1 ? '#ffffff' : '#ff2244', 10, 540, 0.7), k * 70);
    // Damage + knockback within a 10 m forward cone
    let hits = 0;
    for (const c of curses.slice()) {
        const dx = c.x - player.x, dz = c.z - player.z, d = Math.hypot(dx, dz) || 1;
        if (d > 11) continue;
        if ((dx / d) * fx + (dz / d) * fz < -0.2) continue;     // ~120° forward arc
        damageCurse(c, player.damage * 2.4);
        c.x += (dx / d) * 5.5; c.z += (dz / d) * 5.5;
        burst(c.x, 1.5, c.z, '#ff2244', 6);
        hits++;
    }
    if (hits) hitstop(0.05);
}

function gojoPurple(fx, fz) {
    // 0.55 s windup — purple inward halo on the player, then unleash
    risingHalo(player, '#a06bff', 600);
    risingHalo(player, '#3a4cff', 700);
    camShake(0.06, 0.30);
    sfx('tech');
    setTimeout(() => fireHollowPurple(fx, fz), 550);
}
function fireHollowPurple(fx, fz) {
    const length = 38;
    // Beam shaft (3 stacked cylinders for the layered look)
    const grp = new THREE.Group();
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, length, 14),
        new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95 }));
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, length, 16),
        new THREE.MeshBasicMaterial({ color: '#c08aff', transparent: true, opacity: 0.55 }));
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, length, 16),
        new THREE.MeshBasicMaterial({ color: '#6a3aa0', transparent: true, opacity: 0.25 }));
    for (const m of [core, mid, outer]) { m.rotation.z = Math.PI / 2; grp.add(m); }
    grp.position.set(player.x + fx * length / 2, 2.0, player.z + fz * length / 2);
    grp.rotation.y = Math.atan2(fx, fz) + Math.PI / 2;
    scene.add(grp);
    flashLight(player.x + fx * 2, 2, player.z + fz * 2, '#a06bff', 10, 600);
    screenFlash('rgba(180,140,255,0.55)', 380);
    camShake(0.30, 0.45);
    sfx('boss');
    // Line-trace damage along the beam
    for (const c of curses.slice()) {
        const ox = c.x - player.x, oz = c.z - player.z;
        const along = ox * fx + oz * fz;
        if (along < 0 || along > length) continue;
        const perp = Math.abs(ox * -fz + oz * fx);
        if (perp > 2.4) continue;
        damageCurse(c, player.damage * 8);
        explode(c.x, 1.6, c.z, '#a06bff', 3);
    }
    hitstop(0.08);
    // Fade the beam
    const t0 = performance.now(); const dur = 700;
    const tk = () => {
        const t = (performance.now() - t0) / dur;
        for (const m of [core, mid, outer]) m.material.opacity *= 0.94;
        if (t < 1) requestAnimationFrame(tk);
        else { scene.remove(grp); grp.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); }
    };
    requestAnimationFrame(tk);
}

function gojoDomain() {
    // Unlimited Void: huge expanding white-purple sphere centred on the
    // player, freezes curses in place for the duration, ticks damage.
    const r = 22, dur = 5000;
    const grp = new THREE.Group();
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 24),
        new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, side: THREE.BackSide }));
    const outer = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 24),
        new THREE.MeshBasicMaterial({ color: '#a06bff', transparent: true, opacity: 0.18, side: THREE.BackSide }));
    grp.add(outer); grp.add(inner);
    // Inner "information overload" particles
    const dots = [];
    for (let i = 0; i < 40; i++) {
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6),
            new THREE.MeshBasicMaterial({ color: i % 2 ? '#ffffff' : '#a06bff' }));
        const a = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
        const rad = r * 0.85 * Math.random();
        d.position.set(Math.sin(p) * Math.cos(a) * rad, Math.cos(p) * rad, Math.sin(p) * Math.sin(a) * rad);
        grp.add(d); dots.push({ m: d, v: 0.5 + Math.random() * 2.5 });
    }
    grp.position.set(player.x, 0, player.z);
    scene.add(grp);
    grp.add(new THREE.PointLight('#ffffff', 3, r, 2));

    screenFlash('rgba(255,255,255,0.55)', 500);
    camShake(0.3, 0.5);
    sfx('boss'); sfx('level');
    domainActive = { color: '#a06bff', until: performance.now() + dur, dmgEvery: 500, lastDmg: 0, mesh: grp, frozen: new Map() };

    // Freeze curse positions
    for (const c of curses) domainActive.frozen.set(c, { x: c.x, z: c.z });

    // Expand from 0.4 to r over 350 ms
    const t0 = performance.now(); const expand = 350;
    const tk = () => {
        const t = Math.min(1, (performance.now() - t0) / expand);
        const s = 0.4 / 0.4 + t * (r / 0.4 - 1);
        inner.scale.setScalar(0.4 + t * (r - 0.4));
        outer.scale.setScalar(0.4 + t * (r * 1.1 - 0.4));
        if (t < 1) requestAnimationFrame(tk);
    };
    requestAnimationFrame(tk);
}

TECHNIQUE_KITS.limitless = {
    z: { name: 'Lapse: Blue',       cost: 30, cd: 5,  run: gojoBlue },
    x: { name: 'Reversal: Red',     cost: 35, cd: 6,  run: gojoRed },
    c: { name: 'Hollow Purple',     cost: 60, cd: 12, run: gojoPurple },
    r: { name: 'Unlimited Void',    cost: 90, cd: 60, run: gojoDomain },
};

// ═══ PROJECTION SORCERY — Naoya Zenin ════════════════════════
// Speed-themed kit. Cyan + yellow palette. After-images, lightning
// crackle, rapid multi-strikes, time-slow domain.
function naoyaAfterImage(forSecs) {
    // Spawn a cyan-tinted ghost of the player model that fades out
    const g = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.7, 0.4),
        new THREE.MeshBasicMaterial({ color: '#5af0ff', transparent: true, opacity: 0.5 }));
    g.position.set(player.x, 0.85, player.z);
    g.rotation.y = playerModel.rotation.y;
    scene.add(g);
    const t0 = performance.now();
    const tk = () => {
        const t = (performance.now() - t0) / (forSecs * 1000);
        if (t >= 1) { scene.remove(g); g.geometry.dispose(); g.material.dispose(); return; }
        g.material.opacity = 0.5 * (1 - t);
        requestAnimationFrame(tk);
    };
    requestAnimationFrame(tk);
}
function naoyaSpeedLines(x, z, color, n) {
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, r0 = 1.5 + Math.random() * 1.5;
        const len = 2.0 + Math.random() * 1.8;
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, len),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
        const sx = x + Math.cos(a) * r0, sz = z + Math.sin(a) * r0;
        m.position.set(sx, 1.4 + Math.random() * 0.6, sz);
        m.rotation.y = a + Math.PI / 2;
        scene.add(m);
        const t0 = performance.now();
        const tk = () => {
            const t = (performance.now() - t0) / 320;
            if (t >= 1) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); return; }
            m.scale.z = 1 + t * 2;
            m.material.opacity = 0.9 * (1 - t);
            requestAnimationFrame(tk);
        };
        requestAnimationFrame(tk);
    }
}

function naoyaBurst(fx, fz) {
    // 1/24 Frame Burst — instant 8 m forward zip + line damage + afterimage trail
    const startX = player.x, startZ = player.z;
    const dist = 8;
    let endX = player.x + fx * dist, endZ = player.z + fz * dist;
    // Spawn after-images along the path
    for (let i = 0; i < 8; i++) {
        setTimeout(() => naoyaAfterImage(0.5), i * 30);
    }
    // Snap the player forward (AABB-aware in two steps)
    endX = pushOutObstacles(endX, endZ, 'x', player.x);
    endZ = pushOutObstacles(endX, endZ, 'z', player.z);
    endX = Math.max(-WORLD + 4, Math.min(WORLD - 4, endX));
    endZ = Math.max(-WORLD + 4, Math.min(WORLD - 4, endZ));
    player.x = endX; player.z = endZ;
    player.iframes = 0.30;
    // Damage anyone in a tight tube along the path — and freeze them
    for (const c of curses.slice()) {
        const ox = c.x - startX, oz = c.z - startZ;
        const along = ox * fx + oz * fz;
        if (along < 0 || along > dist + 1.5) continue;
        const perp = Math.abs(ox * -fz + oz * fx);
        if (perp > 1.6) continue;
        damageCurse(c, player.damage * 1.5);
        freezeCurse(c, 1400);
    }
    // Cyan streak between start and end
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, dist, 8),
        new THREE.MeshBasicMaterial({ color: '#5af0ff', transparent: true, opacity: 0.85 }));
    mid.rotation.z = Math.PI / 2;
    const grp = new THREE.Group();
    grp.add(mid);
    grp.position.set((startX + endX) / 2, 1.4, (startZ + endZ) / 2);
    grp.rotation.y = Math.atan2(fx, fz) + Math.PI / 2;
    scene.add(grp);
    const t0 = performance.now();
    const tk = () => {
        const t = (performance.now() - t0) / 360;
        if (t >= 1) { scene.remove(grp); mid.geometry.dispose(); mid.material.dispose(); return; }
        mid.material.opacity = 0.85 * (1 - t);
        requestAnimationFrame(tk);
    };
    requestAnimationFrame(tk);
    // Cyan/yellow lightning crackling off the dash path
    for (let i = 0; i < 8; i++) {
        const f = Math.random();
        const lx = startX + (endX - startX) * f;
        const lz = startZ + (endZ - startZ) * f;
        lightningStreak(lx, 1.5, lz, Math.random() * Math.PI * 2,
            1.4 + Math.random() * 1.5, i % 2 ? '#5af0ff' : '#ffe066', 300);
    }
    naoyaSpeedLines(endX, endZ, '#ffe066', 12);
    shockRing(endX, endZ, '#9be4ff', 4.5, 440, 0.45);
    flashLight(endX, 1.6, endZ, '#5af0ff', 6, 360);
    camShake(0.08, 0.18); sfx('tech');
}

function naoyaFrameLock(fx, fz) {
    // Frame Lock Step — teleport-strike on nearest curse in 15m forward
    // cone (or 6m forward if no target). Lightning crackle on landing.
    let tgt = null, best = 15;
    for (const c of curses) {
        const dx = c.x - player.x, dz = c.z - player.z, d = Math.hypot(dx, dz) || 1;
        if (d > best) continue;
        if ((dx / d) * fx + (dz / d) * fz < 0.0) continue;
        best = d; tgt = c;
    }
    naoyaAfterImage(0.5);
    let tx, tz;
    if (tgt) {
        tx = tgt.x - fx * 1.6;
        tz = tgt.z - fz * 1.6;
    } else {
        tx = player.x + fx * 6;
        tz = player.z + fz * 6;
    }
    tx = pushOutObstacles(tx, tz, 'x', player.x);
    tz = pushOutObstacles(tx, tz, 'z', player.z);
    player.x = tx; player.z = tz;
    player.iframes = 0.25;
    // Lightning bolts (6 yellow streaks) crashing down from the sky
    for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const bx = tx + Math.cos(ang) * 0.5;
        const bz = tz + Math.sin(ang) * 0.5;
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.05, 12, 6),
            new THREE.MeshBasicMaterial({ color: '#ffe066', transparent: true, opacity: 0.95 }));
        b.position.set(bx, 6.0, bz); scene.add(b);
        const t0 = performance.now();
        const tk = () => {
            const t = (performance.now() - t0) / 260;
            if (t >= 1) { scene.remove(b); b.geometry.dispose(); b.material.dispose(); return; }
            b.material.opacity = 0.95 * (1 - t);
            requestAnimationFrame(tk);
        };
        requestAnimationFrame(tk);
    }
    // Jagged ground lightning bursting out from the landing point
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
        lightningStreak(tx, 1.4, tz, a, 2.4 + Math.random() * 1.8,
            i % 2 ? '#5af0ff' : '#ffe066', 360);
    }
    flashLight(tx, 2, tz, '#ffe066', 10, 400);
    naoyaSpeedLines(tx, tz, '#5af0ff', 16);
    shockRing(tx, tz, '#5af0ff', 5, 360, 0.5);
    shockRing(tx, tz, '#ffe066', 8.5, 560, 0.4);
    camShake(0.12, 0.22);
    sfx('boss');
    // Damage: the target gets 3× + a long freeze; others within 3.5 m
    // get 1.4× and a shorter freeze.
    if (tgt) {
        damageCurse(tgt, player.damage * 3.0);
        explode(tgt.x, 1.6, tgt.z, '#ffe066', 3);
        freezeCurse(tgt, 3000);
    }
    for (const c of curses.slice()) {
        const d = Math.hypot(c.x - tx, c.z - tz);
        if (d < 3.5 && c !== tgt) { damageCurse(c, player.damage * 1.4); freezeCurse(c, 1600); }
    }
}

function naoyaBarrage(fx, fz) {
    // 24-Frame Barrage — 24 rapid strikes in 1.5 s, cone-targeted
    // curses. Every hit re-pins its target with a freeze, so the cone
    // becomes a field of frozen curses; a finale then detonates them.
    camShake(0.05, 0.30);
    sfx('tech');
    const startX = player.x, startZ = player.z;
    const struck = new Set();
    for (let i = 0; i < 24; i++) {
        setTimeout(() => {
            if (state !== 'playing') return;
            // Pick a curse in the forward cone (re-evaluate every tick)
            const candidates = [];
            for (const c of curses) {
                const dx = c.x - startX, dz = c.z - startZ, d = Math.hypot(dx, dz) || 1;
                if (d > 12) continue;
                if ((dx / d) * fx + (dz / d) * fz < 0.1) continue;
                candidates.push(c);
            }
            if (!candidates.length) {
                // No target — speed-line streak in front
                const px = player.x + fx * (3 + Math.random() * 6);
                const pz = player.z + fz * (3 + Math.random() * 6);
                naoyaSpeedLines(px, pz, i % 2 ? '#5af0ff' : '#ffe066', 3);
                return;
            }
            const tgt = candidates[Math.floor(Math.random() * candidates.length)];
            // Streak from player to target
            const dx = tgt.x - player.x, dz = tgt.z - player.z, d = Math.hypot(dx, dz) || 1;
            const len = d;
            const streak = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, len, 6),
                new THREE.MeshBasicMaterial({ color: i % 2 ? '#5af0ff' : '#ffe066', transparent: true, opacity: 0.92 }));
            const grp = new THREE.Group();
            streak.rotation.z = Math.PI / 2;
            grp.add(streak);
            grp.position.set((player.x + tgt.x) / 2, 1.5, (player.z + tgt.z) / 2);
            grp.rotation.y = Math.atan2(dx, dz) + Math.PI / 2;
            scene.add(grp);
            const t0 = performance.now();
            const tk = () => {
                const t = (performance.now() - t0) / 160;
                if (t >= 1) { scene.remove(grp); streak.geometry.dispose(); streak.material.dispose(); return; }
                streak.material.opacity = 0.92 * (1 - t);
                requestAnimationFrame(tk);
            };
            requestAnimationFrame(tk);
            if (i % 2 === 0) {
                lightningStreak(tgt.x, 1.5, tgt.z, Math.random() * Math.PI * 2,
                    1.8, i % 4 ? '#5af0ff' : '#ffe066', 260);
            }
            damageCurse(tgt, player.damage * 0.35);
            // Pin the target — refresh the freeze on every strike
            if (tgt.alive) {
                tgt.frozenUntil = Math.max(tgt.frozenUntil || 0, performance.now() + 900);
                struck.add(tgt);
            }
        }, i * 60);
    }
    // Finale — once the barrage ends, detonate every curse it pinned
    setTimeout(() => {
        if (state !== 'playing') return;
        for (const c of struck) {
            if (!c.alive) continue;
            freezeCurse(c, 2200);
            explode(c.x, 1.6, c.z, '#5af0ff', 2);
        }
    }, 24 * 60 + 90);
}

function naoyaDomain() {
    // Domain: Time-Slip — a cyan dome that FREEZES every curse inside
    // it solid (Naoya's whole kit is about stopping the enemy in time).
    // The player still blitzes at 1.5× speed.
    const r = 20, dur = 7000;
    const grp = new THREE.Group();
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 24),
        new THREE.MeshBasicMaterial({ color: '#5af0ff', transparent: true, opacity: 0.16, side: THREE.BackSide }));
    const outer = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 24),
        new THREE.MeshBasicMaterial({ color: '#ffe066', transparent: true, opacity: 0.07, side: THREE.BackSide }));
    grp.add(inner); grp.add(outer);
    // Suspended ice motes — "time fragments" frozen mid-air in the dome
    const motes = [];
    for (let i = 0; i < 26; i++) {
        const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0),
            new THREE.MeshBasicMaterial({ color: i % 2 ? '#bdf0ff' : '#ffffff', transparent: true, opacity: 0.9 }));
        const a = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
        const rad = r * 0.8 * Math.random();
        m.position.set(Math.sin(p) * Math.cos(a) * rad, Math.cos(p) * rad + 1, Math.sin(p) * Math.sin(a) * rad);
        grp.add(m); motes.push(m);
    }
    grp.position.set(player.x, 0, player.z);
    scene.add(grp);
    grp.add(new THREE.PointLight('#5af0ff', 2.8, r, 2));

    screenFlash('rgba(90,240,255,0.4)', 480);
    camShake(0.25, 0.4);
    sfx('boss');
    // Frost shockrings bloom outward on cast
    shockRing(player.x, player.z, '#9be4ff', r * 0.9, 700, 0.7);
    shockRing(player.x, player.z, '#ffffff', r * 0.6, 520, 0.5);
    playerSpeedMul = 1.5;
    domainActive = {
        color: '#5af0ff', until: performance.now() + dur,
        dmgEvery: 700, lastDmg: 0, mesh: grp,
        frozen: null,              // no snapshot lock — uses freezeRadius
        freezeRadius: r,           // every curse inside is frozen each frame
        motes,
        onCleanup: () => { playerSpeedMul = 1; },
    };

    // Expand the sphere
    const t0 = performance.now(); const expand = 350;
    const tk = () => {
        const t = Math.min(1, (performance.now() - t0) / expand);
        inner.scale.setScalar(0.4 + t * (r - 0.4));
        outer.scale.setScalar(0.4 + t * (r * 1.15 - 0.4));
        if (t < 1) requestAnimationFrame(tk);
    };
    requestAnimationFrame(tk);
}

TECHNIQUE_KITS.projection = {
    z: { name: '1/24 Burst',        cost: 25, cd: 4,  run: naoyaBurst },
    x: { name: 'Frame Lock Step',   cost: 35, cd: 6,  run: naoyaFrameLock },
    c: { name: '24-Frame Barrage',  cost: 55, cd: 11, run: naoyaBarrage },
    r: { name: 'Time-Slip',         cost: 90, cd: 60, run: naoyaDomain },
};

// ─── ITADORI (BLACK FLASH) ──────────────────────────────────
// Pure-melee bruiser. No fancy projection — every move is a fist.
// Built around the universal Black Flash mechanic: Surge guarantees a
// proc on the next M1; Shrine is Sukuna leaking through as the domain.

function itadoriDivergentFist(fx, fz) {
    // First strike — heavy straight in a 3 m forward cone, 1.8× dmg.
    // A delayed shockwave (~400 ms) detonates at the impact point for
    // 1.2× dmg in a 3.5 m radius — Yuji's signature "second hit".
    const REACH = 3.0;
    rArmSwing = 1; lungeAmount = 0.7; torsoTwist = -0.22;
    playPunchSample();
    const startX = player.x, startZ = player.z;
    for (const c of curses) {
        const dx = c.x - startX, dz = c.z - startZ;
        const d = Math.hypot(dx, dz) || 1;
        if (d > REACH) continue;
        if ((dx / d) * fx + (dz / d) * fz < 0.30) continue;
        let dmg = player.damage * 1.8;
        dmg = tryBlackFlash(c, dmg);
        damageCurse(c, dmg);
        c.x += (dx / d) * 1.2; c.z += (dz / d) * 1.2;
        burst(c.x, 1.4, c.z, '#ffe066', 10);
    }
    flashLight(startX + fx * 1.5, 1.6, startZ + fz * 1.5, '#ffe066', 6, 280);
    camShake(0.12, 0.22); sfx('hit');
    // Divergent — the second impact lands a beat later.
    setTimeout(() => {
        if (state !== 'playing') return;
        const tx = startX + fx * REACH;
        const tz = startZ + fz * REACH;
        const SR = 3.5;
        for (const c of curses.slice()) {
            const d = Math.hypot(c.x - tx, c.z - tz);
            if (d > SR) continue;
            const dmg = tryBlackFlash(c, player.damage * 1.2);
            damageCurse(c, dmg);
            burst(c.x, 1.4, c.z, '#ffffff', 6);
        }
        shockRing(tx, tz, '#ffe066', SR * 1.8, 380, 0.5);
        shockRing(tx, tz, '#ffffff', SR * 1.2, 280, 0.3);
        flashLight(tx, 1.6, tz, '#ffe066', 5, 240);
        camShake(0.08, 0.18); sfx('hit');
    }, 400);
}

function itadoriSurge(fx, fz) {
    // Guarantees the Black Flash buff: next M1 within 8 s lands ×2 base
    // (and still rolls for the chain-into-god-mode if a real BF procs
    // inside the window). No damage on cast — pure setup.
    const now = performance.now();
    player.bfWindowUntil = now + 8000;
    player.bfDoubleNext = true;
    toast('★ BLACK FLASH SURGE — next M1 ×2 (8s)');
    sfx('boss');
    screenFlash('rgba(255,224,102,0.35)', 380);
    camShake(0.10, 0.24);
    risingHalo(playerModel, '#ffe066', 600);
    burst(player.x, 1.8, player.z, '#ffe066', 18);
    shockRing(player.x, player.z, '#ffe066', 4, 480, 0.5);
}

function itadoriManjiKick(fx, fz) {
    // Leap-slam — instant 7 m forward translation with a visible arc
    // trail, then a 5 m radius AOE at the landing point for 2× dmg
    // with knockback. 0.4 s i-frames during the leap.
    const startX = player.x, startZ = player.z;
    let endX = startX + fx * 7, endZ = startZ + fz * 7;
    endX = pushOutObstacles(endX, endZ, 'x', player.x);
    endZ = pushOutObstacles(endX, endZ, 'z', player.z);
    endX = Math.max(-WORLD + 4, Math.min(WORLD - 4, endX));
    endZ = Math.max(-WORLD + 4, Math.min(WORLD - 4, endZ));
    player.x = endX; player.z = endZ;
    player.iframes = 0.4;
    rArmSwing = 1; lungeAmount = 0.9;
    // Arc trail — orange bursts following the leap path
    for (let i = 0; i < 8; i++) {
        const t = i / 7;
        const ax = startX + (endX - startX) * t;
        const az = startZ + (endZ - startZ) * t;
        const ay = 0.5 + Math.sin(t * Math.PI) * 2.6;
        setTimeout(() => burst(ax, ay, az, '#ff6a3a', 4), i * 18);
    }
    // Impact AOE
    const AOE_R = 5;
    for (const c of curses.slice()) {
        const d = Math.hypot(c.x - endX, c.z - endZ);
        if (d > AOE_R) continue;
        const dmg = tryBlackFlash(c, player.damage * 2.0);
        damageCurse(c, dmg);
        const kx = (c.x - endX) / (d || 1);
        const kz = (c.z - endZ) / (d || 1);
        c.x += kx * 2.2; c.z += kz * 2.2;
        burst(c.x, 1.4, c.z, '#ff6a3a', 8);
    }
    shockRing(endX, endZ, '#ff6a3a', AOE_R * 1.8, 540, 0.7);
    shockRing(endX, endZ, '#ffffff', AOE_R * 1.2, 380, 0.4);
    flashLight(endX, 1.6, endZ, '#ff6a3a', 8, 420);
    camShake(0.20, 0.35); sfx('hit'); playPunchSample();
}

function itadoriShrine() {
    // Sukuna leaks through — Malevolent Shrine, a red/black dome that
    // cleaves every curse inside it on the standard domain tick.
    const r = 20, dur = 6000;
    const grp = new THREE.Group();
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 24),
        new THREE.MeshBasicMaterial({ color: '#ff2030', transparent: true, opacity: 0.20, side: THREE.BackSide }));
    const outer = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 24),
        new THREE.MeshBasicMaterial({ color: '#0a0008', transparent: true, opacity: 0.12, side: THREE.BackSide }));
    grp.add(inner); grp.add(outer);
    // Floating slash fragments — cleave shrapnel suspended in the dome
    const motes = [];
    for (let i = 0; i < 32; i++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.04),
            new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? '#ffffff' : '#ff2030', transparent: true, opacity: 0.9 }));
        const a = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
        const rad = r * 0.85 * Math.random();
        m.position.set(Math.sin(p) * Math.cos(a) * rad, Math.cos(p) * rad + 1, Math.sin(p) * Math.sin(a) * rad);
        m.rotation.z = Math.random() * Math.PI;
        m.rotation.y = Math.random() * Math.PI;
        grp.add(m); motes.push(m);
    }
    grp.position.set(player.x, 0, player.z);
    scene.add(grp);
    grp.add(new THREE.PointLight('#ff2030', 3.6, r, 2));
    screenFlash('rgba(255,30,40,0.5)', 540);
    camShake(0.32, 0.45);
    sfx('boss');
    shockRing(player.x, player.z, '#ff2030', r * 0.9, 720, 0.8);
    shockRing(player.x, player.z, '#050505', r * 0.6, 540, 0.6);
    domainActive = {
        color: '#ff2030', until: performance.now() + dur,
        dmgEvery: 600, lastDmg: 0, mesh: grp,
        frozen: null,
        freezeRadius: 0,   // shrine doesn't freeze — pure cleave damage
        motes,
    };
    const t0 = performance.now(); const expand = 380;
    const tk = () => {
        const t = Math.min(1, (performance.now() - t0) / expand);
        inner.scale.setScalar(0.4 + t * (r - 0.4));
        outer.scale.setScalar(0.4 + t * (r * 1.15 - 0.4));
        if (t < 1) requestAnimationFrame(tk);
    };
    requestAnimationFrame(tk);
}

function itadoriSukunaCleave(fx, fz) {
    // Wide diagonal sword arc — 8 m forward, 2 m wide strike band.
    // Cuts every curse in the line, knockback + BF roll on each hit.
    const REACH = 8, WIDTH = 2;
    rArmSwing = 1; torsoTwist = -0.30; lungeAmount = 0.5;
    const startX = player.x, startZ = player.z;
    // Two arcs — diagonal main slash + a finer follow-up — for a
    // "twin-edge crescent" cleave feel.
    spawnSlashArc(startX, startZ, fx, fz, REACH, '#ff2030',  Math.PI / 6, 420);
    spawnSlashArc(startX, startZ, fx, fz, REACH, '#ffffff', -Math.PI / 6, 380);
    for (const c of curses.slice()) {
        if (!c.alive) continue;
        const ox = c.x - startX, oz = c.z - startZ;
        const along = ox * fx + oz * fz;
        if (along < 0 || along > REACH) continue;
        const perp = Math.abs(ox * -fz + oz * fx);
        if (perp > WIDTH) continue;
        let dmg = player.damage * 1.7;
        dmg = tryBlackFlash(c, dmg);
        const hx = c.x, hz = c.z, hb = c.boss;
        const wasAlive = c.alive;
        damageCurse(c, dmg);
        c.x += fx * 0.6; c.z += fz * 0.6;
        cutCurseFx({ x: hx, z: hz }, fx, fz, '#ff2030');
        if (wasAlive && !c.alive) splitCurseChunks(hx, hz, fx, fz, hb);
    }
    for (let i = 0; i < 6; i++) {
        const f = i / 5;
        const lx = startX + fx * REACH * f;
        const lz = startZ + fz * REACH * f;
        lightningStreak(lx, 1.5, lz, Math.random() * Math.PI * 2,
            1.6 + Math.random() * 1.4, i % 2 ? '#ff2030' : '#ffffff', 280);
    }
    flashLight(startX + fx * REACH * 0.6, 1.6, startZ + fz * REACH * 0.6, '#ff2030', 8, 360);
    camShake(0.18, 0.30); sfx('boss'); playPunchSample();
}

let devilAuraGrp = null;
function itadoriDevilTrigger(fx, fz) {
    // 5 s rage buff — ×2 damage on every source + ×1.5 speed. Visible
    // red aura wraps the player so other players can see it too.
    const dur = 5000;
    player.devilUntil = performance.now() + dur;
    player.dmgMul = 2;
    playerSpeedMul = 1.5;
    toast('☠ DEVIL TRIGGER — ×2 dmg · ×1.5 speed (5s)');
    sfx('boss');
    screenFlash('rgba(255,30,40,0.40)', 480);
    camShake(0.20, 0.35);
    risingHalo(playerModel, '#ff2030', 600);
    if (devilAuraGrp) scene.remove(devilAuraGrp);
    devilAuraGrp = new THREE.Group();
    const aura = new THREE.Mesh(
        new THREE.SphereGeometry(1.0, 16, 10),
        new THREE.MeshBasicMaterial({ color: '#ff2030', transparent: true, opacity: 0.18, side: THREE.BackSide }));
    aura.position.y = 1.2;
    devilAuraGrp.add(aura);
    devilAuraGrp.add(new THREE.PointLight('#ff2030', 4, 8, 2));
    devilAuraGrp.position.set(player.x, 0, player.z);
    scene.add(devilAuraGrp);
}

TECHNIQUE_KITS.blackFlash = {
    z: { name: 'Divergent Fist',      cost: 25, cd: 4,  run: itadoriDivergentFist },
    x: { name: 'Black Flash Surge',   cost: 35, cd: 10, run: itadoriSurge },
    c: { name: 'Manji Kick',          cost: 40, cd: 7,  run: itadoriManjiKick },
    r: { name: 'Malevolent Shrine',   cost: 90, cd: 60, run: itadoriShrine },
    t: { name: 'Sukuna Cleave',       cost: 40, cd: 8,  run: itadoriSukunaCleave },
    v: { name: 'Devil Trigger',       cost: 35, cd: 18, run: itadoriDevilTrigger },
};

// ─── SUKUNA (DISMANTLE) ─────────────────────────────────────
// Pure slashing technique — every move is a cursed-energy blade.
// Z hits many, X focuses one, C ranges, T burns, R levels everything.

function sukunaDismantle(fx, fz) {
    // Three rapid sword-arcs in a forward cone (4.5 m reach, ×1.3 dmg
    // each), tilted differently so it reads as a Dismantle volley.
    const REACH = 4.5;
    rArmSwing = 1; torsoTwist = -0.25;
    const startX = player.x, startZ = player.z;
    const tilts = [-Math.PI / 4, Math.PI / 4, 0];   // down-left, down-right, straight down
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            if (state !== 'playing') return;
            // 3D vertical arc through the air
            spawnSlashArc(startX, startZ, fx, fz, REACH, i === 1 ? '#ffffff' : '#ff2030', tilts[i], 280);
            for (const c of curses.slice()) {
                if (!c.alive) continue;
                const dx = c.x - startX, dz = c.z - startZ;
                const d = Math.hypot(dx, dz) || 1;
                if (d > REACH) continue;
                if ((dx / d) * fx + (dz / d) * fz < 0.25) continue;
                let dmg = player.damage * 1.3;
                dmg = tryBlackFlash(c, dmg);
                const wasAlive = c.alive;
                const hx = c.x, hz = c.z, hb = c.boss;
                damageCurse(c, dmg);
                cutCurseFx({ x: hx, z: hz }, fx, fz, '#ff2030');
                if (wasAlive && !c.alive) splitCurseChunks(hx, hz, fx, fz, hb);
            }
            flashLight(startX + fx * 2.4, 1.6, startZ + fz * 2.4, '#ff2030', 5, 220);
        }, i * 80);
    }
    camShake(0.14, 0.28); sfx('tech');
}

function sukunaCleave(fx, fz) {
    // Single-target focus — locks onto the nearest curse in a 9 m
    // forward cone and bisects it for ×3.5 dmg with a 3 m splash.
    let tgt = null, best = 9;
    for (const c of curses) {
        const dx = c.x - player.x, dz = c.z - player.z, d = Math.hypot(dx, dz) || 1;
        if (d > best) continue;
        if ((dx / d) * fx + (dz / d) * fz < 0.0) continue;
        best = d; tgt = c;
    }
    rArmSwing = 1; lungeAmount = 1.0; torsoTwist = -0.35;
    if (!tgt) {
        // Whiff — still slash the air so the player sees a swing happened
        spawnSlashArc(player.x, player.z, fx, fz, 6, '#ff2030', 0, 320);
        sfx('ui'); return;
    }
    // Sword arc reaches all the way to the target — one big committed chop
    const dxL = tgt.x - player.x, dzL = tgt.z - player.z;
    const lenL = Math.max(2, Math.hypot(dxL, dzL));
    spawnSlashArc(player.x, player.z, dxL / lenL, dzL / lenL, lenL + 0.3, '#ff2030', 0, 380);
    // Apply the focus damage
    const dmg = tryBlackFlash(tgt, player.damage * 3.5);
    const fhx = tgt.x, fhz = tgt.z, fhb = tgt.boss;
    const focusAlive = tgt.alive;
    damageCurse(tgt, dmg);
    cutCurseFx({ x: fhx, z: fhz }, dxL / lenL, dzL / lenL, '#ff2030');
    explode(fhx, 1.6, fhz, '#ff2030', 4);
    if (focusAlive && !tgt.alive) splitCurseChunks(fhx, fhz, dxL / lenL, dzL / lenL, fhb);
    // Splash to anyone within 3 m of the focus
    for (const c of curses.slice()) {
        if (c === tgt || !c.alive) continue;
        const d = Math.hypot(c.x - fhx, c.z - fhz);
        if (d > 3) continue;
        const sx = c.x, sz = c.z, sb = c.boss;
        const wasAlive = c.alive;
        damageCurse(c, player.damage * 1.4);
        cutCurseFx({ x: sx, z: sz }, dxL / lenL, dzL / lenL, '#ff2030');
        if (wasAlive && !c.alive) splitCurseChunks(sx, sz, dxL / lenL, dzL / lenL, sb);
    }
    camShake(0.20, 0.32); hitstop(0.05); sfx('boss');
}

function sukunaFireArrow(fx, fz) {
    // Ranged fire projectile — travels up to 30 m, explodes on first
    // curse hit OR at max distance for ×3 dmg in 4.5 m radius.
    const SPEED = 32, MAX_DIST = 30, RADIUS = 4.5;
    rArmSwing = 1;
    const startX = player.x, startZ = player.z;
    const arrow = new THREE.Group();
    const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 12, 10),
        new THREE.MeshBasicMaterial({ color: '#ffaa30', transparent: true, opacity: 0.95 }));
    const inner = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 10, 8),
        new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95 }));
    arrow.add(core); arrow.add(inner);
    arrow.add(new THREE.PointLight('#ff5a30', 4.5, 8, 2));
    arrow.position.set(startX + fx * 0.8, 1.5, startZ + fz * 0.8);
    scene.add(arrow);
    let traveled = 0;
    const t0 = performance.now();
    let last = t0;
    const tk = () => {
        const now = performance.now();
        const dt = Math.min(0.04, (now - last) / 1000);
        last = now;
        const step = SPEED * dt;
        arrow.position.x += fx * step;
        arrow.position.z += fz * step;
        traveled += step;
        // Trail spark
        if (Math.random() < 0.6) burst(arrow.position.x, arrow.position.y, arrow.position.z, '#ff8a30', 2);
        let hit = false;
        for (const c of curses) {
            if (!c.alive) continue;
            if (Math.hypot(c.x - arrow.position.x, c.z - arrow.position.z) < 1.2) { hit = true; break; }
        }
        if (hit || traveled >= MAX_DIST) {
            const ix = arrow.position.x, iz = arrow.position.z;
            scene.remove(arrow);
            core.geometry.dispose(); core.material.dispose();
            inner.geometry.dispose(); inner.material.dispose();
            for (const c of curses.slice()) {
                if (Math.hypot(c.x - ix, c.z - iz) > RADIUS) continue;
                const dmg = tryBlackFlash(c, player.damage * 3.0);
                damageCurse(c, dmg);
                burst(c.x, 1.4, c.z, '#ff5a30', 10);
            }
            explode(ix, 1.4, iz, '#ff5a30', 4);
            shockRing(ix, iz, '#ffaa30', RADIUS * 1.6, 540, 0.6);
            camShake(0.18, 0.32);
            return;
        }
        requestAnimationFrame(tk);
    };
    requestAnimationFrame(tk);
    sfx('tech');
}

function sukunaWorldCut(fx, fz) {
    // R — World Cutting Slash. 360° red crescent ring expands out to
    // 16 m, hitting everything for ×3.5 dmg + knockback away from
    // player. Sukuna's no-domain ultimate.
    const R = 16;
    rArmSwing = 1; lArmSwing = 1; lungeAmount = 0.8;
    screenFlash('rgba(255,30,40,0.45)', 480);
    camShake(0.32, 0.45);
    sfx('boss');
    for (const c of curses.slice()) {
        const dx = c.x - player.x, dz = c.z - player.z;
        const d = Math.hypot(dx, dz);
        if (d > R) continue;
        let dmg = player.damage * 3.5;
        dmg = tryBlackFlash(c, dmg);
        damageCurse(c, dmg);
        // Knockback away from player
        const nx = (dx / (d || 1)), nz = (dz / (d || 1));
        c.x += nx * 4.5; c.z += nz * 4.5;
        burst(c.x, 1.4, c.z, '#ff2030', 12);
    }
    // Two expanding crescent rings + a white inner flash
    shockRing(player.x, player.z, '#ff2030', R * 1.05, 760, 0.9);
    shockRing(player.x, player.z, '#ffffff', R * 0.7,  560, 0.6);
    shockRing(player.x, player.z, '#0a0008', R * 0.45, 380, 0.5);
    flashLight(player.x, 1.8, player.z, '#ff2030', 12, 580);
    // Radial lightning streaks around the player
    for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + Math.random() * 0.2;
        lightningStreak(player.x, 1.6, player.z, a, 5 + Math.random() * 3, i % 2 ? '#ff2030' : '#ffffff', 540);
    }
    hitstop(0.10);
}

function sukunaFurnace(fx, fz) {
    // T — Furnace. Pillar of fire at player's position. 6 m radius,
    // ticks ×1.5 dmg every 300 ms for 2.4 s. Player takes no damage.
    const R = 6, dur = 2400, tickEvery = 300;
    const cx = player.x, cz = player.z;
    rArmSwing = 1;
    // Big pillar mesh — cylinder of swirling orange flame
    const grp = new THREE.Group();
    const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(R, R * 0.7, 8, 22, 1, true),
        new THREE.MeshBasicMaterial({ color: '#ff6a20', transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
    pillar.position.y = 4;
    grp.add(pillar);
    const inner = new THREE.Mesh(
        new THREE.CylinderGeometry(R * 0.5, R * 0.3, 7, 18, 1, true),
        new THREE.MeshBasicMaterial({ color: '#ffaa30', transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    inner.position.y = 3.5;
    grp.add(inner);
    const ringMesh = new THREE.Mesh(
        new THREE.RingGeometry(R * 0.95, R * 1.05, 32),
        new THREE.MeshBasicMaterial({ color: '#ff2020', transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.05;
    grp.add(ringMesh);
    grp.add(new THREE.PointLight('#ff5020', 5, R * 2.5, 2));
    grp.position.set(cx, 0, cz);
    scene.add(grp);
    sfx('boss');
    camShake(0.18, 0.30);
    shockRing(cx, cz, '#ff5020', R * 1.3, 540, 0.6);
    const start = performance.now();
    let lastTick = start;
    const tk = () => {
        const now = performance.now();
        const t = (now - start) / dur;
        if (t >= 1) {
            scene.remove(grp);
            grp.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
            return;
        }
        // Pillar churn
        pillar.rotation.y += 0.06;
        inner.rotation.y -= 0.10;
        pillar.material.opacity = 0.45 * (1 - t * 0.4);
        inner.material.opacity  = 0.55 * (1 - t * 0.4);
        ringMesh.material.opacity = 0.85 * (1 - t * 0.6);
        // Damage tick
        if (now - lastTick > tickEvery) {
            lastTick = now;
            for (const c of curses.slice()) {
                if (Math.hypot(c.x - cx, c.z - cz) > R) continue;
                damageCurse(c, player.damage * 1.5);
                burst(c.x, 1.4, c.z, '#ff6a20', 4);
            }
        }
        requestAnimationFrame(tk);
    };
    requestAnimationFrame(tk);
}

function sukunaBindingVow(fx, fz) {
    // V — Binding Vow. The next M1 within 6 s hits for ×3 base + a
    // guaranteed Black Flash proc (sets bfDoubleNext via the surge
    // path) + a small radial detonation on the target.
    const now = performance.now();
    player.bfWindowUntil = now + 6000;
    player.bfDoubleNext = true;
    toast('☩ BINDING VOW — next M1 ×3 + ★ BF (6s)');
    sfx('boss');
    screenFlash('rgba(255,30,40,0.30)', 380);
    camShake(0.12, 0.24);
    risingHalo(playerModel, '#ff2030', 600);
    burst(player.x, 1.8, player.z, '#ff2030', 18);
    shockRing(player.x, player.z, '#ff2030', 4, 480, 0.5);
}

TECHNIQUE_KITS.dismantle = {
    z: { name: 'Dismantle',           cost: 25, cd: 4,  run: sukunaDismantle },
    x: { name: 'Cleave',              cost: 40, cd: 6,  run: sukunaCleave },
    c: { name: 'Fire Arrow',          cost: 50, cd: 9,  run: sukunaFireArrow },
    r: { name: 'World Cutting Slash', cost: 80, cd: 45, run: sukunaWorldCut },
    t: { name: 'Furnace',             cost: 50, cd: 12, run: sukunaFurnace },
    v: { name: 'Binding Vow',         cost: 30, cd: 15, run: sukunaBindingVow },
};

// Tick the active domain in update() — keeps curses frozen + ticks dmg.
function updateDomain(dt) {
    if (!domainActive) return;
    const now = performance.now();
    if (now > domainActive.until) {
        // Cleanup
        if (domainActive.onCleanup) domainActive.onCleanup();
        scene.remove(domainActive.mesh);
        domainActive.mesh.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
        domainActive = null;
        return;
    }
    // Lock curses (only if this domain uses a freeze map — Gojo's does)
    if (domainActive.frozen) {
        for (const [c, pos] of domainActive.frozen) {
            if (!c.alive) { domainActive.frozen.delete(c); continue; }
            c.x = pos.x; c.z = pos.z;
        }
    }
    // Naoya's domain freezes every curse inside its radius. Refreshed
    // each frame so curses that wander in are caught too.
    if (domainActive.freezeRadius) {
        for (const c of curses) {
            if (Math.hypot(c.x - player.x, c.z - player.z) < domainActive.freezeRadius) {
                c.frozenUntil = Math.max(c.frozenUntil || 0, now + 280);
            }
        }
    }
    // Spin the suspended ice motes (Naoya's Time-Slip)
    if (domainActive.motes) {
        for (const m of domainActive.motes) m.rotation.y += dt * 0.5;
    }
    // Domain follows the player
    domainActive.mesh.position.set(player.x, 0, player.z);
    // Tick damage
    if (now - domainActive.lastDmg > domainActive.dmgEvery) {
        domainActive.lastDmg = now;
        for (const c of curses.slice()) {
            const d = Math.hypot(c.x - player.x, c.z - player.z);
            if (d < 22) {
                damageCurse(c, player.damage * 1.5);
                burst(c.x, 1.6, c.z, domainActive.color, 4);
            }
        }
    }
}

// ─── COMBAT ─────────────────────────────────────────────────
// 3-hit combo: lead jab → rear cross → committed heavy straight.
// Punches 1 & 2 are quick straight-arm extensions from the guard. The
// 3rd is a Ryu-style heavy: full body weight thrown forward, arm fully
// extended, slight overextension at the elbow, much more reach + dmg.
const COMBO = [
    { hand: 'L', reach: 2.8, dmgMul: 0.55, knock: 0.0, heavy: false },  // jab
    { hand: 'R', reach: 2.9, dmgMul: 0.60, knock: 0.0, heavy: false },  // cross
    { hand: 'R', reach: 3.8, dmgMul: 1.50, knock: 1.8, heavy: true  },  // HEAVY 3rd
];
const COMBO_HIT_CD = 270;        // ms between hits — slowed so each punch lingers visibly
const COMBO_RESET_MS = 700;      // chain resets if you pause longer than this
const COMBO_DOWNTIME_MS = 1500;  // Kaizen-style forced breathing room after the heavy 3rd
let lastM1 = 0;
let comboIdx = 0;
function meleeStrike() {
    if (player.onWall) return;                        // both hands hold the wall
    if (player.y > 0.2) { doAirSlam(); return; }       // airborne M1 = ground-pound
    const now = performance.now();
    if (now < player.comboLockUntil) return;  // post-heavy downtime
    if (now - lastM1 < COMBO_HIT_CD) return;
    if (now - lastM1 > COMBO_RESET_MS) comboIdx = 0;
    const hit = COMBO[comboIdx];
    lastM1 = now;
    comboIdx = (comboIdx + 1) % COMBO.length;
    if (hit.heavy) player.comboLockUntil = now + COMBO_DOWNTIME_MS;
    if (NET.isOnline) sendMyAction('m1');

    // Arm extension on the punching hand + body torque the opposite way
    if (hit.hand === 'L') { lArmSwing = 1; torsoTwist =  0.18; }
    else                  { rArmSwing = 1; torsoTwist = -0.18; }
    // Body weight forward on every punch — small commit on jab/cross,
    // full commit on the heavy. Reads as "punch with the whole body".
    lungeAmount = hit.heavy ? 1.0 : 0.4;
    if (hit.heavy) torsoTwist *= 2.2;
    playPunchSample();

    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    // Spend the post-Black-Flash 2× buff on the *next* M1 only
    const bfBuffActive = !!player.bfDoubleNext;
    if (bfBuffActive) player.bfDoubleNext = false;
    for (const c of curses) {
        const dx = c.x - player.x, dz = c.z - player.z;
        const d = Math.hypot(dx, dz);
        if (d > hit.reach) continue;
        if ((dx / d) * fx + (dz / d) * fz < 0.25) continue;
        let dmg = player.damage * hit.dmgMul * (admin.oneShot ? 9999 : 1);
        if (bfBuffActive) dmg *= BF.buffMul;            // 2× from prior Black Flash
        dmg = tryBlackFlash(c, dmg);                    // 10% per hit
        damageCurse(c, dmg);
        if (hit.knock) { c.x += (dx / d) * hit.knock; c.z += (dz / d) * hit.knock; }
    }
    // M1 feedback is the punch sample + the curse's white hit-flash +
    // knockback — no spark particles (removed at the user's request).
}

// ─── AIR SLAM (ground-pound) ────────────────────────────────
// An M1 in the air rockets the player straight down. Curses in front
// get spiked into the floor; landing detonates a ground-pound shock.
function slamCurse(c, ms) {
    if (!c || !c.alive) return;
    c.slamUntil = Math.max(c.slamUntil || 0, performance.now() + ms);
    burst(c.x, 0.4, c.z, '#7a6a4a', 10);
    shockRing(c.x, c.z, '#caa86a', 2.8, 340, 0.4);
}
function doAirSlam() {
    if (player.airSlamUsed) return;                 // one slam per jump
    player.airSlamUsed = true;
    player.slamming = true;
    player.vy = -24;                                // rocket straight down
    player.airVx *= 0.25; player.airVz *= 0.25;     // kill most forward drift
    rArmSwing = 1; torsoTwist = -0.3; lungeAmount = 1.0;
    playPunchSample();
    sfx('boss');
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    let hitAny = false;
    for (const c of curses.slice()) {
        const dx = c.x - player.x, dz = c.z - player.z;
        const d = Math.hypot(dx, dz);
        if (d > 4.5) continue;
        if (d > 0.6 && (dx / d) * fx + (dz / d) * fz < -0.35) continue;  // skip behind
        let dmg = player.damage * 1.8 * (admin.oneShot ? 9999 : 1);
        dmg = tryBlackFlash(c, dmg);
        damageCurse(c, dmg);
        slamCurse(c, 1500);
        hitAny = true;
    }
    if (hitAny) { camShake(0.1, 0.18); hitstop(0.04); }
}
function airSlamImpact() {
    // Fired when a slam dive hits the ground — the ground-pound shock.
    const x = player.x, z = player.z;
    shockRing(x, z, '#caa86a', 9, 540, 0.8);
    shockRing(x, z, '#ffffff', 5, 360, 0.4);
    burst(x, 0.3, z, '#7a6a4a', 24);
    camShake(0.18, 0.3);
    hitstop(0.05);
    sfx('boss');
    for (const c of curses.slice()) {
        if (Math.hypot(c.x - x, c.z - z) > 7) continue;
        damageCurse(c, player.damage * 1.2);
        slamCurse(c, 1100);
    }
}
// ═══ (cursed techniques removed) — was: TECHNIQUES dispatcher + Sukuna/Todo/Megumi kits + technique-only VFX helpers + updateProjectiles ═══

function damageCurse(c, dmg) {
    if (!c.alive) return;
    // Apply any global damage multiplier (Devil Trigger etc) before
    // shipping the value either locally or upstream to the host.
    dmg *= (player.dmgMul || 1);
    // Visual hit-flash runs everywhere (snappy local feedback).
    c.mesh.userData.bodyMat.emissive.set('#ffffff');
    setTimeout(() => { if (c.mesh) c.mesh.userData.bodyMat.emissive.set('#0a0010'); }, 70);
    // CLIENT: forward damage to the host; the host will reflect the new
    // HP back to us via curseState (and broadcast curseDeath if it dies).
    if (NET.isOnline && !NET.isHost) {
        clientSendCurseDmg(c.id, dmg);
        return;
    }
    // HOST or single-player: apply damage authoritatively.
    c.hp -= dmg;
    if (c.hp <= 0) {
        applyCurseDeath(c, NET.playerIndex);
        if (NET.isHost) hostBroadcastCurseDeath(c.id, NET.playerIndex);
    }
}

// Local death effects + rewards. `killerIdx` is the player who scored
// the kill — only that player banks XP / gold / quest progress.
function applyCurseDeath(c, killerIdx) {
    if (!c.alive) return;
    c.alive = false;
    scene.remove(c.mesh);
    const idx = curses.indexOf(c);
    if (idx >= 0) curses.splice(idx, 1);
    burst(c.x, 1.4, c.z, c.boss ? '#ff3a3a' : '#aa1840', c.boss ? 40 : 16);
    sfx('death');
    if (killerIdx !== NET.playerIndex) return;     // rewards only for the killer
    let shardDrop = 0;
    if (c.boss) shardDrop = 5;
    else if (Math.random() < 0.67) shardDrop = 1;
    if (shardDrop > 0) {
        save.shards = (save.shards || 0) + shardDrop;
        burst(c.x, 1.6, c.z, '#a06bff', 6);
    }
    if (c.boss) onBossKilled();
    else {
        gainXp(c.xp);
        save.gold += c.gold;
        questProgress();
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
    refreshMissionHud();
    persist();
}

function questProgress() {
    for (const id of Object.keys(save.quests)) {
        const q = save.quests[id], def = QUESTS[id];
        if (!def || q.state !== 'active') continue;
        q.progress = Math.min(def.target, q.progress + 1);
        if (q.progress >= def.target) completeQuest(id);
    }
    refreshMissionHud();
}

function completeQuest(id) {
    const q = save.quests[id], def = QUESTS[id];
    q.completedCount = (q.completedCount || 0) + 1;
    if (def.reward && def.reward.xp) gainXp(def.reward.xp);
    if (def.reward && def.reward.gold) save.gold += def.reward.gold;
    q.state = 'available';
    q.progress = 0;
    toast('Mission complete: ' + def.title + ' (×' + q.completedCount + ')');
    refreshMissionHud();
    persist();
}

function onBossKilled() {
    // Exam quest is gone — boss kills just yield their bounty in damageCurse.
    return;
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
        player.hp = player.maxHp;
        sfx('level');
        toast('LEVEL UP — Lv.' + save.level);
        // Auto grade-up every 20 levels: G4→G3 at 20, G2 at 40, G1 at
        // 60, Special Grade at 80. No more exam quest — the grind IS
        // the test.
        const newGrade = Math.max(0, 4 - Math.floor(save.level / 20));
        if (newGrade < save.grade) {
            save.grade = newGrade;
            sfx('level');
            setTimeout(() => {
                if (save.grade === 0) toast('SPECIAL GRADE — the pinnacle, sorcerer.');
                else toast('PROMOTED — ' + GRADE_NAME[save.grade] + '!');
            }, 600);
        }
        persist();
    }
}

function damagePlayer(dmg) {
    if (state !== 'playing' || player.iframes > 0) return;
    if (admin.god) return;          // admin god-mode toggle
    if (player.tempGodUntil && performance.now() < player.tempGodUntil) return; // BF chain proc
    // Block reduces incoming damage 70%
    if (player.blocking) dmg *= 0.30;
    player.hp -= dmg;
    player.iframes = 0.4;
    sfx('hurt');
    document.body.style.boxShadow = 'inset 0 0 120px rgba(200,0,40,0.5)';
    setTimeout(() => { document.body.style.boxShadow = ''; }, 140);
    if (player.hp <= 0) {
        // Respawn at town — gentle MVP penalty (no loss), curses cleared
        player.hp = player.maxHp;
        player.stamina = player.maxStamina;
        player.blocking = false;
        player.onWall = false; player.slamming = false; player.airSlamUsed = false;
        player.y = 0; player.vy = 0; player.airVx = 0; player.airVz = 0;
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

// Open a single quest-giver's panel — shows just that giver's quest
// with Accept / Retake / In-progress state + reward + completion count.
function openQuestGiver(npc) {
    const id = npc.userData._questId;
    const def = QUESTS[id];
    const q = qstate(id);
    const done = q.completedCount || 0;
    const tag = done > 0 ? ` <span style="color:#3adf8a">· ✓×${done}</span>` : '';
    let act;
    if (q.state === 'active') {
        act = `<span style="color:#ffcf66">In progress (${q.progress}/${def.target})</span>`;
    } else {
        act = `<button class="btn act" data-accept="${id}">${done > 0 ? 'Retake mission' : 'Accept mission'}</button>`;
    }
    const reward = def.reward
        ? `<p style="margin-top:0.8rem;color:#ffe066">Reward: ${def.reward.xp} XP · ${def.reward.gold} gold</p>`
        : '';
    showOverlay(`<h2>${npc.userData.label}</h2>
        <p style="color:#cbb6ff">Lv.${def.minLevel}+ mission · Repeatable</p>
        <div class="row"><span><b>${def.title}</b>${tag}<br><small style="color:#7a8a9a">${def.desc}</small></span>${act}</div>
        ${reward}
        <button class="btn sec act" data-close="1">Close</button>`);
}

function openContact() {
    const g = save.grade;
    let body;
    if (g === 0) {
        body = '<p style="color:#3adf8a">Special Grade. There is no higher rank, sorcerer.</p>';
    } else {
        // Grade-ups are automatic every 20 levels. Show the player where
        // they are on that staircase.
        const next = GRADE_NAME[g - 1];
        const needLevel = (4 - g + 1) * 20;     // 20 → G3, 40 → G2, etc.
        const toGo = needLevel - save.level;
        body = `<p>Next promotion: <b>${next}</b> at <b>Lv.${needLevel}</b>.</p>
                <p style="color:#ffcf66">${toGo} level${toGo === 1 ? '' : 's'} to go (you: Lv.${save.level}).</p>
                <p style="color:#7a8a9a">No exam. Grind curses, level up, the rank follows.</p>`;
    }
    showOverlay(`<h2>Jujutsu High Contact</h2><p>Grade: <b>${GRADE_NAME[g]}</b></p>${body}
        <button class="btn sec act" data-close="1">Close</button>`);
}

function openSmith() {
    showOverlay(`<h2>Cursed Tool Smith</h2>
        <p>Gold: <b style="color:#ffe066">${save.gold}</b></p>
        <div class="row"><span>Whetstone — +6 base damage (permanent)</span>
            <button class="btn sec act" data-buy="dmg">120 g</button></div>
        <p style="margin-top:0.8rem">More cursed tools coming in updates.</p>
        <button class="btn sec act" data-close="1">Close</button>`);
}

// Cursed-technique catalogue. `ready: true` entries are fully wired in
// the ability dispatcher (TECHNIQUE_KITS); others are placeholders that
// can be bought + equipped but their hotkeys just toast a stub.
const TECHNIQUE_CATALOG = [
    { id: 'limitless',   name: 'Limitless (Gojo)',           desc: 'Blue (gravity well), Red (repulsion blast), Hollow Purple (piercing beam), Domain: Unlimited Void.', icon: '◌', gold: 6000, shards: 80, ready: true },
    { id: 'dismantle',   name: 'Dismantle (Sukuna)',         desc: 'Dismantle volley · Cleave focus-strike · Fire Arrow · World Cutting Slash · Furnace · Binding Vow.', icon: '⌁', gold: 4500, shards: 60, ready: true },
    { id: 'tenShadows',  name: 'Ten Shadows (Megumi)',       desc: 'Summon shikigami — Divine Dogs, Nue, Mahoraga.',                   icon: '▲', gold: 5200, shards: 70 },
    { id: 'blackFlash',  name: 'Black Flash (Itadori)',      desc: 'Divergent Fist · Black Flash Surge · Manji Kick · Domain: Malevolent Shrine.', icon: '⚡', gold: 3800, shards: 50, ready: true },
    { id: 'copy',        name: 'Copy (Yuta)',                desc: 'Mimics any technique you\'ve seen.',                               icon: '☯', gold: 7000, shards: 90 },
    { id: 'strawDoll',   name: 'Straw Doll (Nobara)',        desc: 'Hammer + nail combo. Resonance through hits.',                     icon: '⨂', gold: 3000, shards: 40 },
    { id: 'cursedSpeech',name: 'Cursed Speech (Inumaki)',    desc: 'Commands curses to do as told. CE-intensive.',                     icon: '◐', gold: 4200, shards: 55 },
    { id: 'boogieWoogie',name: 'Boogie Woogie (Todo)',       desc: 'Clap to swap positions with allies or enemies.',                   icon: '✦', gold: 3500, shards: 45 },
    { id: 'projection',  name: 'Projection (Naoya)',         desc: '1/24 Burst zip · Frame Lock teleport-strike · 24-Frame Barrage · Domain: Time-Slip.', icon: '➤', gold: 4800, shards: 65, ready: true },
    { id: 'bloodManip',  name: 'Blood Manipulation (Choso)', desc: 'Convert blood into ranged piercing attacks.',                      icon: '✿', gold: 3300, shards: 42 },
];

function openTechniqueShop() {
    const goldUI   = `<span style="color:#ffe066">${save.gold} g</span>`;
    const shardsUI = `<span style="color:#a06bff">${save.shards || 0} shards</span>`;
    const rows = TECHNIQUE_CATALOG.map(t => {
        const owned = save.ownedTechniques.includes(t.id);
        const equipped = save.equipped === t.id;
        const canAfford = save.gold >= t.gold && (save.shards || 0) >= t.shards;
        let btn;
        if (equipped)      btn = `<button class="btn sec act" data-shop-equip="${t.id}" style="border-color:#3aff8a;color:#3aff8a">Equipped</button>`;
        else if (owned)    btn = `<button class="btn sec act" data-shop-equip="${t.id}">Equip</button>`;
        else if (canAfford) btn = `<button class="btn sec act" data-shop-buy="${t.id}">Buy</button>`;
        else                btn = `<button class="btn sec act" disabled style="opacity:0.4;cursor:not-allowed">Buy</button>`;
        const flagReady = t.ready ? '<span style="color:#3aff8a;font-size:0.7rem">  · LIVE</span>' : '<span style="color:#7a8a9a;font-size:0.7rem">  · placeholder</span>';
        return `<div class="shop-row">
            <span class="shop-icon">${t.icon}</span>
            <span class="shop-body">
                <b>${t.name}</b>${flagReady}<br>
                <small style="color:#7a8a9a">${t.desc}</small>
            </span>
            <span class="shop-cost">
                <span style="color:#ffe066">${t.gold} g</span><br>
                <span style="color:#a06bff">${t.shards} shards</span>
            </span>
            ${btn}
        </div>`;
    }).join('');
    showOverlay(`<h2>Cursed Technique Vendor</h2>
        <p>${goldUI} &nbsp;·&nbsp; ${shardsUI}</p>
        <p style="margin:0.4rem 0 0.8rem;color:#7a8a9a">Buy a technique once, equip it any time. Only one technique active at a time. <b style="color:#3aff8a">Limitless</b> and <b style="color:#3aff8a">Projection</b> are live — the rest are placeholders.</p>
        <div class="shop-list">${rows}</div>
        <button class="btn sec act" data-close="1" style="margin-top:1rem">Close</button>`);
}

function buyTechnique(id) {
    const t = TECHNIQUE_CATALOG.find(x => x.id === id);
    if (!t) return;
    if (save.ownedTechniques.includes(id)) return;
    if (save.gold < t.gold || (save.shards || 0) < t.shards) { toast('Not enough'); return; }
    save.gold -= t.gold;
    save.shards = (save.shards || 0) - t.shards;
    save.ownedTechniques.push(id);
    if (!save.equipped) save.equipped = id;
    toast(`Acquired: ${t.name}`);
    sfx('level');
    persist();
    openTechniqueShop();
}
function equipTechnique(id) {
    if (!save.ownedTechniques.includes(id)) return;
    save.equipped = id;
    const t = TECHNIQUE_CATALOG.find(x => x.id === id);
    toast(`Equipped: ${t ? t.name : id}`);
    sfx('ui');
    persist();
    refreshAbilityHud();
    openTechniqueShop();
}

function openPause() {
    showOverlay(`<h2>Paused</h2>
        <p>${save.name} — ${GRADE_NAME[save.grade]} · Lv.${save.level}</p>
        <button class="btn act" data-resume="1">Resume</button><br>
        <button class="btn sec act" data-quit="1">Save &amp; Quit to Sign-in</button>`);
}

document.getElementById('overlay').addEventListener('click', (e) => {
    const t = e.target;
    if (!t.dataset) return;
    if (t.dataset.shopBuy)   { sfx('ui'); buyTechnique(t.dataset.shopBuy); return; }
    if (t.dataset.shopEquip) { equipTechnique(t.dataset.shopEquip); return; }
    if (t.dataset.swordBuy)    { sfx('ui'); buySword(t.dataset.swordBuy); return; }
    if (t.dataset.invToggle)   { toggleInvSlot(t.dataset.invToggle);      return; }
    if (!t.dataset.close && !t.dataset.resume && !t.dataset.accept &&
        !t.dataset.quit && !t.dataset.buy) return;
    sfx('ui');
    if (t.dataset.close || t.dataset.resume) { hideOverlay(); if (state === 'paused') resume(); }
    else if (t.dataset.accept) { acceptQuest(t.dataset.accept); hideOverlay(); }
    else if (t.dataset.quit) { persist(); hideOverlay(); toSignin(); }
    else if (t.dataset.buy) {
        if (t.dataset.buy === 'dmg' && save.gold >= 120) { save.gold -= 120; save.flags.dmgBonus = (save.flags.dmgBonus || 0) + 6; }
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

// ─── MULTIPLAYER ────────────────────────────────────────────
// Sync scope: movement + visible attacks. Curses, HP, quests are
// LOCAL per player — combat is each-instance authoritative.
const REMOTE_COLORS = ['#3adf8a', '#a06bff', '#ff5a8a', '#ffe066', '#3a8aff', '#ff6a3a'];
const remoteModels = {};      // idx → { model, targetX, targetZ, targetY, targetYaw, color }
let mpLastPosSend = 0;
let pendingMpSave = null;
let mpDebugOn = false;
let mpDebugAccum = 0;

function mpSetStatus(msg)    { const el = document.getElementById('mp-status');      if (el) el.textContent = msg; }
function mpSetJoinStatus(m)  { const el = document.getElementById('mp-join-status'); if (el) el.textContent = m; }

function mpRenderLobby(players) {
    const el = document.getElementById('mp-players');
    if (!el) return;
    el.innerHTML = 'Players: ' + players.map(p =>
        `<span class="slot">${p.name}${p.id === 'host' ? ' (host)' : ''}</span>`
    ).join(' · ');
}

async function openMpScreen() {
    audioInit(); sfx('ui');
    const v = readSigninFields(); if (!v) return;
    let s = await adapter.load(v.name);
    if (s) {
        if (s.pwHash && s.pwHash !== hashPw(v.pw)) { signinError('Incorrect password'); return; }
    } else {
        // No account yet — auto-create one for multiplayer convenience.
        s = newSave(v.name);
        s.pwHash = hashPw(v.pw);
        await adapter.save(s);
    }
    pendingMpSave = s;
    document.getElementById('mp-name').textContent = `Signed in: ${v.name}`;
    document.getElementById('signin-screen').classList.remove('active');
    document.getElementById('mp-screen').classList.add('active');
    document.getElementById('mp-host-block').style.display = '';
    document.getElementById('mp-host-active').style.display = 'none';
    document.getElementById('mp-join-block').style.display = 'none';
    document.getElementById('mp-error').textContent = '';
}

function mpBackToSignin() {
    sfx('ui'); cleanupNet();
    document.getElementById('mp-screen').classList.remove('active');
    document.getElementById('signin-screen').classList.add('active');
    pendingMpSave = null;
}

function mpDoCreate() {
    sfx('ui');
    const name = pendingMpSave ? pendingMpSave.name : 'Sorcerer';
    const code = createRoom(name, mpSetStatus, mpRenderLobby);
    document.getElementById('mp-host-block').style.display = 'none';
    document.getElementById('mp-host-active').style.display = '';
    document.getElementById('mp-code').textContent = code;
    mpSetStatus('Setting up room...');
    mpRenderLobby([{ id: 'host', name, ready: true }]);
}

function mpShowJoin() {
    sfx('ui');
    document.getElementById('mp-host-block').style.display = 'none';
    document.getElementById('mp-join-block').style.display = '';
    mpSetJoinStatus('');
}

function mpHideJoin() {
    sfx('ui');
    document.getElementById('mp-join-block').style.display = 'none';
    document.getElementById('mp-host-block').style.display = '';
}

function mpDoJoin() {
    sfx('ui');
    const codeIn = document.getElementById('mp-code-input');
    const code = (codeIn.value || '').trim().toUpperCase();
    if (code.length !== 4) { mpSetJoinStatus('Enter a 4-letter code'); return; }
    const name = pendingMpSave ? pendingMpSave.name : 'Sorcerer';
    joinRoom(code, name, mpSetJoinStatus, mpRenderLobby);
    // Swap to the active-server view so they see the code + Enter World btn
    document.getElementById('mp-join-block').style.display = 'none';
    document.getElementById('mp-host-block').style.display = 'none';
    document.getElementById('mp-host-active').style.display = '';
    document.getElementById('mp-code').textContent = code;
    mpSetStatus('Joining...');
}

function mpCancelActive() {
    sfx('ui'); cleanupNet();
    document.getElementById('mp-host-active').style.display = 'none';
    document.getElementById('mp-host-block').style.display = '';
}

function mpEnterWorld() {
    sfx('ui');
    if (!pendingMpSave) return;
    wireCurseHooks();
    document.getElementById('mp-screen').classList.remove('active');
    startGame(pendingMpSave);
    const chip = document.getElementById('mp-chip');
    chip.style.display = 'block';
    chip.textContent = `ROOM ${NET.roomCode} · P${NET.playerIndex + 1}`;
    pendingMpSave = null;
}

// Wire net.js hooks for curse sync. Called once when entering MP world.
function wireCurseHooks() {
    // CLIENT — apply a single spawn broadcast from the host.
    NET.onCurseSpawn = (data) => {
        if (curses.find(c => c.id === data.id)) return;   // dedupe
        const mesh = buildCurseMesh(!!data.boss);
        mesh.position.set(data.x, terrainHeight(data.x, data.z), data.z);
        scene.add(mesh);
        curses.push({
            id: data.id, mesh, x: data.x, z: data.z, boss: !!data.boss,
            hp: data.hp, maxHp: data.maxHp, dmg: 0,
            speed: 0, lastHit: 0, bob: Math.random() * 6, alive: true,
            frozenUntil: 0, iceShell: null, slamUntil: 0,
            targetX: data.x, targetZ: data.z,
            xp: 0, gold: 0,
        });
    };
    // CLIENT — apply a 10Hz state tick from the host.
    NET.onCurseState = (list) => {
        const now = performance.now();
        const seen = new Set();
        for (const s of list) {
            seen.add(s.id);
            const c = curses.find(cc => cc.id === s.id);
            if (!c) continue;       // spawn message will create it
            c.targetX = s.x; c.targetZ = s.z;
            c.hp = s.hp;
            c.frozenUntil = s.frozen ? now + 200 : 0;
            c.slamUntil   = s.slam   ? now + 200 : 0;
        }
        // Any local curse not in the tick has died/despawned — clean it.
        for (const c of curses.slice()) {
            if (!seen.has(c.id)) {
                scene.remove(c.mesh);
                const idx = curses.indexOf(c);
                if (idx >= 0) curses.splice(idx, 1);
            }
        }
    };
    // CLIENT — death event from host (rewards already attributed by host).
    NET.onCurseDeath = (id, killerIdx) => {
        const c = curses.find(cc => cc.id === id);
        if (!c) return;
        applyCurseDeath(c, killerIdx);
    };
    // CLIENT — snapshot of the full live curse list, sent on join.
    NET.onCurseSnapshotApply = (list) => {
        // Drop any local stale curses first.
        for (const c of curses.slice()) { scene.remove(c.mesh); }
        curses.length = 0;
        for (const s of list) NET.onCurseSpawn(s);
    };
    // HOST — build snapshot for a newly-connected client.
    NET.onCurseSnapshotBuild = () => curses.map(c => ({
        id: c.id, x: c.x, z: c.z, boss: c.boss, hp: c.hp, maxHp: c.maxHp,
    }));
    // HOST — apply incoming damage event from a client.
    NET.onCurseDmg = (id, amount, fromIdx) => {
        const c = curses.find(cc => cc.id === id);
        if (!c || !c.alive) return;
        c.hp -= amount;
        if (c.hp <= 0) {
            applyCurseDeath(c, fromIdx);
            hostBroadcastCurseDeath(c.id, fromIdx);
        }
    };
    // ANY — somebody fired an admin power on me.
    NET.onAdminCmd = (kind, payload, fromIdx) => applyAdminCmd(kind, payload, fromIdx);
}

function ensureRemoteModel(idx, name) {
    if (remoteModels[idx]) return remoteModels[idx];
    const color = REMOTE_COLORS[idx % REMOTE_COLORS.length];
    const model = buildHumanoid({ coat: color, accent: '#ffffff' });
    scene.add(model);
    // Name tag — canvas-texture sprite floating above the head
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = color; ctx.font = 'bold 38px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((name || 'Player').slice(0, 14), 128, 32);
    const tex = new THREE.CanvasTexture(cv);
    const lbl = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    lbl.scale.set(2.4, 0.6, 1);
    lbl.position.y = 2.4;
    model.add(lbl);
    // Bright aura light so remote players are visible even at distance.
    model.add(new THREE.PointLight(color, 3.2, 8, 2));
    // Ground halo so you can spot a remote player at any angle.
    const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 0.9, 24),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.02;
    model.add(halo);
    // Sword mesh attached to right wrist — hidden unless the network
    // says this remote player has a sword equipped.
    const sword = buildBasicSword(1);
    sword.rotation.x = Math.PI;
    sword.position.set(0, -0.06, 0);
    sword.visible = false;
    model.userData.rWrist.add(sword);
    model.userData.sword = sword;

    const rec = {
        model, color,
        targetX: 0, targetZ: 0, targetY: 0, targetYaw: 0,
        prevX: 0, prevZ: 0, moveSpeed: 0,
        rArmExt: 0, lArmExt: 0,
        actionFxUntil: 0,
        nameTag: lbl,
        sword,                                   // direct handle for visibility toggle
    };
    remoteModels[idx] = rec;
    return rec;
}

function disposeRemoteModel(idx) {
    const rec = remoteModels[idx]; if (!rec) return;
    scene.remove(rec.model);
    rec.model.traverse(o => {
        if (o.isSprite) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); return; }
        if (o.isMesh) { o.geometry.dispose(); if (o.material) o.material.dispose(); }
    });
    delete remoteModels[idx];
}

function mpTick(dt) {
    if (!NET.isOnline) return;
    const now = performance.now();
    // Broadcast my position at ~30Hz
    if (now - mpLastPosSend > 33) {
        mpLastPosSend = now;
        sendMyPos(player.x, player.z, player.y, yaw, player.scale || 1, !!player.flying, save && save.equippedSword ? save.equippedSword : null);
    }
    // Host: broadcast the live curse list at ~10Hz so clients can lerp.
    if (NET.isHost) {
        curseStateAccum += dt;
        if (curseStateAccum > 0.1) {
            curseStateAccum = 0;
            const list = curses.map(c => ({
                id: c.id, x: c.x, z: c.z, hp: c.hp,
                frozen: (c.frozenUntil || 0) > now ? 1 : 0,
                slam:   (c.slamUntil   || 0) > now ? 1 : 0,
            }));
            hostBroadcastCurseState(list);
        }
    }
    // Reap models for players that left
    for (const idxStr of Object.keys(remoteModels)) {
        if (!(idxStr in NET.remotePlayers)) disposeRemoteModel(+idxStr);
    }
    // Update / lerp / replay actions for each remote player
    const k = 1 - Math.exp(-dt * 18);   // ~55 ms time constant
    for (const idxStr of Object.keys(NET.remotePlayers)) {
        const idx = +idxStr;
        const rp = NET.remotePlayers[idx];
        const rec = ensureRemoteModel(idx, rp.name);
        rec.targetX = rp.x; rec.targetZ = rp.z; rec.targetY = rp.y; rec.targetYaw = rp.yaw;
        const m = rec.model;
        m.position.x += (rec.targetX - m.position.x) * k;
        m.position.z += (rec.targetZ - m.position.z) * k;
        m.position.y += (rec.targetY - m.position.y) * k;
        let dyaw = rec.targetYaw - m.rotation.y;
        while (dyaw >  Math.PI) dyaw -= Math.PI * 2;
        while (dyaw < -Math.PI) dyaw += Math.PI * 2;
        m.rotation.y += dyaw * k;
        const sc = rp.scale || 1;
        if (m.scale.x !== sc) m.scale.setScalar(sc);
        // Mirror the equipped-sword visibility from the network state
        if (rec.sword) rec.sword.visible = !!rp.swrd;
        // Motion detection — derived from how much the model just moved
        // this frame (smoothed). Drives the walk anim toggle.
        const dxm = m.position.x - rec.prevX;
        const dzm = m.position.z - rec.prevZ;
        const speed = Math.hypot(dxm, dzm) / Math.max(dt, 0.0001);
        rec.moveSpeed += (speed - rec.moveSpeed) * 0.35;
        rec.prevX = m.position.x; rec.prevZ = m.position.z;
        animateRemoteRig(rec, dt, !!rp.swrd);
        while (rp.pendingActions.length) playRemoteAction(rec, rp.pendingActions.shift());
    }
    // Debug overlay — refresh ~5 Hz
    mpDebugAccum += dt;
    if (mpDebugOn && mpDebugAccum > 0.2) {
        mpDebugAccum = 0;
        renderMpDebug();
    }
}

function renderMpDebug() {
    const el = document.getElementById('mp-debug');
    if (!el) return;
    const s = getNetStats();
    let txt = `[NET] ${s.role.toUpperCase()}  code:${s.code || '----'}  me:P${s.myIdx + 1}\n`;
    txt += `conns:${s.openConns}/${s.conns}  tx pos:${s.txPos} act:${s.txAct}  rx pos:${s.rxPos} act:${s.rxAct}\n`;
    txt += `last tx ${s.msSinceLastTx}ms  last rx ${s.msSinceLastRx}ms\n`;
    txt += `--- remote players ---\n`;
    const keys = Object.keys(s.remote);
    if (!keys.length) txt += '(none)\n';
    for (const k of keys) {
        const r = s.remote[k];
        txt += `P${(+k) + 1} ${r.name.padEnd(10)} (${r.x},${r.z})  ${r.sinceMs}ms ago\n`;
    }
    txt += `--- world ---\n`;
    txt += `curses local:${curses.length}\n`;
    el.textContent = txt;
}

function playRemoteAction(rec, act) {
    if (act.kind === 'm1') {
        // Alternate L/R per strike so successive punches read as a combo.
        if (rec._lastM1Hand === 'R') { rec.lArmExt = 1; rec._lastM1Hand = 'L'; }
        else                         { rec.rArmExt = 1; rec._lastM1Hand = 'R'; }
        const fx = -Math.sin(rec.model.rotation.y);
        const fz = -Math.cos(rec.model.rotation.y);
        burst(rec.model.position.x + fx * 1.5, 1.4, rec.model.position.z + fz * 1.5, '#ffffff', 6);
    } else if (act.kind === 'ability') {
        // Both arms extend for the cast frame; long-enough that the
        // big VFX has time to read as "they did something dramatic".
        rec.lArmExt = 1; rec.rArmExt = 1;
        rec.actionFxUntil = performance.now() + 240;
        burst(rec.model.position.x, 2.0, rec.model.position.z, rec.color, 14);
        shockRing(rec.model.position.x, rec.model.position.z, rec.color, 3, 380, 0.45);
        flashLight(rec.model.position.x, 1.8, rec.model.position.z, rec.color, 4, 280);
    }
}

// Per-frame skeleton animation for a remote player rig — walk stride +
// arm swing when moving, gentle idle bob when stationary, with the
// decaying punch extension layered on top.
function animateRemoteRig(rec, dt, hasSword = false) {
    const ud = rec.model.userData;
    const moving = rec.moveSpeed > 0.6;          // m/s threshold
    const tNow = performance.now();
    const tw = tNow * 0.009;
    const sw = moving ? Math.sin(tw * 1.6) : 0;
    const stride = moving ? Math.abs(Math.sin(tw * 3.2)) * 0.04 : 0;
    const idleT = tNow * 0.0014;
    const sway   = !moving ? Math.sin(idleT)       : 0;
    const breath = !moving ? Math.sin(idleT * 1.6) : 0;
    const bounce = !moving ? Math.sin(idleT * 2.7) : 0;

    // Pelvis bob
    ud.pelvisPivot.position.y = (1.06 * ud.S) + stride + (!moving ? bounce * 0.015 : 0);

    // Legs
    if (moving) {
        ud.lHip.rotation.x =  sw * 0.65;
        ud.rHip.rotation.x = -sw * 0.65;
        ud.lKnee.rotation.x = Math.max(0, -sw) * 0.75;
        ud.rKnee.rotation.x = Math.max(0,  sw) * 0.75;
        ud.lHip.rotation.z = 0; ud.rHip.rotation.z = 0;
        ud.pelvisPivot.rotation.z = 0;
        ud.lowerTorsoPivot.rotation.z = 0;
        ud.upperTorsoPivot.rotation.x = 0;
        ud.upperTorsoPivot.rotation.z = 0;
        ud.headPivot.rotation.x = 0;
        ud.headPivot.rotation.z = 0;
    } else {
        ud.lHip.rotation.x = -0.22 + sway * 0.04;
        ud.rHip.rotation.x =  0.08;
        ud.lHip.rotation.z = -0.10;
        ud.rHip.rotation.z =  0.04;
        ud.lKnee.rotation.x = 0.32 - sway * 0.05;
        ud.rKnee.rotation.x = 0.10;
        ud.pelvisPivot.rotation.z = 0.06 + sway * 0.02;
        ud.lowerTorsoPivot.rotation.z = -0.04;
        ud.upperTorsoPivot.rotation.x = 0.05 + breath * 0.025;
        ud.upperTorsoPivot.rotation.z = -0.02 + sway * 0.015;
        ud.headPivot.rotation.x = -0.13;
        ud.headPivot.rotation.z =  0.10 + sway * 0.05;
    }

    // Arm base pose — walk-swing when moving (opposite arm to lead leg)
    // or "lazy guard" otherwise. Two-handed sword grip overrides both
    // when the player has a blade equipped. Punch extension is layered
    // on top via lerp toward the fully-extended pose, weighted by
    // lArmExt/rArmExt.
    let lShX, lShZ, lShY = 0, lEbX;
    let rShX, rShZ, rShY = 0, rEbX;
    if (hasSword) {
        // Same constants as the local two-handed grip — both hands
        // forward on the hilt, blade up-and-out over the right shoulder.
        lShX = -1.05; lShZ =  0.36; lEbX = -1.40;
        rShX = -1.20; rShZ = -0.20; rEbX = -1.30;
    } else if (moving) {
        // Counter-swing the arms against the legs
        lShX = -sw * 0.55; lShZ =  0.18; lEbX = -0.55;
        rShX =  sw * 0.55; rShZ = -0.18; rEbX = -0.55;
    } else {
        lShX = -0.60 + breath * 0.04; lShZ =  0.30; lEbX = -1.55;
        rShX = -0.18;                  rShZ = -0.60; rEbX = -1.85;
    }
    // Fully-extended punch pose (matches the local rig's straight punch)
    const E_SHX = -1.52, E_EBX = 0.0;
    const E_LSHZ =  0.04, E_RSHZ = -0.04;
    // Decay extensions
    rec.lArmExt = Math.max(0, rec.lArmExt - dt * 4.5);
    rec.rArmExt = Math.max(0, rec.rArmExt - dt * 4.5);
    const le = rec.lArmExt, re = rec.rArmExt;

    ud.lShoulder.rotation.x = lShX * (1 - le) + E_SHX  * le;
    ud.lShoulder.rotation.z = lShZ * (1 - le) + E_LSHZ * le;
    ud.lShoulder.rotation.y = lShY;
    ud.lElbow.rotation.x    = lEbX * (1 - le) + E_EBX  * le;

    ud.rShoulder.rotation.x = rShX * (1 - re) + E_SHX  * re;
    ud.rShoulder.rotation.z = rShZ * (1 - re) + E_RSHZ * re;
    ud.rShoulder.rotation.y = rShY;
    ud.rElbow.rotation.x    = rEbX * (1 - re) + E_EBX  * re;

    // Fist "pow" scale on full extension — same as local player
    ud.lWrist.scale.setScalar(1 + le * 0.6);
    ud.rWrist.scale.setScalar(1 + re * 0.6);
}

function mpDisposeAll() {
    for (const idxStr of Object.keys(remoteModels)) disposeRemoteModel(+idxStr);
    cleanupNet();
    const chip = document.getElementById('mp-chip'); if (chip) chip.style.display = 'none';
}

// ─── ANIMATION HELPERS ──────────────────────────────────────
// Per-hand punch extension (0 = guard, 1 = arm fully extended) +
// signed torso torque (left punch twists the body one way, right
// punch the other) + lungeAmount for the heavy 3rd punch (body
// throws weight forward, chest pitches in, arm overextends). All
// decay each frame in update().
let lArmSwing = 0, rArmSwing = 0;
let torsoTwist = 0;
let lungeAmount = 0;

// ─── GAME FLOW ──────────────────────────────────────────────
function startGame(loaded) {
    save = loaded;
    if (save.shards == null) save.shards = 0;            // backfill
    if (!Array.isArray(save.ownedTechniques)) save.ownedTechniques = [];
    if (save.equipped === undefined) save.equipped = null;
    if (!Array.isArray(save.ownedSwords)) save.ownedSwords = [];
    if (save.equippedSword === undefined) save.equippedSword = null;
    document.getElementById('signin-screen').classList.remove('active');
    document.getElementById('hud').style.display = 'block';
    player = {
        x: TOWN.x, z: TOWN.z + 6, y: 0, vy: 0, airVx: 0, airVz: 0,
        iframes: 0, hp: undefined, stamina: undefined, ce: undefined,
        blocking: false, comboLockUntil: 0,
        bfDoubleNext: false, bfWindowUntil: 0, tempGodUntil: 0,
        onWall: false, wallNX: 0, wallNZ: 0, airSlamUsed: false, slamming: false,
        scale: 1, flying: false,
        dmgMul: 1, devilUntil: 0,
    };
    deriveStats();
    player.damage += (save.flags.dmgBonus || 0);
    player.hp = player.maxHp;
    player.stamina = player.maxStamina;
    player.ce = player.maxCe;
    refreshMissionHud();
    refreshAdminButton();
    refreshAbilityHud();
    refreshSwordModel();
    state = 'playing';
    toast('Welcome, ' + save.name + ' — ' + GRADE_NAME[save.grade]);
}

function toSignin() {
    state = 'signin';
    document.getElementById('hud').style.display = 'none';
    document.getElementById('admin-btn').style.display = 'none';
    document.getElementById('signin-screen').classList.add('active');
    for (const c of curses.slice()) scene.remove(c.mesh);
    curses.length = 0;
    mpDisposeAll();
    refreshSlots();
}

function resume() { state = 'playing'; }

function refreshMissionHud() {
    let txt = 'Visit a quest giver in the city.';
    // Show the highest-tier active exorcism quest (most relevant)
    const active = [];
    for (const id of Object.keys(QUESTS)) {
        const q = save.quests[id], def = QUESTS[id];
        if (!def || !q || q.state !== 'active') continue;
        active.push({ id, q, def });
    }
    if (active.length) {
        active.sort((a, b) => (b.def.minLevel || 0) - (a.def.minLevel || 0));
        const a = active[0];
        const extra = active.length > 1 ? ` (+${active.length - 1} more)` : '';
        txt = `${a.def.title} ${a.q.progress}/${a.def.target}${extra}`;
    } else if (save.grade === 0) {
        txt = 'Special Grade — the pinnacle.';
    } else {
        const need = (4 - save.grade + 1) * 20;
        txt = `Grade up at Lv.${need} (you: Lv.${save.level}).`;
    }
    document.getElementById('mission-text').textContent = txt;
}

// ─── INPUT ──────────────────────────────────────────────────
function initInput() {
    addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'Escape' && state === 'playing') { state = 'paused'; openPause(); }
        else if (e.code === 'KeyE' && state === 'playing') tryInteract();
        else if (e.code === 'KeyQ' && state === 'playing') doDash();
        else if (e.code === 'KeyG' && state === 'playing') doGrab();
        else if (e.code === 'Space' && state === 'playing') doJump();
        else if (e.code === 'KeyZ' && state === 'playing') castAbility('z');
        else if (e.code === 'KeyX' && state === 'playing') castAbility('x');
        else if (e.code === 'KeyC' && state === 'playing') castAbility('c');
        else if (e.code === 'KeyR' && state === 'playing') castAbility('r');
        else if (e.code === 'KeyT' && state === 'playing') castAbility('t');
        else if (e.code === 'KeyV' && state === 'playing') castAbility('v');
        else if (e.code === 'Digit1' && state === 'playing' && !adminOpen) openInventory();
        else if (e.code === 'Digit2' && state === 'playing' && !adminOpen) quickUnequipSword();
        else if (e.code === 'F4') { mpDebugOn = !mpDebugOn; const el = document.getElementById('mp-debug'); if (el) el.style.display = mpDebugOn ? 'block' : 'none'; }
    });
    addEventListener('keyup', (e) => { keys[e.code] = false; });
    const cv = document.getElementById('game-canvas');
    cv.addEventListener('click', () => { audioInit(); if (state === 'playing') cv.requestPointerLock(); });
    cv.addEventListener('mousedown', (e) => {
        if (e.button === 0 && state === 'playing' && pointerLocked && !player.blocking) meleeStrike();
    });
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

// Movement: low forward-leap jump (Kaizen-style hop). Vertical is
// minimal (peak ~0.7 m, airtime ~0.55 s) but the leap springs you
// forward ~6-8 m before friction kicks in.
const GRAVITY = 25;
const JUMP_VY = 5.5;          // low arc
const JUMP_FORWARD = 16;      // m/s forward burst on jump
const LEAP_DECAY = 1.8;       // /s — how fast the forward burst bleeds off
const CLIMB_SPEED = 3.6;      // m/s — wall-climb rate
function doJump() {
    if (player.flying) return;          // Space is fly-up, not jump
    if (player.onWall) {
        // Leap off the wall — away along the wall normal + upward
        player.onWall = false;
        player.vy = JUMP_VY * 1.15;
        player.airVx = player.wallNX * JUMP_FORWARD * 0.95;
        player.airVz = player.wallNZ * JUMP_FORWARD * 0.95;
        sfx('ui');
        return;
    }
    if (player.y > 0.01) return;        // only from ground
    if (player.blocking) return;
    player.vy = JUMP_VY;
    player.y = 0.05;                    // nudge above ground so gravity engages
    // Spring forward in the look direction
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    player.airVx = fx * JUMP_FORWARD;
    player.airVz = fz * JUMP_FORWARD;
}

let lastDash = 0;
const DASH_CD = 1500;
const DASH_STAMINA = 20;
function doDash() {
    const now = performance.now();
    if (now - lastDash < DASH_CD) return;
    if (player.stamina < DASH_STAMINA) { toast('Out of stamina'); return; }
    if (player.blocking) return;
    if (player.onWall) return;
    lastDash = now;
    player.stamina -= DASH_STAMINA;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    // Step the dash in two halves so AABB push-out still applies
    let nx = player.x + fx * 5, nz = player.z + fz * 5;
    nx = pushOutObstacles(nx, nz, 'x', player.x);
    nz = pushOutObstacles(nx, nz, 'z', player.z);
    nx = Math.max(-WORLD + 4, Math.min(WORLD - 4, nx));
    nz = Math.max(-WORLD + 4, Math.min(WORLD - 4, nz));
    player.x = nx; player.z = nz;
    player.iframes = 0.45;
}

// G — forward grab/lunge: 3m reach, 25 stamina, 3s cooldown,
// deals 1.4× base melee damage with strong knockback. Plays punch.m4a.
let lastGrab = 0;
const GRAB_CD = 3000;
const GRAB_STAMINA = 25;
const GRAB_REACH = 3.0;
function doGrab() {
    if (save && save.equippedSword) { toast('Sheath the blade (2) to grab'); return; }
    const now = performance.now();
    if (now - lastGrab < GRAB_CD) return;
    if (player.stamina < GRAB_STAMINA) { toast('Out of stamina'); return; }
    if (player.blocking) return;
    if (player.onWall) return;
    lastGrab = now;
    player.stamina -= GRAB_STAMINA;
    // Trigger right-arm extension animation + a small lunge body commit
    rArmSwing = 1;
    torsoTwist = -0.25;
    lungeAmount = 0.7;
    playPunchSample();
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    let hitAny = false;
    for (const c of curses) {
        const dx = c.x - player.x, dz = c.z - player.z;
        const d = Math.hypot(dx, dz);
        if (d > GRAB_REACH) continue;
        if ((dx / d) * fx + (dz / d) * fz < 0.25) continue;
        damageCurse(c, player.damage * 1.4);
        // Strong knockback
        c.x += (dx / d) * 3.0; c.z += (dz / d) * 3.0;
        burst(c.x, 1.4, c.z, '#aa5cff', 12);
        hitAny = true;
    }
    if (!hitAny) burst(player.x + fx * 1.6, 1.4, player.z + fz * 1.6, '#aa5cff', 6);
}

let nearInteract = null;
function tryInteract() {
    if (!nearInteract) return;
    if (nearInteract === smith) { openSmith(); return; }
    if (nearInteract === contact) { openContact(); return; }
    if (nearInteract === vendor) { openTechniqueShop(); return; }
    if (swordVendors.includes(nearInteract)) { openSwordShop(nearInteract); return; }
    // Quest giver: check level gate, then open this giver's single-quest panel
    const ud = nearInteract.userData;
    if (ud._questId) {
        const minLv = ud._minLevel || 1;
        if (save.level < minLv) {
            toast(`Need Lv.${minLv} to take this mission`);
            sfx('ui');
            return;
        }
        openQuestGiver(nearInteract);
    }
}

// ─── COLLISION ──────────────────────────────────────────────
// True if (x, z) lies inside (or within `pad` of) any obstacle.
function inAnyObstacle(x, z, pad = 0.5) {
    for (const o of obstacles) {
        if (x > o.minX - pad && x < o.maxX + pad &&
            z > o.minZ - pad && z < o.maxZ + pad) return true;
    }
    return false;
}

// Resolve AABB obstacle collisions one axis at a time. `axis` = 'x'
// or 'z'; `prev` is the player's pre-move coordinate on that axis,
// used to decide which side to push back to.
function pushOutObstacles(nx, nz, axis, prev) {
    const padX = 0.4, padZ = 0.4;  // player radius
    for (const o of obstacles) {
        if (nx + padX <= o.minX || nx - padX >= o.maxX) continue;
        if (nz + padZ <= o.minZ || nz - padZ >= o.maxZ) continue;
        // Overlap — push out on the axis we're resolving. If `prev`
        // was already inside the box on this axis (slight embed from
        // a wall-cling, corner glitch, etc.) the old code always shoved
        // the player to maxX/maxZ, teleporting them across the building.
        // Pick the NEARER face instead.
        if (axis === 'x') {
            if (prev > o.minX && prev < o.maxX) {
                nx = (prev - o.minX <= o.maxX - prev) ? o.minX - padX : o.maxX + padX;
            } else {
                nx = (prev <= o.minX) ? o.minX - padX : o.maxX + padX;
            }
        } else {
            if (prev > o.minZ && prev < o.maxZ) {
                nz = (prev - o.minZ <= o.maxZ - prev) ? o.minZ - padZ : o.maxZ + padZ;
            } else {
                nz = (prev <= o.minZ) ? o.minZ - padZ : o.maxZ + padZ;
            }
        }
    }
    return axis === 'x' ? nx : nz;
}

// If the player is flush against a climbable wall face, return its
// outward normal {nx, nz}; else null. Only big obstacles count as
// "walls" (a face longer than 6 m) — so buildings + perimeter walls
// are climbable, but cars / vending machines / dummies are not.
function wallContact(x, z) {
    const pad = 0.4, eps = 0.55;
    for (const o of obstacles) {
        if ((o.maxX - o.minX) <= 6 && (o.maxZ - o.minZ) <= 6) continue;
        const spanZ = z > o.minZ - 0.6 && z < o.maxZ + 0.6;
        const spanX = x > o.minX - 0.6 && x < o.maxX + 0.6;
        if (spanZ) {
            if (x <= o.minX && x > o.minX - pad - eps) return { nx: -1, nz: 0, snapX: o.minX - pad };
            if (x >= o.maxX && x < o.maxX + pad + eps) return { nx:  1, nz: 0, snapX: o.maxX + pad };
        }
        if (spanX) {
            if (z <= o.minZ && z > o.minZ - pad - eps) return { nx: 0, nz: -1, snapZ: o.minZ - pad };
            if (z >= o.maxZ && z < o.maxZ + pad + eps) return { nx: 0, nz:  1, snapZ: o.maxZ + pad };
        }
    }
    return null;
}

// ─── UPDATE ─────────────────────────────────────────────────
function update(dt) {
    if (state !== 'playing') return;

    // Global hitstop — pause sim updates while active so big abilities
    // land with weight (camera + VFX still tick because they use their
    // own per-effect rAF loops).
    if (performance.now() < hitstopUntil) return;

    player.iframes = Math.max(0, player.iframes - dt);

    // Block — hold F. Drains 30 stamina/s while held. Auto-drops when
    // empty. Can't M1, dash, grab, or move while blocking.
    const wantBlock = !!keys['KeyF'];
    if (wantBlock && player.stamina > 0 && !player.onWall) {
        player.blocking = true;
        if (!admin.infStam) player.stamina = Math.max(0, player.stamina - dt * 30);
    } else {
        player.blocking = false;
    }
    // Stamina regen when not blocking (faster when standing still)
    if (!player.blocking && !admin.infStam) {
        const regen = 18;       // /s
        player.stamina = Math.min(player.maxStamina, player.stamina + dt * regen);
    }
    if (admin.infStam) player.stamina = player.maxStamina;
    // Cursed energy regen (constant)
    player.ce = Math.min(player.maxCe, player.ce + dt * 7);
    if (admin.infStam) player.ce = player.maxCe;  // inf-stam toggle also gives inf CE
    // Black Flash buff window expiry — if no second hit landed in time,
    // the chain breaks and the next-M1 buff is consumed.
    if (player.bfWindowUntil && performance.now() > player.bfWindowUntil) {
        player.bfWindowUntil = 0;
        player.bfDoubleNext = false;
    }
    // Devil Trigger — buff expiry + aura follow
    if (player.devilUntil && performance.now() > player.devilUntil) {
        player.devilUntil = 0;
        player.dmgMul = 1;
        playerSpeedMul = 1;
        if (devilAuraGrp) {
            scene.remove(devilAuraGrp);
            devilAuraGrp.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
            devilAuraGrp = null;
        }
    }
    if (devilAuraGrp) devilAuraGrp.position.set(player.x, 0, player.z);
    // Active Domain Expansion tick
    updateDomain(dt);
    // Curse rain — spawn ~4 curses/sec for the duration
    if (admin.rain > 0) {
        admin.rain -= dt;
        admin._rainAcc = (admin._rainAcc || 0) + dt;
        while (admin._rainAcc > 0.25) { admin._rainAcc -= 0.25; spawnCurse(false); }
    }

    // Movement relative to camera yaw (locked while blocking)
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    let mx = 0, mz = 0;
    // While clinging to a wall, WASD does NOT drive ground movement —
    // W/S are reserved for climbing (handled below). This stops the
    // player drifting off the wall every time they press a key.
    if (!player.blocking && !player.onWall) {
        if (keys['KeyW']) { mx += fx; mz += fz; }
        if (keys['KeyS']) { mx -= fx; mz -= fz; }
        if (keys['KeyA']) { mx -= rx; mz -= rz; }
        if (keys['KeyD']) { mx += rx; mz += rz; }
    }
    const moving = mx || mz;
    if (moving) {
        const l = Math.hypot(mx, mz); mx /= l; mz /= l;
        // Air-control is normally reduced, but full speed while flying
        // (since flight is supposed to be free movement).
        const airMul = (player.y > 0 && !player.flying) ? 0.45 : 1.0;
        const sprintK = (keys['ShiftLeft'] || keys['ShiftRight']) && !player.flying ? 1.7 : 1;
        const sp = player.speed * playerSpeedMul * airMul * sprintK * dt;
        let nx = player.x + mx * sp, nz = player.z + mz * sp;
        if (!admin.noclip) {
            nx = pushOutObstacles(nx, nz, 'x', player.x);
            nz = pushOutObstacles(nx, nz, 'z', player.z);
        }
        nx = Math.max(-WORLD + 4, Math.min(WORLD - 4, nx));
        nz = Math.max(-WORLD + 4, Math.min(WORLD - 4, nz));
        player.x = nx; player.z = nz;
    }

    // Gravity + vertical integration. Forward leap velocity is applied
    // each frame and decays so the player covers distance, not height.
    if (player.flying) {
        // Flight mode — no gravity, Space=up, Shift=down. WASD already
        // moved us horizontally above.
        const FLY_SPEED = 9;
        if (keys['Space']) player.y += FLY_SPEED * dt;
        if (keys['ShiftLeft'] || keys['ShiftRight']) player.y -= FLY_SPEED * dt;
        if (player.y < 0.05) player.y = 0.05;
        player.vy = 0; player.airVx = 0; player.airVz = 0;
        player.onWall = false;
    } else if (player.onWall) {
        // Clinging to a wall — W climbs up, S climbs down. You stay
        // attached until you choose to jump off (Space, via doJump);
        // climbing down to the ground does NOT release you.
        // No gravity while held.
        if (keys['KeyW']) player.y += CLIMB_SPEED * dt;
        if (keys['KeyS']) player.y -= CLIMB_SPEED * dt;
        if (player.y < 0) player.y = 0;     // can't climb below the ground
        player.vy = 0; player.airVx = 0; player.airVz = 0;
    } else if (player.y > 0 || player.vy > 0) {
        player.vy -= GRAVITY * dt;
        player.y += player.vy * dt;
        if (player.airVx || player.airVz) {
            let nx = player.x + player.airVx * dt;
            let nz = player.z + player.airVz * dt;
            if (!admin.noclip) {
                nx = pushOutObstacles(nx, nz, 'x', player.x);
                nz = pushOutObstacles(nx, nz, 'z', player.z);
            }
            nx = Math.max(-WORLD + 4, Math.min(WORLD - 4, nx));
            nz = Math.max(-WORLD + 4, Math.min(WORLD - 4, nz));
            player.x = nx; player.z = nz;
            const decay = Math.max(0, 1 - dt * LEAP_DECAY);
            player.airVx *= decay; player.airVz *= decay;
        }
        if (player.y <= 0) {
            player.y = 0; player.vy = 0;
            player.airVx = 0; player.airVz = 0;
            player.airSlamUsed = false;
            if (player.slamming) { player.slamming = false; airSlamImpact(); }
        } else if (!admin.noclip && player.y > 0.1 && !player.slamming) {
            // Jumped into a wall? Grab on.
            const wc = wallContact(player.x, player.z);
            if (wc) {
                const into = player.airVx * (-wc.nx) + player.airVz * (-wc.nz);
                if (into > 1.0) {
                    player.onWall = true;
                    player.wallNX = wc.nx; player.wallNZ = wc.nz;
                    // Snap flush to the wall face so the player is never
                    // slightly embedded — embedding causes pushOutObstacles
                    // to teleport across the building on the next move.
                    if (wc.snapX !== undefined) player.x = wc.snapX;
                    if (wc.snapZ !== undefined) player.z = wc.snapZ;
                    player.vy = 0; player.airVx = 0; player.airVz = 0;
                    player.airSlamUsed = false;
                    sfx('hit');
                }
            }
        }
    }

    const gy = terrainHeight(player.x, player.z);
    playerModel.position.set(player.x, gy + player.y, player.z);
    playerModel.rotation.y = yaw + Math.PI;
    if (player.scale && playerModel.scale.x !== player.scale) playerModel.scale.setScalar(player.scale);
    // Player rig — cocky idle (loose asymmetric guard, hip cock, chin
    // up, breathing sway) vs walk stride. Punches are straight-arm
    // extensions layered on top of whichever idle pose is active.
    const ud = playerModel.userData;
    const tNow = performance.now();
    const tw = tNow * 0.009;
    const sw = moving ? Math.sin(tw * 1.6) : 0;
    const stride = moving ? Math.abs(Math.sin(tw * 3.2)) * 0.04 : 0;
    // Decay punch / torque / lunge state. Arm decay slowed (was 7/s)
    // so each punch hangs visibly extended for ~250 ms.
    lArmSwing = Math.max(0, lArmSwing - dt * 4.5);
    rArmSwing = Math.max(0, rArmSwing - dt * 4.5);
    torsoTwist *= Math.max(0, 1 - dt * 5);
    lungeAmount = Math.max(0, lungeAmount - dt * 3.2);  // body lingers in the lunge

    // Idle wobble — three slow oscillators so nothing snaps to a frozen
    // pose between punches. `sway` is the dominant slow side-to-side
    // weight shift; `breath` is the chest rise; `bounce` is a tiny
    // ball-of-feet bob.
    const idleT = tNow * 0.0014;
    const sway   = !moving ? Math.sin(idleT)          : 0;
    const breath = !moving ? Math.sin(idleT * 1.6)    : 0;
    const bounce = !moving ? Math.sin(idleT * 2.7)    : 0;

    const lerp = (a, b, t) => a + (b - a) * t;

    // ── Pelvis position (walk stride + idle bounce) ──
    ud.pelvisPivot.position.y = (1.06 * ud.S) + stride + (!moving ? bounce * 0.015 : 0);

    // ── Legs ──
    if (moving) {
        ud.lHip.rotation.x = sw * 0.65;
        ud.rHip.rotation.x = -sw * 0.65;
        ud.lKnee.rotation.x = Math.max(0, -sw) * 0.75;
        ud.rKnee.rotation.x = Math.max(0, sw) * 0.75;
        ud.lHip.rotation.z = 0;
        ud.rHip.rotation.z = 0;
        // Reset cocky-only torso/head channels for clean walking
        ud.pelvisPivot.rotation.z = 0;
        ud.lowerTorsoPivot.rotation.z = 0;
        ud.headPivot.rotation.x = 0;
        ud.headPivot.rotation.z = 0;
        ud.upperTorsoPivot.rotation.x = 0;
        ud.upperTorsoPivot.rotation.z = 0;
    } else {
        // Cocky idle: weight on rear (right) leg, lead leg loose forward,
        // hips cocked, chin lifted, slight head tilt, all gently swaying.
        ud.lHip.rotation.x = -0.22 + sway * 0.04;     // lead leg forward, drifts a bit
        ud.rHip.rotation.x =  0.08;                   // rear leg planted, weight-bearing
        ud.lHip.rotation.z = -0.10;                   // lead foot kicked out a touch
        ud.rHip.rotation.z =  0.04;
        ud.lKnee.rotation.x = 0.32 - sway * 0.05;     // lead knee soft / springy
        ud.rKnee.rotation.x = 0.10;                   // rear knee nearly straight (load-bearing)
        // Contrapposto hip cock + counter-tilt so the head stays upright
        ud.pelvisPivot.rotation.z = 0.06 + sway * 0.02;
        ud.lowerTorsoPivot.rotation.z = -0.04;
        ud.upperTorsoPivot.rotation.x = 0.05 + breath * 0.025;  // slight chest forward + breath
        ud.upperTorsoPivot.rotation.z = -0.02 + sway * 0.015;
        // Chin up + head tilt + slow sway
        ud.headPivot.rotation.x = -0.13;
        ud.headPivot.rotation.z =  0.10 + sway * 0.05;
    }

    // ── Arms: asymmetric "lazy guard" with a punch layered on top ──
    // Lead (left) hand — floating forward as a loose half-guard
    let GL_SHX = -0.60, GL_SHZ =  0.30, GL_EBX = -1.55;
    // Rear (right) hand — low and tucked, casual "I'm not even trying"
    let GR_SHX = -0.18, GR_SHZ = -0.60, GR_EBX = -1.85;
    // Two-handed sword grip — both arms forward, right hand high on the
    // hilt, left hand below it. Punch extension still layers on top via
    // lArmSwing / rArmSwing so swings read naturally with the blade.
    if (save && save.equippedSword) {
        GL_SHX = -1.05; GL_SHZ =  0.36; GL_EBX = -1.40;
        GR_SHX = -1.20; GR_SHZ = -0.20; GR_EBX = -1.30;
    }
    // Fully-extended straight punch (both arms target the same shape).
    // Heavy 3rd punch pushes shoulder + elbow further (lungeAmount > 0).
    const heavy = lungeAmount;
    const E_SHX = -1.52 - heavy * 0.15;   // upper arm horizontal → slightly past on heavy
    const E_SHZ_L =  0.04, E_SHZ_R = -0.04;
    const E_EBX  =  0.00 + heavy * 0.22;  // elbow straight → slight overextension on heavy
    // Layer a tiny idle wobble on the lead arm so it doesn't freeze
    const leadBreath = !moving ? breath * 0.04 : 0;
    const leadSway   = !moving ? sway   * 0.04 : 0;

    // Block pose: both arms tight across the face, forearms forming an
    // X. Overrides the lazy guard while F is held.
    if (player.blocking) {
        ud.lShoulder.rotation.x = -1.05;
        ud.lShoulder.rotation.z =  0.95;
        ud.lShoulder.rotation.y = 0;
        ud.lElbow.rotation.x    = -1.95;
        ud.rShoulder.rotation.x = -1.05;
        ud.rShoulder.rotation.z = -0.95;
        ud.rShoulder.rotation.y = 0;
        ud.rElbow.rotation.x    = -1.95;
        ud.lWrist.scale.setScalar(1);
        ud.rWrist.scale.setScalar(1);
        // Knees bend more, both feet planted, head tucked
        ud.lHip.rotation.x = 0;
        ud.rHip.rotation.x = 0;
        ud.lHip.rotation.z = 0;
        ud.rHip.rotation.z = 0;
        ud.lKnee.rotation.x = 0.45;
        ud.rKnee.rotation.x = 0.45;
        ud.headPivot.rotation.x = 0.12;     // chin tucked down
        ud.headPivot.rotation.z = 0;
        ud.pelvisPivot.rotation.z = 0;
        ud.lowerTorsoPivot.rotation.z = 0;
        ud.upperTorsoPivot.rotation.x = 0.08;
        ud.upperTorsoPivot.rotation.y = 0;
        ud.upperTorsoPivot.rotation.z = 0;
    } else {
        ud.lShoulder.rotation.x = lerp(GL_SHX + leadBreath, E_SHX, lArmSwing);
        ud.lShoulder.rotation.z = lerp(GL_SHZ + leadSway,   E_SHZ_L, lArmSwing);
        ud.lShoulder.rotation.y = 0;
        ud.lElbow.rotation.x    = lerp(GL_EBX,              E_EBX,   lArmSwing);

        ud.rShoulder.rotation.x = lerp(GR_SHX,              E_SHX,   rArmSwing);
        ud.rShoulder.rotation.z = lerp(GR_SHZ,              E_SHZ_R, rArmSwing);
        ud.rShoulder.rotation.y = 0;
        ud.rElbow.rotation.x    = lerp(GR_EBX,              E_EBX,   rArmSwing);

        // Fist "POW" — wrist scales up as the punch peaks, sells the impact
        ud.lWrist.scale.setScalar(1 + lArmSwing * 0.35);
        ud.rWrist.scale.setScalar(1 + rArmSwing * 0.35);

        // Punch torso twist (overrides the idle upperTorso.y channel)
        ud.upperTorsoPivot.rotation.y = torsoTwist;
    }

    // Heavy-3rd body lunge: pelvis throws forward in model space, chest
    // pitches in over the strike. Layered on top of whatever the
    // idle/walk branch already set so it works in either state.
    ud.pelvisPivot.position.z = lungeAmount * 0.28;
    ud.upperTorsoPivot.rotation.x += lungeAmount * 0.28;

    // ── Wall-cling pose — overrides idle/walk/block while attached ──
    if (player.onWall) {
        playerModel.rotation.y = Math.atan2(-player.wallNX, -player.wallNZ);
        const climbing = !!keys['KeyW'] || !!keys['KeyS'];
        const cl = climbing ? Math.sin(tNow * 0.012) : Math.sin(tNow * 0.002) * 0.25;
        ud.lShoulder.rotation.set(-2.55 + cl * 0.55, 0,  0.18);
        ud.rShoulder.rotation.set(-2.55 - cl * 0.55, 0, -0.18);
        ud.lElbow.rotation.x = -0.45 - Math.max(0, -cl) * 0.6;
        ud.rElbow.rotation.x = -0.45 - Math.max(0,  cl) * 0.6;
        ud.lWrist.scale.setScalar(1);
        ud.rWrist.scale.setScalar(1);
        ud.lHip.rotation.set(-0.35 - cl * 0.5, 0,  0.14);
        ud.rHip.rotation.set(-0.35 + cl * 0.5, 0, -0.14);
        ud.lKnee.rotation.x = 0.85 + Math.max(0,  cl) * 0.5;
        ud.rKnee.rotation.x = 0.85 + Math.max(0, -cl) * 0.5;
        ud.pelvisPivot.position.set(0, 1.06 * ud.S, 0);
        ud.pelvisPivot.rotation.z = 0;
        ud.lowerTorsoPivot.rotation.z = 0;
        ud.upperTorsoPivot.rotation.set(0.18, 0, 0);
        ud.headPivot.rotation.set(0.22, 0, 0);
    }

    // Overhead quest arrow — points at the nearest unlocked giver with
    // an available (or retake-able) quest. Hidden when none eligible or
    // when the player is already next to one (or the giver hasn't been
    // unlocked yet — first eligible giver is the L10 hunter).
    {
        const arr = ud.arrow;
        let best = null, bestD = Infinity;
        for (const q of questGivers) {
            const qd = q.userData;
            if (!qd._questId || !qd._minLevel) continue;
            if (qd._minLevel < 10) continue;          // hide for the plaza board
            if (save.level < qd._minLevel) continue;  // not unlocked yet
            const qs = qstate(qd._questId);
            if (qs.state === 'active') continue;      // already accepted
            const dx = qd.x - player.x, dz = qd.z - player.z;
            const d = Math.hypot(dx, dz);
            if (d < 12) continue;                     // close enough — hide
            if (d < bestD) { bestD = d; best = q; }
        }
        if (best) {
            arr.visible = true;
            const qd = best.userData;
            // The player model itself is rotated by yaw+π, so we compute
            // the arrow's local-space yaw to compensate.
            const dx = qd.x - player.x, dz = qd.z - player.z;
            const worldYaw = Math.atan2(dx, dz);
            arr.rotation.y = worldYaw - (yaw + Math.PI);
            // Floaty bob
            arr.position.y = 2.5 * ud.S + Math.sin(tNow * 0.005) * 0.12;
        } else {
            arr.visible = false;
        }
    }

    // Third-person camera — tracks the player's vertical position (jumps)
    const camDist = 7, camHt = 3.4;
    const cx = player.x + Math.sin(yaw) * camDist * Math.cos(pitch);
    const cz = player.z + Math.cos(yaw) * camDist * Math.cos(pitch);
    const cy = gy + player.y + camHt - Math.sin(pitch) * 5;
    camera.position.set(cx, Math.max(terrainHeight(cx, cz) + 1.2, cy), cz);
    camera.lookAt(player.x, gy + player.y + 1.7, player.z);
    // Camera shake offset (decays each frame)
    if (shakeT > 0) {
        shakeT -= dt;
        const k = shakeAmp * Math.max(0, shakeT);
        camera.position.x += (Math.random() - 0.5) * k * 12;
        camera.position.y += (Math.random() - 0.5) * k * 7;
        camera.position.z += (Math.random() - 0.5) * k * 12;
        if (shakeT <= 0) shakeAmp = 0;
    }

    // Curses
    updateCurseDirector(dt);
    const isCurseClient = NET.isOnline && !NET.isHost;
    for (const c of curses) {
        const now = performance.now();
        const frozen = (c.frozenUntil || 0) > now;
        const slammed = (c.slamUntil || 0) > now;
        const disabled = frozen || slammed;
        if (isCurseClient) {
            // Client: don't run AI. Lerp toward host-broadcast targets.
            const lerpK = 1 - Math.exp(-dt * 14);     // ~70 ms
            c.x += (c.targetX - c.x) * lerpK;
            c.z += (c.targetZ - c.z) * lerpK;
            if (!disabled) c.bob += dt * 4;
        } else if (!disabled) {
            const dx = player.x - c.x, dz = player.z - c.z;
            const d = Math.hypot(dx, dz) || 1;
            if (d < 30 && d > 1.6) {
                c.x += (dx / d) * c.speed * curseSpeedMul * dt;
                c.z += (dz / d) * c.speed * curseSpeedMul * dt;
            } else if (d <= 1.8 && player.y < 2.5 && now - c.lastHit > 900) {
                c.lastHit = now;
                damagePlayer(c.dmg);
            }
            c.bob += dt * 4;
        }
        // Slammed curses are squashed flat into the ground; frozen ones
        // just hold position. Everyone re-grounds here.
        if (slammed) {
            c.mesh.position.set(c.x, terrainHeight(c.x, c.z), c.z);
            c.mesh.scale.set(1.5, 0.34, 1.5);
        } else {
            c.mesh.position.set(c.x, terrainHeight(c.x, c.z) + Math.sin(c.bob) * 0.15, c.z);
            if (c.mesh.scale.y !== 1) c.mesh.scale.set(1, 1, 1);
        }
        if (!disabled) c.mesh.lookAt(player.x, c.mesh.position.y, player.z);
        // Ice shell — translucent crystal wrap that tracks the freeze
        if (frozen && !c.iceShell) {
            const s = c.boss ? 2.6 : 1;
            const shell = new THREE.Mesh(
                new THREE.IcosahedronGeometry(0.95 * s, 0),
                new THREE.MeshBasicMaterial({ color: '#9be4ff', transparent: true,
                    opacity: 0.34, side: THREE.DoubleSide }));
            shell.position.y = 1.0 * s;
            c.mesh.add(shell);
            c.iceShell = shell;
        } else if (!frozen && c.iceShell) {
            c.mesh.remove(c.iceShell);
            c.iceShell.geometry.dispose();
            c.iceShell.material.dispose();
            c.iceShell = null;
        }
        if (c.iceShell) c.iceShell.rotation.y += dt * 0.6;
    }

    // NPC idle life — breathing bob, spinning marker, pulsing ring,
    // and they turn to face you when you're close. Covers every
    // interactable NPC (plaza + city quest givers + vendor).
    const allNpcs = [board, smith, contact, vendor, ...questGivers.slice(1), ...swordVendors];
    for (const o of allNpcs) {
        const ud = o.userData;
        ud._t += dt;
        if (ud._mk) { ud._mk.rotation.y += dt * 2; ud._mk.position.y = 2.55 + Math.sin(ud._t * 2) * 0.12; }
        if (ud._ring) ud._ring.material.opacity = 0.32 + Math.sin(ud._t * 2.4) * 0.16;
        const pd = Math.hypot(player.x - ud.x, player.z - ud.z);
        if (ud._head) {
            const want = pd < 8 ? Math.atan2(player.x - ud.x, player.z - ud.z) - o.rotation.y : 0;
            let d = want - ud._head.rotation.y;
            while (d > Math.PI) d -= Math.PI * 2;
            while (d < -Math.PI) d += Math.PI * 2;
            ud._head.rotation.y += d * Math.min(1, dt * 6);
        }
        o.position.y = terrainHeight(ud.x, ud.z) + Math.sin(ud._t * 1.6) * 0.03;
    }

    // Interactables proximity (every NPC)
    nearInteract = null;
    for (const o of allNpcs) {
        if (Math.hypot(player.x - o.userData.x, player.z - o.userData.z) < 3.4) { nearInteract = o; break; }
    }
    const pr = document.getElementById('prompt');
    if (nearInteract) { pr.style.display = 'block'; pr.innerHTML = `Press <b>E</b> — ${nearInteract.userData.label}`; }
    else pr.style.display = 'none';
    if (player.onWall) {
        pr.style.display = 'block';
        pr.innerHTML = '<b>W</b> climb &nbsp;·&nbsp; <b>S</b> down &nbsp;·&nbsp; <b>Space</b> jump off';
    }

    // Town slow heal
    if (Math.hypot(player.x - TOWN.x, player.z - TOWN.z) < TOWN.r) {
        player.hp = Math.min(player.maxHp, player.hp + dt * 12);
    }

    // Autosave
    autosaveAccum += dt;
    if (autosaveAccum > 20) { autosaveAccum = 0; persist(); }
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) document.getElementById('toast').style.opacity = '0'; }

    mpTick(dt);
    updateHud();
}

function updateHud() {
    document.getElementById('hud-name').textContent = save.name;
    document.getElementById('hud-grade').textContent = GRADE_NAME[save.grade];
    document.getElementById('hud-hp').style.width = Math.max(0, player.hp / player.maxHp * 100) + '%';
    document.getElementById('hud-hp-t').textContent = Math.ceil(player.hp) + '/' + player.maxHp;
    document.getElementById('hud-ce').style.width = (player.ce / player.maxCe * 100) + '%';
    document.getElementById('hud-ce-t').textContent = 'CE ' + Math.ceil(player.ce);
    document.getElementById('hud-st').style.width = (player.stamina / player.maxStamina * 100) + '%';
    document.getElementById('hud-st-t').textContent = 'ST ' + Math.ceil(player.stamina);
    document.getElementById('hud-xp').style.width = (save.xp / xpToNext(save.level) * 100) + '%';
    document.getElementById('hud-gold').textContent =
        `Gold: ${save.gold}  ·  Shards: ${save.shards || 0}  ·  Lv.${save.level}`;
    // Cooldown pips — fill from bottom while on cooldown, clear when ready
    const now = performance.now();
    const dashLeft = Math.max(0, DASH_CD - (now - lastDash)) / DASH_CD;
    const grabLeft = Math.max(0, GRAB_CD - (now - lastGrab)) / GRAB_CD;
    const lockLeft = Math.max(0, (player.comboLockUntil - now)) / COMBO_DOWNTIME_MS;
    const setPip = (id, frac) => {
        const el = document.getElementById(id);
        el.querySelector('i').style.height = (frac * 100) + '%';
        el.classList.toggle('ready', frac <= 0.001);
    };
    setPip('cd-dash', dashLeft);
    setPip('cd-grab', grabLeft);
    setPip('cd-combo', lockLeft);
    // Black Flash / god status chip
    const chip = document.getElementById('bf-chip');
    if (player.tempGodUntil && now < player.tempGodUntil) {
        const sec = Math.ceil((player.tempGodUntil - now) / 1000);
        chip.textContent = `★ GOD MODE  ${sec}s`;
        chip.style.display = 'block';
        chip.classList.add('god');
    } else if (player.bfDoubleNext && player.bfWindowUntil > now) {
        const sec = Math.ceil((player.bfWindowUntil - now) / 1000);
        chip.textContent = `★ BLACK FLASH  next M1 ×2  (${sec}s)`;
        chip.style.display = 'block';
        chip.classList.remove('god');
    } else {
        chip.style.display = 'none';
    }
    // Ability slot cooldowns (Z/X/C/R)
    const kit = save.equipped ? TECHNIQUE_KITS[save.equipped] : null;
    for (const s of ABILITY_SLOTS) {
        const el = document.getElementById('ab-' + s);
        if (!el) continue;
        const ab = kit && kit[s];
        const fillEl = el.querySelector('i');
        if (!ab) { fillEl.style.height = '0%'; el.classList.remove('ready'); continue; }
        const left = Math.max(0, abilityReady[s] - now) / (ab.cd * 1000);
        fillEl.style.height = (left * 100) + '%';
        el.classList.toggle('ready', left <= 0.001 && player.ce >= ab.cost);
    }
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
    // interactables (plaza + city quest givers + vendor)
    const allNpcs = [board, smith, contact, vendor, ...questGivers.slice(1), ...swordVendors];
    for (const o of allNpcs) {
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
    scene.fog = new THREE.FogExp2('#0a0e18', 0.0028);
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
    buildSchool();
    buildCity();
    buildPlaza();
    buildCityQuestGivers();
    buildSwordVendors();
    playerModel = buildPlayerModel();
    scene.add(playerModel);

    initInput();

    // Sign-in wiring
    const nameIn = document.getElementById('name-input');
    const pwIn = document.getElementById('pw-input');
    document.getElementById('btn-enter').onclick = enterPressed;
    document.getElementById('btn-register').onclick = registerPressed;
    document.getElementById('btn-mp').onclick = openMpScreen;
    // Multiplayer lobby buttons
    document.getElementById('btn-mp-back').onclick      = mpBackToSignin;
    document.getElementById('btn-create').onclick       = mpDoCreate;
    document.getElementById('btn-join-show').onclick    = mpShowJoin;
    document.getElementById('btn-mp-cancel-join').onclick = mpHideJoin;
    document.getElementById('btn-join').onclick         = mpDoJoin;
    document.getElementById('btn-mp-cancel').onclick    = mpCancelActive;
    document.getElementById('btn-start').onclick        = mpEnterWorld;
    // Enter key inside any field → login. Use Register button for new accounts.
    nameIn.addEventListener('keydown', (e) => { if (e.code === 'Enter') pwIn.focus(); });
    pwIn.addEventListener('keydown', (e) => { if (e.code === 'Enter') enterPressed(); });
    // Click a slot name → populate name + focus password (don't auto-submit)
    document.getElementById('slot-list').addEventListener('click', (e) => {
        if (e.target.dataset.slot) {
            nameIn.value = e.target.dataset.slot;
            pwIn.value = '';
            pwIn.focus();
        }
    });
    refreshSlots();

    loop();
}

// Cheap djb2 hash. Honest disclaimer: localStorage is fully readable by
// anyone with browser dev tools, so this is privacy-theatre, not real
// auth. It stops casual snooping at the same machine.
function hashPw(pw) {
    let h = 5381;
    for (let i = 0; i < pw.length; i++) h = (((h << 5) + h) ^ pw.charCodeAt(i)) | 0;
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
}
function signinError(msg) {
    const el = document.getElementById('signin-error');
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(signinError._t);
    signinError._t = setTimeout(() => { el.style.opacity = '0'; }, 3000);
}

// Pull the name + password the user typed. Returns null with a UI
// error if either field is empty.
function readSigninFields() {
    const nameInput = document.getElementById('name-input');
    const pwInput = document.getElementById('pw-input');
    const name = (nameInput.value || '').trim().slice(0, 16);
    const pw = pwInput.value || '';
    if (!name) { signinError('Enter a name'); nameInput.focus(); return null; }
    if (!pw)   { signinError('Enter a password'); pwInput.focus(); return null; }
    return { name, pw, nameInput, pwInput };
}

// "Enter the Roads" — log in only. Fails if the account doesn't exist.
async function enterPressed() {
    audioInit(); sfx('ui');
    const v = readSigninFields(); if (!v) return;
    const existing = await adapter.load(v.name);
    if (!existing) {
        signinError(`No account named "${v.name}". Use Register instead.`);
        return;
    }
    const hash = hashPw(v.pw);
    if (existing.pwHash && existing.pwHash !== hash) {
        v.pwInput.value = '';
        v.pwInput.focus();
        signinError('Incorrect password');
        return;
    }
    if (!existing.pwHash) existing.pwHash = hash;   // backfill pre-pw saves
    startGame(existing);
    persist();
}

// "Register account" — create a new save. Fails if the name is taken.
async function registerPressed() {
    audioInit(); sfx('ui');
    const v = readSigninFields(); if (!v) return;
    const existing = await adapter.load(v.name);
    if (existing) {
        signinError(`Name "${v.name}" is taken. Sign in instead.`);
        return;
    }
    const data = newSave(v.name);
    data.pwHash = hashPw(v.pw);
    startGame(data);
    persist();
}

// ─── ADMIN PANEL (only for the username `dbag`) ─────────────
const admin = { god: false, infStam: false, oneShot: false, noclip: false, rain: 0 };
function isAdmin() { return save && save.name && save.name.toLowerCase() === 'dbag'; }
const ADMIN_CMDS = [
    { l: '+1,000,000 gold',     f: () => { save.gold += 1000000; toast('+1M gold'); } },
    { l: '+9,999 shards',       f: () => { save.shards = (save.shards||0) + 9999; toast('+9999 shards'); } },
    { l: 'Level +5',            f: () => { for (let i=0;i<5;i++) gainXp(xpToNext(save.level)); } },
    { l: 'Level +20',           f: () => { for (let i=0;i<20;i++) gainXp(xpToNext(save.level)); } },
    { l: 'Set Special Grade',   f: () => { save.grade = 0; toast('GRADE: SPECIAL'); refreshMissionHud(); } },
    { l: 'Reset to Grade 4',    f: () => { save.grade = 4; toast('GRADE: 4'); refreshMissionHud(); } },
    { l: 'Full HP + Stamina',   f: () => { player.hp = player.maxHp; player.stamina = player.maxStamina; toast('Restored.'); } },
    { l: 'Toggle God Mode',     f: () => { admin.god = !admin.god; toast('God: ' + (admin.god?'ON':'OFF')); }, toggle: 'god' },
    { l: 'Toggle Inf Stamina',  f: () => { admin.infStam = !admin.infStam; toast('Inf stam: ' + (admin.infStam?'ON':'OFF')); }, toggle: 'infStam' },
    { l: 'Toggle One-Shot',     f: () => { admin.oneShot = !admin.oneShot; toast('OneShot: ' + (admin.oneShot?'ON':'OFF')); }, toggle: 'oneShot' },
    { l: 'Toggle Noclip',       f: () => { admin.noclip = !admin.noclip; toast('Noclip: ' + (admin.noclip?'ON':'OFF')); }, toggle: 'noclip' },
    { l: 'Kill ALL curses',     f: () => { for (const c of curses.slice()) damageCurse(c, 999999); toast('Mass exorcism.'); } },
    { l: 'Spawn 10 curses',     f: () => { for (let i=0;i<10;i++) spawnCurse(false); toast('+10 curses'); } },
    { l: 'Spawn boss',          f: () => { spawnCurse(true); toast('Boss spawned.'); } },
    { l: 'Curse Rain (30 s)',   f: () => { admin.rain = 30; toast('CURSE RAIN — 30 s'); } },
    { l: 'TP to Plaza',         f: () => { player.x = TOWN.x; player.z = TOWN.z + 4; player.y = 0; player.vy = 0; player.airVx = 0; player.airVz = 0; toast('TP plaza'); } },
    { l: 'TP to City Centre',   f: () => { player.x = 0; player.z = 100; player.y = 0; player.vy = 0; player.airVx = 0; player.airVz = 0; toast('TP city'); } },
    { l: 'Complete active quests', f: () => {
        for (const id in save.quests) {
            const q = save.quests[id], def = QUESTS[id];
            if (q && def && q.state === 'active') { q.progress = def.target; completeQuest(id); }
        }
        toast('Active quests done.');
    }},
    { l: 'Save now',            f: () => { persist(); toast('Saved.'); } },
    { l: 'Wipe save (confirm)', f: () => {
        if (confirm('Wipe save for "' + save.name + '"? This is permanent.')) {
            adapter.remove(save.name).then(() => location.reload());
        }
    }, danger: true },
    // ── Targeted powers ─ click → picks a player → fires on them ──
    { l: '◆ Heal player',     targeted: true, kind: 'heal' },
    { l: '◆ Smite player',    targeted: true, kind: 'smite',     danger: true },
    { l: '◆ Give God 5 s',    targeted: true, kind: 'god5' },
    { l: '◆ TP player to me', targeted: true, kind: 'tpToMe' },
    { l: '◆ Embiggen (×1.5)', targeted: true, kind: 'sizeUp' },
    { l: '◆ Shrink (×0.66)',  targeted: true, kind: 'sizeDown' },
    { l: '◆ Reset size',      targeted: true, kind: 'sizeReset' },
    { l: '◆ Toggle FLY',      targeted: true, kind: 'flyToggle' },
];

let adminOpen = false;
// Friendly label for the keyboard shortcut: 1..9, 0 for the 10th,
// then q/w/e/r/t/y/u/i/o/p for the rest.
const ADMIN_HOTKEYS = ['1','2','3','4','5','6','7','8','9','0','q','w','e','r','t','y','u','i','o','p'];
function renderAdminPanel() {
    const buttons = ADMIN_CMDS.map((c, i) => {
        const cls = c.danger ? 'danger' : (c.toggle && admin[c.toggle] ? 'on' : '');
        const key = ADMIN_HOTKEYS[i] || '·';
        const check = (c.toggle && admin[c.toggle]) ? ' ✓' : '';
        return `<button class="admin-tile ${cls}" data-admin="${i}">
            <span class="admin-num">${key.toUpperCase()}</span>
            <span class="admin-lbl">${c.l}${check}</span>
        </button>`;
    }).join('');
    showOverlay(`<h2 style="color:#ff5a6a">ADMIN PANEL</h2>
        <p style="color:#7a8a9a;font-size:0.78rem">Press a number / letter to fire that command. (F1 to close.)</p>
        <div class="admin-grid">${buttons}</div>
        <button class="btn sec act" data-close="1" style="margin-top:1rem">Close</button>`);
}
function runAdminCmd(i) {
    const cmd = ADMIN_CMDS[i];
    if (!cmd) return;
    if (cmd.targeted) {
        openAdminTargetPicker(cmd);
        sfx('ui');
        return;
    }
    cmd.f();
    if (adminOpen) renderAdminPanel();
    persist();
    sfx('ui');
}

// Build a list of every player in the server (self + remotes) and let
// the admin pick one to fire the cmd on.
function openAdminTargetPicker(cmd) {
    const myIdx = NET.playerIndex;
    const entries = [];
    // Self
    entries.push({ idx: myIdx, name: (save && save.name) || 'me', isMe: true });
    // Remote players (host's NET.remotePlayers + lobby fallback)
    const seen = new Set([myIdx]);
    for (const k of Object.keys(NET.remotePlayers || {})) {
        const idx = +k;
        if (seen.has(idx)) continue;
        seen.add(idx);
        const rp = NET.remotePlayers[idx];
        entries.push({ idx, name: rp.name || `Player ${idx + 1}` });
    }
    // Walk lobby to fill any gaps (e.g. a peer in the lobby that hasn't
    // pinged us with a position yet)
    for (let i = 0; i < (NET.lobbyPlayers || []).length; i++) {
        if (seen.has(i)) continue;
        seen.add(i);
        entries.push({ idx: i, name: (NET.lobbyPlayers[i] && NET.lobbyPlayers[i].name) || `Player ${i + 1}` });
    }
    const rows = entries.map(e =>
        `<button class="admin-tile ${cmd.danger ? 'danger' : ''}" data-admin-target="${e.idx}">
            <span class="admin-num">P${e.idx + 1}</span>
            <span class="admin-lbl">${e.name}${e.isMe ? '  (you)' : ''}</span>
        </button>`
    ).join('');
    showOverlay(`<h2 style="color:#ff5a6a">${cmd.l}</h2>
        <p style="color:#7a8a9a;font-size:0.78rem">Pick a target.</p>
        <div class="admin-grid">${rows || '<p>No other players in the server.</p>'}</div>
        <button class="btn sec act" data-close="1" style="margin-top:1rem">Cancel</button>`);
    adminPickerActiveKind = cmd.kind;
}

let adminPickerActiveKind = null;

function fireAdminAt(targetIdx) {
    const kind = adminPickerActiveKind;
    if (!kind) return;
    adminPickerActiveKind = null;
    // Apply locally if it's me; else send via net.
    if (targetIdx === NET.playerIndex || !NET.isOnline) {
        applyAdminCmd(kind, null, NET.playerIndex);
    } else {
        sendAdminCmd(targetIdx, kind, null);
    }
    sfx('ui');
    if (adminOpen) renderAdminPanel();
    else hideOverlay();
}

// Local handler — applies a power to ME (the player who received it).
function applyAdminCmd(kind, payload, fromIdx) {
    const fromName = (fromIdx === NET.playerIndex)
        ? 'self'
        : ((NET.remotePlayers[fromIdx] && NET.remotePlayers[fromIdx].name) || `P${fromIdx + 1}`);
    if (kind === 'heal') {
        player.hp = player.maxHp;
        player.stamina = player.maxStamina;
        player.ce = player.maxCe;
        toast(`◆ ADMIN ${fromName} healed you`);
        risingHalo(playerModel, '#3adf8a', 600);
        return;
    }
    if (kind === 'smite') {
        // Smite via the existing damage path so god mode / iframes
        // are honored (admins can't smite each other if god is on).
        damagePlayer(99999);
        explode(player.x, 1.4, player.z, '#ff2030', 4);
        toast(`◆ ADMIN ${fromName} SMOTE you`);
        return;
    }
    if (kind === 'god5') {
        player.tempGodUntil = performance.now() + 5000;
        toast(`◆ ADMIN ${fromName} gave you GOD 5s`);
        risingHalo(playerModel, '#ffd05a', 800);
        screenFlash('rgba(255,210,80,0.3)', 320);
        return;
    }
    if (kind === 'tpToMe') {
        const rp = NET.remotePlayers[fromIdx];
        if (!rp) { toast('Admin position unknown'); return; }
        player.x = rp.x; player.z = rp.z; player.y = 0;
        player.vy = 0; player.airVx = 0; player.airVz = 0;
        player.onWall = false;
        toast(`◆ ADMIN ${fromName} TP'd you`);
        burst(player.x, 1.6, player.z, '#a06bff', 18);
        return;
    }
    if (kind === 'sizeUp') {
        player.scale = Math.min(8, (player.scale || 1) * 1.5);
        toast(`◆ ADMIN ${fromName} embiggened you (×${player.scale.toFixed(2)})`);
        burst(player.x, 1.6, player.z, '#ffe066', 10);
        return;
    }
    if (kind === 'sizeDown') {
        player.scale = Math.max(0.2, (player.scale || 1) * 0.66);
        toast(`◆ ADMIN ${fromName} shrank you (×${player.scale.toFixed(2)})`);
        burst(player.x, 1.6, player.z, '#5af0ff', 10);
        return;
    }
    if (kind === 'sizeReset') {
        player.scale = 1;
        toast(`◆ ADMIN ${fromName} reset your size`);
        return;
    }
    if (kind === 'flyToggle') {
        player.flying = !player.flying;
        if (player.flying) {
            player.onWall = false;
            player.vy = 0;
            if (player.y < 0.5) player.y = 0.5;
            risingHalo(playerModel, '#3adf8a', 600);
            toast(`◆ ADMIN ${fromName} → FLY ON  ·  Space=up · Shift=down`);
        } else {
            toast(`◆ ADMIN ${fromName} → FLY OFF`);
        }
        return;
    }
}
function toggleAdminPanel() {
    if (!isAdmin()) return;
    if (adminOpen) { hideOverlay(); adminOpen = false; }
    else { renderAdminPanel(); adminOpen = true; }
}
function refreshAdminButton() {
    document.getElementById('admin-btn').style.display = isAdmin() ? 'block' : 'none';
}

// Hotkey + click wiring
addEventListener('keydown', (e) => {
    if (e.code === 'F1' && state === 'playing') {
        e.preventDefault();
        toggleAdminPanel();
        return;
    }
    // Number / letter shortcuts only fire while the admin panel is open
    if (adminOpen && isAdmin()) {
        const key = e.key.toLowerCase();
        const idx = ADMIN_HOTKEYS.indexOf(key);
        if (idx >= 0) {
            e.preventDefault();
            // Tile flash so the user sees what they triggered
            const tile = document.querySelector(`.admin-tile[data-admin="${idx}"]`);
            if (tile) { tile.classList.add('flash'); setTimeout(() => tile.classList.remove('flash'), 200); }
            runAdminCmd(idx);
        }
    }
});
document.getElementById('admin-btn').addEventListener('click', toggleAdminPanel);
document.getElementById('overlay').addEventListener('click', (e) => {
    const tgt = e.target.closest('[data-admin-target]');
    if (tgt) {
        fireAdminAt(parseInt(tgt.dataset.adminTarget, 10));
        return;
    }
    const t = e.target.closest('[data-admin]');
    if (t) {
        const i = parseInt(t.dataset.admin, 10);
        runAdminCmd(i);
    }
    if (e.target.dataset && e.target.dataset.close) { adminOpen = false; adminPickerActiveKind = null; }
});

function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    update(dt);
    renderer.render(scene, camera);
}

init();
