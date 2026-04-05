// ═══════════════════════════════════════════════════════════════
//  ENEMY MESH FACTORY — futuristic horror 3D primitives
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { TILE, WALL_HEIGHT } from '../constants.js';

// Shared materials
const fleshMat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 });
const darkMat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.2 });
const glowMat = (color) => new THREE.MeshBasicMaterial({ color });
const toothMat = new THREE.MeshStandardMaterial({ color: '#f5f0e0', roughness: 0.4, metalness: 0.1 });
const gumMat = new THREE.MeshStandardMaterial({ color: '#4a1020', roughness: 0.7 });
const tongueMat = new THREE.MeshStandardMaterial({ color: '#8b2040', roughness: 0.5 });

// Add rows of sharp teeth to a group at a given position/size
function addMouth(group, x, y, z, width, teethCount, teethSize, jawOpen) {
    // Upper jaw
    const upperJaw = new THREE.Mesh(
        new THREE.BoxGeometry(width, teethSize * 0.4, width * 0.5),
        gumMat
    );
    upperJaw.position.set(x, y + jawOpen * 0.5, z);
    group.add(upperJaw);

    // Lower jaw
    const lowerJaw = new THREE.Mesh(
        new THREE.BoxGeometry(width, teethSize * 0.4, width * 0.5),
        gumMat
    );
    lowerJaw.position.set(x, y - jawOpen * 0.5, z);
    group.add(lowerJaw);

    // Upper teeth — sharp cones pointing down
    const toothGeo = new THREE.ConeGeometry(teethSize * 0.25, teethSize, 4);
    for (let t = 0; t < teethCount; t++) {
        const tx = x - width * 0.4 + (t / (teethCount - 1)) * width * 0.8;
        const tooth = new THREE.Mesh(toothGeo, toothMat);
        tooth.position.set(tx, y + jawOpen * 0.3 - teethSize * 0.4, z + width * 0.15);
        tooth.rotation.x = Math.PI; // point down
        group.add(tooth);
    }

    // Lower teeth — sharp cones pointing up
    for (let t = 0; t < teethCount; t++) {
        const tx = x - width * 0.35 + (t / (teethCount - 1)) * width * 0.7;
        const tooth = new THREE.Mesh(toothGeo, toothMat);
        tooth.position.set(tx, y - jawOpen * 0.3 + teethSize * 0.4, z + width * 0.15);
        group.add(tooth);
    }

    // Tongue inside mouth
    const tongue = new THREE.Mesh(
        new THREE.SphereGeometry(width * 0.2, 6, 4),
        tongueMat
    );
    tongue.position.set(x, y - jawOpen * 0.15, z);
    tongue.scale.set(1, 0.4, 1.2);
    group.add(tongue);

    // Dark mouth interior
    const interior = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.8, jawOpen * 0.6, width * 0.3),
        new THREE.MeshBasicMaterial({ color: '#0a0008' })
    );
    interior.position.set(x, y, z - width * 0.05);
    group.add(interior);
}

// Glowing eyes helper
function addEyes(group, x, y, z, spacing, size, color) {
    const mat = glowMat(color);
    const geo = new THREE.SphereGeometry(size, 6, 6);
    const eyeL = new THREE.Mesh(geo, mat);
    eyeL.position.set(x - spacing, y, z);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(geo, mat);
    eyeR.position.set(x + spacing, y, z);
    group.add(eyeR);
}

export function createEnemyMesh(enemyType, isBoss) {
    const group = new THREE.Group();
    const S = isBoss ? 2.5 : 1.5; // scaled up from before

    switch (enemyType) {
        case 'skeleton': {
            // Skull — cracked, elongated
            const skull = new THREE.Mesh(
                new THREE.SphereGeometry(0.35 * S, 8, 8),
                darkMat('#b0a080')
            );
            skull.position.y = 1.7 * S;
            skull.scale.set(1, 1.15, 1); // elongated
            group.add(skull);
            // Glowing red eyes
            addEyes(group, 0, 1.75 * S, 0.28 * S, 0.12 * S, 0.07 * S, '#ff2200');
            // Big gaping mouth with teeth
            addMouth(group, 0, 1.55 * S, 0.25 * S, 0.35 * S, 6, 0.12 * S, 0.15 * S);
            // Ribcage torso — darker
            const torso = new THREE.Mesh(
                new THREE.CylinderGeometry(0.25 * S, 0.18 * S, 0.8 * S, 6),
                darkMat('#3a3028')
            );
            torso.position.y = 1.05 * S;
            group.add(torso);
            // Exposed rib lines
            for (let r = 0; r < 3; r++) {
                const rib = new THREE.Mesh(
                    new THREE.TorusGeometry(0.2 * S, 0.015 * S, 4, 8, Math.PI),
                    darkMat('#908868')
                );
                rib.position.set(0, 0.85 * S + r * 0.15 * S, 0.05 * S);
                rib.rotation.x = Math.PI / 2;
                group.add(rib);
            }
            // Legs — bony
            const legGeo = new THREE.CylinderGeometry(0.06 * S, 0.04 * S, 0.7 * S, 4);
            group.add(new THREE.Mesh(legGeo, darkMat('#706850')).translateX(-0.12 * S).translateY(0.35 * S));
            group.add(new THREE.Mesh(legGeo, darkMat('#706850')).translateX(0.12 * S).translateY(0.35 * S));
            break;
        }
        case 'archerSkeleton': {
            // Taller, leaner skeleton with bow
            const skull = new THREE.Mesh(
                new THREE.SphereGeometry(0.32 * S, 8, 8),
                darkMat('#a09070')
            );
            skull.position.y = 1.8 * S;
            group.add(skull);
            addEyes(group, 0, 1.85 * S, 0.25 * S, 0.1 * S, 0.06 * S, '#ff4400');
            addMouth(group, 0, 1.65 * S, 0.2 * S, 0.3 * S, 5, 0.1 * S, 0.12 * S);
            const torso = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2 * S, 0.14 * S, 0.7 * S, 6),
                darkMat('#3a3028')
            );
            torso.position.y = 1.1 * S;
            group.add(torso);
            // Bow — sinister barbed
            const bow = new THREE.Mesh(
                new THREE.TorusGeometry(0.35 * S, 0.04, 4, 12, Math.PI),
                darkMat('#2a1a1a')
            );
            bow.position.set(0.35 * S, 1.3 * S, 0);
            bow.rotation.z = Math.PI / 2;
            group.add(bow);
            // Barbs on bow
            for (let b = 0; b < 3; b++) {
                const barb = new THREE.Mesh(
                    new THREE.ConeGeometry(0.03 * S, 0.1 * S, 3),
                    darkMat('#4a2a2a')
                );
                barb.position.set(0.35 * S + 0.3 * S * Math.cos(b * 0.5 - 0.5), 1.3 * S + 0.3 * S * Math.sin(b * 0.5 - 0.5), 0);
                group.add(barb);
            }
            break;
        }
        case 'slime': {
            // Grotesque blob with a huge mouth splitting it open
            const body = new THREE.Mesh(
                new THREE.SphereGeometry(0.5 * S, 12, 8),
                new THREE.MeshStandardMaterial({
                    color: '#2a5a2a', roughness: 0.3, metalness: 0.15,
                    transparent: true, opacity: 0.8
                })
            );
            body.position.y = 0.5 * S;
            body.scale.y = 0.75;
            group.add(body);
            // Huge mouth splitting the front
            addMouth(group, 0, 0.5 * S, 0.3 * S, 0.5 * S, 8, 0.1 * S, 0.2 * S);
            // Multiple eyes — scattered, uneven
            addEyes(group, 0, 0.7 * S, 0.4 * S, 0.15 * S, 0.06 * S, '#ffff00');
            const extraEye = new THREE.Mesh(
                new THREE.SphereGeometry(0.04 * S, 4, 4),
                glowMat('#ffff00')
            );
            extraEye.position.set(0.08 * S, 0.8 * S, 0.38 * S);
            group.add(extraEye);
            break;
        }
        case 'bat': {
            // Nightmarish flying horror — bigger, fanged
            const body = new THREE.Mesh(
                new THREE.SphereGeometry(0.3 * S, 8, 8),
                darkMat('#2a1a2a')
            );
            body.position.y = 2.2;
            group.add(body);
            // Huge mouth on underside
            addMouth(group, 0, 2.0, 0.2 * S, 0.3 * S, 5, 0.08 * S, 0.1 * S);
            // Leathery wings — larger
            const wingMat = new THREE.MeshStandardMaterial({
                color: '#1a0a1a', side: THREE.DoubleSide, transparent: true, opacity: 0.8
            });
            const wingGeo = new THREE.PlaneGeometry(0.8 * S, 0.5 * S);
            const wingL = new THREE.Mesh(wingGeo, wingMat);
            wingL.position.set(-0.5 * S, 2.2, 0);
            wingL.rotation.y = 0.3;
            group.add(wingL);
            const wingR = new THREE.Mesh(wingGeo, wingMat);
            wingR.position.set(0.5 * S, 2.2, 0);
            wingR.rotation.y = -0.3;
            group.add(wingR);
            // Glowing red eyes
            addEyes(group, 0, 2.3, 0.22 * S, 0.1 * S, 0.05 * S, '#ff0033');
            group.userData.wingL = wingL;
            group.userData.wingR = wingR;
            break;
        }
        case 'darkKnight': {
            // Corrupted armored horror — cracked helmet revealing maw
            const helmet = new THREE.Mesh(
                new THREE.SphereGeometry(0.4 * S, 8, 8),
                new THREE.MeshStandardMaterial({ color: '#1a1a2a', metalness: 0.7, roughness: 0.2 })
            );
            helmet.position.y = 1.8 * S;
            group.add(helmet);
            // Cracked visor revealing glowing eyes
            addEyes(group, 0, 1.85 * S, 0.32 * S, 0.1 * S, 0.06 * S, '#ff0000');
            // Exposed jaw beneath helmet — teeth visible
            addMouth(group, 0, 1.6 * S, 0.3 * S, 0.35 * S, 7, 0.1 * S, 0.14 * S);
            // Heavy corrupted armor body
            const body = new THREE.Mesh(
                new THREE.CylinderGeometry(0.35 * S, 0.3 * S, 1.0 * S, 8),
                new THREE.MeshStandardMaterial({ color: '#1a1a2a', metalness: 0.6, roughness: 0.3 })
            );
            body.position.y = 1.1 * S;
            group.add(body);
            // Glowing red cracks in armor
            for (let cr = 0; cr < 3; cr++) {
                const crack = new THREE.Mesh(
                    new THREE.BoxGeometry(0.02, 0.25 * S, 0.02),
                    glowMat('#ff2200')
                );
                crack.position.set((cr - 1) * 0.12 * S, 1.0 * S + cr * 0.1 * S, 0.32 * S);
                crack.rotation.z = (cr - 1) * 0.3;
                group.add(crack);
            }
            // Shield — dark, spiked
            const shield = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, 0.6 * S, 0.4 * S),
                new THREE.MeshStandardMaterial({ color: '#0a0a1a', metalness: 0.5 })
            );
            shield.position.set(-0.4 * S, 1.1 * S, 0);
            group.add(shield);
            // Shield spikes
            for (let sp = 0; sp < 3; sp++) {
                const spike = new THREE.Mesh(
                    new THREE.ConeGeometry(0.03 * S, 0.15 * S, 4),
                    darkMat('#2a2a3a')
                );
                spike.position.set(-0.45 * S, 0.9 * S + sp * 0.2 * S, 0);
                spike.rotation.z = Math.PI / 2;
                group.add(spike);
            }
            // Legs
            const legGeo = new THREE.CylinderGeometry(0.12 * S, 0.1 * S, 0.7 * S, 6);
            group.add(new THREE.Mesh(legGeo, darkMat('#1a1a2a')).translateX(-0.15 * S).translateY(0.35 * S));
            group.add(new THREE.Mesh(legGeo, darkMat('#1a1a2a')).translateX(0.15 * S).translateY(0.35 * S));
            break;
        }
        case 'necromancer': {
            // Gaunt horror in tattered robe — exposed skull jaw
            const robe = new THREE.Mesh(
                new THREE.ConeGeometry(0.4 * S, 1.4 * S, 8),
                darkMat('#2a0a2a')
            );
            robe.position.y = 0.7 * S;
            group.add(robe);
            // Head — partially skeletal
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.28 * S, 8, 8),
                darkMat('#3a1a2a')
            );
            head.position.y = 1.55 * S;
            group.add(head);
            // Glowing purple eyes
            addEyes(group, 0, 1.6 * S, 0.2 * S, 0.1 * S, 0.06 * S, '#cc00ff');
            // Exposed jaw with teeth
            addMouth(group, 0, 1.4 * S, 0.18 * S, 0.28 * S, 6, 0.08 * S, 0.1 * S);
            // Staff with pulsing orb
            const staff = new THREE.Mesh(
                new THREE.CylinderGeometry(0.035, 0.035, 1.7 * S, 4),
                darkMat('#1a0a1a')
            );
            staff.position.set(0.35 * S, 0.85 * S, 0);
            group.add(staff);
            // Skull on top of staff
            const staffSkull = new THREE.Mesh(
                new THREE.SphereGeometry(0.1 * S, 6, 6),
                darkMat('#b0a080')
            );
            staffSkull.position.set(0.35 * S, 1.75 * S, 0);
            group.add(staffSkull);
            // Orb glow
            const orb = new THREE.Mesh(
                new THREE.SphereGeometry(0.12 * S, 8, 8),
                new THREE.MeshBasicMaterial({ color: '#aa00ff', transparent: true, opacity: 0.7 })
            );
            orb.position.set(0.35 * S, 1.75 * S, 0);
            group.add(orb);
            break;
        }
        default: {
            // Fallback — generic horror blob with mouth
            const fb = new THREE.Mesh(
                new THREE.SphereGeometry(0.4 * S, 8, 8),
                darkMat('#444444')
            );
            fb.position.y = 0.9 * S;
            group.add(fb);
            addEyes(group, 0, 1.1 * S, 0.3 * S, 0.12 * S, 0.06 * S, '#ff0000');
            addMouth(group, 0, 0.8 * S, 0.25 * S, 0.35 * S, 5, 0.08 * S, 0.12 * S);
        }
    }

    return group;
}

// Billboard: rotate enemy to face camera on Y axis
export function billboardEnemy(mesh, cameraPos) {
    mesh.lookAt(cameraPos.x, mesh.position.y, cameraPos.z);
}

// Animate bat wings, slime squish, jaw movement etc.
export function animateEnemyMesh(mesh, enemyType, time) {
    if (enemyType === 'bat' && mesh.userData.wingL) {
        const flap = Math.sin(time * 0.012) * 0.6;
        mesh.userData.wingL.rotation.y = 0.3 + flap;
        mesh.userData.wingR.rotation.y = -0.3 - flap;
    }
    if (enemyType === 'slime') {
        const squish = 1 + Math.sin(time * 0.005) * 0.12;
        mesh.scale.y = 0.75 * squish;
        mesh.scale.x = 1.0 / squish;
        mesh.scale.z = 1.0 / squish;
    }
}
