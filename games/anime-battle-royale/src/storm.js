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

        // Visual: cylinder shell at storm radius edge
        const mat = new THREE.MeshBasicMaterial({
            color: 0xff00aa, transparent: true, opacity: 0.18,
            side: THREE.BackSide, depthWrite: false
        });
        this.shellGeo = new THREE.CylinderGeometry(this.radius, this.radius, 60, 64, 1, true);
        this.shell = new THREE.Mesh(this.shellGeo, mat);
        this.shell.position.y = 30;
        scene.add(this.shell);

        // Ground edge ring
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xff00aa, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
        this.ringGeo = new THREE.RingGeometry(this.radius - 0.3, this.radius + 0.3, 96);
        this.ring = new THREE.Mesh(this.ringGeo, ringMat);
        this.ring.rotation.x = -Math.PI / 2;
        this.ring.position.y = 0.06;
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
            // Rebuild geometries
            this._rebuildGeo();
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

    _rebuildGeo() {
        this.shell.geometry.dispose();
        this.shell.geometry = new THREE.CylinderGeometry(this.radius, this.radius, 60, 64, 1, true);
        this.ring.geometry.dispose();
        this.ring.geometry = new THREE.RingGeometry(this.radius - 0.3, this.radius + 0.3, 96);
    }

    timerLabel() {
        if (this.shrinking) {
            return `Storm shrinking → ${Math.round(this.targetRadius)}m`;
        }
        if (this.phaseIndex >= this.phases.length) return 'Final ring';
        return `Storm shrinks in ${Math.max(0, Math.ceil(this.phaseTimer))}s`;
    }
}
