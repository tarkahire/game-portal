// ═══════════════════════════════════════════════════════════════
//  CONSTANTS — shared config for 3D dungeon crawler
// ═══════════════════════════════════════════════════════════════

export const TILE = 4;          // 3D world units per tile
export const WALL_HEIGHT = 4;   // wall height in world units
export const ROOM_MIN = 9, ROOM_MAX = 16;
export const MAP_COLS = 120, MAP_ROWS = 120;
export const MAX_FLOORS = Infinity;
export const EYE_HEIGHT = 2.4;  // camera Y position
export const PLAYER_RADIUS = 0.4; // collision radius in tile units

// Cyberpunk color palette
export const PAL = {
    floor: '#0a0a14',
    wall: '#04040c',
    wallTop: '#1a1a2e',
    fog: '#020208',
    blood: '#ff0055',
    torchCyan: '#00ffcc',
    torchPink: '#ff0080',
    hpBar: '#ff0055',
    xpBar: '#ff00ff',
    neonCyan: '#00ffee',
    neonPink: '#ff0080',
    neonPurple: '#aa00ff',
    neonYellow: '#eeff00',
    ambient: '#080818',
};
