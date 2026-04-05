// ==========================================================================
// HexGrid — Hex coordinate math (axial coordinates) with isometric projection
//
// Uses flat-top hexagons with axial (q, r) coordinates.
// Isometric 2.5D: Y-axis compressed by ISO_Y_SCALE for pseudo-3D feel.
// Elevation offset shifts tiles vertically based on terrain height.
// ==========================================================================

export const HEX_SIZE = 28;

const SQRT3 = Math.sqrt(3);

// Y scale (1.0 = flat top-down, <1.0 = isometric tilt)
export const ISO_Y_SCALE = 1.0;

// Elevation step in pixels (0 = disabled)
export const ELEVATION_STEP = 0;

// Terrain elevation map
export const TERRAIN_ELEVATION = {
  water: -1, coast: 0, river: -1, marsh: 0,
  plains: 1, farmland: 1, disused: 1, desert: 1,
  forest: 2, urban: 2, ruins: 1,
  mountain: 4, snow: 3,
};

/**
 * Convert axial hex (q, r) to isometric pixel (x, y) center point.
 * Applies Y compression for 2.5D look.
 * @param {number} elevation — terrain elevation level (0-4)
 */
export function hexToPixel(q, r, size = HEX_SIZE, elevation = 0) {
  const x = size * (3 / 2 * q);
  const flatY = size * (SQRT3 / 2 * q + SQRT3 * r);
  const y = flatY * ISO_Y_SCALE - elevation * ELEVATION_STEP;
  return { x, y };
}

/**
 * Convert pixel (x, y) to fractional axial hex (q, r).
 * Inverts the isometric Y compression.
 */
export function pixelToHex(px, py, size = HEX_SIZE) {
  const flatPy = py / ISO_Y_SCALE; // Undo Y compression
  const q = (2 / 3 * px) / size;
  const r = (-1 / 3 * px + SQRT3 / 3 * flatPy) / size;
  return { q, r };
}

/**
 * Round fractional axial coords to nearest hex.
 */
export function hexRound(q, r) {
  const x = q;
  const z = r;
  const y = -x - z;

  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);

  const xDiff = Math.abs(rx - x);
  const yDiff = Math.abs(ry - y);
  const zDiff = Math.abs(rz - z);

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  return { q: rx, r: rz };
}

export const HEX_DIRECTIONS = [
  { q: 1, r: 0 },   // E
  { q: 1, r: -1 },  // NE
  { q: 0, r: -1 },  // NW
  { q: -1, r: 0 },  // W
  { q: -1, r: 1 },  // SW
  { q: 0, r: 1 },   // SE
];

export function hexNeighbors(q, r) {
  return HEX_DIRECTIONS.map(d => ({ q: q + d.q, r: r + d.r }));
}

export function hexDistance(q1, r1, q2, r2) {
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}

/**
 * Get the 6 corner pixel positions of an isometric hex at (cx, cy).
 * Y coordinates are compressed by ISO_Y_SCALE.
 */
export function hexCorners(cx, cy, size = HEX_SIZE) {
  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 180 * (60 * i);
    corners.push({
      x: cx + size * Math.cos(angle),
      y: cy + size * Math.sin(angle) * ISO_Y_SCALE,
    });
  }
  return corners;
}

/**
 * Draw an isometric hex path on a canvas context.
 */
export function hexPath(ctx, cx, cy, size = HEX_SIZE) {
  const corners = hexCorners(cx, cy, size);
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 6; i++) {
    ctx.lineTo(corners[i].x, corners[i].y);
  }
  ctx.closePath();
}

/**
 * Get flat (non-isometric) Y for a hex — used for back-to-front sorting.
 */
export function hexSortDepth(q, r) {
  return SQRT3 / 2 * q + SQRT3 * r;
}
