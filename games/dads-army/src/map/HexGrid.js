// ==========================================================================
// HexGrid — Hex coordinate math (axial coordinates)
//
// Uses flat-top hexagons with axial (q, r) coordinates.
// Provides conversion between hex coords and pixel coords,
// distance calculation, neighbor lookup, and pixel-to-hex picking.
// ==========================================================================

// Hex size in pixels (center to corner). Adjust for zoom via camera.
export const HEX_SIZE = 28;

// Flat-top hex geometry constants
const SQRT3 = Math.sqrt(3);

/**
 * Convert axial hex (q, r) to pixel (x, y) center point.
 * Flat-top orientation.
 */
export function hexToPixel(q, r, size = HEX_SIZE) {
  const x = size * (3 / 2 * q);
  const y = size * (SQRT3 / 2 * q + SQRT3 * r);
  return { x, y };
}

/**
 * Convert pixel (x, y) to fractional axial hex (q, r).
 * Use with hexRound() to get the nearest hex.
 */
export function pixelToHex(px, py, size = HEX_SIZE) {
  const q = (2 / 3 * px) / size;
  const r = (-1 / 3 * px + SQRT3 / 3 * py) / size;
  return { q, r };
}

/**
 * Round fractional axial coords to nearest hex.
 * Converts to cube, rounds, converts back to axial.
 */
export function hexRound(q, r) {
  // Axial to cube
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

/**
 * Get the 6 axial neighbor offsets for a hex.
 */
export const HEX_DIRECTIONS = [
  { q: 1, r: 0 },   // E
  { q: 1, r: -1 },  // NE
  { q: 0, r: -1 },  // NW
  { q: -1, r: 0 },  // W
  { q: -1, r: 1 },  // SW
  { q: 0, r: 1 },   // SE
];

/**
 * Get neighbors of hex (q, r).
 */
export function hexNeighbors(q, r) {
  return HEX_DIRECTIONS.map(d => ({ q: q + d.q, r: r + d.r }));
}

/**
 * Hex distance between two axial coordinates.
 */
export function hexDistance(q1, r1, q2, r2) {
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}

/**
 * Get the 6 corner pixel positions of a flat-top hex at (cx, cy).
 * Returns array of {x, y} points.
 */
export function hexCorners(cx, cy, size = HEX_SIZE) {
  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 180 * (60 * i);
    corners.push({
      x: cx + size * Math.cos(angle),
      y: cy + size * Math.sin(angle),
    });
  }
  return corners;
}

/**
 * Draw a single hex path on a canvas context at pixel center (cx, cy).
 * Does NOT fill or stroke — caller does that.
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
