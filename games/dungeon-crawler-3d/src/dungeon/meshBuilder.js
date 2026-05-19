// ═══════════════════════════════════════════════════════════════
//  MESH BUILDER — converts tile grid into Three.js geometry
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { TILE, WALL_HEIGHT, MAP_COLS, MAP_ROWS, PAL } from '../constants.js';

// Grimy abandoned-lab floor: dirty tiles, grout, rust/blood stains, scuffs
function createFloorTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Dirty grey-green tile base
    ctx.fillStyle = '#1c1d18';
    ctx.fillRect(0, 0, size, size);

    // Mottled grime / worn patches
    for (let i = 0; i < 14; i++) {
        const g = 0.04 + Math.random() * 0.06;
        ctx.fillStyle = Math.random() < 0.5
            ? `rgba(8,8,5,${g})` : `rgba(60,62,52,${g * 0.7})`;
        const r = size * (0.12 + Math.random() * 0.3);
        ctx.beginPath();
        ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // 2x2 tile grid with recessed dark grout lines
    ctx.strokeStyle = 'rgba(6,6,4,0.85)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);
    ctx.beginPath();
    ctx.moveTo(size / 2, 0); ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2); ctx.lineTo(size, size / 2);
    ctx.stroke();
    // Faint worn highlight on the grout's upper edge
    ctx.strokeStyle = 'rgba(70,72,60,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, size / 2 - 1.5); ctx.lineTo(size, size / 2 - 1.5);
    ctx.stroke();

    // Cracks spidering across a tile
    ctx.strokeStyle = 'rgba(4,4,3,0.7)';
    ctx.lineWidth = 1;
    for (let c = 0; c < 3; c++) {
        let cx = Math.random() * size, cy = Math.random() * size;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        for (let s = 0; s < 5; s++) {
            cx += (Math.random() - 0.5) * 26;
            cy += (Math.random() - 0.5) * 26;
            ctx.lineTo(cx, cy);
        }
        ctx.stroke();
    }

    // Old rust / dried-blood stains
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = Math.random() < 0.5
            ? `rgba(58,12,8,${0.12 + Math.random() * 0.14})`   // rust
            : `rgba(70,2,12,${0.12 + Math.random() * 0.16})`;  // dried blood
        const r = size * (0.08 + Math.random() * 0.18);
        ctx.beginPath();
        ctx.ellipse(Math.random() * size, Math.random() * size,
            r, r * (0.5 + Math.random() * 0.5), Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }

    // Scuff scratches
    ctx.strokeStyle = 'rgba(90,92,78,0.10)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
        const x = Math.random() * size, y = Math.random() * size;
        const a = Math.random() * Math.PI, len = 10 + Math.random() * 30;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.stroke();
    }

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

    // Grimy grey lab concrete
    ctx.fillStyle = '#7c7c86';
    ctx.fillRect(0, 0, size, size);

    // Blotchy grime / water damage
    for (let i = 0; i < 9; i++) {
        const g = 0.05 + Math.random() * 0.09;
        ctx.fillStyle = Math.random() < 0.55
            ? `rgba(20,20,16,${g})` : `rgba(110,112,100,${g * 0.6})`;
        const r = size * (0.15 + Math.random() * 0.35);
        ctx.beginPath();
        ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Panel seams — darker grey so they still read on the grimy wall
    ctx.strokeStyle = 'rgba(34,34,40,0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(2, 2, size - 4, size - 4);
    ctx.beginPath();
    ctx.moveTo(size / 2, 2); ctx.lineTo(size / 2, size - 2);
    ctx.stroke();

    // Vertical rust / drip streaks running down from the top
    for (let i = 0; i < 5; i++) {
        const x = Math.random() * size;
        const w = 0.6 + Math.random() * 2.2;
        const h = size * (0.3 + Math.random() * 0.6);
        ctx.fillStyle = Math.random() < 0.5
            ? `rgba(48,18,8,${0.10 + Math.random() * 0.14})`   // rust
            : `rgba(60,4,12,${0.10 + Math.random() * 0.12})`;  // bled-through stain
        ctx.fillRect(x, 0, w, h);
    }

    // Hairline cracks
    ctx.strokeStyle = 'rgba(18,18,16,0.6)';
    ctx.lineWidth = 1;
    for (let c = 0; c < 2; c++) {
        let cx = Math.random() * size, cy = Math.random() * size;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        for (let s = 0; s < 4; s++) {
            cx += (Math.random() - 0.5) * 18;
            cy += 6 + Math.random() * 12;
            ctx.lineTo(cx, cy);
        }
        ctx.stroke();
    }

    // Faded hazard chevron stripe near the top of some panels
    if (Math.random() < 0.5) {
        ctx.strokeStyle = 'rgba(140,110,0,0.16)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let x = -size; x < size; x += 10) {
            ctx.moveTo(x, 10); ctx.lineTo(x + 6, 4);
        }
        ctx.stroke();
    }

    // Dim red emergency baseboard strip (replaces the cyan neon edge)
    ctx.fillStyle = 'rgba(120,12,18,0.30)';
    ctx.fillRect(0, size - 3, size, 3);

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

    // Dim red emergency strip at the base of every wall (was cyan neon)
    const neonEdgeMat = new THREE.MeshBasicMaterial({
        color: '#7a0c12',
        transparent: true,
        opacity: 0.35,
    });

    // Grimy off-white lab wall panel (was bright grey #999999)
    const panelMat = new THREE.MeshBasicMaterial({
        color: '#7d7a6e',
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
