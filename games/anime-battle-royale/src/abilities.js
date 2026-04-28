// Ability dispatcher with VFX signatures matching dungeon-crawler-3d.
// Each ability spawns the same visual shapes (orbs, rings, beams, particles)
// as the source, scaled for BR's caster-vs-fighters model.
import * as THREE from 'three';
import {
    emitParticles, groundRing, groundDecal, lightFlash, screenFlash,
    beamEffect, fireEffect, spawnPunchImpact, spawnImpactSparks,
    spawnDmgNumber, spawnMeleeSlash, triggerHitstop,
    fovPunch, screenShake, showSpeedLines, triggerSwordSwing
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

        // ══════════ SUKUNA — full DC3D port ══════════
        case 'Dismantle': {
            // 5 invisible slash waves traveling forward
            const sx0 = owner.x + dirX * 1.5, sz0 = owner.z + dirZ * 1.5;
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    const dist = (2 + i * 2.5) * TILE / 4 + 2 + i * 2.5;
                    const sx = owner.x + dirX * (2 + i * 2.5);
                    const sz = owner.z + dirZ * (2 + i * 2.5);
                    const slashGeo = new THREE.PlaneGeometry(3, 0.04);
                    const slashMat = new THREE.MeshBasicMaterial({
                        color: '#ff2244', transparent: true, opacity: 0.9,
                        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
                    });
                    const slash = new THREE.Mesh(slashGeo, slashMat);
                    slash.position.set(sx, EYE_HEIGHT, sz);
                    slash.lookAt(owner.x, EYE_HEIGHT, owner.z);
                    slash.rotateZ(i % 2 === 0 ? 0.5 : -0.5);
                    ctx.scene.add(slash);
                    emitParticles(sx, EYE_HEIGHT, sz, {
                        color: ['#ff2244', '#ff0000', '#ff4466'],
                        count: 6, speed: 3, spread: 1.5,
                        gravity: -4, life: 10, size: 0.08, sizeEnd: 0, drag: 0.95
                    });
                    for (const f of ctx.fighters) {
                        if (f === owner || !f.alive) continue;
                        if (Math.hypot(f.x - sx, f.z - sz) < 2) {
                            const dmg = Math.round(owner.character.attackDamage * 1.5 * buffMul);
                            f.takeDamage(dmg, owner);
                            spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#ff2244');
                        }
                    }
                    const start = performance.now();
                    const fadeSlash = () => {
                        const t = (performance.now() - start) / 300;
                        if (t >= 1) { ctx.scene.remove(slash); slashGeo.dispose(); slashMat.dispose(); return; }
                        slashMat.opacity = (1 - t) * 0.9;
                        slash.scale.x = 1 + t * 0.5;
                        requestAnimationFrame(fadeSlash);
                    };
                    requestAnimationFrame(fadeSlash);
                }, i * 60);
            }
            const arm = owner.charMesh && owner.charMesh._rightArm;
            if (arm) { arm.rotation.set(-1.5, 0, -0.6); setTimeout(() => { if (arm) arm.rotation.set(0.05, 0, 0); }, 400); }
            lightFlash(sx0, EYE_HEIGHT, sz0, '#ff2244', 3, 200);
            break;
        }

        case 'Cleave': {
            // Wide arc that hits all in front + big knockback
            triggerHitstop(60);
            const cx = owner.x + dirX * 3, cz = owner.z + dirZ * 3;
            // Arc visuals
            const arcGeo = new THREE.TorusGeometry(3, 0.04, 4, 32, Math.PI);
            const arcMat = new THREE.MeshBasicMaterial({
                color: '#ff2244', transparent: true, opacity: 0.9,
                side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
            });
            const arc = new THREE.Mesh(arcGeo, arcMat);
            arc.position.set(cx, EYE_HEIGHT, cz);
            arc.rotation.y = owner.yaw + Math.PI / 2;
            arc.rotation.x = Math.PI / 2;
            ctx.scene.add(arc);
            const arc2Geo = new THREE.TorusGeometry(3.5, 0.03, 4, 32, Math.PI);
            const arc2Mat = new THREE.MeshBasicMaterial({
                color: '#ff0000', transparent: true, opacity: 0.5,
                side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
            });
            const arc2 = new THREE.Mesh(arc2Geo, arc2Mat);
            arc2.position.copy(arc.position);
            arc2.rotation.copy(arc.rotation);
            ctx.scene.add(arc2);
            emitParticles(cx, EYE_HEIGHT, cz, {
                color: ['#ff2244', '#ff0000', '#cc0000', '#ff4466'],
                count: 25, speed: 5, spread: 2,
                gravity: -3, life: 15, size: 0.15, sizeEnd: 0, drag: 0.96, upward: 0.3
            });
            // Damage all in 5-tile wide cone (0.6π half-angle)
            const dirAng = Math.atan2(dirX, dirZ);
            for (const f of ctx.fighters) {
                if (f === owner || !f.alive) continue;
                const dx = f.x - owner.x, dz = f.z - owner.z;
                const d = Math.hypot(dx, dz);
                if (d > 5 * TILE || d < 0.1) continue;
                const a = Math.atan2(-dx, -dz);
                let ad = a - owner.yaw;
                while (ad > Math.PI) ad -= Math.PI * 2;
                while (ad < -Math.PI) ad += Math.PI * 2;
                if (Math.abs(ad) < Math.PI * 0.6) {
                    const dmg = Math.round(owner.character.attackDamage * 3 * buffMul);
                    f.takeDamage(dmg, owner);
                    spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#ff2244');
                    f.x += (dx / d) * 2 * TILE;
                    f.z += (dz / d) * 2 * TILE;
                    f.mesh.position.set(f.x, 0, f.z);
                }
            }
            const start = performance.now();
            const fadeArc = () => {
                const t = (performance.now() - start) / 400;
                if (t >= 1) {
                    ctx.scene.remove(arc); arcGeo.dispose(); arcMat.dispose();
                    ctx.scene.remove(arc2); arc2Geo.dispose(); arc2Mat.dispose();
                    return;
                }
                arcMat.opacity = (1 - t) * 0.9;
                arc2Mat.opacity = (1 - t) * 0.5;
                arc.scale.setScalar(1 + t * 0.3);
                arc2.scale.setScalar(1 + t * 0.4);
                requestAnimationFrame(fadeArc);
            };
            requestAnimationFrame(fadeArc);
            const arm = owner.charMesh && owner.charMesh._rightArm;
            if (arm) { arm.rotation.set(-0.3, 0, -1.2); setTimeout(() => { if (arm) arm.rotation.set(0.05, 0, 0); }, 500); }
            lightFlash(cx, EYE_HEIGHT, cz, '#ff2244', 5, 300);
            groundRing(cx, cz, '#ff2244', 4, 600);
            fovPunch(10, 0.15);
            break;
        }

        case 'Fire Arrow': {
            // Charge then fire flaming arrow
            const sx = owner.x + dirX * 1.5, sz = owner.z + dirZ * 1.5;
            const chargeInt = setInterval(() => {
                if (!owner.alive) { clearInterval(chargeInt); return; }
                emitParticles(sx, EYE_HEIGHT, sz, {
                    color: ['#ff6600', '#ff4400', '#ff8800', '#ffaa00'],
                    count: 4, speed: 2, spread: 1.5,
                    gravity: 0, life: 6, size: 0.1, sizeEnd: 0, drag: 0.9
                });
            }, 60);
            const arm = owner.charMesh && owner.charMesh._rightArm;
            if (arm) arm.rotation.set(-2.0, 0, 0);
            setTimeout(() => {
                clearInterval(chargeInt);
                spawnProjectile(ctx.scene, owner, ctx, {
                    color: '#ff4400', dirX, dirZ,
                    damage: owner.character.attackDamage * 4 * buffMul,
                    radius: 0.7, aoeRadius: 4, speed: 36, lifetime: 1.6,
                    trailColor: '#ffaa00'
                });
                fireEffect(sx, EYE_HEIGHT, sz, 1.0);
                fovPunch(10, 0.12);
                lightFlash(sx, EYE_HEIGHT, sz, '#ff4400', 5, 300);
                if (arm) { arm.rotation.set(-0.5, 0, 0); setTimeout(() => { if (arm) arm.rotation.set(0.05, 0, 0); }, 300); }
            }, 400);
            break;
        }

        case 'Malevolent Shrine': {
            // Dark red dome — random slashes everywhere + DOT for 4.8s
            const cx = owner.x, cz = owner.z;
            owner.invulnUntil = performance.now() + 5500;
            if (ctx.isPlayer) screenFlash('rgba(100,0,0,0.8)', 1500);
            const arm = owner.charMesh && owner.charMesh._rightArm;
            const larm = owner.charMesh && owner.charMesh._leftArm;
            if (arm) arm.rotation.set(-0.8, 0, 0);
            if (larm) larm.rotation.set(-0.8, 0, 0);

            const domeGeo = new THREE.SphereGeometry(1, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
            const domeMat = new THREE.MeshBasicMaterial({
                color: '#3a0000', transparent: true, opacity: 0.4,
                side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
            });
            const dome = new THREE.Mesh(domeGeo, domeMat);
            dome.position.set(cx, 0.1, cz);
            ctx.scene.add(dome);
            const domeStart = performance.now();
            const expandDome = () => {
                const t = (performance.now() - domeStart) / 800;
                if (t >= 1 || !owner.alive) return;
                dome.scale.setScalar(1 + t * 8);
                requestAnimationFrame(expandDome);
            };
            requestAnimationFrame(expandDome);

            const slashInt = setInterval(() => {
                if (!owner.alive) { clearInterval(slashInt); return; }
                for (let i = 0; i < 3; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = (1 + Math.random() * 6) * TILE;
                    const sxx = cx + Math.cos(angle) * dist;
                    const szz = cz + Math.sin(angle) * dist;
                    const slashGeo = new THREE.PlaneGeometry(1.5 + Math.random(), 0.03);
                    const slashMat = new THREE.MeshBasicMaterial({
                        color: '#ff2244', transparent: true, opacity: 0.8,
                        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
                    });
                    const slash = new THREE.Mesh(slashGeo, slashMat);
                    slash.position.set(sxx, 0.5 + Math.random() * 2, szz);
                    slash.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                    ctx.scene.add(slash);
                    setTimeout(() => { ctx.scene.remove(slash); slashGeo.dispose(); slashMat.dispose(); }, 300);
                }
            }, 100);

            let ticks = 0;
            const dmgInt = setInterval(() => {
                if (!owner.alive) { clearInterval(dmgInt); clearInterval(slashInt); ctx.scene.remove(dome); domeGeo.dispose(); domeMat.dispose(); return; }
                ticks++;
                for (const f of ctx.fighters) {
                    if (f === owner || !f.alive) continue;
                    if (Math.hypot(f.x - cx, f.z - cz) < 8 * TILE) {
                        const dmg = Math.round(owner.character.attackDamage * 1.5 * buffMul);
                        f.takeDamage(dmg, owner);
                        spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#ff2244');
                    }
                }
                emitParticles(cx, 1.5, cz, {
                    color: ['#ff2244', '#ff0000', '#cc0000'],
                    count: 8, speed: 3, spread: 4,
                    gravity: -2, life: 12, size: 0.1, sizeEnd: 0, drag: 0.97, upward: 0.5
                });
                if (ticks >= 12) {
                    clearInterval(dmgInt); clearInterval(slashInt);
                    ctx.scene.remove(dome); domeGeo.dispose(); domeMat.dispose();
                    emitParticles(cx, 2, cz, {
                        color: ['#ff2244', '#ff0000', '#880000', '#ffffff'],
                        count: 60, speed: 6, spread: 2,
                        gravity: -3, life: 25, lifeVar: 15,
                        size: 0.2, sizeEnd: 0, drag: 0.96, upward: 1.5
                    });
                    groundRing(cx, cz, '#ff2244', 8, 800);
                    lightFlash(cx, 2, cz, '#ff2244', 8, 500);
                    if (arm) arm.rotation.set(0.05, 0, 0);
                    if (larm) larm.rotation.set(0.05, 0, 0);
                }
            }, 400);
            groundRing(cx, cz, '#ff0000', 6, 1000);
            groundDecal(cx, cz, '#3a0000', 5, 6000);
            break;
        }

        // ══════════ TOJI — full DC3D port ══════════
        case 'Inverted Spear': {
            // 6-stage piercing thrust line + lunge
            for (let i = 0; i < 6; i++) {
                setTimeout(() => {
                    const dist = 1.5 + i * 1.2;
                    const sx = owner.x + dirX * dist;
                    const sz = owner.z + dirZ * dist;
                    const impactGeo = new THREE.PlaneGeometry(0.6, 0.6);
                    const impactMat = new THREE.MeshBasicMaterial({
                        color: '#aaffcc', transparent: true, opacity: 0.8,
                        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
                    });
                    const impact = new THREE.Mesh(impactGeo, impactMat);
                    impact.position.set(sx, EYE_HEIGHT, sz);
                    impact.lookAt(owner.x, EYE_HEIGHT, owner.z);
                    ctx.scene.add(impact);
                    emitParticles(sx, EYE_HEIGHT, sz, {
                        color: ['#aaffcc', '#66ddaa', '#ffffff'],
                        count: 4, speed: 2, spread: 0.5,
                        gravity: -3, life: 8, size: 0.06, sizeEnd: 0, drag: 0.95
                    });
                    for (const f of ctx.fighters) {
                        if (f === owner || !f.alive) continue;
                        if (Math.hypot(f.x - sx, f.z - sz) < 1.5 * TILE) {
                            const dmg = Math.round(owner.character.attackDamage * 2 * buffMul);
                            f.takeDamage(dmg, owner);
                            spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#aaffcc');
                            // Perpendicular knockback
                            const perpX = -dirZ, perpZ = dirX;
                            const dx = f.x - sx, dz = f.z - sz;
                            const side = (dx * perpX + dz * perpZ) > 0 ? 1 : -1;
                            f.x += perpX * side * 0.5 * TILE;
                            f.z += perpZ * side * 0.5 * TILE;
                            f.mesh.position.set(f.x, 0, f.z);
                        }
                    }
                    const start = performance.now();
                    const fadeImpact = () => {
                        const t = (performance.now() - start) / 200;
                        if (t >= 1) { ctx.scene.remove(impact); impactGeo.dispose(); impactMat.dispose(); return; }
                        impactMat.opacity = (1 - t) * 0.8;
                        impact.scale.setScalar(1 + t * 0.5);
                        requestAnimationFrame(fadeImpact);
                    };
                    requestAnimationFrame(fadeImpact);
                }, i * 40);
            }
            const arm = owner.charMesh && owner.charMesh._rightArm;
            if (arm) { arm.rotation.set(-1.6, 0, 0); setTimeout(() => { if (arm) arm.rotation.set(0.05, 0, 0); }, 400); }
            // Small lunge
            owner.x += dirX * 1.5 * TILE;
            owner.z += dirZ * 1.5 * TILE;
            owner.mesh.position.set(owner.x, 0, owner.z);
            fovPunch(10, 0.1);
            lightFlash(owner.x + dirX * 3, EYE_HEIGHT, owner.z + dirZ * 3, '#aaffcc', 3, 200);
            break;
        }

        case 'Chain Strike': {
            // Worm extends forward, bite + pull enemies inward
            const lungeRange = 7 * TILE;
            const wormBodyMat = new THREE.MeshStandardMaterial({ color: '#5a2d82', roughness: 0.4 });
            const wormHeadMat = new THREE.MeshStandardMaterial({ color: '#7a3db2', roughness: 0.3 });
            const wormParts = [];
            const wormSegCount = 16;
            for (let i = 0; i < wormSegCount; i++) {
                const t = i / (wormSegCount - 1);
                const segX = owner.x + dirX * t * lungeRange;
                const segZ = owner.z + dirZ * t * lungeRange;
                const perpX = -dirZ, perpZ = dirX;
                const wave = Math.sin(t * Math.PI * 3) * 0.4;
                const segSize = 0.12 + Math.sin(t * Math.PI) * 0.06;
                const seg = new THREE.Mesh(
                    new THREE.SphereGeometry(segSize, 6, 6),
                    i === wormSegCount - 1 ? wormHeadMat : wormBodyMat
                );
                seg.position.set(segX + perpX * wave, EYE_HEIGHT - 0.3 + Math.sin(t * Math.PI * 2) * 0.2, segZ + perpZ * wave);
                seg.scale.set(1, 0.8, 1);
                seg.visible = false;
                ctx.scene.add(seg);
                wormParts.push(seg);
            }
            for (let i = 0; i < wormParts.length; i++) {
                setTimeout(() => { wormParts[i].visible = true; }, i * 20);
            }
            for (let i = 0; i < 8; i++) {
                setTimeout(() => {
                    const t = i / 7;
                    const sx = owner.x + dirX * t * lungeRange;
                    const sz = owner.z + dirZ * t * lungeRange;
                    emitParticles(sx, EYE_HEIGHT - 0.3, sz, {
                        color: ['#5a2d82', '#7a4da2', '#9a6dc2'],
                        count: 3, speed: 1.5, spread: 0.4,
                        gravity: -6, life: 12, size: 0.06, sizeEnd: 0, drag: 0.96
                    });
                }, i * 30);
            }
            setTimeout(() => {
                for (const f of ctx.fighters) {
                    if (f === owner || !f.alive) continue;
                    const dx = f.x - owner.x, dz = f.z - owner.z;
                    const d = Math.hypot(dx, dz);
                    if (d > lungeRange + TILE || d < 0.5) continue;
                    const dot = dx * dirX + dz * dirZ;
                    if (dot < 0) continue;
                    const perpDist = Math.abs(dx * dirZ - dz * dirX);
                    if (perpDist < 1.5 * TILE) {
                        const dmg = Math.round(owner.character.attackDamage * 2 * buffMul);
                        f.takeDamage(dmg, owner);
                        spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#7a3db2');
                        // Pull toward caster
                        f.x -= (dx / d) * 2 * TILE;
                        f.z -= (dz / d) * 2 * TILE;
                        f.mesh.position.set(f.x, 0, f.z);
                        f.cooldowns.m1 = performance.now() + 1200;
                    }
                }
                triggerHitstop(40);
            }, wormSegCount * 20);
            // Retract
            setTimeout(() => {
                for (let i = wormParts.length - 1; i >= 0; i--) {
                    setTimeout(() => {
                        ctx.scene.remove(wormParts[i]);
                        if (wormParts[i].geometry) wormParts[i].geometry.dispose();
                    }, (wormParts.length - 1 - i) * 15);
                }
            }, wormSegCount * 20 + 200);
            const arm = owner.charMesh && owner.charMesh._rightArm;
            if (arm) { arm.rotation.set(-1.3, 0, 0); setTimeout(() => { if (arm) arm.rotation.set(0.05, 0, 0); }, 500); }
            lightFlash(owner.x, EYE_HEIGHT, owner.z, '#7a3db2', 3, 200);
            break;
        }

        case 'Playful Cloud': {
            // Wind-up then massive AOE slam
            const ix = owner.x + dirX * 3, iz = owner.z + dirZ * 3;
            const arm = owner.charMesh && owner.charMesh._rightArm;
            if (arm) arm.rotation.set(-2.2, 0, 0);
            setTimeout(() => {
                triggerHitstop(100);
                fovPunch(15, 0.2);
                groundRing(ix, iz, '#ffffff', 5, 800);
                groundDecal(ix, iz, '#555555', 2.5, 3000);
                emitParticles(ix, 0.5, iz, {
                    color: ['#aaaaaa', '#888888', '#cccccc', '#666666'],
                    count: 35, speed: 6, spread: 1,
                    gravity: -8, life: 20, lifeVar: 10,
                    size: 0.2, sizeEnd: 0.05, drag: 0.96, upward: 2
                });
                emitParticles(ix, 0.2, iz, {
                    color: ['#997755', '#886644'],
                    count: 20, speed: 4, spread: 2,
                    gravity: -3, life: 25, size: 0.15, sizeEnd: 0, drag: 0.97, upward: 0.3
                });
                for (const f of ctx.fighters) {
                    if (f === owner || !f.alive) continue;
                    const dx = f.x - ix, dz = f.z - iz;
                    const d = Math.hypot(dx, dz);
                    if (d < 4 * TILE) {
                        const falloff = 1 - (d / (4 * TILE)) * 0.5;
                        const dmg = Math.round(owner.character.attackDamage * 5 * falloff * buffMul);
                        f.takeDamage(dmg, owner);
                        spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#ffffff');
                        if (d > 0.3) {
                            f.x += (dx / d) * 3 * TILE;
                            f.z += (dz / d) * 3 * TILE;
                            f.mesh.position.set(f.x, 0, f.z);
                        }
                    }
                }
                lightFlash(ix, 1, iz, '#ffffff', 8, 400);
                screenFlash('rgba(255,255,255,0.3)', 200);
                if (arm) { arm.rotation.set(0.3, 0, 0); setTimeout(() => { if (arm) arm.rotation.set(0.05, 0, 0); }, 300); }
            }, 250);
            break;
        }

        case 'Heavenly Restriction': {
            // Massive buff for 8 seconds
            screenFlash('rgba(40,110,60,0.6)', 1000);
            emitParticles(owner.x, EYE_HEIGHT, owner.z, {
                color: ['#2a6e3f', '#44aa66', '#88ffaa', '#ffffff'],
                count: 40, speed: 4, spread: 1,
                gravity: -1, life: 25, lifeVar: 15,
                size: 0.15, sizeEnd: 0, drag: 0.97, upward: 2
            });
            groundRing(owner.x, owner.z, '#2a6e3f', 4, 800);
            owner.buffUntil = performance.now() + 8000;
            owner.buffMul = 2.5;
            owner.invulnUntil = performance.now() + 1000;
            const aura = new THREE.PointLight('#2a6e3f', 3, 20, 2);
            aura.position.y = 1.2;
            owner.mesh.add(aura);
            const buffParticles = setInterval(() => {
                if (!owner.alive || performance.now() > owner.buffUntil) {
                    clearInterval(buffParticles);
                    owner.mesh.remove(aura);
                    return;
                }
                emitParticles(owner.x, 0.5, owner.z, {
                    color: ['#2a6e3f', '#44aa66'], count: 3, speed: 1.5, spread: 0.5,
                    gravity: -1, life: 10, size: 0.06, sizeEnd: 0, drag: 0.97, upward: 2
                });
            }, 150);
            lightFlash(owner.x, EYE_HEIGHT, owner.z, '#2a6e3f', 5, 400);
            triggerHitstop(60);
            break;
        }

        // ══════════ BROOK (kept simplified — no DC3D impl exists) ══════════
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
            const tx = owner.x + dirX * 6 * TILE, tz = owner.z + dirZ * 6 * TILE;
            applyAOE(ctx.scene, owner, ctx.fighters, tx, tz, 6 * TILE, baseDmg * 3.5 * buffMul, '#88ccff');
            emitParticles(tx, EYE_HEIGHT * 0.6, tz, {
                color: ['#88ccff', '#ffffff', '#bbeeff'], count: 40, speed: 5,
                spread: 2, gravity: -2, life: 25, size: 0.18, sizeEnd: 0, drag: 0.95
            });
            break;
        }
        case 'Soul King': {
            owner.invulnUntil = performance.now() + 800;
            applyAOE(ctx.scene, owner, ctx.fighters, owner.x, owner.z, 12 * TILE, baseDmg * 6 * buffMul, '#4488ff');
            screenFlash('#4488ff', 350);
            break;
        }

        // ══════════ DENJI — full DC3D port ══════════
        case 'Chain Rip': {
            // Ripcord pull then chainsaw teeth shoot forward
            triggerHitstop(60);
            fovPunch(10, 0.15);
            const arm = owner.charMesh && owner.charMesh._rightArm;
            if (arm) {
                arm.rotation.set(0.8, 0, -0.3);
                setTimeout(() => { if (arm) arm.rotation.set(-1.5, 0, 0); }, 200);
                setTimeout(() => { if (arm) arm.rotation.set(0.05, 0, 0); }, 800);
            }
            emitParticles(owner.x, EYE_HEIGHT, owner.z, {
                color: ['#ff6600', '#ff4400', '#ffaa00', '#ff8800'],
                count: 20, speed: 3, spread: 0.8,
                gravity: -2, life: 10, size: 0.1, sizeEnd: 0, drag: 0.96, upward: 1
            });
            setTimeout(() => {
                for (let i = 0; i < 8; i++) {
                    setTimeout(() => {
                        const dist = 1.5 + i * 1;
                        const sx = owner.x + dirX * dist;
                        const sz = owner.z + dirZ * dist;
                        const toothGeo = new THREE.ConeGeometry(0.15, 0.3, 3);
                        const toothMat = new THREE.MeshBasicMaterial({
                            color: '#ff6600', transparent: true, opacity: 0.9,
                            blending: THREE.AdditiveBlending, depthWrite: false
                        });
                        const tooth = new THREE.Mesh(toothGeo, toothMat);
                        tooth.position.set(sx, EYE_HEIGHT - 0.2, sz);
                        tooth.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                        ctx.scene.add(tooth);
                        emitParticles(sx, EYE_HEIGHT, sz, {
                            color: ['#ff8800', '#ffaa00', '#ffffff', '#ff4400'],
                            count: 6, speed: 4, spread: 0.6,
                            gravity: -8, life: 8, size: 0.06, sizeEnd: 0, drag: 0.95
                        });
                        for (const f of ctx.fighters) {
                            if (f === owner || !f.alive) continue;
                            if (Math.hypot(f.x - sx, f.z - sz) < 1.5 * TILE) {
                                const dmg = Math.round(owner.character.attackDamage * 2.5 * buffMul);
                                f.takeDamage(dmg, owner);
                                spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#ff6600');
                                f.x += dirX * 0.8 * TILE;
                                f.z += dirZ * 0.8 * TILE;
                                f.mesh.position.set(f.x, 0, f.z);
                            }
                        }
                        const start = performance.now();
                        const fadeTooth = () => {
                            const t = (performance.now() - start) / 250;
                            if (t >= 1) { ctx.scene.remove(tooth); toothGeo.dispose(); toothMat.dispose(); return; }
                            toothMat.opacity = (1 - t) * 0.9;
                            tooth.scale.setScalar(1 + t * 0.5);
                            tooth.rotation.z += 0.3;
                            requestAnimationFrame(fadeTooth);
                        };
                        requestAnimationFrame(fadeTooth);
                    }, i * 50);
                }
                lightFlash(owner.x + dirX * 3, EYE_HEIGHT, owner.z + dirZ * 3, '#ff6600', 5, 300);
                groundDecal(owner.x + dirX * 4, owner.z + dirZ * 4, '#cc4400', 1.5, 2000);
            }, 200);
            lightFlash(owner.x, EYE_HEIGHT, owner.z, '#ff8800', 3, 200);
            break;
        }

        case 'Buzzsaw': {
            // Spinning sawblade ring around caster, AOE damage for 0.8s
            triggerHitstop(40);
            const arm = owner.charMesh && owner.charMesh._rightArm;
            const larm = owner.charMesh && owner.charMesh._leftArm;
            if (arm) arm.rotation.set(-0.5, 0, -1.2);
            if (larm) larm.rotation.set(-0.5, 0, 1.2);
            const sawRingGeo = new THREE.TorusGeometry(2.5, 0.08, 4, 24);
            const sawRingMat = new THREE.MeshBasicMaterial({
                color: '#ff6600', transparent: true, opacity: 0.8,
                side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
            });
            const sawRing = new THREE.Mesh(sawRingGeo, sawRingMat);
            sawRing.position.set(owner.x, EYE_HEIGHT - 0.5, owner.z);
            sawRing.rotation.x = Math.PI / 2;
            ctx.scene.add(sawRing);
            const sawRing2Geo = new THREE.TorusGeometry(1.8, 0.05, 4, 24);
            const sawRing2Mat = new THREE.MeshBasicMaterial({ color: '#ffaa00', transparent: true, opacity: 0.5, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
            const sawRing2 = new THREE.Mesh(sawRing2Geo, sawRing2Mat);
            sawRing2.position.copy(sawRing.position);
            sawRing2.rotation.x = Math.PI / 2;
            ctx.scene.add(sawRing2);
            let sawTicks = 0;
            const sawInt = setInterval(() => {
                if (!owner.alive) { clearInterval(sawInt); ctx.scene.remove(sawRing); ctx.scene.remove(sawRing2); sawRingGeo.dispose(); sawRingMat.dispose(); sawRing2Geo.dispose(); sawRing2Mat.dispose(); return; }
                sawTicks++;
                sawRing.position.set(owner.x, EYE_HEIGHT - 0.5, owner.z);
                sawRing2.position.copy(sawRing.position);
                sawRing.rotation.z += 0.5;
                sawRing2.rotation.z -= 0.6;
                const angle = sawTicks * 0.8;
                emitParticles(owner.x + Math.cos(angle) * 2.5, EYE_HEIGHT - 0.3, owner.z + Math.sin(angle) * 2.5, {
                    color: ['#ff8800', '#ffaa00', '#ffffff'], count: 3, speed: 4, spread: 0.3,
                    gravity: -6, life: 8, size: 0.06, sizeEnd: 0, drag: 0.95
                });
                for (const f of ctx.fighters) {
                    if (f === owner || !f.alive) continue;
                    const d = Math.hypot(f.x - owner.x, f.z - owner.z);
                    if (d < 3.5 * TILE) {
                        const dmg = Math.round(owner.character.attackDamage * 1.2 * buffMul);
                        f.takeDamage(dmg, owner);
                        spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#ff6600');
                        const dx = f.x - owner.x, dz = f.z - owner.z;
                        if (d > 0.3) {
                            f.x += (dx / d) * 0.4 * TILE;
                            f.z += (dz / d) * 0.4 * TILE;
                            f.mesh.position.set(f.x, 0, f.z);
                        }
                    }
                }
                if (sawTicks >= 8) {
                    clearInterval(sawInt);
                    ctx.scene.remove(sawRing); sawRingGeo.dispose(); sawRingMat.dispose();
                    ctx.scene.remove(sawRing2); sawRing2Geo.dispose(); sawRing2Mat.dispose();
                    if (arm) arm.rotation.set(0.05, 0, 0);
                    if (larm) larm.rotation.set(0.05, 0, 0);
                }
            }, 100);
            groundRing(owner.x, owner.z, '#ff6600', 3, 600);
            lightFlash(owner.x, EYE_HEIGHT, owner.z, '#ff6600', 5, 400);
            fovPunch(8, 0.2);
            break;
        }

        case 'Devil Charge': {
            // All-fours charge — sustained dash with damage
            const chargeDist = 7 * TILE;
            const chargeDur = 500;
            owner.invulnUntil = performance.now() + chargeDur + 200;
            fovPunch(20, 0.3);
            const pm = owner.charMesh;
            if (pm?._torso) pm._torso.rotation.x = 1.2;
            if (pm?._rightArm) pm._rightArm.rotation.set(0.8, 0, -0.5);
            if (pm?._leftArm) pm._leftArm.rotation.set(0.8, 0, 0.5);
            const startTime = performance.now();
            const hitSet = new Set();
            const chargeInt = setInterval(() => {
                if (!owner.alive) { clearInterval(chargeInt); return; }
                const elapsed = performance.now() - startTime;
                const t = elapsed / chargeDur;
                if (t >= 1) {
                    clearInterval(chargeInt);
                    if (pm?._torso) pm._torso.rotation.x = 0.04;
                    if (pm?._rightArm) pm._rightArm.rotation.set(0.05, 0, 0);
                    if (pm?._leftArm) pm._leftArm.rotation.set(0.05, 0, 0);
                    if (pm?._rightLeg) pm._rightLeg.rotation.x = 0;
                    if (pm?._leftLeg) pm._leftLeg.rotation.x = 0;
                    return;
                }
                const moveDt = 0.016;
                owner.x += dirX * (chargeDist / (chargeDur / 1000)) * moveDt;
                owner.z += dirZ * (chargeDist / (chargeDur / 1000)) * moveDt;
                owner.mesh.position.set(owner.x, 0, owner.z);
                const gallop = elapsed * 0.025;
                if (pm?._rightLeg) pm._rightLeg.rotation.x = Math.sin(gallop) * 0.8;
                if (pm?._leftLeg) pm._leftLeg.rotation.x = Math.sin(gallop + Math.PI) * 0.8;
                if (Math.random() < 0.4) {
                    emitParticles(owner.x, 0.5, owner.z, {
                        color: ['#ff6600', '#ff8800', '#ffaa00'],
                        count: 3, speed: 3, spread: 0.4,
                        gravity: -6, life: 6, size: 0.07, sizeEnd: 0, drag: 0.95
                    });
                }
                for (const f of ctx.fighters) {
                    if (f === owner || !f.alive || hitSet.has(f)) continue;
                    if (Math.hypot(f.x - owner.x, f.z - owner.z) < 1.5 * TILE) {
                        hitSet.add(f);
                        const dmg = Math.round(owner.character.attackDamage * 4 * buffMul);
                        f.takeDamage(dmg, owner);
                        spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#ff4400');
                        const dx = f.x - owner.x, dz = f.z - owner.z;
                        const side = (dx * (-dirZ) + dz * dirX) > 0 ? 1 : -1;
                        f.x += (-dirZ) * side * 2 * TILE;
                        f.z += dirX * side * 2 * TILE;
                        f.mesh.position.set(f.x, 0, f.z);
                        triggerHitstop(30);
                    }
                }
            }, 16);
            groundDecal(owner.x + dirX * chargeDist * 0.5, owner.z + dirZ * chargeDist * 0.5, '#cc4400', 2, 2500);
            lightFlash(owner.x, EYE_HEIGHT, owner.z, '#ff4400', 6, 300);
            break;
        }

        case 'Full Devil': {
            // Transform — buff for 8s, heal +50
            screenFlash('rgba(200,60,0,0.7)', 1200);
            triggerHitstop(100);
            emitParticles(owner.x, EYE_HEIGHT, owner.z, {
                color: ['#cc4400', '#ff6600', '#ff8800', '#ffaa00', '#ff2200'],
                count: 50, speed: 5, spread: 1.5,
                gravity: -2, life: 25, lifeVar: 15,
                size: 0.2, sizeEnd: 0, drag: 0.97, upward: 2
            });
            groundRing(owner.x, owner.z, '#cc4400', 5, 1000);
            owner.buffUntil = performance.now() + 8000;
            owner.buffMul = 3.0;
            owner.hp = Math.min(owner.hp + 50, owner.maxHp);
            owner.invulnUntil = performance.now() + 1500;
            const aura = new THREE.PointLight('#ff4400', 4, 20, 2);
            aura.position.y = 1.2;
            owner.mesh.add(aura);
            const devilParticles = setInterval(() => {
                if (!owner.alive || performance.now() > owner.buffUntil) {
                    clearInterval(devilParticles);
                    owner.mesh.remove(aura);
                    return;
                }
                emitParticles(owner.x, 0.5, owner.z, {
                    color: ['#cc4400', '#ff6600', '#ff2200'], count: 4, speed: 2, spread: 0.6,
                    gravity: -1.5, life: 12, size: 0.08, sizeEnd: 0, drag: 0.97, upward: 2.5
                });
            }, 120);
            lightFlash(owner.x, EYE_HEIGHT, owner.z, '#ff4400', 8, 500);
            const arm = owner.charMesh && owner.charMesh._rightArm;
            const larm = owner.charMesh && owner.charMesh._leftArm;
            if (arm) arm.rotation.set(-0.8, 0, -0.4);
            if (larm) larm.rotation.set(-0.8, 0, 0.4);
            break;
        }

        // ══════════ MEGUMI (placeholder — full port deferred) ══════════
        case 'Divine Dog': {
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
            const tx = owner.x + dirX * 5 * TILE, tz = owner.z + dirZ * 5 * TILE;
            applyAOE(ctx.scene, owner, ctx.fighters, tx, tz, 8 * TILE, baseDmg * 6.5 * buffMul, '#222244');
            groundRing(tx, tz, '#aa00ff', 8, 1000);
            triggerHitstop(80);
            break;
        }
        case 'Nue': {
            spawnProjectile(ctx.scene, owner, ctx, {
                color: '#6644aa', dirX, dirZ, damage: baseDmg * 2 * buffMul,
                radius: 0.7, speed: 30, lifetime: 1.4, trailColor: '#aa66ff'
            });
            break;
        }
        case 'Chimera Shadow Garden': {
            owner.invulnUntil = performance.now() + 700;
            applyAOE(ctx.scene, owner, ctx.fighters, owner.x, owner.z, 11 * TILE, baseDmg * 6 * buffMul, '#1a237e');
            groundRing(owner.x, owner.z, '#1a237e', 11, 1300);
            break;
        }

        // ══════════ YOH — full DC3D port ══════════
        case 'Celestial Slash': {
            // Big crescent wave projectile with halo
            triggerHitstop(120);
            fovPunch(25, 0.35);
            screenFlash('rgba(255,152,0,0.5)', 600);
            const waveGeo = new THREE.TorusGeometry(3.0, 0.2, 6, 24, Math.PI);
            const waveMat = new THREE.MeshBasicMaterial({
                color: '#ff9800', transparent: true, opacity: 0.9,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            const wave = new THREE.Mesh(waveGeo, waveMat);
            const sx = owner.x + dirX * 2, sz = owner.z + dirZ * 2;
            wave.position.set(sx, EYE_HEIGHT, sz);
            wave.rotation.set(0, owner.yaw + Math.PI / 2, Math.PI / 2);
            const innerGeo = new THREE.TorusGeometry(2.0, 0.4, 4, 20, Math.PI);
            const innerMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
            wave.add(new THREE.Mesh(innerGeo, innerMat));
            const outerGeo = new THREE.TorusGeometry(3.5, 0.08, 4, 24, Math.PI);
            const outerMat = new THREE.MeshBasicMaterial({ color: '#9c27b0', transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
            wave.add(new THREE.Mesh(outerGeo, outerMat));
            wave.add(new THREE.PointLight('#ff9800', 12, 40, 2));
            ctx.scene.add(wave);
            _vfx.push({
                mesh: wave,
                x: wave.position.x, y: EYE_HEIGHT, z: wave.position.z,
                dx: dirX * 14, dz: dirZ * 14,
                life: 2.5, hitSet: new Set(), owner,
                cleanup() {
                    ctx.scene.remove(wave);
                    waveGeo.dispose(); waveMat.dispose();
                    innerGeo.dispose(); innerMat.dispose();
                    outerGeo.dispose(); outerMat.dispose();
                },
                tick(dt, c) {
                    if (!owner.alive) return false;
                    this.life -= dt;
                    if (this.life <= 0) return false;
                    this.x += this.dx * dt; this.z += this.dz * dt;
                    wave.position.set(this.x, this.y, this.z);
                    emitParticles(this.x, this.y, this.z, {
                        color: ['#ff9800', '#ffb74d', '#ffffff', '#9c27b0', '#ffcc00'],
                        count: 6, speed: 3, spread: 2,
                        gravity: 0, life: 15, size: 0.15, sizeEnd: 0, drag: 0.94
                    });
                    for (const f of c.fighters) {
                        if (f === owner || !f.alive || this.hitSet.has(f)) continue;
                        if (Math.hypot(f.x - this.x, f.z - this.z) < 3 * TILE) {
                            this.hitSet.add(f);
                            const dmg = Math.round(owner.character.attackDamage * 4 * buffMul);
                            f.takeDamage(dmg, owner);
                            spawnDmgNumber(f.x, this.y, f.z, dmg, '#ff9800');
                        }
                    }
                    if (Math.hypot(this.x, this.z) > 90) return false;
                    return true;
                }
            });
            emitParticles(sx, EYE_HEIGHT, sz, {
                color: ['#ff9800', '#ffffff', '#9c27b0', '#ffcc00'],
                count: 50, speed: 6, spread: 2.5,
                gravity: 0, life: 18, size: 0.18, sizeEnd: 0, drag: 0.93, upward: 2
            });
            lightFlash(sx, EYE_HEIGHT, sz, '#ff9800', 10, 500);
            groundRing(owner.x, owner.z, '#ff9800', 5, 700);
            groundRing(owner.x, owner.z, '#9c27b0', 3, 500);
            break;
        }

        case 'Buddha Giri': {
            // Teleport-dash + giant 4-layer X slash on landing
            const dashDist = 8 * TILE;
            triggerHitstop(150);
            fovPunch(30, 0.4);
            screenFlash('rgba(255,255,255,0.6)', 400);
            owner.invulnUntil = performance.now() + 800;
            owner.x += dirX * dashDist;
            owner.z += dirZ * dashDist;
            // Clamp inside arena
            const r = Math.hypot(owner.x, owner.z);
            const maxR = 70 - 1;
            if (r > maxR) { owner.x = owner.x / r * maxR; owner.z = owner.z / r * maxR; }
            owner.mesh.position.set(owner.x, 0, owner.z);
            const lx = owner.x, lz = owner.z;
            for (let i = 0; i < 4; i++) {
                const sGeo = new THREE.PlaneGeometry(8, 0.25);
                const sMat = new THREE.MeshBasicMaterial({
                    color: ['#ffffff', '#9c27b0', '#ff9800', '#ffcc00'][i],
                    transparent: true, opacity: 0.85,
                    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
                });
                const sMesh = new THREE.Mesh(sGeo, sMat);
                sMesh.position.set(lx, EYE_HEIGHT - 0.5 + i * 0.3, lz);
                sMesh.rotation.set(0, owner.yaw + Math.PI / 2, (i < 2 ? 0.5 : -0.5) + i * 0.1);
                ctx.scene.add(sMesh);
                const fadeStart = performance.now();
                const fadeSlash = () => {
                    const ft = (performance.now() - fadeStart) / 700;
                    if (ft >= 1) { ctx.scene.remove(sMesh); sGeo.dispose(); sMat.dispose(); return; }
                    sMat.opacity = (1 - ft) * 0.85;
                    sMesh.scale.set(1 + ft * 0.8, 1 + ft * 5, 1);
                    requestAnimationFrame(fadeSlash);
                };
                requestAnimationFrame(fadeSlash);
            }
            // Damage cone
            for (const f of ctx.fighters) {
                if (f === owner || !f.alive) continue;
                const toX = f.x - owner.x, toZ = f.z - owner.z;
                const dot = toX * dirX + toZ * dirZ;
                if (dot > -2 * TILE && dot < (dashDist + 3 * TILE)) {
                    const perp = Math.abs(toX * dirZ - toZ * dirX);
                    if (perp < 3.5 * TILE) {
                        const dmg = Math.round(owner.character.attackDamage * 5 * buffMul);
                        f.takeDamage(dmg, owner);
                        spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#ffffff');
                        f.x += dirX * 2.5 * TILE;
                        f.z += dirZ * 2.5 * TILE;
                        f.mesh.position.set(f.x, 0, f.z);
                    }
                }
            }
            emitParticles(lx, EYE_HEIGHT, lz, {
                color: ['#ffffff', '#ff9800', '#9c27b0', '#ffcc00'],
                count: 60, speed: 7, spread: 3,
                gravity: 0, life: 20, size: 0.2, sizeEnd: 0, drag: 0.94, upward: 3
            });
            groundRing(lx, lz, '#ffffff', 7, 800);
            groundRing(lx, lz, '#9c27b0', 5, 600);
            groundDecal(lx, lz, '#ff9800', 4, 3000);
            lightFlash(lx, EYE_HEIGHT, lz, '#ffffff', 15, 600);
            break;
        }

        case 'Double Medium': {
            // 12-hit barrage with escalating damage
            triggerHitstop(80);
            fovPunch(15, 0.4);
            screenFlash('rgba(156,39,176,0.4)', 800);
            owner.invulnUntil = performance.now() + 3000;
            emitParticles(owner.x, EYE_HEIGHT, owner.z, {
                color: ['#ff9800', '#ffffff', '#9c27b0', '#ffcc00'],
                count: 80, speed: 5, spread: 2.5,
                gravity: 0, life: 25, size: 0.2, sizeEnd: 0, drag: 0.95, upward: 5
            });
            groundRing(owner.x, owner.z, '#ff9800', 6, 1200);
            groundRing(owner.x, owner.z, '#9c27b0', 4, 800);
            lightFlash(owner.x, EYE_HEIGHT, owner.z, '#9c27b0', 10, 800);
            for (let i = 0; i < 12; i++) {
                setTimeout(() => {
                    if (!owner.alive) return;
                    const dir = i % 2 === 0 ? 1 : -1;
                    const hitDist = 2 + Math.random() * 1.5;
                    const perpX = Math.cos(owner.yaw), perpZ = -Math.sin(owner.yaw);
                    const sx = owner.x + dirX * hitDist + perpX * dir * (0.5 + i * 0.1);
                    const sy = EYE_HEIGHT - 0.8 + Math.random() * 1.5;
                    const sz = owner.z + dirZ * hitDist + perpZ * dir * (0.5 + i * 0.1);
                    const slashSize = 4 + i * 0.3;
                    const sGeo = new THREE.PlaneGeometry(slashSize, 0.18);
                    const sMat = new THREE.MeshBasicMaterial({
                        color: i % 4 === 0 ? '#9c27b0' : i % 4 === 1 ? '#ffffff' : i % 4 === 2 ? '#ff9800' : '#ffcc00',
                        transparent: true, opacity: 0.9,
                        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
                    });
                    const sMesh = new THREE.Mesh(sGeo, sMat);
                    sMesh.position.set(sx, sy, sz);
                    sMesh.rotation.set(Math.random() * 0.5 - 0.25, owner.yaw + Math.PI / 2, dir * (0.4 + Math.random() * 0.5));
                    ctx.scene.add(sMesh);
                    const fadeStart = performance.now();
                    const fade = () => {
                        const ft = (performance.now() - fadeStart) / 400;
                        if (ft >= 1) { ctx.scene.remove(sMesh); sGeo.dispose(); sMat.dispose(); return; }
                        sMat.opacity = (1 - ft) * 0.9;
                        sMesh.scale.set(1 + ft * 0.5, 1 + ft * 4, 1);
                        requestAnimationFrame(fade);
                    };
                    requestAnimationFrame(fade);
                    emitParticles(sx, sy, sz, {
                        color: ['#ffffff', '#9c27b0', '#ff9800', '#ffcc00'],
                        count: 8, speed: 4, spread: 0.8,
                        gravity: 0, life: 10, size: 0.08, sizeEnd: 0, drag: 0.94
                    });
                    const dmgMult = 1.0 + i * 0.2;
                    for (const f of ctx.fighters) {
                        if (f === owner || !f.alive) continue;
                        if (Math.hypot(f.x - owner.x, f.z - owner.z) < 5 * TILE) {
                            const dmg = Math.round(owner.character.attackDamage * dmgMult * buffMul);
                            f.takeDamage(dmg, owner);
                            spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#ffffff');
                        }
                    }
                    if (i === 11) triggerHitstop(100);
                    if (i >= 9) lightFlash(sx, sy, sz, '#ffffff', 4, 100);
                }, i * 150);
            }
            setTimeout(() => {
                if (!owner.alive) return;
                screenFlash('rgba(255,152,0,0.5)', 500);
                emitParticles(owner.x + dirX * 3, EYE_HEIGHT, owner.z + dirZ * 3, {
                    color: ['#ffffff', '#ff9800', '#9c27b0'],
                    count: 50, speed: 6, spread: 2,
                    gravity: 0, life: 15, size: 0.18, sizeEnd: 0, drag: 0.95, upward: 2
                });
                groundRing(owner.x, owner.z, '#ffffff', 5, 500);
                lightFlash(owner.x, EYE_HEIGHT, owner.z, '#ffffff', 12, 400);
            }, 12 * 150 + 100);
            break;
        }

        case 'Fumon Tonkou': {
            // Earth-shaking pillar + 8 shockwaves + 10 DOT ticks
            triggerHitstop(200);
            fovPunch(35, 0.5);
            screenFlash('rgba(255,255,255,0.8)', 1000);
            owner.invulnUntil = performance.now() + 3500;
            const pillarGeo = new THREE.CylinderGeometry(0.8, 5, 20, 10, 1, true);
            const pillarMat = new THREE.MeshBasicMaterial({
                color: '#ff9800', transparent: true, opacity: 0.5,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(owner.x, 0, owner.z);
            ctx.scene.add(pillar);
            pillar.add(new THREE.PointLight('#ff9800', 20, 60, 2));
            const pillar2Geo = new THREE.CylinderGeometry(0.5, 4, 18, 10, 1, true);
            const pillar2Mat = new THREE.MeshBasicMaterial({ color: '#9c27b0', transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
            const pillar2 = new THREE.Mesh(pillar2Geo, pillar2Mat);
            pillar2.position.set(owner.x, 0, owner.z);
            ctx.scene.add(pillar2);
            const pillar3Geo = new THREE.CylinderGeometry(0.3, 2, 22, 8, 1, true);
            const pillar3Mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
            const pillar3 = new THREE.Mesh(pillar3Geo, pillar3Mat);
            pillar3.position.set(owner.x, 0, owner.z);
            ctx.scene.add(pillar3);
            for (let r = 0; r < 8; r++) {
                setTimeout(() => {
                    groundRing(owner.x, owner.z, r % 3 === 0 ? '#ffffff' : r % 3 === 1 ? '#ff9800' : '#9c27b0', 4 + r * 2, 1000);
                }, r * 150);
            }
            emitParticles(owner.x, 3, owner.z, {
                color: ['#ff9800', '#ffffff', '#9c27b0', '#ffcc00', '#ff6600'],
                count: 150, speed: 8, spread: 4,
                gravity: 0, life: 35, size: 0.25, sizeEnd: 0, drag: 0.96, upward: 8
            });
            // Initial damage burst
            for (const f of ctx.fighters) {
                if (f === owner || !f.alive) continue;
                const d = Math.hypot(f.x - owner.x, f.z - owner.z);
                if (d < 10 * TILE) {
                    const dmg = Math.round(owner.character.attackDamage * 6 * buffMul);
                    f.takeDamage(dmg, owner);
                    spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#ff9800');
                    f.cooldowns.m1 = performance.now() + 3000;
                } else if (d < 20 * TILE) {
                    const dmg = Math.round(owner.character.attackDamage * 3 * buffMul);
                    f.takeDamage(dmg, owner);
                    spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#ff9800');
                    f.cooldowns.m1 = performance.now() + 1500;
                }
            }
            let ticks = 0;
            const dmgInt = setInterval(() => {
                if (!owner.alive) { clearInterval(dmgInt); return; }
                ticks++;
                for (const f of ctx.fighters) {
                    if (f === owner || !f.alive) continue;
                    if (Math.hypot(f.x - owner.x, f.z - owner.z) < 12 * TILE) {
                        const dmg = Math.round(owner.character.attackDamage * 1.5 * buffMul);
                        f.takeDamage(dmg, owner);
                        spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#ff9800');
                    }
                }
                emitParticles(owner.x, 1, owner.z, {
                    color: ['#ff9800', '#9c27b0', '#ffffff', '#ffcc00'],
                    count: 15, speed: 5, spread: 3,
                    gravity: 0, life: 12, size: 0.12, sizeEnd: 0, drag: 0.95, upward: 4
                });
                if (ticks >= 10) clearInterval(dmgInt);
            }, 300);
            // Fade pillars
            setTimeout(() => {
                const fadeStart = performance.now();
                const fadePillars = () => {
                    const ft = (performance.now() - fadeStart) / 1500;
                    if (ft >= 1) {
                        ctx.scene.remove(pillar); pillarGeo.dispose(); pillarMat.dispose();
                        ctx.scene.remove(pillar2); pillar2Geo.dispose(); pillar2Mat.dispose();
                        ctx.scene.remove(pillar3); pillar3Geo.dispose(); pillar3Mat.dispose();
                        return;
                    }
                    pillarMat.opacity = (1 - ft) * 0.5;
                    pillar2Mat.opacity = (1 - ft) * 0.4;
                    pillar3Mat.opacity = (1 - ft) * 0.3;
                    pillar.scale.x = 1 + ft; pillar.scale.z = 1 + ft;
                    requestAnimationFrame(fadePillars);
                };
                requestAnimationFrame(fadePillars);
            }, 3500);
            groundDecal(owner.x, owner.z, '#ff9800', 6, 8000);
            lightFlash(owner.x, EYE_HEIGHT, owner.z, '#ffffff', 20, 1200);
            break;
        }

        case 'Dash':
        case 'Flash Step':
        case 'Chain Dash':
        case 'Shadow Dash':
        case 'Ice Dash':
        case 'Spirit Dash':
        case 'Thunder Dash': {
            // Anime-style dash with character-color trail + path damage
            const c = owner.character.color;
            const dist = abilityName === 'Flash Step' ? 7 * TILE :
                         abilityName === 'Chain Dash' ? 5 * TILE :
                         abilityName === 'Thunder Dash' ? 7 * TILE : 5 * TILE;
            // Pre-trail
            for (let i = 0; i < 8; i++) {
                const t = i / 8;
                emitParticles(owner.x + dirX * dist * t, EYE_HEIGHT, owner.z + dirZ * dist * t, {
                    color: [c, '#ffffff'], count: 4, speed: 2, spread: 0.5,
                    gravity: 0, life: 12, size: 0.12, sizeEnd: 0, drag: 0.92
                });
            }
            // Path damage
            for (const f of ctx.fighters) {
                if (f === owner || !f.alive) continue;
                const toX = f.x - owner.x, toZ = f.z - owner.z;
                const dot = toX * dirX + toZ * dirZ;
                if (dot > 0 && dot < dist) {
                    const perp = Math.abs(toX * dirZ - toZ * dirX);
                    if (perp < 1.5 * TILE) {
                        const dmg = Math.round(owner.character.attackDamage * 1.5 * buffMul);
                        f.takeDamage(dmg, owner);
                        spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, c);
                    }
                }
            }
            doDash(owner, dirX, dirZ, dist);
            // After-blast
            emitParticles(owner.x, EYE_HEIGHT, owner.z, {
                color: [c, '#ffffff'], count: 14, speed: 4, spread: 0.4,
                gravity: 0, life: 12, size: 0.18, sizeEnd: 0, drag: 0.9
            });
            lightFlash(owner.x, EYE_HEIGHT, owner.z, c, 4, 200);
            fovPunch(15, 0.1);
            break;
        }

        // ══════════ REN — full DC3D port ══════════
        case 'Rapid Tempo Assault': {
            // 6 lightning-fast Kwan Dao thrust lines
            triggerHitstop(80);
            fovPunch(15, 0.3);
            screenFlash('rgba(218,165,32,0.4)', 500);
            owner.invulnUntil = performance.now() + 1500;
            for (let i = 0; i < 6; i++) {
                setTimeout(() => {
                    if (!owner.alive) return;
                    const dist = (2 + i * 0.8) * TILE;
                    const tx = owner.x + dirX * dist;
                    const tz = owner.z + dirZ * dist;
                    const ty = EYE_HEIGHT - 0.3 + Math.random() * 0.6;
                    const tGeo = new THREE.PlaneGeometry(0.1, 3);
                    const tMat = new THREE.MeshBasicMaterial({
                        color: i % 2 === 0 ? '#daa520' : '#ffee00',
                        transparent: true, opacity: 0.9,
                        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
                    });
                    const tMesh = new THREE.Mesh(tGeo, tMat);
                    tMesh.position.set(tx, ty, tz);
                    tMesh.rotation.y = owner.yaw;
                    ctx.scene.add(tMesh);
                    const fadeStart = performance.now();
                    const fade = () => {
                        const ft = (performance.now() - fadeStart) / 300;
                        if (ft >= 1) { ctx.scene.remove(tMesh); tGeo.dispose(); tMat.dispose(); return; }
                        tMat.opacity = (1 - ft) * 0.9;
                        tMesh.scale.set(1 + ft * 5, 1 + ft * 0.3, 1);
                        requestAnimationFrame(fade);
                    };
                    requestAnimationFrame(fade);
                    emitParticles(tx, ty, tz, {
                        color: ['#daa520', '#ffee00', '#ffffff', '#9c27b0'],
                        count: 8, speed: 5, spread: 0.8,
                        gravity: 0, life: 8, size: 0.08, sizeEnd: 0, drag: 0.93
                    });
                    for (const f of ctx.fighters) {
                        if (f === owner || !f.alive) continue;
                        if (Math.hypot(f.x - tx, f.z - tz) < 2 * TILE) {
                            const dmg = Math.round(owner.character.attackDamage * 1.5 * buffMul);
                            f.takeDamage(dmg, owner);
                            spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#daa520');
                        }
                    }
                }, i * 120);
            }
            lightFlash(owner.x + dirX * 3, EYE_HEIGHT, owner.z + dirZ * 3, '#daa520', 6, 400);
            groundRing(owner.x, owner.z, '#daa520', 3, 500);
            break;
        }

        case 'Eleki Bang': {
            // Massive electric shockwave + 8 lightning bolts radiating
            triggerHitstop(150);
            fovPunch(28, 0.4);
            screenFlash('rgba(255,238,0,0.7)', 800);
            owner.invulnUntil = performance.now() + 1000;
            const elekiGeo = new THREE.SphereGeometry(0.5, 10, 10);
            const elekiMat = new THREE.MeshBasicMaterial({
                color: '#ffee00', transparent: true, opacity: 0.7,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            const elekiSphere = new THREE.Mesh(elekiGeo, elekiMat);
            elekiSphere.position.set(owner.x, EYE_HEIGHT - 0.5, owner.z);
            ctx.scene.add(elekiSphere);
            elekiSphere.add(new THREE.PointLight('#ffee00', 15, 40, 2));
            const innerGeo = new THREE.SphereGeometry(0.3, 8, 8);
            const innerMat = new THREE.MeshBasicMaterial({ color: '#9c27b0', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
            elekiSphere.add(new THREE.Mesh(innerGeo, innerMat));
            const expandStart = performance.now();
            const expandEleki = () => {
                const ft = (performance.now() - expandStart) / 800;
                if (ft >= 1) { ctx.scene.remove(elekiSphere); elekiGeo.dispose(); elekiMat.dispose(); innerGeo.dispose(); innerMat.dispose(); return; }
                const s = 0.5 + ft * 12;
                elekiSphere.scale.setScalar(s);
                elekiMat.opacity = (1 - ft) * 0.7;
                requestAnimationFrame(expandEleki);
            };
            requestAnimationFrame(expandEleki);
            for (let b = 0; b < 8; b++) {
                const angle = (b / 8) * Math.PI * 2;
                const boltLen = (6 + Math.random() * 3) * TILE;
                setTimeout(() => {
                    for (let seg = 0; seg < 5; seg++) {
                        const t = seg / 5;
                        const bx = owner.x + Math.cos(angle) * boltLen * t + (Math.random() - 0.5) * TILE;
                        const bz = owner.z + Math.sin(angle) * boltLen * t + (Math.random() - 0.5) * TILE;
                        const by = EYE_HEIGHT - 0.5 + (Math.random() - 0.5);
                        emitParticles(bx, by, bz, {
                            color: ['#ffee00', '#ffffff', '#daa520'],
                            count: 4, speed: 6, spread: 0.5,
                            gravity: 0, life: 6, size: 0.1, sizeEnd: 0, drag: 0.92
                        });
                    }
                }, b * 40);
            }
            for (let r = 0; r < 5; r++) {
                setTimeout(() => groundRing(owner.x, owner.z, r % 2 === 0 ? '#ffee00' : '#9c27b0', 3 + r * 2, 700), r * 100);
            }
            // AOE damage
            for (const f of ctx.fighters) {
                if (f === owner || !f.alive) continue;
                const d = Math.hypot(f.x - owner.x, f.z - owner.z);
                if (d < 8 * TILE) {
                    const dmg = Math.round(owner.character.attackDamage * 4 * buffMul);
                    f.takeDamage(dmg, owner);
                    spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#ffee00');
                    f.cooldowns.m1 = performance.now() + 1500;
                    if (d > 0.3) {
                        const dx = f.x - owner.x, dz = f.z - owner.z;
                        f.x += (dx / d) * 2 * TILE;
                        f.z += (dz / d) * 2 * TILE;
                        f.mesh.position.set(f.x, 0, f.z);
                    }
                }
            }
            emitParticles(owner.x, EYE_HEIGHT, owner.z, {
                color: ['#ffee00', '#ffffff', '#daa520', '#9c27b0'],
                count: 80, speed: 7, spread: 3,
                gravity: 0, life: 20, size: 0.18, sizeEnd: 0, drag: 0.95, upward: 2
            });
            groundDecal(owner.x, owner.z, '#daa520', 4, 3000);
            lightFlash(owner.x, EYE_HEIGHT, owner.z, '#ffee00', 15, 600);
            break;
        }

        case 'Heaven Shaking Thunder': {
            // Lightning pillar from sky + 8 shockwaves + DOT
            triggerHitstop(200);
            fovPunch(35, 0.5);
            screenFlash('rgba(255,255,255,0.9)', 1200);
            owner.invulnUntil = performance.now() + 3000;
            const cx = owner.x, cz = owner.z;
            const pillarGeo = new THREE.CylinderGeometry(0.3, 2.5, 25, 8, 1, true);
            const pillarMat = new THREE.MeshBasicMaterial({
                color: '#ffee00', transparent: true, opacity: 0.6,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(cx, 5, cz);
            ctx.scene.add(pillar);
            pillar.add(new THREE.PointLight('#ffee00', 25, 60, 2));
            const pillar2Geo = new THREE.CylinderGeometry(0.2, 1.5, 25, 8, 1, true);
            const pillar2Mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
            const pillar2 = new THREE.Mesh(pillar2Geo, pillar2Mat);
            pillar2.position.set(cx, 5, cz);
            ctx.scene.add(pillar2);
            const pillar3Geo = new THREE.CylinderGeometry(0.5, 3, 25, 8, 1, true);
            const pillar3Mat = new THREE.MeshBasicMaterial({ color: '#9c27b0', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
            const pillar3 = new THREE.Mesh(pillar3Geo, pillar3Mat);
            pillar3.position.set(cx, 5, cz);
            ctx.scene.add(pillar3);
            for (let i = 0; i < 10; i++) {
                setTimeout(() => {
                    const ly = Math.random() * 20;
                    emitParticles(cx + (Math.random() - 0.5) * 3, ly, cz + (Math.random() - 0.5) * 3, {
                        color: ['#ffee00', '#ffffff', '#daa520'],
                        count: 10, speed: 8, spread: 2,
                        gravity: 0, life: 10, size: 0.12, sizeEnd: 0, drag: 0.93, upward: 3
                    });
                }, i * 120);
            }
            for (let r = 0; r < 8; r++) {
                setTimeout(() => groundRing(cx, cz, r % 3 === 0 ? '#ffffff' : r % 3 === 1 ? '#ffee00' : '#9c27b0', 3 + r * 2, 1000), r * 120);
            }
            emitParticles(cx, 2, cz, {
                color: ['#ffee00', '#ffffff', '#daa520', '#9c27b0', '#ff6600'],
                count: 120, speed: 8, spread: 4,
                gravity: 0, life: 30, size: 0.25, sizeEnd: 0, drag: 0.96, upward: 6
            });
            for (const f of ctx.fighters) {
                if (f === owner || !f.alive) continue;
                const d = Math.hypot(f.x - cx, f.z - cz);
                if (d < 10 * TILE) {
                    const dmg = Math.round(owner.character.attackDamage * 6 * buffMul);
                    f.takeDamage(dmg, owner);
                    spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#ffee00');
                    f.cooldowns.m1 = performance.now() + 3000;
                } else if (d < 20 * TILE) {
                    const dmg = Math.round(owner.character.attackDamage * 3 * buffMul);
                    f.takeDamage(dmg, owner);
                    spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#ffee00');
                }
            }
            let ticks = 0;
            const dmgInt = setInterval(() => {
                if (!owner.alive) { clearInterval(dmgInt); return; }
                ticks++;
                for (const f of ctx.fighters) {
                    if (f === owner || !f.alive) continue;
                    if (Math.hypot(f.x - cx, f.z - cz) < 12 * TILE) {
                        const dmg = Math.round(owner.character.attackDamage * 1.5 * buffMul);
                        f.takeDamage(dmg, owner);
                        spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#ffee00');
                    }
                }
                emitParticles(cx + (Math.random() - 0.5) * 4, 1, cz + (Math.random() - 0.5) * 4, {
                    color: ['#ffee00', '#daa520', '#ffffff'],
                    count: 10, speed: 5, spread: 2,
                    gravity: 0, life: 8, size: 0.1, sizeEnd: 0, drag: 0.95, upward: 3
                });
                if (ticks >= 8) clearInterval(dmgInt);
            }, 300);
            setTimeout(() => {
                const fadeStart = performance.now();
                const fadePillars = () => {
                    const ft = (performance.now() - fadeStart) / 1500;
                    if (ft >= 1) {
                        ctx.scene.remove(pillar); pillarGeo.dispose(); pillarMat.dispose();
                        ctx.scene.remove(pillar2); pillar2Geo.dispose(); pillar2Mat.dispose();
                        ctx.scene.remove(pillar3); pillar3Geo.dispose(); pillar3Mat.dispose();
                        return;
                    }
                    pillarMat.opacity = (1 - ft) * 0.6;
                    pillar2Mat.opacity = (1 - ft) * 0.5;
                    pillar3Mat.opacity = (1 - ft) * 0.25;
                    pillar.scale.x = 1 + ft; pillar.scale.z = 1 + ft;
                    requestAnimationFrame(fadePillars);
                };
                requestAnimationFrame(fadePillars);
            }, 3000);
            groundDecal(cx, cz, '#daa520', 6, 8000);
            lightFlash(cx, EYE_HEIGHT, cz, '#ffffff', 25, 1200);
            break;
        }

        case 'Golden Thunder': {
            // 5 random lightning pillars + final mega-burst
            triggerHitstop(250);
            fovPunch(40, 0.6);
            screenFlash('rgba(255,255,255,1.0)', 1500);
            owner.invulnUntil = performance.now() + 4000;
            const cx0 = owner.x, cz0 = owner.z;
            const pillarMeshes = [];
            for (let p = 0; p < 5; p++) {
                setTimeout(() => {
                    if (!owner.alive) return;
                    const ox = cx0 + (Math.random() - 0.5) * 12 * TILE;
                    const oz = cz0 + (Math.random() - 0.5) * 12 * TILE;
                    const pg = new THREE.CylinderGeometry(0.2, 1.5 + Math.random(), 20, 6, 1, true);
                    const pmat = new THREE.MeshBasicMaterial({
                        color: p % 2 === 0 ? '#daa520' : '#ffee00',
                        transparent: true, opacity: 0.6,
                        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
                    });
                    const pmesh = new THREE.Mesh(pg, pmat);
                    pmesh.position.set(ox, 5, oz);
                    ctx.scene.add(pmesh);
                    pmesh.add(new THREE.PointLight('#ffee00', 15, 32, 2));
                    pillarMeshes.push({ mesh: pmesh, geo: pg, mat: pmat });
                    emitParticles(ox, 1, oz, {
                        color: ['#ffee00', '#daa520', '#ffffff', '#9c27b0'],
                        count: 40, speed: 7, spread: 2.5,
                        gravity: 0, life: 20, size: 0.2, sizeEnd: 0, drag: 0.95, upward: 5
                    });
                    groundRing(ox, oz, '#ffee00', 4 + Math.random() * 2, 800);
                    screenFlash('rgba(218,165,32,0.3)', 200);
                    for (const f of ctx.fighters) {
                        if (f === owner || !f.alive) continue;
                        if (Math.hypot(f.x - ox, f.z - oz) < 6 * TILE) {
                            const dmg = Math.round(owner.character.attackDamage * 3 * buffMul);
                            f.takeDamage(dmg, owner);
                            spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#ffee00');
                        }
                    }
                }, p * 350);
            }
            setTimeout(() => {
                if (!owner.alive) return;
                screenFlash('rgba(255,238,0,0.8)', 1000);
                triggerHitstop(100);
                emitParticles(cx0, 3, cz0, {
                    color: ['#daa520', '#ffee00', '#ffffff', '#9c27b0', '#ff6600'],
                    count: 200, speed: 10, spread: 5,
                    gravity: 0, life: 35, size: 0.3, sizeEnd: 0, drag: 0.96, upward: 8
                });
                for (let r = 0; r < 6; r++) {
                    setTimeout(() => groundRing(cx0, cz0, r % 2 === 0 ? '#daa520' : '#ffffff', 5 + r * 2, 1000), r * 80);
                }
                for (const f of ctx.fighters) {
                    if (f === owner || !f.alive) continue;
                    const dmg = Math.round(owner.character.attackDamage * 5 * buffMul);
                    f.takeDamage(dmg, owner);
                    spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#daa520');
                    f.cooldowns.m1 = performance.now() + 3000;
                }
                lightFlash(cx0, EYE_HEIGHT, cz0, '#daa520', 30, 1500);
            }, 5 * 350 + 200);
            setTimeout(() => {
                for (const { mesh, geo, mat } of pillarMeshes) {
                    const fadeStart = performance.now();
                    const fadePillar = () => {
                        const ft = (performance.now() - fadeStart) / 1200;
                        if (ft >= 1) { ctx.scene.remove(mesh); geo.dispose(); mat.dispose(); return; }
                        mat.opacity = (1 - ft) * 0.6;
                        requestAnimationFrame(fadePillar);
                    };
                    requestAnimationFrame(fadePillar);
                }
            }, 5 * 350 + 1500);
            groundDecal(cx0, cz0, '#daa520', 8, 10000);
            break;
        }

        // ══════════ HOROHORO — full DC3D port ══════════
        case 'Fist Slam': {
            // Massive ice spike eruption
            triggerHitstop(200);
            fovPunch(35, 0.5);
            screenFlash('rgba(66,165,245,0.7)', 1000);
            owner.invulnUntil = performance.now() + 3000;
            const ix = owner.x, iz = owner.z;
            screenFlash('rgba(255,255,255,0.8)', 600);
            triggerHitstop(150);
            emitParticles(ix, 0.5, iz, {
                color: ['#42a5f5', '#90caf9', '#ffffff', '#e3f2fd', '#bbdefb'],
                count: 150, speed: 10, spread: 5,
                gravity: -2, life: 30, size: 0.25, sizeEnd: 0, drag: 0.96, upward: 6
            });
            for (let r = 0; r < 8; r++) {
                setTimeout(() => groundRing(ix, iz, r % 2 === 0 ? '#42a5f5' : '#ffffff', 4 + r * 3, 1000), r * 80);
            }
            const spikeMeshes = [];
            const spikeCount = 40;
            const spikeRadius = 15 * TILE;
            for (let s = 0; s < spikeCount; s++) {
                setTimeout(() => {
                    if (!owner.alive) return;
                    const angle = (s / spikeCount) * Math.PI * 2 + Math.random() * 0.3;
                    const dist = 2 + Math.random() * spikeRadius * 0.9;
                    const sx = ix + Math.cos(angle) * dist;
                    const sz = iz + Math.sin(angle) * dist;
                    const spikeH = 2 + Math.random() * 5;
                    const spikeW = 0.3 + Math.random() * 0.5;
                    const spikeGeo = new THREE.ConeGeometry(spikeW, spikeH, 4 + Math.floor(Math.random() * 3));
                    const spikeMat = new THREE.MeshStandardMaterial({
                        color: Math.random() > 0.3 ? '#90caf9' : '#e3f2fd',
                        roughness: 0.15, metalness: 0.3,
                        transparent: true, opacity: 0.85
                    });
                    const spike = new THREE.Mesh(spikeGeo, spikeMat);
                    spike.position.set(sx, spikeH / 2, sz);
                    const tiltAngle = Math.atan2(sz - iz, sx - ix);
                    spike.rotation.set(0, tiltAngle, (Math.random() - 0.3) * 0.4);
                    ctx.scene.add(spike);
                    spikeMeshes.push({ mesh: spike, geo: spikeGeo, mat: spikeMat });
                    emitParticles(sx, 0.5, sz, {
                        color: ['#42a5f5', '#90caf9', '#ffffff'],
                        count: 5, speed: 3, spread: 0.5,
                        gravity: 0, life: 10, size: 0.08, sizeEnd: 0, drag: 0.94, upward: 2
                    });
                }, s * 30);
            }
            // Damage + freeze all in 15-tile radius
            for (const f of ctx.fighters) {
                if (f === owner || !f.alive) continue;
                if (Math.hypot(f.x - ix, f.z - iz) < 15 * TILE) {
                    const dmg = Math.round(owner.character.attackDamage * 5 * buffMul);
                    f.takeDamage(dmg, owner);
                    spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#42a5f5');
                    f.cooldowns.m1 = performance.now() + 4000;
                    // Ice encase
                    const iceGeo = new THREE.BoxGeometry(1.5, 2.5, 1.5);
                    const iceMat = new THREE.MeshStandardMaterial({ color: '#90caf9', transparent: true, opacity: 0.4, roughness: 0.1, metalness: 0.3 });
                    const iceCase = new THREE.Mesh(iceGeo, iceMat);
                    iceCase.position.copy(f.mesh.position);
                    iceCase.position.y = 1.2;
                    ctx.scene.add(iceCase);
                    setTimeout(() => {
                        const fadeStart = performance.now();
                        const fadeIce = () => {
                            const ft = (performance.now() - fadeStart) / 1000;
                            if (ft >= 1) { ctx.scene.remove(iceCase); iceGeo.dispose(); iceMat.dispose(); return; }
                            iceMat.opacity = (1 - ft) * 0.4;
                            requestAnimationFrame(fadeIce);
                        };
                        requestAnimationFrame(fadeIce);
                    }, 3500);
                }
            }
            lightFlash(ix, 2, iz, '#42a5f5', 20, 1000);
            setTimeout(() => {
                for (const { mesh, geo, mat } of spikeMeshes) {
                    const fadeStart = performance.now();
                    const fadeSpike = () => {
                        const ft = (performance.now() - fadeStart) / 2000;
                        if (ft >= 1) { ctx.scene.remove(mesh); geo.dispose(); mat.dispose(); return; }
                        mat.opacity = (1 - ft) * 0.85;
                        requestAnimationFrame(fadeSpike);
                    };
                    requestAnimationFrame(fadeSpike);
                }
            }, 5000);
            break;
        }

        case 'Ice Barrage': {
            // 8 alternating L/R ice fist projectiles
            triggerHitstop(60);
            fovPunch(15, 0.3);
            screenFlash('rgba(66,165,245,0.4)', 400);
            owner.invulnUntil = performance.now() + 2000;
            for (let i = 0; i < 8; i++) {
                setTimeout(() => {
                    if (!owner.alive) return;
                    const isRight = i % 2 === 0;
                    const perpX = Math.cos(owner.yaw), perpZ = -Math.sin(owner.yaw);
                    const side = isRight ? 1 : -1;
                    const spX = owner.x + dirX * 2 + perpX * side * 1.5;
                    const spZ = owner.z + dirZ * 2 + perpZ * side * 1.5;
                    const fistGeo = new THREE.BoxGeometry(0.8, 0.6, 0.8);
                    const fistMat = new THREE.MeshBasicMaterial({
                        color: '#42a5f5', transparent: true, opacity: 0.8,
                        blending: THREE.AdditiveBlending, depthWrite: false
                    });
                    const fistProj = new THREE.Mesh(fistGeo, fistMat);
                    fistProj.position.set(spX, EYE_HEIGHT, spZ);
                    const innerGeo = new THREE.BoxGeometry(0.5, 0.4, 0.5);
                    const innerMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
                    fistProj.add(new THREE.Mesh(innerGeo, innerMat));
                    fistProj.add(new THREE.PointLight('#42a5f5', 4, 16, 2));
                    ctx.scene.add(fistProj);
                    _vfx.push({
                        mesh: fistProj,
                        x: spX, y: EYE_HEIGHT, z: spZ,
                        dx: dirX * 16, dz: dirZ * 16,
                        life: 2.5, owner, hitSet: new Set(),
                        cleanup() {
                            ctx.scene.remove(fistProj);
                            fistGeo.dispose(); fistMat.dispose();
                            innerGeo.dispose(); innerMat.dispose();
                        },
                        tick(dt, c) {
                            if (!owner.alive) return false;
                            this.life -= dt;
                            if (this.life <= 0) return false;
                            this.x += this.dx * dt; this.z += this.dz * dt;
                            fistProj.position.set(this.x, this.y, this.z);
                            emitParticles(this.x, this.y, this.z, {
                                color: ['#42a5f5', '#90caf9', '#ffffff'],
                                count: 2, speed: 1.5, spread: 0.4,
                                gravity: 0, life: 8, size: 0.08, sizeEnd: 0, drag: 0.94
                            });
                            for (const f of c.fighters) {
                                if (f === owner || !f.alive || this.hitSet.has(f)) continue;
                                if (Math.hypot(f.x - this.x, f.z - this.z) < 1.2 * TILE) {
                                    this.hitSet.add(f);
                                    const dmg = Math.round(owner.character.attackDamage * 2 * buffMul);
                                    f.takeDamage(dmg, owner);
                                    spawnDmgNumber(f.x, this.y, f.z, dmg, '#42a5f5');
                                    return false;
                                }
                            }
                            if (Math.hypot(this.x, this.z) > 90) return false;
                            return true;
                        }
                    });
                    emitParticles(spX, EYE_HEIGHT, spZ, {
                        color: ['#42a5f5', '#ffffff'],
                        count: 8, speed: 4, spread: 1,
                        gravity: 0, life: 8, size: 0.1, sizeEnd: 0, drag: 0.93
                    });
                }, i * 150);
            }
            lightFlash(owner.x, EYE_HEIGHT, owner.z, '#42a5f5', 6, 400);
            break;
        }

        case 'Blizzard': {
            // Whirling ice storm follows caster + tornado pillar
            triggerHitstop(100);
            fovPunch(20, 0.4);
            screenFlash('rgba(144,202,249,0.6)', 800);
            owner.invulnUntil = performance.now() + 4000;
            const tornadoGeo = new THREE.CylinderGeometry(0.5, 4, 12, 8, 1, true);
            const tornadoMat = new THREE.MeshBasicMaterial({
                color: '#90caf9', transparent: true, opacity: 0.2,
                blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
            });
            const tornado = new THREE.Mesh(tornadoGeo, tornadoMat);
            tornado.position.set(owner.x, 0, owner.z);
            ctx.scene.add(tornado);
            tornado.add(new THREE.PointLight('#42a5f5', 8, 32, 2));
            let blizzTicks = 0;
            const blizzInt = setInterval(() => {
                if (!owner.alive) { clearInterval(blizzInt); ctx.scene.remove(tornado); tornadoGeo.dispose(); tornadoMat.dispose(); return; }
                blizzTicks++;
                tornado.rotation.y += 0.1;
                tornado.position.set(owner.x, 0, owner.z);
                const bt = performance.now() * 0.003;
                for (let p = 0; p < 6; p++) {
                    const angle = bt + (p / 6) * Math.PI * 2;
                    const r = (2 + Math.random() * 4) * TILE;
                    emitParticles(owner.x + Math.cos(angle) * r, 1 + Math.random() * 3, owner.z + Math.sin(angle) * r, {
                        color: ['#42a5f5', '#90caf9', '#ffffff', '#e3f2fd', '#bbdefb'],
                        count: 3, speed: 4, spread: 1,
                        gravity: 0, life: 15, size: 0.12, sizeEnd: 0, drag: 0.95
                    });
                }
                for (const f of ctx.fighters) {
                    if (f === owner || !f.alive) continue;
                    if (Math.hypot(f.x - owner.x, f.z - owner.z) < 6 * TILE) {
                        const dmg = Math.round(owner.character.attackDamage * 1.5 * buffMul);
                        f.takeDamage(dmg, owner);
                        spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#42a5f5');
                        f.cooldowns.m1 = performance.now() + 500;
                    }
                }
                if (blizzTicks >= 60) {
                    clearInterval(blizzInt);
                    const fadeStart = performance.now();
                    const fadeTorn = () => {
                        const ft = (performance.now() - fadeStart) / 1000;
                        if (ft >= 1) { ctx.scene.remove(tornado); tornadoGeo.dispose(); tornadoMat.dispose(); return; }
                        tornadoMat.opacity = (1 - ft) * 0.2;
                        requestAnimationFrame(fadeTorn);
                    };
                    requestAnimationFrame(fadeTorn);
                }
            }, 50);
            groundRing(owner.x, owner.z, '#42a5f5', 6, 1000);
            lightFlash(owner.x, EYE_HEIGHT, owner.z, '#90caf9', 10, 600);
            break;
        }

        case 'Avalanche': {
            // Wall of ice spikes traveling forward in rows
            triggerHitstop(250);
            fovPunch(40, 0.6);
            screenFlash('rgba(255,255,255,1.0)', 1500);
            owner.invulnUntil = performance.now() + 4000;
            const wallMeshes = [];
            const wallWidth = 10;
            const wallDepth = 20;
            for (let row = 0; row < wallDepth; row++) {
                setTimeout(() => {
                    if (!owner.alive) return;
                    const rowDist = (2 + row * 1.5) * TILE;
                    for (let col = 0; col < wallWidth; col++) {
                        const perpX = Math.cos(owner.yaw), perpZ = -Math.sin(owner.yaw);
                        const colOffset = (col - wallWidth / 2 + 0.5) * 1.2 * TILE;
                        const sx = owner.x + dirX * rowDist + perpX * colOffset;
                        const sz = owner.z + dirZ * rowDist + perpZ * colOffset;
                        const h = 3 + Math.random() * 6;
                        const spikeGeo = new THREE.ConeGeometry(0.4 + Math.random() * 0.3, h, 4);
                        const spikeMat = new THREE.MeshStandardMaterial({
                            color: Math.random() > 0.5 ? '#90caf9' : '#e3f2fd',
                            roughness: 0.1, metalness: 0.3,
                            transparent: true, opacity: 0.8
                        });
                        const spike = new THREE.Mesh(spikeGeo, spikeMat);
                        spike.position.set(sx, h / 2, sz);
                        spike.rotation.set(0, Math.random() * Math.PI, (Math.random() - 0.5) * 0.3);
                        ctx.scene.add(spike);
                        wallMeshes.push({ mesh: spike, geo: spikeGeo, mat: spikeMat });
                    }
                    // Damage at this row
                    const rowX = owner.x + dirX * rowDist;
                    const rowZ = owner.z + dirZ * rowDist;
                    for (const f of ctx.fighters) {
                        if (f === owner || !f.alive) continue;
                        const perpDist = Math.abs((f.x - rowX) * dirZ - (f.z - rowZ) * dirX);
                        const fwdDist = (f.x - rowX) * dirX + (f.z - rowZ) * dirZ;
                        if (perpDist < wallWidth * 0.8 * TILE && Math.abs(fwdDist) < 2 * TILE) {
                            const dmg = Math.round(owner.character.attackDamage * 3 * buffMul);
                            f.takeDamage(dmg, owner);
                            spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#42a5f5');
                            f.cooldowns.m1 = performance.now() + 3000;
                            f.x += dirX * 2 * TILE;
                            f.z += dirZ * 2 * TILE;
                            f.mesh.position.set(f.x, 0, f.z);
                        }
                    }
                    emitParticles(rowX, 1, rowZ, {
                        color: ['#42a5f5', '#90caf9', '#ffffff', '#e3f2fd'],
                        count: 20, speed: 6, spread: 3,
                        gravity: 0, life: 15, size: 0.15, sizeEnd: 0, drag: 0.95, upward: 4
                    });
                    groundRing(rowX, rowZ, '#42a5f5', 4, 500);
                }, row * 80);
            }
            emitParticles(owner.x, 2, owner.z, {
                color: ['#42a5f5', '#90caf9', '#ffffff', '#e3f2fd', '#bbdefb'],
                count: 100, speed: 8, spread: 4,
                gravity: 0, life: 25, size: 0.25, sizeEnd: 0, drag: 0.96, upward: 5
            });
            for (let r = 0; r < 6; r++) {
                setTimeout(() => groundRing(owner.x, owner.z, r % 2 === 0 ? '#42a5f5' : '#ffffff', 4 + r * 2, 800), r * 100);
            }
            lightFlash(owner.x, EYE_HEIGHT, owner.z, '#ffffff', 25, 1200);
            setTimeout(() => {
                for (const { mesh, geo, mat } of wallMeshes) {
                    const fadeStart = performance.now();
                    const fadeSpike = () => {
                        const ft = (performance.now() - fadeStart) / 2000;
                        if (ft >= 1) { ctx.scene.remove(mesh); geo.dispose(); mat.dispose(); return; }
                        mat.opacity = (1 - ft) * 0.8;
                        requestAnimationFrame(fadeSpike);
                    };
                    requestAnimationFrame(fadeSpike);
                }
            }, 6000);
            break;
        }

        // ══════════ TODO — full DC3D port ══════════
        case 'Black Flash': {
            // TODO Z primes next M1 (or for BR fires a heavy yellow projectile, since
            // we can't easily hook into existing M1). Yuta C reuses this name; both
            // currently land as a heavy AOE projectile + black-red flash cue.
            screenFlash('rgba(170,0,16,0.5)', 80);
            triggerHitstop(60);
            const wx = owner.x, wz = owner.z;
            groundRing(wx, wz, '#aa0010', 1.6, 250);
            emitParticles(wx, EYE_HEIGHT, wz, {
                color: ['#0a0010', '#5a0010', '#aa0010', '#ffffff'],
                count: 14, speed: 4, spread: 1.5,
                gravity: 0, life: 16, size: 0.10, sizeEnd: 0, drag: 0.92, upward: 1.5
            });
            spawnProjectile(ctx.scene, owner, ctx, {
                color: '#eeff00', dirX, dirZ, damage: baseDmg * 4.5 * buffMul,
                radius: 0.6, speed: 36, lifetime: 0.9, aoeRadius: 3,
                trailColor: '#ffffaa'
            });
            break;
        }

        case 'Face Slam': {
            // Dash, grab, slam — heavy AOE on landing
            const before = { x: owner.x, z: owner.z };
            doDash(owner, dirX, dirZ, 4 * TILE);
            const arm = owner.charMesh && owner.charMesh._rightArm;
            if (arm) { arm.rotation.set(-2.2, 0, 0); setTimeout(() => { if (arm) arm.rotation.set(0.05, 0, 0); }, 500); }
            triggerHitstop(80);
            fovPunch(22, 0.18);
            screenShake(0.6, 200);
            // Slam impact
            const ix = owner.x, iz = owner.z;
            groundRing(ix, iz, '#d4a070', 4, 800);
            groundRing(ix, iz, '#5a2820', 2.5, 600);
            groundDecal(ix, iz, '#552200', 3, 5000);
            emitParticles(ix, 0.5, iz, {
                color: ['#d4a070', '#a87850', '#5a2820', '#aa0010'],
                count: 50, speed: 7, spread: 2.5,
                gravity: -4, life: 22, size: 0.22, sizeEnd: 0, drag: 0.93, upward: 1.5
            });
            for (const f of ctx.fighters) {
                if (f === owner || !f.alive) continue;
                const d = Math.hypot(f.x - ix, f.z - iz);
                if (d < 4 * TILE) {
                    const falloff = 1 - (d / (4 * TILE)) * 0.5;
                    const dmg = Math.round(owner.character.attackDamage * 4 * falloff * buffMul);
                    f.takeDamage(dmg, owner);
                    spawnDmgNumber(f.x, EYE_HEIGHT, f.z, dmg, '#d4a070');
                    if (d > 0.3) {
                        f.x += (f.x - ix) / d * 2 * TILE;
                        f.z += (f.z - iz) / d * 2 * TILE;
                        f.mesh.position.set(f.x, 0, f.z);
                    }
                }
            }
            lightFlash(ix, 1, iz, '#d4a070', 8, 400);
            break;
        }

        case 'Boulder Kick': {
            // Big rock projectile, tumbles + explodes
            const arm = owner.charMesh && owner.charMesh._rightArm;
            if (arm) { arm.rotation.set(-0.5, 0, 0.5); setTimeout(() => { if (arm) arm.rotation.set(0.05, 0, 0); }, 400); }
            const stoneMat = new THREE.MeshStandardMaterial({ color: '#5a5048', roughness: 0.9 });
            const boulder = new THREE.Group();
            const rockGeo = new THREE.SphereGeometry(0.85, 12, 10);
            const rPos = rockGeo.attributes.position;
            for (let i = 0; i < rPos.count; i++) {
                const x = rPos.getX(i), y = rPos.getY(i), z = rPos.getZ(i);
                const noise = Math.sin(x * 7) * Math.cos(y * 6) * Math.sin(z * 8) * 0.18;
                const len = Math.sqrt(x * x + y * y + z * z);
                if (len > 0.001) { const k = 1 + noise / len; rPos.setXYZ(i, x * k, y * k, z * k); }
            }
            rockGeo.computeVertexNormals();
            boulder.add(new THREE.Mesh(rockGeo, stoneMat));
            boulder.position.set(owner.x + dirX * 1.5, 1, owner.z + dirZ * 1.5);
            ctx.scene.add(boulder);
            _vfx.push({
                mesh: boulder,
                x: boulder.position.x, y: 1, z: boulder.position.z,
                dx: dirX * 14, dz: dirZ * 14,
                life: 2.5, owner, hitSet: new Set(),
                cleanup() {
                    ctx.scene.remove(boulder);
                    rockGeo.dispose(); stoneMat.dispose();
                },
                tick(dt, c) {
                    if (!owner.alive) return false;
                    this.life -= dt;
                    if (this.life <= 0) return false;
                    this.x += this.dx * dt; this.z += this.dz * dt;
                    boulder.position.set(this.x, this.y, this.z);
                    boulder.rotation.x += 0.45;
                    boulder.rotation.z += 0.32;
                    emitParticles(this.x, this.y, this.z, {
                        color: ['#5a4838', '#8a7860'],
                        count: 2, speed: 1.5, spread: 0.6,
                        gravity: 0, life: 10, size: 0.12, sizeEnd: 0, drag: 0.92
                    });
                    for (const f of c.fighters) {
                        if (f === owner || !f.alive || this.hitSet.has(f)) continue;
                        if (Math.hypot(f.x - this.x, f.z - this.z) < 1.5 * TILE) {
                            this.hitSet.add(f);
                            const dmg = Math.round(owner.character.attackDamage * 4 * buffMul);
                            f.takeDamage(dmg, owner);
                            spawnDmgNumber(f.x, this.y, f.z, dmg, '#886644');
                            // Splash
                            applyAOE(ctx.scene, owner, c.fighters, this.x, this.z, 2 * TILE,
                                owner.character.attackDamage * 1.5 * buffMul, '#886644');
                            triggerHitstop(80);
                            screenShake(0.5, 200);
                            return false;
                        }
                    }
                    if (Math.hypot(this.x, this.z) > 90) return false;
                    return true;
                }
            });
            break;
        }

        // ══════════ YUTA — full DC3D port ══════════
        case 'Rika': {
            // Pink cursed-energy petal storm + slam
            const sx = owner.x + dirX * 1.8 * TILE;
            const sz = owner.z + dirZ * 1.8 * TILE;
            const pinks = ['#ff5aaa', '#ffaadc', '#ff2288', '#ff8acc', '#ffc8e0', '#ffffff'];
            fovPunch(8, 0.15);
            emitParticles(sx, 0.3, sz, {
                color: pinks, count: 40, speed: 5, spread: 1.8,
                gravity: 0, life: 22, size: 0.18, sizeEnd: 0, drag: 0.92, upward: 3
            });
            for (let i = 0; i < 6; i++) {
                setTimeout(() => {
                    const offX = (Math.random() - 0.5) * 5;
                    const offZ = (Math.random() - 0.5) * 5;
                    emitParticles(sx + offX, 4.5, sz + offZ, {
                        color: pinks, count: 18, speed: 1.2, spread: 1.4,
                        gravity: -2.2, life: 36, size: 0.14, sizeEnd: 0, drag: 0.97
                    });
                }, i * 110);
            }
            groundRing(sx, sz, '#ff5aaa', 3.2, 700);
            groundRing(sx, sz, '#ff2288', 2.0, 500);
            lightFlash(sx, 1.5, sz, '#ff2288', 8, 380);
            screenFlash('rgba(255,170,220,0.4)', 90);
            // Damage AOE at slam point
            applyAOE(ctx.scene, owner, ctx.fighters, sx, sz, 3.5 * TILE,
                owner.character.attackDamage * 4 * buffMul, '#ff2288');
            break;
        }

        case 'Crush': {
            // Drop a giant boulder on nearest enemy in front cone — instant kill
            let target = null, bestDist = Infinity;
            const dirAng = Math.atan2(-dirX, -dirZ);
            for (const f of ctx.fighters) {
                if (f === owner || !f.alive) continue;
                const dx = f.x - owner.x, dz = f.z - owner.z;
                const d = Math.hypot(dx, dz);
                if (d > 8 * TILE) continue;
                const a = Math.atan2(-dx, -dz);
                let ad = a - owner.yaw;
                while (ad > Math.PI) ad -= Math.PI * 2;
                while (ad < -Math.PI) ad += Math.PI * 2;
                if (Math.abs(ad) > Math.PI * 0.45) continue;
                if (d < bestDist) { bestDist = d; target = f; }
            }
            if (!target) break;
            const tx = target.x, tz = target.z;
            const stoneMat = new THREE.MeshStandardMaterial({ color: '#5a5048', roughness: 0.9 });
            const boulderGeo = new THREE.SphereGeometry(0.85, 14, 12);
            const bPos = boulderGeo.attributes.position;
            for (let i = 0; i < bPos.count; i++) {
                const x = bPos.getX(i), y = bPos.getY(i), z = bPos.getZ(i);
                const noise = Math.sin(x * 7) * Math.cos(y * 6) * Math.sin(z * 8) * 0.18;
                const len = Math.sqrt(x * x + y * y + z * z);
                if (len > 0.001) { const k = 1 + noise / len; bPos.setXYZ(i, x * k, y * k, z * k); }
            }
            boulderGeo.computeVertexNormals();
            const boulder = new THREE.Mesh(boulderGeo, stoneMat);
            boulder.position.set(tx, 12, tz);
            ctx.scene.add(boulder);
            const shadowGeo = new THREE.CircleGeometry(1.0, 24);
            const shadowMat = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });
            const shadow = new THREE.Mesh(shadowGeo, shadowMat);
            shadow.rotation.x = -Math.PI / 2;
            shadow.position.set(tx, 0.04, tz);
            ctx.scene.add(shadow);
            target.cooldowns.m1 = performance.now() + 1000; // pin
            const startTime = performance.now();
            const fallDur = 350;
            const animFall = () => {
                const t = (performance.now() - startTime) / fallDur;
                if (t >= 1) {
                    boulder.position.y = 0.85;
                    emitParticles(tx, 0.6, tz, {
                        color: ['#8a7860', '#5a4838', '#3a3028', '#aa0010', '#5a0010', '#ffffff'],
                        count: 60, speed: 9, spread: 2.5,
                        gravity: -4, life: 24, size: 0.22, sizeEnd: 0, drag: 0.92, upward: 1.5
                    });
                    triggerHitstop(220);
                    fovPunch(22, 0.16);
                    screenFlash('rgba(170,0,16,0.5)', 120);
                    groundRing(tx, tz, '#5a0010', 4, 700);
                    groundRing(tx, tz, '#8a7860', 3, 600);
                    groundDecal(tx, tz, '#3a3028', 2, 5000);
                    lightFlash(tx, 0.6, tz, '#aa0010', 20, 400);
                    if (target.alive) {
                        target.takeDamage(target.hp + 9999, owner);
                        spawnDmgNumber(tx, EYE_HEIGHT, tz, 'CRUSH', '#aa0010');
                    }
                    ctx.scene.remove(shadow);
                    shadowGeo.dispose(); shadowMat.dispose();
                    setTimeout(() => {
                        const fadeStart = performance.now();
                        const fadeOut = () => {
                            const ft = (performance.now() - fadeStart) / 1000;
                            if (ft >= 1) { ctx.scene.remove(boulder); boulderGeo.dispose(); stoneMat.dispose(); return; }
                            stoneMat.transparent = true;
                            stoneMat.opacity = 1 - ft;
                            requestAnimationFrame(fadeOut);
                        };
                        requestAnimationFrame(fadeOut);
                    }, 1500);
                    return;
                }
                const ease = t * t;
                boulder.position.y = 12 - ease * 11.15;
                boulder.rotation.x += 0.15;
                boulder.rotation.z += 0.10;
                requestAnimationFrame(animFall);
            };
            requestAnimationFrame(animFall);
            break;
        }

        case 'Reverse Cursed Technique': {
            // Heal 40% of max HP over 1.5s in 5 ticks
            const aura = owner.character.color || '#5a8aff';
            const totalHeal = Math.round(owner.maxHp * 0.40);
            const ticks = 5;
            const perTick = Math.round(totalHeal / ticks);
            let remaining = ticks;
            const handle = setInterval(() => {
                if (!owner.alive) { clearInterval(handle); return; }
                owner.hp = Math.min(owner.maxHp, owner.hp + perTick);
                owner.takeDamage(0, null); // refresh HP bar
                spawnDmgNumber(owner.x, EYE_HEIGHT, owner.z, '+' + perTick, '#88ffaa');
                emitParticles(owner.x, EYE_HEIGHT * 0.5, owner.z, {
                    color: [aura, '#ffffff', '#a8c8ff'],
                    count: 8, speed: 2, spread: 1.0,
                    gravity: 2, life: 18, size: 0.10, sizeEnd: 0, drag: 0.94, upward: 0.5
                });
                remaining--;
                if (remaining <= 0) clearInterval(handle);
            }, 300);
            groundRing(owner.x, owner.z, aura, 2.0, 600);
            lightFlash(owner.x, EYE_HEIGHT, owner.z, aura, 6, 400);
            screenFlash('rgba(90,138,255,0.3)', 120);
            break;
        }

        case 'True Love Beam': {
            // Pink beam streaked with black + sword raise
            const arm = owner.charMesh && owner.charMesh._rightArm;
            if (arm) { arm.rotation.set(-2.5, 0, -0.3); setTimeout(() => { if (arm) arm.rotation.set(0.05, 0, 0); }, 1400); }
            // Charge particles
            const chargeX = owner.x + dirX * 0.6, chargeZ = owner.z + dirZ * 0.6;
            emitParticles(chargeX, EYE_HEIGHT + 0.6, chargeZ, {
                color: ['#ff5aaa', '#ffaadc', '#ff2288', '#ffffff'],
                count: 28, speed: 2.5, spread: 1.6,
                gravity: 0, life: 22, size: 0.13, sizeEnd: 0, drag: 0.94, upward: 0.5
            });
            fovPunch(8, 0.10);
            setTimeout(() => {
                if (!owner.alive) return;
                // Long pink beam + black streaks
                castBeamLine(ctx.scene, owner, ctx.fighters, dirX, dirZ, 32 * TILE,
                    owner.character.attackDamage * 5 * buffMul, '#ff66cc');
                // Black-cursed-energy streaks alongside the beam
                for (let i = 0; i < 6; i++) {
                    setTimeout(() => {
                        const offX = (Math.random() - 0.5) * 0.6;
                        const offZ = (Math.random() - 0.5) * 0.6;
                        const sx0 = owner.x + offX, sz0 = owner.z + offZ;
                        const ex0 = sx0 + dirX * 32 * TILE, ez0 = sz0 + dirZ * 32 * TILE;
                        beamEffect(sx0, EYE_HEIGHT, sz0, ex0, EYE_HEIGHT, ez0, '#1a0010', 500, 0.08);
                    }, i * 30);
                }
                screenFlash('rgba(255,102,204,0.4)', 300);
                triggerHitstop(80);
                lightFlash(owner.x + dirX * 5, EYE_HEIGHT, owner.z + dirZ * 5, '#ff66cc', 12, 400);
            }, 350);
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
