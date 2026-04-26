// Character model builders + animation updaters extracted from
// games/dungeon-crawler-3d/src/main.js. Self-contained: only depends on THREE.
// 0 references replaced with 0 (no flying in BR).

import * as THREE from 'three';

const TILE = 4;

export function buildGojoModel() {
    const pm = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: '#f0d5b8', roughness: 0.5 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.6 }); // dark navy/black jacket
    const innerMat = new THREE.MeshStandardMaterial({ color: '#2c2c44', roughness: 0.6 }); // slightly lighter inner
    const pantsMat = new THREE.MeshStandardMaterial({ color: '#111122', roughness: 0.7 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: '#0a0a15', roughness: 0.8 });
    const blindfoldMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.4 });
    const hairMat = new THREE.MeshStandardMaterial({ color: '#e8e8f0', roughness: 0.6 }); // white/silver hair

    // ── Torso pivot (for body lean) ──
    const torsoPivot = new THREE.Group();
    torsoPivot.position.y = 0.65;

    // Upper body — jacket/coat
    const upperBody = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.9, 8), jacketMat);
    upperBody.position.y = 0.5; torsoPivot.add(upperBody);
    // Chest width — broader shoulders
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.25, 0.35), jacketMat);
    shoulders.position.y = 0.85; torsoPivot.add(shoulders);
    // Collar / high neck of the uniform
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.2, 6), jacketMat);
    collar.position.y = 1.05; torsoPivot.add(collar);
    // Inner shirt visible at collar
    const innerShirt = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 6), innerMat);
    innerShirt.position.set(0, 1.0, 0.08); torsoPivot.add(innerShirt);

    // ── Neck ──
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.15, 6), skinMat);
    neck.position.y = 1.15; torsoPivot.add(neck);

    // ── Head ──
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), skinMat);
    head.position.y = 1.4; head.scale.set(1, 1.05, 0.95); torsoPivot.add(head);

    // Jaw / chin definition
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), skinMat);
    chin.position.set(0, 1.25, 0.12); chin.scale.set(1.2, 0.7, 1); torsoPivot.add(chin);

    // ── Blindfold (wrapped around eyes) ──
    const blindfold = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.22), blindfoldMat);
    blindfold.position.set(0, 1.43, 0.05); torsoPivot.add(blindfold);
    // Blindfold wrapping around sides
    for (let s = -1; s <= 1; s += 2) {
        const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.12), blindfoldMat);
        wrap.position.set(s * 0.22, 1.43, -0.04); torsoPivot.add(wrap);
    }
    // Blindfold tail (hanging strip on right side)
    const bfTail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.04), blindfoldMat);
    bfTail.position.set(0.24, 1.35, -0.06);
    bfTail.rotation.z = -0.3;
    torsoPivot.add(bfTail);

    // ── Hair (spiky white) ──
    // Base hair volume
    const hairBase = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), hairMat);
    hairBase.position.y = 1.5; hairBase.scale.set(1.05, 0.9, 1);
    torsoPivot.add(hairBase);
    // Spiky hair strands — upward and slightly forward/sideways
    const spikePositions = [
        { x: 0, y: 1.7, z: 0.05, rx: -0.3, rz: 0, h: 0.22 },
        { x: 0.08, y: 1.68, z: 0.03, rx: -0.2, rz: 0.3, h: 0.2 },
        { x: -0.08, y: 1.68, z: 0.03, rx: -0.2, rz: -0.3, h: 0.2 },
        { x: 0.15, y: 1.63, z: -0.02, rx: 0, rz: 0.5, h: 0.18 },
        { x: -0.15, y: 1.63, z: -0.02, rx: 0, rz: -0.5, h: 0.18 },
        { x: 0.05, y: 1.67, z: -0.1, rx: 0.3, rz: 0.2, h: 0.16 },
        { x: -0.05, y: 1.67, z: -0.1, rx: 0.3, rz: -0.2, h: 0.16 },
        { x: 0, y: 1.65, z: -0.12, rx: 0.4, rz: 0, h: 0.15 },
        { x: 0.12, y: 1.6, z: 0.06, rx: -0.15, rz: 0.4, h: 0.17 },
        { x: -0.12, y: 1.6, z: 0.06, rx: -0.15, rz: -0.4, h: 0.17 },
    ];
    for (const sp of spikePositions) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, sp.h, 4), hairMat);
        spike.position.set(sp.x, sp.y, sp.z);
        spike.rotation.set(sp.rx, 0, sp.rz);
        torsoPivot.add(spike);
    }

    // ── Nose ──
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 4), skinMat);
    nose.position.set(0, 1.36, 0.2);
    nose.rotation.x = Math.PI * 0.6;
    torsoPivot.add(nose);

    // ── Mouth (subtle line) ──
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.01),
        new THREE.MeshBasicMaterial({ color: '#cc8888' }));
    mouth.position.set(0.01, 1.3, 0.19); torsoPivot.add(mouth);

    // ── Ears ──
    for (let s = -1; s <= 1; s += 2) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 5), skinMat);
        ear.position.set(s * 0.2, 1.4, 0);
        ear.scale.set(0.6, 1, 0.6);
        torsoPivot.add(ear);
    }

    // ── Right arm (articulated at shoulder) ──
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.4, 0.82, 0);
    // Shoulder joint sphere
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), jacketMat));
    // Upper arm
    const rUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.45, 5), jacketMat);
    rUpperArm.position.y = -0.28; rightArmPivot.add(rUpperArm);
    // Elbow
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), jacketMat).translateY(-0.52));
    // Forearm
    const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.4, 5), jacketMat);
    rForearm.position.y = -0.75; rightArmPivot.add(rForearm);
    // Hand
    const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), skinMat);
    rHand.position.set(0, -0.98, 0.02); rightArmPivot.add(rHand);
    // Fingers (subtle)
    for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.05, 3), skinMat);
        finger.position.set((f - 1.5) * 0.018, -1.04, 0.03);
        rightArmPivot.add(finger);
    }
    torsoPivot.add(rightArmPivot);
    pm._rightArm = rightArmPivot;

    // ── Left arm (articulated at shoulder) ──
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.4, 0.82, 0);
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), jacketMat));
    const lUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.45, 5), jacketMat);
    lUpperArm.position.y = -0.28; leftArmPivot.add(lUpperArm);
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), jacketMat).translateY(-0.52));
    const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.4, 5), jacketMat);
    lForearm.position.y = -0.75; leftArmPivot.add(lForearm);
    const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), skinMat);
    lHand.position.set(0, -0.98, 0.02); leftArmPivot.add(lHand);
    for (let f = 0; f < 4; f++) {
        leftArmPivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.05, 3), skinMat).translateX((f-1.5)*0.018).translateY(-1.04).translateZ(0.03));
    }
    torsoPivot.add(leftArmPivot);
    pm._leftArm = leftArmPivot;

    pm.add(torsoPivot);
    pm._torso = torsoPivot;

    // ── Right leg (articulated at hip) ──
    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.1, 0.65, 0);
    // Hip joint
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), pantsMat));
    // Thigh
    const rThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.45, 5), pantsMat);
    rThigh.position.y = -0.28; rightLegPivot.add(rThigh);
    // Knee
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), pantsMat).translateY(-0.52));
    // Shin
    const rShin = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.42, 5), pantsMat);
    rShin.position.y = -0.75; rightLegPivot.add(rShin);
    // Shoe
    const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.16), shoeMat);
    rShoe.position.set(0, -0.98, 0.03); rightLegPivot.add(rShoe);
    pm.add(rightLegPivot);
    pm._rightLeg = rightLegPivot;

    // ── Left leg (articulated at hip) ──
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.1, 0.65, 0);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), pantsMat));
    const lThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.45, 5), pantsMat);
    lThigh.position.y = -0.28; leftLegPivot.add(lThigh);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), pantsMat).translateY(-0.52));
    const lShin = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.42, 5), pantsMat);
    lShin.position.y = -0.75; leftLegPivot.add(lShin);
    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.16), shoeMat);
    lShoe.position.set(0, -0.98, 0.03); leftLegPivot.add(lShoe);
    pm.add(leftLegPivot);
    pm._leftLeg = leftLegPivot;

    // ── Belt / waist line ──
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.23, 0.06, 8),
        new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.5 }));
    belt.position.y = 0.62; pm.add(belt);

    // ── Infinity aura (subtle blue glow around character) ──
    const aura = new THREE.PointLight('#4fc3f7', 0.8, TILE * 3, 2);
    aura.position.y = 1.2; pm.add(aura);
    pm._auraLight = aura;

    // Mark as Gojo for animation system
    pm._isGojo = true;

    return pm;
}

// ─── GOJO WALK/IDLE ANIMATION ───────────────────────────────
export function updateGojoAnimation(pm, dt, moving, walkCycle) {
    if (!pm._isGojo) return false; // not Gojo, skip

    const t = walkCycle;

    if (moving) {
        // ── Walking ──
        const stride = 0.6; // how far legs swing
        const armSwing = 0.5; // how far arms swing
        const bodyBob = Math.abs(Math.sin(t * 2)) * 0.06;
        const bodyLean = Math.sin(t) * 0.03; // slight side-to-side lean

        // Legs — opposite phase (right forward when left back)
        if (pm._rightLeg) pm._rightLeg.rotation.x = Math.sin(t) * stride;
        if (pm._leftLeg) pm._leftLeg.rotation.x = Math.sin(t + Math.PI) * stride;

        // Arms — swing opposite to legs (natural walk)
        if (pm._rightArm) pm._rightArm.rotation.x = Math.sin(t + Math.PI) * armSwing;
        if (pm._leftArm) pm._leftArm.rotation.x = Math.sin(t) * armSwing;

        // Torso — slight lean forward + side sway
        if (pm._torso) {
            pm._torso.rotation.x = 0.05; // lean forward slightly
            pm._torso.rotation.z = bodyLean;
        }

        // Vertical bob
        pm.position.y = (0) + bodyBob;

        // Aura pulses slightly brighter when moving
        if (pm._auraLight) pm._auraLight.intensity = 0.8 + Math.sin(t * 3) * 0.3;
    } else {
        // ── Idle — breathing + subtle sway ──
        const breath = Math.sin(t * 0.6) * 0.02;
        const idleSway = Math.sin(t * 0.3) * 0.01;

        // Arms relax at sides with gentle sway
        if (pm._rightArm) pm._rightArm.rotation.x = breath + 0.05;
        if (pm._leftArm) pm._leftArm.rotation.x = breath + 0.05;

        // Legs straight
        if (pm._rightLeg) pm._rightLeg.rotation.x = 0;
        if (pm._leftLeg) pm._leftLeg.rotation.x = 0;

        // Torso — slight breathing rise/fall
        if (pm._torso) {
            pm._torso.rotation.x = breath;
            pm._torso.rotation.z = idleSway;
        }

        pm.position.y = 0;

        // Calm aura
        if (pm._auraLight) pm._auraLight.intensity = 0.6 + Math.sin(t * 0.5) * 0.15;
    }

    return true; // handled
}


export function buildSukunaModel() {
    const pm = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: '#e8c8a8', roughness: 0.5 });
    const tattooSkinMat = new THREE.MeshStandardMaterial({ color: '#c8a888', roughness: 0.5 }); // slightly darker where tattoos sit
    const tattooMat = new THREE.MeshBasicMaterial({ color: '#1a1a1a' }); // black tattoo lines
    const hakamaMat = new THREE.MeshStandardMaterial({ color: '#1a0a1a', roughness: 0.7 }); // dark purple-black hakama
    const sashMat = new THREE.MeshStandardMaterial({ color: '#3a1a2a', roughness: 0.6 });
    const hairMat = new THREE.MeshStandardMaterial({ color: '#f5c8d0', roughness: 0.5 }); // pink-ish hair
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#ff2244' }); // red eyes
    const pupilMat = new THREE.MeshBasicMaterial({ color: '#000000' });
    const nailMat = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.3 }); // dark painted nails
    const shoeMat = new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.8 });

    // ── Torso pivot ──
    const torsoPivot = new THREE.Group();
    torsoPivot.position.y = 0.65;

    // Upper body — bare muscular torso (Sukuna's Heian era form)
    const upperBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.9, 8), tattooSkinMat);
    upperBody.position.y = 0.5; torsoPivot.add(upperBody);
    // Broader shoulders — muscular build
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.28, 0.38), tattooSkinMat);
    shoulders.position.y = 0.88; torsoPivot.add(shoulders);

    // Tattoo lines on torso (black line segments on the body)
    const tattooParts = [
        // Chest center vertical line
        { w: 0.02, h: 0.5, d: 0.01, x: 0, y: 0.6, z: 0.27 },
        // Left chest horizontal
        { w: 0.2, h: 0.02, d: 0.01, x: -0.1, y: 0.7, z: 0.27 },
        // Right chest horizontal
        { w: 0.2, h: 0.02, d: 0.01, x: 0.1, y: 0.7, z: 0.27 },
        // Left shoulder band
        { w: 0.02, h: 0.15, d: 0.01, x: -0.32, y: 0.85, z: 0.16 },
        // Right shoulder band
        { w: 0.02, h: 0.15, d: 0.01, x: 0.32, y: 0.85, z: 0.16 },
        // Abdomen horizontal lines
        { w: 0.25, h: 0.015, d: 0.01, x: 0, y: 0.4, z: 0.26 },
        { w: 0.2, h: 0.015, d: 0.01, x: 0, y: 0.3, z: 0.25 },
    ];
    for (const tp of tattooParts) {
        const tat = new THREE.Mesh(new THREE.BoxGeometry(tp.w, tp.h, tp.d), tattooMat);
        tat.position.set(tp.x, tp.y, tp.z);
        torsoPivot.add(tat);
    }

    // ── Neck (thick, muscular) ──
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.15, 6), tattooSkinMat);
    neck.position.y = 1.15; torsoPivot.add(neck);

    // ── Head ──
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 10), skinMat);
    head.position.y = 1.4; head.scale.set(1, 1.05, 0.95); torsoPivot.add(head);

    // Jaw — strong angular jaw
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), skinMat);
    chin.position.set(0, 1.24, 0.13); chin.scale.set(1.3, 0.6, 1); torsoPivot.add(chin);

    // ── Face tattoos (black lines on face) ──
    // Line down nose bridge
    const faceTat1 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.12, 0.01), tattooMat);
    faceTat1.position.set(0, 1.4, 0.22); torsoPivot.add(faceTat1);
    // Lines on cheeks (left)
    const faceTat2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.01), tattooMat);
    faceTat2.position.set(-0.12, 1.37, 0.18); torsoPivot.add(faceTat2);
    // Lines on cheeks (right)
    const faceTat3 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.01), tattooMat);
    faceTat3.position.set(0.12, 1.37, 0.18); torsoPivot.add(faceTat3);
    // Forehead line
    const faceTat4 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, 0.01), tattooMat);
    faceTat4.position.set(0, 1.52, 0.2); torsoPivot.add(faceTat4);

    // ── Eyes — 4 eyes (2 normal + 2 below) — Sukuna's true form ──
    const eyeGeo = new THREE.SphereGeometry(0.035, 6, 6);
    const pupilGeo = new THREE.SphereGeometry(0.018, 4, 4);
    // Upper pair
    for (let s = -1; s <= 1; s += 2) {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(s * 0.09, 1.44, 0.2);
        torsoPivot.add(eye);
        const pupil = new THREE.Mesh(pupilGeo, pupilMat);
        pupil.position.set(s * 0.09, 1.44, 0.23);
        torsoPivot.add(pupil);
    }
    // Lower pair (smaller, slightly below)
    const smallEyeGeo = new THREE.SphereGeometry(0.025, 5, 5);
    const smallPupilGeo = new THREE.SphereGeometry(0.013, 4, 4);
    for (let s = -1; s <= 1; s += 2) {
        const eye = new THREE.Mesh(smallEyeGeo, eyeMat);
        eye.position.set(s * 0.07, 1.37, 0.2);
        torsoPivot.add(eye);
        const pupil = new THREE.Mesh(smallPupilGeo, pupilMat);
        pupil.position.set(s * 0.07, 1.37, 0.225);
        torsoPivot.add(pupil);
    }

    // ── Nose ──
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 4), skinMat);
    nose.position.set(0, 1.38, 0.22);
    nose.rotation.x = Math.PI * 0.6;
    torsoPivot.add(nose);

    // ── Mouth — confident smirk ──
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.01),
        new THREE.MeshBasicMaterial({ color: '#992244' }));
    mouth.position.set(0.01, 1.3, 0.21); torsoPivot.add(mouth);
    // Slight upward curve on one side (smirk)
    const smirk = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.01, 0.01),
        new THREE.MeshBasicMaterial({ color: '#992244' }));
    smirk.position.set(0.05, 1.305, 0.21);
    smirk.rotation.z = 0.3;
    torsoPivot.add(smirk);

    // ── Ears ──
    for (let s = -1; s <= 1; s += 2) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 5), skinMat);
        ear.position.set(s * 0.21, 1.42, 0);
        ear.scale.set(0.6, 1, 0.6);
        torsoPivot.add(ear);
    }

    // ── Hair — pink, slicked back with some spikes ──
    const hairBase = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), hairMat);
    hairBase.position.y = 1.5; hairBase.scale.set(1.05, 0.85, 1.05);
    torsoPivot.add(hairBase);
    // Slicked back spikes
    const hairSpikes = [
        { x: 0, y: 1.65, z: -0.08, rx: 0.5, rz: 0, h: 0.2 },
        { x: 0.1, y: 1.62, z: -0.06, rx: 0.4, rz: 0.3, h: 0.18 },
        { x: -0.1, y: 1.62, z: -0.06, rx: 0.4, rz: -0.3, h: 0.18 },
        { x: 0.06, y: 1.66, z: -0.02, rx: 0.3, rz: 0.15, h: 0.16 },
        { x: -0.06, y: 1.66, z: -0.02, rx: 0.3, rz: -0.15, h: 0.16 },
        { x: 0.15, y: 1.58, z: -0.04, rx: 0.3, rz: 0.5, h: 0.15 },
        { x: -0.15, y: 1.58, z: -0.04, rx: 0.3, rz: -0.5, h: 0.15 },
        // A few forward-hanging strands
        { x: 0.05, y: 1.6, z: 0.12, rx: -0.4, rz: 0.2, h: 0.12 },
        { x: -0.04, y: 1.6, z: 0.1, rx: -0.3, rz: -0.1, h: 0.1 },
    ];
    for (const sp of hairSpikes) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.035, sp.h, 4), hairMat);
        spike.position.set(sp.x, sp.y, sp.z);
        spike.rotation.set(sp.rx, 0, sp.rz);
        torsoPivot.add(spike);
    }

    // ── Right arm (muscular, tattooed) ──
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.42, 0.85, 0);
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), tattooSkinMat));
    const rUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.45, 5), tattooSkinMat);
    rUpperArm.position.y = -0.28; rightArmPivot.add(rUpperArm);
    // Arm tattoo bands
    for (let b = 0; b < 2; b++) {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.076, 0.015, 6), tattooMat);
        band.position.y = -0.15 - b * 0.18; rightArmPivot.add(band);
    }
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), tattooSkinMat).translateY(-0.52));
    const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.4, 5), tattooSkinMat);
    rForearm.position.y = -0.75; rightArmPivot.add(rForearm);
    // Hand
    const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.07), skinMat);
    rHand.position.set(0, -0.98, 0.02); rightArmPivot.add(rHand);
    // Dark nails (clawed)
    for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.06, 3), nailMat);
        finger.position.set((f - 1.5) * 0.02, -1.06, 0.03);
        rightArmPivot.add(finger);
    }
    // ── Sword (cursed blade held in right hand) ──
    const swordGroup = new THREE.Group();
    swordGroup.position.set(0, -1.04, 0.04);
    swordGroup.rotation.x = Math.PI / 2; // blade points forward (outward from hand)
    // Hilt wrap
    const hiltMat = new THREE.MeshStandardMaterial({ color: '#2a1a1a', roughness: 0.6 });
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 5), hiltMat);
    swordGroup.add(hilt);
    // Hilt wrap bands
    const wrapMat = new THREE.MeshStandardMaterial({ color: '#4a2030', roughness: 0.5 });
    for (let w = 0; w < 3; w++) {
        const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.015, 5), wrapMat);
        wrap.position.y = -0.05 + w * 0.05;
        swordGroup.add(wrap);
    }
    // Guard (tsuba) — flat disc
    const guardMat = new THREE.MeshStandardMaterial({ color: '#333333', metalness: 0.6, roughness: 0.3 });
    const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 6), guardMat);
    guard.position.y = 0.09;
    swordGroup.add(guard);
    // Blade — long, slightly tapered, dark with red edge glow
    const bladeMat = new THREE.MeshStandardMaterial({ color: '#1a1a2a', metalness: 0.8, roughness: 0.15 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.7, 0.008), bladeMat);
    blade.position.y = 0.45;
    swordGroup.add(blade);
    // Blade edge glow (thin red strip along cutting edge)
    const edgeGlowMat = new THREE.MeshBasicMaterial({ color: '#ff2244', transparent: true, opacity: 0.6 });
    const edgeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.7, 0.012), edgeGlowMat);
    edgeGlow.position.set(0.014, 0.45, 0);
    swordGroup.add(edgeGlow);
    // Blade tip — pointed
    const tipMat = new THREE.MeshStandardMaterial({ color: '#1a1a2a', metalness: 0.8, roughness: 0.15 });
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.08, 4), tipMat);
    tip.position.y = 0.84;
    swordGroup.add(tip);
    // Pommel (bottom cap)
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 5), guardMat);
    pommel.position.y = -0.09;
    swordGroup.add(pommel);
    rightArmPivot.add(swordGroup);
    torsoPivot.add(rightArmPivot);
    pm._rightArm = rightArmPivot;

    // ── Left arm (mirrored) ──
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.42, 0.85, 0);
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), tattooSkinMat));
    const lUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.45, 5), tattooSkinMat);
    lUpperArm.position.y = -0.28; leftArmPivot.add(lUpperArm);
    for (let b = 0; b < 2; b++) {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.076, 0.015, 6), tattooMat);
        band.position.y = -0.15 - b * 0.18; leftArmPivot.add(band);
    }
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), tattooSkinMat).translateY(-0.52));
    const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.4, 5), tattooSkinMat);
    lForearm.position.y = -0.75; leftArmPivot.add(lForearm);
    const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.07), skinMat);
    lHand.position.set(0, -0.98, 0.02); leftArmPivot.add(lHand);
    for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.06, 3), nailMat);
        finger.position.set((f - 1.5) * 0.02, -1.06, 0.03);
        leftArmPivot.add(finger);
    }
    torsoPivot.add(leftArmPivot);
    pm._leftArm = leftArmPivot;

    pm.add(torsoPivot);
    pm._torso = torsoPivot;

    // ── Right leg ──
    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.11, 0.65, 0);
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.065, 5, 5), hakamaMat));
    const rThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.45, 5), hakamaMat);
    rThigh.position.y = -0.28; rightLegPivot.add(rThigh);
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), hakamaMat).translateY(-0.52));
    const rShin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.42, 5), hakamaMat);
    rShin.position.y = -0.75; rightLegPivot.add(rShin);
    const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.16), shoeMat);
    rShoe.position.set(0, -0.98, 0.03); rightLegPivot.add(rShoe);
    pm.add(rightLegPivot);
    pm._rightLeg = rightLegPivot;

    // ── Left leg ──
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.11, 0.65, 0);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.065, 5, 5), hakamaMat));
    const lThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.45, 5), hakamaMat);
    lThigh.position.y = -0.28; leftLegPivot.add(lThigh);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), hakamaMat).translateY(-0.52));
    const lShin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.42, 5), hakamaMat);
    lShin.position.y = -0.75; leftLegPivot.add(lShin);
    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.16), shoeMat);
    lShoe.position.set(0, -0.98, 0.03); leftLegPivot.add(lShoe);
    pm.add(leftLegPivot);
    pm._leftLeg = leftLegPivot;

    // ── Sash / waist wrap ──
    const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.25, 0.08, 8), sashMat);
    sash.position.y = 0.64; pm.add(sash);

    // ── Cursed energy aura (menacing red glow) ──
    const aura = new THREE.PointLight('#ff2244', 0.6, TILE * 3, 2);
    aura.position.y = 1.2; pm.add(aura);
    pm._auraLight = aura;

    pm._isSukuna = true;

    return pm;
}

// ─── SUKUNA WALK/IDLE ANIMATION ────────────────────────────
export function updateSukunaAnimation(pm, dt, moving, walkCycle) {
    if (!pm._isSukuna) return false;

    const t = walkCycle;

    if (moving) {
        // Aggressive confident stride
        const stride = 0.65;
        const armSwing = 0.4;
        const bodyBob = Math.abs(Math.sin(t * 2)) * 0.05;

        if (pm._rightLeg) pm._rightLeg.rotation.x = Math.sin(t) * stride;
        if (pm._leftLeg) pm._leftLeg.rotation.x = Math.sin(t + Math.PI) * stride;

        // Arms swing with slightly bent posture (menacing)
        if (pm._rightArm) pm._rightArm.rotation.x = Math.sin(t + Math.PI) * armSwing - 0.1;
        if (pm._leftArm) pm._leftArm.rotation.x = Math.sin(t) * armSwing - 0.1;

        if (pm._torso) {
            pm._torso.rotation.x = 0.07; // lean forward — aggressive posture
            pm._torso.rotation.z = Math.sin(t) * 0.04;
        }

        pm.position.y = (0) + bodyBob;

        // Aura flares when moving
        if (pm._auraLight) pm._auraLight.intensity = 0.8 + Math.sin(t * 4) * 0.4;
    } else {
        // Idle — menacing stillness with slow breathing
        const breath = Math.sin(t * 0.5) * 0.02;

        // Arms slightly away from body (confident stance)
        if (pm._rightArm) {
            pm._rightArm.rotation.x = 0.08 + breath;
            pm._rightArm.rotation.z = -0.1;
        }
        if (pm._leftArm) {
            pm._leftArm.rotation.x = 0.08 + breath;
            pm._leftArm.rotation.z = 0.1;
        }

        if (pm._rightLeg) pm._rightLeg.rotation.x = 0;
        if (pm._leftLeg) pm._leftLeg.rotation.x = 0;

        if (pm._torso) {
            pm._torso.rotation.x = breath;
            pm._torso.rotation.z = 0;
        }

        pm.position.y = 0;

        // Slow pulsing aura
        if (pm._auraLight) pm._auraLight.intensity = 0.5 + Math.sin(t * 0.4) * 0.2;
    }

    return true;
}


export function buildTojiModel() {
    const pm = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: '#d4b896', roughness: 0.5 });
    const scarSkinMat = new THREE.MeshStandardMaterial({ color: '#c0a080', roughness: 0.5 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.6 }); // black fitted shirt
    const pantsMat = new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.7 }); // dark cargo pants
    const beltMat = new THREE.MeshStandardMaterial({ color: '#4a3a2a', roughness: 0.5 }); // brown utility belt
    const hairMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.6 }); // black messy hair
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#1a3a1a' }); // dark green eyes
    const pupilMat = new THREE.MeshBasicMaterial({ color: '#000000' });
    const shoeMat = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.8 });
    const scarMat = new THREE.MeshBasicMaterial({ color: '#9a7a6a' }); // lip scar

    // ── Torso pivot ──
    const torsoPivot = new THREE.Group();
    torsoPivot.position.y = 0.65;

    // Upper body — fitted black shirt, muscular build
    const upperBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.9, 8), shirtMat);
    upperBody.position.y = 0.5; torsoPivot.add(upperBody);
    // Broad shoulders — Toji is built
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.26, 0.36), shirtMat);
    shoulders.position.y = 0.88; torsoPivot.add(shoulders);
    // Shirt collar — V-neck showing some chest
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.12, 6), shirtMat);
    collar.position.y = 1.02; torsoPivot.add(collar);
    // Exposed chest at V-neck
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.04), skinMat);
    chest.position.set(0, 0.98, 0.14); torsoPivot.add(chest);

    // ── Neck (thick, muscular) ──
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.14, 6), skinMat);
    neck.position.y = 1.13; torsoPivot.add(neck);

    // ── Head ──
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 10), skinMat);
    head.position.y = 1.38; head.scale.set(1, 1.03, 0.95); torsoPivot.add(head);

    // Strong jaw
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), skinMat);
    chin.position.set(0, 1.22, 0.12); chin.scale.set(1.3, 0.55, 1); torsoPivot.add(chin);

    // ── Scar on lip (right side) ──
    const scar = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.04, 0.01), scarMat);
    scar.position.set(0.05, 1.28, 0.21); torsoPivot.add(scar);

    // ── Eyes — sharp, narrow, green ──
    const eyeGeo = new THREE.SphereGeometry(0.03, 6, 6);
    const pupilGeo = new THREE.SphereGeometry(0.016, 4, 4);
    for (let s = -1; s <= 1; s += 2) {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(s * 0.085, 1.42, 0.2);
        torsoPivot.add(eye);
        const pupil = new THREE.Mesh(pupilGeo, pupilMat);
        pupil.position.set(s * 0.085, 1.42, 0.225);
        torsoPivot.add(pupil);
    }
    // Brow ridge — slightly furrowed, gives a stern look
    for (let s = -1; s <= 1; s += 2) {
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.02), skinMat);
        brow.position.set(s * 0.085, 1.46, 0.19);
        brow.rotation.z = s * -0.15; // angled inward — stern
        torsoPivot.add(brow);
    }

    // ── Nose ──
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.065, 4), skinMat);
    nose.position.set(0, 1.37, 0.22);
    nose.rotation.x = Math.PI * 0.6;
    torsoPivot.add(nose);

    // ── Mouth — slight smirk ──
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.01),
        new THREE.MeshBasicMaterial({ color: '#aa7766' }));
    mouth.position.set(0, 1.28, 0.2); torsoPivot.add(mouth);

    // ── Ears ──
    for (let s = -1; s <= 1; s += 2) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 5), skinMat);
        ear.position.set(s * 0.21, 1.4, 0);
        ear.scale.set(0.6, 1, 0.6);
        torsoPivot.add(ear);
    }

    // ── Hair — black, messy, medium length with bangs falling over forehead ──
    const hairBase = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), hairMat);
    hairBase.position.y = 1.48; hairBase.scale.set(1.05, 0.85, 1.05);
    torsoPivot.add(hairBase);
    // Messy spikes — less neat than Sukuna, more wild
    const hairSpikes = [
        // Top tufts
        { x: 0, y: 1.62, z: 0, rx: -0.1, rz: 0, h: 0.14 },
        { x: 0.08, y: 1.6, z: 0.02, rx: -0.15, rz: 0.25, h: 0.13 },
        { x: -0.08, y: 1.6, z: 0.02, rx: -0.15, rz: -0.25, h: 0.13 },
        { x: 0.14, y: 1.56, z: -0.02, rx: 0.1, rz: 0.5, h: 0.11 },
        { x: -0.14, y: 1.56, z: -0.02, rx: 0.1, rz: -0.5, h: 0.11 },
        // Back hair
        { x: 0, y: 1.55, z: -0.14, rx: 0.5, rz: 0, h: 0.14 },
        { x: 0.08, y: 1.53, z: -0.12, rx: 0.4, rz: 0.2, h: 0.12 },
        { x: -0.08, y: 1.53, z: -0.12, rx: 0.4, rz: -0.2, h: 0.12 },
        // Front bangs falling over forehead
        { x: 0.04, y: 1.55, z: 0.14, rx: -0.7, rz: 0.1, h: 0.14 },
        { x: -0.03, y: 1.56, z: 0.13, rx: -0.6, rz: -0.15, h: 0.13 },
        { x: 0.1, y: 1.53, z: 0.11, rx: -0.5, rz: 0.3, h: 0.11 },
        { x: -0.1, y: 1.54, z: 0.1, rx: -0.5, rz: -0.25, h: 0.1 },
    ];
    for (const sp of hairSpikes) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, sp.h, 4), hairMat);
        spike.position.set(sp.x, sp.y, sp.z);
        spike.rotation.set(sp.rx, 0, sp.rz);
        torsoPivot.add(spike);
    }

    // ── Right arm (muscular, bare below short sleeve) ──
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.44, 0.85, 0);
    // Shoulder
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), shirtMat));
    // Upper arm — shirt sleeve
    const rUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.25, 5), shirtMat);
    rUpperArm.position.y = -0.18; rightArmPivot.add(rUpperArm);
    // Lower upper arm — bare skin
    const rLowerUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.2, 5), skinMat);
    rLowerUpper.position.y = -0.38; rightArmPivot.add(rLowerUpper);
    // Elbow
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), skinMat).translateY(-0.5));
    // Forearm — bare, muscular
    const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.4, 5), skinMat);
    rForearm.position.y = -0.73; rightArmPivot.add(rForearm);
    // Hand
    const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.07), skinMat);
    rHand.position.set(0, -0.96, 0.02); rightArmPivot.add(rHand);
    // Fingers
    for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, 0.05, 3), skinMat);
        finger.position.set((f - 1.5) * 0.02, -1.02, 0.03);
        rightArmPivot.add(finger);
    }
    // ── Inverted Spear of Heaven (held in right hand) ──
    const spearGroup = new THREE.Group();
    spearGroup.position.set(0, -1.0, 0.04);
    spearGroup.rotation.x = Math.PI / 2; // spear points forward from hand
    // Shaft — long dark wooden pole
    const shaftMat = new THREE.MeshStandardMaterial({ color: '#3a2a1a', roughness: 0.7 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.4, 5), shaftMat);
    spearGroup.add(shaft);
    // Shaft wrap near grip
    const gripWrapMat = new THREE.MeshStandardMaterial({ color: '#5a4a3a', roughness: 0.5 });
    for (let w = 0; w < 4; w++) {
        const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.012, 5), gripWrapMat);
        wrap.position.y = -0.15 + w * 0.06;
        spearGroup.add(wrap);
    }
    // Spear head — dark metallic blade, wider at base tapering to point
    const spearHeadMat = new THREE.MeshStandardMaterial({ color: '#2a2a3a', metalness: 0.85, roughness: 0.15 });
    const spearHead = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 4), spearHeadMat);
    spearHead.position.y = 0.81;
    spearGroup.add(spearHead);
    // Spear head base collar
    const collarMat = new THREE.MeshStandardMaterial({ color: '#555555', metalness: 0.6, roughness: 0.3 });
    const spearCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.04, 6), collarMat);
    spearCollar.position.y = 0.69;
    spearGroup.add(spearCollar);
    // Butt cap
    const buttCap = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 5), collarMat);
    buttCap.position.y = -0.71;
    spearGroup.add(buttCap);
    // ── Inventory Curse (purple worm coiled around shaft) ──
    const wormMat = new THREE.MeshStandardMaterial({ color: '#5a2d82', roughness: 0.4, metalness: 0.1 });
    const wormBellyMat = new THREE.MeshStandardMaterial({ color: '#7a4da2', roughness: 0.5 });
    // Body segments spiraling around shaft
    const wormSegs = 12;
    for (let i = 0; i < wormSegs; i++) {
        const t = i / wormSegs;
        const angle = t * Math.PI * 3; // 1.5 full wraps
        const radius = 0.035;
        const segSize = 0.02 + Math.sin(t * Math.PI) * 0.008; // thicker in middle
        const seg = new THREE.Mesh(new THREE.SphereGeometry(segSize, 5, 5), wormMat);
        seg.position.set(
            Math.cos(angle) * radius,
            -0.3 + t * 0.9, // climb from lower shaft to near spear head
            Math.sin(angle) * radius
        );
        seg.scale.set(1, 1.3, 1); // slightly elongated
        spearGroup.add(seg);
    }
    // Worm head — near the spear blade, peeking out
    const wormHead = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), wormMat);
    wormHead.position.set(0.03, 0.62, 0.02);
    wormHead.scale.set(1.2, 1, 1);
    spearGroup.add(wormHead);
    // Worm eyes — tiny glowing dots
    const wormEyeMat = new THREE.MeshBasicMaterial({ color: '#ff44ff' });
    for (let s = -1; s <= 1; s += 2) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.006, 4, 4), wormEyeMat);
        eye.position.set(0.03 + s * 0.012, 0.63, 0.04);
        spearGroup.add(eye);
    }
    // Worm mouth — small dark slit
    const wormMouth = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.005, 0.005),
        new THREE.MeshBasicMaterial({ color: '#1a0a2a' }));
    wormMouth.position.set(0.03, 0.615, 0.045);
    spearGroup.add(wormMouth);
    // Tail tip — near the butt end, thinner
    const tailSegs = 4;
    for (let i = 0; i < tailSegs; i++) {
        const t = i / tailSegs;
        const angle = Math.PI * 3 + t * Math.PI * 0.8;
        const segSize = 0.015 - t * 0.003;
        const tail = new THREE.Mesh(new THREE.SphereGeometry(segSize, 4, 4), wormBellyMat);
        tail.position.set(
            Math.cos(angle) * 0.03,
            -0.35 - t * 0.2,
            Math.sin(angle) * 0.03
        );
        spearGroup.add(tail);
    }
    rightArmPivot.add(spearGroup);
    torsoPivot.add(rightArmPivot);
    pm._rightArm = rightArmPivot;

    // ── Left arm (mirrored) ──
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.44, 0.85, 0);
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), shirtMat));
    const lUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.25, 5), shirtMat);
    lUpperArm.position.y = -0.18; leftArmPivot.add(lUpperArm);
    const lLowerUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.2, 5), skinMat);
    lLowerUpper.position.y = -0.38; leftArmPivot.add(lLowerUpper);
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), skinMat).translateY(-0.5));
    const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.4, 5), skinMat);
    lForearm.position.y = -0.73; leftArmPivot.add(lForearm);
    const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.07), skinMat);
    lHand.position.set(0, -0.96, 0.02); leftArmPivot.add(lHand);
    for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, 0.05, 3), skinMat);
        finger.position.set((f - 1.5) * 0.02, -1.02, 0.03);
        leftArmPivot.add(finger);
    }
    torsoPivot.add(leftArmPivot);
    pm._leftArm = leftArmPivot;

    pm.add(torsoPivot);
    pm._torso = torsoPivot;

    // ── Right leg ──
    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.11, 0.65, 0);
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.065, 5, 5), pantsMat));
    const rThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.45, 5), pantsMat);
    rThigh.position.y = -0.28; rightLegPivot.add(rThigh);
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), pantsMat).translateY(-0.52));
    const rShin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.42, 5), pantsMat);
    rShin.position.y = -0.75; rightLegPivot.add(rShin);
    const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.17), shoeMat);
    rShoe.position.set(0, -0.98, 0.03); rightLegPivot.add(rShoe);
    pm.add(rightLegPivot);
    pm._rightLeg = rightLegPivot;

    // ── Left leg ──
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.11, 0.65, 0);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.065, 5, 5), pantsMat));
    const lThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.45, 5), pantsMat);
    lThigh.position.y = -0.28; leftLegPivot.add(lThigh);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), pantsMat).translateY(-0.52));
    const lShin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.42, 5), pantsMat);
    lShin.position.y = -0.75; leftLegPivot.add(lShin);
    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.17), shoeMat);
    lShoe.position.set(0, -0.98, 0.03); leftLegPivot.add(lShoe);
    pm.add(leftLegPivot);
    pm._leftLeg = leftLegPivot;

    // ── Utility belt ──
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.25, 0.07, 8), beltMat);
    belt.position.y = 0.63; pm.add(belt);
    // Belt pouches
    for (let s = -1; s <= 1; s += 2) {
        const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04),
            new THREE.MeshStandardMaterial({ color: '#3a2a1a', roughness: 0.6 }));
        pouch.position.set(s * 0.22, 0.6, 0.1);
        pm.add(pouch);
    }

    // No cursed energy aura — Toji has zero CE (Heavenly Restriction)
    // Instead, a very faint green tint from physical power
    pm._isToji = true;

    return pm;
}

// ─── TOJI WALK/IDLE ANIMATION ──────────────────────────────
export function updateTojiAnimation(pm, dt, moving, walkCycle) {
    if (!pm._isToji) return false;

    const t = walkCycle;

    if (moving) {
        // Fast, light-footed assassin run — longer stride, lower bounce
        const stride = 0.75;
        const armSwing = 0.55;
        const bodyBob = Math.abs(Math.sin(t * 2)) * 0.04; // less bounce — efficient runner

        // Legs — fast, wide stride
        if (pm._rightLeg) pm._rightLeg.rotation.x = Math.sin(t) * stride;
        if (pm._leftLeg) pm._leftLeg.rotation.x = Math.sin(t + Math.PI) * stride;

        // Arms — one pumps, the other trails back slightly (assassin run)
        if (pm._rightArm) {
            pm._rightArm.rotation.x = Math.sin(t + Math.PI) * armSwing;
            pm._rightArm.rotation.z = 0;
        }
        if (pm._leftArm) {
            pm._leftArm.rotation.x = Math.sin(t) * armSwing * 0.7; // left arm swings less
            pm._leftArm.rotation.z = 0.05;
        }

        // Torso — lean forward more (sprinting posture)
        if (pm._torso) {
            pm._torso.rotation.x = 0.1;
            pm._torso.rotation.z = Math.sin(t) * 0.03;
        }

        pm.position.y = (0) + bodyBob;
    } else {
        // Idle — relaxed but alert, weight on one leg
        const breath = Math.sin(t * 0.5) * 0.015;

        // Right arm relaxed at side
        if (pm._rightArm) {
            pm._rightArm.rotation.x = 0.03 + breath;
            pm._rightArm.rotation.z = -0.05;
        }
        // Left arm — hand in pocket / resting on belt
        if (pm._leftArm) {
            pm._leftArm.rotation.x = 0.15;
            pm._leftArm.rotation.z = 0.12;
        }

        // Legs — slight asymmetric stance
        if (pm._rightLeg) pm._rightLeg.rotation.x = 0;
        if (pm._leftLeg) pm._leftLeg.rotation.x = 0.05; // one leg slightly forward

        if (pm._torso) {
            pm._torso.rotation.x = breath;
            pm._torso.rotation.z = 0.02; // slight lean
        }

        pm.position.y = 0;
    }

    return true;
}

// ─── BROOK 3D MODEL ────────────────────────────────────────

export function buildBrookModel() {
    const pm = new THREE.Group();
    const boneMat = new THREE.MeshStandardMaterial({ color: '#f5f0e0', roughness: 0.4, metalness: 0.1 });
    const darkBoneMat = new THREE.MeshStandardMaterial({ color: '#d8d0b8', roughness: 0.5 });
    const suitMat = new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.6 }); // black suit
    const shirtMat = new THREE.MeshStandardMaterial({ color: '#e8e0d0', roughness: 0.5 }); // white shirt underneath
    const tieMat = new THREE.MeshStandardMaterial({ color: '#cc8800', roughness: 0.5 }); // orange/yellow cravat
    const pantsMat = new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.7 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.8 });
    const afroMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9 }); // big black afro
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#000000' }); // hollow eye sockets

    // ── Torso pivot ──
    const torsoPivot = new THREE.Group();
    torsoPivot.position.y = 0.65;

    // Upper body — suit jacket (Brook is very tall and thin)
    const upperBody = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 1.0, 6), suitMat);
    upperBody.position.y = 0.55; torsoPivot.add(upperBody);
    // Shoulders — narrow, bony
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.25), suitMat);
    shoulders.position.y = 0.95; torsoPivot.add(shoulders);
    // White shirt V at chest
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.04), shirtMat);
    shirt.position.set(0, 0.85, 0.12); torsoPivot.add(shirt);
    // Cravat / bow tie — orange-yellow
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.03), tieMat);
    tie.position.set(0, 0.93, 0.13); torsoPivot.add(tie);
    // Suit jacket lapels
    for (let s = -1; s <= 1; s += 2) {
        const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.03), suitMat);
        lapel.position.set(s * 0.07, 0.85, 0.13);
        lapel.rotation.z = s * 0.15;
        torsoPivot.add(lapel);
    }

    // ── Neck — thin bony ──
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.18, 5), boneMat);
    neck.position.y = 1.15; torsoPivot.add(neck);

    // ── Skull head ──
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), boneMat);
    skull.position.y = 1.42; skull.scale.set(1, 1.1, 0.95); torsoPivot.add(skull);
    // Jaw — separate lower jaw bone
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), darkBoneMat);
    jaw.position.set(0, 1.28, 0.08); jaw.scale.set(1.2, 0.5, 0.9); torsoPivot.add(jaw);
    // Teeth — upper row
    for (let t = 0; t < 5; t++) {
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.015), boneMat);
        tooth.position.set((t - 2) * 0.025, 1.31, 0.16);
        torsoPivot.add(tooth);
    }
    // Teeth — lower row
    for (let t = 0; t < 5; t++) {
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.015), darkBoneMat);
        tooth.position.set((t - 2) * 0.025, 1.27, 0.15);
        torsoPivot.add(tooth);
    }

    // ── Eye sockets — hollow dark holes ──
    for (let s = -1; s <= 1; s += 2) {
        const socket = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
        socket.position.set(s * 0.07, 1.46, 0.16);
        torsoPivot.add(socket);
        // Tiny soul light inside each eye
        const soulLight = new THREE.Mesh(new THREE.SphereGeometry(0.012, 4, 4),
            new THREE.MeshBasicMaterial({ color: '#88ccff' }));
        soulLight.position.set(s * 0.07, 1.46, 0.17);
        torsoPivot.add(soulLight);
    }
    // Nose hole — just a dark triangle indent
    const noseHole = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.03, 3),
        new THREE.MeshBasicMaterial({ color: '#1a1a1a' }));
    noseHole.position.set(0, 1.39, 0.19);
    noseHole.rotation.x = Math.PI;
    torsoPivot.add(noseHole);

    // ── AFRO — big round black afro ──
    const afro = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), afroMat);
    afro.position.y = 1.55; afro.scale.set(1.1, 1.0, 1.05);
    torsoPivot.add(afro);

    // ── Right arm (bony, suit sleeve) ──
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.34, 0.9, 0);
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), suitMat));
    // Upper arm — suit sleeve
    const rUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.45, 4), suitMat);
    rUpperArm.position.y = -0.28; rightArmPivot.add(rUpperArm);
    // Elbow joint — bone
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 4, 4), boneMat).translateY(-0.52));
    // Forearm — bone (no flesh, he's a skeleton)
    const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.4, 4), boneMat);
    rForearm.position.y = -0.73; rightArmPivot.add(rForearm);
    // Hand — bony
    const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.05), boneMat);
    rHand.position.set(0, -0.96, 0.02); rightArmPivot.add(rHand);
    // Bony fingers
    for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.005, 0.05, 3), boneMat);
        finger.position.set((f - 1.5) * 0.015, -1.01, 0.03);
        rightArmPivot.add(finger);
    }
    // ── Soul Solid sword (held in right hand) ──
    const caneGroup = new THREE.Group();
    caneGroup.position.set(0, -1.0, 0.04);
    caneGroup.rotation.x = Math.PI / 2; // blade points forward
    // Hilt — wrapped dark grip
    const hiltMat = new THREE.MeshStandardMaterial({ color: '#1a0a2a', roughness: 0.5 });
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.18, 5), hiltMat);
    caneGroup.add(hilt);
    // Hilt wrap bands
    const wrapMat = new THREE.MeshStandardMaterial({ color: '#2a1a3a', roughness: 0.4 });
    for (let w = 0; w < 4; w++) {
        const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.012, 5), wrapMat);
        wrap.position.y = -0.06 + w * 0.04;
        caneGroup.add(wrap);
    }
    // Guard (tsuba) — ornate gold oval
    const handleMat = new THREE.MeshStandardMaterial({ color: '#d4af37', metalness: 0.7, roughness: 0.2 });
    const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 8), handleMat);
    guard.position.y = 0.1;
    caneGroup.add(guard);
    // Blade — long, thin, flat like a rapier/katana
    const bladeMat = new THREE.MeshStandardMaterial({ color: '#c0c8d8', metalness: 0.9, roughness: 0.1 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.7, 0.005), bladeMat);
    blade.position.y = 0.46;
    caneGroup.add(blade);
    // Icy blue edge glow (Soul Solid freezing power)
    const edgeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.7, 0.009),
        new THREE.MeshBasicMaterial({ color: '#88ccff', transparent: true, opacity: 0.5 }));
    edgeGlow.position.set(0.014, 0.46, 0);
    caneGroup.add(edgeGlow);
    // Blade tip — pointed
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.08, 4), bladeMat);
    tip.position.y = 0.85;
    caneGroup.add(tip);
    // Pommel — gold ball at bottom
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.02, 5, 5), handleMat);
    pommel.position.y = -0.1;
    caneGroup.add(pommel);
    rightArmPivot.add(caneGroup);
    torsoPivot.add(rightArmPivot);
    pm._rightArm = rightArmPivot;

    // ── Left arm (mirrored) ──
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.34, 0.9, 0);
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), suitMat));
    const lUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.45, 4), suitMat);
    lUpperArm.position.y = -0.28; leftArmPivot.add(lUpperArm);
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 4, 4), boneMat).translateY(-0.52));
    const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.4, 4), boneMat);
    lForearm.position.y = -0.73; leftArmPivot.add(lForearm);
    const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.05), boneMat);
    lHand.position.set(0, -0.96, 0.02); leftArmPivot.add(lHand);
    for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.005, 0.05, 3), boneMat);
        finger.position.set((f - 1.5) * 0.015, -1.01, 0.03);
        leftArmPivot.add(finger);
    }
    torsoPivot.add(leftArmPivot);
    pm._leftArm = leftArmPivot;

    pm.add(torsoPivot);
    pm._torso = torsoPivot;

    // ── Right leg (thin bone legs in suit pants) ──
    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.08, 0.65, 0);
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), pantsMat));
    const rThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.5, 4), pantsMat);
    rThigh.position.y = -0.3; rightLegPivot.add(rThigh);
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), pantsMat).translateY(-0.56));
    const rShin = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.46, 4), pantsMat);
    rShin.position.y = -0.8; rightLegPivot.add(rShin);
    // Pointy dress shoes
    const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.16), shoeMat);
    rShoe.position.set(0, -1.05, 0.04); rightLegPivot.add(rShoe);
    // Shoe tip
    const rShoeTip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 4), shoeMat);
    rShoeTip.position.set(0, -1.05, 0.14); rShoeTip.rotation.x = Math.PI / 2;
    rightLegPivot.add(rShoeTip);
    pm.add(rightLegPivot);
    pm._rightLeg = rightLegPivot;

    // ── Left leg ──
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.08, 0.65, 0);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), pantsMat));
    const lThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.5, 4), pantsMat);
    lThigh.position.y = -0.3; leftLegPivot.add(lThigh);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), pantsMat).translateY(-0.56));
    const lShin = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.46, 4), pantsMat);
    lShin.position.y = -0.8; leftLegPivot.add(lShin);
    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.16), shoeMat);
    lShoe.position.set(0, -1.05, 0.04); leftLegPivot.add(lShoe);
    const lShoeTip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 4), shoeMat);
    lShoeTip.position.set(0, -1.05, 0.14); lShoeTip.rotation.x = Math.PI / 2;
    leftLegPivot.add(lShoeTip);
    pm.add(leftLegPivot);
    pm._leftLeg = leftLegPivot;

    // ── Soul aura — faint icy blue glow ──
    const aura = new THREE.PointLight('#88ccff', 0.5, TILE * 3, 2);
    aura.position.y = 1.2; pm.add(aura);
    pm._auraLight = aura;

    pm._isBrook = true;
    return pm;
}

// ─── BROOK WALK/IDLE ANIMATION ─────────────────────────────
export function updateBrookAnimation(pm, dt, moving, walkCycle) {
    if (!pm._isBrook) return false;

    const t = walkCycle;

    if (moving) {
        // Lanky, bouncy, jaunty skeleton run — long strides, lots of bounce
        const stride = 0.7;
        const armSwing = 0.6;
        const bodyBob = Math.abs(Math.sin(t * 2)) * 0.1; // exaggerated bounce

        if (pm._rightLeg) pm._rightLeg.rotation.x = Math.sin(t) * stride;
        if (pm._leftLeg) pm._leftLeg.rotation.x = Math.sin(t + Math.PI) * stride;

        // Arms swing wide — floppy skeleton energy
        if (pm._rightArm) {
            pm._rightArm.rotation.x = Math.sin(t + Math.PI) * armSwing;
            pm._rightArm.rotation.z = Math.sin(t * 2) * 0.1; // slight flail
        }
        if (pm._leftArm) {
            pm._leftArm.rotation.x = Math.sin(t) * armSwing;
            pm._leftArm.rotation.z = Math.sin(t * 2 + 1) * -0.1;
        }

        // Torso — slight forward lean + exaggerated side sway
        if (pm._torso) {
            pm._torso.rotation.x = 0.06;
            pm._torso.rotation.z = Math.sin(t) * 0.06; // more sway than others
        }

        pm.position.y = (0) + bodyBob;

        if (pm._auraLight) pm._auraLight.intensity = 0.5 + Math.sin(t * 3) * 0.2;
    } else {
        // Idle — gentleman skeleton pose, slight head tilt, body sway
        const breath = Math.sin(t * 0.4) * 0.02;
        const sway = Math.sin(t * 0.25) * 0.025;

        // Right arm relaxed, left arm slightly out (gentleman stance)
        if (pm._rightArm) {
            pm._rightArm.rotation.x = 0.05 + breath;
            pm._rightArm.rotation.z = -0.08;
        }
        if (pm._leftArm) {
            pm._leftArm.rotation.x = 0.1 + breath;
            pm._leftArm.rotation.z = 0.15; // hand slightly out
        }

        if (pm._rightLeg) pm._rightLeg.rotation.x = 0;
        if (pm._leftLeg) pm._leftLeg.rotation.x = 0;

        if (pm._torso) {
            pm._torso.rotation.x = breath;
            pm._torso.rotation.z = sway; // gentle sway side to side
        }

        pm.position.y = 0;

        if (pm._auraLight) pm._auraLight.intensity = 0.4 + Math.sin(t * 0.3) * 0.15;
    }

    return true;
}

// ─── DENJI 3D MODEL ───────────────────────────────────────

export function buildDenjiModel() {
    const pm = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: '#f0d5b8', roughness: 0.5 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: '#e8e0d0', roughness: 0.6 }); // white school shirt
    const tieMat = new THREE.MeshStandardMaterial({ color: '#cc2200', roughness: 0.5 }); // red tie
    const pantsMat = new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.7 }); // dark pants
    const hairMat = new THREE.MeshStandardMaterial({ color: '#cc8833', roughness: 0.6 }); // messy blonde-orange
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#886622' }); // brown/amber eyes
    const pupilMat = new THREE.MeshBasicMaterial({ color: '#000000' });
    const shoeMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.8 });
    const cordMat = new THREE.MeshStandardMaterial({ color: '#cc4400', roughness: 0.4 }); // chainsaw cord (ripcord on chest)

    // ── Torso pivot ──
    const torsoPivot = new THREE.Group();
    torsoPivot.position.y = 0.65;

    // Upper body — white school shirt, slim build
    const upperBody = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.85, 8), shirtMat);
    upperBody.position.y = 0.5; torsoPivot.add(upperBody);
    // Shoulders
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.2, 0.3), shirtMat);
    shoulders.position.y = 0.85; torsoPivot.add(shoulders);
    // Shirt collar
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.1, 6), shirtMat);
    collar.position.y = 1.0; torsoPivot.add(collar);

    // Red tie
    const tieTop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), tieMat);
    tieTop.position.set(0, 0.96, 0.13); torsoPivot.add(tieTop);
    const tieBody = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 0.015), tieMat);
    tieBody.position.set(0, 0.78, 0.14); torsoPivot.add(tieBody);
    // Tie point at bottom
    const tiePoint = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 3), tieMat);
    tiePoint.position.set(0, 0.63, 0.14); tiePoint.rotation.x = Math.PI;
    torsoPivot.add(tiePoint);

    // Chainsaw ripcord handle on chest (Pochita's cord)
    const cordHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.08, 4), cordMat);
    cordHandle.position.set(0.08, 0.8, 0.15); cordHandle.rotation.z = Math.PI / 4;
    torsoPivot.add(cordHandle);
    const cordKnob = new THREE.Mesh(new THREE.SphereGeometry(0.02, 5, 5), cordMat);
    cordKnob.position.set(0.12, 0.84, 0.16); torsoPivot.add(cordKnob);

    // ── Neck ──
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.12, 6), skinMat);
    neck.position.y = 1.1; torsoPivot.add(neck);

    // ── Head ──
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), skinMat);
    head.position.y = 1.35; head.scale.set(1, 1.02, 0.95); torsoPivot.add(head);

    // Jaw
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), skinMat);
    chin.position.set(0, 1.2, 0.11); chin.scale.set(1.2, 0.55, 1); torsoPivot.add(chin);

    // ── Eyes — slightly tired/lazy look ──
    const eyeGeo = new THREE.SphereGeometry(0.03, 6, 6);
    const pupilGeo = new THREE.SphereGeometry(0.016, 4, 4);
    for (let s = -1; s <= 1; s += 2) {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(s * 0.08, 1.39, 0.19);
        torsoPivot.add(eye);
        const pupil = new THREE.Mesh(pupilGeo, pupilMat);
        pupil.position.set(s * 0.08, 1.39, 0.215);
        torsoPivot.add(pupil);
    }
    // Relaxed brows — not angry, slightly flat
    for (let s = -1; s <= 1; s += 2) {
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.02), skinMat);
        brow.position.set(s * 0.08, 1.44, 0.18);
        brow.rotation.z = s * -0.05;
        torsoPivot.add(brow);
    }

    // ── Nose ──
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 4), skinMat);
    nose.position.set(0, 1.34, 0.21); nose.rotation.x = Math.PI * 0.6;
    torsoPivot.add(nose);

    // ── Mouth — slight goofy grin ──
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.01),
        new THREE.MeshBasicMaterial({ color: '#aa6644' }));
    mouth.position.set(0, 1.26, 0.19); torsoPivot.add(mouth);
    // Slight upturn on both sides (grin)
    for (let s = -1; s <= 1; s += 2) {
        const corner = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.008, 0.01),
            new THREE.MeshBasicMaterial({ color: '#aa6644' }));
        corner.position.set(s * 0.035, 1.265, 0.19);
        corner.rotation.z = s * 0.3;
        torsoPivot.add(corner);
    }

    // ── Ears ──
    for (let s = -1; s <= 1; s += 2) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 5), skinMat);
        ear.position.set(s * 0.2, 1.37, 0);
        ear.scale.set(0.6, 1, 0.6);
        torsoPivot.add(ear);
    }

    // ── Hair — messy blonde-orange, spiky and unkempt ──
    const hairBase = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), hairMat);
    hairBase.position.y = 1.46; hairBase.scale.set(1.08, 0.88, 1.05);
    torsoPivot.add(hairBase);
    const hairSpikes = [
        // Messy top tufts going every direction
        { x: 0, y: 1.63, z: 0.02, rx: -0.2, rz: 0, h: 0.16 },
        { x: 0.08, y: 1.61, z: 0.04, rx: -0.3, rz: 0.35, h: 0.15 },
        { x: -0.07, y: 1.62, z: 0.03, rx: -0.25, rz: -0.3, h: 0.14 },
        { x: 0.05, y: 1.62, z: -0.03, rx: 0.1, rz: 0.2, h: 0.13 },
        { x: -0.05, y: 1.61, z: -0.04, rx: 0.15, rz: -0.25, h: 0.12 },
        // Side tufts sticking out
        { x: 0.15, y: 1.55, z: 0, rx: 0, rz: 0.6, h: 0.12 },
        { x: -0.15, y: 1.56, z: 0.01, rx: 0, rz: -0.55, h: 0.11 },
        { x: 0.12, y: 1.58, z: 0.06, rx: -0.2, rz: 0.45, h: 0.11 },
        { x: -0.11, y: 1.57, z: 0.05, rx: -0.15, rz: -0.4, h: 0.1 },
        // Bangs falling messily over forehead
        { x: 0.03, y: 1.56, z: 0.14, rx: -0.7, rz: 0.1, h: 0.13 },
        { x: -0.04, y: 1.57, z: 0.13, rx: -0.6, rz: -0.15, h: 0.12 },
        { x: 0.09, y: 1.54, z: 0.12, rx: -0.5, rz: 0.25, h: 0.1 },
        // Back
        { x: 0, y: 1.53, z: -0.13, rx: 0.5, rz: 0, h: 0.12 },
        { x: 0.07, y: 1.52, z: -0.11, rx: 0.4, rz: 0.2, h: 0.1 },
        { x: -0.07, y: 1.52, z: -0.1, rx: 0.4, rz: -0.2, h: 0.1 },
    ];
    for (const sp of hairSpikes) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.035, sp.h, 4), hairMat);
        spike.position.set(sp.x, sp.y, sp.z);
        spike.rotation.set(sp.rx, 0, sp.rz);
        torsoPivot.add(spike);
    }

    // Chainsaw materials
    const chainsawMat = new THREE.MeshStandardMaterial({ color: '#555555', metalness: 0.7, roughness: 0.3 });
    const chainsawDarkMat = new THREE.MeshStandardMaterial({ color: '#333333', metalness: 0.6, roughness: 0.4 });
    const bladeMat = new THREE.MeshStandardMaterial({ color: '#888888', metalness: 0.8, roughness: 0.2 });
    const toothMat = new THREE.MeshStandardMaterial({ color: '#aaaaaa', metalness: 0.9, roughness: 0.15 });

    function buildChainsawArm(side) {
        const armPivot = new THREE.Group();
        armPivot.position.set(side * 0.36, 0.85, 0);
        // Shoulder
        armPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), shirtMat));
        // Upper arm — shirt sleeve
        const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.35, 5), shirtMat);
        upperArm.position.y = -0.22; armPivot.add(upperArm);
        // Elbow joint — where flesh meets chainsaw
        const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 5), skinMat);
        elbow.position.y = -0.42; armPivot.add(elbow);
        // Chainsaw body — replaces forearm
        const sawBody = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 6), chainsawMat);
        sawBody.position.y = -0.63; armPivot.add(sawBody);
        // Chainsaw housing rings
        for (let r = 0; r < 3; r++) {
            const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.053, 0.053, 0.012, 6), chainsawDarkMat);
            ring.position.y = -0.5 - r * 0.12; armPivot.add(ring);
        }
        // Chainsaw blade — flat extending forward from the end
        const sawBlade = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.5, 0.006), bladeMat);
        sawBlade.position.set(0, -0.85, 0.04);
        sawBlade.rotation.x = Math.PI / 2; // blade points forward
        armPivot.add(sawBlade);
        // Teeth along both edges of the blade
        for (let t = 0; t < 6; t++) {
            for (let edgeSide = -1; edgeSide <= 1; edgeSide += 2) {
                const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.02, 3), toothMat);
                tooth.position.set(edgeSide * 0.014, -0.85, 0.04 + (t / 5 - 0.5) * 0.45);
                tooth.rotation.z = edgeSide * Math.PI / 2;
                armPivot.add(tooth);
            }
        }
        // Blade tip
        const sawTip = new THREE.Mesh(new THREE.SphereGeometry(0.015, 5, 5), bladeMat);
        sawTip.position.set(0, -0.85, 0.29); armPivot.add(sawTip);
        // Orange glow at chainsaw core
        const sawGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 4),
            new THREE.MeshBasicMaterial({ color: '#ff6600', transparent: true, opacity: 0.4 }));
        sawGlow.position.y = -0.75; armPivot.add(sawGlow);
        return armPivot;
    }

    const rightArmPivot = buildChainsawArm(1);
    torsoPivot.add(rightArmPivot);
    pm._rightArm = rightArmPivot;

    const leftArmPivot = buildChainsawArm(-1);
    torsoPivot.add(leftArmPivot);
    pm._leftArm = leftArmPivot;

    pm.add(torsoPivot);
    pm._torso = torsoPivot;

    // ── Right leg ──
    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.1, 0.65, 0);
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), pantsMat));
    const rThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.45, 5), pantsMat);
    rThigh.position.y = -0.28; rightLegPivot.add(rThigh);
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), pantsMat).translateY(-0.52));
    const rShin = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.42, 5), pantsMat);
    rShin.position.y = -0.75; rightLegPivot.add(rShin);
    const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.15), shoeMat);
    rShoe.position.set(0, -0.98, 0.03); rightLegPivot.add(rShoe);
    pm.add(rightLegPivot);
    pm._rightLeg = rightLegPivot;

    // ── Left leg ──
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.1, 0.65, 0);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), pantsMat));
    const lThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.45, 5), pantsMat);
    lThigh.position.y = -0.28; leftLegPivot.add(lThigh);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), pantsMat).translateY(-0.52));
    const lShin = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.42, 5), pantsMat);
    lShin.position.y = -0.75; leftLegPivot.add(lShin);
    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.15), shoeMat);
    lShoe.position.set(0, -0.98, 0.03); leftLegPivot.add(lShoe);
    pm.add(leftLegPivot);
    pm._leftLeg = leftLegPivot;

    // Belt
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.05, 8),
        new THREE.MeshStandardMaterial({ color: '#333333', roughness: 0.5 }));
    belt.position.y = 0.62; pm.add(belt);

    // Faint orange chainsaw devil aura
    const aura = new THREE.PointLight('#cc4400', 0.4, TILE * 3, 2);
    aura.position.y = 1.0; pm.add(aura);
    pm._auraLight = aura;

    pm._isDenji = true;
    return pm;
}

// ─── DENJI WALK/IDLE ANIMATION ─────────────────────────────
export function updateDenjiAnimation(pm, dt, moving, walkCycle) {
    if (!pm._isDenji) return false;

    const t = walkCycle;

    if (moving) {
        // Blazing fast sprint — wide stride, arms pumping hard
        const stride = 0.85;
        const armSwing = 0.6;
        const bodyBob = Math.abs(Math.sin(t * 2)) * 0.05;

        if (pm._rightLeg) pm._rightLeg.rotation.x = Math.sin(t) * stride;
        if (pm._leftLeg) pm._leftLeg.rotation.x = Math.sin(t + Math.PI) * stride;

        // Arms pump hard — chainsaws swinging
        if (pm._rightArm) {
            pm._rightArm.rotation.x = Math.sin(t + Math.PI) * armSwing;
            pm._rightArm.rotation.z = Math.sin(t * 2) * 0.1;
        }
        if (pm._leftArm) {
            pm._leftArm.rotation.x = Math.sin(t) * armSwing;
            pm._leftArm.rotation.z = Math.sin(t * 2 + 0.5) * -0.1;
        }

        // Hard forward lean — sprinting posture
        if (pm._torso) {
            pm._torso.rotation.x = 0.15;
            pm._torso.rotation.z = Math.sin(t) * 0.04;
        }

        pm.position.y = (0) + bodyBob;

        if (pm._auraLight) pm._auraLight.intensity = 2.0 + Math.sin(t * 4) * 0.8;

        // Fiery aura trail — flame particles behind when running
        const wx = pm.position.x, wz = pm.position.z;
        if (Math.random() < 0.5) {
            emitParticles(wx, 0.5, wz, {
                color: ['#ff4400', '#ff6600', '#ff8800', '#ffaa00', '#ff2200'],
                count: 2, speed: 2, spread: 0.4,
                gravity: -1.5, life: 8, size: 0.12, sizeEnd: 0, drag: 0.97, upward: 2.5
            });
        }
    } else {
        // Idle — relaxed slouch, hands at sides, breathing
        const breath = Math.sin(t * 0.5) * 0.02;
        const sway = Math.sin(t * 0.3) * 0.015;

        if (pm._rightArm) {
            pm._rightArm.rotation.x = 0.06 + breath;
            pm._rightArm.rotation.z = -0.05;
        }
        if (pm._leftArm) {
            pm._leftArm.rotation.x = 0.08 + breath;
            pm._leftArm.rotation.z = 0.06;
        }

        if (pm._rightLeg) pm._rightLeg.rotation.x = 0;
        if (pm._leftLeg) pm._leftLeg.rotation.x = 0.03;

        // Slight slouch
        if (pm._torso) {
            pm._torso.rotation.x = 0.04 + breath;
            pm._torso.rotation.z = sway;
        }

        pm.position.y = 0;

        if (pm._auraLight) pm._auraLight.intensity = 0.3 + Math.sin(t * 0.4) * 0.15;
    }

    return true;
}

// ─── 1ST-PERSON VIEWMODEL CHAINSAW ARMS (Denji) ────────────

export function buildYohModel() {
    const pm = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: '#f0d0b0', roughness: 0.5 });
    const hairMat = new THREE.MeshStandardMaterial({ color: '#3a2a1a', roughness: 0.6 }); // dark brown hair
    const shirtMat = new THREE.MeshStandardMaterial({ color: '#e8e0d8', roughness: 0.6 }); // open white shirt
    const undershirtMat = new THREE.MeshStandardMaterial({ color: '#ff9800', roughness: 0.6 }); // orange undershirt
    const jeansMat = new THREE.MeshStandardMaterial({ color: '#2a4a6a', roughness: 0.7 }); // blue jeans
    const sandalMat = new THREE.MeshStandardMaterial({ color: '#8b6f47', roughness: 0.8 }); // wooden sandals
    const headphoneMat = new THREE.MeshStandardMaterial({ color: '#ff6600', roughness: 0.4 }); // orange headphones
    const headphonePadMat = new THREE.MeshStandardMaterial({ color: '#222222', roughness: 0.5 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#1a1a1a' }); // dark eyes
    const pupilMat = new THREE.MeshBasicMaterial({ color: '#3a2a00' }); // brown pupils

    // ── Torso pivot ──
    const torsoPivot = new THREE.Group();
    torsoPivot.position.y = 0.65;

    // Upper body — orange undershirt visible under open white shirt
    const upperBody = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.85, 8), undershirtMat);
    upperBody.position.y = 0.5; torsoPivot.add(upperBody);
    // Shoulders
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.32), shirtMat);
    shoulders.position.y = 0.82; torsoPivot.add(shoulders);
    // Open shirt flaps (left and right sides)
    for (let s = -1; s <= 1; s += 2) {
        const flap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.05), shirtMat);
        flap.position.set(s * 0.18, 0.5, 0.15);
        flap.rotation.z = s * 0.1;
        torsoPivot.add(flap);
    }
    // Shirt collar
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.12, 6), shirtMat);
    collar.position.y = 1.0; torsoPivot.add(collar);

    // ── Neck ──
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.15, 6), skinMat);
    neck.position.y = 1.1; torsoPivot.add(neck);

    // ── Head ──
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), skinMat);
    head.position.y = 1.35; head.scale.set(1, 1.02, 0.95); torsoPivot.add(head);

    // Jaw
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), skinMat);
    chin.position.set(0, 1.2, 0.12); chin.scale.set(1.1, 0.6, 1); torsoPivot.add(chin);

    // ── Hair — brown, long and spiky, with bangs ──
    const hairBase = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), hairMat);
    hairBase.position.y = 1.45; hairBase.scale.set(1.1, 0.9, 1.1);
    torsoPivot.add(hairBase);
    // Long spiky strands going backward and to sides
    const hairSpikes = [
        // Top spikes
        { x: 0, y: 1.63, z: 0.02, rx: -0.2, rz: 0, h: 0.2 },
        { x: 0.1, y: 1.6, z: 0.0, rx: -0.1, rz: 0.4, h: 0.18 },
        { x: -0.1, y: 1.6, z: 0.0, rx: -0.1, rz: -0.4, h: 0.18 },
        { x: 0.18, y: 1.55, z: -0.04, rx: 0.2, rz: 0.6, h: 0.16 },
        { x: -0.18, y: 1.55, z: -0.04, rx: 0.2, rz: -0.6, h: 0.16 },
        // Back spikes (longer, hanging down)
        { x: 0, y: 1.4, z: -0.18, rx: 0.8, rz: 0, h: 0.25 },
        { x: 0.1, y: 1.4, z: -0.16, rx: 0.7, rz: 0.2, h: 0.22 },
        { x: -0.1, y: 1.4, z: -0.16, rx: 0.7, rz: -0.2, h: 0.22 },
        { x: 0.16, y: 1.38, z: -0.12, rx: 0.6, rz: 0.4, h: 0.2 },
        { x: -0.16, y: 1.38, z: -0.12, rx: 0.6, rz: -0.4, h: 0.2 },
        // Front bangs
        { x: 0.06, y: 1.52, z: 0.15, rx: -0.6, rz: 0.15, h: 0.14 },
        { x: -0.06, y: 1.52, z: 0.15, rx: -0.6, rz: -0.15, h: 0.14 },
        { x: 0, y: 1.54, z: 0.14, rx: -0.5, rz: 0, h: 0.12 },
    ];
    for (const sp of hairSpikes) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, sp.h, 4), hairMat);
        spike.position.set(sp.x, sp.y, sp.z);
        spike.rotation.set(sp.rx, 0, sp.rz);
        torsoPivot.add(spike);
    }

    // ── Headphones (around neck) ──
    // Headband arc behind head
    const hbGeo = new THREE.TorusGeometry(0.18, 0.015, 6, 12, Math.PI);
    const headband = new THREE.Mesh(hbGeo, headphoneMat);
    headband.position.set(0, 1.12, 0);
    headband.rotation.set(Math.PI / 2, 0, 0);
    torsoPivot.add(headband);
    // Left ear cup
    const leftCup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 8), headphonePadMat);
    leftCup.position.set(-0.18, 1.12, 0);
    leftCup.rotation.z = Math.PI / 2;
    torsoPivot.add(leftCup);
    const leftCupRing = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 8), headphoneMat);
    leftCupRing.position.set(-0.19, 1.12, 0);
    leftCupRing.rotation.y = Math.PI / 2;
    torsoPivot.add(leftCupRing);
    // Right ear cup
    const rightCup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 8), headphonePadMat);
    rightCup.position.set(0.18, 1.12, 0);
    rightCup.rotation.z = Math.PI / 2;
    torsoPivot.add(rightCup);
    const rightCupRing = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 8), headphoneMat);
    rightCupRing.position.set(0.19, 1.12, 0);
    rightCupRing.rotation.y = Math.PI / 2;
    torsoPivot.add(rightCupRing);

    // ── Eyes ──
    const eyeWhiteGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    for (let s = -1; s <= 1; s += 2) {
        const eyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
        eyeWhite.position.set(s * 0.08, 1.38, 0.19);
        torsoPivot.add(eyeWhite);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 4, 4), pupilMat);
        pupil.position.set(s * 0.08, 1.38, 0.225);
        torsoPivot.add(pupil);
    }

    // ── Nose ──
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 4), skinMat);
    nose.position.set(0, 1.32, 0.2); nose.rotation.x = Math.PI * 0.6;
    torsoPivot.add(nose);

    // ── Mouth — relaxed smile ──
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.01),
        new THREE.MeshBasicMaterial({ color: '#cc9988' }));
    mouth.position.set(0, 1.26, 0.19); torsoPivot.add(mouth);

    // ── Ears ──
    for (let s = -1; s <= 1; s += 2) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 5), skinMat);
        ear.position.set(s * 0.2, 1.36, 0);
        ear.scale.set(0.6, 1, 0.6);
        torsoPivot.add(ear);
    }

    // ── Right arm ──
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.38, 0.8, 0);
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), shirtMat));
    const rUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.42, 5), shirtMat);
    rUpperArm.position.y = -0.26; rightArmPivot.add(rUpperArm);
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 5), skinMat).translateY(-0.5));
    const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.38, 5), skinMat);
    rForearm.position.y = -0.72; rightArmPivot.add(rForearm);
    const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.05), skinMat);
    rHand.position.set(0, -0.94, 0.02); rightArmPivot.add(rHand);
    torsoPivot.add(rightArmPivot);
    pm._rightArm = rightArmPivot;

    // ── Left arm ──
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.38, 0.8, 0);
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), shirtMat));
    const lUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.42, 5), shirtMat);
    lUpperArm.position.y = -0.26; leftArmPivot.add(lUpperArm);
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 5), skinMat).translateY(-0.5));
    const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.38, 5), skinMat);
    lForearm.position.y = -0.72; leftArmPivot.add(lForearm);
    const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.05), skinMat);
    lHand.position.set(0, -0.94, 0.02); leftArmPivot.add(lHand);
    torsoPivot.add(leftArmPivot);
    pm._leftArm = leftArmPivot;

    pm.add(torsoPivot);
    pm._torso = torsoPivot;

    // ── Right leg ──
    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.1, 0.65, 0);
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), jeansMat));
    const rThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.45, 5), jeansMat);
    rThigh.position.y = -0.28; rightLegPivot.add(rThigh);
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), jeansMat).translateY(-0.52));
    const rShin = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.42, 5), jeansMat);
    rShin.position.y = -0.75; rightLegPivot.add(rShin);
    const rSandal = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.16), sandalMat);
    rSandal.position.set(0, -0.98, 0.03); rightLegPivot.add(rSandal);
    // Sandal strap
    rightLegPivot.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.015, 0.01),
        new THREE.MeshStandardMaterial({ color: '#5a4030' })).translateY(-0.96).translateZ(0.06));
    pm.add(rightLegPivot);
    pm._rightLeg = rightLegPivot;

    // ── Left leg ──
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.1, 0.65, 0);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), jeansMat));
    const lThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.45, 5), jeansMat);
    lThigh.position.y = -0.28; leftLegPivot.add(lThigh);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), jeansMat).translateY(-0.52));
    const lShin = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.42, 5), jeansMat);
    lShin.position.y = -0.75; leftLegPivot.add(lShin);
    const lSandal = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.16), sandalMat);
    lSandal.position.set(0, -0.98, 0.03); leftLegPivot.add(lSandal);
    leftLegPivot.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.015, 0.01),
        new THREE.MeshStandardMaterial({ color: '#5a4030' })).translateY(-0.96).translateZ(0.06));
    pm.add(leftLegPivot);
    pm._leftLeg = leftLegPivot;

    // ── Belt ──
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.22, 0.05, 8),
        new THREE.MeshStandardMaterial({ color: '#3a3030', roughness: 0.5 }));
    belt.position.y = 0.63; pm.add(belt);

    // ── Spirit aura (warm orange glow) ──
    const aura = new THREE.PointLight('#ff9800', 0.5, TILE * 3, 2);
    aura.position.y = 1.2; pm.add(aura);
    pm._auraLight = aura;

    pm._isYoh = true;
    pm._isSukuna = true; // reuse Sukuna's animation

    return pm;
}

// ─── HOROHORO 3D MODEL ─────────────────────────────────────

export function buildHorohoroModel() {
    const pm = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: '#f0d0b0', roughness: 0.5 });
    const hairMat = new THREE.MeshStandardMaterial({ color: '#1a6aaa', roughness: 0.5 }); // blue hair
    const jacketMat = new THREE.MeshStandardMaterial({ color: '#1565c0', roughness: 0.6 }); // blue jacket
    const innerMat = new THREE.MeshStandardMaterial({ color: '#e0e0e0', roughness: 0.6 }); // white inner
    const pantsMat = new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.7 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.8 });
    const headbandMat = new THREE.MeshStandardMaterial({ color: '#42a5f5', roughness: 0.4 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#1a1a1a' });

    const torsoPivot = new THREE.Group();
    torsoPivot.position.y = 0.65;

    // Upper body — blue jacket
    torsoPivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.23, 0.85, 8), jacketMat).translateY(0.5));
    torsoPivot.add(new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.24, 0.34), jacketMat).translateY(0.84));
    // White inner visible at collar
    torsoPivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 6), innerMat).translateY(1.0).translateZ(0.08));
    // Collar
    torsoPivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.14, 6), jacketMat).translateY(1.02));

    // Neck
    torsoPivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.12, 6), skinMat).translateY(1.12));

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), skinMat);
    head.position.y = 1.35; head.scale.set(1, 1.02, 0.95); torsoPivot.add(head);
    torsoPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), skinMat).translateY(1.2).translateZ(0.12).scale.set(1.1, 0.6, 1));

    // Hair — spiky blue, standing up wild
    const hairBase = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), hairMat);
    hairBase.position.y = 1.47; hairBase.scale.set(1.1, 0.95, 1.05); torsoPivot.add(hairBase);
    const spikes = [
        { x: 0, y: 1.72, z: 0, rx: -0.1, rz: 0, h: 0.3 },
        { x: 0.1, y: 1.68, z: 0.02, rx: -0.1, rz: 0.4, h: 0.25 },
        { x: -0.1, y: 1.68, z: 0.02, rx: -0.1, rz: -0.4, h: 0.25 },
        { x: 0.06, y: 1.7, z: -0.05, rx: 0.2, rz: 0.2, h: 0.22 },
        { x: -0.06, y: 1.7, z: -0.05, rx: 0.2, rz: -0.2, h: 0.22 },
        { x: 0.16, y: 1.6, z: 0, rx: 0, rz: 0.7, h: 0.2 },
        { x: -0.16, y: 1.6, z: 0, rx: 0, rz: -0.7, h: 0.2 },
        { x: 0, y: 1.65, z: -0.12, rx: 0.5, rz: 0, h: 0.2 },
        { x: 0.12, y: 1.62, z: -0.08, rx: 0.3, rz: 0.5, h: 0.18 },
        { x: -0.12, y: 1.62, z: -0.08, rx: 0.3, rz: -0.5, h: 0.18 },
        // Front bangs
        { x: 0.05, y: 1.55, z: 0.16, rx: -0.6, rz: 0.1, h: 0.14 },
        { x: -0.05, y: 1.55, z: 0.16, rx: -0.6, rz: -0.1, h: 0.14 },
    ];
    for (const sp of spikes) {
        const s = new THREE.Mesh(new THREE.ConeGeometry(0.04, sp.h, 4), hairMat);
        s.position.set(sp.x, sp.y, sp.z); s.rotation.set(sp.rx, 0, sp.rz); torsoPivot.add(s);
    }

    // Headband — blue band across forehead
    const headband = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.22), headbandMat);
    headband.position.set(0, 1.48, 0.06); torsoPivot.add(headband);
    // Headband tail
    torsoPivot.add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.015), headbandMat).translateY(1.38).translateZ(-0.2).rotateX(0.2));

    // Eyes
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    for (let s = -1; s <= 1; s += 2) {
        torsoPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeWhiteMat).translateX(s * 0.08).translateY(1.38).translateZ(0.19));
        torsoPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.022, 4, 4), eyeMat).translateX(s * 0.08).translateY(1.38).translateZ(0.225));
    }
    // Nose + mouth
    torsoPivot.add(new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 4), skinMat).translateY(1.32).translateZ(0.2).rotateX(Math.PI * 0.6));
    torsoPivot.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.01), new THREE.MeshBasicMaterial({ color: '#cc9988' })).translateY(1.26).translateZ(0.19));
    // Ears
    for (let s = -1; s <= 1; s += 2) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 5), skinMat);
        ear.position.set(s * 0.2, 1.36, 0); ear.scale.set(0.6, 1, 0.6); torsoPivot.add(ear);
    }

    // Arms
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.38, 0.8, 0);
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), jacketMat));
    rightArmPivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.42, 5), jacketMat).translateY(-0.26));
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 5), skinMat).translateY(-0.5));
    rightArmPivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.38, 5), skinMat).translateY(-0.72));
    rightArmPivot.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.05), skinMat).translateY(-0.94).translateZ(0.02));
    torsoPivot.add(rightArmPivot);
    pm._rightArm = rightArmPivot;

    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.38, 0.8, 0);
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), jacketMat));
    leftArmPivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.42, 5), jacketMat).translateY(-0.26));
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 5), skinMat).translateY(-0.5));
    leftArmPivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.38, 5), skinMat).translateY(-0.72));
    leftArmPivot.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.05), skinMat).translateY(-0.94).translateZ(0.02));
    torsoPivot.add(leftArmPivot);
    pm._leftArm = leftArmPivot;

    pm.add(torsoPivot);
    pm._torso = torsoPivot;

    // Legs
    for (let s = -1; s <= 1; s += 2) {
        const leg = new THREE.Group();
        leg.position.set(s * 0.1, 0.65, 0);
        leg.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), pantsMat));
        leg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.45, 5), pantsMat).translateY(-0.28));
        leg.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), pantsMat).translateY(-0.52));
        leg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.42, 5), pantsMat).translateY(-0.75));
        leg.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.16), shoeMat).translateY(-0.98).translateZ(0.03));
        pm.add(leg);
        if (s === 1) pm._rightLeg = leg; else pm._leftLeg = leg;
    }

    // Belt
    pm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.22, 0.05, 8), new THREE.MeshStandardMaterial({ color: '#333', roughness: 0.5 })).translateY(0.63));

    // Ice aura
    const aura = new THREE.PointLight('#42a5f5', 0.5, TILE * 3, 2);
    aura.position.y = 1.2; pm.add(aura);
    pm._auraLight = aura;

    pm._isHorohoro = true;
    pm._isSukuna = true; // reuse Sukuna's walk animation

    return pm;
}

// ─── MEGUMI FUSHIGURO 3D MODEL ──────────────────────────────

export function buildMegumiModel() {
    const pm = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: '#f0d5b8', roughness: 0.5 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: '#0a0a1e', roughness: 0.6 }); // dark navy Jujutsu High uniform
    const innerMat = new THREE.MeshStandardMaterial({ color: '#1a1a30', roughness: 0.6 }); // slightly lighter inner
    const pantsMat = new THREE.MeshStandardMaterial({ color: '#0a0a18', roughness: 0.7 }); // very dark pants
    const shoeMat = new THREE.MeshStandardMaterial({ color: '#080810', roughness: 0.8 });
    const hairMat = new THREE.MeshStandardMaterial({ color: '#0a0a12', roughness: 0.55 }); // jet black hair
    const hairHighlightMat = new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.5 }); // slight blue-black sheen
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: '#e8e8e8' });
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#1a5e3a' }); // dark green eyes (Megumi's eye color)
    const pupilMat = new THREE.MeshBasicMaterial({ color: '#000000' });

    // ── Torso pivot ──
    const torsoPivot = new THREE.Group();
    torsoPivot.position.y = 0.65;

    // Upper body — Jujutsu High uniform jacket
    const upperBody = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.23, 0.9, 8), jacketMat);
    upperBody.position.y = 0.5; torsoPivot.add(upperBody);
    // Shoulders — lean athletic build (not as broad as Toji/Sukuna)
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.24, 0.34), jacketMat);
    shoulders.position.y = 0.85; torsoPivot.add(shoulders);
    // High collar of the uniform
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.18, 6), jacketMat);
    collar.position.y = 1.03; torsoPivot.add(collar);
    // Inner shirt visible at collar opening
    const innerShirt = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 6), innerMat);
    innerShirt.position.set(0, 0.98, 0.07); torsoPivot.add(innerShirt);

    // ── Neck ──
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.14, 6), skinMat);
    neck.position.y = 1.13; torsoPivot.add(neck);

    // ── Head ──
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), skinMat);
    head.position.y = 1.38; head.scale.set(1, 1.04, 0.95); torsoPivot.add(head);

    // Jaw / chin — angular but youthful
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), skinMat);
    chin.position.set(0, 1.24, 0.12); chin.scale.set(1.2, 0.65, 1); torsoPivot.add(chin);

    // ── Eyes — dark green, sharp, clearly visible ──
    const eyeWhiteGeo = new THREE.SphereGeometry(0.055, 8, 8);
    const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const pupilGeo = new THREE.SphereGeometry(0.022, 5, 5);
    for (let s = -1; s <= 1; s += 2) {
        // Eye socket shadow — dark recess behind the eye for depth
        const socket = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 6, 6),
            new THREE.MeshStandardMaterial({ color: '#c8a898', roughness: 0.7 })
        );
        socket.position.set(s * 0.09, 1.42, 0.17);
        socket.scale.set(1.1, 0.65, 0.4);
        torsoPivot.add(socket);

        // Eye whites — bigger and more protruding so they pop
        const eyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
        eyeWhite.position.set(s * 0.09, 1.42, 0.19);
        eyeWhite.scale.set(1.0, 0.6, 0.7);
        torsoPivot.add(eyeWhite);

        // Iris — dark green, large
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(s * 0.09, 1.42, 0.22);
        torsoPivot.add(eye);

        // Pupil — black center
        const pupil = new THREE.Mesh(pupilGeo, pupilMat);
        pupil.position.set(s * 0.09, 1.42, 0.24);
        torsoPivot.add(pupil);

        // Eye shine — small white highlight dot for life
        const shine = new THREE.Mesh(
            new THREE.SphereGeometry(0.008, 4, 4),
            new THREE.MeshBasicMaterial({ color: '#ffffff' })
        );
        shine.position.set(s * 0.09 + 0.015, 1.43, 0.25);
        torsoPivot.add(shine);

        // Upper eyelid line — dark thin line above the eye
        const eyelid = new THREE.Mesh(
            new THREE.BoxGeometry(0.07, 0.008, 0.015),
            new THREE.MeshBasicMaterial({ color: '#2a1a10' })
        );
        eyelid.position.set(s * 0.09, 1.455, 0.2);
        torsoPivot.add(eyelid);

        // Lower eyelid — subtler
        const lowerLid = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.005, 0.012),
            new THREE.MeshBasicMaterial({ color: '#c0a090' })
        );
        lowerLid.position.set(s * 0.09, 1.395, 0.2);
        torsoPivot.add(lowerLid);
    }

    // Brow ridge — slightly furrowed, serious expression
    for (let s = -1; s <= 1; s += 2) {
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.018, 0.025), skinMat);
        brow.position.set(s * 0.09, 1.465, 0.185);
        brow.rotation.z = s * -0.15;
        torsoPivot.add(brow);
    }

    // ── Nose ──
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.06, 4), skinMat);
    nose.position.set(0, 1.37, 0.21);
    nose.rotation.x = Math.PI * 0.6;
    torsoPivot.add(nose);

    // ── Mouth — neutral/serious thin line ──
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.01),
        new THREE.MeshBasicMaterial({ color: '#cc9988' }));
    mouth.position.set(0, 1.3, 0.2); torsoPivot.add(mouth);

    // ── Ears ──
    for (let s = -1; s <= 1; s += 2) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 5), skinMat);
        ear.position.set(s * 0.2, 1.4, -0.01);
        ear.scale.set(0.6, 1, 0.6);
        torsoPivot.add(ear);
    }

    // ════════════════════════════════════════════════════════════
    //  HAIR — Megumi's signature black spiky hair
    //  Heavily spiked upward and backward, asymmetric, messy
    //  Key features: spikes fan out from the crown, some hang
    //  over the forehead, sides are shorter
    // ════════════════════════════════════════════════════════════

    // Base hair volume — covers the top/back of the head
    const hairBase = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), hairMat);
    hairBase.position.set(0, 1.48, -0.02);
    hairBase.scale.set(1.1, 0.95, 1.05);
    torsoPivot.add(hairBase);

    // Secondary volume — gives more mass to the top
    const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), hairMat);
    hairTop.position.set(0, 1.58, 0.0);
    hairTop.scale.set(1.0, 0.7, 0.9);
    torsoPivot.add(hairTop);

    // ── Main upward spikes (the big dramatic ones) ──
    const mainSpikes = [
        // Center-top — tallest spike, angled slightly forward
        { x: 0,     y: 1.62, z: 0.02,  rx: -0.25, rz: 0,     h: 0.32, r: 0.045 },
        // Slightly right of center — second tallest
        { x: 0.06,  y: 1.61, z: 0.01,  rx: -0.15, rz: 0.2,   h: 0.28, r: 0.04 },
        // Slightly left of center
        { x: -0.06, y: 1.61, z: 0.01,  rx: -0.15, rz: -0.2,  h: 0.28, r: 0.04 },
        // Right spike — angled outward
        { x: 0.12,  y: 1.58, z: -0.01, rx: -0.05, rz: 0.45,  h: 0.26, r: 0.038 },
        // Left spike — angled outward
        { x: -0.12, y: 1.58, z: -0.01, rx: -0.05, rz: -0.45, h: 0.26, r: 0.038 },
        // Far right — shorter, more angled
        { x: 0.17,  y: 1.54, z: -0.03, rx: 0.05,  rz: 0.7,   h: 0.2,  r: 0.035 },
        // Far left
        { x: -0.17, y: 1.54, z: -0.03, rx: 0.05,  rz: -0.7,  h: 0.2,  r: 0.035 },
        // Back-center — angled backward
        { x: 0,     y: 1.58, z: -0.1,  rx: 0.5,   rz: 0,     h: 0.22, r: 0.038 },
        // Back-right
        { x: 0.1,   y: 1.55, z: -0.08, rx: 0.4,   rz: 0.3,   h: 0.2,  r: 0.035 },
        // Back-left
        { x: -0.1,  y: 1.55, z: -0.08, rx: 0.4,   rz: -0.3,  h: 0.2,  r: 0.035 },
    ];

    for (const sp of mainSpikes) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(sp.r, sp.h, 5), hairMat);
        spike.position.set(sp.x, sp.y, sp.z);
        spike.rotation.set(sp.rx, 0, sp.rz);
        torsoPivot.add(spike);
    }

    // ── Forehead fringe spikes (hanging over forehead but above the eyes) ──
    const fringeSpikes = [
        // Center fringe — hangs down toward the brow but not over the eyes
        { x: 0.02,  y: 1.55, z: 0.16,  rx: -0.85, rz: 0.1,   h: 0.16, r: 0.03 },
        // Left fringe spike
        { x: -0.04, y: 1.55, z: 0.15,  rx: -0.75, rz: -0.15, h: 0.14, r: 0.028 },
        // Right fringe spike
        { x: 0.07,  y: 1.54, z: 0.14,  rx: -0.7,  rz: 0.2,   h: 0.14, r: 0.025 },
        // Far left fringe — along the side
        { x: -0.1,  y: 1.53, z: 0.12,  rx: -0.6,  rz: -0.3,  h: 0.13, r: 0.025 },
        // Far right fringe
        { x: 0.12,  y: 1.53, z: 0.11,  rx: -0.55, rz: 0.35,  h: 0.12, r: 0.023 },
    ];

    for (const sp of fringeSpikes) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(sp.r, sp.h, 4), hairMat);
        spike.position.set(sp.x, sp.y, sp.z);
        spike.rotation.set(sp.rx, 0, sp.rz);
        torsoPivot.add(spike);
    }

    // ── Secondary/fill spikes (in-between to add density) ──
    const fillSpikes = [
        { x: 0.04,  y: 1.6,  z: 0.04,  rx: -0.2,  rz: 0.12,  h: 0.18, r: 0.03 },
        { x: -0.03, y: 1.6,  z: 0.03,  rx: -0.18, rz: -0.08, h: 0.17, r: 0.028 },
        { x: 0.09,  y: 1.57, z: 0.02,  rx: -0.1,  rz: 0.35,  h: 0.16, r: 0.028 },
        { x: -0.09, y: 1.57, z: 0.02,  rx: -0.1,  rz: -0.35, h: 0.16, r: 0.028 },
        { x: 0.15,  y: 1.52, z: -0.05, rx: 0.1,   rz: 0.55,  h: 0.15, r: 0.025 },
        { x: -0.15, y: 1.52, z: -0.05, rx: 0.1,   rz: -0.55, h: 0.15, r: 0.025 },
        // Small spikes near the temples
        { x: 0.19,  y: 1.48, z: 0.04,  rx: -0.3,  rz: 0.8,   h: 0.12, r: 0.022 },
        { x: -0.19, y: 1.48, z: 0.04,  rx: -0.3,  rz: -0.8,  h: 0.12, r: 0.022 },
        // Back fill
        { x: 0.05,  y: 1.53, z: -0.12, rx: 0.6,   rz: 0.15,  h: 0.16, r: 0.028 },
        { x: -0.05, y: 1.53, z: -0.12, rx: 0.6,   rz: -0.15, h: 0.16, r: 0.028 },
    ];

    for (const sp of fillSpikes) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(sp.r, sp.h, 4), hairHighlightMat);
        spike.position.set(sp.x, sp.y, sp.z);
        spike.rotation.set(sp.rx, 0, sp.rz);
        torsoPivot.add(spike);
    }

    // ── Side hair (shorter spikes around the temples/sides) ──
    for (let s = -1; s <= 1; s += 2) {
        // Sideburn area — short hair near ears
        const sideburn = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.06), hairMat);
        sideburn.position.set(s * 0.2, 1.42, 0.03);
        torsoPivot.add(sideburn);
    }

    // ── Right arm ──
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.38, 0.82, 0);
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), jacketMat));
    const rUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.45, 5), jacketMat);
    rUpperArm.position.y = -0.28; rightArmPivot.add(rUpperArm);
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 5), jacketMat).translateY(-0.52));
    const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.4, 5), jacketMat);
    rForearm.position.y = -0.75; rightArmPivot.add(rForearm);
    const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.055, 0.055), skinMat);
    rHand.position.set(0, -0.98, 0.02); rightArmPivot.add(rHand);
    for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.05, 3), skinMat);
        finger.position.set((f - 1.5) * 0.016, -1.04, 0.03);
        rightArmPivot.add(finger);
    }
    torsoPivot.add(rightArmPivot);
    pm._rightArm = rightArmPivot;

    // ── Left arm ──
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.38, 0.82, 0);
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), jacketMat));
    const lUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.45, 5), jacketMat);
    lUpperArm.position.y = -0.28; leftArmPivot.add(lUpperArm);
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 5), jacketMat).translateY(-0.52));
    const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.4, 5), jacketMat);
    lForearm.position.y = -0.75; leftArmPivot.add(lForearm);
    const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.055, 0.055), skinMat);
    lHand.position.set(0, -0.98, 0.02); leftArmPivot.add(lHand);
    for (let f = 0; f < 4; f++) {
        leftArmPivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.05, 3), skinMat).translateX((f-1.5)*0.016).translateY(-1.04).translateZ(0.03));
    }
    torsoPivot.add(leftArmPivot);
    pm._leftArm = leftArmPivot;

    pm.add(torsoPivot);
    pm._torso = torsoPivot;

    // ── Right leg ──
    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.1, 0.65, 0);
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), pantsMat));
    const rThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.45, 5), pantsMat);
    rThigh.position.y = -0.28; rightLegPivot.add(rThigh);
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 5), pantsMat).translateY(-0.52));
    const rShin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.42, 5), pantsMat);
    rShin.position.y = -0.75; rightLegPivot.add(rShin);
    const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.055, 0.15), shoeMat);
    rShoe.position.set(0, -0.98, 0.03); rightLegPivot.add(rShoe);
    pm.add(rightLegPivot);
    pm._rightLeg = rightLegPivot;

    // ── Left leg ──
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.1, 0.65, 0);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), pantsMat));
    const lThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.45, 5), pantsMat);
    lThigh.position.y = -0.28; leftLegPivot.add(lThigh);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 5), pantsMat).translateY(-0.52));
    const lShin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.42, 5), pantsMat);
    lShin.position.y = -0.75; leftLegPivot.add(lShin);
    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.055, 0.15), shoeMat);
    lShoe.position.set(0, -0.98, 0.03); leftLegPivot.add(lShoe);
    pm.add(leftLegPivot);
    pm._leftLeg = leftLegPivot;

    // ── Belt ──
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.05, 8),
        new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.5 }));
    belt.position.y = 0.62; pm.add(belt);

    // ── Shadow aura (subtle dark-blue glow) ──
    const aura = new THREE.PointLight('#1a237e', 0.6, TILE * 3, 2);
    aura.position.y = 1.2; pm.add(aura);
    pm._auraLight = aura;

    pm._isMegumi = true;

    return pm;
}

// ─── YUTA OKKOTSU 3D MODEL — white tee, black shorts, katana ──────

export function buildYutaModel() {
    const pm = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: '#f0d5b8', roughness: 0.5 });
    const tshirtMat = new THREE.MeshStandardMaterial({ color: '#f0f0ee', roughness: 0.6 });
    const tshirtShade = new THREE.MeshStandardMaterial({ color: '#c8c8c5', roughness: 0.65 });
    const shortsMat = new THREE.MeshStandardMaterial({ color: '#0e0e10', roughness: 0.7 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.85 });
    const hairMat = new THREE.MeshStandardMaterial({ color: '#0d0a0e', roughness: 0.55 });
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const irisMat = new THREE.MeshBasicMaterial({ color: '#1a3a6a' });
    const pupilMat = new THREE.MeshBasicMaterial({ color: '#000000' });

    // ── Torso pivot ──
    const torsoPivot = new THREE.Group();
    torsoPivot.position.y = 0.65;

    // White t-shirt body
    const upperBody = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.23, 0.85, 8), tshirtMat);
    upperBody.position.y = 0.5; torsoPivot.add(upperBody);
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.34), tshirtMat);
    shoulders.position.y = 0.85; torsoPivot.add(shoulders);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 8), tshirtShade);
    collar.position.y = 0.96; torsoPivot.add(collar);
    for (let s = -1; s <= 1; s += 2) {
        const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.012, 6), tshirtShade);
        cuff.position.set(s * 0.36, 0.78, 0); cuff.rotation.z = s * Math.PI / 2;
        torsoPivot.add(cuff);
    }

    // ── Neck + Head ──
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.14, 6), skinMat);
    neck.position.y = 1.10; torsoPivot.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), skinMat);
    head.position.y = 1.36; head.scale.set(1, 1.04, 0.95); torsoPivot.add(head);
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), skinMat);
    chin.position.set(0, 1.22, 0.12); chin.scale.set(1.15, 0.6, 1); torsoPivot.add(chin);

    // Eyes — calm dark blue
    for (let s = -1; s <= 1; s += 2) {
        const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 7), eyeWhiteMat);
        eyeWhite.position.set(s * 0.085, 1.40, 0.19);
        eyeWhite.scale.set(1, 0.7, 0.7);
        torsoPivot.add(eyeWhite);
        const iris = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), irisMat);
        iris.position.set(s * 0.085, 1.40, 0.215);
        torsoPivot.add(iris);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.013, 4, 4), pupilMat);
        pupil.position.set(s * 0.085, 1.40, 0.235);
        torsoPivot.add(pupil);
        const shine = new THREE.Mesh(new THREE.SphereGeometry(0.006, 4, 4), eyeWhiteMat);
        shine.position.set(s * 0.085 + 0.012, 1.41, 0.245);
        torsoPivot.add(shine);
    }
    for (let s = -1; s <= 1; s += 2) {
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.018), hairMat);
        brow.position.set(s * 0.085, 1.435, 0.205);
        brow.rotation.z = s * 0.06;
        torsoPivot.add(brow);
    }
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.06, 4), skinMat);
    nose.position.set(0, 1.34, 0.21); nose.rotation.x = Math.PI * 0.6;
    torsoPivot.add(nose);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.01),
        new THREE.MeshBasicMaterial({ color: '#aa6a5a' }));
    mouth.position.set(0, 1.27, 0.21); torsoPivot.add(mouth);
    for (let s = -1; s <= 1; s += 2) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.038, 5, 5), skinMat);
        ear.position.set(s * 0.21, 1.38, -0.01); ear.scale.set(0.6, 1, 0.6);
        torsoPivot.add(ear);
    }

    // ── HAIR — Yuta's signature messy black hair with bangs over the forehead ──
    const hairBase = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 10), hairMat);
    hairBase.position.set(0, 1.45, -0.01); hairBase.scale.set(1.08, 0.92, 1.06);
    torsoPivot.add(hairBase);
    const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), hairMat);
    hairTop.position.set(0, 1.55, 0.02); hairTop.scale.set(1.0, 0.7, 0.95);
    torsoPivot.add(hairTop);
    // Forehead bangs — signature side-parted fringe
    const bangs = [
        { x:  0.04, y: 1.49, z: 0.20, rx: -0.85, rz:  0.25, h: 0.18, r: 0.034 },
        { x: -0.02, y: 1.50, z: 0.20, rx: -0.78, rz: -0.05, h: 0.17, r: 0.032 },
        { x:  0.10, y: 1.47, z: 0.18, rx: -0.70, rz:  0.45, h: 0.15, r: 0.030 },
        { x: -0.08, y: 1.48, z: 0.18, rx: -0.70, rz: -0.30, h: 0.14, r: 0.028 },
        { x: -0.13, y: 1.46, z: 0.16, rx: -0.60, rz: -0.50, h: 0.12, r: 0.026 },
        { x:  0.15, y: 1.45, z: 0.14, rx: -0.55, rz:  0.65, h: 0.13, r: 0.026 },
    ];
    for (const b of bangs) {
        const strand = new THREE.Mesh(new THREE.ConeGeometry(b.r, b.h, 4), hairMat);
        strand.position.set(b.x, b.y, b.z);
        strand.rotation.set(b.rx, 0, b.rz);
        torsoPivot.add(strand);
    }
    // Crown / back / temple messy spikes
    const messy = [
        { x:  0.06, y: 1.62, z: 0.0,   rx: -0.10, rz:  0.20, h: 0.16, r: 0.030 },
        { x: -0.06, y: 1.62, z: 0.0,   rx: -0.10, rz: -0.20, h: 0.16, r: 0.030 },
        { x:  0.13, y: 1.58, z: -0.02, rx:  0.0,  rz:  0.45, h: 0.14, r: 0.028 },
        { x: -0.13, y: 1.58, z: -0.02, rx:  0.0,  rz: -0.45, h: 0.14, r: 0.028 },
        { x:  0.05, y: 1.52, z: -0.16, rx:  0.55, rz:  0.20, h: 0.16, r: 0.030 },
        { x: -0.05, y: 1.52, z: -0.16, rx:  0.55, rz: -0.20, h: 0.16, r: 0.030 },
        { x:  0.0,  y: 1.50, z: -0.20, rx:  0.65, rz:  0.0,  h: 0.18, r: 0.030 },
        { x:  0.18, y: 1.46, z: 0.04,  rx: -0.25, rz:  0.85, h: 0.11, r: 0.024 },
        { x: -0.18, y: 1.46, z: 0.04,  rx: -0.25, rz: -0.85, h: 0.11, r: 0.024 },
    ];
    for (const m of messy) {
        const strand = new THREE.Mesh(new THREE.ConeGeometry(m.r, m.h, 4), hairMat);
        strand.position.set(m.x, m.y, m.z);
        strand.rotation.set(m.rx, 0, m.rz);
        torsoPivot.add(strand);
    }

    // ── Right arm (holds katana) ──
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.38, 0.82, 0);
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), tshirtMat));
    const rSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.18, 6), tshirtMat);
    rSleeve.position.y = -0.13; rightArmPivot.add(rSleeve);
    rightArmPivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.012, 6), tshirtShade).translateY(-0.22));
    const rUpperArmSkin = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.055, 0.26, 5), skinMat);
    rUpperArmSkin.position.y = -0.36; rightArmPivot.add(rUpperArmSkin);
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), skinMat).translateY(-0.50));
    const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.052, 0.4, 5), skinMat);
    rForearm.position.y = -0.72; rightArmPivot.add(rForearm);
    const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.06), skinMat);
    rHand.position.set(0, -0.95, 0.02); rightArmPivot.add(rHand);

    // Katana
    const swordGroup = new THREE.Group();
    swordGroup.position.set(0, -1.0, 0.04);
    swordGroup.rotation.x = Math.PI / 2;
    const gripMat = new THREE.MeshStandardMaterial({ color: '#1a1424', roughness: 0.7 });
    const wrapMat = new THREE.MeshStandardMaterial({ color: '#382c50', roughness: 0.6 });
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.20, 6), gripMat);
    swordGroup.add(grip);
    for (let w = 0; w < 4; w++) {
        const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.013, 6), wrapMat);
        wrap.position.y = -0.07 + w * 0.05;
        swordGroup.add(wrap);
    }
    const tsubaMat = new THREE.MeshStandardMaterial({ color: '#2a2a2a', metalness: 0.55, roughness: 0.35 });
    const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.014, 8), tsubaMat);
    tsuba.position.y = 0.11;
    swordGroup.add(tsuba);
    const bladeMat = new THREE.MeshStandardMaterial({ color: '#d8dde8', metalness: 0.92, roughness: 0.10 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.85, 0.006), bladeMat);
    blade.position.y = 0.55;
    swordGroup.add(blade);
    const hamonMat = new THREE.MeshBasicMaterial({ color: '#8aaaff', transparent: true, opacity: 0.5 });
    const hamon = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.85, 0.008), hamonMat);
    hamon.position.set(0.013, 0.55, 0);
    swordGroup.add(hamon);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.10, 4), bladeMat);
    tip.position.y = 1.00;
    swordGroup.add(tip);
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 5), tsubaMat);
    pommel.position.y = -0.12;
    swordGroup.add(pommel);
    rightArmPivot.add(swordGroup);
    torsoPivot.add(rightArmPivot);
    pm._rightArm = rightArmPivot;

    // ── Left arm — mirrored, no sword ──
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.38, 0.82, 0);
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), tshirtMat));
    const lSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.18, 6), tshirtMat);
    lSleeve.position.y = -0.13; leftArmPivot.add(lSleeve);
    leftArmPivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.012, 6), tshirtShade).translateY(-0.22));
    const lUpperArmSkin = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.055, 0.26, 5), skinMat);
    lUpperArmSkin.position.y = -0.36; leftArmPivot.add(lUpperArmSkin);
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), skinMat).translateY(-0.50));
    const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.052, 0.4, 5), skinMat);
    lForearm.position.y = -0.72; leftArmPivot.add(lForearm);
    const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.06), skinMat);
    lHand.position.set(0, -0.95, 0.02); leftArmPivot.add(lHand);
    torsoPivot.add(leftArmPivot);
    pm._leftArm = leftArmPivot;

    pm.add(torsoPivot);
    pm._torso = torsoPivot;

    // ── Right leg (black shorts, bare lower leg) ──
    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.10, 0.65, 0);
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), shortsMat));
    const rShorts = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.10, 0.30, 6), shortsMat);
    rShorts.position.y = -0.18; rightLegPivot.add(rShorts);
    rightLegPivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.012, 6),
        new THREE.MeshStandardMaterial({ color: '#2a2a2c', roughness: 0.7 })).translateY(-0.32));
    const rThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.062, 0.20, 5), skinMat);
    rThigh.position.y = -0.45; rightLegPivot.add(rThigh);
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), skinMat).translateY(-0.58));
    const rShin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.42, 5), skinMat);
    rShin.position.y = -0.80; rightLegPivot.add(rShin);
    const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, 0.16), shoeMat);
    rShoe.position.set(0, -1.04, 0.03); rightLegPivot.add(rShoe);
    pm.add(rightLegPivot);
    pm._rightLeg = rightLegPivot;

    // ── Left leg ──
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.10, 0.65, 0);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), shortsMat));
    const lShorts = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.10, 0.30, 6), shortsMat);
    lShorts.position.y = -0.18; leftLegPivot.add(lShorts);
    leftLegPivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.012, 6),
        new THREE.MeshStandardMaterial({ color: '#2a2a2c', roughness: 0.7 })).translateY(-0.32));
    const lThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.062, 0.20, 5), skinMat);
    lThigh.position.y = -0.45; leftLegPivot.add(lThigh);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), skinMat).translateY(-0.58));
    const lShin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.42, 5), skinMat);
    lShin.position.y = -0.80; leftLegPivot.add(lShin);
    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, 0.16), shoeMat);
    lShoe.position.set(0, -1.04, 0.03); leftLegPivot.add(lShoe);
    pm.add(leftLegPivot);
    pm._leftLeg = leftLegPivot;

    // Subtle waistband visible at the hem of the t-shirt
    const waistband = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.04, 8),
        new THREE.MeshStandardMaterial({ color: '#1a1a1c', roughness: 0.7 }));
    waistband.position.y = 0.66; pm.add(waistband);

    // Faint blue cursed energy aura
    const aura = new THREE.PointLight('#5a8aff', 0.5, TILE * 3, 2);
    aura.position.y = 1.2; pm.add(aura);
    pm._auraLight = aura;

    pm._isSukuna = true; // reuse Sukuna's swordsman walk/idle animation
    pm._isYuta = true;

    return pm;
}

// ─── TODO 3D MODEL — pure melee fighter, no abilities ──────

export function buildTodoModel() {
    const pm = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: '#d4a070', roughness: 0.5 });
    const skinShade = new THREE.MeshStandardMaterial({ color: '#a8784a', roughness: 0.55 });
    const hairMat = new THREE.MeshStandardMaterial({ color: '#2a1a14', roughness: 0.7 });
    const shortsMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.7 });
    const beltMat = new THREE.MeshStandardMaterial({ color: '#3a2818', roughness: 0.6 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.85 });
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const pupilMat = new THREE.MeshBasicMaterial({ color: '#1a1a1a' });

    // ── Torso pivot (lean) ──
    const torsoPivot = new THREE.Group();
    torsoPivot.position.y = 0.7;

    // Bare muscular torso — wider than other characters
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.30, 1.0, 10), skinMat);
    torso.position.y = 0.55; torsoPivot.add(torso);
    // Massive shoulders — wide box
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.32, 0.45), skinMat);
    shoulders.position.y = 0.97; torsoPivot.add(shoulders);
    // Trapezius bumps either side of the neck
    for (let s = -1; s <= 1; s += 2) {
        const trap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), skinShade);
        trap.position.set(s * 0.12, 1.10, 0); trap.scale.set(0.9, 0.9, 1.0);
        torsoPivot.add(trap);
    }
    // Pec definition — two raised slabs
    for (let s = -1; s <= 1; s += 2) {
        const pec = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.10), skinShade);
        pec.position.set(s * 0.18, 0.82, 0.30);
        torsoPivot.add(pec);
    }
    // Sternum line down the centre
    const sternum = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.42, 0.04), skinShade);
    sternum.position.set(0, 0.78, 0.34); torsoPivot.add(sternum);
    // 6-pack — three rows of two boxes
    for (let r = 0; r < 3; r++) {
        for (let s = -1; s <= 1; s += 2) {
            const ab = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.10, 0.05), skinShade);
            ab.position.set(s * 0.09, 0.5 - r * 0.13, 0.32);
            torsoPivot.add(ab);
        }
    }
    // Obliques (side abs)
    for (let s = -1; s <= 1; s += 2) {
        const oblique = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.10), skinShade);
        oblique.position.set(s * 0.30, 0.42, 0.22);
        torsoPivot.add(oblique);
    }

    // ── Neck — thick ──
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.18, 6), skinMat);
    neck.position.y = 1.20; torsoPivot.add(neck);

    // ── Head — strong square jaw ──
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), skinMat);
    head.position.y = 1.45; head.scale.set(1, 1.05, 0.95); torsoPivot.add(head);
    // Square jaw
    const chin = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.20), skinMat);
    chin.position.set(0, 1.30, 0.1); torsoPivot.add(chin);
    // Brow ridge — heavy, prominent
    for (let s = -1; s <= 1; s += 2) {
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.04, 0.05), skinShade);
        brow.position.set(s * 0.085, 1.50, 0.20);
        brow.rotation.z = s * -0.12;
        torsoPivot.add(brow);
    }

    // ── Crew-cut hair ──
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    hair.position.y = 1.52; hair.scale.set(1.05, 0.7, 1.05);
    torsoPivot.add(hair);

    // ── Eyes — focused, narrow ──
    for (let s = -1; s <= 1; s += 2) {
        const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeWhiteMat);
        eyeWhite.position.set(s * 0.085, 1.44, 0.20); torsoPivot.add(eyeWhite);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 4, 4), pupilMat);
        pupil.position.set(s * 0.085, 1.44, 0.232); torsoPivot.add(pupil);
    }

    // Nose
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 4), skinMat);
    nose.position.set(0, 1.40, 0.22); nose.rotation.x = Math.PI * 0.6;
    torsoPivot.add(nose);
    // Determined frown
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.01),
        new THREE.MeshBasicMaterial({ color: '#7a4030' }));
    mouth.position.set(0, 1.32, 0.21); torsoPivot.add(mouth);
    // Ears
    for (let s = -1; s <= 1; s += 2) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.045, 5, 5), skinMat);
        ear.position.set(s * 0.22, 1.43, 0); ear.scale.set(0.6, 1, 0.6);
        torsoPivot.add(ear);
    }

    // ── Right arm — bodybuilder proportions: massive deltoid, peaked bicep,
    //    thick tricep, vascular forearm, oversized fist with knuckle ridge ──
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.55, 0.95, 0);
    // Deltoid cap — big rounded shoulder ball
    const rDelt = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), skinMat);
    rDelt.scale.set(1.05, 0.95, 1.05); rightArmPivot.add(rDelt);
    // Deltoid head separation lines (front + side)
    const rDeltLine = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.18, 0.04), skinShade);
    rDeltLine.position.set(0.04, -0.05, 0.10); rDeltLine.rotation.z = -0.2;
    rightArmPivot.add(rDeltLine);
    // Bicep bulge — peaked
    const rBicep = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), skinMat);
    rBicep.position.set(0, -0.24, 0.07); rBicep.scale.set(1.05, 1.85, 1.05);
    rightArmPivot.add(rBicep);
    // Bicep peak highlight
    const rBicepPeak = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), skinShade);
    rBicepPeak.position.set(0.02, -0.20, 0.14); rBicepPeak.scale.set(0.9, 1.1, 0.7);
    rightArmPivot.add(rBicepPeak);
    // Tricep — back of upper arm, thick
    const rTricep = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), skinShade);
    rTricep.position.set(0, -0.30, -0.08); rTricep.scale.set(1.0, 1.7, 0.95);
    rightArmPivot.add(rTricep);
    // Upper arm cylinder filling — much thicker
    const rUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.115, 0.5, 8), skinMat);
    rUpper.position.y = -0.32; rightArmPivot.add(rUpper);
    // Elbow — bigger
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.115, 6, 6), skinMat).translateY(-0.60));
    // Forearm — thick, muscular
    const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.10, 0.46, 8), skinMat);
    rForearm.position.y = -0.85; rightArmPivot.add(rForearm);
    // Brachioradialis bulge — outer forearm muscle
    const rFmuscle = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), skinShade);
    rFmuscle.position.set(0, -0.72, 0.07); rFmuscle.scale.set(1.0, 1.5, 1.05);
    rightArmPivot.add(rFmuscle);
    // Forearm vein highlights — couple thin lines for vascular look
    for (let v = 0; v < 2; v++) {
        const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.006, 0.32, 4), skinShade);
        vein.position.set(0.06 - v * 0.04, -0.78, 0.10);
        vein.rotation.z = 0.05 - v * 0.04;
        rightArmPivot.add(vein);
    }
    // Wrist
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.10, 6, 6), skinMat).translateY(-1.10));
    // Fist — oversized, clenched
    const rFist = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.20), skinMat);
    rFist.position.set(0, -1.20, 0.03); rightArmPivot.add(rFist);
    // Knuckle ridge — pronounced row across fingers
    const rKnuckles = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.06), skinShade);
    rKnuckles.position.set(0, -1.16, 0.14); rightArmPivot.add(rKnuckles);
    // Thumb knuckle bump
    const rThumb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 5), skinMat);
    rThumb.position.set(-0.10, -1.15, 0.06); rightArmPivot.add(rThumb);
    torsoPivot.add(rightArmPivot);
    pm._rightArm = rightArmPivot;

    // ── Left arm — mirrored ──
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.55, 0.95, 0);
    const lDelt = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), skinMat);
    lDelt.scale.set(1.05, 0.95, 1.05); leftArmPivot.add(lDelt);
    const lDeltLine = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.18, 0.04), skinShade);
    lDeltLine.position.set(-0.04, -0.05, 0.10); lDeltLine.rotation.z = 0.2;
    leftArmPivot.add(lDeltLine);
    const lBicep = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), skinMat);
    lBicep.position.set(0, -0.24, 0.07); lBicep.scale.set(1.05, 1.85, 1.05);
    leftArmPivot.add(lBicep);
    const lBicepPeak = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), skinShade);
    lBicepPeak.position.set(-0.02, -0.20, 0.14); lBicepPeak.scale.set(0.9, 1.1, 0.7);
    leftArmPivot.add(lBicepPeak);
    const lTricep = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), skinShade);
    lTricep.position.set(0, -0.30, -0.08); lTricep.scale.set(1.0, 1.7, 0.95);
    leftArmPivot.add(lTricep);
    const lUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.115, 0.5, 8), skinMat);
    lUpper.position.y = -0.32; leftArmPivot.add(lUpper);
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.115, 6, 6), skinMat).translateY(-0.60));
    const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.10, 0.46, 8), skinMat);
    lForearm.position.y = -0.85; leftArmPivot.add(lForearm);
    const lFmuscle = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), skinShade);
    lFmuscle.position.set(0, -0.72, 0.07); lFmuscle.scale.set(1.0, 1.5, 1.05);
    leftArmPivot.add(lFmuscle);
    for (let v = 0; v < 2; v++) {
        const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.006, 0.32, 4), skinShade);
        vein.position.set(-0.06 + v * 0.04, -0.78, 0.10);
        vein.rotation.z = -0.05 + v * 0.04;
        leftArmPivot.add(vein);
    }
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.10, 6, 6), skinMat).translateY(-1.10));
    const lFist = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.20), skinMat);
    lFist.position.set(0, -1.20, 0.03); leftArmPivot.add(lFist);
    const lKnuckles = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.06), skinShade);
    lKnuckles.position.set(0, -1.16, 0.14); leftArmPivot.add(lKnuckles);
    const lThumb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 5), skinMat);
    lThumb.position.set(0.10, -1.15, 0.06); leftArmPivot.add(lThumb);
    torsoPivot.add(leftArmPivot);
    pm._leftArm = leftArmPivot;

    pm.add(torsoPivot);
    pm._torso = torsoPivot;

    // ── Right leg — bodybuilder: massive quads, sweep, big calves ──
    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.16, 0.7, 0);
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 6), shortsMat));
    // Shorts wrap upper thigh — wider
    const rShorts = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.32, 8), shortsMat);
    rShorts.position.y = -0.20; rightLegPivot.add(rShorts);
    // Lower thigh — bare skin, much thicker
    const rThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.22, 8), skinMat);
    rThigh.position.y = -0.46; rightLegPivot.add(rThigh);
    // Quad sweep — outer thigh muscle
    const rQuadOuter = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), skinShade);
    rQuadOuter.position.set(0.05, -0.40, 0.06); rQuadOuter.scale.set(1.0, 1.4, 1.0);
    rightLegPivot.add(rQuadOuter);
    // Quad inner head
    const rQuadInner = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), skinShade);
    rQuadInner.position.set(-0.04, -0.42, 0.07); rQuadInner.scale.set(0.9, 1.3, 1.0);
    rightLegPivot.add(rQuadInner);
    // Knee
    rightLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.105, 6, 6), skinMat).translateY(-0.62));
    // Calf — bulkier
    const rCalf = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.085, 0.46, 8), skinMat);
    rCalf.position.y = -0.88; rightLegPivot.add(rCalf);
    // Calf bulge — pronounced gastrocnemius
    const rCalfBulge = new THREE.Mesh(new THREE.SphereGeometry(0.115, 8, 8), skinShade);
    rCalfBulge.position.set(0, -0.78, -0.06); rCalfBulge.scale.set(1.05, 1.4, 0.95);
    rightLegPivot.add(rCalfBulge);
    // Achilles taper above the ankle
    const rAchilles = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.10, 6), skinMat);
    rAchilles.position.y = -1.08; rightLegPivot.add(rAchilles);
    // Sneaker — bigger, chunky
    const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.10, 0.24), shoeMat);
    rShoe.position.set(0, -1.16, 0.05); rightLegPivot.add(rShoe);
    pm.add(rightLegPivot);
    pm._rightLeg = rightLegPivot;

    // ── Left leg — mirrored ──
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.16, 0.7, 0);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 6), shortsMat));
    const lShorts = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.32, 8), shortsMat);
    lShorts.position.y = -0.20; leftLegPivot.add(lShorts);
    const lThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.22, 8), skinMat);
    lThigh.position.y = -0.46; leftLegPivot.add(lThigh);
    const lQuadOuter = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), skinShade);
    lQuadOuter.position.set(-0.05, -0.40, 0.06); lQuadOuter.scale.set(1.0, 1.4, 1.0);
    leftLegPivot.add(lQuadOuter);
    const lQuadInner = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), skinShade);
    lQuadInner.position.set(0.04, -0.42, 0.07); lQuadInner.scale.set(0.9, 1.3, 1.0);
    leftLegPivot.add(lQuadInner);
    leftLegPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.105, 6, 6), skinMat).translateY(-0.62));
    const lCalf = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.085, 0.46, 8), skinMat);
    lCalf.position.y = -0.88; leftLegPivot.add(lCalf);
    const lCalfBulge = new THREE.Mesh(new THREE.SphereGeometry(0.115, 8, 8), skinShade);
    lCalfBulge.position.set(0, -0.78, -0.06); lCalfBulge.scale.set(1.05, 1.4, 0.95);
    leftLegPivot.add(lCalfBulge);
    const lAchilles = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.10, 6), skinMat);
    lAchilles.position.y = -1.08; leftLegPivot.add(lAchilles);
    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.10, 0.24), shoeMat);
    lShoe.position.set(0, -1.16, 0.05); leftLegPivot.add(lShoe);
    pm.add(leftLegPivot);
    pm._leftLeg = leftLegPivot;

    // Belt
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.30, 0.06, 8), beltMat);
    belt.position.y = 0.68; pm.add(belt);

    // No special aura — TODO doesn't need cursed energy
    // Reuse Sukuna's walk animation (it suits the muscular swagger)
    pm._isSukuna = true;
    pm._isTodo = true;

    return pm;
}

// ─── MEGUMI WALK/IDLE ANIMATION ─────────────────────────────

export function updateMegumiAnimation(pm, dt, moving, walkCycle) {
    if (!pm._isMegumi) return false;

    const t = walkCycle;

    if (moving) {
        const stride = 0.55;
        const armSwing = 0.45;
        const bodyBob = Math.abs(Math.sin(t * 2)) * 0.05;

        if (pm._rightLeg) pm._rightLeg.rotation.x = Math.sin(t) * stride;
        if (pm._leftLeg) pm._leftLeg.rotation.x = Math.sin(t + Math.PI) * stride;

        if (pm._rightArm) pm._rightArm.rotation.x = Math.sin(t + Math.PI) * armSwing;
        if (pm._leftArm) pm._leftArm.rotation.x = Math.sin(t) * armSwing;

        if (pm._torso) {
            pm._torso.rotation.x = 0.04;
            pm._torso.rotation.z = Math.sin(t) * 0.025;
        }

        pm.position.y = (0) + bodyBob;

        if (pm._auraLight) pm._auraLight.intensity = 0.6 + Math.sin(t * 3) * 0.2;
    } else {
        const breath = Math.sin(t * 0.5) * 0.015;
        const idleSway = Math.sin(t * 0.3) * 0.008;

        if (pm._rightArm) pm._rightArm.rotation.x = breath + 0.04;
        if (pm._leftArm) pm._leftArm.rotation.x = breath + 0.04;

        if (pm._rightLeg) pm._rightLeg.rotation.x = 0;
        if (pm._leftLeg) pm._leftLeg.rotation.x = 0;

        if (pm._torso) {
            pm._torso.rotation.x = breath;
            pm._torso.rotation.z = idleSway;
        }

        pm.position.y = 0;

        if (pm._auraLight) pm._auraLight.intensity = 0.5 + Math.sin(t * 0.4) * 0.15;
    }

    return true;
}

// ─── HOROHORO OVERSOUL (Q key — permanent, two big ice fists) ──

export function buildRenModel() {
    const pm = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: '#f0d0b0', roughness: 0.5 });
    const hairMat = new THREE.MeshStandardMaterial({ color: '#2a1a3a', roughness: 0.5 }); // dark purple-black hair
    const outfitMat = new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.6 }); // dark changshan
    const outfitTrimMat = new THREE.MeshStandardMaterial({ color: '#daa520', roughness: 0.4 }); // gold trim
    const pantsMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.7 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.8 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#daa520' }); // golden eyes
    const pupilMat = new THREE.MeshBasicMaterial({ color: '#000000' });

    // ── Torso pivot ──
    const torsoPivot = new THREE.Group();
    torsoPivot.position.y = 0.65;

    // Upper body — dark mandarin collar outfit
    const upperBody = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.85, 8), outfitMat);
    upperBody.position.y = 0.5; torsoPivot.add(upperBody);
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.32), outfitMat);
    shoulders.position.y = 0.82; torsoPivot.add(shoulders);
    // Gold trim down the front
    const frontTrim = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.7, 0.02), outfitTrimMat);
    frontTrim.position.set(0, 0.5, 0.16); torsoPivot.add(frontTrim);
    // Mandarin collar
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.15, 6), outfitMat);
    collar.position.y = 1.02; torsoPivot.add(collar);
    const collarTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.185, 0.02, 6), outfitTrimMat);
    collarTrim.position.y = 1.09; torsoPivot.add(collarTrim);

    // ── Neck ──
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.12, 6), skinMat);
    neck.position.y = 1.12; torsoPivot.add(neck);

    // ── Head ──
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), skinMat);
    head.position.y = 1.35; head.scale.set(1, 1.05, 0.95); torsoPivot.add(head);
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), skinMat);
    chin.position.set(0, 1.2, 0.12); chin.scale.set(1.1, 0.6, 1); torsoPivot.add(chin);

    // ── Hair — dark purple, signature tongari spike pointing straight up ──
    const hairBase = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), hairMat);
    hairBase.position.y = 1.45; hairBase.scale.set(1.05, 0.9, 1);
    torsoPivot.add(hairBase);
    // THE TONGARI — tall sharp spike going straight up
    const tongari = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.6, 5), hairMat);
    tongari.position.set(0, 1.85, -0.02);
    torsoPivot.add(tongari);
    // Secondary spikes around it
    const hairSpikes = [
        { x: 0.08, y: 1.62, z: 0, rx: 0, rz: 0.3, h: 0.25 },
        { x: -0.08, y: 1.62, z: 0, rx: 0, rz: -0.3, h: 0.25 },
        { x: 0, y: 1.6, z: -0.1, rx: 0.4, rz: 0, h: 0.2 },
        { x: 0.12, y: 1.55, z: -0.05, rx: 0.2, rz: 0.5, h: 0.18 },
        { x: -0.12, y: 1.55, z: -0.05, rx: 0.2, rz: -0.5, h: 0.18 },
        // Front bangs — sharp
        { x: 0.06, y: 1.52, z: 0.14, rx: -0.5, rz: 0.1, h: 0.15 },
        { x: -0.06, y: 1.52, z: 0.14, rx: -0.5, rz: -0.1, h: 0.15 },
    ];
    for (const sp of hairSpikes) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.035, sp.h, 4), hairMat);
        spike.position.set(sp.x, sp.y, sp.z); spike.rotation.set(sp.rx, 0, sp.rz);
        torsoPivot.add(spike);
    }

    // ── Eyes — golden ──
    const eyeWhiteGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    for (let s = -1; s <= 1; s += 2) {
        torsoPivot.add(new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat).translateX(s * 0.08).translateY(1.38).translateZ(0.19));
        torsoPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.022, 4, 4), eyeMat).translateX(s * 0.08).translateY(1.38).translateZ(0.225));
        torsoPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.012, 4, 4), pupilMat).translateX(s * 0.08).translateY(1.38).translateZ(0.235));
    }
    // Nose
    torsoPivot.add(new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 4), skinMat).translateY(1.32).translateZ(0.2).rotateX(Math.PI * 0.6));
    // Mouth — slight frown
    torsoPivot.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.01), new THREE.MeshBasicMaterial({ color: '#bb8888' })).translateY(1.26).translateZ(0.19));
    // Ears
    for (let s = -1; s <= 1; s += 2) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 5), skinMat);
        ear.position.set(s * 0.2, 1.36, 0); ear.scale.set(0.6, 1, 0.6); torsoPivot.add(ear);
    }

    // ── Right arm ──
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.38, 0.8, 0);
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), outfitMat));
    rightArmPivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.42, 5), outfitMat).translateY(-0.26));
    rightArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 5), skinMat).translateY(-0.5));
    rightArmPivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.38, 5), skinMat).translateY(-0.72));
    rightArmPivot.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.05), skinMat).translateY(-0.94).translateZ(0.02));
    torsoPivot.add(rightArmPivot);
    pm._rightArm = rightArmPivot;

    // ── Left arm ──
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.38, 0.8, 0);
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), outfitMat));
    leftArmPivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.42, 5), outfitMat).translateY(-0.26));
    leftArmPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 5), skinMat).translateY(-0.5));
    leftArmPivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.38, 5), skinMat).translateY(-0.72));
    leftArmPivot.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.05), skinMat).translateY(-0.94).translateZ(0.02));
    torsoPivot.add(leftArmPivot);
    pm._leftArm = leftArmPivot;

    pm.add(torsoPivot);
    pm._torso = torsoPivot;

    // ── Legs ──
    for (let s = -1; s <= 1; s += 2) {
        const legPivot = new THREE.Group();
        legPivot.position.set(s * 0.1, 0.65, 0);
        legPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), pantsMat));
        legPivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.45, 5), pantsMat).translateY(-0.28));
        legPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), pantsMat).translateY(-0.52));
        legPivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.42, 5), pantsMat).translateY(-0.75));
        legPivot.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.16), shoeMat).translateY(-0.98).translateZ(0.03));
        pm.add(legPivot);
        if (s === 1) pm._rightLeg = legPivot; else pm._leftLeg = legPivot;
    }

    // Belt with gold buckle
    pm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.22, 0.05, 8), new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.5 })).translateY(0.63));
    pm.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.03), outfitTrimMat).translateY(0.63).translateZ(0.22));

    // Purple aura
    const aura = new THREE.PointLight('#9c27b0', 0.5, TILE * 3, 2);
    aura.position.y = 1.2; pm.add(aura);
    pm._auraLight = aura;

    pm._isRen = true;
    pm._isSukuna = true; // reuse Sukuna's animation

    return pm;
}

// ─── REN OVERSOUL TRANSFORMATION (Q key — permanent) ──────


// ───────────────────────────────────────────────────────────────
//  DISPATCH — pick the right builder + animator for a character key
// ───────────────────────────────────────────────────────────────

const BUILDERS = {
    gojo: buildGojoModel,
    sukuna: buildSukunaModel,
    toji: buildTojiModel,
    brook: buildBrookModel,
    denji: buildDenjiModel,
    yoh: buildYohModel,
    horohoro: buildHorohoroModel,
    megumi: buildMegumiModel,
    yuta: buildYutaModel,
    todo: buildTodoModel,
    ren: buildRenModel,
};

// Yoh / Horohoro / Yuta / Todo / Ren reuse Sukuna's animation in the
// source — keep that same dispatch here so movement looks identical.
const ANIMATORS = {
    gojo: updateGojoAnimation,
    sukuna: updateSukunaAnimation,
    toji: updateTojiAnimation,
    brook: updateBrookAnimation,
    denji: updateDenjiAnimation,
    yoh: updateSukunaAnimation,
    horohoro: updateSukunaAnimation,
    megumi: updateMegumiAnimation,
    yuta: updateSukunaAnimation,
    todo: updateSukunaAnimation,
    ren: updateSukunaAnimation,
};

export function buildCharacterMesh(charKey) {
    const builder = BUILDERS[charKey] || buildGojoModel;
    return builder();
}

// Each animator returns early unless its matching `pm._isXxx` flag is set
// (the original dungeon-crawler-3d pluggable-animation pattern). For
// shared-animation characters reusing Sukuna's animator, set the flag
// so their movement still animates.
const ANIM_FLAG = {
    gojo: '_isGojo', sukuna: '_isSukuna', toji: '_isToji',
    brook: '_isBrook', denji: '_isDenji', megumi: '_isMegumi',
    yoh: '_isSukuna', horohoro: '_isSukuna',
    yuta: '_isSukuna', todo: '_isSukuna', ren: '_isSukuna'
};

export function animateCharacter(pm, charKey, dt, moving, walkCycle) {
    const animator = ANIMATORS[charKey];
    if (!animator) return;
    const flag = ANIM_FLAG[charKey];
    if (flag) pm[flag] = true;
    animator(pm, dt, moving, walkCycle);
}
