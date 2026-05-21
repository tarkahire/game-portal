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

    return g;
}

function deriveStats() {
    const lv = save.level;
    player.maxHp = 90 + lv * 15;
    player.maxStamina = 90 + lv * 8;       // drained by block, dash, grab, sprint
    player.damage = 14 + lv * 3;
    player.speed = 8.5;
    if (player.hp === undefined || player.hp > player.maxHp) player.hp = player.maxHp;
    if (player.stamina === undefined || player.stamina > player.maxStamina) player.stamina = player.maxStamina;
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
    curses.push({
        mesh, x, z, boss: !!boss,
        hp:  baseHp  * gradeMul * levelMul,
        maxHp: baseHp * gradeMul * levelMul,
        dmg: baseDmg * gradeMul * levelMul,
        speed: boss ? 4.4 : 3.6,
        lastHit: 0, bob: Math.random() * 6, alive: true,
        xp:   boss ? 0 : Math.round(22 * (1 + save.level * 0.05)),
        gold: boss ? 0 : Math.round(6  * (1 + save.level * 0.04)),
    });
}

let curseTimer = 0;
function updateCurseDirector(dt) {
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
    const now = performance.now();
    if (now < player.comboLockUntil) return;  // post-heavy downtime
    if (now - lastM1 < COMBO_HIT_CD) return;
    if (now - lastM1 > COMBO_RESET_MS) comboIdx = 0;
    const hit = COMBO[comboIdx];
    lastM1 = now;
    comboIdx = (comboIdx + 1) % COMBO.length;
    if (hit.heavy) player.comboLockUntil = now + COMBO_DOWNTIME_MS;

    // Arm extension on the punching hand + body torque the opposite way
    if (hit.hand === 'L') { lArmSwing = 1; torsoTwist =  0.18; }
    else                  { rArmSwing = 1; torsoTwist = -0.18; }
    // Body weight forward on every punch — small commit on jab/cross,
    // full commit on the heavy. Reads as "punch with the whole body".
    lungeAmount = hit.heavy ? 1.0 : 0.4;
    if (hit.heavy) torsoTwist *= 2.2;
    playPunchSample();

    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    // Punch trail — sparkles along the extension line so the strike's
    // path is unambiguous even if the camera misses the arm motion.
    const trailColor = hit.heavy ? '#ffcf66' : '#cbb6ff';
    for (let i = 1; i <= 3; i++) {
        const d = hit.reach * (i / 3) * 0.85;
        burst(player.x + fx * d, 1.4, player.z + fz * d, trailColor, 3);
    }
    let hitAny = false;
    for (const c of curses) {
        const dx = c.x - player.x, dz = c.z - player.z;
        const d = Math.hypot(dx, dz);
        if (d > hit.reach) continue;
        if ((dx / d) * fx + (dz / d) * fz < 0.25) continue;
        damageCurse(c, player.damage * hit.dmgMul);
        if (hit.knock) { c.x += (dx / d) * hit.knock; c.z += (dz / d) * hit.knock; }
        hitAny = true;
    }
    if (hitAny) {
        burst(player.x + fx * 2, 1.3, player.z + fz * 2,
            trailColor, hit.heavy ? 22 : 10);
        // Synth `hit`/`boss` blips intentionally absent — the recorded
        // assets/punch.m4a (fired in playPunchSample above) is the
        // only punch noise we want.
    }
}
// ═══ (cursed techniques removed) — was: TECHNIQUES dispatcher + Sukuna/Todo/Megumi kits + technique-only VFX helpers + updateProjectiles ═══

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
        // Cursed-spirit shard drop. Bosses always give 5; normal curses
        // roll 67% for +1.
        let shardDrop = 0;
        if (c.boss) shardDrop = 5;
        else if (Math.random() < 0.67) shardDrop = 1;
        if (shardDrop > 0) {
            save.shards = (save.shards || 0) + shardDrop;
            // Cyan-ish glint particle to read as "loot"
            burst(c.x, 1.6, c.z, '#a06bff', 6);
        }
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

// Placeholder cursed-technique catalogue. None of these are actually
// buyable yet — the shop is wired so we can drop real entries in later.
const TECHNIQUE_CATALOG = [
    { id: 'limitless',   name: 'Limitless (Gojo)',           desc: 'Cursed Energy manipulation — repulsion, attraction, Hollow Purple.', icon: '◌', gold:  6000, shards: 80 },
    { id: 'dismantle',   name: 'Dismantle (Sukuna)',         desc: 'Innate slashing technique. Auto-targets nearby curses.',           icon: '⌁', gold:  4500, shards: 60 },
    { id: 'tenShadows',  name: 'Ten Shadows (Megumi)',       desc: 'Summon shikigami — Divine Dogs, Nue, Mahoraga.',                   icon: '▲', gold:  5200, shards: 70 },
    { id: 'blackFlash',  name: 'Black Flash (Itadori)',      desc: 'Cursed-energy detonation on each strike. Pure damage.',            icon: '⚡', gold:  3800, shards: 50 },
    { id: 'copy',        name: 'Copy (Yuta)',                desc: 'Mimics any technique you\'ve seen.',                               icon: '☯', gold:  7000, shards: 90 },
    { id: 'strawDoll',   name: 'Straw Doll (Nobara)',        desc: 'Hammer + nail combo. Resonance through hits.',                    icon: '⨂', gold:  3000, shards: 40 },
    { id: 'cursedSpeech',name: 'Cursed Speech (Inumaki)',    desc: 'Commands curses to do as told. CE-intensive.',                    icon: '◐', gold:  4200, shards: 55 },
    { id: 'boogieWoogie',name: 'Boogie Woogie (Todo)',       desc: 'Clap to swap positions with allies or enemies.',                  icon: '✦', gold:  3500, shards: 45 },
    { id: 'projection',  name: 'Projection (Naoya)',         desc: '24-frame speed bursts. Slows for the user, freezes the world.',   icon: '➤', gold:  4800, shards: 65 },
    { id: 'bloodManip',  name: 'Blood Manipulation (Choso)', desc: 'Convert blood into ranged piercing attacks.',                     icon: '✿', gold:  3300, shards: 42 },
];

function openTechniqueShop() {
    const goldUI   = `<span style="color:#ffe066">${save.gold} g</span>`;
    const shardsUI = `<span style="color:#a06bff">${save.shards || 0} shards</span>`;
    const rows = TECHNIQUE_CATALOG.map(t => `
        <div class="shop-row">
            <span class="shop-icon">${t.icon}</span>
            <span class="shop-body">
                <b>${t.name}</b><br>
                <small style="color:#7a8a9a">${t.desc}</small>
            </span>
            <span class="shop-cost">
                <span style="color:#ffe066">${t.gold} g</span><br>
                <span style="color:#a06bff">${t.shards} shards</span>
            </span>
            <button class="btn sec act" disabled style="opacity:0.45;cursor:not-allowed">Soon</button>
        </div>
    `).join('');
    showOverlay(`<h2>Cursed Technique Vendor</h2>
        <p>${goldUI} &nbsp;·&nbsp; ${shardsUI}</p>
        <p style="margin:0.4rem 0 0.8rem;color:#7a8a9a">Wares are coming soon. Stockpile shards while you wait — they drop from curses (67%).</p>
        <div class="shop-list">${rows}</div>
        <button class="btn sec act" data-close="1" style="margin-top:1rem">Close</button>`);
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
        !t.dataset.quit && !t.dataset.buy)) return;
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
    if (save.shards == null) save.shards = 0;     // backfill for pre-shard saves
    document.getElementById('signin-screen').classList.remove('active');
    document.getElementById('hud').style.display = 'block';
    player = { x: TOWN.x, z: TOWN.z + 6, y: 0, vy: 0, airVx: 0, airVz: 0, iframes: 0, hp: undefined, stamina: undefined, blocking: false, comboLockUntil: 0 };
    deriveStats();
    player.damage += (save.flags.dmgBonus || 0);
    player.hp = player.maxHp;
    player.stamina = player.maxStamina;
    refreshMissionHud();
    state = 'playing';
    toast('Welcome, ' + save.name + ' — ' + GRADE_NAME[save.grade]);
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
function doJump() {
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
    const now = performance.now();
    if (now - lastGrab < GRAB_CD) return;
    if (player.stamina < GRAB_STAMINA) { toast('Out of stamina'); return; }
    if (player.blocking) return;
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
        // Overlap — push out on the axis we're resolving
        if (axis === 'x') {
            nx = (prev < o.minX) ? o.minX - padX : o.maxX + padX;
        } else {
            nz = (prev < o.minZ) ? o.minZ - padZ : o.maxZ + padZ;
        }
    }
    return axis === 'x' ? nx : nz;
}

// ─── UPDATE ─────────────────────────────────────────────────
function update(dt) {
    if (state !== 'playing') return;

    player.iframes = Math.max(0, player.iframes - dt);

    // Block — hold F. Drains 30 stamina/s while held. Auto-drops when
    // empty. Can't M1, dash, grab, or move while blocking.
    const wantBlock = !!keys['KeyF'];
    if (wantBlock && player.stamina > 0) {
        player.blocking = true;
        player.stamina = Math.max(0, player.stamina - dt * 30);
    } else {
        player.blocking = false;
    }
    // Stamina regen when not blocking (faster when standing still)
    if (!player.blocking) {
        const regen = 18;       // /s
        player.stamina = Math.min(player.maxStamina, player.stamina + dt * regen);
    }

    // Movement relative to camera yaw (locked while blocking)
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    let mx = 0, mz = 0;
    if (!player.blocking) {
        if (keys['KeyW']) { mx += fx; mz += fz; }
        if (keys['KeyS']) { mx -= fx; mz -= fz; }
        if (keys['KeyA']) { mx -= rx; mz -= rz; }
        if (keys['KeyD']) { mx += rx; mz += rz; }
    }
    const moving = mx || mz;
    if (moving) {
        const l = Math.hypot(mx, mz); mx /= l; mz /= l;
        const airMul = (player.y > 0) ? 0.45 : 1.0;   // air control reduced
        const sp = player.speed * airMul * (keys['ShiftLeft'] || keys['ShiftRight'] ? 1.7 : 1) * dt;
        let nx = player.x + mx * sp, nz = player.z + mz * sp;
        nx = pushOutObstacles(nx, nz, 'x', player.x);
        nz = pushOutObstacles(nx, nz, 'z', player.z);
        nx = Math.max(-WORLD + 4, Math.min(WORLD - 4, nx));
        nz = Math.max(-WORLD + 4, Math.min(WORLD - 4, nz));
        player.x = nx; player.z = nz;
    }

    // Gravity + vertical integration. Forward leap velocity is applied
    // each frame and decays so the player covers distance, not height.
    if (player.y > 0 || player.vy > 0) {
        player.vy -= GRAVITY * dt;
        player.y += player.vy * dt;
        if (player.airVx || player.airVz) {
            let nx = player.x + player.airVx * dt;
            let nz = player.z + player.airVz * dt;
            nx = pushOutObstacles(nx, nz, 'x', player.x);
            nz = pushOutObstacles(nx, nz, 'z', player.z);
            nx = Math.max(-WORLD + 4, Math.min(WORLD - 4, nx));
            nz = Math.max(-WORLD + 4, Math.min(WORLD - 4, nz));
            player.x = nx; player.z = nz;
            const decay = Math.max(0, 1 - dt * LEAP_DECAY);
            player.airVx *= decay; player.airVz *= decay;
        }
        if (player.y <= 0) {
            player.y = 0; player.vy = 0;
            player.airVx = 0; player.airVz = 0;
        }
    }

    const gy = terrainHeight(player.x, player.z);
    playerModel.position.set(player.x, gy + player.y, player.z);
    playerModel.rotation.y = yaw + Math.PI;
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
    const GL_SHX = -0.60, GL_SHZ =  0.30, GL_EBX = -1.55;
    // Rear (right) hand — low and tucked, casual "I'm not even trying"
    const GR_SHX = -0.18, GR_SHZ = -0.60, GR_EBX = -1.85;
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

    // NPC idle life — breathing bob, spinning marker, pulsing ring,
    // and they turn to face you when you're close. Covers every
    // interactable NPC (plaza + city quest givers + vendor).
    const allNpcs = [board, smith, contact, vendor, ...questGivers.slice(1)];
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
    document.getElementById('hud-grade').textContent = GRADE_NAME[save.grade];
    document.getElementById('hud-hp').style.width = Math.max(0, player.hp / player.maxHp * 100) + '%';
    document.getElementById('hud-hp-t').textContent = Math.ceil(player.hp) + '/' + player.maxHp;
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
    const allNpcs = [board, smith, contact, vendor, ...questGivers.slice(1)];
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
    const data = existing || newSave(name);
    startGame(data);
    persist();
}

function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    update(dt);
    renderer.render(scene, camera);
}

init();
