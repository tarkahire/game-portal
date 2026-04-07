// ═══════════════════════════════════════════════════════════════
//  MESH BUILDER — converts tile grid into Three.js geometry
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { TILE, WALL_HEIGHT, MAP_COLS, MAP_ROWS, PAL } from '../constants.js';

// Create a cyberpunk circuit-board floor texture procedurally
function createFloorTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Dark base
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, size, size);

    // Subtle tile variation
    for (let i = 0; i < 4; i++) {
        ctx.fillStyle = `rgba(0,255,200,${0.02 + Math.random() * 0.02})`;
        ctx.fillRect(Math.random() * size, Math.random() * size, size * 0.5, size * 0.5);
    }

    // Neon grid lines
    ctx.strokeStyle = 'rgba(0,255,200,0.06)';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, size - 2, size - 2);

    // Circuit traces
    ctx.strokeStyle = 'rgba(0,255,200,0.08)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, size / 2); ctx.lineTo(size, size / 2);
    ctx.moveTo(size / 2, 0); ctx.lineTo(size / 2, size);
    ctx.stroke();

    // Pink accent traces
    ctx.strokeStyle = 'rgba(255,0,128,0.05)';
    ctx.beginPath();
    ctx.moveTo(size * 0.25, 0); ctx.lineTo(size * 0.25, size);
    ctx.moveTo(0, size * 0.75); ctx.lineTo(size, size * 0.75);
    ctx.stroke();

    // Neon dots at intersections
    ctx.fillStyle = 'rgba(0,255,200,0.12)';
    ctx.fillRect(size / 2 - 1, size / 2 - 1, 2, 2);
    ctx.fillRect(size * 0.25 - 1, size * 0.75 - 1, 2, 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.NearestFilter;
    return tex;
}

function createWallTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#04040c';
    ctx.fillRect(0, 0, size, size);

    // Subtle panel lines
    ctx.strokeStyle = 'rgba(26,26,46,0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(2, 2, size - 4, size - 4);
    ctx.beginPath();
    ctx.moveTo(size / 2, 2); ctx.lineTo(size / 2, size - 2);
    ctx.stroke();

    // Neon edge at bottom
    ctx.fillStyle = 'rgba(0,255,200,0.15)';
    ctx.fillRect(0, size - 2, size, 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.NearestFilter;
    return tex;
}

export function buildDungeonMesh(dungeon) {
    const group = new THREE.Group();
    const { map } = dungeon;

    const floorTex = createFloorTexture();
    const wallTex = createWallTexture();

    const floorMat = new THREE.MeshStandardMaterial({
        map: floorTex,
        roughness: 0.9,
        metalness: 0.1,
    });

    const wallMat = new THREE.MeshStandardMaterial({
        map: wallTex,
        roughness: 0.85,
        metalness: 0.15,
    });

    const ceilMat = new THREE.MeshStandardMaterial({
        color: '#020208',
        roughness: 1,
        metalness: 0,
    });

    const neonEdgeMat = new THREE.MeshBasicMaterial({
        color: '#00ffcc',
        transparent: true,
        opacity: 0.15,
    });

    // Bright grey wall panel material — emissive so it glows without needing lights
    const panelMat = new THREE.MeshBasicMaterial({
        color: '#999999',
    });

    // Collect geometry for merging
    const floorGeos = [];
    const ceilGeos = [];
    const wallGeos = [];
    const neonEdgeGeos = [];
    const panelGeos = [];

    const floorGeo = new THREE.PlaneGeometry(TILE, TILE);
    floorGeo.rotateX(-Math.PI / 2);

    const ceilGeo = new THREE.PlaneGeometry(TILE, TILE);
    ceilGeo.rotateX(Math.PI / 2);

    for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
            if (map[r][c] !== 1) continue;

            const x = c * TILE + TILE / 2;
            const z = r * TILE + TILE / 2;

            // Floor
            const fg = floorGeo.clone();
            fg.translate(x, 0, z);
            floorGeos.push(fg);

            // Ceiling — removed for open sky

            // Walls — check each neighbor
            const neighbors = [
                { dr: -1, dc: 0, axis: 'z', dir: -1 }, // north
                { dr: 1, dc: 0, axis: 'z', dir: 1 },   // south
                { dr: 0, dc: -1, axis: 'x', dir: -1 },  // west
                { dr: 0, dc: 1, axis: 'x', dir: 1 },    // east
            ];

            for (const n of neighbors) {
                const nr = r + n.dr, nc = c + n.dc;
                const isWall = nr < 0 || nr >= MAP_ROWS || nc < 0 || nc >= MAP_COLS || map[nr][nc] === 0;
                if (!isWall) continue;

                const wg = new THREE.PlaneGeometry(TILE, WALL_HEIGHT);
                wg.translate(0, WALL_HEIGHT / 2, 0);

                if (n.axis === 'z') {
                    // North/South wall
                    if (n.dir === -1) {
                        // North wall — face south
                        wg.translate(x, 0, z - TILE / 2);
                    } else {
                        // South wall — face north
                        wg.rotateY(Math.PI);
                        wg.translate(x, 0, z + TILE / 2);
                    }
                } else {
                    // West/East wall
                    if (n.dir === -1) {
                        // West wall — face east
                        wg.rotateY(Math.PI / 2);
                        wg.translate(x - TILE / 2, 0, z);
                    } else {
                        // East wall — face west
                        wg.rotateY(-Math.PI / 2);
                        wg.translate(x + TILE / 2, 0, z);
                    }
                }

                wallGeos.push(wg);

                // Neon edge strip at base of wall
                const eg = new THREE.PlaneGeometry(TILE, 0.08);
                if (n.axis === 'z') {
                    if (n.dir === -1) {
                        eg.translate(x, 0.04, z - TILE / 2 + 0.01);
                    } else {
                        eg.rotateY(Math.PI);
                        eg.translate(x, 0.04, z + TILE / 2 - 0.01);
                    }
                } else {
                    if (n.dir === -1) {
                        eg.rotateY(Math.PI / 2);
                        eg.translate(x - TILE / 2 + 0.01, 0.04, z);
                    } else {
                        eg.rotateY(-Math.PI / 2);
                        eg.translate(x + TILE / 2 - 0.01, 0.04, z);
                    }
                }
                neonEdgeGeos.push(eg);

                // Bright grey wall panel — centered on wall, slightly inset
                const pw = TILE * 0.5, ph = WALL_HEIGHT * 0.3;
                const pg = new THREE.PlaneGeometry(pw, ph);
                const panelY = WALL_HEIGHT * 0.55;
                const inset = 0.02; // slightly in front of wall
                if (n.axis === 'z') {
                    if (n.dir === -1) {
                        pg.translate(x, panelY, z - TILE / 2 + inset);
                    } else {
                        pg.rotateY(Math.PI);
                        pg.translate(x, panelY, z + TILE / 2 - inset);
                    }
                } else {
                    if (n.dir === -1) {
                        pg.rotateY(Math.PI / 2);
                        pg.translate(x - TILE / 2 + inset, panelY, z);
                    } else {
                        pg.rotateY(-Math.PI / 2);
                        pg.translate(x + TILE / 2 - inset, panelY, z);
                    }
                }
                panelGeos.push(pg);
            }
        }
    }

    // Merge geometries for performance
    if (floorGeos.length > 0) {
        const merged = mergeGeometries(floorGeos);
        group.add(new THREE.Mesh(merged, floorMat));
    }
    if (ceilGeos.length > 0) {
        const merged = mergeGeometries(ceilGeos);
        group.add(new THREE.Mesh(merged, ceilMat));
    }
    if (wallGeos.length > 0) {
        const merged = mergeGeometries(wallGeos);
        group.add(new THREE.Mesh(merged, wallMat));
    }
    if (neonEdgeGeos.length > 0) {
        const merged = mergeGeometries(neonEdgeGeos);
        group.add(new THREE.Mesh(merged, neonEdgeMat));
    }
    if (panelGeos.length > 0) {
        const merged = mergeGeometries(panelGeos);
        group.add(new THREE.Mesh(merged, panelMat));
    }

    return group;
}

// Simple geometry merge — combine buffer geometries into one
function mergeGeometries(geos) {
    let totalVerts = 0, totalIdx = 0;
    for (const g of geos) {
        totalVerts += g.attributes.position.count;
        totalIdx += g.index ? g.index.count : g.attributes.position.count;
    }

    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    const uvs = new Float32Array(totalVerts * 2);
    const indices = new Uint32Array(totalIdx);

    let vertOffset = 0, idxOffset = 0, vertCount = 0;

    for (const g of geos) {
        const pos = g.attributes.position.array;
        const norm = g.attributes.normal.array;
        const uv = g.attributes.uv ? g.attributes.uv.array : null;
        const idx = g.index ? g.index.array : null;
        const count = g.attributes.position.count;

        positions.set(pos, vertOffset * 3);
        normals.set(norm, vertOffset * 3);
        if (uv) uvs.set(uv, vertOffset * 2);

        if (idx) {
            for (let i = 0; i < idx.length; i++) {
                indices[idxOffset + i] = idx[i] + vertCount;
            }
            idxOffset += idx.length;
        } else {
            for (let i = 0; i < count; i++) {
                indices[idxOffset + i] = i + vertCount;
            }
            idxOffset += count;
        }

        vertOffset += count;
        vertCount += count;
        g.dispose();
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    merged.setIndex(new THREE.BufferAttribute(indices, 1));
    return merged;
}
