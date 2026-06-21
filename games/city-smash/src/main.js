// City Smash — anime-style 3D city brawler.
// Punch NPCs across a giant city, chain combos, survive escalating Titan bosses.
// Three.js v0.162.0, no build step. Single-file game.

import * as THREE from 'three';

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------
const GROUND_Y = 0;
const CITY_HALF = 90;            // half-size of the playable square (meters)
const GRAVITY = -34;             // m/s^2 for ragdoll launch physics
const PLAYER_SPEED = 11;
const PLAYER_SPRINT = 18;
const PUNCH_REACH = 3.2;
const PUNCH_CONE = Math.cos(THREE.MathUtils.degToRad(55)); // dot threshold
const COMBO_WINDOW = 1.25;       // seconds to keep a combo alive

// ----------------------------------------------------------------------------
// Renderer / scene / camera
// ----------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x141a38);
scene.fog = new THREE.Fog(0x141a38, 90, 260);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 600);
scene.add(camera); // so the first-person fist viewmodel (a child of camera) renders

addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

// ----------------------------------------------------------------------------
// Lights & sky
// ----------------------------------------------------------------------------
scene.add(new THREE.HemisphereLight(0x8a96d8, 0x20183a, 1.15));
const moon = new THREE.DirectionalLight(0xdfe6ff, 1.9);
moon.position.set(50, 90, 30);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
moon.shadow.camera.left = -CITY_HALF; moon.shadow.camera.right = CITY_HALF;
moon.shadow.camera.top = CITY_HALF; moon.shadow.camera.bottom = -CITY_HALF;
moon.shadow.camera.far = 260;
scene.add(moon);
scene.add(moon.target);

// distant star dome
{
    const g = new THREE.BufferGeometry();
    const pts = [];
    for (let i = 0; i < 1400; i++) {
        const r = 260, t = Math.random() * Math.PI * 2, p = Math.acos(Math.random());
        pts.push(Math.cos(t) * Math.sin(p) * r, Math.abs(Math.cos(p)) * r * 0.8 + 20, Math.sin(t) * Math.sin(p) * r);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb0ff, size: 1.1, sizeAttenuation: false })));
}

// ----------------------------------------------------------------------------
// City build
// ----------------------------------------------------------------------------
function buildCity() {
    // ground
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x14172b, roughness: 0.95 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(CITY_HALF * 2 + 40, CITY_HALF * 2 + 40), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // neon street grid lines
    const lineMat = new THREE.LineBasicMaterial({ color: 0x2c61ff, transparent: true, opacity: 0.35 });
    const gp = [];
    for (let i = -CITY_HALF; i <= CITY_HALF; i += 15) {
        gp.push(-CITY_HALF, 0.02, i, CITY_HALF, 0.02, i);
        gp.push(i, 0.02, -CITY_HALF, i, 0.02, CITY_HALF);
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
    scene.add(new THREE.LineSegments(gg, lineMat));

    // buildings on a grid, leaving streets between blocks
    const winColors = [0xffd27a, 0x7ad7ff, 0xff7ab0, 0xb6ffd0];
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    for (let bx = -CITY_HALF + 12; bx < CITY_HALF - 6; bx += 26) {
        for (let bz = -CITY_HALF + 12; bz < CITY_HALF - 6; bz += 26) {
            // small clusters of 1-3 towers per block
            const towers = 1 + (Math.floor(Math.abs(bx + bz)) % 3);
            for (let t = 0; t < towers; t++) {
                const w = 6 + Math.random() * 7;
                const d = 6 + Math.random() * 7;
                const h = 12 + Math.random() * 46;
                const ox = bx + (Math.random() - 0.5) * 10;
                const oz = bz + (Math.random() - 0.5) * 10;
                if (Math.hypot(ox, oz) < 16) continue; // keep spawn plaza clear
                const hue = 0.58 + Math.random() * 0.08;
                const col = new THREE.Color().setHSL(hue, 0.4, 0.18 + Math.random() * 0.1);
                const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.85, metalness: 0.2,
                    emissive: new THREE.Color(winColors[(t + Math.floor(ox)) & 3]), emissiveIntensity: 0.0 });
                // emissive windows via second material trick: use emissiveMap-free flat glow strips
                const m = new THREE.Mesh(boxGeo, mat);
                m.scale.set(w, h, d);
                m.position.set(ox, h / 2, oz);
                m.castShadow = true; m.receiveShadow = true;
                scene.add(m);
                // glowing window band
                const band = new THREE.Mesh(new THREE.BoxGeometry(w * 1.01, h * 0.5, d * 1.01),
                    new THREE.MeshBasicMaterial({ color: winColors[(t + Math.floor(oz)) & 3], transparent: true, opacity: 0.10 }));
                band.position.set(ox, h * 0.55, oz);
                scene.add(band);
                obstacles.push({ x: ox, z: oz, r: Math.max(w, d) * 0.62 });
            }
        }
    }

    // boundary neon walls (visual + clamp)
    const wallMat = new THREE.MeshBasicMaterial({ color: 0xff2d55, transparent: true, opacity: 0.16 });
    const wallH = 30;
    for (const s of [[0, -CITY_HALF, 0], [0, CITY_HALF, 0], [-CITY_HALF, 0, Math.PI / 2], [CITY_HALF, 0, Math.PI / 2]]) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(CITY_HALF * 2, wallH), wallMat);
        w.position.set(s[0], wallH / 2, s[1]);
        w.rotation.y = s[2];
        scene.add(w);
    }
}
const obstacles = []; // {x,z,r} building collision discs
buildCity();

// ----------------------------------------------------------------------------
// Humanoid builder — stylized blocky anime figure
// ----------------------------------------------------------------------------
function buildHumanoid({ color = 0x4f7dff, scale = 1, skin = 0xffd9b3, evil = false } = {}) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.15, 0.55), bodyMat);
    torso.position.y = 1.5; torso.castShadow = true; g.add(torso);

    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 0.5), bodyMat);
    hips.position.y = 0.85; hips.castShadow = true; g.add(hips);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), skinMat);
    head.position.y = 2.4; head.castShadow = true; g.add(head);

    // hair / helmet
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.3, 0.66),
        new THREE.MeshStandardMaterial({ color: evil ? 0x120014 : 0x2a2030, roughness: 0.5 }));
    hair.position.y = 2.7; g.add(hair);

    // eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: evil ? 0xff2d2d : 0x16213a });
    for (const sx of [-0.15, 0.15]) {
        const e = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.05), eyeMat);
        e.position.set(sx, 2.42, 0.31); g.add(e);
    }

    // arms (pivot at shoulder so we can swing for punches)
    function makeArm(side) {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.62, 2.0, 0);
        const upper = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.95, 0.26), bodyMat);
        upper.position.y = -0.45; upper.castShadow = true;
        const fist = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), skinMat);
        fist.position.y = -0.98;
        pivot.add(upper); pivot.add(fist);
        pivot.rotation.x = 0.1;
        g.add(pivot);
        return pivot;
    }
    const armL = makeArm(-1), armR = makeArm(1);

    // legs
    function makeLeg(side) {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.24, 0.85, 0);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.95, 0.3),
            new THREE.MeshStandardMaterial({ color: evil ? 0x1a0a1a : 0x222838, roughness: 0.7 }));
        leg.position.y = -0.5; leg.castShadow = true;
        pivot.add(leg);
        g.add(pivot);
        return pivot;
    }
    const legL = makeLeg(-1), legR = makeLeg(1);

    g.scale.setScalar(scale);
    g.userData.parts = { torso, head, armL, armR, legL, legR };
    return g;
}

// ----------------------------------------------------------------------------
// Player
// ----------------------------------------------------------------------------
const player = {
    mesh: buildHumanoid({ color: 0xff3b5c, skin: 0xffd9b3 }),
    pos: new THREE.Vector3(0, 0, 6),
    vel: new THREE.Vector3(),
    yaw: 0,
    hp: 100, maxHp: 100,
    punchTimer: 0,
    comboStep: 0,
    comboTimer: 0,
    dashCd: 0,
    slamCd: 0,
    invuln: 0,
    alive: true,
};
player.mesh.position.copy(player.pos);
player.mesh.visible = false; // first-person: body hidden, fists shown via viewmodel
scene.add(player.mesh);

const EYE_HEIGHT = 2.55;

// ---- First-person fist viewmodel (children of the camera) ----
function buildFist(side) {
    const g = new THREE.Group();
    const sleeveMat = new THREE.MeshStandardMaterial({ color: 0xff3b5c, roughness: 0.5 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd9b3, roughness: 0.7 });
    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.7), sleeveMat);
    forearm.position.z = 0.32; // extends back toward camera
    const fist = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.32), skinMat);
    fist.position.z = -0.05;
    const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.09, 0.31), new THREE.MeshStandardMaterial({ color: 0xf3c39a }));
    knuckle.position.set(0, 0.13, -0.05);
    g.add(forearm); g.add(fist); g.add(knuckle);
    g.position.set(side * 0.34, -0.42, -0.85);
    g.rotation.set(-0.15, side * 0.18, side * -0.05);
    return g;
}
const fistR = buildFist(1);
const fistL = buildFist(-1);
camera.add(fistR); camera.add(fistL);
// per-fist animation state
fistR.userData.base = fistR.position.clone();
fistL.userData.base = fistL.position.clone();
const viewFists = { armR: fistR, armL: fistL };

// ----------------------------------------------------------------------------
// Enemies (NPCs) — wandering pedestrians that get launched
// ----------------------------------------------------------------------------
const enemies = [];
const NPC_COLORS = [0x4f7dff, 0x3fcaa0, 0xe0a23c, 0x9b6cff, 0xff8fb0, 0x46c7ff, 0xc7d0e0];

function spawnNPC(boss = false) {
    // spawn somewhere around the ring, away from player
    let x, z, tries = 0;
    do {
        const a = Math.random() * Math.PI * 2;
        const r = 28 + Math.random() * 50;
        x = THREE.MathUtils.clamp(player.pos.x + Math.cos(a) * r, -CITY_HALF + 4, CITY_HALF - 4);
        z = THREE.MathUtils.clamp(player.pos.z + Math.sin(a) * r, -CITY_HALF + 4, CITY_HALF - 4);
        tries++;
    } while (insideBuilding(x, z) && tries < 12);

    const scale = boss ? (3.2 + waveNum * 0.25) : 1;
    const color = boss ? 0x6a0030 : NPC_COLORS[(Math.random() * NPC_COLORS.length) | 0];
    const mesh = buildHumanoid({ color, scale, evil: boss, skin: boss ? 0x7a3050 : 0xffd9b3 });
    mesh.position.set(x, 0, z);
    scene.add(mesh);

    const maxHp = boss ? 120 + waveNum * 60 : 1;
    const e = {
        mesh, boss,
        pos: new THREE.Vector3(x, 0, z),
        vel: new THREE.Vector3(),
        spin: new THREE.Vector3(),
        yaw: Math.random() * Math.PI * 2,
        state: 'walk',      // walk | launched | down | dead
        hp: maxHp, maxHp,
        scale,
        wanderT: Math.random() * 2,
        downT: 0,
        attackCd: 2 + Math.random() * 2,
        telegraph: 0,
        walkPhase: Math.random() * 6,
        fade: 1,
    };
    if (boss) {
        e.mesh.add(makeAura(0xff2d55, scale));
    }
    enemies.push(e);
    return e;
}

function makeAura(color, scale) {
    const aura = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, side: THREE.BackSide }));
    aura.position.y = 1.6; aura.scale.setScalar(scale > 1 ? 1.1 : 1);
    return aura;
}

function insideBuilding(x, z) {
    for (const o of obstacles) if (Math.hypot(x - o.x, z - o.z) < o.r) return true;
    return false;
}

// push a point out of buildings (simple disc collision)
function resolveBuildings(p, radius) {
    for (const o of obstacles) {
        const dx = p.x - o.x, dz = p.z - o.z;
        const d = Math.hypot(dx, dz), min = o.r + radius;
        if (d < min && d > 0.0001) {
            const push = (min - d);
            p.x += (dx / d) * push;
            p.z += (dz / d) * push;
        }
    }
}

// ----------------------------------------------------------------------------
// VFX pool — impact rings, launch shockwaves, floating text
// ----------------------------------------------------------------------------
const vfx = [];
function impactRing(pos, color = 0xffe08a, size = 1) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.5, 24),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    ring.position.copy(pos); ring.position.y = Math.max(0.4, pos.y);
    ring.lookAt(camera.position);
    scene.add(ring);
    vfx.push({ mesh: ring, t: 0, life: 0.35, kind: 'ring', size });
}
function shockwave(pos, color = 0xfff0b0) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 1.0, 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.copy(pos); ring.position.y = 0.1;
    scene.add(ring);
    vfx.push({ mesh: ring, t: 0, life: 0.5, kind: 'wave' });
}
function burst(pos, color = 0xff6a8a, n = 10, speed = 8) {
    for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18),
            new THREE.MeshBasicMaterial({ color }));
        m.position.copy(pos);
        const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize();
        scene.add(m);
        vfx.push({ mesh: m, t: 0, life: 0.45 + Math.random() * 0.3, kind: 'spark', vel: dir.multiplyScalar(speed * (0.5 + Math.random())) });
    }
}
function updateVfx(dt) {
    for (let i = vfx.length - 1; i >= 0; i--) {
        const f = vfx[i];
        f.t += dt;
        const k = f.t / f.life;
        if (k >= 1) { scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); vfx.splice(i, 1); continue; }
        if (f.kind === 'ring') { const s = 1 + k * 5 * f.size; f.mesh.scale.set(s, s, s); f.mesh.material.opacity = 0.9 * (1 - k); f.mesh.lookAt(camera.position); }
        else if (f.kind === 'wave') { const s = 1 + k * 14; f.mesh.scale.set(s, s, s); f.mesh.material.opacity = 0.85 * (1 - k); }
        else if (f.kind === 'spark') { f.vel.y += GRAVITY * dt * 0.5; f.mesh.position.addScaledVector(f.vel, dt); f.mesh.material.opacity = 1 - k; f.mesh.rotation.x += dt * 8; }
    }
}

// ----------------------------------------------------------------------------
// Input
// ----------------------------------------------------------------------------
const keys = {};
addEventListener('keydown', e => { keys[e.code] = true; });
addEventListener('keyup', e => { keys[e.code] = false; });

let camYaw = 0, camPitch = 0.35;
let pointerLocked = false;
renderer.domElement.addEventListener('click', () => {
    if (running && !pointerLocked) renderer.domElement.requestPointerLock();
});
document.addEventListener('pointerlockchange', () => { pointerLocked = document.pointerLockElement === renderer.domElement; });
addEventListener('mousemove', e => {
    if (!pointerLocked) return;
    camYaw -= e.movementX * 0.0025;
    camPitch = THREE.MathUtils.clamp(camPitch - e.movementY * 0.0022, -1.1, 1.1);
});
addEventListener('mousedown', e => { if (e.button === 0 && pointerLocked && running) tryPunch(); });

// ----------------------------------------------------------------------------
// Combat — punches, combos, knockback
// ----------------------------------------------------------------------------
function tryPunch() {
    if (player.punchTimer > 0 || !player.alive) return;
    // advance combo
    if (player.comboTimer <= 0) player.comboStep = 0;
    player.comboStep = (player.comboStep % 4) + 1;
    player.comboTimer = COMBO_WINDOW;
    player.punchTimer = 0.26;
    player.punchArm = player.comboStep % 2 === 1 ? 'armR' : 'armL';
    player.punchAnim = 0;

    const launcher = player.comboStep === 4;
    // forward dir from player yaw
    const fwd = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    // small lunge
    player.pos.addScaledVector(fwd, launcher ? 1.4 : 0.7);

    const hitPos = player.pos.clone().addScaledVector(fwd, 1.6); hitPos.y = 1.4;
    let hits = 0;
    for (const e of enemies) {
        if (e.state === 'dead') continue;
        const to = new THREE.Vector3().subVectors(e.pos, player.pos); to.y = 0;
        const dist = to.length();
        const reach = PUNCH_REACH + e.scale * 0.6 + (launcher ? 1.2 : 0);
        if (dist > reach) continue;
        to.normalize();
        if (to.dot(fwd) < PUNCH_CONE) continue;
        hits++;
        hitEnemy(e, fwd, launcher);
    }

    if (hits > 0) {
        registerCombo(launcher, hits);
        impactRing(hitPos, launcher ? 0xffd34d : 0xffe08a, launcher ? 1.6 : 1);
        burst(hitPos, launcher ? 0xffd34d : 0xff9a6a, launcher ? 16 : 8, launcher ? 13 : 8);
        camPunch(launcher ? 0.5 : 0.2);
        hitStop(launcher ? 0.07 : 0.03);
        if (launcher) shockwave(player.pos, 0xffe08a);
    } else {
        // whiff — still animate
        camPunch(0.05);
    }
}

function hitEnemy(e, fwd, launcher) {
    if (e.boss) {
        const dmg = launcher ? 22 : 7;
        e.hp -= dmg;
        e.telegraph = Math.max(0, e.telegraph - 0.4);
        // bosses flinch but don't fly until dead
        e.vel.addScaledVector(fwd, launcher ? 5 : 2);
        burst(e.pos.clone().setY(e.scale * 1.4), 0xff2d55, 10, 7);
        flashMesh(e.mesh, 0xff8080);
        if (e.hp <= 0) killBoss(e, fwd);
        return;
    }
    // regular NPC — launch!
    e.state = 'launched';
    e.mesh.position.y = e.pos.y;
    const up = launcher ? 17 : 8 + Math.random() * 2;
    const power = launcher ? 34 : 16 + Math.random() * 4;
    e.vel.set(fwd.x * power, up, fwd.z * power);
    e.spin.set((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 18);
    e.hp = 0;
    flashMesh(e.mesh, 0xffffff);
}

function registerCombo(launcher, hits) {
    player.combo = (player.combo || 0) + hits;
    player.comboTimerHud = 2.4;
    const c = player.combo;
    comboNum.textContent = c;
    comboEl.classList.add('show', 'big');
    setTimeout(() => comboEl.classList.remove('big'), 200);
    addScore((launcher ? 50 : 15) * hits + c * 2);
}

// ----------------------------------------------------------------------------
// Player update
// ----------------------------------------------------------------------------
const tmpDir = new THREE.Vector3();
function updatePlayer(dt) {
    if (!player.alive) return;
    player.punchTimer = Math.max(0, player.punchTimer - dt);
    player.dashCd = Math.max(0, player.dashCd - dt);
    player.slamCd = Math.max(0, player.slamCd - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    if (player.comboTimer > 0) { player.comboTimer -= dt; if (player.comboTimer <= 0) player.comboStep = 0; }
    if (player.comboTimerHud > 0) { player.comboTimerHud -= dt; if (player.comboTimerHud <= 0) { player.combo = 0; comboEl.classList.remove('show'); } }

    // movement relative to camera
    const f = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
    const r = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));
    tmpDir.set(0, 0, 0);
    if (keys['KeyW'] || keys['ArrowUp']) tmpDir.add(f);
    if (keys['KeyS'] || keys['ArrowDown']) tmpDir.sub(f);
    if (keys['KeyD'] || keys['ArrowRight']) tmpDir.add(r);
    if (keys['KeyA'] || keys['ArrowLeft']) tmpDir.sub(r);

    const sprint = keys['ShiftLeft'] || keys['ShiftRight'];
    const speed = (sprint ? PLAYER_SPRINT : PLAYER_SPEED) * (player.punchTimer > 0 ? 0.35 : 1);
    if (tmpDir.lengthSq() > 0) {
        tmpDir.normalize();
        player.pos.addScaledVector(tmpDir, speed * dt);
    }
    // first-person: you always face where you look
    player.yaw = camYaw;

    // dash
    if ((keys['Space']) && player.dashCd <= 0) {
        const dir = tmpDir.lengthSq() > 0 ? tmpDir : f;
        player.pos.addScaledVector(dir, 6);
        player.dashCd = 0.55;
        player.invuln = 0.3;
        shockwave(player.pos, 0x7ad7ff);
    }

    // ground slam (F)
    if (keys['KeyF'] && player.slamCd <= 0) groundSlam();

    // clamp + building collision
    player.pos.x = THREE.MathUtils.clamp(player.pos.x, -CITY_HALF + 2, CITY_HALF - 2);
    player.pos.z = THREE.MathUtils.clamp(player.pos.z, -CITY_HALF + 2, CITY_HALF - 2);
    resolveBuildings(player.pos, 0.8);

    player.mesh.position.copy(player.pos);
    player.mesh.rotation.y = player.yaw;

    // limb animation
    animatePlayerLimbs(dt, tmpDir.lengthSq() > 0, speed);
}

function groundSlam() {
    player.slamCd = 4.5;
    shockwave(player.pos, 0xffd34d);
    shockwave(player.pos, 0xff8a3c);
    camPunch(0.6); hitStop(0.05);
    burst(player.pos.clone().setY(0.5), 0xffd34d, 20, 12);
    const R = 11;
    for (const e of enemies) {
        if (e.state === 'dead' || e.boss) {
            if (e.boss) { // bosses take slam damage if close
                if (e.pos.distanceTo(player.pos) < R + e.scale) { e.hp -= 30; flashMesh(e.mesh, 0xff8080); if (e.hp <= 0) killBoss(e, new THREE.Vector3(0, 0, 1)); }
            }
            continue;
        }
        const d = e.pos.distanceTo(player.pos);
        if (d < R) {
            const dir = new THREE.Vector3().subVectors(e.pos, player.pos).setY(0).normalize();
            e.state = 'launched';
            e.vel.set(dir.x * 22, 20, dir.z * 22);
            e.spin.set((Math.random() - 0.5) * 16, 0, (Math.random() - 0.5) * 16);
            e.hp = 0;
        }
    }
    registerCombo(false, 1);
}

function animatePlayerLimbs(dt, moving, speed) {
    const p = player.mesh.userData.parts;
    // punch swing
    if (player.punchTimer > 0) {
        const k = 1 - (player.punchTimer / 0.26); // 0->1
        const swing = Math.sin(k * Math.PI) * 1.7;
        const arm = p[player.punchArm];
        arm.rotation.x = -swing;
        // other arm guards
        const other = player.punchArm === 'armR' ? p.armL : p.armR;
        other.rotation.x = 0.4;
    } else {
        p.armL.rotation.x = THREE.MathUtils.lerp(p.armL.rotation.x, 0.1, 0.2);
        p.armR.rotation.x = THREE.MathUtils.lerp(p.armR.rotation.x, 0.1, 0.2);
    }
    // walk cycle
    const t = performance.now() * 0.001;
    const amp = moving ? Math.min(1, speed / PLAYER_SPEED) : 0;
    const sw = Math.sin(t * 9) * 0.6 * amp;
    p.legL.rotation.x = sw; p.legR.rotation.x = -sw;
    if (player.punchTimer <= 0) { p.armL.rotation.x += -sw * 0.4; p.armR.rotation.x += sw * 0.4; }
}

// ----------------------------------------------------------------------------
// Enemy update
// ----------------------------------------------------------------------------
function updateEnemies(dt) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];

        if (e.state === 'launched') {
            e.vel.y += GRAVITY * dt;
            e.pos.addScaledVector(e.vel, dt);
            e.mesh.position.copy(e.pos);
            e.mesh.rotation.x += e.spin.x * dt;
            e.mesh.rotation.y += e.spin.y * dt;
            e.mesh.rotation.z += e.spin.z * dt;
            // bounce / land
            if (e.pos.y <= 0) {
                e.pos.y = 0;
                if (e.vel.y < -6 && Math.abs(e.vel.x) + Math.abs(e.vel.z) > 4) {
                    // hard bounce, skid
                    e.vel.y *= -0.32; e.vel.x *= 0.5; e.vel.z *= 0.5;
                    e.spin.multiplyScalar(0.5);
                    burst(e.pos.clone().setY(0.4), 0xbfc6e0, 6, 5);
                    impactRing(e.pos, 0x99a6c8, 0.7);
                } else {
                    e.state = 'down'; e.downT = 0.8 + Math.random() * 0.6;
                    e.vel.set(0, 0, 0);
                    e.mesh.rotation.set(Math.PI / 2 * (Math.random() > 0.5 ? 1 : -1) * 0.0, 0, Math.PI / 2 * 0.0);
                    e.mesh.rotation.x = Math.PI / 2 * 0.9; // lay down-ish
                }
            }
            // hit a building mid-flight => splat impulse stop
            resolveBuildings(e.pos, 0.6);
            continue;
        }

        if (e.state === 'down') {
            e.downT -= dt;
            e.fade -= dt * 0.7;
            // dead NPC fades and is removed (counts as smashed already)
            setOpacity(e.mesh, Math.max(0, e.fade));
            if (e.downT <= 0 && e.fade <= 0.05) {
                scene.remove(e.mesh);
                enemies.splice(i, 1);
                onNpcRemoved();
            }
            continue;
        }

        if (e.state === 'dead') { scene.remove(e.mesh); enemies.splice(i, 1); continue; }

        // ---- alive AI: walk / chase ----
        e.walkPhase += dt * (e.boss ? 5 : 8);
        const toPlayer = new THREE.Vector3().subVectors(player.pos, e.pos).setY(0);
        const distP = toPlayer.length();

        let move = new THREE.Vector3();
        if (e.boss) {
            // boss stalks the player
            toPlayer.normalize();
            move.copy(toPlayer);
            e.yaw = Math.atan2(toPlayer.x, toPlayer.z);
            const sp = 3.2 + waveNum * 0.15;
            if (distP > e.scale + 2.2) e.pos.addScaledVector(move, sp * dt);

            // attack
            e.attackCd -= dt;
            if (e.telegraph > 0) {
                e.telegraph -= dt;
                if (e.telegraph <= 0) bossSlam(e);
            } else if (e.attackCd <= 0 && distP < e.scale + 8) {
                e.telegraph = 0.8; // wind-up
                e.attackCd = 3 + Math.random() * 2;
                impactRing(player.pos.clone(), 0xff2d55, 2.2); // warning at target
            }
        } else {
            // pedestrians mostly wander; if player close, some flee, some shamble toward
            e.wanderT -= dt;
            if (e.wanderT <= 0) { e.yaw += (Math.random() - 0.5) * 2.2; e.wanderT = 1 + Math.random() * 2.5; }
            if (distP < 14) {
                // turn toward player and shuffle in (so they walk into your fists)
                const want = Math.atan2(toPlayer.x, toPlayer.z);
                e.yaw = lerpAngle(e.yaw, want, 0.04);
            }
            move.set(Math.sin(e.yaw), 0, Math.cos(e.yaw));
            e.pos.addScaledVector(move, 2.4 * dt);
        }

        // bounds + buildings
        e.pos.x = THREE.MathUtils.clamp(e.pos.x, -CITY_HALF + 2, CITY_HALF - 2);
        e.pos.z = THREE.MathUtils.clamp(e.pos.z, -CITY_HALF + 2, CITY_HALF - 2);
        resolveBuildings(e.pos, 0.7 * e.scale);

        e.mesh.position.copy(e.pos);
        e.mesh.rotation.set(0, e.yaw, 0);
        // walk limbs
        const parts = e.mesh.userData.parts;
        const sw = Math.sin(e.walkPhase) * 0.5;
        parts.legL.rotation.x = sw; parts.legR.rotation.x = -sw;
        parts.armL.rotation.x = -sw * 0.6 + (e.boss ? 0.2 : 0); parts.armR.rotation.x = sw * 0.6 + (e.boss ? 0.2 : 0);
        if (e.boss && e.telegraph > 0) {
            // raise arms for slam telegraph
            const up = -2.2 * (1 - e.telegraph / 0.8);
            parts.armL.rotation.x = up; parts.armR.rotation.x = up;
        }
    }
}

function bossSlam(e) {
    shockwave(e.pos, 0xff2d55);
    shockwave(e.pos, 0xffd34d);
    camPunch(0.7);
    burst(e.pos.clone().setY(1), 0xff2d55, 18, 12);
    const R = e.scale + 6;
    if (player.pos.distanceTo(e.pos) < R && player.invuln <= 0) {
        damagePlayer(14 + waveNum * 2);
        // knock the player back
        const dir = new THREE.Vector3().subVectors(player.pos, e.pos).setY(0).normalize();
        player.pos.addScaledVector(dir, 6);
    }
}

function killBoss(e, fwd) {
    e.state = 'dead';
    bossActive = null;
    bossBar.classList.add('hidden');
    burst(e.pos.clone().setY(e.scale * 1.5), 0xff2d55, 40, 16);
    shockwave(e.pos, 0xff2d55); shockwave(e.pos, 0xffd34d);
    camPunch(0.9); hitStop(0.12);
    addScore(800 + waveNum * 200);
    banner('TITAN DOWN', '#ffd34d');
    onNpcRemoved(true);
    // brief breather then next wave ramps
    setTimeout(nextWave, 2500);
}

// ----------------------------------------------------------------------------
// Waves / spawning director
// ----------------------------------------------------------------------------
let waveNum = 1;
let aliveTarget = 0;     // how many pedestrians to keep around
let bossActive = null;
let spawnAcc = 0;
let kills = 0;
let score = 0;

function startWave(n) {
    waveNum = n;
    waveEl.textContent = n;
    aliveTarget = Math.min(7 + n * 2, 26);
    // spawn the wave's titan a few seconds in
    setTimeout(() => {
        if (!running) return;
        const b = spawnNPC(true);
        bossActive = b;
        b.bossName = TITAN_NAMES[(n - 1) % TITAN_NAMES.length];
        bossName.textContent = b.bossName + ' — TITAN ' + n;
        bossBar.classList.remove('hidden');
        banner('⚠ ' + b.bossName + ' APPROACHES', '#ff5e7e');
        screenFlash(0x661022);
    }, 3500);
    banner('WAVE ' + n, '#7ad7ff');
}
function nextWave() { if (running) startWave(waveNum + 1); }

const TITAN_NAMES = ['GROM', 'VESPER', 'KARNAGE', 'OBLIVION', 'BEHEMOTH', 'NULLBRINGER', 'THE WARDEN', 'GIGAS'];

function updateDirector(dt) {
    // keep the streets populated
    const peds = enemies.filter(e => !e.boss && (e.state === 'walk')).length;
    spawnAcc += dt;
    if (peds < aliveTarget && spawnAcc > 0.4) {
        spawnAcc = 0;
        spawnNPC(false);
    }
    // boss bar
    if (bossActive && bossActive.state !== 'dead') {
        bossHealth.style.width = Math.max(0, (bossActive.hp / bossActive.maxHp) * 100) + '%';
    }
}

function onNpcRemoved(boss = false) {
    kills++;
    killsEl.textContent = kills;
}

// ----------------------------------------------------------------------------
// Damage / camera juice
// ----------------------------------------------------------------------------
let camShake = 0, hitStopT = 0;
function camPunch(amt) { camShake = Math.min(1.2, camShake + amt); }
function hitStop(t) { hitStopT = Math.max(hitStopT, t); }

function damagePlayer(amt) {
    if (!player.alive || player.invuln > 0) return;
    player.hp -= amt;
    player.invuln = 0.6;
    screenFlash(0x66131f);
    camPunch(0.5);
    healthBar.style.width = Math.max(0, player.hp) + '%';
    healthLabel.textContent = Math.max(0, Math.ceil(player.hp));
    healthBar.style.background = player.hp < 30 ? 'linear-gradient(90deg,#ff3b5c,#ff869a)' : 'linear-gradient(90deg,#27e36b,#7dff9e)';
    if (player.hp <= 0) endGame();
}

function addScore(n) { score += Math.round(n); scoreEl.textContent = score; }

function flashMesh(group, color) {
    group.traverse(o => {
        if (o.isMesh && o.material && o.material.emissive !== undefined) {
            if (o.userData._oe === undefined) o.userData._oe = o.material.emissive.getHex();
            o.material.emissive.setHex(color);
            o.material.emissiveIntensity = 1;
            setTimeout(() => { if (o.material) { o.material.emissive.setHex(o.userData._oe); o.material.emissiveIntensity = 0; } }, 90);
        }
    });
}
function setOpacity(group, op) {
    group.traverse(o => { if (o.isMesh && o.material) { o.material.transparent = true; o.material.opacity = op; } });
}

// ----------------------------------------------------------------------------
// Camera follow
// ----------------------------------------------------------------------------
let bobPhase = 0;
const lookDir = new THREE.Vector3();
const lookAt = new THREE.Vector3();
function updateCamera(dt) {
    // head bob while moving
    const moving = (keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'] ||
        keys['ArrowUp'] || keys['ArrowDown'] || keys['ArrowLeft'] || keys['ArrowRight']);
    bobPhase += dt * (keys['ShiftLeft'] || keys['ShiftRight'] ? 16 : 11);
    const bob = moving && player.alive ? Math.sin(bobPhase) * 0.06 : 0;

    camera.position.set(player.pos.x, player.pos.y + EYE_HEIGHT + bob, player.pos.z);
    if (camShake > 0) {
        camera.position.x += (Math.random() - 0.5) * camShake * 0.5;
        camera.position.y += (Math.random() - 0.5) * camShake * 0.5;
        camera.position.z += (Math.random() - 0.5) * camShake * 0.5;
        camShake = Math.max(0, camShake - dt * 4);
    }
    // look direction from yaw/pitch
    const cp = Math.cos(camPitch);
    lookDir.set(Math.sin(camYaw) * cp, Math.sin(camPitch), Math.cos(camYaw) * cp);
    lookAt.copy(camera.position).add(lookDir);
    camera.lookAt(lookAt);

    updateViewmodel(dt, moving);
}

// animate the first-person fists: idle sway + punch thrust
function updateViewmodel(dt, moving) {
    for (const key of ['armR', 'armL']) {
        const f = viewFists[key];
        const base = f.userData.base;
        let thrust = 0, ty = 0;
        if (player.punchTimer > 0 && player.punchArm === key) {
            const k = 1 - (player.punchTimer / 0.26);       // 0 -> 1
            thrust = Math.sin(Math.min(1, k * 1.15) * Math.PI) * 0.95; // punch forward then back
            ty = Math.sin(k * Math.PI) * 0.12;
        }
        const sway = moving ? Math.sin(bobPhase + (key === 'armL' ? Math.PI : 0)) * 0.025 : 0;
        f.position.set(base.x, base.y + sway + ty, base.z - thrust);
        f.rotation.x = -0.15 - thrust * 0.3;
    }
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function lerpAngle(a, b, t) {
    let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    return a + d * t;
}

// ----------------------------------------------------------------------------
// HUD refs / screen helpers
// ----------------------------------------------------------------------------
const titleScreen = document.getElementById('title');
const gameoverScreen = document.getElementById('gameover');
const hud = document.getElementById('hud');
const healthBar = document.getElementById('health-bar');
const healthLabel = document.getElementById('health-label');
const killsEl = document.getElementById('kills');
const waveEl = document.getElementById('wave');
const scoreEl = document.getElementById('score');
const comboEl = document.getElementById('combo');
const comboNum = document.getElementById('combo-num');
const bossBar = document.getElementById('boss-bar');
const bossName = document.getElementById('boss-name');
const bossHealth = document.getElementById('boss-health');
const bannerEl = document.getElementById('banner');
const slamCdEl = document.getElementById('slam-cd');
const goSummary = document.getElementById('go-summary');

let bannerTimer;
function banner(text, color) {
    bannerEl.textContent = text;
    bannerEl.style.color = color || '#fff';
    bannerEl.classList.remove('flash');
    void bannerEl.offsetWidth; // restart animation
    bannerEl.classList.add('flash');
}

const flashDiv = document.createElement('div');
flashDiv.style.cssText = 'position:fixed;inset:0;z-index:29;pointer-events:none;opacity:0;transition:opacity .08s;';
document.body.appendChild(flashDiv);
function screenFlash(hex) {
    flashDiv.style.background = '#' + hex.toString(16).padStart(6, '0');
    flashDiv.style.opacity = '0.5';
    setTimeout(() => flashDiv.style.opacity = '0', 80);
}

const crosshair = document.createElement('div');
crosshair.id = 'crosshair';
crosshair.className = 'hidden';
document.body.appendChild(crosshair);

// ----------------------------------------------------------------------------
// Game flow
// ----------------------------------------------------------------------------
let running = false;
function startGame() {
    // reset
    for (const e of enemies) scene.remove(e.mesh);
    enemies.length = 0;
    player.hp = 100; player.alive = true; player.pos.set(0, 0, 6); player.vel.set(0, 0, 0);
    player.combo = 0; player.comboStep = 0; player.comboTimer = 0;
    kills = 0; score = 0; bossActive = null;
    healthBar.style.width = '100%'; healthLabel.textContent = '100';
    healthBar.style.background = 'linear-gradient(90deg,#27e36b,#7dff9e)';
    killsEl.textContent = '0'; scoreEl.textContent = '0';
    bossBar.classList.add('hidden'); comboEl.classList.remove('show');

    titleScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    crosshair.classList.remove('hidden');
    running = true;
    startWave(1);
    renderer.domElement.requestPointerLock();
}

function endGame() {
    player.alive = false;
    running = false;
    document.exitPointerLock();
    crosshair.classList.add('hidden');
    goSummary.innerHTML = `You smashed <b>${kills}</b> enemies and reached <b>Wave ${waveNum}</b>.<br>Final score <b>${score}</b>.`;
    gameoverScreen.classList.remove('hidden');
}

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('retryBtn').addEventListener('click', startGame);
addEventListener('keydown', e => { if (e.code === 'Escape' && running) { /* pause-ish: release mouse */ } });

// ----------------------------------------------------------------------------
// Main loop
// ----------------------------------------------------------------------------
let last = performance.now();
function loop(now) {
    requestAnimationFrame(loop);
    let dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (hitStopT > 0) { hitStopT -= dt; dt *= 0.15; }

    if (running) {
        updatePlayer(dt);
        updateEnemies(dt);
        updateDirector(dt);
        // slam cd HUD
        slamCdEl.classList.remove('hidden');
        if (player.slamCd > 0) { slamCdEl.classList.add('cooling'); slamCdEl.textContent = 'SLAM ' + player.slamCd.toFixed(1); }
        else { slamCdEl.classList.remove('cooling'); slamCdEl.textContent = 'SLAM (F)'; }
    }
    updateVfx(dt);
    updateCamera(dt);

    // gentle flicker for building bands
    renderer.render(scene, camera);
}
requestAnimationFrame(loop);
