// Ability dispatcher with VFX signatures matching dungeon-crawler-3d.
// Each ability spawns the same visual shapes (orbs, rings, beams, particles)
// as the source, scaled for BR's caster-vs-fighters model.
import * as THREE from 'three';
import {
    emitParticles, groundRing, groundDecal, lightFlash, screenFlash,
    beamEffect, fireEffect, spawnPunchImpact, spawnImpactSparks,
    spawnDmgNumber, spawnMeleeSlash, triggerHitstop
} from './vfx.js';

const TILE = 4;
const EYE_HEIGHT = 2.4;

// ─── Active VFX entities (orbs, projectiles) — ticked each frame ─
const _vfx = [];
// Shared unit-radius geometry for projectile spheres. We scale the mesh
// per-instance so we never allocate (and never have to dispose) GPU
// buffers for ordinary projectiles. Fixes the major-GC freezes that
// were hitting after a few minutes of bot ability spam.
const PROJECTILE_GEO = new THREE.SphereGeometry(1, 10, 8);
function _disposeVfxMesh(scene, mesh) {
    if (!mesh) return;
    scene.remove(mesh);
    if (mesh.material) {
        if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose && m.dispose());
        else mesh.material.dispose && mesh.material.dispose();
    }
    // Geometry is shared (PROJECTILE_GEO) for projectiles; the orb-style
    // entries that build their own geometry use a `cleanup` callback and
    // never reach this path.
}
export function getVfxList() { return _vfx; }
export function clearVfx(scene) {
    for (const v of _vfx) {
        if (v.cleanup) v.cleanup();
        else _disposeVfxMesh(scene, v.mesh);
    }
    _vfx.length = 0;
}

export function tickVfx(scene, dt, ctx) {
    for (let i = _vfx.length - 1; i >= 0; i--) {
        const v = _vfx[i];
        const alive = v.tick(dt, ctx);
        if (!alive) {
            if (v.cleanup) v.cleanup();
            else _disposeVfxMesh(scene, v.mesh);
            _vfx.splice(i, 1);
        }
    }
}

// ─── Helper: spawn a flying projectile ─────────────────────
function spawnProjectile(scene, owner, ctx, opts) {
    const {
        color = '#ffffff', speed = 30, damage = 12, radius = 0.5,
        lifetime = 1.2, offsetY = 1.2, dirX, dirZ,
        knockback = 0, aoeRadius = 0, trailColor
    } = opts;
    const mat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false
    });
    const mesh = new THREE.Mesh(PROJECTILE_GEO, mat);
    mesh.scale.setScalar(radius);
    mesh.position.set(owner.x, offsetY, owner.z);
    scene.add(mesh);
    // Each projectile used to carry its own PointLight; with bots firing
    // ability salvos that meant 30+ active lights blowing up the forward
    // shader cost. The MeshBasicMaterial is unlit anyway — additive
    // blending already makes the orb glow on its own.

    _vfx.push({
        mesh,
        x: owner.x, y: offsetY, z: owner.z,
        dx: dirX * speed, dz: dirZ * speed,
        life: lifetime,
        damage, knockback, radius, aoeRadius, owner,
        hitSet: new Set(),
        trailColor: trailColor || color,
        tick(dt, c) {
            this.life -= dt;
            if (this.life <= 0) return false;
            this.x += this.dx * dt;
            this.z += this.dz * dt;
            this.mesh.position.set(this.x, this.y, this.z);
            // Particle trail
            if (Math.random() < 0.7) {
                emitParticles(this.x, this.y, this.z, {
                    color: [this.trailColor, '#ffffff'], count: 1,
                    speed: 0.8, spread: 0.2, gravity: 0,
                    life: 8, size: 0.12, sizeEnd: 0, drag: 0.95
                });
            }
            // Hit check
            for (const f of c.fighters) {
                if (f === this.owner || !f.alive || this.hitSet.has(f)) continue;
                const ddx = f.x - this.x, ddz = f.z - this.z;
                if (ddx * ddx + ddz * ddz < (this.radius + 0.55) ** 2) {
                    this.hitSet.add(f);
                    f.takeDamage(this.damage, this.owner);
                    spawnImpactSparks(f.x, this.y, f.z, color, 6);
                    spawnDmgNumber(f.x, this.y + 0.5, f.z, Math.round(this.damage), color);
                    if (this.aoeRadius > 0) {
                        for (const g of c.fighters) {
                            if (g === f || g === this.owner || !g.alive) continue;
                            const gdx = g.x - this.x, gdz = g.z - this.z;
                            if (gdx * gdx + gdz * gdz < this.aoeRadius * this.aoeRadius) {
                                const dmg = Math.round(this.damage * 0.6);
                                g.takeDamage(dmg, this.owner);
                                spawnDmgNumber(g.x, this.y + 0.5, g.z, dmg, color);
                            }
                        }
                        explosion(scene, this.x, this.y, this.z, color, this.aoeRadius);
                    }
                    if (this.knockback !== 0) {
                        const len = Math.hypot(this.dx, this.dz) || 1;
                        f.x += (this.dx / len) * this.knockback;
                        f.z += (this.dz / len) * this.knockback;
                        f.mesh.position.set(f.x, 0, f.z);
                    }
                    if (this.aoeRadius === 0) return false;
                }
            }
            const od = Math.hypot(this.x - this.owner.x, this.z - this.owner.z);
            if (od > 50) return false;
            return true;
        }
    });
}

function explosion(scene, x, y, z, color, radius) {
    lightFlash(x, y, z, color, 5, 350);
    groundRing(x, z, color, radius, 500);
    emitParticles(x, y, z, {
        color: [color, '#ffffff', '#ffaa44'],
        count: 30, speed: 8, spread: 0.5, gravity: -3,
        life: 18, lifeVar: 8, size: 0.25, sizeEnd: 0, drag: 0.93, upward: 1.2
    });
}

// ─── AOE around a center: damage all fighters except caster ──
function applyAOE(scene, caster, fighters, x, z, radius, damage, color) {
    for (const f of fighters) {
        if (f === caster || !f.alive) continue;
        const dx = f.x - x, dz = f.z - z;
        if (dx * dx + dz * dz < radius * radius) {
            f.takeDamage(damage, caster);
            spawnImpactSparks(f.x, EYE_HEIGHT * 0.5, f.z, color, 5);
            spawnDmgNumber(f.x, EYE_HEIGHT * 0.7, f.z, Math.round(damage), color);
        }
    }
    explosion(scene, x, 1.2, z, color, radius);
}

// ─── Dash: translate caster + i-frames + speed lines ────────
function doDash(caster, dirX, dirZ, distance) {
    caster.invulnUntil = performance.now() + 240;
    caster.x += dirX * distance;
    caster.z += dirZ * distance;
    caster.mesh.position.set(caster.x, 0, caster.z);
}

// ─── Pull enemies toward a target point over a duration ─────
function pullEnemiesOverTime(scene, caster, fighters, tx, tz, range, strength, duration, dmgEvery, dmg, color) {
    const start = performance.now();
    let nextDmg = start + dmgEvery;
    _vfx.push({
        cleanup() {},
        tick(dt, c) {
            const elapsed = performance.now() - start;
            if (elapsed > duration) return false;
            // Pull
            for (const f of c.fighters) {
                if (f === caster || !f.alive) continue;
                const dx = tx - f.x, dz = tz - f.z;
                const d = Math.hypot(dx, dz);
                if (d < range && d > 0.5) {
                    f.x += (dx / d) * strength * dt;
                    f.z += (dz / d) * strength * dt;
                    f.mesh.position.set(f.x, 0, f.z);
                }
            }
            // Damage tick
            if (performance.now() >= nextDmg) {
                nextDmg += dmgEvery;
                for (const f of c.fighters) {
                    if (f === caster || !f.alive) continue;
                    const dx = tx - f.x, dz = tz - f.z;
                    if (dx * dx + dz * dz < range * range) {
                        f.takeDamage(dmg, caster);
                        spawnDmgNumber(f.x, EYE_HEIGHT * 0.7, f.z, Math.round(dmg), color);
                    }
                }
                emitParticles(tx, EYE_HEIGHT * 0.6, tz, {
                    color: [color, '#ffffff'], count: 5, speed: 2, spread: 2.5,
                    gravity: 0, life: 8, size: 0.08, sizeEnd: 0, drag: 0.9
                });
            }
            return true;
        }
    });
}

// ─── Long beam line — damage everyone along it ──────────────
function castBeamLine(scene, caster, fighters, dirX, dirZ, length, damage, color) {
    const sx = caster.x, sy = EYE_HEIGHT * 0.7, sz = caster.z;
    const ex = sx + dirX * length, ey = sy, ez = sz + dirZ * length;
    beamEffect(sx, sy, sz, ex, ey, ez, color, 600, 0.5);
    // Hit anyone within 1.0 perpendicular distance, in front
    for (const f of fighters) {
        if (f === caster || !f.alive) continue;
        const lx = f.x - sx, lz = f.z - sz;
        const along = lx * dirX + lz * dirZ;
        if (along < 0 || along > length) continue;
        const perp = Math.abs(lx * dirZ - lz * dirX);
        if (perp < 1.4) {
            f.takeDamage(damage, caster);
            spawnImpactSparks(f.x, sy, f.z, color, 8);
            spawnDmgNumber(f.x, sy + 0.5, f.z, Math.round(damage), color);
        }
    }
}

// ═══════════════════════════════════════════════════════════
//  ABILITY DISPATCHER — by ability name from definitions.js
// ═══════════════════════════════════════════════════════════

export function castAbility(abilityName, owner, ctx) {
    const dirX = ctx.dirX, dirZ = ctx.dirZ;
    const buffMul = (performance.now() < owner.buffUntil) ? owner.buffMul : 1;
    const baseDmg = owner.character.attackDamage;

    switch (abilityName) {
        // ══════════ GOJO ══════════
        case 'Blue': {
            const tx = owner.x + dirX * 5, tz = owner.z + dirZ * 5;
            // Blue orb at target
            const orb = new THREE.Mesh(
                new THREE.SphereGeometry(0.4, 12, 12),
                new THREE.MeshBasicMaterial({ color: '#1565c0', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
            );
            orb.position.set(tx, EYE_HEIGHT * 0.6, tz);
            ctx.scene.add(orb);
            // Spinning rings
            for (let r = 0; r < 3; r++) {
                const ring = new THREE.Mesh(
                    new THREE.TorusGeometry(0.5 + r * 0.15, 0.02, 6, 16),
                    new THREE.MeshBasicMaterial({ color: '#4fc3f7', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })
                );
                ring.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
                orb.add(ring);
            }
            const blueLight = new THREE.PointLight('#1565c0', 5, TILE * 6, 2);
            orb.add(blueLight);
            groundRing(tx, tz, '#1565c0', 3, 800);
            groundDecal(tx, tz, '#0d47a1', 2, 2000);
            emitParticles(tx, EYE_HEIGHT * 0.6, tz, {
                color: ['#1565c0', '#1e88e5', '#42a5f5', '#82b1ff'],
                count: 30, speed: 4, spread: 3,
                gravity: 0, life: 20, lifeVar: 10,
                size: 0.12, sizeEnd: 0.02, drag: 0.92
            });
            pullEnemiesOverTime(ctx.scene, owner, ctx.fighters, tx, tz, 6, 5, 1500, 300, baseDmg * 0.8 * buffMul, '#1565c0');
            // Spin + implode
            const spinStart = performance.now();
            _vfx.push({
                cleanup() { ctx.scene.remove(orb); },
                tick() {
                    const e = performance.now() - spinStart;
                    orb.children.forEach(c => {
                        if (c.geometry?.type === 'TorusGeometry') {
                            c.rotation.x += 0.15; c.rotation.y += 0.1;
                        }
                    });
                    if (e > 1500) {
                        applyAOE(ctx.scene, owner, ctx.fighters, tx, tz, 3.5, baseDmg * 2 * buffMul, '#1565c0');
                        return false;
                    }
                    return true;
                }
            });
            break;
        }
        case 'Red': {
            // Red orb shoots forward with knockback
            spawnProjectile(ctx.scene, owner, ctx, {
                color: '#d50000', dirX, dirZ, damage: baseDmg * 1.5 * buffMul,
                radius: 0.5, knockback: 3, aoeRadius: 3, speed: 26, lifetime: 1.0,
                trailColor: '#ff5252'
            });
            screenFlash('#d50000', 100);
            break;
        }
        case 'Hollow Purple': {
            // Massive purple beam — twisted blue+red
            castBeamLine(ctx.scene, owner, ctx.fighters, dirX, dirZ, 35, baseDmg * 5 * buffMul, '#aa00ff');
            // Charge particles at caster
            emitParticles(owner.x, EYE_HEIGHT * 0.7, owner.z, {
                color: ['#1565c0', '#d50000', '#aa00ff', '#ffffff'],
                count: 40, speed: 5, spread: 1.0, gravity: 0,
                life: 18, size: 0.2, sizeEnd: 0, drag: 0.92
            });
            screenFlash('#aa00ff', 200);
            triggerHitstop(60);
            break;
        }
        case 'Domain Expansion': {
            // Limitless blue dome — big AOE around caster
            owner.invulnUntil = performance.now() + 1000;
            applyAOE(ctx.scene, owner, ctx.fighters, owner.x, owner.z, 12, baseDmg * 6 * buffMul, '#4fc3f7');
            groundRing(owner.x, owner.z, '#4fc3f7', 12, 1200);
            screenFlash('#4fc3f7', 400);
            triggerHitstop(80);
            break;
        }
        case 'Teleport': {
            // Vanish + reappear forward
            emitParticles(owner.x, EYE_HEIGHT * 0.7, owner.z, {
                color: ['#1565c0', '#82b1ff'], count: 16, speed: 5, spread: 0.5,
                gravity: 0, life: 14, size: 0.2, sizeEnd: 0, drag: 0.9
            });
            doDash(owner, dirX, dirZ, 12);
            emitParticles(owner.x, EYE_HEIGHT * 0.7, owner.z, {
                color: ['#1565c0', '#82b1ff'], count: 16, speed: 5, spread: 0.5,
                gravity: 0, life: 14, size: 0.2, sizeEnd: 0, drag: 0.9
            });
            lightFlash(owner.x, EYE_HEIGHT * 0.7, owner.z, '#4fc3f7', 4, 200);
            break;
        }

        // ══════════ SUKUNA ══════════
        case 'Dismantle': {
            // Curved slash projectile
            spawnProjectile(ctx.scene, owner, ctx, {
                color: '#ff2244', dirX, dirZ, damage: baseDmg * 1.5 * buffMul,
                radius: 0.4, speed: 32, lifetime: 1.0, trailColor: '#ff6688'
            });
            spawnMeleeSlash('#ff2244', owner.x, EYE_HEIGHT * 0.7, owner.z, owner.yaw, 0);
            break;
        }
        case 'Cleave': {
            // 3-slash forward cone
            for (let i = -1; i <= 1; i++) {
                const ang = Math.atan2(-dirX, -dirZ) + Math.PI + i * 0.18;
                const dx = -Math.sin(ang), dz = -Math.cos(ang);
                spawnProjectile(ctx.scene, owner, ctx, {
                    color: '#ff2244', dirX: dx, dirZ: dz,
                    damage: baseDmg * 1.0 * buffMul, radius: 0.5, speed: 28, lifetime: 0.7
                });
            }
            spawnMeleeSlash('#ff2244', owner.x, EYE_HEIGHT * 0.7, owner.z, owner.yaw, 1);
            break;
        }
        case 'Fire Arrow': {
            // Flaming projectile — explodes
            spawnProjectile(ctx.scene, owner, ctx, {
                color: '#ff6600', dirX, dirZ, damage: baseDmg * 2.5 * buffMul,
                radius: 0.7, aoeRadius: 4, speed: 30, lifetime: 1.4,
                trailColor: '#ffaa00'
            });
            fireEffect(owner.x + dirX * 1.5, EYE_HEIGHT * 0.7, owner.z + dirZ * 1.5, 0.7);
            break;
        }
        case 'Malevolent Shrine': {
            // Wide red domain
            owner.invulnUntil = performance.now() + 1000;
            applyAOE(ctx.scene, owner, ctx.fighters, owner.x, owner.z, 14, baseDmg * 7 * buffMul, '#ff2244');
            groundRing(owner.x, owner.z, '#ff2244', 14, 1500);
            screenFlash('#ff2244', 400);
            triggerHitstop(100);
            break;
        }
        case 'Dash':
        case 'Flash Step':
        case 'Chain Dash':
        case 'Shadow Dash':
        case 'Ice Dash':
        case 'Spirit Dash':
        case 'Thunder Dash': {
            // Generic anime dash with particle trail in character's color
            const c = owner.character.color;
            emitParticles(owner.x, EYE_HEIGHT * 0.5, owner.z, {
                color: [c, '#ffffff'], count: 14, speed: 4, spread: 0.4,
                gravity: 0, life: 12, size: 0.18, sizeEnd: 0, drag: 0.9
            });
            doDash(owner, dirX, dirZ, abilityName === 'Flash Step' ? 14 :
                                        abilityName === 'Chain Dash' ? 16 :
                                        abilityName === 'Thunder Dash' ? 14 : 12);
            emitParticles(owner.x, EYE_HEIGHT * 0.5, owner.z, {
                color: [c, '#ffffff'], count: 14, speed: 4, spread: 0.4,
                gravity: 0, life: 12, size: 0.18, sizeEnd: 0, drag: 0.9
            });
            lightFlash(owner.x, EYE_HEIGHT * 0.7, owner.z, c, 3, 180);
            break;
        }

        // ══════════ TOJI ══════════
        case 'Inverted Spear': {
            spawnProjectile(ctx.scene, owner, ctx, {
                color: '#88cc88', dirX, dirZ, damage: baseDmg * 1.6 * buffMul,
                radius: 0.4, speed: 36, lifetime: 1.0, knockback: 2,
                trailColor: '#aaffaa'
            });
            break;
        }
        case 'Chain Strike': {
            for (let i = 0; i < 5; i++) {
                const ang = Math.atan2(-dirX, -dirZ) + Math.PI + (i - 2) * 0.12;
                const dx = -Math.sin(ang), dz = -Math.cos(ang);
                spawnProjectile(ctx.scene, owner, ctx, {
                    color: '#aaaa44', dirX: dx, dirZ: dz,
                    damage: baseDmg * 0.6 * buffMul, radius: 0.3, speed: 30, lifetime: 0.8
                });
            }
            break;
        }
        case 'Playful Cloud': {
            spawnProjectile(ctx.scene, owner, ctx, {
                color: '#884422', dirX, dirZ, damage: baseDmg * 2 * buffMul,
                radius: 0.9, speed: 22, lifetime: 1.2, aoeRadius: 3, knockback: 4,
                trailColor: '#aa6644'
            });
            break;
        }
        case 'Heavenly Restriction': {
            owner.buffUntil = performance.now() + 8000;
            owner.buffMul = 1.8;
            owner.invulnUntil = performance.now() + 600;
            emitParticles(owner.x, EYE_HEIGHT * 0.7, owner.z, {
                color: ['#88cc88', '#ffffff'], count: 24, speed: 4,
                spread: 0.6, gravity: -1, life: 22, size: 0.18, sizeEnd: 0, drag: 0.92
            });
            lightFlash(owner.x, EYE_HEIGHT * 0.7, owner.z, '#88cc88', 5, 600);
            break;
        }

        // ══════════ BROOK ══════════
        case 'Hanauta Sancho': {
            for (let i = 0; i < 3; i++) {
                setTimeout(() => spawnProjectile(ctx.scene, owner, ctx, {
                    color: '#88ccff', dirX, dirZ, damage: baseDmg * 1.0 * buffMul,
                    radius: 0.6, speed: 28, lifetime: 0.9, trailColor: '#aaeeff'
                }), i * 130);
            }
            spawnMeleeSlash('#88ccff', owner.x, EYE_HEIGHT * 0.7, owner.z, owner.yaw, 2);
            break;
        }
        case 'Soul Solid': {
            spawnProjectile(ctx.scene, owner, ctx, {
                color: '#4488ff', dirX, dirZ, damage: baseDmg * 2 * buffMul,
                radius: 0.5, speed: 30, lifetime: 1.0, trailColor: '#88ccff'
            });
            break;
        }
        case 'Blizzard Slice': {
            const tx = owner.x + dirX * 6, tz = owner.z + dirZ * 6;
            applyAOE(ctx.scene, owner, ctx.fighters, tx, tz, 6, baseDmg * 3.5 * buffMul, '#88ccff');
            emitParticles(tx, EYE_HEIGHT * 0.6, tz, {
                color: ['#88ccff', '#ffffff', '#bbeeff'], count: 40, speed: 5,
                spread: 2, gravity: -2, life: 25, size: 0.18, sizeEnd: 0, drag: 0.95
            });
            break;
        }
        case 'Soul King': {
            owner.invulnUntil = performance.now() + 800;
            applyAOE(ctx.scene, owner, ctx.fighters, owner.x, owner.z, 12, baseDmg * 6 * buffMul, '#4488ff');
            screenFlash('#4488ff', 350);
            break;
        }

        // ══════════ DENJI ══════════
        case 'Chain Rip': {
            spawnProjectile(ctx.scene, owner, ctx, {
                color: '#ffaa00', dirX, dirZ, damage: baseDmg * 1.4 * buffMul,
                radius: 0.5, speed: 28, lifetime: 1.0, trailColor: '#ffcc44'
            });
            break;
        }
        case 'Buzzsaw': {
            for (let i = 0; i < 4; i++) {
                const ang = Math.atan2(-dirX, -dirZ) + Math.PI + (i - 1.5) * 0.25;
                const dx = -Math.sin(ang), dz = -Math.cos(ang);
                spawnProjectile(ctx.scene, owner, ctx, {
                    color: '#ff6600', dirX: dx, dirZ: dz,
                    damage: baseDmg * 0.8 * buffMul, radius: 0.5, speed: 26, lifetime: 1.2
                });
            }
            break;
        }
        case 'Devil Charge': {
            doDash(owner, dirX, dirZ, 16);
            emitParticles(owner.x, EYE_HEIGHT * 0.5, owner.z, {
                color: ['#ff4400', '#ff8800'], count: 24, speed: 6, spread: 0.8,
                gravity: -1, life: 18, size: 0.2, sizeEnd: 0, drag: 0.93
            });
            applyAOE(ctx.scene, owner, ctx.fighters, owner.x, owner.z, 4, baseDmg * 2.5 * buffMul, '#ff4400');
            break;
        }
        case 'Full Devil': {
            owner.buffUntil = performance.now() + 8000;
            owner.buffMul = 2.0;
            owner.invulnUntil = performance.now() + 800;
            fireEffect(owner.x, EYE_HEIGHT * 0.7, owner.z, 1.5);
            screenFlash('#ff4400', 300);
            break;
        }

        // ══════════ MEGUMI ══════════
        case 'Divine Dog': {
            // 2 white wolf-orbs that fly outward and seek
            for (let i = 0; i < 2; i++) {
                const ang = Math.atan2(-dirX, -dirZ) + Math.PI + (i === 0 ? 0.4 : -0.4);
                const dx = -Math.sin(ang), dz = -Math.cos(ang);
                spawnProjectile(ctx.scene, owner, ctx, {
                    color: i === 0 ? '#ffffff' : '#222222', dirX: dx, dirZ: dz,
                    damage: baseDmg * 1.1 * buffMul, radius: 0.55,
                    speed: 22, lifetime: 1.8, trailColor: '#aaaaaa'
                });
            }
            break;
        }
        case 'Mahoraga': {
            // Massive shadow eruption
            const tx = owner.x + dirX * 5, tz = owner.z + dirZ * 5;
            applyAOE(ctx.scene, owner, ctx.fighters, tx, tz, 8, baseDmg * 6.5 * buffMul, '#222244');
            groundRing(tx, tz, '#aa00ff', 8, 1000);
            triggerHitstop(80);
            break;
        }
        case 'Nue': {
            // Lightning bird projectile
            spawnProjectile(ctx.scene, owner, ctx, {
                color: '#6644aa', dirX, dirZ, damage: baseDmg * 2 * buffMul,
                radius: 0.7, speed: 30, lifetime: 1.4, trailColor: '#aa66ff'
            });
            break;
        }
        case 'Chimera Shadow Garden': {
            owner.invulnUntil = performance.now() + 700;
            applyAOE(ctx.scene, owner, ctx.fighters, owner.x, owner.z, 11, baseDmg * 6 * buffMul, '#1a237e');
            groundRing(owner.x, owner.z, '#1a237e', 11, 1300);
            break;
        }

        // ══════════ YOH ══════════
        case 'Celestial Slash': {
            spawnProjectile(ctx.scene, owner, ctx, {
                color: '#ffeebb', dirX, dirZ, damage: baseDmg * 1.6 * buffMul,
                radius: 0.7, speed: 30, lifetime: 1.0, trailColor: '#ffffaa'
            });
            spawnMeleeSlash('#ffeebb', owner.x, EYE_HEIGHT * 0.7, owner.z, owner.yaw, 0);
            break;
        }
        case 'Buddha Giri': {
            doDash(owner, dirX, dirZ, 10);
            applyAOE(ctx.scene, owner, ctx.fighters, owner.x, owner.z, 4, baseDmg * 2.5 * buffMul, '#ffaa44');
            spawnMeleeSlash('#ffaa44', owner.x, EYE_HEIGHT * 0.7, owner.z, owner.yaw, 1);
            break;
        }
        case 'Double Medium': {
            // 12-hit flurry
            for (let i = 0; i < 12; i++) {
                setTimeout(() => spawnProjectile(ctx.scene, owner, ctx, {
                    color: '#ffeeaa', dirX, dirZ,
                    damage: baseDmg * 0.45 * buffMul, radius: 0.4, speed: 32, lifetime: 0.6
                }), i * 70);
            }
            break;
        }
        case 'Fumon Tonkou': {
            applyAOE(ctx.scene, owner, ctx.fighters, owner.x, owner.z, 11, baseDmg * 5.5 * buffMul, '#ffaa44');
            screenFlash('#ffaa44', 250);
            break;
        }

        // ══════════ REN ══════════
        case 'Rapid Tempo Assault': {
            for (let i = 0; i < 6; i++) {
                setTimeout(() => spawnProjectile(ctx.scene, owner, ctx, {
                    color: '#aa66ff', dirX, dirZ,
                    damage: baseDmg * 0.8 * buffMul, radius: 0.4, speed: 32, lifetime: 0.8
                }), i * 90);
            }
            break;
        }
        case 'Eleki Bang': {
            applyAOE(ctx.scene, owner, ctx.fighters, owner.x, owner.z, 8, baseDmg * 4 * buffMul, '#aa66ff');
            screenFlash('#aa66ff', 200);
            break;
        }
        case 'Heaven Shaking Thunder': {
            for (let i = 0; i < 3; i++) {
                const ang = Math.atan2(-dirX, -dirZ) + Math.PI + (i - 1) * 0.4;
                const tx = owner.x - Math.sin(ang) * 8, tz = owner.z - Math.cos(ang) * 8;
                applyAOE(ctx.scene, owner, ctx.fighters, tx, tz, 4, baseDmg * 2 * buffMul, '#ddaa00');
            }
            break;
        }
        case 'Golden Thunder': {
            owner.invulnUntil = performance.now() + 600;
            for (let i = 0; i < 5; i++) {
                const ang = (i / 5) * Math.PI * 2;
                const tx = owner.x + Math.sin(ang) * 6, tz = owner.z + Math.cos(ang) * 6;
                applyAOE(ctx.scene, owner, ctx.fighters, tx, tz, 4, baseDmg * 2.5 * buffMul, '#ffdd44');
            }
            screenFlash('#ffdd44', 350);
            break;
        }

        // ══════════ HOROHORO ══════════
        case 'Fist Slam': {
            const tx = owner.x + dirX * 4, tz = owner.z + dirZ * 4;
            applyAOE(ctx.scene, owner, ctx.fighters, tx, tz, 5, baseDmg * 2.7 * buffMul, '#66ccff');
            spawnPunchImpact(tx, EYE_HEIGHT * 0.7, tz, '#66ccff');
            break;
        }
        case 'Ice Barrage': {
            for (let i = 0; i < 8; i++) {
                const ang = Math.atan2(-dirX, -dirZ) + Math.PI + (i - 3.5) * 0.18;
                const dx = -Math.sin(ang), dz = -Math.cos(ang);
                spawnProjectile(ctx.scene, owner, ctx, {
                    color: '#88ddff', dirX: dx, dirZ: dz,
                    damage: baseDmg * 0.7 * buffMul, radius: 0.4, speed: 28, lifetime: 1.2
                });
            }
            break;
        }
        case 'Blizzard': {
            applyAOE(ctx.scene, owner, ctx.fighters, owner.x, owner.z, 10, baseDmg * 4.5 * buffMul, '#88ddff');
            emitParticles(owner.x, EYE_HEIGHT, owner.z, {
                color: ['#88ddff', '#ccffff', '#ffffff'], count: 50, speed: 6,
                spread: 4, gravity: -1, life: 30, size: 0.15, sizeEnd: 0, drag: 0.96
            });
            break;
        }
        case 'Avalanche': {
            for (let i = 0; i < 14; i++) {
                const ang = Math.atan2(-dirX, -dirZ) + Math.PI + (i - 6.5) * 0.1;
                const dx = -Math.sin(ang), dz = -Math.cos(ang);
                spawnProjectile(ctx.scene, owner, ctx, {
                    color: '#ccffff', dirX: dx, dirZ: dz,
                    damage: baseDmg * 0.6 * buffMul, radius: 0.5, speed: 26, lifetime: 1.4
                });
            }
            break;
        }

        // ══════════ TODO ══════════
        case 'Black Flash': {
            // Charged yellow flash projectile
            spawnProjectile(ctx.scene, owner, ctx, {
                color: '#eeff00', dirX, dirZ, damage: baseDmg * 4.5 * buffMul,
                radius: 0.6, speed: 36, lifetime: 0.9, aoeRadius: 3,
                trailColor: '#ffffaa'
            });
            screenFlash('#aa0010', 80);
            triggerHitstop(60);
            break;
        }
        case 'Face Slam': {
            doDash(owner, dirX, dirZ, 10);
            applyAOE(ctx.scene, owner, ctx.fighters, owner.x, owner.z, 4, baseDmg * 3 * buffMul, '#d4a070');
            groundDecal(owner.x, owner.z, '#552200', 3, 1500);
            triggerHitstop(50);
            break;
        }
        case 'Boulder Kick': {
            spawnProjectile(ctx.scene, owner, ctx, {
                color: '#886644', dirX, dirZ, damage: baseDmg * 2.5 * buffMul,
                radius: 1.0, speed: 22, lifetime: 1.2, aoeRadius: 4, knockback: 4,
                trailColor: '#aa8866'
            });
            break;
        }

        // ══════════ YUTA ══════════
        case 'Rika': {
            // Rika manifestation — big pink slam
            const tx = owner.x + dirX * 5, tz = owner.z + dirZ * 5;
            applyAOE(ctx.scene, owner, ctx.fighters, tx, tz, 7, baseDmg * 4 * buffMul, '#ff66cc');
            emitParticles(tx, EYE_HEIGHT * 1.2, tz, {
                color: ['#ff66cc', '#ffffff', '#ffaadd'], count: 30, speed: 5,
                spread: 1.5, gravity: -2, life: 22, size: 0.25, sizeEnd: 0, drag: 0.93
            });
            break;
        }
        case 'Crush': {
            const tx = owner.x + dirX * 4, tz = owner.z + dirZ * 4;
            applyAOE(ctx.scene, owner, ctx.fighters, tx, tz, 5, baseDmg * 5 * buffMul, '#5a8aff');
            triggerHitstop(80);
            break;
        }
        case 'Reverse Cursed Technique': {
            // Heal
            const heal = Math.min(owner.maxHp - owner.hp, 60);
            owner.hp = Math.min(owner.maxHp, owner.hp + 60);
            owner.takeDamage(0);  // refresh HP bar
            spawnDmgNumber(owner.x, EYE_HEIGHT, owner.z, '+' + heal, '#88ffaa');
            emitParticles(owner.x, EYE_HEIGHT * 0.7, owner.z, {
                color: ['#88ffaa', '#ffffff', '#aaffcc'], count: 24, speed: 3,
                spread: 0.5, gravity: -1, life: 26, size: 0.2, sizeEnd: 0, drag: 0.93, upward: 1.5
            });
            lightFlash(owner.x, EYE_HEIGHT * 0.7, owner.z, '#88ffaa', 4, 500);
            break;
        }
        case 'True Love Beam': {
            castBeamLine(ctx.scene, owner, ctx.fighters, dirX, dirZ, 32, baseDmg * 5 * buffMul, '#ff66cc');
            screenFlash('#ff66cc', 300);
            break;
        }

        default: {
            // Unknown ability — generic colored projectile fallback
            const c = owner.character.color;
            spawnProjectile(ctx.scene, owner, ctx, {
                color: c, dirX, dirZ, damage: baseDmg * 1.2 * buffMul,
                radius: 0.5, speed: 28, lifetime: 1.0
            });
            break;
        }
    }
}

// ═══════════════════════════════════════════════════════════
//  M1 MELEE — short forward arc, hits all in cone
// ═══════════════════════════════════════════════════════════
const TWO_PI = Math.PI * 2;
export function castM1(owner, ctx) {
    const reach = 2.6;
    const arc = Math.PI / 3;
    const dirAng = Math.atan2(ctx.dirX, ctx.dirZ);
    const buffMul = (performance.now() < owner.buffUntil) ? owner.buffMul : 1;
    const color = owner.character.color;
    let hit = false;
    for (const f of ctx.fighters) {
        if (f === owner || !f.alive) continue;
        const dx = f.x - owner.x, dz = f.z - owner.z;
        const d = Math.hypot(dx, dz);
        if (d > reach) continue;
        const ang = Math.atan2(dx, dz);
        let diff = ang - dirAng;
        while (diff > Math.PI) diff -= TWO_PI;
        while (diff < -Math.PI) diff += TWO_PI;
        if (Math.abs(diff) < arc) {
            const dmg = owner.character.attackDamage * buffMul;
            f.takeDamage(dmg, owner);
            spawnImpactSparks(f.x, EYE_HEIGHT * 0.7, f.z, color, 5);
            spawnDmgNumber(f.x, EYE_HEIGHT * 0.9, f.z, Math.round(dmg), color);
            hit = true;
        }
    }
    spawnMeleeSlash(color, owner.x, EYE_HEIGHT * 0.7, owner.z, owner.yaw, owner._comboStep || 0);
    owner._comboStep = ((owner._comboStep || 0) + 1) % 4;
    return hit;
}
