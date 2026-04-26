// Third-person orbit camera with mouse look + pointer lock
import * as THREE from 'three';

export class ThirdPersonCamera {
    constructor(camera, target) {
        this.camera = camera;
        this.target = target;            // THREE.Object3D (player mesh) or { x, z }
        this.yaw = 0;                    // horizontal angle
        this.pitch = -0.18;              // looking slightly down
        this.distance = 5.5;
        this.heightOffset = 1.6;
        this.sensitivity = 0.0024;
        this._locked = false;
        this._installed = false;
    }

    install(canvas) {
        if (this._installed) return;
        this._installed = true;
        canvas.addEventListener('click', () => {
            canvas.requestPointerLock?.();
        });
        document.addEventListener('pointerlockchange', () => {
            this._locked = document.pointerLockElement === canvas;
        });
        document.addEventListener('mousemove', (e) => {
            if (!this._locked) return;
            this.yaw -= e.movementX * this.sensitivity;
            this.pitch -= e.movementY * this.sensitivity;
            this.pitch = Math.max(-1.2, Math.min(0.8, this.pitch));
        });
    }

    isLocked() { return this._locked; }

    update() {
        if (!this.target) return;
        const tx = this.target.x ?? this.target.position?.x ?? 0;
        const tz = this.target.z ?? this.target.position?.z ?? 0;
        const cosP = Math.cos(this.pitch);
        const ox = Math.sin(this.yaw) * this.distance * cosP;
        const oy = -Math.sin(this.pitch) * this.distance + this.heightOffset;
        const oz = Math.cos(this.yaw) * this.distance * cosP;
        this.camera.position.set(tx - ox, oy + 0.6, tz - oz);
        this.camera.lookAt(tx, this.heightOffset + 0.4, tz);
    }

    // Forward vector in XZ plane (player faces this direction)
    forwardXZ() {
        return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) };
    }
    rightXZ() {
        return { x: Math.cos(this.yaw), z: -Math.sin(this.yaw) };
    }
}
