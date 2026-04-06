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
        this.thirdPerson = false; // toggle with C
        this.tpDistance = 6;      // distance behind player in 3rd person
        this.tpHeight = 3.5;     // height above player in 3rd person

        // Player model (visible in 3rd person)
        this.playerModel = null;
        this.flyHeight = 0; // extra Y offset for flying characters

        // Player position in tile coords (col, row)
        this.posX = 0;
        this.posZ = 0;
        this.speed = 3.0; // base speed in tiles/sec
        this.modelYaw = 0; // the direction the 3rd person model faces (smoothed)

        // Keys
        this.keys = {};
        this._onKeyDown = (e) => {
            this.keys[e.code] = true;
            if (e.code === 'KeyT') this.thirdPerson = !this.thirdPerson;
        };
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
            // Track movement direction for model facing
            this._moveYaw = Math.atan2(moveX, moveZ);
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

        // Player world position
        const worldX = this.posX * TILE;
        const worldZ = this.posZ * TILE;

        const fly = this.flyHeight || 0;

        if (this.thirdPerson) {
            // 3rd person: camera behind + above player, looking at player
            const behindX = Math.sin(this.yaw) * this.tpDistance;
            const behindZ = Math.cos(this.yaw) * this.tpDistance;
            this.camera.position.set(
                worldX + behindX,
                EYE_HEIGHT + this.tpHeight + fly,
                worldZ + behindZ
            );
            this.camera.lookAt(worldX, EYE_HEIGHT + fly, worldZ);

            // Show player model — faces where camera is looking
            if (this.playerModel) {
                this.playerModel.visible = true;
                this.playerModel.position.set(worldX, fly, worldZ);
                this.playerModel.rotation.y = this.yaw + Math.PI;
            }
        } else {
            // 1st person
            this.camera.position.set(worldX, EYE_HEIGHT + fly, worldZ);
            const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
            this.camera.quaternion.setFromEuler(euler);

            // Hide player model
            if (this.playerModel) this.playerModel.visible = false;
        }
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
