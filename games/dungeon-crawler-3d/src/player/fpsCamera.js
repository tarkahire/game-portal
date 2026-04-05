// ═══════════════════════════════════════════════════════════════
//  FPS CAMERA — PointerLock, mouse look, WASD, wall collision
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { TILE, EYE_HEIGHT, PLAYER_RADIUS, MAP_COLS, MAP_ROWS } from '../constants.js';
import { isWalkable } from '../dungeon/generator.js';

export class FPSCamera {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.yaw = 0;    // horizontal rotation
        this.pitch = 0;  // vertical rotation
        this.locked = false;

        // Player position in tile coords (col, row)
        this.posX = 0;
        this.posZ = 0;
        this.speed = 3.0; // base speed in tiles/sec

        // Keys
        this.keys = {};
        this._onKeyDown = (e) => { this.keys[e.code] = true; };
        this._onKeyUp = (e) => { this.keys[e.code] = false; };
        this._onMouseMove = (e) => {
            if (!this.locked) return;
            this.yaw -= e.movementX * 0.002;
            this.pitch -= e.movementY * 0.002;
            this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));
        };
        this._onPointerLockChange = () => {
            this.locked = document.pointerLockElement === this.domElement;
        };
        this._onClick = () => {
            if (!this.locked) {
                this.domElement.requestPointerLock();
            }
        };

        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('pointerlockchange', this._onPointerLockChange);
        this.domElement.addEventListener('click', this._onClick);
    }

    setPosition(tileX, tileZ) {
        this.posX = tileX;
        this.posZ = tileZ;
    }

    update(dt, dungeonMap) {
        if (!this.locked) return;

        // Movement direction relative to camera facing
        let moveX = 0, moveZ = 0;
        // Forward vector (direction camera faces on XZ plane)
        const fwdX = -Math.sin(this.yaw);
        const fwdZ = -Math.cos(this.yaw);
        // Right vector (perpendicular to forward)
        const rightX = -Math.cos(this.yaw);
        const rightZ = Math.sin(this.yaw);

        // W / Up Arrow = forward
        if (this.keys['KeyW'] || this.keys['ArrowUp']) { moveX += fwdX; moveZ += fwdZ; }
        // S / Down Arrow = backward
        if (this.keys['KeyS'] || this.keys['ArrowDown']) { moveX -= fwdX; moveZ -= fwdZ; }
        // A / Left Arrow = strafe left
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) { moveX -= rightX; moveZ -= rightZ; }
        // D / Right Arrow = strafe right
        if (this.keys['KeyD'] || this.keys['ArrowRight']) { moveX += rightX; moveZ += rightZ; }

        // Normalize diagonal
        const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (len > 0) {
            moveX /= len;
            moveZ /= len;
        }

        const spd = this.speed * dt;
        const newX = this.posX + moveX * spd;
        const newZ = this.posZ + moveZ * spd;

        // Wall collision — axis-separated (same as 2D game)
        const r = PLAYER_RADIUS;
        if (isWalkable(dungeonMap, newX - r, this.posZ - r) &&
            isWalkable(dungeonMap, newX + r, this.posZ - r) &&
            isWalkable(dungeonMap, newX - r, this.posZ + r) &&
            isWalkable(dungeonMap, newX + r, this.posZ + r)) {
            this.posX = newX;
        }
        if (isWalkable(dungeonMap, this.posX - r, newZ - r) &&
            isWalkable(dungeonMap, this.posX + r, newZ - r) &&
            isWalkable(dungeonMap, this.posX - r, newZ + r) &&
            isWalkable(dungeonMap, this.posX + r, newZ + r)) {
            this.posZ = newZ;
        }

        // Clamp to map bounds
        this.posX = Math.max(1, Math.min(MAP_COLS - 1, this.posX));
        this.posZ = Math.max(1, Math.min(MAP_ROWS - 1, this.posZ));

        // Update camera
        this.camera.position.set(
            this.posX * TILE,
            EYE_HEIGHT,
            this.posZ * TILE
        );

        // Apply rotation
        const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
        this.camera.quaternion.setFromEuler(euler);
    }

    // Get facing angle on the XZ plane (for combat)
    get facingAngle() {
        return this.yaw;
    }

    dispose() {
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('pointerlockchange', this._onPointerLockChange);
        this.domElement.removeEventListener('click', this._onClick);
    }
}
