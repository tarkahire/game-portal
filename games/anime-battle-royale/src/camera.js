// Player camera adapted from dungeon-crawler-3d's FPSCamera.
// - Mouse look (yaw + pitch) when pointer-locked
// - WASD strafe-relative-to-camera
// - T toggles 1st <-> 3rd person
// - Player mesh visible in 3rd person, hidden in 1st
import * as THREE from 'three';
import { ARENA_RADIUS, collidesCover } from './arena.js';

const EYE_HEIGHT = 2.4;
const PLAYER_RADIUS = 0.5;

export class PlayerCamera {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.yaw = 0;
        this.pitch = 0;
        this.thirdPerson = true;          // BR defaults to 3rd-person
        this.tpDistance = 5.5;
        this.tpHeight = 2.0;
        this.eyeHeight = EYE_HEIGHT;

        this.fighter = null;              // Fighter to follow (player)
        this.keys = {};                   // shared key state, keyed on event.code

        this._installed = false;
        this._cineUntil = 0;
    }

    setFighter(fighter) {
        this.fighter = fighter;
        if (fighter) {
            this.yaw = fighter.yaw || 0;
        }
    }

    install() {
        if (this._installed) return;
        this._installed = true;

        this._onKeyDown = (e) => {
            this.keys[e.code] = true;
            if (e.code === 'KeyT') this.thirdPerson = !this.thirdPerson;
        };
        this._onKeyUp = (e) => { this.keys[e.code] = false; };
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);

        // Mouse look
        this._onMouseMove = (e) => {
            if (document.pointerLockElement !== this.domElement) return;
            this.yaw -= e.movementX * 0.0022;
            this.pitch -= e.movementY * 0.0022;
            this.pitch = Math.max(-Math.PI / 2.4, Math.min(Math.PI / 2.4, this.pitch));
        };
        document.addEventListener('mousemove', this._onMouseMove);

        // Pointer lock on canvas click
        this._onClick = () => {
            if (document.pointerLockElement !== this.domElement) {
                this.domElement.requestPointerLock?.();
            }
        };
        this.domElement.addEventListener('click', this._onClick);
    }

    isLocked() { return document.pointerLockElement === this.domElement; }

    // Forward direction in XZ (matches dungeon-crawler-3d convention: yaw=0 -> -Z)
    forwardXZ() {
        return { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
    }
    rightXZ() {
        return { x: Math.cos(this.yaw), z: -Math.sin(this.yaw) };
    }

    // Per-frame: read keys, move fighter, position camera
    update(dt, ctx) {
        if (!this.fighter || !this.fighter.alive) {
            // Camera still follows last position / looks at origin
            if (this.fighter) this._placeCamera(this.fighter.x, this.fighter.z);
            return;
        }
        const f = this.fighter;

        // Strafe-relative-to-camera input
        let mx = 0, mz = 0;
        const fwd = this.forwardXZ();
        const right = this.rightXZ();
        if (this.keys['KeyW'] || this.keys['ArrowUp'])    { mx += fwd.x;   mz += fwd.z; }
        if (this.keys['KeyS'] || this.keys['ArrowDown'])  { mx -= fwd.x;   mz -= fwd.z; }
        if (this.keys['KeyA'] || this.keys['ArrowLeft'])  { mx -= right.x; mz -= right.z; }
        if (this.keys['KeyD'] || this.keys['ArrowRight']) { mx += right.x; mz += right.z; }
        const len = Math.hypot(mx, mz);
        if (len > 0) { mx /= len; mz /= len; }

        const sprint = this.keys['ShiftLeft'] || this.keys['ShiftRight'] ? 1.5 : 1.0;
        const buffMul = (performance.now() < f.buffUntil) ? f.buffMul : 1.0;
        const sp = f.speed * sprint * buffMul;

        const nx = f.x + mx * sp * dt;
        const nz = f.z + mz * sp * dt;
        if (!collidesCover(ctx.cover, nx, f.z, PLAYER_RADIUS)) f.x = nx;
        if (!collidesCover(ctx.cover, f.x, nz, PLAYER_RADIUS)) f.z = nz;
        // Clamp to outer playable bounds (arena edge + a little)
        const r = Math.hypot(f.x, f.z);
        const maxR = ARENA_RADIUS + 5;
        if (r > maxR) { f.x = f.x / r * maxR; f.z = f.z / r * maxR; }

        f.vx = mx * sp; f.vz = mz * sp;
        f.mesh.position.set(f.x, 0, f.z);
        // Fighter yaw matches camera yaw — Fighter.tick rotates mesh by yaw+π
        f.yaw = this.yaw;

        this._placeCamera(f.x, f.z);
    }

    _placeCamera(tx, tz) {
        const f = this.fighter;
        const eyeY = this.eyeHeight;

        if (this.thirdPerson) {
            const behindX = Math.sin(this.yaw) * this.tpDistance * Math.cos(this.pitch);
            const behindZ = Math.cos(this.yaw) * this.tpDistance * Math.cos(this.pitch);
            const behindY = -Math.sin(this.pitch) * this.tpDistance + this.tpHeight;
            this.camera.position.set(tx + behindX, eyeY + behindY, tz + behindZ);
            this.camera.lookAt(tx, eyeY, tz);
            if (f && f.mesh) f.mesh.visible = true;
        } else {
            this.camera.position.set(tx, eyeY, tz);
            const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
            this.camera.quaternion.setFromEuler(euler);
            if (f && f.mesh) f.mesh.visible = false;
        }

        // Cinematic override
        if (this._cineUntil && performance.now() < this._cineUntil) {
            this.camera.position.set(this._cinePos.x, this._cinePos.y, this._cinePos.z);
            this.camera.lookAt(this._cineLook.x, this._cineLook.y, this._cineLook.z);
            if (f && f.mesh) f.mesh.visible = true;
        }
    }

    setCinematic(px, py, pz, lx, ly, lz, durationMs) {
        this._cineUntil = performance.now() + durationMs;
        this._cinePos = { x: px, y: py, z: pz };
        this._cineLook = { x: lx, y: ly, z: lz };
    }
    clearCinematic() { this._cineUntil = 0; }

    dispose() {
        if (!this._installed) return;
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
        document.removeEventListener('mousemove', this._onMouseMove);
        this.domElement.removeEventListener('click', this._onClick);
        this._installed = false;
    }
}
