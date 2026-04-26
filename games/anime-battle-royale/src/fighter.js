// Fighter: stylized humanoid mesh + HP/state + cooldowns
import * as THREE from 'three';
import { CLASSES } from './classes/definitions.js';

const TWO_PI = Math.PI * 2;

function hexNumber(hex) {
    if (typeof hex === 'number') return hex;
    return parseInt(hex.replace('#', ''), 16);
}

// Build a stylized humanoid figure colored to character.
// Returns a THREE.Group with named children for animation.
export function buildHumanoid(character) {
    const group = new THREE.Group();
    const colorN = hexNumber(character.color);

    const skin = 0xf0c8a0;
    const dark = 0x1a1a2a;

    const bodyMat = new THREE.MeshStandardMaterial({
        color: colorN, roughness: 0.5, metalness: 0.2,
        emissive: colorN, emissiveIntensity: 0.18
    });
    const limbMat = new THREE.MeshStandardMaterial({
        color: dark, roughness: 0.6, metalness: 0.3,
        emissive: colorN, emissiveIntensity: 0.08
    });
    const headMat = new THREE.MeshStandardMaterial({
        color: skin, roughness: 0.4, metalness: 0.1
    });
    const hairMat = new THREE.MeshStandardMaterial({
        color: 0x000000, roughness: 0.7,
        emissive: colorN, emissiveIntensity: 0.25
    });

    // Torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.95, 12), bodyMat);
    torso.position.y = 1.05;
    group.add(torso);

    // Hips
    const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.34, 0.25, 12), limbMat);
    hips.position.y = 0.5;
    group.add(hips);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.7, 8);
    const legL = new THREE.Mesh(legGeo, limbMat); legL.position.set(-0.16, 0.1, 0); group.add(legL);
    const legR = new THREE.Mesh(legGeo, limbMat); legR.position.set( 0.16, 0.1, 0); group.add(legR);
    legL.name = 'legL'; legR.name = 'legR';

    // Arms (parented to shoulders so we can swing)
    const armGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.7, 8);
    const armL = new THREE.Mesh(armGeo, bodyMat); armL.position.set(-0.46, 1.18, 0); group.add(armL);
    const armR = new THREE.Mesh(armGeo, bodyMat); armR.position.set( 0.46, 1.18, 0); group.add(armR);
    armL.name = 'armL'; armR.name = 'armR';

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), headMat);
    head.position.y = 1.78;
    head.name = 'head';
    group.add(head);

    // Hair / hat — half sphere on top, tinted character color
    const hair = new THREE.Mesh(
        new THREE.SphereGeometry(0.30, 16, 10, 0, TWO_PI, 0, Math.PI / 2),
        hairMat
    );
    hair.position.y = 1.80;
    group.add(hair);

    // Glow aura (transparent shell)
    const auraMat = new THREE.MeshBasicMaterial({
        color: colorN, transparent: true, opacity: 0.08,
        side: THREE.BackSide, depthWrite: false
    });
    const aura = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.55, 2.1, 14), auraMat);
    aura.position.y = 1.05;
    group.add(aura);

    // Weapon (right hand) — by weaponType
    const weapon = buildWeapon(character.weaponType, colorN);
    if (weapon) {
        weapon.position.set(0.5, 0.95, 0.15);
        weapon.name = 'weapon';
        group.add(weapon);
    }

    // HP bar billboard (sprite-like plane with sub-meshes)
    const hpBar = buildHpBar();
    hpBar.position.y = 2.3;
    hpBar.name = 'hpBar';
    group.add(hpBar);

    // Name tag (canvas texture)
    const nameTag = buildNameTag(character.name);
    nameTag.position.y = 2.55;
    nameTag.name = 'nameTag';
    group.add(nameTag);

    return group;
}

function buildWeapon(type, color) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
        color: 0xcccccc, metalness: 0.8, roughness: 0.2,
        emissive: color, emissiveIntensity: 0.4
    });
    if (type === 'sword') {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.02), mat);
        blade.position.y = 0.5; g.add(blade);
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.06),
            new THREE.MeshStandardMaterial({ color: 0x553300 }));
        guard.position.y = -0.05; g.add(guard);
    } else if (type === 'spear') {
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8),
            new THREE.MeshStandardMaterial({ color: 0x664433 }));
        shaft.position.y = 0.5; g.add(shaft);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 8), mat);
        tip.position.y = 1.25; g.add(tip);
    } else if (type === 'chainsaw') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.8, 0.18),
            new THREE.MeshStandardMaterial({ color: 0xcc4400, emissive: 0xff6600, emissiveIntensity: 0.5 }));
        body.position.y = 0.4; g.add(body);
    }
    // 'fist' = nothing
    return g.children.length > 0 ? g : null;
}

function buildHpBar() {
    const g = new THREE.Group();
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.7 });
    const fgMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.16), bgMat);
    const fg = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 0.12), fgMat);
    fg.position.z = 0.005;
    fg.userData.fullWidth = 1.16;
    g.add(bg); g.add(fg);
    g.userData.fg = fg;
    return g;
}

function buildNameTag(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.0)'; ctx.fillRect(0, 0, 512, 96);
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 8; ctx.strokeStyle = '#000';
    ctx.strokeText(name, 256, 48);
    ctx.fillStyle = '#fff';
    ctx.fillText(name, 256, 48);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.4), mat);
    return plane;
}

// Fighter logical state wrapping the mesh
export class Fighter {
    constructor(charKey, isPlayer = false) {
        this.key = charKey;
        this.character = CLASSES[charKey];
        this.isPlayer = isPlayer;
        this.maxHp = this.character.maxHp;
        this.hp = this.maxHp;
        this.alive = true;
        this.mesh = buildHumanoid(this.character);
        this.x = 0;
        this.z = 0;
        this.yaw = 0;        // facing angle (radians, 0 = +Z)
        this.vx = 0;
        this.vz = 0;
        this.speed = this.character.speed;
        this.cooldowns = { z: 0, x: 0, c: 0, v: 0, f: 0, m1: 0 };
        this.animTime = 0;
        this.attackAnimT = 0;       // 0..1 windup→swing
        this.invulnUntil = 0;
        this.dashUntil = 0;
        this.dashDx = 0; this.dashDz = 0;
        this.buffUntil = 0;
        this.buffMul = 1.0;
        this.lastDamageBy = null;
        this.kills = 0;
        // Per-character special: Megumi divine dogs ids list, Yuta rika manifest, etc.
        this.minions = [];
    }

    setPos(x, z) {
        this.x = x; this.z = z;
        this.mesh.position.x = x;
        this.mesh.position.z = z;
    }

    takeDamage(amount, byFighter) {
        if (!this.alive) return;
        if (performance.now() < this.invulnUntil) return;
        this.hp -= amount;
        if (byFighter) this.lastDamageBy = byFighter;
        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
        }
        // Update HP bar width
        const bar = this.mesh.getObjectByName('hpBar');
        if (bar) {
            const fg = bar.userData.fg;
            const ratio = Math.max(0, this.hp / this.maxHp);
            fg.scale.x = ratio;
            fg.position.x = -bar.userData.fg.userData.fullWidth * (1 - ratio) / 2;
        }
    }

    die() {
        this.alive = false;
        this.mesh.visible = false;
        if (this.lastDamageBy && this.lastDamageBy !== this) {
            this.lastDamageBy.kills++;
        }
    }

    // Per-frame: pose animations (walking / attacking)
    tick(dt) {
        if (!this.alive) return;
        this.animTime += dt;
        const moving = (this.vx * this.vx + this.vz * this.vz) > 0.05;
        const armL = this.mesh.getObjectByName('armL');
        const armR = this.mesh.getObjectByName('armR');
        const legL = this.mesh.getObjectByName('legL');
        const legR = this.mesh.getObjectByName('legR');
        if (moving) {
            const swing = Math.sin(this.animTime * 8) * 0.5;
            if (legL) legL.rotation.x = swing;
            if (legR) legR.rotation.x = -swing;
            if (armL) armL.rotation.x = -swing * 0.8;
            if (armR) armR.rotation.x = swing * 0.8;
        } else {
            if (legL) legL.rotation.x = 0;
            if (legR) legR.rotation.x = 0;
            if (armL) armL.rotation.x = 0;
            if (armR) armR.rotation.x = 0;
        }
        // M1 attack animation
        if (this.attackAnimT > 0) {
            this.attackAnimT = Math.max(0, this.attackAnimT - dt * 4);
            const t = 1 - this.attackAnimT;
            if (armR) armR.rotation.x = -Math.sin(t * Math.PI) * 1.6;
        }

        // Match dungeon-crawler-3d convention: yaw=0 -> forward (-Z), so model rotates by yaw+π
        this.mesh.rotation.y = this.yaw + Math.PI;
    }

    canUse(slot) {
        return performance.now() >= this.cooldowns[slot] && this.alive;
    }
    triggerCD(slot, ms) {
        this.cooldowns[slot] = performance.now() + ms;
    }
}

export function rollBotCharacters(playerKey, count) {
    const keys = Object.keys(CLASSES).filter(k => k !== playerKey);
    // Shuffle
    for (let i = keys.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [keys[i], keys[j]] = [keys[j], keys[i]];
    }
    return keys.slice(0, count);
}
