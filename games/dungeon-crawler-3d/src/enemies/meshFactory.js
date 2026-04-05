// ═══════════════════════════════════════════════════════════════
//  ENEMY MESH FACTORY — 3D primitives for enemies
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { TILE, WALL_HEIGHT } from '../constants.js';

const enemyMeshCache = {};

export function createEnemyMesh(enemyType, isBoss) {
    const group = new THREE.Group();
    const scale = isBoss ? 1.8 : 1;

    switch (enemyType) {
        case 'skeleton': {
            // Skull
            const skull = new THREE.Mesh(
                new THREE.SphereGeometry(0.3 * scale, 8, 8),
                new THREE.MeshStandardMaterial({ color: '#b0a890', roughness: 0.7 })
            );
            skull.position.y = 1.6 * scale;
            group.add(skull);
            // Eye sockets — dark recesses
            const eyeMat = new THREE.MeshBasicMaterial({ color: '#ff0000' });
            const eyeGeo = new THREE.SphereGeometry(0.06 * scale, 4, 4);
            const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
            eyeL.position.set(-0.1 * scale, 1.65 * scale, 0.22 * scale);
            group.add(eyeL);
            const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
            eyeR.position.set(0.1 * scale, 1.65 * scale, 0.22 * scale);
            group.add(eyeR);
            // Torso — ribcage cylinder
            const torso = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2 * scale, 0.15 * scale, 0.7 * scale, 6),
                new THREE.MeshStandardMaterial({ color: '#a09878', roughness: 0.8 })
            );
            torso.position.y = 1.0 * scale;
            group.add(torso);
            // Legs
            const legMat = new THREE.MeshStandardMaterial({ color: '#908868' });
            const legGeo = new THREE.CylinderGeometry(0.06 * scale, 0.05 * scale, 0.6 * scale, 4);
            const legL = new THREE.Mesh(legGeo, legMat);
            legL.position.set(-0.1 * scale, 0.3 * scale, 0);
            group.add(legL);
            const legR = new THREE.Mesh(legGeo, legMat);
            legR.position.set(0.1 * scale, 0.3 * scale, 0);
            group.add(legR);
            break;
        }
        case 'archerSkeleton': {
            // Same as skeleton but with bow
            const skull = new THREE.Mesh(
                new THREE.SphereGeometry(0.28 * scale, 8, 8),
                new THREE.MeshStandardMaterial({ color: '#a09878', roughness: 0.7 })
            );
            skull.position.y = 1.5 * scale;
            group.add(skull);
            const torso = new THREE.Mesh(
                new THREE.CylinderGeometry(0.18 * scale, 0.12 * scale, 0.6 * scale, 6),
                new THREE.MeshStandardMaterial({ color: '#a09878' })
            );
            torso.position.y = 0.95 * scale;
            group.add(torso);
            // Bow
            const bowMat = new THREE.MeshStandardMaterial({ color: '#8b6b4a' });
            const bow = new THREE.Mesh(
                new THREE.TorusGeometry(0.3 * scale, 0.03, 4, 12, Math.PI),
                bowMat
            );
            bow.position.set(0.3 * scale, 1.2 * scale, 0);
            bow.rotation.z = Math.PI / 2;
            group.add(bow);
            break;
        }
        case 'slime': {
            const body = new THREE.Mesh(
                new THREE.SphereGeometry(0.4 * scale, 12, 8),
                new THREE.MeshStandardMaterial({
                    color: '#3a7a3a', roughness: 0.3, metalness: 0.1,
                    transparent: true, opacity: 0.85
                })
            );
            body.position.y = 0.4 * scale;
            body.scale.y = 0.7; // squished
            group.add(body);
            // Eyes
            const eyeMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
            const eyeGeo = new THREE.SphereGeometry(0.08 * scale, 6, 6);
            const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
            eyeL.position.set(-0.12 * scale, 0.45 * scale, 0.3 * scale);
            group.add(eyeL);
            const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
            eyeR.position.set(0.12 * scale, 0.45 * scale, 0.3 * scale);
            group.add(eyeR);
            break;
        }
        case 'bat': {
            const body = new THREE.Mesh(
                new THREE.SphereGeometry(0.2 * scale, 6, 6),
                new THREE.MeshStandardMaterial({ color: '#5a4a6a' })
            );
            body.position.y = 2.0;
            group.add(body);
            // Wings
            const wingMat = new THREE.MeshStandardMaterial({
                color: '#3a2a4a', side: THREE.DoubleSide, transparent: true, opacity: 0.7
            });
            const wingGeo = new THREE.PlaneGeometry(0.5 * scale, 0.3 * scale);
            const wingL = new THREE.Mesh(wingGeo, wingMat);
            wingL.position.set(-0.35 * scale, 2.0, 0);
            wingL.rotation.y = 0.3;
            group.add(wingL);
            const wingR = new THREE.Mesh(wingGeo, wingMat);
            wingR.position.set(0.35 * scale, 2.0, 0);
            wingR.rotation.y = -0.3;
            group.add(wingR);
            // Red eyes
            const eyeMat = new THREE.MeshBasicMaterial({ color: '#ff0044' });
            const eyeGeo = new THREE.SphereGeometry(0.04, 4, 4);
            group.add(new THREE.Mesh(eyeGeo, eyeMat).translateX(-0.08).translateY(2.05).translateZ(0.15));
            group.add(new THREE.Mesh(eyeGeo, eyeMat).translateX(0.08).translateY(2.05).translateZ(0.15));
            group.userData.wingL = wingL;
            group.userData.wingR = wingR;
            break;
        }
        case 'darkKnight': {
            // Helmet
            const helmet = new THREE.Mesh(
                new THREE.SphereGeometry(0.32 * scale, 8, 8),
                new THREE.MeshStandardMaterial({ color: '#2a2a3a', metalness: 0.6, roughness: 0.3 })
            );
            helmet.position.y = 1.7 * scale;
            group.add(helmet);
            // Visor slit
            const visor = new THREE.Mesh(
                new THREE.BoxGeometry(0.25 * scale, 0.05 * scale, 0.05),
                new THREE.MeshBasicMaterial({ color: '#ff2222' })
            );
            visor.position.set(0, 1.72 * scale, 0.28 * scale);
            group.add(visor);
            // Armored body
            const body = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3 * scale, 0.25 * scale, 0.9 * scale, 8),
                new THREE.MeshStandardMaterial({ color: '#3a3a4a', metalness: 0.5, roughness: 0.4 })
            );
            body.position.y = 1.05 * scale;
            group.add(body);
            // Shield
            const shield = new THREE.Mesh(
                new THREE.BoxGeometry(0.05, 0.5 * scale, 0.35 * scale),
                new THREE.MeshStandardMaterial({ color: '#2a2a3a', metalness: 0.4 })
            );
            shield.position.set(-0.35 * scale, 1.1 * scale, 0);
            group.add(shield);
            // Legs
            const legMat = new THREE.MeshStandardMaterial({ color: '#2a2a3a', metalness: 0.3 });
            const legGeo = new THREE.CylinderGeometry(0.1 * scale, 0.08 * scale, 0.6 * scale, 6);
            group.add(new THREE.Mesh(legGeo, legMat).translateX(-0.12 * scale).translateY(0.3 * scale));
            group.add(new THREE.Mesh(legGeo, legMat).translateX(0.12 * scale).translateY(0.3 * scale));
            break;
        }
        case 'necromancer': {
            // Robe (cone)
            const robe = new THREE.Mesh(
                new THREE.ConeGeometry(0.35 * scale, 1.2 * scale, 8),
                new THREE.MeshStandardMaterial({ color: '#5a2a5a' })
            );
            robe.position.y = 0.6 * scale;
            group.add(robe);
            // Head
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.22 * scale, 8, 8),
                new THREE.MeshStandardMaterial({ color: '#4a1a4a' })
            );
            head.position.y = 1.4 * scale;
            group.add(head);
            // Glowing eyes
            const eyeMat = new THREE.MeshBasicMaterial({ color: '#aa00ff' });
            const eyeGeo = new THREE.SphereGeometry(0.05 * scale, 4, 4);
            group.add(new THREE.Mesh(eyeGeo, eyeMat).translateX(-0.08 * scale).translateY(1.45 * scale).translateZ(0.16 * scale));
            group.add(new THREE.Mesh(eyeGeo, eyeMat).translateX(0.08 * scale).translateY(1.45 * scale).translateZ(0.16 * scale));
            // Staff with orb
            const staff = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.03, 1.5 * scale, 4),
                new THREE.MeshStandardMaterial({ color: '#3a1a2a' })
            );
            staff.position.set(0.3 * scale, 0.75 * scale, 0);
            group.add(staff);
            const orb = new THREE.Mesh(
                new THREE.SphereGeometry(0.1 * scale, 8, 8),
                new THREE.MeshBasicMaterial({ color: '#aa00ff' })
            );
            orb.position.set(0.3 * scale, 1.55 * scale, 0);
            group.add(orb);
            break;
        }
        default: {
            // Fallback — colored sphere
            const fb = new THREE.Mesh(
                new THREE.SphereGeometry(0.35 * scale, 8, 8),
                new THREE.MeshStandardMaterial({ color: '#888888' })
            );
            fb.position.y = 0.8 * scale;
            group.add(fb);
        }
    }

    return group;
}

// Billboard: rotate enemy to face camera on Y axis
export function billboardEnemy(mesh, cameraPos) {
    mesh.lookAt(cameraPos.x, mesh.position.y, cameraPos.z);
}

// Animate bat wings, slime squish, etc.
export function animateEnemyMesh(mesh, enemyType, time) {
    if (enemyType === 'bat' && mesh.userData.wingL) {
        const flap = Math.sin(time * 0.012) * 0.6;
        mesh.userData.wingL.rotation.y = 0.3 + flap;
        mesh.userData.wingR.rotation.y = -0.3 - flap;
    }
    if (enemyType === 'slime') {
        const squish = 1 + Math.sin(time * 0.005) * 0.1;
        mesh.scale.y = 0.7 * squish;
        mesh.scale.x = 1 / squish;
        mesh.scale.z = 1 / squish;
    }
}
