// ═══════════════════════════════════════════════════════════════
//  TORCH LIGHTS — point lights at torch positions with flicker
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { TILE, WALL_HEIGHT, PAL } from '../constants.js';

export function createTorchLights(dungeon, scene) {
    const lights = [];

    for (let i = 0; i < dungeon.torches.length; i++) {
        const torch = dungeon.torches[i];
        const x = torch.x * TILE + TILE / 2;
        const z = torch.y * TILE + TILE / 2;
        const y = WALL_HEIGHT * 0.7;

        // Alternate cyan and pink
        const isCyan = (torch.x + torch.y) % 2 === 0;
        const color = isCyan ? PAL.torchCyan : PAL.torchPink;

        // Point light
        const light = new THREE.PointLight(color, 8.5, TILE * 14, 0.7);
        light.position.set(x, y, z);
        light._torchIndex = i;
        light._baseIntensity = 8.5;
        scene.add(light);
        lights.push(light);

        // Lamps are invisible — only the point light remains. The visible
        // orb + pillar geometry was removed by request; lighting is unchanged.
    }

    return lights;
}

// PERF budget: at most this many torch PointLights stay enabled at once.
// Three.js cost scales with active-light count; far torches contribute nothing visible anyway.
const TORCH_LIGHT_BUDGET = 6;
const _torchSort = [];

export function updateTorchLights(lights, time, cameraPos) {
    // Failing emergency lights — erratic flicker + occasional brownout/dropout
    // (cheap math, no light cost). Horror cue: the power is dying.
    for (const light of lights) {
        const i = light._torchIndex;
        // Layered noise so no two lamps pulse in sync
        const wob = Math.sin(time * 0.011 + i * 2.0)
                  + Math.sin(time * 0.047 + i * 5.3) * 0.5
                  + Math.sin(time * 0.123 + i) * 0.25;
        let mul = 0.78 + wob * 0.16;
        // Brief stutter dropouts — light cuts to a dim ember then snaps back
        const drop = Math.sin(time * 0.0017 + i * 3.1);
        if (drop > 0.93) mul *= 0.18;
        else if (drop > 0.88) mul *= 0.55;
        light.intensity = light._baseIntensity * Math.max(0.12, mul);
    }

    if (!cameraPos) return;

    // Pick the nearest N "candidates" (room explored + in scene) and disable the rest.
    _torchSort.length = 0;
    for (const light of lights) {
        if (!light._roomExplored) { light.visible = false; continue; }
        const dx = light.position.x - cameraPos.x;
        const dz = light.position.z - cameraPos.z;
        _torchSort.push({ light, d2: dx * dx + dz * dz });
    }
    _torchSort.sort((a, b) => a.d2 - b.d2);
    for (let i = 0; i < _torchSort.length; i++) {
        _torchSort[i].light.visible = i < TORCH_LIGHT_BUDGET;
    }
}

// Mark which torches are in explored rooms; the per-frame budget step then picks the nearest few.
export function syncTorchVisibility(lights, dungeon) {
    for (const light of lights) {
        const torch = dungeon.torches[light._torchIndex];
        let explored = false;
        for (const rm of dungeon.rooms) {
            if (rm.explored && torch.x >= rm.x - 1 && torch.x <= rm.x + rm.w &&
                torch.y >= rm.y - 1 && torch.y <= rm.y + rm.h) {
                explored = true; break;
            }
        }
        light._roomExplored = explored;
        if (!explored) light.visible = false; // never enable un-explored torch lights
    }
}
