// ═══════════════════════════════════════════════════════════════
//  DUNGEON GENERATOR — ported verbatim from 2D game
// ═══════════════════════════════════════════════════════════════

import { ROOM_MIN, ROOM_MAX, MAP_COLS, MAP_ROWS } from '../constants.js';

export function generateDungeon(floor) {
    const map = [];
    for (let r = 0; r < MAP_ROWS; r++) {
        map[r] = [];
        for (let c = 0; c < MAP_COLS; c++) map[r][c] = 0; // 0=wall
    }

    const rooms = [];
    const numRooms = 8 + floor * 2;

    // Place rooms
    for (let attempt = 0; attempt < 200 && rooms.length < numRooms; attempt++) {
        const w = ROOM_MIN + Math.floor(Math.random() * (ROOM_MAX - ROOM_MIN));
        const h = ROOM_MIN + Math.floor(Math.random() * (ROOM_MAX - ROOM_MIN));
        const x = 2 + Math.floor(Math.random() * (MAP_COLS - w - 4));
        const y = 2 + Math.floor(Math.random() * (MAP_ROWS - h - 4));

        let overlap = false;
        for (const rm of rooms) {
            if (x < rm.x + rm.w + 2 && x + w + 2 > rm.x && y < rm.y + rm.h + 2 && y + h + 2 > rm.y) {
                overlap = true; break;
            }
        }
        if (overlap) continue;

        const roomType = rooms.length === 0 ? 'start' :
            rooms.length === numRooms - 1 ? 'boss' :
            Math.random() < 0.15 ? 'treasure' :
            Math.random() < 0.1 ? 'shop' : 'combat';

        rooms.push({ x, y, w, h, type: roomType, explored: false, enemies: [],
            cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) });

        for (let ry = y; ry < y + h; ry++)
            for (let rx = x; rx < x + w; rx++)
                map[ry][rx] = 1; // 1=floor
    }

    // Connect rooms with corridors
    for (let i = 1; i < rooms.length; i++) {
        const a = rooms[i - 1], b = rooms[i];
        let cx = a.cx, cy = a.cy;
        while (cx !== b.cx) {
            if (cy >= 0 && cy < MAP_ROWS && cx >= 0 && cx < MAP_COLS) map[cy][cx] = 1;
            cx += cx < b.cx ? 1 : -1;
        }
        while (cy !== b.cy) {
            if (cy >= 0 && cy < MAP_ROWS && cx >= 0 && cx < MAP_COLS) map[cy][cx] = 1;
            cy += cy < b.cy ? 1 : -1;
        }
    }

    // Place torches in rooms
    const torches = [];
    for (const rm of rooms) {
        if (rm.type === 'start' || rm.type === 'boss' || rm.type === 'treasure' || rm.type === 'shop') {
            torches.push({ x: rm.x + 1, y: rm.y + 1 });
            torches.push({ x: rm.x + rm.w - 2, y: rm.y + 1 });
            torches.push({ x: rm.x + 1, y: rm.y + rm.h - 2 });
            torches.push({ x: rm.x + rm.w - 2, y: rm.y + rm.h - 2 });
        } else {
            if (Math.random() < 0.5) torches.push({ x: rm.x + 1, y: rm.y + 1 });
            if (Math.random() < 0.5) torches.push({ x: rm.x + rm.w - 2, y: rm.y + rm.h - 2 });
        }
    }

    return { map, rooms, torches, floor };
}

export function isWalkable(map, px, pz) {
    const col = Math.floor(px);
    const row = Math.floor(pz);
    if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return false;
    return map[row][col] === 1;
}

export function getRoomAt(rooms, px, pz) {
    const col = Math.floor(px);
    const row = Math.floor(pz);
    for (const rm of rooms) {
        if (col >= rm.x && col < rm.x + rm.w && row >= rm.y && row < rm.y + rm.h) return rm;
    }
    return null;
}
