// ═══════════════════════════════════════════════════════════════
//  FPS CAMERA — Keyboard-only controls, configurable key bindings
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { TILE, EYE_HEIGHT, PLAYER_RADIUS, MAP_COLS, MAP_ROWS } from '../constants.js';
import { isWalkable } from '../dungeon/generator.js';

export class FPSCamera {
    /**
     * @param {THREE.Camera} camera
     * @param {HTMLElement} domElement
     * @param {object} [keyConfig] — optional key overrides
     *   { forward, backward, turnLeft, turnRight } — each is a key code string
     */
    constructor(camera, domElement, keyConfig) {
        this.camera = camera;
        this.domElement = domElement;
        this.yaw = 0;
        this.pitch = 0;
        this.locked = true; // always active
        this.thirdPerson = false;
        this.tpDistance = 6;
        this.tpHeight = 3.5;

        this.playerModel = null;
        this.flyHeight = 0;

        this.posX = 0;
        this.posZ = 0;
        this.speed = 3.0;
        this.modelYaw = 0;
        this.turnSpeed = 3.0;

        // Key bindings
        const kc = keyConfig || {};
        this._keyForward = kc.forward || ['KeyW', 'ArrowUp'];
        this._keyBackward = kc.backward || ['KeyS', 'ArrowDown'];
        this._keyTurnLeft = kc.turnLeft || ['KeyA', 'ArrowLeft'];
        this._keyTurnRight = kc.turnRight || ['KeyD', 'ArrowRight'];
        this._keyToggleTP = kc.toggleTP || 'KeyT';

        // Shared key state — use a shared object if provided, otherwise own
        this.keys = kc.sharedKeys || {};
        this._ownsKeys = !kc.sharedKeys;

        if (this._ownsKeys) {
            this._onKeyDown = (e) => {
                this.keys[e.code] = true;
                if (e.code === this._keyToggleTP) this.thirdPerson = !this.thirdPerson;
            };
            this._onKeyUp = (e) => { this.keys[e.code] = false; };
            document.addEventListener('keydown', this._onKeyDown);
            document.addEventListener('keyup', this._onKeyUp);
        }

        // Mouse look (optional — works if pointer locked)
        this._onMouseMove = (e) => {
            if (document.pointerLockElement !== this.domElement) return;
            this.yaw -= e.movementX * 0.002;
            this.pitch -= e.movementY * 0.002;
            this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));
        };
        this._onPointerLockChange = () => {};
        this._onClick = () => {
            if (document.pointerLockElement !== this.domElement) {
                this.domElement.requestPointerLock();
            }
        };

        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('pointerlockchange', this._onPointerLockChange);
        this.domElement.addEventListener('click', this._onClick);
    }

    _isKeyDown(keyCodes) {
        if (Array.isArray(keyCodes)) return keyCodes.some(k => this.keys[k]);
        return this.keys[keyCodes];
    }

    setPosition(tileX, tileZ) {
        this.posX = tileX;
        this.posZ = tileZ;
    }

    update(dt, dungeonMap) {
        // Turn
        if (this._isKeyDown(this._keyTurnLeft)) { this.yaw += this.turnSpeed * dt; }
        if (this._isKeyDown(this._keyTurnRight)) { this.yaw -= this.turnSpeed * dt; }

        // Movement
        let moveX = 0, moveZ = 0;
        const fwdX = -Math.sin(this.yaw);
        const fwdZ = -Math.cos(this.yaw);

        if (this._isKeyDown(this._keyForward)) { moveX += fwdX; moveZ += fwdZ; }
        if (this._isKeyDown(this._keyBackward)) { moveX -= fwdX; moveZ -= fwdZ; }

        const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (len > 0) {
            moveX /= len;
            moveZ /= len;
            this._moveYaw = Math.atan2(moveX, moveZ);
        }

        const spd = this.speed * dt;
        const newX = this.posX + moveX * spd;
        const newZ = this.posZ + moveZ * spd;

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

        this.posX = Math.max(1, Math.min(MAP_COLS - 1, this.posX));
        this.posZ = Math.max(1, Math.min(MAP_ROWS - 1, this.posZ));

        const worldX = this.posX * TILE;
        const worldZ = this.posZ * TILE;
        const fly = this.flyHeight || 0;

        // Always update player model position/rotation (needed for split-screen visibility)
        if (this.playerModel) {
            this.playerModel.position.set(worldX, fly, worldZ);
            this.playerModel.rotation.y = this.yaw + Math.PI;
        }

        if (this.thirdPerson) {
            const behindX = Math.sin(this.yaw) * this.tpDistance;
            const behindZ = Math.cos(this.yaw) * this.tpDistance;
            this.camera.position.set(
                worldX + behindX,
                EYE_HEIGHT + this.tpHeight + fly,
                worldZ + behindZ
            );
            this.camera.lookAt(worldX, EYE_HEIGHT + fly, worldZ);

            if (this.playerModel) this.playerModel.visible = true;
        } else {
            this.camera.position.set(worldX, EYE_HEIGHT + fly, worldZ);
            const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
            this.camera.quaternion.setFromEuler(euler);

            if (this.playerModel) this.playerModel.visible = false;
        }
    }

    get facingAngle() {
        return this.yaw;
    }

    dispose() {
        if (this._ownsKeys) {
            document.removeEventListener('keydown', this._onKeyDown);
            document.removeEventListener('keyup', this._onKeyUp);
        }
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('pointerlockchange', this._onPointerLockChange);
        this.domElement.removeEventListener('click', this._onClick);
    }
}
