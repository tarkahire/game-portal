// Shrinking storm circle
import * as THREE from 'three';
import { ARENA_RADIUS } from './arena.js';

export class Storm {
    constructor(scene) {
        this.scene = scene;
        this.radius = ARENA_RADIUS;
        this.targetRadius = ARENA_RADIUS;
        this.shrinkRate = 0;             // units per second (0 = idle)
        this.tickAccum = 0;
        this.dmgPerTick = 5;
        this.tickInterval = 1.0;         // seconds
        this.phaseIndex = 0;
        // Phases: [delayBeforeShrink, finalRadius, shrinkDurationSeconds]
        this.phases = [
            { delay: 30, target: ARENA_RADIUS * 0.65, duration: 25 },
            { delay: 30, target: ARENA_RADIUS * 0.35, duration: 25 },
            { delay: 25, target: ARENA_RADIUS * 0.15, duration: 20 },
            { delay: 20, target: 4,                   duration: 20 }
        ];
        this.phaseTimer = this.phases[0].delay;
        this.shrinking = false;

        // Visual: cylinder shell + ground ring built at unit radius. We scale
        // them per frame instead of rebuilding the geometry — disposing and
        // recreating buffer geometry every frame for the entire shrink phase
        // was the biggest single frame-time hog.
        const mat = new THREE.MeshBasicMaterial({
            color: 0xff00aa, transparent: true, opacity: 0.18,
            side: THREE.BackSide, depthWrite: false
        });
        this.shellGeo = new THREE.CylinderGeometry(1, 1, 60, 32, 1, true);
        this.shell = new THREE.Mesh(this.shellGeo, mat);
        this.shell.position.y = 30;
        this.shell.scale.set(this.radius, 1, this.radius);
        scene.add(this.shell);

        const ringMat = new THREE.MeshBasicMaterial({ color: 0xff00aa, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
        // Thin unit ring; world thickness ≈ 0.6 at the starting radius.
        this.ringGeo = new THREE.RingGeometry(1 - 0.0043, 1 + 0.0043, 64);
        this.ring = new THREE.Mesh(this.ringGeo, ringMat);
        this.ring.rotation.x = -Math.PI / 2;
        this.ring.position.y = 0.06;
        this.ring.scale.set(this.radius, this.radius, 1);
        scene.add(this.ring);
    }

    update(dt, fighters) {
        // Phase progression
        if (!this.shrinking) {
            this.phaseTimer -= dt;
            if (this.phaseTimer <= 0 && this.phaseIndex < this.phases.length) {
                const p = this.phases[this.phaseIndex];
                this.targetRadius = p.target;
                this.shrinkRate = (this.radius - p.target) / p.duration;
                this.shrinking = true;
            }
        } else {
            this.radius = Math.max(this.targetRadius, this.radius - this.shrinkRate * dt);
            if (this.radius <= this.targetRadius + 0.05) {
                this.radius = this.targetRadius;
                this.shrinking = false;
                this.phaseIndex++;
                if (this.phaseIndex < this.phases.length) {
                    this.phaseTimer = this.phases[this.phaseIndex].delay;
                }
            }
            this.shell.scale.set(this.radius, 1, this.radius);
            this.ring.scale.set(this.radius, this.radius, 1);
        }

        // Damage tick
        this.tickAccum += dt;
        if (this.tickAccum >= this.tickInterval) {
            this.tickAccum -= this.tickInterval;
            for (const f of fighters) {
                if (!f.alive) continue;
                const r = Math.hypot(f.x, f.z);
                if (r > this.radius) {
                    f.takeDamage(this.dmgPerTick, null);
                }
            }
        }
    }

    timerLabel() {
        if (this.shrinking) {
            return `Storm shrinking → ${Math.round(this.targetRadius)}m`;
        }
        if (this.phaseIndex >= this.phases.length) return 'Final ring';
        return `Storm shrinks in ${Math.max(0, Math.ceil(this.phaseTimer))}s`;
    }
}
