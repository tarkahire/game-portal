// Ability dispatcher — keys are character abilities like "Blue", "Hollow Purple"
// Each runner spawns VFX and resolves damage against fighters.
import * as THREE from 'three';

const TWO_PI = Math.PI * 2;

function hexNumber(c) {
    if (typeof c === 'number') return c;
    return parseInt(String(c).replace('#', ''), 16);
}

// === Active VFX entities ===
// Each has tick(dt, ctx) returning false when expired.
const _vfx = [];

export function getVfxList() { return _vfx; }

export function clearVfx(scene) {
    for (const v of _vfx) {
        if (v.mesh) scene.remove(v.mesh);
    }
    _vfx.length = 0;
}

export function tickVfx(scene, dt, ctx) {
    for (let i = _vfx.length - 1; i >= 0; i--) {
        const v = _vfx[i];
        const alive = v.tick(dt, ctx);
        if (!alive) {
            if (v.mesh) scene.remove(v.mesh);
            _vfx.splice(i, 1);
        }
    }
}

// === Helpers ===
function spawnProjectile(scene, owner, ctx, opts) {
    const {
        color, speed = 30, damage = 12, radius = 0.5, lifetime = 1.2,
        offsetY = 1.2, dirX, dirZ, knockback = 0, aoeRadius = 0
    } = opts;
    const mat = new THREE.MeshBasicMaterial({ color });
    const geo = new THREE.SphereGeometry(radius, 12, 10);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(owner.x, offsetY, owner.z);
    scene.add(mesh);
    const trailLight = new THREE.PointLight(color, 1.4, 6, 2);
    mesh.add(trailLight);

    const v = {
        mesh,
        x: owner.x, y: offsetY, z: owner.z,
        dx: dirX * speed, dz: dirZ * speed,
        life: lifetime,
        damage, knockback, radius, aoeRadius,
        owner,
        hitSet: new Set(),
        tick(dt, ctx) {
            this.life -= dt;
            if (this.life <= 0) return false;
            this.x += this.dx * dt;
            this.z += this.dz * dt;
            this.mesh.position.set(this.x, this.y, this.z);
            // Hit check vs all fighters except owner
            for (const f of ctx.fighters) {
                if (f === this.owner || !f.alive || this.hitSet.has(f)) continue;
                const dx = f.x - this.x, dz = f.z - this.z;
                if (dx * dx + dz * dz < (this.radius + 0.55) ** 2) {
                    this.hitSet.add(f);
                    f.takeDamage(this.damage, this.owner);
                    spawnHitFlash(ctx.scene, f.x, this.y, f.z, color);
                    if (this.aoeRadius > 0) {
                        // splash damage
                        for (const g of ctx.fighters) {
                            if (g === f || g === this.owner || !g.alive) continue;
                            const ddx = g.x - this.x, ddz = g.z - this.z;
                            if (ddx * ddx + ddz * ddz < this.aoeRadius * this.aoeRadius) {
                                g.takeDamage(Math.round(this.damage * 0.6), this.owner);
                            }
                        }
                        spawnExplosion(ctx.scene, this.x, this.y, this.z, color, this.aoeRadius);
                    }
                    if (this.knockback > 0) {
                        const len = Math.hypot(this.dx, this.dz) || 1;
                        f.x += (this.dx / len) * this.knockback;
                        f.z += (this.dz / len) * this.knockback;
                    }
                    if (this.aoeRadius === 0) return false; // single-hit
                }
            }
            // Out of range
            const odx = this.x - this.owner.x, odz = this.z - this.owner.z;
            if (odx * odx + odz * odz > 60 * 60) return false;
            return true;
        }
    };
    _vfx.push(v);
    return v;
}

function spawnHitFlash(scene, x, y, z, color) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), mat);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    const v = {
        mesh, life: 0.25,
        tick(dt) {
            this.life -= dt;
            if (this.life <= 0) return false;
            mesh.scale.setScalar(1 + (0.25 - this.life) * 6);
            mat.opacity = this.life * 3;
            return true;
        }
    };
    _vfx.push(v);
}

function spawnExplosion(scene, x, y, z, color, radius) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), mat);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    const light = new THREE.PointLight(color, 4, radius * 4, 2);
    light.position.set(x, y + 0.5, z);
    scene.add(light);
    const v = {
        mesh, light, life: 0.45,
        tick(dt) {
            this.life -= dt;
            if (this.life <= 0) { scene.remove(light); return false; }
            const t = 1 - this.life / 0.45;
            mesh.scale.setScalar(0.5 + t * radius * 2);
            mat.opacity = (1 - t) * 0.7;
            light.intensity = (1 - t) * 4;
            return true;
        }
    };
    _vfx.push(v);
}

function spawnAOE(scene, owner, ctx, opts) {
    const { color, x, z, radius = 6, damage = 25, lifetime = 0.6 } = opts;
    spawnExplosion(scene, x, 1.2, z, color, radius);
    // Damage all fighters except owner inside radius
    for (const f of ctx.fighters) {
        if (f === owner || !f.alive) continue;
        const dx = f.x - x, dz = f.z - z;
        if (dx * dx + dz * dz < radius * radius) {
            f.takeDamage(damage, owner);
        }
    }
    // Ground ring
    const ringGeo = new THREE.RingGeometry(radius * 0.95, radius * 1.05, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.05, z);
    scene.add(ring);
    const v = {
        mesh: ring, life: lifetime,
        tick(dt) {
            this.life -= dt;
            if (this.life <= 0) return false;
            ringMat.opacity = this.life / lifetime;
            return true;
        }
    };
    _vfx.push(v);
}

function spawnBeam(scene, owner, ctx, opts) {
    const { color, dirX, dirZ, length = 30, width = 0.7, damage = 30, lifetime = 0.5 } = opts;
    const beamGeo = new THREE.CylinderGeometry(width, width, length, 12, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.rotation.z = Math.PI / 2;
    const yaw = Math.atan2(dirX, dirZ);
    const group = new THREE.Group();
    group.add(beam);
    beam.position.set(0, 0, length / 2);
    beam.rotation.x = Math.PI / 2;
    beam.rotation.z = 0;
    group.position.set(owner.x, 1.3, owner.z);
    group.rotation.y = yaw;
    scene.add(group);
    const light = new THREE.PointLight(color, 6, 12, 2);
    light.position.set(owner.x, 1.3, owner.z);
    scene.add(light);

    // Damage line check at start
    const hit = new Set();
    for (const f of ctx.fighters) {
        if (f === owner || !f.alive) continue;
        // Project f onto beam
        const lx = f.x - owner.x, lz = f.z - owner.z;
        const along = lx * dirX + lz * dirZ;
        if (along < 0 || along > length) continue;
        const perp = Math.abs(lx * dirZ - lz * dirX);
        if (perp < width + 0.6) {
            f.takeDamage(damage, owner);
            hit.add(f);
        }
    }

    const v = {
        mesh: group, light, life: lifetime,
        tick(dt) {
            this.life -= dt;
            if (this.life <= 0) { scene.remove(light); return false; }
            const t = this.life / lifetime;
            beamMat.opacity = t * 0.8;
            light.intensity = t * 6;
            return true;
        }
    };
    _vfx.push(v);
}

function spawnDashTrail(scene, fighter, color, lifetime = 0.4) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.8, 8), mat);
    mesh.position.set(fighter.x, 1.0, fighter.z);
    scene.add(mesh);
    const v = {
        mesh, life: lifetime,
        tick(dt) {
            this.life -= dt;
            if (this.life <= 0) return false;
            mat.opacity = this.life / lifetime * 0.6;
            return true;
        }
    };
    _vfx.push(v);
}

// === The dispatcher — maps ability name → effect ===
// owner: Fighter, ctx: { scene, fighters, dirX, dirZ, targetX, targetZ }
export function castAbility(abilityName, owner, ctx) {
    const color = hexNumber(owner.character.color);
    const dirX = ctx.dirX, dirZ = ctx.dirZ;
    const baseDmg = owner.character.attackDamage;
    const buffMul = (performance.now() < owner.buffUntil) ? owner.buffMul : 1;

    switch (abilityName) {
        // ── GOJO ──
        case 'Blue':
            spawnProjectile(ctx.scene, owner, ctx,
                { color: 0x4488ff, dirX, dirZ, damage: 14 * buffMul, radius: 0.7, knockback: -1.5, speed: 28, lifetime: 1.0 });
            break;
        case 'Red':
            spawnProjectile(ctx.scene, owner, ctx,
                { color: 0xff2222, dirX, dirZ, damage: 22 * buffMul, radius: 0.9, knockback: 2.5, aoeRadius: 3, speed: 25, lifetime: 0.9 });
            break;
        case 'Hollow Purple':
            spawnBeam(ctx.scene, owner, ctx,
                { color: 0xaa00ff, dirX, dirZ, length: 40, width: 1.2, damage: 60 * buffMul, lifetime: 0.8 });
            break;
        case 'Domain Expansion':
            spawnAOE(ctx.scene, owner, ctx,
                { color: 0x4488ff, x: owner.x, z: owner.z, radius: 12, damage: 70 * buffMul, lifetime: 1.0 });
            owner.invulnUntil = performance.now() + 800;
            break;
        case 'Teleport':
            // dash forward
            doDash(owner, dirX, dirZ, 12);
            spawnDashTrail(ctx.scene, owner, 0x4488ff);
            break;

        // ── SUKUNA ──
        case 'Dismantle':
            spawnProjectile(ctx.scene, owner, ctx,
                { color: 0xff2244, dirX, dirZ, damage: 18 * buffMul, radius: 0.5, speed: 32, lifetime: 1.0 });
            break;
        case 'Cleave':
            // 3-slash forward cone
            for (let i = -1; i <= 1; i++) {
                const ang = Math.atan2(dirX, dirZ) + i * 0.18;
                const dx = Math.sin(ang), dz = Math.cos(ang);
                spawnProjectile(ctx.scene, owner, ctx,
                    { color: 0xff2244, dirX: dx, dirZ: dz, damage: 12 * buffMul, radius: 0.5, speed: 28, lifetime: 0.7 });
            }
            break;
        case 'Fire Arrow':
            spawnProjectile(ctx.scene, owner, ctx,
                { color: 0xff6600, dirX, dirZ, damage: 30 * buffMul, radius: 0.7, aoeRadius: 4, speed: 30, lifetime: 1.4 });
            break;
        case 'Malevolent Shrine':
            spawnAOE(ctx.scene, owner, ctx,
                { color: 0xff2244, x: owner.x, z: owner.z, radius: 14, damage: 80 * buffMul, lifetime: 1.0 });
            owner.invulnUntil = performance.now() + 800;
            break;

        // ── TOJI ──
        case 'Inverted Spear':
            spawnProjectile(ctx.scene, owner, ctx,
                { color: 0x88cc88, dirX, dirZ, damage: 20 * buffMul, radius: 0.4, speed: 36, lifetime: 1.0, knockback: 1.5 });
            break;
        case 'Chain Strike':
            // 5 fast shots in a fan
            for (let i = 0; i < 5; i++) {
                const ang = Math.atan2(dirX, dirZ) + (i - 2) * 0.12;
                spawnProjectile(ctx.scene, owner, ctx,
                    { color: 0xaaaa44, dirX: Math.sin(ang), dirZ: Math.cos(ang),
                      damage: 8 * buffMul, radius: 0.3, speed: 30, lifetime: 0.8 });
            }
            break;
        case 'Playful Cloud':
            spawnProjectile(ctx.scene, owner, ctx,
                { color: 0x884422, dirX, dirZ, damage: 26 * buffMul, radius: 0.9, speed: 22, lifetime: 1.2, aoeRadius: 3, knockback: 3 });
            break;
        case 'Heavenly Restriction':
            owner.buffUntil = performance.now() + 8000;
            owner.buffMul = 1.8;
            owner.invulnUntil = performance.now() + 600;
            spawnExplosion(ctx.scene, owner.x, 1.3, owner.z, 0x88cc88, 4);
            break;
        case 'Flash Step':
            doDash(owner, dirX, dirZ, 14);
            spawnDashTrail(ctx.scene, owner, 0x88cc88);
            break;

        // ── BROOK ──
        case 'Hanauta Sancho':
            // 3 sword waves
            for (let i = 0; i < 3; i++) {
                setTimeout(() => spawnProjectile(ctx.scene, owner, ctx,
                    { color: 0x88ccff, dirX, dirZ, damage: 12 * buffMul, radius: 0.6, speed: 26, lifetime: 0.9 }), i * 120);
            }
            break;
        case 'Soul Solid':
            spawnProjectile(ctx.scene, owner, ctx,
                { color: 0x4488ff, dirX, dirZ, damage: 22 * buffMul, radius: 0.5, speed: 30, lifetime: 1.0 });
            break;
        case 'Blizzard Slice':
            spawnAOE(ctx.scene, owner, ctx,
                { color: 0x88ccff, x: owner.x + dirX * 6, z: owner.z + dirZ * 6, radius: 6, damage: 40 * buffMul });
            break;
        case 'Soul King':
            spawnAOE(ctx.scene, owner, ctx,
                { color: 0x4488ff, x: owner.x, z: owner.z, radius: 12, damage: 70 * buffMul });
            owner.invulnUntil = performance.now() + 800;
            break;

        // ── DENJI ──
        case 'Chain Rip':
            spawnProjectile(ctx.scene, owner, ctx,
                { color: 0xffaa00, dirX, dirZ, damage: 16 * buffMul, radius: 0.5, speed: 28, lifetime: 1.0 });
            break;
        case 'Buzzsaw':
            // 4 spinning saws
            for (let i = 0; i < 4; i++) {
                const ang = Math.atan2(dirX, dirZ) + (i - 1.5) * 0.25;
                spawnProjectile(ctx.scene, owner, ctx,
                    { color: 0xff6600, dirX: Math.sin(ang), dirZ: Math.cos(ang),
                      damage: 10 * buffMul, radius: 0.5, speed: 26, lifetime: 1.2 });
            }
            break;
        case 'Devil Charge':
            doDash(owner, dirX, dirZ, 16);
            spawnDashTrail(ctx.scene, owner, 0xff4400);
            // Damage anyone in path
            setTimeout(() => spawnAOE(ctx.scene, owner, ctx,
                { color: 0xff4400, x: owner.x, z: owner.z, radius: 4, damage: 30 * buffMul, lifetime: 0.4 }), 80);
            break;
        case 'Full Devil':
            owner.buffUntil = performance.now() + 8000;
            owner.buffMul = 2.0;
            owner.invulnUntil = performance.now() + 800;
            spawnExplosion(ctx.scene, owner.x, 1.3, owner.z, 0xff4400, 5);
            break;
        case 'Chain Dash':
            doDash(owner, dirX, dirZ, 18);
            spawnDashTrail(ctx.scene, owner, 0xffaa00);
            break;

        // ── MEGUMI ──
        case 'Divine Dog':
            // 2 homing projectiles (simplified)
            for (let i = 0; i < 2; i++) {
                const ang = Math.atan2(dirX, dirZ) + (i - 0.5) * 0.4;
                spawnProjectile(ctx.scene, owner, ctx,
                    { color: 0xeeeeee, dirX: Math.sin(ang), dirZ: Math.cos(ang),
                      damage: 12 * buffMul, radius: 0.55, speed: 24, lifetime: 1.6 });
            }
            break;
        case 'Mahoraga':
            spawnAOE(ctx.scene, owner, ctx,
                { color: 0x222244, x: owner.x + dirX * 5, z: owner.z + dirZ * 5, radius: 8, damage: 75 * buffMul });
            break;
        case 'Nue':
            spawnProjectile(ctx.scene, owner, ctx,
                { color: 0x6644aa, dirX, dirZ, damage: 22 * buffMul, radius: 0.7, speed: 30, lifetime: 1.4 });
            break;
        case 'Chimera Shadow Garden':
            spawnAOE(ctx.scene, owner, ctx,
                { color: 0x1a237e, x: owner.x, z: owner.z, radius: 11, damage: 65 * buffMul });
            owner.invulnUntil = performance.now() + 700;
            break;
        case 'Shadow Dash':
            doDash(owner, dirX, dirZ, 12);
            spawnDashTrail(ctx.scene, owner, 0x1a237e);
            break;

        // ── YOH ──
        case 'Celestial Slash':
            spawnProjectile(ctx.scene, owner, ctx,
                { color: 0xffeebb, dirX, dirZ, damage: 18 * buffMul, radius: 0.7, speed: 30, lifetime: 1.0 });
            break;
        case 'Buddha Giri':
            doDash(owner, dirX, dirZ, 10);
            spawnDashTrail(ctx.scene, owner, 0xffaa44);
            setTimeout(() => spawnAOE(ctx.scene, owner, ctx,
                { color: 0xffaa44, x: owner.x, z: owner.z, radius: 4, damage: 28 * buffMul, lifetime: 0.4 }), 80);
            break;
        case 'Double Medium':
            // 12-hit flurry
            for (let i = 0; i < 12; i++) {
                setTimeout(() => spawnProjectile(ctx.scene, owner, ctx,
                    { color: 0xffeeaa, dirX, dirZ, damage: 5 * buffMul, radius: 0.4, speed: 32, lifetime: 0.6 }), i * 70);
            }
            break;
        case 'Fumon Tonkou':
            spawnAOE(ctx.scene, owner, ctx,
                { color: 0xffaa44, x: owner.x, z: owner.z, radius: 11, damage: 60 * buffMul });
            break;
        case 'Spirit Dash':
            doDash(owner, dirX, dirZ, 14);
            spawnDashTrail(ctx.scene, owner, 0xffeeaa);
            break;

        // ── REN ──
        case 'Rapid Tempo Assault':
            for (let i = 0; i < 6; i++) {
                setTimeout(() => spawnProjectile(ctx.scene, owner, ctx,
                    { color: 0xaa66ff, dirX, dirZ, damage: 9 * buffMul, radius: 0.4, speed: 32, lifetime: 0.8 }), i * 90);
            }
            break;
        case 'Eleki Bang':
            spawnAOE(ctx.scene, owner, ctx,
                { color: 0xaa66ff, x: owner.x, z: owner.z, radius: 8, damage: 45 * buffMul });
            break;
        case 'Heaven Shaking Thunder':
            for (let i = 0; i < 3; i++) {
                const ang = Math.atan2(dirX, dirZ) + (i - 1) * 0.4;
                const tx = owner.x + Math.sin(ang) * 8;
                const tz = owner.z + Math.cos(ang) * 8;
                spawnAOE(ctx.scene, owner, ctx,
                    { color: 0xddaa00, x: tx, z: tz, radius: 4, damage: 25 * buffMul });
            }
            break;
        case 'Golden Thunder':
            for (let i = 0; i < 5; i++) {
                const ang = (i / 5) * TWO_PI;
                const tx = owner.x + Math.sin(ang) * 6;
                const tz = owner.z + Math.cos(ang) * 6;
                spawnAOE(ctx.scene, owner, ctx,
                    { color: 0xffdd44, x: tx, z: tz, radius: 4, damage: 30 * buffMul });
            }
            owner.invulnUntil = performance.now() + 600;
            break;
        case 'Thunder Dash':
            doDash(owner, dirX, dirZ, 14);
            spawnDashTrail(ctx.scene, owner, 0xaa66ff);
            break;

        // ── HOROHORO ──
        case 'Fist Slam':
            spawnAOE(ctx.scene, owner, ctx,
                { color: 0x66ccff, x: owner.x + dirX * 4, z: owner.z + dirZ * 4, radius: 5, damage: 30 * buffMul });
            break;
        case 'Ice Barrage':
            for (let i = 0; i < 8; i++) {
                const ang = Math.atan2(dirX, dirZ) + (i - 3.5) * 0.18;
                spawnProjectile(ctx.scene, owner, ctx,
                    { color: 0x88ddff, dirX: Math.sin(ang), dirZ: Math.cos(ang),
                      damage: 8 * buffMul, radius: 0.4, speed: 28, lifetime: 1.2 });
            }
            break;
        case 'Blizzard':
            spawnAOE(ctx.scene, owner, ctx,
                { color: 0x88ddff, x: owner.x, z: owner.z, radius: 10, damage: 50 * buffMul });
            break;
        case 'Avalanche':
            // 200-spike wall, simplified to 14 cone projectiles
            for (let i = 0; i < 14; i++) {
                const ang = Math.atan2(dirX, dirZ) + (i - 6.5) * 0.1;
                spawnProjectile(ctx.scene, owner, ctx,
                    { color: 0xccffff, dirX: Math.sin(ang), dirZ: Math.cos(ang),
                      damage: 7 * buffMul, radius: 0.5, speed: 26, lifetime: 1.4 });
            }
            break;
        case 'Ice Dash':
            doDash(owner, dirX, dirZ, 13);
            spawnDashTrail(ctx.scene, owner, 0x88ddff);
            break;

        // ── TODO ──
        case 'Black Flash':
            spawnProjectile(ctx.scene, owner, ctx,
                { color: 0xeeff00, dirX, dirZ, damage: 50 * buffMul, radius: 0.6, speed: 36, lifetime: 0.9, aoeRadius: 3 });
            break;
        case 'Face Slam':
            doDash(owner, dirX, dirZ, 12);
            setTimeout(() => spawnAOE(ctx.scene, owner, ctx,
                { color: 0xd4a070, x: owner.x, z: owner.z, radius: 4, damage: 35 * buffMul, lifetime: 0.4 }), 80);
            break;
        case 'Boulder Kick':
            spawnProjectile(ctx.scene, owner, ctx,
                { color: 0x886644, dirX, dirZ, damage: 30 * buffMul, radius: 1.0, speed: 22, lifetime: 1.2, aoeRadius: 4, knockback: 4 });
            break;

        // ── YUTA ──
        case 'Rika':
            // Big melee swing AOE
            spawnAOE(ctx.scene, owner, ctx,
                { color: 0x5a8aff, x: owner.x + dirX * 5, z: owner.z + dirZ * 5, radius: 7, damage: 45 * buffMul });
            break;
        case 'Crush':
            spawnAOE(ctx.scene, owner, ctx,
                { color: 0x5a8aff, x: owner.x + dirX * 4, z: owner.z + dirZ * 4, radius: 5, damage: 60 * buffMul });
            break;
        case 'Reverse Cursed Technique':
            // Heal
            owner.hp = Math.min(owner.maxHp, owner.hp + 60);
            owner.takeDamage(0); // refresh hp bar
            spawnExplosion(ctx.scene, owner.x, 1.3, owner.z, 0x88ffaa, 4);
            break;
        case 'True Love Beam':
            spawnBeam(ctx.scene, owner, ctx,
                { color: 0xff66cc, dirX, dirZ, length: 36, width: 1.4, damage: 65 * buffMul, lifetime: 0.8 });
            break;

        // ── DEFAULT ──
        default:
            // Generic projectile fallback so all abilities do *something*
            spawnProjectile(ctx.scene, owner, ctx,
                { color, dirX, dirZ, damage: 14 * buffMul, radius: 0.5, speed: 28, lifetime: 1.0 });
            break;
    }
}

function doDash(fighter, dirX, dirZ, distance) {
    fighter.dashUntil = performance.now() + 220;
    fighter.invulnUntil = performance.now() + 220;
    // Apply dash by directly translating
    fighter.x += dirX * distance;
    fighter.z += dirZ * distance;
}

// M1 melee — short forward swing, hits all in arc
export function castM1(owner, ctx) {
    const reach = 2.6;
    const arc = Math.PI / 3;  // 60 deg
    const dirAng = Math.atan2(ctx.dirX, ctx.dirZ);
    let hit = false;
    for (const f of ctx.fighters) {
        if (f === owner || !f.alive) continue;
        const dx = f.x - owner.x, dz = f.z - owner.z;
        const dist = Math.hypot(dx, dz);
        if (dist > reach) continue;
        const ang = Math.atan2(dx, dz);
        let diff = ang - dirAng;
        while (diff > Math.PI) diff -= TWO_PI;
        while (diff < -Math.PI) diff += TWO_PI;
        if (Math.abs(diff) < arc) {
            const buffMul = (performance.now() < owner.buffUntil) ? owner.buffMul : 1;
            f.takeDamage(owner.character.attackDamage * buffMul, owner);
            spawnHitFlash(ctx.scene, f.x, 1.2, f.z, hexNumber(owner.character.color));
            hit = true;
        }
    }
    owner.attackAnimT = 0.25;
    return hit;
}
