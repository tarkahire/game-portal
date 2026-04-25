// ═══════════════════════════════════════════════════════════════
//  ENEMY MESH FACTORY — fleshy organic horror creatures
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { TILE, WALL_HEIGHT } from '../constants.js';

// Pale flesh palette — sickly, organic, disturbing
const FLESH = {
    palePink: '#d4a89a',
    sicklyPink: '#b89080',
    bruised: '#9a7080',
    deepPink: '#7a4055',
    grey: '#a89888',
    darkVein: '#4a1828',
    teeth: '#e8dcc0',
    gum: '#8b3850',
    tongue: '#a83458',
    blackEye: '#0a0408',
    whiteEye: '#e8e0d8',
    glowEyeRed: '#ff2200',
    glowEyePurple: '#cc00ff',
};

// Wet flesh — slightly glossy
const fleshMat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 });
const wetFleshMat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1 });
const boneMat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1 });
const glowMat = (color) => new THREE.MeshBasicMaterial({ color });

const toothMat = new THREE.MeshStandardMaterial({ color: FLESH.teeth, roughness: 0.4, metalness: 0.05 });
const gumMat = new THREE.MeshStandardMaterial({ color: FLESH.gum, roughness: 0.6 });
const tongueMat = new THREE.MeshStandardMaterial({ color: FLESH.tongue, roughness: 0.4 });
const blackEyeMat = new THREE.MeshStandardMaterial({ color: FLESH.blackEye, roughness: 0.2, metalness: 0.3 });
const interiorMat = new THREE.MeshBasicMaterial({ color: '#08000a' });

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

// Smooth capsule for organic limbs
function capsuleGeo(radius, length) {
    return new THREE.CapsuleGeometry(radius, length, 6, 10);
}

// Tiny beady black eyes with a wet shine — like the SCP creature
function addBeadyEyes(group, cx, cy, cz, spacing, size) {
    const geo = new THREE.SphereGeometry(size, 10, 10);
    const eyeL = new THREE.Mesh(geo, blackEyeMat);
    eyeL.position.set(cx - spacing, cy, cz);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(geo, blackEyeMat);
    eyeR.position.set(cx + spacing, cy, cz);
    group.add(eyeR);
    // Wet shine highlights
    const shineGeo = new THREE.SphereGeometry(size * 0.32, 6, 6);
    const shineMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const sL = new THREE.Mesh(shineGeo, shineMat);
    sL.position.set(cx - spacing + size * 0.4, cy + size * 0.3, cz + size * 0.55);
    group.add(sL);
    const sR = new THREE.Mesh(shineGeo, shineMat);
    sR.position.set(cx + spacing + size * 0.4, cy + size * 0.3, cz + size * 0.55);
    group.add(sR);
}

// Glowing eyes (for necromancer / undead bosses)
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

// Wide grinning mouth with rows of human-like flat teeth (SCP creature style)
function addGrinMouth(group, cx, cy, cz, width, height, teethCount) {
    // Upper gum strip
    const upperGum = new THREE.Mesh(
        new THREE.BoxGeometry(width, height * 0.35, height * 0.3),
        gumMat
    );
    upperGum.position.set(cx, cy + height * 0.18, cz);
    group.add(upperGum);
    // Lower gum strip
    const lowerGum = new THREE.Mesh(
        new THREE.BoxGeometry(width, height * 0.35, height * 0.3),
        gumMat
    );
    lowerGum.position.set(cx, cy - height * 0.18, cz);
    group.add(lowerGum);
    // Dark interior gap
    const interior = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.95, height * 0.2, height * 0.2),
        interiorMat
    );
    interior.position.set(cx, cy, cz - height * 0.05);
    group.add(interior);
    // Upper teeth — flat, slightly irregular
    const toothW = (width / teethCount) * 0.85;
    const toothH = height * 0.32;
    const toothGeo = new THREE.BoxGeometry(toothW, toothH, height * 0.18);
    for (let t = 0; t < teethCount; t++) {
        const tx = cx - width * 0.5 + (t + 0.5) / teethCount * width;
        const tooth = new THREE.Mesh(toothGeo, toothMat);
        tooth.position.set(tx, cy + height * 0.05 + (Math.random() - 0.5) * height * 0.04, cz + height * 0.02);
        tooth.rotation.z = (Math.random() - 0.5) * 0.12;
        group.add(tooth);
    }
    // Lower teeth
    for (let t = 0; t < teethCount; t++) {
        const tx = cx - width * 0.5 + (t + 0.5) / teethCount * width;
        const tooth = new THREE.Mesh(toothGeo, toothMat);
        tooth.position.set(tx, cy - height * 0.05 + (Math.random() - 0.5) * height * 0.04, cz + height * 0.02);
        tooth.rotation.z = (Math.random() - 0.5) * 0.12;
        group.add(tooth);
    }
}

// Gaping fanged maw — large irregular sharp teeth (brute/predator style)
function addFangedMaw(group, cx, cy, cz, width, height, fangCount) {
    // Dark interior cavity
    const interior = new THREE.Mesh(
        new THREE.SphereGeometry(width * 0.5, 12, 8),
        interiorMat
    );
    interior.position.set(cx, cy, cz - width * 0.1);
    interior.scale.set(1, height / width, 0.5);
    group.add(interior);
    // Tongue
    const tongue = new THREE.Mesh(
        new THREE.SphereGeometry(width * 0.3, 10, 6),
        tongueMat
    );
    tongue.position.set(cx, cy - height * 0.18, cz);
    tongue.scale.set(1, 0.4, 1.5);
    group.add(tongue);
    // Upper fangs — irregular sizes, pointing down
    const fangGeo = new THREE.ConeGeometry(width * 0.1, height * 0.65, 8);
    for (let t = 0; t < fangCount; t++) {
        const tx = cx - width * 0.45 + (t + 0.5) / fangCount * width * 0.9;
        const sz = 0.7 + Math.random() * 0.6;
        const tooth = new THREE.Mesh(fangGeo, toothMat);
        tooth.scale.set(sz * 0.9, sz, sz * 0.9);
        tooth.position.set(tx, cy + height * 0.05 - sz * height * 0.15, cz + width * 0.18);
        tooth.rotation.x = Math.PI;
        tooth.rotation.z = (Math.random() - 0.5) * 0.25;
        group.add(tooth);
    }
    // Lower fangs — pointing up
    const lowerCount = Math.max(2, fangCount - 1);
    for (let t = 0; t < lowerCount; t++) {
        const tx = cx - width * 0.4 + (t + 0.5) / lowerCount * width * 0.8;
        const sz = 0.6 + Math.random() * 0.5;
        const tooth = new THREE.Mesh(fangGeo, toothMat);
        tooth.scale.set(sz * 0.9, sz, sz * 0.9);
        tooth.position.set(tx, cy - height * 0.05 + sz * height * 0.12, cz + width * 0.18);
        tooth.rotation.z = (Math.random() - 0.5) * 0.25;
        group.add(tooth);
    }
}

// Add scattered veiny detail on a body part (organic horror look)
function addVeins(parent, count, color) {
    const veinMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45 });
    const veinGeo = new THREE.CylinderGeometry(0.008, 0.005, 0.35, 4);
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

export function createEnemyMesh(enemyType, isBoss) {
    const group = new THREE.Group();
    const S = isBoss ? 2.5 : 1.5;

    switch (enemyType) {
        case 'skeleton': {
            // GAUNT STALKER — hunched pale humanoid with elongated bulbous head and huge grin
            const head = new THREE.Mesh(organicGeo(0.42 * S, 0.12, 16), fleshMat(FLESH.palePink));
            head.position.y = 1.65 * S;
            head.scale.set(1.4, 0.9, 0.9);
            head.rotation.x = 0.3;
            group.add(head);
            addGrinMouth(group, 0, 1.55 * S, 0.36 * S, 0.55 * S, 0.18 * S, 8);
            addBeadyEyes(group, 0, 1.86 * S, 0.34 * S, 0.13 * S, 0.045 * S);

            // Hunched torso
            const torso = new THREE.Mesh(organicGeo(0.35 * S, 0.15, 14), fleshMat(FLESH.sicklyPink));
            torso.position.set(0, 1.0 * S, 0);
            torso.scale.set(0.85, 1.3, 0.7);
            torso.rotation.x = 0.2;
            group.add(torso);
            addVeins(torso, 6, FLESH.darkVein);

            // Sinewy arms
            const upperArm = new THREE.Mesh(capsuleGeo(0.07 * S, 0.4 * S), fleshMat(FLESH.palePink));
            upperArm.position.set(-0.32 * S, 1.05 * S, 0);
            upperArm.rotation.z = 0.4;
            group.add(upperArm);
            const upperArmR = upperArm.clone();
            upperArmR.position.x = 0.32 * S; upperArmR.rotation.z = -0.4;
            group.add(upperArmR);
            const forearm = new THREE.Mesh(capsuleGeo(0.06 * S, 0.45 * S), fleshMat(FLESH.sicklyPink));
            forearm.position.set(-0.5 * S, 0.55 * S, 0.05 * S);
            forearm.rotation.z = 0.7;
            group.add(forearm);
            const forearmR = forearm.clone();
            forearmR.position.x = 0.5 * S; forearmR.rotation.z = -0.7;
            group.add(forearmR);

            // Spindly legs
            const leg = new THREE.Mesh(capsuleGeo(0.08 * S, 0.55 * S), fleshMat(FLESH.sicklyPink));
            leg.position.set(-0.13 * S, 0.4 * S, 0);
            group.add(leg);
            const legR = leg.clone(); legR.position.x = 0.13 * S; group.add(legR);
            break;
        }
        case 'archerSkeleton': {
            // SPIRE WRETCH — taller, leaner version with a primitive bone bow
            const head = new THREE.Mesh(organicGeo(0.32 * S, 0.1, 16), fleshMat(FLESH.grey));
            head.position.y = 1.95 * S;
            head.scale.set(0.9, 1.4, 0.9);
            group.add(head);
            addGrinMouth(group, 0, 1.85 * S, 0.28 * S, 0.32 * S, 0.2 * S, 6);
            addBeadyEyes(group, 0, 2.15 * S, 0.27 * S, 0.1 * S, 0.04 * S);

            const torso = new THREE.Mesh(organicGeo(0.28 * S, 0.12, 14), fleshMat(FLESH.grey));
            torso.position.y = 1.15 * S;
            torso.scale.set(0.7, 1.5, 0.55);
            group.add(torso);
            addVeins(torso, 5, FLESH.darkVein);

            // Long bow arm
            const arm = new THREE.Mesh(capsuleGeo(0.06 * S, 0.65 * S), fleshMat(FLESH.grey));
            arm.position.set(0.3 * S, 1.2 * S, 0);
            arm.rotation.z = -0.5;
            group.add(arm);

            // Bone bow
            const bow = new THREE.Mesh(
                new THREE.TorusGeometry(0.4 * S, 0.025, 6, 16, Math.PI),
                boneMat('#5a4838')
            );
            bow.position.set(0.5 * S, 1.3 * S, 0);
            bow.rotation.z = Math.PI / 2;
            group.add(bow);

            // Other arm
            const armR = new THREE.Mesh(capsuleGeo(0.06 * S, 0.5 * S), fleshMat(FLESH.grey));
            armR.position.set(-0.3 * S, 1.05 * S, 0);
            armR.rotation.z = 0.6;
            group.add(armR);

            // Long legs
            const leg = new THREE.Mesh(capsuleGeo(0.07 * S, 0.7 * S), fleshMat(FLESH.grey));
            leg.position.set(-0.1 * S, 0.45 * S, 0);
            group.add(leg);
            const legR = leg.clone(); legR.position.x = 0.1 * S; group.add(legR);
            break;
        }
        case 'slime': {
            // FLESHMOUND — pulsing fleshy blob with multiple mouths and scattered eyes
            const body = new THREE.Mesh(organicGeo(0.6 * S, 0.18, 18), wetFleshMat('#a85870'));
            body.position.y = 0.55 * S;
            body.scale.y = 0.7;
            group.add(body);
            addVeins(body, 14, FLESH.darkVein);

            // Big front maw
            addFangedMaw(group, 0, 0.55 * S, 0.5 * S, 0.5 * S, 0.3 * S, 7);
            // Smaller side mouths
            addFangedMaw(group, -0.42 * S, 0.45 * S, 0.18 * S, 0.25 * S, 0.18 * S, 4);
            addFangedMaw(group, 0.42 * S, 0.5 * S, 0.18 * S, 0.25 * S, 0.18 * S, 4);

            // Cluster of beady eyes scattered on top
            addBeadyEyes(group, 0, 0.9 * S, 0.32 * S, 0.18 * S, 0.05 * S);
            const stray = new THREE.Mesh(
                new THREE.SphereGeometry(0.045 * S, 8, 8),
                blackEyeMat
            );
            stray.position.set(0.18 * S, 1.0 * S, 0.25 * S);
            group.add(stray);
            const stray2 = stray.clone();
            stray2.position.set(-0.22 * S, 0.97 * S, 0.22 * S);
            group.add(stray2);
            const stray3 = stray.clone();
            stray3.position.set(0.0, 1.05 * S, 0.0);
            group.add(stray3);

            group.userData.body = body;
            break;
        }
        case 'bat': {
            // MAW WING — flying flesh blob with leathery wings and a mouth on the underside
            const body = new THREE.Mesh(organicGeo(0.32 * S, 0.12, 14), fleshMat(FLESH.bruised));
            body.position.y = 2.2;
            body.scale.set(1, 0.8, 1.1);
            group.add(body);
            addFangedMaw(group, 0, 1.95, 0.18 * S, 0.35 * S, 0.22 * S, 5);
            addBeadyEyes(group, 0, 2.32, 0.25 * S, 0.1 * S, 0.04 * S);

            // Leathery wings
            const wingMat = new THREE.MeshStandardMaterial({
                color: FLESH.deepPink, side: THREE.DoubleSide,
                roughness: 0.7, transparent: true, opacity: 0.85
            });
            const wingGeo = new THREE.PlaneGeometry(0.95 * S, 0.55 * S);
            const wingL = new THREE.Mesh(wingGeo, wingMat);
            wingL.position.set(-0.55 * S, 2.2, 0);
            wingL.rotation.y = 0.3;
            group.add(wingL);
            const wingR = new THREE.Mesh(wingGeo, wingMat);
            wingR.position.set(0.55 * S, 2.2, 0);
            wingR.rotation.y = -0.3;
            group.add(wingR);

            // Wing membrane veins
            for (let w = 0; w < 4; w++) {
                const ribGeo = new THREE.CylinderGeometry(0.012, 0.008, 0.5 * S, 4);
                const ribMat = new THREE.MeshBasicMaterial({ color: FLESH.darkVein });
                const ribL = new THREE.Mesh(ribGeo, ribMat);
                ribL.position.set(-0.4 * S - w * 0.08 * S, 2.2, 0);
                ribL.rotation.z = Math.PI / 2 + (w - 1.5) * 0.1;
                group.add(ribL);
                const ribR = new THREE.Mesh(ribGeo, ribMat);
                ribR.position.set(0.4 * S + w * 0.08 * S, 2.2, 0);
                ribR.rotation.z = Math.PI / 2 + (w - 1.5) * 0.1;
                group.add(ribR);
            }

            group.userData.wingL = wingL;
            group.userData.wingR = wingR;
            break;
        }
        case 'darkKnight': {
            // BRUTE — massive muscular fleshy hulk with veiny arms and gaping fanged maw
            const head = new THREE.Mesh(organicGeo(0.48 * S, 0.12, 16), fleshMat(FLESH.bruised));
            head.position.y = 1.85 * S;
            head.scale.set(1.1, 0.95, 1);
            group.add(head);
            addFangedMaw(group, 0, 1.7 * S, 0.42 * S, 0.55 * S, 0.4 * S, 8);

            // Tiny blank white eyes
            const whiteMat = new THREE.MeshBasicMaterial({ color: FLESH.whiteEye });
            const eyeGeo = new THREE.SphereGeometry(0.06 * S, 8, 8);
            const eyeL = new THREE.Mesh(eyeGeo, whiteMat);
            eyeL.position.set(-0.13 * S, 2.0 * S, 0.42 * S);
            group.add(eyeL);
            const eyeR = new THREE.Mesh(eyeGeo, whiteMat);
            eyeR.position.set(0.13 * S, 2.0 * S, 0.42 * S);
            group.add(eyeR);

            // Massive bulky torso
            const torso = new THREE.Mesh(organicGeo(0.55 * S, 0.18, 18), fleshMat(FLESH.bruised));
            torso.position.y = 1.05 * S;
            torso.scale.set(1.4, 1.1, 0.85);
            group.add(torso);
            addVeins(torso, 18, FLESH.darkVein);

            // Pectoral bumps
            const pecGeo = organicGeo(0.22 * S, 0.1, 12);
            const pecL = new THREE.Mesh(pecGeo, fleshMat(FLESH.sicklyPink));
            pecL.position.set(-0.25 * S, 1.3 * S, 0.4 * S);
            pecL.scale.set(1, 0.7, 0.7);
            group.add(pecL);
            const pecR = pecL.clone(); pecR.position.x = 0.25 * S; group.add(pecR);

            // Outstretched veiny muscular arms
            const upperArm = new THREE.Mesh(capsuleGeo(0.18 * S, 0.5 * S), fleshMat(FLESH.bruised));
            upperArm.position.set(-0.65 * S, 1.2 * S, 0);
            upperArm.rotation.z = 1.0;
            group.add(upperArm);
            addVeins(upperArm, 10, FLESH.darkVein);
            const upperArmR = new THREE.Mesh(capsuleGeo(0.18 * S, 0.5 * S), fleshMat(FLESH.bruised));
            upperArmR.position.set(0.65 * S, 1.2 * S, 0);
            upperArmR.rotation.z = -1.0;
            group.add(upperArmR);
            addVeins(upperArmR, 10, FLESH.darkVein);

            // Forearms
            const forearm = new THREE.Mesh(capsuleGeo(0.15 * S, 0.55 * S), fleshMat(FLESH.sicklyPink));
            forearm.position.set(-1.05 * S, 1.05 * S, 0);
            forearm.rotation.z = 1.2;
            group.add(forearm);
            const forearmR = new THREE.Mesh(capsuleGeo(0.15 * S, 0.55 * S), fleshMat(FLESH.sicklyPink));
            forearmR.position.set(1.05 * S, 1.05 * S, 0);
            forearmR.rotation.z = -1.2;
            group.add(forearmR);

            // Clawed fists
            const fist = new THREE.Mesh(organicGeo(0.18 * S, 0.1, 12), fleshMat(FLESH.bruised));
            fist.position.set(-1.4 * S, 0.85 * S, 0);
            group.add(fist);
            const fistR = fist.clone(); fistR.position.x = 1.4 * S; group.add(fistR);

            // Thick legs
            const leg = new THREE.Mesh(capsuleGeo(0.16 * S, 0.65 * S), fleshMat(FLESH.bruised));
            leg.position.set(-0.22 * S, 0.4 * S, 0);
            group.add(leg);
            const legR = leg.clone(); legR.position.x = 0.22 * S; group.add(legR);
            break;
        }
        case 'necromancer': {
            // LICH CRAWLER — gaunt hooded figure with sickly exposed face and glowing eyes
            const robe = new THREE.Mesh(organicGeo(0.45 * S, 0.1, 14), fleshMat('#2a1228'));
            robe.position.y = 0.7 * S;
            robe.scale.set(0.85, 1.5, 0.85);
            group.add(robe);

            // Hood
            const hood = new THREE.Mesh(organicGeo(0.32 * S, 0.08, 12), fleshMat('#3a1a3a'));
            hood.position.y = 1.55 * S;
            hood.scale.set(1, 1.1, 1);
            group.add(hood);

            // Sickly exposed face inside hood
            const face = new THREE.Mesh(organicGeo(0.22 * S, 0.1, 12), fleshMat(FLESH.grey));
            face.position.set(0, 1.5 * S, 0.18 * S);
            face.scale.set(0.9, 1.1, 0.7);
            group.add(face);
            addGlowEyes(group, 0, 1.55 * S, 0.34 * S, 0.08 * S, 0.05 * S, FLESH.glowEyePurple);
            addGrinMouth(group, 0, 1.4 * S, 0.32 * S, 0.22 * S, 0.1 * S, 5);

            // Skeletal arm holding staff
            const arm = new THREE.Mesh(capsuleGeo(0.05 * S, 0.55 * S), fleshMat(FLESH.grey));
            arm.position.set(0.32 * S, 1.0 * S, 0.05 * S);
            arm.rotation.z = -0.3;
            group.add(arm);

            // Staff
            const staff = new THREE.Mesh(
                new THREE.CylinderGeometry(0.025, 0.03, 1.8 * S, 6),
                boneMat('#1a0a1a')
            );
            staff.position.set(0.45 * S, 0.9 * S, 0);
            group.add(staff);

            // Skull on top
            const staffSkull = new THREE.Mesh(organicGeo(0.12 * S, 0.05, 10), boneMat('#b0a080'));
            staffSkull.position.set(0.45 * S, 1.85 * S, 0);
            group.add(staffSkull);

            // Glowing orb
            const orb = new THREE.Mesh(
                new THREE.SphereGeometry(0.13 * S, 12, 12),
                new THREE.MeshBasicMaterial({ color: FLESH.glowEyePurple, transparent: true, opacity: 0.7 })
            );
            orb.position.set(0.45 * S, 1.85 * S, 0);
            group.add(orb);
            break;
        }
        default: {
            // Generic fleshy horror
            const blob = new THREE.Mesh(organicGeo(0.45 * S, 0.15, 14), fleshMat(FLESH.bruised));
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

// Subtle organic motion — wing flap, slime pulse, breathing
export function animateEnemyMesh(mesh, enemyType, time) {
    if (enemyType === 'bat' && mesh.userData.wingL) {
        const flap = Math.sin(time * 0.012) * 0.6;
        mesh.userData.wingL.rotation.y = 0.3 + flap;
        mesh.userData.wingR.rotation.y = -0.3 - flap;
        return;
    }
    if (enemyType === 'slime' && mesh.userData.body) {
        const squish = 1 + Math.sin(time * 0.005) * 0.12;
        mesh.userData.body.scale.y = 0.7 * squish;
        mesh.userData.body.scale.x = 1.0 / squish;
        mesh.userData.body.scale.z = 1.0 / squish;
        return;
    }
    // Subtle breathing for everyone else (idle/walk-blend feel)
    const breath = 1 + Math.sin(time * 0.003 + (mesh.id || 0)) * 0.025;
    mesh.scale.y = breath;
}
