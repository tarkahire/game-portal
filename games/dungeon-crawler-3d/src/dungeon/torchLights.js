// ═══════════════════════════════════════════════════════════════
//  TORCH LIGHTS — point lights at torch positions with flicker
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { TILE, WALL_HEIGHT, PAL } from '../constants.js';

export function createTorchLights(dungeon, scene) {
    const lights = [];
    const torchMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9 });
    const torchGeo = new THREE.SphereGeometry(0.12, 8, 8);

    for (let i = 0; i < dungeon.torches.length; i++) {
        const torch = dungeon.torches[i];
        const x = torch.x * TILE + TILE / 2;
        const z = torch.y * TILE + TILE / 2;
        const y = WALL_HEIGHT * 0.7;

        // Alternate cyan and pink
        const isCyan = (torch.x + torch.y) % 2 === 0;
        const color = isCyan ? PAL.torchCyan : PAL.torchPink;

        // Point light
        const light = new THREE.PointLight(color, 3.0, TILE * 7, 1.2);
        light.position.set(x, y, z);
        light._torchIndex = i;
        light._baseIntensity = 3.0;
        scene.add(light);
        lights.push(light);

        // Visible orb
        const orbMat = torchMat.clone();
        orbMat.color = new THREE.Color(color);
        const orb = new THREE.Mesh(torchGeo, orbMat);
        orb.position.set(x, y, z);
        scene.add(orb);

        // Pillar below orb
        const pillarGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 4);
        const pillarMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.3 });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(x, y - 0.3, z);
        scene.add(pillar);
    }

    return lights;
}

export function updateTorchLights(lights, time) {
    for (const light of lights) {
        const pulse = Math.sin(time * 0.008 + light._torchIndex * 2) * 0.3;
        light.intensity = light._baseIntensity + pulse * 0.5;
    }
}

// Enable/disable lights based on room exploration
export function syncTorchVisibility(lights, dungeon) {
    for (const light of lights) {
        const torch = dungeon.torches[light._torchIndex];
        // Find which room this torch belongs to
        let visible = false;
        for (const rm of dungeon.rooms) {
            if (rm.explored && torch.x >= rm.x - 1 && torch.x <= rm.x + rm.w &&
                torch.y >= rm.y - 1 && torch.y <= rm.y + rm.h) {
                visible = true; break;
            }
        }
        light.visible = visible;
    }
}
