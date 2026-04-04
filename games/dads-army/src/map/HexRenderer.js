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

  /** Load tile data from array of tile objects from Supabase. */
  loadTiles(tileArray, currentPlayerId) {
    this.tiles.clear();
    this.playerColors.clear();
    this.currentPlayerId = currentPlayerId;

    let colorIdx = 0;
    for (const tile of tileArray) {
      this.tiles.set(`${tile.q},${tile.r}`, tile);
      if (tile.owner_id && !this.playerColors.has(tile.owner_id)) {
        this.playerColors.set(tile.owner_id, PLAYER_COLORS[colorIdx % PLAYER_COLORS.length]);
        colorIdx++;
      }
    }

    // Center camera on player's first owned tile, or map center
    const ownedTile = tileArray.find(t => t.owner_id === currentPlayerId);
    if (ownedTile) {
      const px = hexToPixel(ownedTile.q, ownedTile.r);
      this.camera.centerOn(px.x, px.y);
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

      // Resource indicator (small colored dot)
      if (tile.resource_type && screenSize > 8) {
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, Math.max(screenSize * 0.18, 2), 0, Math.PI * 2);
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
        ctx.fillText(tile.resource_type, screen.x, screen.y + screenSize * 0.25);
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
