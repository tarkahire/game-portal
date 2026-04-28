// VFX helpers — ported from dungeon-crawler-3d/src/main.js (lines 2766-3455)
// Provides: particle emitter pool, ground rings/decals, light flashes,
// beams, fire effects, melee slashes, punch impacts, hitstop, dmg numbers.
// Module-level scene + camera are set via init(scene, camera) at game start.

import * as THREE from 'three';

const TILE = 4;

let _scene = null;
let _camera = null;

export function initVfx(scene, camera) {
    _scene = scene;
    _camera = camera;
    _hitstopUntil = 0;
}

// ─── HITSTOP ──────────────────────────────────────────────
let _hitstopUntil = 0;
export function triggerHitstop(durationMs) {
    _hitstopUntil = Math.max(_hitstopUntil, performance.now() + durationMs);
}
export function inHitstop() { return performance.now() < _hitstopUntil; }

// ─── DAMAGE NUMBERS ────────────────────────────────────────
const _dmgNumbers = [];
export function spawnDmgNumber(worldX, worldY, worldZ, amount, color) {
    if (!_scene) return;
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 48;
    const ctx = canvas.getContext('2d');
    ctx.font = `bold ${amount > 20 ? 36 : 28}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(amount, 66, 36);
    ctx.fillStyle = color || '#ffffff';
    ctx.fillText(amount, 64, 34);
    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    const s = amount > 30 ? 1.8 : amount > 15 ? 1.3 : 0.9;
    sprite.scale.set(s, s * 0.4, 1);
    sprite.position.set(worldX + (Math.random() - 0.5) * 0.5, worldY, worldZ + (Math.random() - 0.5) * 0.5);
    _scene.add(sprite);
    _dmgNumbers.push({ sprite, life: 40, vy: 0.04 + Math.random() * 0.02 });
}

export function updateDmgNumbers() {
    for (let i = _dmgNumbers.length - 1; i >= 0; i--) {
        const d = _dmgNumbers[i];
        d.life--;
        d.sprite.position.y += d.vy;
        d.sprite.material.opacity = d.life / 40;
        if (d.life <= 0) {
            _scene.remove(d.sprite);
            d.sprite.material.map.dispose();
            d.sprite.material.dispose();
            _dmgNumbers.splice(i, 1);
        }
    }
}

// ─── PARTICLE POOL ────────────────────────────────────────
const PARTICLE_POOL_SIZE = 300;
const _particles = [];
let _particlePoolReady = false;

function initParticlePool() {
    if (_particlePoolReady || !_scene) return;
    _particlePoolReady = true;
    const geo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
        const mat = new THREE.MeshBasicMaterial({
            color: '#ffffff', transparent: true, opacity: 0,
            side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false;
        _scene.add(mesh);
        _particles.push({ mesh, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0, size: 1, sizeEnd: 0, gravity: 0, drag: 0 });
    }
}

export function emitParticles(x, y, z, config) {
    initParticlePool();
    const c = config;
    const count = c.count || 10;
    const colors = Array.isArray(c.color) ? c.color : [c.color || '#ff6600'];
    for (let i = 0; i < count; i++) {
        let p = null;
        for (const pp of _particles) { if (!pp.mesh.visible) { p = pp; break; } }
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
            p.vx = c.direction.x * spd + (Math.random() - 0.5) * spd * 0.4;
            p.vy = c.direction.y * spd + (Math.random() - 0.5) * spd * 0.3;
            p.vz = c.direction.z * spd + (Math.random() - 0.5) * spd * 0.4;
        } else {
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

export function updateParticles(dt) {
    for (const p of _particles) {
        if (!p.mesh.visible) continue;
        p.life--;
        if (p.life <= 0) { p.mesh.visible = false; continue; }
        const t = p.life / p.maxLife;
        p.vx *= p.drag; p.vy *= p.drag; p.vz *= p.drag;
        p.vy += p.gravity * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.mesh.material.opacity = t * (p.maxLife > 30 ? 0.7 : 1);
        const s = p.sizeEnd + (p.size - p.sizeEnd) * t;
        p.mesh.scale.setScalar(s);
        if (_camera) p.mesh.lookAt(_camera.position);
    }
}

// ─── GROUND RINGS / DECALS ─────────────────────────────────
export function groundRing(x, z, color, maxRadius, duration) {
    if (!_scene) return;
    const geo = new THREE.RingGeometry(0.1, 0.3, 24);
    const mat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.8,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.set(x, 0.08, z);
    ring.rotation.x = -Math.PI / 2;
    _scene.add(ring);
    const dur = duration || 600;
    const startTime = performance.now();
    const tick = () => {
        const elapsed = performance.now() - startTime;
        const t = elapsed / dur;
        if (t >= 1) { _scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); return; }
        const r = t * (maxRadius || 3);
        ring.scale.setScalar(r);
        mat.opacity = (1 - t) * 0.8;
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

export function groundDecal(x, z, color, radius, duration) {
    if (!_scene) return;
    const geo = new THREE.CircleGeometry(radius || 1.5, 16);
    const mat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.5,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const decal = new THREE.Mesh(geo, mat);
    decal.position.set(x, 0.06, z);
    decal.rotation.x = -Math.PI / 2;
    _scene.add(decal);
    const dur = duration || 2000;
    setTimeout(() => {
        const fadeStart = performance.now();
        const fade = () => {
            const t = (performance.now() - fadeStart) / 500;
            if (t >= 1) { _scene.remove(decal); decal.geometry.dispose(); decal.material.dispose(); return; }
            mat.opacity = (1 - t) * 0.5;
            requestAnimationFrame(fade);
        };
        fade();
    }, dur);
}

// ─── LIGHT FLASH ──────────────────────────────────────────
export function lightFlash(x, y, z, color, intensity, duration) {
    if (!_scene) return;
    const light = new THREE.PointLight(color, intensity || 3, TILE * 6, 2);
    light.position.set(x, y, z);
    _scene.add(light);
    const dur = duration || 200;
    const startTime = performance.now();
    const tick = () => {
        const t = (performance.now() - startTime) / dur;
        if (t >= 1) { _scene.remove(light); return; }
        light.intensity = (1 - t) * (intensity || 3);
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

// ─── SCREEN FLASH ─────────────────────────────────────────
export function screenFlash(color, duration) {
    const flash = document.createElement('div');
    flash.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:${color};opacity:0.4;z-index:5;pointer-events:none;transition:opacity ${duration || 300}ms;`;
    document.body.appendChild(flash);
    setTimeout(() => { flash.style.opacity = '0'; }, 20);
    setTimeout(() => flash.remove(), (duration || 300) + 50);
}

// ─── SCREEN SHAKE (no-op, matches dungeon-crawler-3d) ──────
export function screenShake() { /* disabled */ }

// ─── BEAM EFFECT ──────────────────────────────────────────
export function beamEffect(startX, startY, startZ, endX, endY, endZ, color, duration, width) {
    if (!_scene) return;
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
    _scene.add(beam);

    const glow = new THREE.PointLight(color, 3, TILE * 4, 2);
    glow.position.set(midX, midY, midZ);
    _scene.add(glow);

    const outerGeo = new THREE.CylinderGeometry((width || 0.15) * 2.5, (width || 0.15) * 2.5, len, 6);
    const outerMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.2,
        blending: THREE.AdditiveBlending, depthWrite: false
    });
    const outer = new THREE.Mesh(outerGeo, outerMat);
    outer.position.copy(beam.position);
    outer.rotation.copy(beam.rotation);
    _scene.add(outer);

    const steps = Math.max(3, Math.round(len / 2));
    for (let i = 0; i < steps; i++) {
        const t = i / steps;
        emitParticles(
            startX + dx * t, startY + dy * t, startZ + dz * t,
            { color: [color, '#ffffff'], count: 3, speed: 1.5, spread: 0.3,
              gravity: 0, life: 10, size: 0.15, sizeEnd: 0, drag: 0.95 }
        );
    }

    const dur = duration || 400;
    const startTime = performance.now();
    const tick = () => {
        const elapsed = performance.now() - startTime;
        const t = 1 - elapsed / dur;
        if (t <= 0) {
            _scene.remove(beam); _scene.remove(outer); _scene.remove(glow);
            beam.geometry.dispose(); beam.material.dispose();
            outer.geometry.dispose(); outer.material.dispose();
            return;
        }
        mat.opacity = t * 0.9;
        outerMat.opacity = t * 0.2;
        glow.intensity = t * 3;
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

// ─── FIRE EFFECT ──────────────────────────────────────────
export function fireEffect(x, y, z, intensity) {
    const n = intensity || 1;
    emitParticles(x, y, z, {
        color: ['#ff6600', '#ff8800', '#ffaa00', '#ffcc00', '#ff4400'],
        count: Math.round(20 * n), speed: 3 * n, spread: 0.5 * n,
        gravity: -2, life: 20, lifeVar: 15, size: 0.3 * n, sizeEnd: 0.05,
        upward: 1.5, drag: 0.96
    });
    emitParticles(x, y, z, {
        color: ['#ff4400', '#cc2200'], count: Math.round(8 * n),
        speed: 1.5, spread: 0.3, gravity: -1, life: 30, lifeVar: 20,
        size: 0.1, sizeEnd: 0, upward: 2, drag: 0.99
    });
    lightFlash(x, y, z, '#ff6600', 3 * n, 300);
}

// ─── PUNCH IMPACT ────────────────────────────────────────
export function spawnPunchImpact(wx, wy, wz, color) {
    if (!_scene || !_camera) return;
    const palette = color || '#ffffff';

    const coreGeo = new THREE.CircleGeometry(0.4, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(wx, wy, wz);
    core.lookAt(_camera.position);
    _scene.add(core);
    const coreStart = performance.now();
    const animateCore = () => {
        const t = (performance.now() - coreStart) / 220;
        if (t >= 1) { _scene.remove(core); coreGeo.dispose(); coreMat.dispose(); return; }
        core.scale.setScalar(1 + t * 2.2);
        coreMat.opacity = (1 - t) * 1;
        requestAnimationFrame(animateCore);
    };
    requestAnimationFrame(animateCore);

    const ringGeo = new THREE.RingGeometry(0.2, 0.55, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: palette, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(wx, wy, wz);
    ring.lookAt(_camera.position);
    _scene.add(ring);
    const ringStart = performance.now();
    const animateRing = () => {
        const t = (performance.now() - ringStart) / 350;
        if (t >= 1) { _scene.remove(ring); ringGeo.dispose(); ringMat.dispose(); return; }
        ring.scale.setScalar(1 + t * 5);
        ringMat.opacity = (1 - t) * 0.95;
        requestAnimationFrame(animateRing);
    };
    requestAnimationFrame(animateRing);

    for (let i = 0; i < 9; i++) {
        const angle = (i / 9) * Math.PI * 2 + Math.random() * 0.3;
        const lineGeo = new THREE.PlaneGeometry(0.9, 0.07);
        const lineMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.position.set(wx, wy, wz);
        line.lookAt(_camera.position);
        line.rotateZ(angle);
        line.translateX(0.55);
        _scene.add(line);
        const lStart = performance.now();
        const animateLine = () => {
            const t = (performance.now() - lStart) / 260;
            if (t >= 1) { _scene.remove(line); lineGeo.dispose(); lineMat.dispose(); return; }
            line.scale.x = 1 + t * 3;
            lineMat.opacity = (1 - t) * 0.95;
            requestAnimationFrame(animateLine);
        };
        requestAnimationFrame(animateLine);
    }

    emitParticles(wx, wy, wz, {
        color: ['#ffffff', palette, '#ffeecc', '#ffaa55'],
        count: 18, speed: 7, spread: 0.5,
        gravity: -3, life: 12, size: 0.13, sizeEnd: 0, drag: 0.92
    });

    lightFlash(wx, wy, wz, palette, 4, 200);
}

// ─── IMPACT SPARKS ────────────────────────────────────────
const _sparkPool = [];
let _sparkPoolInit = false;

function initSparkPool() {
    if (_sparkPoolInit || !_scene) return;
    _sparkPoolInit = true;
    for (let i = 0; i < 30; i++) {
        const geo = new THREE.SphereGeometry(0.08, 4, 4);
        const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false;
        _scene.add(mesh);
        _sparkPool.push({ mesh, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0 });
    }
}

export function spawnImpactSparks(worldX, worldY, worldZ, color, count) {
    initSparkPool();
    for (let i = 0; i < count; i++) {
        let spark = null;
        for (const s of _sparkPool) { if (!s.mesh.visible) { spark = s; break; } }
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

export function updateSparks() {
    for (const sp of _sparkPool) {
        if (!sp.mesh.visible) continue;
        sp.life--;
        sp.mesh.position.x += sp.vx * 0.016;
        sp.mesh.position.y += sp.vy * 0.016;
        sp.mesh.position.z += sp.vz * 0.016;
        sp.vy -= 15 * 0.016;
        sp.mesh.material.opacity = sp.life / sp.maxLife;
        sp.mesh.scale.setScalar(sp.life / sp.maxLife);
        if (sp.life <= 0) sp.mesh.visible = false;
    }
}

// ─── MELEE SLASH ─────────────────────────────────────────
const _slashPool = [];
const _slashTrails = [];
let _slashPoolInit = false;

function initSlashPool() {
    if (_slashPoolInit || !_scene) return;
    _slashPoolInit = true;
    for (let i = 0; i < 8; i++) {
        const geo = new THREE.PlaneGeometry(2.0, 0.4, 12, 1);
        const pos = geo.attributes.position;
        for (let v = 0; v < pos.count; v++) {
            const x = pos.getX(v);
            const t = (x + 1) / 2;
            pos.setY(v, pos.getY(v) + Math.sin(t * Math.PI) * 0.6);
        }
        geo.computeVertexNormals();
        const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false;
        _scene.add(mesh);
        _slashPool.push(mesh);
    }
}

// Spawn a melee slash plane in front of (casterX, casterZ), facing along yaw.
// step is the M1 combo step (0..3) — alternates the slash diagonal angle.
export function spawnMeleeSlash(color, casterX, casterY, casterZ, yaw, step) {
    if (!_camera) return;
    initSlashPool();
    const dirX = -Math.sin(yaw);
    const dirZ = -Math.cos(yaw);
    const baseX = casterX + dirX * 2;
    const baseY = casterY + 0;
    const baseZ = casterZ + dirZ * 2;
    const angles = [0.7, -0.7, 0.5, -0.9];
    const tilt = angles[(step | 0) % 4];

    for (let t = 0; t < 2; t++) {
        let mesh = null;
        for (const s of _slashPool) { if (!s.visible) { mesh = s; break; } }
        if (!mesh) continue;
        mesh.position.set(baseX, baseY, baseZ);
        mesh.lookAt(_camera.position);
        mesh.rotateZ(tilt + t * 0.15);
        mesh.material.color.set(color);
        mesh.material.opacity = t === 0 ? 0.9 : 0.5;
        const sc = 0.8 + t * 0.3;
        mesh.scale.set(sc, sc, sc);
        mesh.visible = true;
        _slashTrails.push({ mesh, life: 8 + t * 3, maxLife: 8 + t * 3 });
    }
}

export function updateMeleeSlashes() {
    for (let i = _slashTrails.length - 1; i >= 0; i--) {
        const s = _slashTrails[i];
        s.life--;
        const t = s.life / s.maxLife;
        s.mesh.material.opacity = t * 0.85;
        s.mesh.scale.multiplyScalar(1.03);
        if (s.life <= 0) {
            s.mesh.visible = false;
            _slashTrails.splice(i, 1);
        }
    }
}

// ─── TICK ALL VFX ─────────────────────────────────────────
export function tickAllVfx(dt) {
    updateParticles(dt);
    updateSparks();
    updateMeleeSlashes();
    updateDmgNumbers();
}
