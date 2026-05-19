// ═══════════════════════════════════════════════════════════════
//  CONSTANTS — shared config for 3D dungeon crawler
// ═══════════════════════════════════════════════════════════════

export const TILE = 4;          // 3D world units per tile
export const WALL_HEIGHT = 4;   // wall height in world units
export const ROOM_MIN = 9, ROOM_MAX = 16;
export const MAP_COLS = 80, MAP_ROWS = 80;
export const MAX_FLOORS = Infinity;
export const EYE_HEIGHT = 2.4;  // camera Y position
export const PLAYER_RADIUS = 0.4; // collision radius in tile units

// Abandoned-lab horror palette (was cyberpunk neon).
// torchCyan/torchPink + neon* keys are reused as the new theme colours so
// existing references keep working — they now read as hazard/emergency tones.
export const PAL = {
    floor: '#1c1d18',          // dirty grey-green lab tile
    wall: '#22231d',           // grimy concrete
    wallTop: '#34352c',
    fog: '#070806',            // murky near-black
    blood: '#6a0010',          // dried blood
    torchCyan: '#ff2e1a',      // emergency alarm red (primary lamp)
    torchPink: '#7dff4a',      // sickly toxic green (secondary lamp)
    hpBar: '#8a0014',
    xpBar: '#6abf3a',
    neonCyan: '#6abf3a',       // sickly green accents
    neonPink: '#8a0014',       // blood accents
    neonPurple: '#4a2a5a',
    neonYellow: '#d9b300',     // hazard amber
    ambient: '#14130f',
};
