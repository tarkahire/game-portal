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
        // ══════════ GOJO — full DC3D port ══════════
        case 'Blue': {
            // Cursed Technique Lapse: Blue — gravitational pull point
            const tx = owner.x + dirX * 5, tz = owner.z + dirZ * 5;
            const orbY = EYE_HEIGHT * 0.6;

            // Layered orb: outer glow + inner core + spinning rings + light
            const orbGeo = new THREE.SphereGeometry(0.4, 12, 12);
            const orbMat = new THREE.MeshBasicMaterial({
                color: '#1565c0', transparent: true, opacity: 0.8,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            const orb = new THREE.Mesh(orbGeo, orbMat);
            orb.position.set(tx, orbY, tz);
            ctx.scene.add(orb);
            const coreGeo = new THREE.SphereGeometry(0.15, 8, 8);
            const coreMat = new THREE.MeshBasicMaterial({
                color: '#82b1ff', transparent: true, opacity: 1,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            orb.add(new THREE.Mesh(coreGeo, coreMat));
            const ringGeos = [], ringMats = [];
            for (let r = 0; r < 3; r++) {
                const rg = new THREE.TorusGeometry(0.5 + r * 0.15, 0.02, 6, 16);
                const rm = new THREE.MeshBasicMaterial({
                    color: '#4fc3f7', transparent: true, opacity: 0.5,
                    blending: THREE.AdditiveBlending, depthWrite: false
                });
                const ring = new THREE.Mesh(rg, rm);
                ring.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
                orb.add(ring);
                ringGeos.push(rg); ringMats.push(rm);
            }
            orb.add(new THREE.PointLight('#1565c0', 5, 24, 2));

            groundRing(tx, tz, '#1565c0', 3, 800);
            groundDecal(tx, tz, '#0d47a1', 2, 2000);
            emitParticles(tx, orbY, tz, {
                color: ['#1565c0', '#1e88e5', '#42a5f5', '#82b1ff'],
                count: 30, speed: 4, spread: 3,
                gravity: 0, life: 20, lifeVar: 10,
                size: 0.12, sizeEnd: 0.02, drag: 0.92
            });

            // Hand pose — caster reaches forward
            const arm = owner.charMesh && owner.charMesh._rightArm;
            if (arm) {
                arm.rotation.x = -1.2;
                setTimeout(() => { if (arm) arm.rotation.x = 0.05; }, 1500);
            }

            // Pull + DOT for 1.5s, then implode
            const start = performance.now();
            _vfx.push({
                cleanup() {
                    ctx.scene.remove(orb);
                    orbGeo.dispose(); orbMat.dispose();
                    coreGeo.dispose(); coreMat.dispose();
                    for (const g of ringGeos) g.dispose();
                    for (const m of ringMats) m.dispose();
                },
                _lastDmg: start,
                _lastPull: start,
                tick(dt, c) {
                    if (!owner.alive) return false;
                    const now = performance.now();
                    // Spin the rings
                    orb.children.forEach(child => {
                        if (child.geometry?.type === 'TorusGeometry') {
                            child.rotation.x += 0.15; child.rotation.y += 0.1;
                        }
                    });
                    // Pull every 100ms
                    if (now - this._lastPull > 100) {
                        this._lastPull = now;
                        for (const f of c.fighters) {
                            if (f === owner || !f.alive) continue;
                            const dx = tx - f.x, dz = tz - f.z;
                            const d = Math.hypot(dx, dz);
                            if (d < 6 && d > 0.5) {
                                f.x += (dx / d) * 0.8;
                                f.z += (dz / d) * 0.8;
                                f.mesh.position.set(f.x, 0, f.z);
                            }
                        }
                        emitParticles(tx, orbY, tz, {
                            color: ['#1565c0', '#42a5f5'], count: 5, speed: 2, spread: 2.5,
                            gravity: 0, life: 8, size: 0.08, sizeEnd: 0, drag: 0.9
                        });
                    }
                    // Damage every 300ms
                    if (now - this._lastDmg > 300) {
                        this._lastDmg = now;
                        for (const f of c.fighters) {
                            if (f === owner || !f.alive) continue;
                            if (Math.hypot(f.x - tx, f.z - tz) < 3) {
                                const dmg = Math.round(owner.character.attackDamage * 0.8 * buffMul);
                                f.takeDamage(dmg, owner);
                                spawnDmgNumber(f.x, EYE_HEIGHT * 0.7, f.z, dmg, '#1565c0');
                            }
                        }
                    }
                    if (now - start > 1500) {
                        // Final implode AOE
                        applyAOE(ctx.scene, owner, c.fighters, tx, tz, 3.5,
                            owner.character.attackDamage * 2 * buffMul, '#1565c0');
                        groundRing(tx, tz, '#42a5f5', 4, 500);
                        triggerHitstop(50);
                        return false;
                    }
                    return true;
                }
            });
            lightFlash(owner.x, EYE_HEIGHT, owner.z, '#4fc3f7', 2, 200);
            break;
        }

        case 'Red': {
            // Cursed Technique Reversal: Red — charge then fast projectile
            const spawnX = owner.x + dirX * 1.5, spawnZ = owner.z + dirZ * 1.5;
            const spawnY = EYE_HEIGHT - 0.2;

            // Charging orb at hand for 200ms
            const chargeGeo = new THREE.SphereGeometry(0.35, 10, 10);
            const chargeMat = new THREE.MeshBasicMaterial({
                color: '#d50000', transparent: true, opacity: 0.9,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            const chargeOrb = new THREE.Mesh(chargeGeo, chargeMat);
            const chargeCoreGeo = new THREE.SphereGeometry(0.12, 8, 8);
            const chargeCoreMat = new THREE.MeshBasicMaterial({
                color: '#ff8a80', blending: THREE.AdditiveBlending,
                transparent: true, opacity: 1, depthWrite: false
            });
            chargeOrb.add(new THREE.Mesh(chargeCoreGeo, chargeCoreMat));
            chargeOrb.add(new THREE.PointLight('#d50000', 6, 20, 2));
            chargeOrb.position.set(spawnX, spawnY, spawnZ);
            ctx.scene.add(chargeOrb);

            emitParticles(spawnX, spawnY, spawnZ, {
                color: ['#d50000', '#ff1744', '#ff5252', '#ff8a80'],
                count: 20, speed: 3, spread: 2,
                gravity: 0, life: 8, size: 0.1, sizeEnd: 0, drag: 0.88
            });

            const larm = owner.charMesh && owner.charMesh._leftArm;
            if (larm) {
                larm.rotation.x = -1.3;
                setTimeout(() => { if (larm) larm.rotation.x = 0.05; }, 800);
            }

            setTimeout(() => {
                ctx.scene.remove(chargeOrb);
                chargeGeo.dispose(); chargeMat.dispose();
                chargeCoreGeo.dispose(); chargeCoreMat.dispose();
                // Fire fast projectile with knockback + AOE explosion
                spawnProjectile(ctx.scene, owner, ctx, {
                    color: '#d50000', dirX, dirZ,
                    damage: owner.character.attackDamage * 3 * buffMul,
                    radius: 0.5, knockback: 4, aoeRadius: 3.5,
                    speed: 32, lifetime: 1.4, trailColor: '#ff5252'
                });
                lightFlash(spawnX, EYE_HEIGHT, spawnZ, '#ff1744', 4, 200);
            }, 200);
            screenFlash('#d50000', 100);
            break;
        }

        case 'Hollow Purple': {
            // Cutscene only for the player; bots just fire the projectile
            const baseFireDmg = owner.character.attackDamage * 6 * buffMul;
            const fireProjectile = () => {
                const projOrb = new THREE.Mesh(
                    new THREE.SphereGeometry(1.0, 14, 14),
                    new THREE.MeshBasicMaterial({
                        color: '#7c4dff', transparent: true, opacity: 0.9,
                        blending: THREE.AdditiveBlending, depthWrite: false
                    })
                );
                const projCore = new THREE.Mesh(
                    new THREE.SphereGeometry(0.4, 10, 10),
                    new THREE.MeshBasicMaterial({
                        color: '#ffffff', blending: THREE.AdditiveBlending,
                        transparent: true, opacity: 0.8, depthWrite: false
                    })
                );
                projOrb.add(projCore);
                projOrb.add(new THREE.PointLight('#7c4dff', 8, 32, 2));
                projOrb.position.set(owner.x + dirX * 1.5, EYE_HEIGHT, owner.z + dirZ * 1.5);
                ctx.scene.add(projOrb);

                _vfx.push({
                    mesh: projOrb,
                    x: projOrb.position.x, y: EYE_HEIGHT, z: projOrb.position.z,
                    dx: dirX * 22, dz: dirZ * 22,
                    life: 2.0, owner, hitSet: new Set(),
                    cleanup() {
                        ctx.scene.remove(projOrb);
                        projOrb.geometry.dispose();
                        if (projOrb.material) projOrb.material.dispose();
                    },
                    tick(dt, c) {
                        if (!owner.alive) return false;
                        this.life -= dt;
                        if (this.life <= 0) return false;
                        this.x += this.dx * dt; this.z += this.dz * dt;
                        projOrb.position.set(this.x, this.y, this.z);
                        // Trail
                        emitParticles(this.x, this.y, this.z, {
                            color: ['#7c4dff', '#b388ff', '#ea80fc', '#ffffff'],
                            count: 4, speed: 2, spread: 0.5,
                            gravity: 0, life: 12, size: 0.2, sizeEnd: 0, drag: 0.96
                        });
                        groundDecal(this.x, this.z, '#7c4dff', 1, 2000);
                        // Hit fighters in a fat radius (wide beam-of-light feel)
                        for (const f of c.fighters) {
                            if (f === owner || !f.alive || this.hitSet.has(f)) continue;
                            const ddx = f.x - this.x, ddz = f.z - this.z;
                            if (ddx * ddx + ddz * ddz < 2.5 * 2.5) {
                                this.hitSet.add(f);
                                f.takeDamage(baseFireDmg, owner);
                                spawnDmgNumber(f.x, this.y + 0.5, f.z, Math.round(baseFireDmg), '#7c4dff');
                                // Big explosion at impact
                                applyAOE(ctx.scene, owner, c.fighters, this.x, this.z, 4,
                                    baseFireDmg * 0.7, '#7c4dff');
                                triggerHitstop(120);
                                return false;
                            }
                        }
                        // Off-arena bail
                        if (Math.hypot(this.x, this.z) > 90) return false;
                        return true;
                    }
                });
                screenFlash('rgba(124,77,255,0.3)', 200);
                lightFlash(projOrb.position.x, EYE_HEIGHT, projOrb.position.z, '#7c4dff', 8, 300);
            };

            if (!ctx.isPlayer) {
                // Bot version — just fire it
                fireProjectile();
                break;
            }

            // ── PLAYER CUTSCENE ──
            owner.invulnUntil = performance.now() + 5000;
            const pCam = ctx.pCam;
            const perpX = Math.cos(owner.yaw), perpZ = -Math.sin(owner.yaw);
            const camX = owner.x + dirX * 4;
            const camZ = owner.z + dirZ * 4;
            const camY = EYE_HEIGHT + 0.5;
            if (pCam) pCam.setCinematic(camX, camY, camZ, owner.x, EYE_HEIGHT - 0.2, owner.z, 2200);

            const pm = owner.charMesh;
            if (pm?._rightArm) pm._rightArm.rotation.set(-0.5, 0, -0.8);
            if (pm?._leftArm) pm._leftArm.rotation.set(-0.5, 0, 0.8);

            const vignette = document.createElement('div');
            vignette.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:5;pointer-events:none;background:radial-gradient(ellipse at center,transparent 30%,rgba(0,0,0,0.7) 100%);';
            document.body.appendChild(vignette);

            // Side orbs
            const blueOrbPos = new THREE.Vector3(owner.x - perpX * 2, EYE_HEIGHT + 0.5, owner.z - perpZ * 2);
            const redOrbPos = new THREE.Vector3(owner.x + perpX * 2, EYE_HEIGHT + 0.5, owner.z + perpZ * 2);
            const mergeCenter = new THREE.Vector3(owner.x, EYE_HEIGHT + 0.3, owner.z);

            const makeOrb = (color, coreColor, ringColor) => {
                const g = new THREE.Mesh(
                    new THREE.SphereGeometry(0.6, 14, 14),
                    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
                );
                g.add(new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 10),
                    new THREE.MeshBasicMaterial({ color: coreColor, blending: THREE.AdditiveBlending, transparent: true, opacity: 1, depthWrite: false })));
                g.add(new THREE.PointLight(color, 6, 20, 2));
                for (let r = 0; r < 2; r++) {
                    const ring = new THREE.Mesh(
                        new THREE.TorusGeometry(0.7 + r * 0.2, 0.02, 6, 16),
                        new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })
                    );
                    ring.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
                    g.add(ring);
                }
                return g;
            };
            const blueOrb = makeOrb('#1565c0', '#82b1ff', '#42a5f5');
            blueOrb.position.copy(blueOrbPos);
            ctx.scene.add(blueOrb);
            const redOrb = makeOrb('#d50000', '#ff8a80', '#ff5252');
            redOrb.position.copy(redOrbPos);
            ctx.scene.add(redOrb);

            const swirlInt = setInterval(() => {
                if (!owner.alive || !blueOrb.parent) { clearInterval(swirlInt); return; }
                emitParticles(blueOrb.position.x, blueOrb.position.y, blueOrb.position.z, {
                    color: ['#1565c0', '#42a5f5', '#82b1ff'], count: 4, speed: 1.5, spread: 0.8,
                    gravity: 0, life: 10, size: 0.1, sizeEnd: 0, drag: 0.93
                });
                emitParticles(redOrb.position.x, redOrb.position.y, redOrb.position.z, {
                    color: ['#d50000', '#ff1744', '#ff8a80'], count: 4, speed: 1.5, spread: 0.8,
                    gravity: 0, life: 10, size: 0.1, sizeEnd: 0, drag: 0.93
                });
                blueOrb.children.forEach(c => { if (c.geometry?.type === 'TorusGeometry') { c.rotation.x += 0.08; c.rotation.y += 0.06; }});
                redOrb.children.forEach(c => { if (c.geometry?.type === 'TorusGeometry') { c.rotation.x += 0.08; c.rotation.y += 0.06; }});
            }, 60);

            // 1000ms: orbs slide together
            let mergeFrame = 0;
            const mergeAnim = setInterval(() => {
                mergeFrame++;
                const t = Math.min(mergeFrame / 15, 1);
                const ease = t * t;
                blueOrb.position.lerpVectors(blueOrbPos, mergeCenter, ease);
                redOrb.position.lerpVectors(redOrbPos, mergeCenter, ease);
                const s = 1 - ease * 0.4;
                blueOrb.scale.setScalar(s); redOrb.scale.setScalar(s);
                if (pm?._rightArm) pm._rightArm.rotation.set(-1.0 * ease - 0.5, 0, -0.8 + ease * 0.8);
                if (pm?._leftArm) pm._leftArm.rotation.set(-1.0 * ease - 0.5, 0, 0.8 - ease * 0.8);
                if (t >= 1) clearInterval(mergeAnim);
            }, 33);

            // 1500ms: collision flash + purple orb
            setTimeout(() => {
                clearInterval(swirlInt);
                blueOrb.traverse(c => { if (c.isMesh) { c.geometry?.dispose(); c.material?.dispose(); }});
                redOrb.traverse(c => { if (c.isMesh) { c.geometry?.dispose(); c.material?.dispose(); }});
                ctx.scene.remove(blueOrb); ctx.scene.remove(redOrb);

                screenFlash('rgba(255,255,255,0.6)', 200);
                triggerHitstop(120);

                const purpleOrb = new THREE.Mesh(
                    new THREE.SphereGeometry(0.8, 14, 14),
                    new THREE.MeshBasicMaterial({ color: '#7c4dff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
                );
                purpleOrb.position.copy(mergeCenter);
                purpleOrb.add(new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 10),
                    new THREE.MeshBasicMaterial({ color: '#ea80fc', blending: THREE.AdditiveBlending, transparent: true, opacity: 1, depthWrite: false })));
                purpleOrb.add(new THREE.PointLight('#7c4dff', 10, 32, 2));
                for (let r = 0; r < 3; r++) {
                    const ring = new THREE.Mesh(
                        new THREE.TorusGeometry(1.0 + r * 0.2, 0.025, 6, 20),
                        new THREE.MeshBasicMaterial({ color: '#b388ff', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })
                    );
                    ring.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
                    purpleOrb.add(ring);
                }
                ctx.scene.add(purpleOrb);
                emitParticles(mergeCenter.x, mergeCenter.y, mergeCenter.z, {
                    color: ['#1565c0', '#d50000', '#7c4dff', '#ea80fc', '#ffffff'],
                    count: 50, speed: 5, spread: 0.5,
                    gravity: 0, life: 15, lifeVar: 8,
                    size: 0.15, sizeEnd: 0, drag: 0.95, upward: 0.5
                });

                let growFrame = 0;
                const growAnim = setInterval(() => {
                    growFrame++;
                    purpleOrb.scale.setScalar(1 + growFrame * 0.05);
                    purpleOrb.children.forEach(c => { if (c.geometry?.type === 'TorusGeometry') { c.rotation.x += 0.12; c.rotation.y += 0.08; }});
                    if (growFrame > 15) clearInterval(growAnim);
                }, 40);

                // 700ms later: snap back + fire
                setTimeout(() => {
                    vignette.remove();
                    purpleOrb.traverse(c => { if (c.isMesh) { c.geometry?.dispose(); c.material?.dispose(); }});
                    ctx.scene.remove(purpleOrb);
                    if (pCam) pCam.clearCinematic();
                    if (pm?._rightArm) pm._rightArm.rotation.set(-1.5, 0, 0);
                    if (pm?._leftArm) pm._leftArm.rotation.set(-1.5, 0, 0);
                    setTimeout(() => {
                        if (pm?._rightArm) pm._rightArm.rotation.set(0.05, 0, 0);
                        if (pm?._leftArm) pm._leftArm.rotation.set(0.05, 0, 0);
                    }, 600);
                    fireProjectile();
                }, 700);
            }, 1500);
            break;
        }

        case 'Domain Expansion': {
            // Unlimited Void — dome that freezes + DOTs everyone
            const cx = owner.x, cz = owner.z;
            const pm = owner.charMesh;
            if (pm?._rightArm) pm._rightArm.rotation.x = -0.8;
            if (pm?._leftArm) pm._leftArm.rotation.x = -0.8;

            if (ctx.isPlayer) screenFlash('rgba(0,0,0,0.8)', 1500);

            const domeGeo = new THREE.SphereGeometry(1, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
            const domeMat = new THREE.MeshBasicMaterial({
                color: '#1a1a3e', transparent: true, opacity: 0.4,
                side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
            });
            const dome = new THREE.Mesh(domeGeo, domeMat);
            dome.position.set(cx, 0.1, cz);
            ctx.scene.add(dome);
            const innerGeo = new THREE.SphereGeometry(0.8, 8, 8);
            const innerMat = new THREE.MeshBasicMaterial({
                color: '#311b92', wireframe: true, transparent: true, opacity: 0.3,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            const inner = new THREE.Mesh(innerGeo, innerMat);
            dome.add(inner);
            dome.add(new THREE.PointLight('#7c4dff', 4, 40, 2));

            const expandStart = performance.now();
            const dmgPerTick = Math.round(owner.character.attackDamage * 1 * buffMul);
            const initialDmg = Math.round(owner.character.attackDamage * 2 * buffMul);

            // Initial freeze + damage burst at 800ms
            setTimeout(() => {
                if (!owner.alive) return;
                for (const f of ctx.fighters) {
                    if (f === owner || !f.alive) continue;
                    if (Math.hypot(f.x - cx, f.z - cz) > 12) continue;
                    f.takeDamage(initialDmg, owner);
                    spawnDmgNumber(f.x, EYE_HEIGHT, f.z, initialDmg, '#7c4dff');
                    f.invulnUntil = Math.max(f.invulnUntil, performance.now()); // not invuln, but stunned via cooldown
                    f.cooldowns.m1 = performance.now() + 5000;
                }
                owner.invulnUntil = performance.now() + 5500;
                triggerHitstop(80);
                lightFlash(cx, 2, cz, '#311b92', 8, 800);
            }, 800);

            // 5s domain — DOT every 500ms, 10 ticks
            _vfx.push({
                _started: expandStart,
                _ticks: 0,
                _expandFrame: 0,
                cleanup() {
                    dome.traverse(c => { if (c.isMesh) { c.geometry?.dispose(); c.material?.dispose(); }});
                    ctx.scene.remove(dome);
                    if (pm?._rightArm) pm._rightArm.rotation.x = 0.05;
                    if (pm?._leftArm) pm._leftArm.rotation.x = 0.05;
                },
                tick(dt, c) {
                    if (!owner.alive) return false;
                    this._expandFrame++;
                    const s = Math.min(this._expandFrame * 0.8, 10);
                    dome.scale.setScalar(s);
                    inner.rotation.x += 0.02; inner.rotation.y += 0.03;
                    const elapsed = performance.now() - this._started;
                    if (elapsed > 800 && elapsed - 800 > this._ticks * 500) {
                        this._ticks++;
                        for (const f of c.fighters) {
                            if (f === owner || !f.alive) continue;
                            if (Math.hypot(f.x - cx, f.z - cz) > 12) continue;
                            f.takeDamage(dmgPerTick, owner);
                            spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmgPerTick, '#7c4dff');
                            f.cooldowns.m1 = performance.now() + 600;
                        }
                        // Swirl particles
                        const a = this._ticks * 0.5;
                        for (let i = 0; i < 6; i++) {
                            const pa = a + (i / 6) * Math.PI * 2;
                            emitParticles(cx + Math.cos(pa) * 4, 1, cz + Math.sin(pa) * 4,
                                { color: ['#311b92', '#7c4dff'], count: 2, speed: 0.8, spread: 0.5,
                                  gravity: 0.5, life: 10, size: 0.08, sizeEnd: 0, drag: 0.97 });
                        }
                    }
                    if (this._ticks >= 10) {
                        groundRing(cx, cz, '#7c4dff', 8, 800);
                        emitParticles(cx, 2, cz, {
                            color: ['#311b92', '#7c4dff', '#ffffff'],
                            count: 50, speed: 5, spread: 2,
                            gravity: -2, life: 20, lifeVar: 10,
                            size: 0.15, sizeEnd: 0, drag: 0.96, upward: 1
                        });
                        lightFlash(cx, 2, cz, '#7c4dff', 6, 400);
                        return false;
                    }
                    return true;
                }
            });
            groundRing(cx, cz, '#311b92', 6, 1000);
            groundDecal(cx, cz, '#1a1a3e', 5, 6000);
            break;
        }

        case 'Teleport': {
            // Vanish + reappear forward — keep simple but flashy (DC3D has no impl)
            emitParticles(owner.x, EYE_HEIGHT * 0.7, owner.z, {
                color: ['#1565c0', '#82b1ff'], count: 24, speed: 5, spread: 0.5,
                gravity: 0, life: 14, size: 0.2, sizeEnd: 0, drag: 0.9
            });
            lightFlash(owner.x, EYE_HEIGHT * 0.7, owner.z, '#4fc3f7', 5, 200);
            doDash(owner, dirX, dirZ, 14);
            emitParticles(owner.x, EYE_HEIGHT * 0.7, owner.z, {
                color: ['#1565c0', '#82b1ff'], count: 24, speed: 5, spread: 0.5,
                gravity: 0, life: 14, size: 0.2, sizeEnd: 0, drag: 0.9
            });
            lightFlash(owner.x, EYE_HEIGHT * 0.7, owner.z, '#4fc3f7', 5, 200);
            screenFlash('rgba(79,195,247,0.2)', 80);
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
