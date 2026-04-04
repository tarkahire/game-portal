// ==========================================================================
// HexRenderer — Renders 999 hex tiles on an HTML5 Canvas
//
// Handles: terrain coloring, ownership borders, resource icons,
// selected tile highlight, and viewport culling for performance.
// ==========================================================================

import { hexToPixel, hexPath, hexCorners, HEX_SIZE, pixelToHex, hexRound } from './HexGrid.js';
import { HexCamera } from './HexCamera.js';

// Terrain colors (flat fill for now — textures later)
const TERRAIN_COLORS = {
  plains:   '#8B9A46',
  farmland: '#6B8E23',
  forest:   '#2D5A27',
  mountain: '#7A7A7A',
  water:    '#2A5C8A',
  coast:    '#4A8AB5',
  desert:   '#C4A35A',
  snow:     '#D4D8DC',
  urban:    '#6B6B6B',
  ruins:    '#5A4A3A',
  marsh:    '#4A6A4A',
  disused:  '#9A8B6F',
  river:    '#3A6A9A',
};

// Resource indicator colors (small dot in hex center)
const RESOURCE_COLORS = {
  oil:      '#1A1A1A',
  iron:     '#8B4513',
  coal:     '#333333',
  bauxite:  '#CD853F',
  rubber:   '#556B2F',
  copper:   '#B87333',
  tungsten: '#708090',
  farmland: '#228B22',
  fish:     '#4682B4',
  uranium:  '#7FFF00',
};

// Player ownership colors (cycle through these)
const PLAYER_COLORS = [
  '#E63946', '#457B9D', '#F4A261', '#2A9D8F',
  '#E9C46A', '#264653', '#F72585', '#7209B7',
  '#3A0CA3', '#4CC9F0', '#80B918', '#FF6B6B',
];

/**
 * Convert a hex color string to rgba with given alpha.
 * @param {string} hex — e.g. '#E63946'
 * @param {number} alpha — 0.0 to 1.0
 * @returns {string}
 */
function hexColorToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export class HexRenderer {
  /**
   * @param {HTMLCanvasElement} canvas — the game canvas
   * @param {HTMLCanvasElement} minimapCanvas — the minimap canvas
   */
  constructor(canvas, minimapCanvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.minimapCanvas = minimapCanvas;
    this.minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;

    this.camera = new HexCamera(canvas);
    this.camera.onMove = () => this.requestRender();

    // Tile data: Map of "q,r" → tile object
    this.tiles = new Map();
    // Player color assignments: Map of playerId → color
    this.playerColors = new Map();
    // Currently selected tile
    this.selectedTile = null;
    // Current player ID (for highlighting owned tiles)
    this.currentPlayerId = null;

    // Render state
    this._renderRequested = false;
    this._onClick = null;
    this.showSupplyOverlay = false;
    this._initialLoadDone = false;

    // Click handler
    this.canvas.addEventListener('mouseup', (e) => {
      if (!this.camera.wasClick(e)) return;
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = this.camera.screenToWorld(sx, sy);
      const hex = hexRound(...Object.values(pixelToHex(world.x, world.y)));
      const tile = this.tiles.get(`${hex.q},${hex.r}`);
      if (tile) {
        this.selectedTile = tile;
        this.requestRender();
        if (this._onClick) this._onClick(tile);
      }
    });
  }

  /** Set click callback: fn(tile) */
  onClick(fn) { this._onClick = fn; }

  /** Load army data for map display. */
  loadArmies(armyArray, currentPlayerId) {
    this._armies = new Map(); // tileId → [army, ...]
    for (const army of armyArray) {
      const key = army.tile_id;
      if (!this._armies.has(key)) this._armies.set(key, []);
      this._armies.get(key).push(army);
    }
    this.requestRender();
  }

  /** Load tile data from array of tile objects from Supabase. */
  loadTiles(tileArray, currentPlayerId) {
    this.tiles.clear();
    this.playerColors.clear();
    this.currentPlayerId = currentPlayerId;
    this._cityTileKeys = new Set();

    let colorIdx = 0;
    for (const tile of tileArray) {
      this.tiles.set(`${tile.q},${tile.r}`, tile);
      if (tile._hasCity) this._cityTileKeys.add(`${tile.q},${tile.r}`);
      if (tile.owner_id && !this.playerColors.has(tile.owner_id)) {
        this.playerColors.set(tile.owner_id, PLAYER_COLORS[colorIdx % PLAYER_COLORS.length]);
        colorIdx++;
      }
    }

    // Only center camera on first load, not on refreshes
    if (!this._initialLoadDone) {
      const ownedTile = tileArray.find(t => t.owner_id === currentPlayerId);
      if (ownedTile) {
        const px = hexToPixel(ownedTile.q, ownedTile.r);
        this.camera.centerOn(px.x, px.y);
      }
      this._initialLoadDone = true;
    }

    this.requestRender();
    this.renderMinimap();
  }

  /** Attach camera controls. */
  attach() {
    this.camera.attach();
    this.canvas.style.cursor = 'grab';
  }

  /** Detach camera controls. */
  detach() {
    this.camera.detach();
  }

  /** Request a render on next animation frame. */
  requestRender() {
    if (this._renderRequested) return;
    this._renderRequested = true;
    requestAnimationFrame(() => {
      this._renderRequested = false;
      this.render();
    });
  }

  /** Main render loop — draws all visible hexes. */
  render() {
    const { ctx, canvas, camera } = this;
    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.fillStyle = '#0F1423';
    ctx.fillRect(0, 0, w, h);

    const size = HEX_SIZE;

    // Calculate visible bounds in world space (with padding)
    const topLeft = camera.screenToWorld(0, 0);
    const bottomRight = camera.screenToWorld(w, h);
    const pad = size * 3;

    // Draw each tile
    for (const tile of this.tiles.values()) {
      const world = hexToPixel(tile.q, tile.r, size);

      // Cull tiles outside viewport
      if (world.x < topLeft.x - pad || world.x > bottomRight.x + pad ||
          world.y < topLeft.y - pad || world.y > bottomRight.y + pad) {
        continue;
      }

      const screen = camera.worldToScreen(world.x, world.y);
      const screenSize = size * camera.zoom;

      // Skip tiny hexes when zoomed out far
      if (screenSize < 2) continue;

      // Draw hex fill (terrain color)
      hexPath(ctx, screen.x, screen.y, screenSize);
      ctx.fillStyle = TERRAIN_COLORS[tile.terrain_type] || '#555';
      ctx.fill();

      // Ownership tint — semi-transparent player color over terrain
      if (tile.owner_id) {
        const color = this.playerColors.get(tile.owner_id) || '#FFF';
        const isMine = tile.owner_id === this.currentPlayerId;
        hexPath(ctx, screen.x, screen.y, screenSize);
        ctx.fillStyle = isMine
          ? 'rgba(255, 215, 0, 0.12)'
          : hexColorToRgba(color, 0.15);
        ctx.fill();
      }

      // Ownership border
      if (tile.owner_id) {
        hexPath(ctx, screen.x, screen.y, screenSize);
        const color = this.playerColors.get(tile.owner_id) || '#FFF';
        ctx.strokeStyle = tile.owner_id === this.currentPlayerId ? '#FFD700' : color;
        ctx.lineWidth = tile.owner_id === this.currentPlayerId ? 2.5 : 1.5;
        ctx.stroke();
      } else {
        // Faint grid line for unclaimed
        hexPath(ctx, screen.x, screen.y, screenSize);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // City marker (house icon)
      const tileKey = `${tile.q},${tile.r}`;
      if (this._cityTileKeys.has(tileKey) && screenSize > 10) {
        const cs = Math.max(screenSize * 0.3, 5);
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1;
        // Simple house shape
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - cs * 0.8);          // roof peak
        ctx.lineTo(screen.x - cs * 0.6, screen.y - cs * 0.1); // left eave
        ctx.lineTo(screen.x - cs * 0.4, screen.y - cs * 0.1); // left wall top
        ctx.lineTo(screen.x - cs * 0.4, screen.y + cs * 0.5); // left wall bottom
        ctx.lineTo(screen.x + cs * 0.4, screen.y + cs * 0.5); // right wall bottom
        ctx.lineTo(screen.x + cs * 0.4, screen.y - cs * 0.1); // right wall top
        ctx.lineTo(screen.x + cs * 0.6, screen.y - cs * 0.1); // right eave
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Resource indicator (small colored dot) — shift down if city present
      const hasCity = this._cityTileKeys.has(tileKey);
      if (tile.resource_type && screenSize > 8) {
        const dotY = hasCity ? screen.y + screenSize * 0.4 : screen.y;
        ctx.beginPath();
        ctx.arc(screen.x, dotY, Math.max(screenSize * 0.18, 2), 0, Math.PI * 2);
        ctx.fillStyle = RESOURCE_COLORS[tile.resource_type] || '#FFF';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Resource type label (when zoomed in enough)
      if (tile.resource_type && screenSize > 22) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = `${Math.max(screenSize * 0.28, 8)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const labelY = hasCity ? screen.y + screenSize * 0.5 : screen.y + screenSize * 0.25;
        ctx.fillText(tile.resource_type, screen.x, labelY);
      }

      // Terrain label (when very zoomed in)
      if (screenSize > 35) {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = `${Math.max(screenSize * 0.2, 7)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(tile.terrain_type, screen.x, screen.y - screenSize * 0.15);
      }
    }

    // Road connections — draw lines between tiles with roads
    if (camera.zoom > 0.15) {
      ctx.strokeStyle = 'rgba(200,180,120,0.5)';
      ctx.lineWidth = Math.max(size * camera.zoom * 0.08, 1);
      ctx.setLineDash([4, 3]);
      for (const tile of this.tiles.values()) {
        if (!tile.infrastructure_road) continue;
        const world1 = hexToPixel(tile.q, tile.r, size);
        const screen1 = camera.worldToScreen(world1.x, world1.y);
        // Check all 6 hex neighbors for roads
        const dirs = [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
        for (const [dq, dr] of dirs) {
          const nKey = `${tile.q + dq},${tile.r + dr}`;
          const neighbor = this.tiles.get(nKey);
          if (neighbor && neighbor.infrastructure_road) {
            // Only draw each edge once (tile with lower key draws it)
            if (nKey > `${tile.q},${tile.r}`) {
              const world2 = hexToPixel(neighbor.q, neighbor.r, size);
              const screen2 = camera.worldToScreen(world2.x, world2.y);
              ctx.beginPath();
              ctx.moveTo(screen1.x, screen1.y);
              ctx.lineTo(screen2.x, screen2.y);
              ctx.stroke();
            }
          }
        }
      }
      ctx.setLineDash([]);
    }

    // Supply range overlay (green tint on tiles within supply range of player's cities)
    if (this.showSupplyOverlay) {
      const cityTiles = [];
      for (const tile of this.tiles.values()) {
        if (this._cityTileKeys.has(`${tile.q},${tile.r}`) && tile.owner_id === this.currentPlayerId) {
          cityTiles.push(tile);
        }
      }
      for (const tile of this.tiles.values()) {
        const world = hexToPixel(tile.q, tile.r, size);
        if (world.x < topLeft.x - pad || world.x > bottomRight.x + pad ||
            world.y < topLeft.y - pad || world.y > bottomRight.y + pad) continue;
        // Check if within supply range of any city
        const range = tile.infrastructure_road ? 15 : 10;
        let inRange = false;
        for (const ct of cityTiles) {
          const dist = (Math.abs(ct.q - tile.q) + Math.abs(ct.r - tile.r) + Math.abs(ct.q + ct.r - tile.q - tile.r)) / 2;
          if (dist <= range) { inRange = true; break; }
        }
        if (inRange) {
          const screen = camera.worldToScreen(world.x, world.y);
          const screenSize = size * camera.zoom;
          hexPath(ctx, screen.x, screen.y, screenSize);
          ctx.fillStyle = 'rgba(39, 174, 96, 0.1)';
          ctx.fill();
        }
      }
    }

    // Army sprites — draw after all tiles
    if (this._armies) {
      for (const [tileId, armies] of this._armies) {
        // Find tile by iterating (tileId is int)
        let armyTile = null;
        for (const t of this.tiles.values()) {
          if (t.id === tileId) { armyTile = t; break; }
        }
        if (!armyTile) continue;

        const world = hexToPixel(armyTile.q, armyTile.r, size);
        if (world.x < topLeft.x - pad || world.x > bottomRight.x + pad ||
            world.y < topLeft.y - pad || world.y > bottomRight.y + pad) continue;

        const screen = camera.worldToScreen(world.x, world.y);
        const screenSize = size * camera.zoom;
        if (screenSize < 6) continue;

        // Draw shield icon for each army (offset if multiple)
        for (let ai = 0; ai < armies.length; ai++) {
          const army = armies[ai];
          const isMine = army.player_id === this.currentPlayerId;
          const ox = ai * screenSize * 0.35;
          const sx = screen.x - screenSize * 0.25 + ox;
          const sy = screen.y - screenSize * 0.55;
          const sw = screenSize * 0.35;
          const sh = screenSize * 0.4;

          // Shield shape
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + sw, sy);
          ctx.lineTo(sx + sw, sy + sh * 0.6);
          ctx.lineTo(sx + sw / 2, sy + sh);
          ctx.lineTo(sx, sy + sh * 0.6);
          ctx.closePath();

          ctx.fillStyle = isMine ? 'rgba(255,215,0,0.85)' : 'rgba(220,50,50,0.85)';
          ctx.fill();
          ctx.strokeStyle = isMine ? '#B8860B' : '#8B0000';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Army status indicator
          if (army.status === 'marching' && screenSize > 14) {
            ctx.fillStyle = '#000';
            ctx.font = `${Math.max(sw * 0.5, 6)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('→', sx + sw / 2, sy + sh * 0.4);
          }
        }
      }
    }

    // Selected tile highlight
    if (this.selectedTile) {
      const world = hexToPixel(this.selectedTile.q, this.selectedTile.r, size);
      const screen = camera.worldToScreen(world.x, world.y);
      const screenSize = size * camera.zoom;

      hexPath(ctx, screen.x, screen.y, screenSize);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.stroke();

      hexPath(ctx, screen.x, screen.y, screenSize);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
      ctx.fill();
    }

    // Zoom level indicator
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Zoom: ${(camera.zoom * 100).toFixed(0)}%`, 8, 50);
  }

  /** Render the minimap showing the full map overview. */
  renderMinimap() {
    if (!this.minimapCtx) return;
    const ctx = this.minimapCtx;
    const cw = this.minimapCanvas.width;
    const ch = this.minimapCanvas.height;

    ctx.fillStyle = '#0F1423';
    ctx.fillRect(0, 0, cw, ch);

    if (this.tiles.size === 0) return;

    // Find map bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const tile of this.tiles.values()) {
      const p = hexToPixel(tile.q, tile.r);
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const mapW = maxX - minX + HEX_SIZE * 2;
    const mapH = maxY - minY + HEX_SIZE * 2;
    const scale = Math.min((cw - 10) / mapW, (ch - 10) / mapH);
    const offsetX = (cw - mapW * scale) / 2 - minX * scale + HEX_SIZE * scale;
    const offsetY = (ch - mapH * scale) / 2 - minY * scale + HEX_SIZE * scale;

    // Draw each tile as a small dot
    for (const tile of this.tiles.values()) {
      const p = hexToPixel(tile.q, tile.r);
      const sx = p.x * scale + offsetX;
      const sy = p.y * scale + offsetY;

      if (tile.owner_id) {
        ctx.fillStyle = tile.owner_id === this.currentPlayerId
          ? '#FFD700'
          : (this.playerColors.get(tile.owner_id) || '#888');
      } else {
        ctx.fillStyle = TERRAIN_COLORS[tile.terrain_type] || '#444';
      }

      ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
    }

    // Draw viewport rectangle
    const cam = this.camera;
    const tl = { x: cam.x - this.canvas.width / 2 / cam.zoom, y: cam.y - this.canvas.height / 2 / cam.zoom };
    const br = { x: cam.x + this.canvas.width / 2 / cam.zoom, y: cam.y + this.canvas.height / 2 / cam.zoom };

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      tl.x * scale + offsetX,
      tl.y * scale + offsetY,
      (br.x - tl.x) * scale,
      (br.y - tl.y) * scale
    );
  }
}
