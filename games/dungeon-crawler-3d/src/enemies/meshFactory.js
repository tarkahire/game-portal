// ═══════════════════════════════════════════════════════════════
//  ENEMY MESH FACTORY — visceral organic horror creatures
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { TILE, WALL_HEIGHT } from '../constants.js';

// Pale flesh palette — sickly, organic, disturbing
const FLESH = {
    palePink: '#c89a8a',
    sicklyPink: '#a07868',
    bruised: '#7a5060',
    deepPink: '#5a2840',
    grey: '#988878',
    darkVein: '#3a0814',
    bloodRed: '#5a0010',
    teeth: '#e8dcc0',
    yellowedTeeth: '#c8b890',
    gum: '#6a1828',
    tongue: '#8a2040',
    blackEye: '#040004',
    whiteEye: '#e8e0d8',
    glowEyeRed: '#ff1500',
    glowEyePurple: '#cc00ff',
    glowEyeGreen: '#00ff44',
    innerGlow: '#ff0820',
    drool: '#d8c8a0',
    boneCream: '#d8ccb0',
    rawMeat: '#7a0820',
};

// Wet, almost-glistening flesh
const fleshMat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05 });
const wetFleshMat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.15 });
const boneMat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1 });
const meatMat = (color) => new THREE.MeshStandardMaterial({
    color, roughness: 0.4, metalness: 0.05,
    emissive: '#3a0008', emissiveIntensity: 0.2
});
const glowingFleshMat = (color, glow) => new THREE.MeshStandardMaterial({
    color, roughness: 0.6, emissive: glow, emissiveIntensity: 0.7
});
const glowMat = (color) => new THREE.MeshBasicMaterial({ color });

const toothMat = new THREE.MeshStandardMaterial({ color: FLESH.teeth, roughness: 0.4, metalness: 0.05 });
const yellowToothMat = new THREE.MeshStandardMaterial({ color: FLESH.yellowedTeeth, roughness: 0.5, metalness: 0.05 });
const gumMat = new THREE.MeshStandardMaterial({ color: FLESH.gum, roughness: 0.5 });
const tongueMat = new THREE.MeshStandardMaterial({ color: FLESH.tongue, roughness: 0.3, metalness: 0.15 });
const blackEyeMat = new THREE.MeshStandardMaterial({ color: FLESH.blackEye, roughness: 0.15, metalness: 0.4 });
const interiorMat = new THREE.MeshBasicMaterial({ color: '#04000a' });
const droolMat = new THREE.MeshStandardMaterial({
    color: FLESH.drool, roughness: 0.1, metalness: 0.3,
    transparent: true, opacity: 0.85
});

// Build an irregular, organic sphere by displacing vertices with smooth noise
function organicGeo(radius, deformAmount = 0.12, segs = 16) {
    const geo = new THREE.SphereGeometry(radius, segs, Math.floor(segs * 0.75));
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const n = Math.sin(x * 7 + 1.3) * Math.cos(y * 6 + 0.7) * Math.sin(z * 8 + 2.1);
        const noise = n * deformAmount * radius;
        const len = Math.sqrt(x * x + y * y + z * z);
        if (len > 0.001) {
            const s = 1 + noise / len;
            pos.setXYZ(i, x * s, y * s, z * s);
        }
    }
    geo.computeVertexNormals();
    return geo;
}

function capsuleGeo(radius, length) {
    return new THREE.CapsuleGeometry(radius, length, 6, 10);
}

// Tiny beady black eyes with a wet shine
function addBeadyEyes(group, cx, cy, cz, spacing, size) {
    const geo = new THREE.SphereGeometry(size, 10, 10);
    const eyeL = new THREE.Mesh(geo, blackEyeMat);
    eyeL.position.set(cx - spacing, cy, cz);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(geo, blackEyeMat);
    eyeR.position.set(cx + spacing, cy, cz);
    group.add(eyeR);
    const shineGeo = new THREE.SphereGeometry(size * 0.32, 6, 6);
    const shineMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const sL = new THREE.Mesh(shineGeo, shineMat);
    sL.position.set(cx - spacing + size * 0.4, cy + size * 0.3, cz + size * 0.55);
    group.add(sL);
    const sR = new THREE.Mesh(shineGeo, shineMat);
    sR.position.set(cx + spacing + size * 0.4, cy + size * 0.3, cz + size * 0.55);
    group.add(sR);
}

// Single extra eye for asymmetric horror — placed wherever
function addExtraEye(group, x, y, z, size, color) {
    const eye = new THREE.Mesh(
        new THREE.SphereGeometry(size, 8, 8),
        color === 'black' ? blackEyeMat : new THREE.MeshBasicMaterial({ color })
    );
    eye.position.set(x, y, z);
    group.add(eye);
    if (color === 'black') {
        const shine = new THREE.Mesh(
            new THREE.SphereGeometry(size * 0.32, 6, 6),
            new THREE.MeshBasicMaterial({ color: '#ffffff' })
        );
        shine.position.set(x + size * 0.4, y + size * 0.3, z + size * 0.55);
        group.add(shine);
    }
    return eye;
}

// Glowing eyes
function addGlowEyes(group, cx, cy, cz, spacing, size, color) {
    const mat = glowMat(color);
    const geo = new THREE.SphereGeometry(size, 8, 8);
    const eyeL = new THREE.Mesh(geo, mat);
    eyeL.position.set(cx - spacing, cy, cz);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(geo, mat);
    eyeR.position.set(cx + spacing, cy, cz);
    group.add(eyeR);
}

// Wide grinning mouth with rows of human-like teeth (SCP creature style)
function addGrinMouth(group, cx, cy, cz, width, height, teethCount) {
    const upperGum = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.35, height * 0.3), gumMat);
    upperGum.position.set(cx, cy + height * 0.18, cz);
    group.add(upperGum);
    const lowerGum = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.35, height * 0.3), gumMat);
    lowerGum.position.set(cx, cy - height * 0.18, cz);
    group.add(lowerGum);
    const interior = new THREE.Mesh(new THREE.BoxGeometry(width * 0.95, height * 0.2, height * 0.2), interiorMat);
    interior.position.set(cx, cy, cz - height * 0.05);
    group.add(interior);
    const toothW = (width / teethCount) * 0.85;
    const toothH = height * 0.32;
    const toothGeo = new THREE.BoxGeometry(toothW, toothH, height * 0.18);
    for (let t = 0; t < teethCount; t++) {
        const tx = cx - width * 0.5 + (t + 0.5) / teethCount * width;
        const upper = new THREE.Mesh(toothGeo, yellowToothMat);
        upper.position.set(tx, cy + height * 0.05 + (Math.random() - 0.5) * height * 0.06, cz + height * 0.02);
        upper.rotation.z = (Math.random() - 0.5) * 0.18;
        group.add(upper);
        const lower = new THREE.Mesh(toothGeo, yellowToothMat);
        lower.position.set(tx, cy - height * 0.05 + (Math.random() - 0.5) * height * 0.06, cz + height * 0.02);
        lower.rotation.z = (Math.random() - 0.5) * 0.18;
        group.add(lower);
    }
}

// Gaping fanged maw — large irregular sharp teeth
function addFangedMaw(group, cx, cy, cz, width, height, fangCount) {
    const interior = new THREE.Mesh(new THREE.SphereGeometry(width * 0.5, 12, 8), interiorMat);
    interior.position.set(cx, cy, cz - width * 0.1);
    interior.scale.set(1, height / width, 0.5);
    group.add(interior);
    // Bloody inner flesh visible in the throat
    const innerFlesh = new THREE.Mesh(new THREE.SphereGeometry(width * 0.4, 10, 8), meatMat(FLESH.rawMeat));
    innerFlesh.position.set(cx, cy, cz - width * 0.25);
    innerFlesh.scale.set(0.8, height / width * 0.7, 0.5);
    group.add(innerFlesh);
    // Tongue
    const tongue = new THREE.Mesh(new THREE.SphereGeometry(width * 0.3, 10, 6), tongueMat);
    tongue.position.set(cx, cy - height * 0.2, cz);
    tongue.scale.set(1, 0.4, 1.5);
    group.add(tongue);
    // Upper fangs
    const fangGeo = new THREE.ConeGeometry(width * 0.1, height * 0.7, 8);
    for (let t = 0; t < fangCount; t++) {
        const tx = cx - width * 0.45 + (t + 0.5) / fangCount * width * 0.9;
        const sz = 0.7 + Math.random() * 0.7;
        const tooth = new THREE.Mesh(fangGeo, toothMat);
        tooth.scale.set(sz * 0.9, sz, sz * 0.9);
        tooth.position.set(tx, cy + height * 0.05 - sz * height * 0.15, cz + width * 0.18);
        tooth.rotation.x = Math.PI;
        tooth.rotation.z = (Math.random() - 0.5) * 0.3;
        group.add(tooth);
    }
    // Lower fangs
    const lowerCount = Math.max(2, fangCount - 1);
    for (let t = 0; t < lowerCount; t++) {
        const tx = cx - width * 0.4 + (t + 0.5) / lowerCount * width * 0.8;
        const sz = 0.6 + Math.random() * 0.6;
        const tooth = new THREE.Mesh(fangGeo, toothMat);
        tooth.scale.set(sz * 0.9, sz, sz * 0.9);
        tooth.position.set(tx, cy - height * 0.05 + sz * height * 0.12, cz + width * 0.18);
        tooth.rotation.z = (Math.random() - 0.5) * 0.3;
        group.add(tooth);
    }
}

// Hanging strings of saliva from a mouth
function addDrool(group, cx, cy, cz, width, count) {
    const drools = [];
    for (let i = 0; i < count; i++) {
        const tx = cx - width * 0.4 + Math.random() * width * 0.8;
        const len = 0.15 + Math.random() * 0.35;
        const geo = new THREE.CylinderGeometry(0.012, 0.005, len, 4);
        const drool = new THREE.Mesh(geo, droolMat);
        drool.position.set(tx, cy - len * 0.5, cz + 0.05);
        drool._baseY = drool.position.y;
        drool._phase = Math.random() * Math.PI * 2;
        group.add(drool);
        drools.push(drool);
    }
    return drools;
}

// Writhing tendrils from a position (for head-back, shoulders, etc.)
function addTendrils(group, cx, cy, cz, count, length, color) {
    const tendrils = [];
    const mat = fleshMat(color);
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const radius = 0.18;
        const segs = 5;
        const tendril = new THREE.Group();
        const points = [];
        for (let s = 0; s <= segs; s++) {
            const t = s / segs;
            points.push(new THREE.Vector3(
                Math.sin(t * 2) * 0.05,
                t * length,
                Math.cos(t * 1.5) * 0.05
            ));
        }
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, 8, length * 0.06, 6, false);
        const mesh = new THREE.Mesh(tubeGeo, mat);
        tendril.add(mesh);
        tendril.position.set(cx + Math.cos(angle) * radius, cy, cz + Math.sin(angle) * radius);
        tendril.rotation.x = -0.3 + Math.random() * 0.4;
        tendril.rotation.z = Math.cos(angle) * 0.3;
        tendril._baseRotX = tendril.rotation.x;
        tendril._baseRotZ = tendril.rotation.z;
        tendril._phase = Math.random() * Math.PI * 2;
        group.add(tendril);
        tendrils.push(tendril);
    }
    return tendrils;
}

// Bone spikes erupting from skin (spine, shoulders, back)
function addBoneSpikes(group, cx, cy, cz, count, baseSize, spread) {
    const spikeGeo = new THREE.ConeGeometry(baseSize * 0.3, baseSize * 1.4, 5);
    for (let i = 0; i < count; i++) {
        const t = i / Math.max(1, count - 1);
        const tx = cx + (Math.random() - 0.5) * spread;
        const ty = cy + t * spread - spread * 0.5;
        const tz = cz + (Math.random() - 0.3) * 0.1;
        const spike = new THREE.Mesh(spikeGeo, boneMat(FLESH.boneCream));
        spike.position.set(tx, ty, tz);
        spike.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
        spike.rotation.z = (Math.random() - 0.5) * 0.3;
        spike.scale.set(0.7 + Math.random() * 0.6, 0.7 + Math.random() * 0.8, 0.7 + Math.random() * 0.6);
        group.add(spike);
    }
}

// Long hooked claws (for fingers / hands)
function addClaws(group, cx, cy, cz, count, size, dir) {
    const clawGeo = new THREE.ConeGeometry(size * 0.18, size, 5);
    for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * size * 0.3;
        const claw = new THREE.Mesh(clawGeo, boneMat('#3a2820'));
        claw.position.set(cx + offset, cy, cz);
        claw.rotation.x = dir > 0 ? -Math.PI / 2 + 0.3 : Math.PI / 2 - 0.3;
        claw.rotation.z = (Math.random() - 0.5) * 0.2;
        group.add(claw);
    }
}

// Glowing pulsing crack — like something is alive and burning inside
function addGlowCrack(group, cx, cy, cz, length, vertical) {
    const crackMat = new THREE.MeshBasicMaterial({ color: FLESH.innerGlow });
    const segs = 5;
    const crack = new THREE.Group();
    for (let i = 0; i < segs; i++) {
        const w = 0.04 + (Math.random() - 0.5) * 0.02;
        const h = length / segs * 1.05;
        const geo = new THREE.BoxGeometry(w, h, 0.04);
        const seg = new THREE.Mesh(geo, crackMat);
        const offset = (i - (segs - 1) / 2) * (length / segs);
        if (vertical) seg.position.set((Math.random() - 0.5) * 0.05, offset, 0);
        else seg.position.set(offset, (Math.random() - 0.5) * 0.05, 0);
        seg.rotation.z = (Math.random() - 0.5) * 0.2;
        crack.add(seg);
    }
    crack.position.set(cx, cy, cz);
    crack._baseScale = 1;
    group.add(crack);
    return crack;
}

// Exposed ribcage visible through torn flesh
function addExposedRibs(group, cx, cy, cz, width, ribCount) {
    // Dark wound cavity behind ribs
    const cavity = new THREE.Mesh(
        new THREE.SphereGeometry(width * 0.5, 12, 8),
        meatMat(FLESH.bloodRed)
    );
    cavity.position.set(cx, cy, cz - width * 0.15);
    cavity.scale.set(1.1, 1.3, 0.5);
    group.add(cavity);
    // Ribs in front
    for (let r = 0; r < ribCount; r++) {
        const t = r / (ribCount - 1) - 0.5;
        const rib = new THREE.Mesh(
            new THREE.TorusGeometry(width * 0.4, 0.025, 4, 10, Math.PI),
            boneMat(FLESH.boneCream)
        );
        rib.position.set(cx, cy + t * width * 0.8, cz - 0.02);
        rib.rotation.x = Math.PI / 2;
        rib.rotation.z = Math.PI;
        group.add(rib);
    }
}

// Dark veiny detail on a body part
function addVeins(parent, count, color) {
    const veinMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 });
    const veinGeo = new THREE.CylinderGeometry(0.01, 0.005, 0.4, 4);
    for (let i = 0; i < count; i++) {
        const vein = new THREE.Mesh(veinGeo, veinMat);
        vein.position.set(
            (Math.random() - 0.5) * 0.7,
            (Math.random() - 0.5) * 0.8,
            (Math.random() - 0.4) * 0.5
        );
        vein.rotation.z = (Math.random() - 0.5) * Math.PI;
        vein.rotation.y = Math.random() * Math.PI;
        vein.scale.y = 0.5 + Math.random() * 0.8;
        parent.add(vein);
    }
}

// Dark bruise/blood patches on flesh
function addBloodStains(parent, count) {
    const stainMat = new THREE.MeshBasicMaterial({ color: '#2a0008', transparent: true, opacity: 0.6 });
    for (let i = 0; i < count; i++) {
        const stain = new THREE.Mesh(
            new THREE.SphereGeometry(0.08 + Math.random() * 0.07, 6, 4),
            stainMat
        );
        stain.position.set(
            (Math.random() - 0.5) * 0.7,
            (Math.random() - 0.5) * 0.8,
            (Math.random() - 0.3) * 0.5
        );
        stain.scale.set(1, 0.3, 1);
        parent.add(stain);
    }
}

export function createEnemyMesh(enemyType, isBoss) {
    const group = new THREE.Group();
    const S = isBoss ? 2.5 : 1.5;
    group.userData = { tendrils: [], drool: [], glowParts: [], headJitter: null };

    switch (enemyType) {
        case 'skeleton': {
            // GAUNT STALKER — twisted, hunched, wrong proportions
            // Head — elongated bulbous, tilted at wrong angle (head jitter target)
            const headPivot = new THREE.Group();
            headPivot.position.y = 1.65 * S;
            const head = new THREE.Mesh(organicGeo(0.42 * S, 0.14, 16), fleshMat(FLESH.palePink));
            head.scale.set(1.4, 0.9, 0.9);
            head.rotation.x = 0.4;
            head.rotation.z = 0.15; // tilted wrong
            headPivot.add(head);
            // Mouth on head
            addGrinMouth(headPivot, 0, -0.1 * S, 0.36 * S, 0.55 * S, 0.2 * S, 9);
            // Drool from grin
            const drool = addDrool(headPivot, 0, -0.25 * S, 0.4 * S, 0.4 * S, 4);
            // Beady eyes high on head
            addBeadyEyes(headPivot, 0, 0.21 * S, 0.32 * S, 0.13 * S, 0.05 * S);
            // Extra third eye below mouth — wrong, asymmetric
            addExtraEye(headPivot, 0.1 * S, -0.42 * S, 0.36 * S, 0.04 * S, 'black');
            group.add(headPivot);
            group.userData.headJitter = headPivot;
            group.userData.drool.push(...drool);

            // Hunched torso — slumped forward
            const torso = new THREE.Mesh(organicGeo(0.35 * S, 0.18, 14), fleshMat(FLESH.sicklyPink));
            torso.position.set(0, 1.0 * S, 0);
            torso.scale.set(0.85, 1.3, 0.7);
            torso.rotation.x = 0.25;
            group.add(torso);
            addVeins(torso, 8, FLESH.darkVein);
            addBloodStains(torso, 4);

            // Glowing red crack down chest — pulsing
            const crack = addGlowCrack(group, 0, 1.0 * S, 0.32 * S, 0.5 * S, true);
            group.userData.glowParts.push(crack);

            // Bone spikes erupting from spine
            addBoneSpikes(group, 0, 1.1 * S, -0.25 * S, 4, 0.12 * S, 0.5 * S);

            // Asymmetric arms — left longer/lower, twisted
            const upperArm = new THREE.Mesh(capsuleGeo(0.07 * S, 0.5 * S), fleshMat(FLESH.palePink));
            upperArm.position.set(-0.34 * S, 1.0 * S, 0);
            upperArm.rotation.z = 0.5;
            group.add(upperArm);
            const upperArmR = new THREE.Mesh(capsuleGeo(0.06 * S, 0.4 * S), fleshMat(FLESH.palePink));
            upperArmR.position.set(0.32 * S, 1.05 * S, 0);
            upperArmR.rotation.z = -0.4;
            group.add(upperArmR);
            const forearm = new THREE.Mesh(capsuleGeo(0.06 * S, 0.55 * S), fleshMat(FLESH.sicklyPink));
            forearm.position.set(-0.55 * S, 0.4 * S, 0.1 * S);
            forearm.rotation.z = 0.85;
            group.add(forearm);
            const forearmR = new THREE.Mesh(capsuleGeo(0.055 * S, 0.45 * S), fleshMat(FLESH.sicklyPink));
            forearmR.position.set(0.5 * S, 0.55 * S, 0.05 * S);
            forearmR.rotation.z = -0.7;
            group.add(forearmR);

            // Long hooked claws on hands
            addClaws(group, -0.7 * S, 0.15 * S, 0.1 * S, 4, 0.18 * S, 1);
            addClaws(group, 0.65 * S, 0.3 * S, 0.05 * S, 4, 0.15 * S, 1);

            // Spindly legs — bent unnaturally
            const leg = new THREE.Mesh(capsuleGeo(0.08 * S, 0.55 * S), fleshMat(FLESH.sicklyPink));
            leg.position.set(-0.13 * S, 0.4 * S, 0);
            leg.rotation.z = 0.05;
            group.add(leg);
            const legR = new THREE.Mesh(capsuleGeo(0.08 * S, 0.55 * S), fleshMat(FLESH.sicklyPink));
            legR.position.set(0.14 * S, 0.4 * S, 0);
            legR.rotation.z = -0.1;
            group.add(legR);

            // Inner red point light — sickly chest glow
            const pl = new THREE.PointLight(FLESH.innerGlow, 0.6, 2.0, 1.5);
            pl.position.set(0, 1.0 * S, 0.1 * S);
            group.add(pl);
            break;
        }
        case 'archerSkeleton': {
            // SPIRE WRETCH — taller leaner abomination with bone bow, exposed jaw
            const headPivot = new THREE.Group();
            headPivot.position.y = 1.95 * S;
            const head = new THREE.Mesh(organicGeo(0.32 * S, 0.13, 16), fleshMat(FLESH.grey));
            head.scale.set(0.9, 1.4, 0.9);
            headPivot.add(head);
            addGrinMouth(headPivot, 0, -0.1 * S, 0.28 * S, 0.32 * S, 0.22 * S, 6);
            const drool = addDrool(headPivot, 0, -0.22 * S, 0.32 * S, 0.25 * S, 3);
            // Empty eye sockets with pinprick glow
            addGlowEyes(headPivot, 0, 0.2 * S, 0.27 * S, 0.1 * S, 0.03 * S, FLESH.glowEyeRed);
            // Asymmetric extra eye
            addExtraEye(headPivot, -0.18 * S, 0.1 * S, 0.2 * S, 0.035 * S, 'black');
            group.add(headPivot);
            group.userData.headJitter = headPivot;
            group.userData.drool.push(...drool);

            const torso = new THREE.Mesh(organicGeo(0.28 * S, 0.15, 14), fleshMat(FLESH.grey));
            torso.position.y = 1.15 * S;
            torso.scale.set(0.7, 1.5, 0.55);
            group.add(torso);
            addVeins(torso, 6, FLESH.darkVein);
            addBloodStains(torso, 3);

            // Bone spikes through shoulders
            addBoneSpikes(group, -0.25 * S, 1.5 * S, -0.05 * S, 2, 0.1 * S, 0.2 * S);
            addBoneSpikes(group, 0.25 * S, 1.5 * S, -0.05 * S, 2, 0.1 * S, 0.2 * S);

            // Bow arm
            const arm = new THREE.Mesh(capsuleGeo(0.06 * S, 0.65 * S), fleshMat(FLESH.grey));
            arm.position.set(0.3 * S, 1.2 * S, 0);
            arm.rotation.z = -0.5;
            group.add(arm);
            const bow = new THREE.Mesh(
                new THREE.TorusGeometry(0.4 * S, 0.025, 6, 16, Math.PI),
                boneMat('#3a2818')
            );
            bow.position.set(0.5 * S, 1.3 * S, 0);
            bow.rotation.z = Math.PI / 2;
            group.add(bow);
            // Bowstring
            const stringGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.8 * S, 4);
            const stringMesh = new THREE.Mesh(stringGeo, boneMat('#1a1410'));
            stringMesh.position.set(0.5 * S, 1.3 * S, 0);
            group.add(stringMesh);
            const armR = new THREE.Mesh(capsuleGeo(0.06 * S, 0.5 * S), fleshMat(FLESH.grey));
            armR.position.set(-0.3 * S, 1.05 * S, 0);
            armR.rotation.z = 0.6;
            group.add(armR);
            addClaws(group, -0.5 * S, 0.7 * S, 0.05 * S, 4, 0.12 * S, 1);

            // Long legs
            const leg = new THREE.Mesh(capsuleGeo(0.07 * S, 0.7 * S), fleshMat(FLESH.grey));
            leg.position.set(-0.1 * S, 0.45 * S, 0);
            group.add(leg);
            const legR = leg.clone(); legR.position.x = 0.1 * S; group.add(legR);
            break;
        }
        case 'slime': {
            // FLESHMOUND — pulsing flesh mass, many mouths/eyes, exposed insides, writhing tendrils
            const body = new THREE.Mesh(organicGeo(0.6 * S, 0.22, 18), wetFleshMat('#882048'));
            body.position.y = 0.55 * S;
            body.scale.y = 0.7;
            group.add(body);
            addVeins(body, 18, FLESH.darkVein);
            addBloodStains(body, 6);

            // Exposed ribcage poking through the front
            addExposedRibs(group, 0.1 * S, 0.6 * S, 0.55 * S, 0.4 * S, 5);

            // Big front maw + drool
            addFangedMaw(group, 0, 0.55 * S, 0.55 * S, 0.55 * S, 0.32 * S, 8);
            const drool1 = addDrool(group, 0, 0.4 * S, 0.62 * S, 0.4 * S, 4);
            // Smaller side mouths
            addFangedMaw(group, -0.45 * S, 0.42 * S, 0.18 * S, 0.25 * S, 0.18 * S, 4);
            const drool2 = addDrool(group, -0.45 * S, 0.32 * S, 0.22 * S, 0.2 * S, 2);
            addFangedMaw(group, 0.45 * S, 0.5 * S, 0.18 * S, 0.25 * S, 0.18 * S, 4);
            const drool3 = addDrool(group, 0.45 * S, 0.4 * S, 0.22 * S, 0.2 * S, 2);
            group.userData.drool.push(...drool1, ...drool2, ...drool3);

            // Cluster of wrong-placed eyes
            addBeadyEyes(group, 0, 0.95 * S, 0.32 * S, 0.18 * S, 0.05 * S);
            addExtraEye(group, 0.25 * S, 1.0 * S, 0.2 * S, 0.045 * S, 'black');
            addExtraEye(group, -0.3 * S, 0.97 * S, 0.18 * S, 0.04 * S, 'black');
            addExtraEye(group, 0.0, 1.1 * S, 0.0, 0.05 * S, 'black');
            addExtraEye(group, 0.4 * S, 0.65 * S, 0.4 * S, 0.04 * S, 'black');
            addExtraEye(group, -0.4 * S, 0.62 * S, 0.4 * S, 0.04 * S, 'black');

            // Writhing tendrils on top
            const tendrils = addTendrils(group, 0, 0.95 * S, -0.05 * S, 5, 0.7 * S, FLESH.bruised);
            group.userData.tendrils.push(...tendrils);

            // Random spider-leg-like spikes sticking out
            addBoneSpikes(group, 0.3 * S, 0.4 * S, 0.0, 2, 0.12 * S, 0.4 * S);
            addBoneSpikes(group, -0.3 * S, 0.4 * S, 0.0, 2, 0.12 * S, 0.4 * S);

            // Inner glow
            const pl = new THREE.PointLight(FLESH.innerGlow, 0.8, 2.5, 1.5);
            pl.position.set(0, 0.6 * S, 0.1);
            group.add(pl);

            group.userData.body = body;
            break;
        }
        case 'bat': {
            // MAW WING — flying flesh blob with leathery clawed wings, tendril tail, glowing eyes
            const body = new THREE.Mesh(organicGeo(0.34 * S, 0.15, 14), fleshMat(FLESH.bruised));
            body.position.y = 2.2;
            body.scale.set(1, 0.8, 1.1);
            group.add(body);
            addVeins(body, 6, FLESH.darkVein);
            // Mouth on underside
            addFangedMaw(group, 0, 1.93, 0.18 * S, 0.4 * S, 0.25 * S, 6);
            const drool = addDrool(group, 0, 1.78, 0.22 * S, 0.3 * S, 4);
            group.userData.drool.push(...drool);
            // Pulsing red eyes (glowing instead of beady — more menacing for darkness)
            addGlowEyes(group, 0, 2.32, 0.27 * S, 0.1 * S, 0.045 * S, FLESH.glowEyeRed);

            // Leathery wings with rib structure and edge claws
            const wingMat = new THREE.MeshStandardMaterial({
                color: FLESH.deepPink, side: THREE.DoubleSide,
                roughness: 0.7, transparent: true, opacity: 0.88
            });
            const wingGeo = new THREE.PlaneGeometry(1.0 * S, 0.6 * S);
            const wingL = new THREE.Mesh(wingGeo, wingMat);
            wingL.position.set(-0.55 * S, 2.2, 0);
            wingL.rotation.y = 0.3;
            group.add(wingL);
            const wingR = new THREE.Mesh(wingGeo, wingMat);
            wingR.position.set(0.55 * S, 2.2, 0);
            wingR.rotation.y = -0.3;
            group.add(wingR);

            // Wing rib bones
            for (let w = 0; w < 4; w++) {
                const ribGeo = new THREE.CylinderGeometry(0.014, 0.008, 0.55 * S, 4);
                const ribMatBone = boneMat('#2a1a14');
                const ribL = new THREE.Mesh(ribGeo, ribMatBone);
                ribL.position.set(-0.4 * S - w * 0.1 * S, 2.2, 0);
                ribL.rotation.z = Math.PI / 2 + (w - 1.5) * 0.12;
                group.add(ribL);
                const ribR = new THREE.Mesh(ribGeo, ribMatBone);
                ribR.position.set(0.4 * S + w * 0.1 * S, 2.2, 0);
                ribR.rotation.z = Math.PI / 2 + (w - 1.5) * 0.12;
                group.add(ribR);
            }

            // Hooked claws at the wing tips
            const tipClawL = new THREE.Mesh(new THREE.ConeGeometry(0.04 * S, 0.2 * S, 5), boneMat('#1a0a08'));
            tipClawL.position.set(-1.05 * S, 2.2, 0);
            tipClawL.rotation.z = Math.PI / 2;
            group.add(tipClawL);
            const tipClawR = tipClawL.clone();
            tipClawR.position.x = 1.05 * S;
            tipClawR.rotation.z = -Math.PI / 2;
            group.add(tipClawR);

            // Long writhing tail tendril
            const tailTendrils = addTendrils(group, 0, 2.05, -0.25 * S, 1, 0.7 * S, FLESH.bruised);
            group.userData.tendrils.push(...tailTendrils);

            group.userData.wingL = wingL;
            group.userData.wingR = wingR;
            break;
        }
        case 'darkKnight': {
            // BRUTE — towering muscular monstrosity, gaping fanged maw, drooling, exposed ribcage, pulsing chest
            const headPivot = new THREE.Group();
            headPivot.position.y = 1.85 * S;
            const head = new THREE.Mesh(organicGeo(0.5 * S, 0.16, 16), fleshMat(FLESH.bruised));
            head.scale.set(1.1, 0.95, 1);
            headPivot.add(head);
            addFangedMaw(headPivot, 0, -0.15 * S, 0.42 * S, 0.6 * S, 0.45 * S, 9);
            const drool = addDrool(headPivot, 0, -0.45 * S, 0.45 * S, 0.5 * S, 6);

            // Tiny blank glowing white eyes — staring
            const whiteMat = new THREE.MeshBasicMaterial({ color: FLESH.whiteEye });
            const eyeGeo = new THREE.SphereGeometry(0.06 * S, 8, 8);
            const eyeL = new THREE.Mesh(eyeGeo, whiteMat);
            eyeL.position.set(-0.13 * S, 0.15 * S, 0.42 * S);
            headPivot.add(eyeL);
            const eyeR = new THREE.Mesh(eyeGeo, whiteMat);
            eyeR.position.set(0.13 * S, 0.15 * S, 0.42 * S);
            headPivot.add(eyeR);
            // Asymmetric extra eye on cheek
            addExtraEye(headPivot, 0.28 * S, -0.05 * S, 0.32 * S, 0.05 * S, 'black');
            group.add(headPivot);
            group.userData.headJitter = headPivot;
            group.userData.drool.push(...drool);

            // Lolling tongue hanging out (extra on top of maw tongue)
            const lolTongue = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08 * S, 0.05 * S, 0.4 * S, 6),
                tongueMat
            );
            lolTongue.position.set(0.05 * S, 1.5 * S, 0.55 * S);
            lolTongue.rotation.x = Math.PI / 2 - 0.4;
            lolTongue.rotation.z = 0.3;
            group.add(lolTongue);

            // Massive bulky torso
            const torso = new THREE.Mesh(organicGeo(0.55 * S, 0.2, 18), fleshMat(FLESH.bruised));
            torso.position.y = 1.05 * S;
            torso.scale.set(1.4, 1.1, 0.85);
            group.add(torso);
            addVeins(torso, 22, FLESH.darkVein);
            addBloodStains(torso, 8);

            // Exposed ribcage on chest — torn flesh showing bone + raw meat
            addExposedRibs(group, 0, 1.15 * S, 0.5 * S, 0.5 * S, 6);

            // Pulsing glowing red crack across the chest
            const crack = addGlowCrack(group, 0, 0.85 * S, 0.55 * S, 0.6 * S, false);
            group.userData.glowParts.push(crack);

            // Bone spikes protruding from back / shoulders
            addBoneSpikes(group, 0, 1.4 * S, -0.4 * S, 6, 0.18 * S, 0.7 * S);
            addBoneSpikes(group, -0.5 * S, 1.5 * S, -0.15 * S, 2, 0.15 * S, 0.2 * S);
            addBoneSpikes(group, 0.5 * S, 1.5 * S, -0.15 * S, 2, 0.15 * S, 0.2 * S);

            // Outstretched veiny muscular arms — asymmetric (one bigger)
            const upperArm = new THREE.Mesh(capsuleGeo(0.2 * S, 0.55 * S), fleshMat(FLESH.bruised));
            upperArm.position.set(-0.7 * S, 1.2 * S, 0);
            upperArm.rotation.z = 1.0;
            group.add(upperArm);
            addVeins(upperArm, 12, FLESH.darkVein);
            const upperArmR = new THREE.Mesh(capsuleGeo(0.16 * S, 0.5 * S), fleshMat(FLESH.bruised));
            upperArmR.position.set(0.65 * S, 1.25 * S, 0);
            upperArmR.rotation.z = -0.95;
            group.add(upperArmR);
            addVeins(upperArmR, 10, FLESH.darkVein);

            // Forearms
            const forearm = new THREE.Mesh(capsuleGeo(0.17 * S, 0.6 * S), fleshMat(FLESH.sicklyPink));
            forearm.position.set(-1.15 * S, 1.0 * S, 0);
            forearm.rotation.z = 1.25;
            group.add(forearm);
            const forearmR = new THREE.Mesh(capsuleGeo(0.14 * S, 0.55 * S), fleshMat(FLESH.sicklyPink));
            forearmR.position.set(1.05 * S, 1.05 * S, 0);
            forearmR.rotation.z = -1.2;
            group.add(forearmR);

            // Clawed fists with hooked claws sticking out
            const fist = new THREE.Mesh(organicGeo(0.2 * S, 0.12, 12), fleshMat(FLESH.bruised));
            fist.position.set(-1.5 * S, 0.7 * S, 0);
            group.add(fist);
            addClaws(group, -1.55 * S, 0.55 * S, 0.15 * S, 5, 0.22 * S, 1);
            const fistR = new THREE.Mesh(organicGeo(0.17 * S, 0.12, 12), fleshMat(FLESH.bruised));
            fistR.position.set(1.4 * S, 0.75 * S, 0);
            group.add(fistR);
            addClaws(group, 1.45 * S, 0.6 * S, 0.15 * S, 5, 0.18 * S, 1);

            // Tendrils growing out of the back/shoulders
            const tendrils = addTendrils(group, 0, 1.35 * S, -0.3 * S, 4, 0.5 * S, FLESH.deepPink);
            group.userData.tendrils.push(...tendrils);

            // Thick legs
            const leg = new THREE.Mesh(capsuleGeo(0.18 * S, 0.7 * S), fleshMat(FLESH.bruised));
            leg.position.set(-0.22 * S, 0.4 * S, 0);
            group.add(leg);
            const legR = leg.clone(); legR.position.x = 0.22 * S; group.add(legR);

            // Inner red glow at chest — pulsing horror
            const pl = new THREE.PointLight(FLESH.innerGlow, 1.2, 3.5, 1.3);
            pl.position.set(0, 0.9 * S, 0.4 * S);
            group.add(pl);
            group.userData.glowLight = pl;
            break;
        }
        case 'necromancer': {
            // LICH CRAWLER — gaunt hooded thing with skeletal claws and floating runes
            const robe = new THREE.Mesh(organicGeo(0.45 * S, 0.14, 14), fleshMat('#1a0820'));
            robe.position.y = 0.7 * S;
            robe.scale.set(0.85, 1.5, 0.85);
            group.add(robe);
            // Tendrils trailing from robe hem
            const robeTendrils = addTendrils(group, 0, 0.1 * S, 0, 4, 0.3 * S, '#1a0820');
            group.userData.tendrils.push(...robeTendrils);

            const headPivot = new THREE.Group();
            headPivot.position.y = 1.55 * S;

            // Hood
            const hood = new THREE.Mesh(organicGeo(0.32 * S, 0.1, 12), fleshMat('#2a0a2a'));
            hood.scale.set(1, 1.15, 1);
            headPivot.add(hood);

            // Sickly exposed face inside hood (deep shadow effect via dark color)
            const face = new THREE.Mesh(organicGeo(0.22 * S, 0.12, 12), fleshMat(FLESH.grey));
            face.position.set(0, -0.05 * S, 0.18 * S);
            face.scale.set(0.9, 1.1, 0.7);
            headPivot.add(face);
            // Deep-set glowing purple eyes
            addGlowEyes(headPivot, 0, 0.0, 0.34 * S, 0.08 * S, 0.05 * S, FLESH.glowEyePurple);
            // Grin mouth dripping
            addGrinMouth(headPivot, 0, -0.15 * S, 0.32 * S, 0.22 * S, 0.12 * S, 5);
            const drool = addDrool(headPivot, 0, -0.25 * S, 0.36 * S, 0.18 * S, 3);
            group.add(headPivot);
            group.userData.headJitter = headPivot;
            group.userData.drool.push(...drool);

            // Skeletal arm holding staff
            const arm = new THREE.Mesh(capsuleGeo(0.05 * S, 0.55 * S), fleshMat(FLESH.grey));
            arm.position.set(0.32 * S, 1.0 * S, 0.05 * S);
            arm.rotation.z = -0.3;
            group.add(arm);
            // Other arm — outstretched with claws
            const armL = new THREE.Mesh(capsuleGeo(0.05 * S, 0.55 * S), fleshMat(FLESH.grey));
            armL.position.set(-0.4 * S, 0.95 * S, 0.1 * S);
            armL.rotation.z = 0.5;
            group.add(armL);
            addClaws(group, -0.6 * S, 0.6 * S, 0.15 * S, 5, 0.15 * S, 1);

            // Staff
            const staff = new THREE.Mesh(
                new THREE.CylinderGeometry(0.025, 0.03, 1.8 * S, 6),
                boneMat('#1a0a1a')
            );
            staff.position.set(0.45 * S, 0.9 * S, 0);
            group.add(staff);
            const staffSkull = new THREE.Mesh(organicGeo(0.13 * S, 0.06, 10), boneMat(FLESH.boneCream));
            staffSkull.position.set(0.45 * S, 1.85 * S, 0);
            group.add(staffSkull);
            // Skull eye sockets — glowing
            addGlowEyes(group, 0.45 * S, 1.88 * S, 0.1 * S, 0.04 * S, 0.025 * S, FLESH.glowEyePurple);
            // Glowing orb around skull
            const orb = new THREE.Mesh(
                new THREE.SphereGeometry(0.16 * S, 12, 12),
                new THREE.MeshBasicMaterial({ color: FLESH.glowEyePurple, transparent: true, opacity: 0.5 })
            );
            orb.position.set(0.45 * S, 1.85 * S, 0);
            group.add(orb);

            // Floating runes around the figure (2 boxes that orbit)
            const runeMat = new THREE.MeshBasicMaterial({ color: FLESH.glowEyePurple });
            for (let r = 0; r < 3; r++) {
                const rune = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), runeMat);
                const ang = (r / 3) * Math.PI * 2;
                rune.position.set(Math.cos(ang) * 0.65 * S, 1.0 * S + Math.sin(r) * 0.2, Math.sin(ang) * 0.65 * S);
                rune._orbitAngle = ang;
                rune._orbitRadius = 0.65 * S;
                rune._baseY = rune.position.y;
                group.add(rune);
                if (!group.userData.runes) group.userData.runes = [];
                group.userData.runes.push(rune);
            }

            // Sickly purple glow
            const pl = new THREE.PointLight(FLESH.glowEyePurple, 1.0, 3.0, 1.5);
            pl.position.set(0.45 * S, 1.85 * S, 0);
            group.add(pl);
            break;
        }
        default: {
            const blob = new THREE.Mesh(organicGeo(0.45 * S, 0.18, 14), fleshMat(FLESH.bruised));
            blob.position.y = 0.9 * S;
            group.add(blob);
            addFangedMaw(group, 0, 0.85 * S, 0.4 * S, 0.4 * S, 0.25 * S, 6);
            addBeadyEyes(group, 0, 1.15 * S, 0.32 * S, 0.13 * S, 0.05 * S);
        }
    }

    return group;
}

// Billboard: face camera on Y axis
export function billboardEnemy(mesh, cameraPos) {
    mesh.lookAt(cameraPos.x, mesh.position.y, cameraPos.z);
}

// Per-frame organic motion: head jitter, tendril writhe, drool sway, glow pulse, breathing
export function animateEnemyMesh(mesh, enemyType, time) {
    const ud = mesh.userData;

    // Head jitter — twitchy unsettling motion
    if (ud.headJitter) {
        const t = time * 0.001;
        ud.headJitter.rotation.y = Math.sin(t * 2.3 + (mesh.id || 0)) * 0.15
            + Math.sin(t * 7.1) * 0.05;
        ud.headJitter.rotation.z = Math.cos(t * 1.7) * 0.08;
        // Occasional violent twitch
        const twitch = Math.sin(t * 0.7 + (mesh.id || 0));
        if (twitch > 0.97) ud.headJitter.rotation.x = (Math.random() - 0.5) * 0.3;
    }

    // Writhing tendrils
    if (ud.tendrils && ud.tendrils.length) {
        const t = time * 0.002;
        for (const tendril of ud.tendrils) {
            tendril.rotation.x = tendril._baseRotX + Math.sin(t + tendril._phase) * 0.4;
            tendril.rotation.z = tendril._baseRotZ + Math.cos(t * 1.3 + tendril._phase) * 0.3;
        }
    }

    // Drool sway (slight) — sometimes drips longer
    if (ud.drool && ud.drool.length) {
        const t = time * 0.001;
        for (const d of ud.drool) {
            d.rotation.z = Math.sin(t + d._phase) * 0.15;
        }
    }

    // Pulsing red glow cracks — heartbeat
    if (ud.glowParts && ud.glowParts.length) {
        const pulse = 0.7 + Math.sin(time * 0.005) * 0.3 + Math.sin(time * 0.025) * 0.15;
        for (const g of ud.glowParts) {
            g.scale.set(pulse, pulse, pulse);
        }
    }

    // Pulsing inner light
    if (ud.glowLight) {
        ud.glowLight.intensity = 1.0 + Math.sin(time * 0.005) * 0.5;
    }

    // Orbiting runes (necromancer)
    if (ud.runes) {
        const t = time * 0.0015;
        for (let i = 0; i < ud.runes.length; i++) {
            const r = ud.runes[i];
            const a = r._orbitAngle + t;
            r.position.x = Math.cos(a) * r._orbitRadius;
            r.position.z = Math.sin(a) * r._orbitRadius;
            r.position.y = r._baseY + Math.sin(time * 0.003 + i) * 0.1;
            r.rotation.y += 0.04;
        }
    }

    // Bat — wing flap (in addition to whatever animation above)
    if (enemyType === 'bat' && ud.wingL) {
        const flap = Math.sin(time * 0.012) * 0.6;
        ud.wingL.rotation.y = 0.3 + flap;
        ud.wingR.rotation.y = -0.3 - flap;
        return;
    }

    // Slime — body squish pulse
    if (enemyType === 'slime' && ud.body) {
        const squish = 1 + Math.sin(time * 0.005) * 0.14;
        ud.body.scale.y = 0.7 * squish;
        ud.body.scale.x = 1.0 / squish;
        ud.body.scale.z = 1.0 / squish;
        return;
    }

    // Subtle breathing for everyone else
    const breath = 1 + Math.sin(time * 0.003 + (mesh.id || 0)) * 0.025;
    mesh.scale.y = breath;
}
