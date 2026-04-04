// ==========================================================================
// HexRenderer — Layered hex map renderer with textured terrain
//
// 10-layer rendering pipeline:
// 1. Textured terrain (procedural textures from TextureManager)
// 2. Terrain edge blending
// 3. Paper overlay (parchment multiply blend)
// 4. Selective borders (ownership/terrain boundaries only)
// 5. Elevation shadows (mountains, forests)
// 6. Roads + supply lines (animated dashes)
// 7. Fog of war (textured, not flat)
// 8. Cities, resources, armies
// 9. Selection highlight
// 10. Post-processing (vignette)
// ==========================================================================

import { hexToPixel, hexPath, HEX_SIZE, pixelToHex, hexRound } from './HexGrid.js';
import { HexCamera } from './HexCamera.js';
import { TextureManager } from './TextureManager.js';

const TERRAIN_COLORS = {
  plains: '#8B9A46', farmland: '#6B8E23', forest: '#2D5A27',
  mountain: '#7A7A7A', water: '#2A5C8A', coast: '#4A8AB5',
  desert: '#C4A35A', snow: '#D4D8DC', urban: '#6B6B6B',
  ruins: '#5A4A3A', marsh: '#4A6A4A', disused: '#9A8B6F', river: '#3A6A9A',
};

const PLAYER_COLORS = [
  '#E63946', '#457B9D', '#F4A261', '#2A9D8F',
  '#E9C46A', '#264653', '#F72585', '#7209B7',
  '#3A0CA3', '#4CC9F0', '#80B918', '#FF6B6B',
];

function hexColorToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const HEX_DIRS = [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];

export class HexRenderer {
  constructor(canvas, minimapCanvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.minimapCanvas = minimapCanvas;
    this.minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;

    this.camera = new HexCamera(canvas);
    this.camera.onMove = () => this.requestRender();

    this.tiles = new Map();
    this.playerColors = new Map();
    this.selectedTile = null;
    this.currentPlayerId = null;

    this._renderRequested = false;
    this._onClick = null;
    this.showSupplyOverlay = false;
    this._initialLoadDone = false;
    this._cityTileKeys = new Set();
    this._armies = null;

    // Initialize texture manager
    this._texMgr = new TextureManager();
    this._texMgr.init();

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

  onClick(fn) { this._onClick = fn; }

  loadArmies(armyArray, currentPlayerId) {
    this._armies = new Map();
    for (const army of armyArray) {
      const key = army.tile_id;
      if (!this._armies.has(key)) this._armies.set(key, []);
      this._armies.get(key).push(army);
    }
    this.requestRender();
  }

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

  attach() { this.camera.attach(); this.canvas.style.cursor = 'grab'; }
  detach() { this.camera.detach(); }

  requestRender() {
    if (this._renderRequested) return;
    this._renderRequested = true;
    requestAnimationFrame(() => { this._renderRequested = false; this.render(); });
  }

  // =====================================================================
  // MAIN RENDER — 10-Layer Pipeline
  // =====================================================================
  render() {
    const { ctx, canvas, camera } = this;
    const w = canvas.width, h = canvas.height;
    const size = HEX_SIZE;

    // Clear with dark background
    ctx.fillStyle = '#0D1117';
    ctx.fillRect(0, 0, w, h);

    const topLeft = camera.screenToWorld(0, 0);
    const bottomRight = camera.screenToWorld(w, h);
    const pad = size * 3;

    // Collect visible tiles
    const visible = [];
    for (const tile of this.tiles.values()) {
      const world = hexToPixel(tile.q, tile.r, size);
      if (world.x < topLeft.x - pad || world.x > bottomRight.x + pad ||
          world.y < topLeft.y - pad || world.y > bottomRight.y + pad) continue;
      const screen = camera.worldToScreen(world.x, world.y);
      const screenSize = size * camera.zoom;
      if (screenSize < 2) continue;
      visible.push({ tile, world, screen, screenSize });
    }

    // --- Layer 1: Textured terrain ---
    for (const { tile, screen, screenSize } of visible) {
      ctx.save();
      hexPath(ctx, screen.x, screen.y, screenSize);
      ctx.clip();

      // Draw terrain texture
      const tex = this._texMgr.getTerrainTexture(tile.terrain_type, tile.q, tile.r);
      if (tex) {
        ctx.drawImage(tex, screen.x - screenSize, screen.y - screenSize, screenSize * 2, screenSize * 2);
      } else {
        ctx.fillStyle = TERRAIN_COLORS[tile.terrain_type] || '#555';
        ctx.fillRect(screen.x - screenSize, screen.y - screenSize, screenSize * 2, screenSize * 2);
      }

      // Ownership tint
      if (tile.owner_id) {
        const isMine = tile.owner_id === this.currentPlayerId;
        ctx.fillStyle = isMine ? 'rgba(255, 215, 0, 0.10)' : hexColorToRgba(this.playerColors.get(tile.owner_id) || '#FFF', 0.12);
        ctx.fillRect(screen.x - screenSize, screen.y - screenSize, screenSize * 2, screenSize * 2);
      }

      ctx.restore();
    }

    // --- Layer 2: Edge blending (at higher zoom) ---
    if (camera.zoom > 0.4) {
      for (const { tile, screen, screenSize } of visible) {
        for (const [dq, dr] of HEX_DIRS) {
          const nKey = `${tile.q + dq},${tile.r + dr}`;
          const neighbor = this.tiles.get(nKey);
          if (!neighbor || neighbor.terrain_type === tile.terrain_type) continue;

          const nWorld = hexToPixel(neighbor.q, neighbor.r, size);
          const nScreen = camera.worldToScreen(nWorld.x, nWorld.y);
          const midX = (screen.x + nScreen.x) / 2;
          const midY = (screen.y + nScreen.y) / 2;

          // Small gradient blob at the edge
          const grad = ctx.createRadialGradient(midX, midY, 0, midX, midY, screenSize * 0.35);
          grad.addColorStop(0, hexColorToRgba(TERRAIN_COLORS[neighbor.terrain_type] || '#555', 0.2));
          grad.addColorStop(1, 'rgba(0,0,0,0)');

          ctx.save();
          hexPath(ctx, screen.x, screen.y, screenSize);
          ctx.clip();
          ctx.fillStyle = grad;
          ctx.fillRect(screen.x - screenSize, screen.y - screenSize, screenSize * 2, screenSize * 2);
          ctx.restore();
        }
      }
    }

    // --- Layer 3: Paper overlay ---
    if (camera.zoom > 0.25) {
      const paper = this._texMgr.getPaperOverlay();
      if (paper) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.08;
        // Tile the paper texture across the viewport
        const pW = paper.width, pH = paper.height;
        for (let px = 0; px < w; px += pW) {
          for (let py = 0; py < h; py += pH) {
            ctx.drawImage(paper, px, py);
          }
        }
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
      }
    }

    // --- Layer 4: Selective borders (ownership boundaries only) ---
    for (const { tile, screen, screenSize } of visible) {
      if (!tile.owner_id) continue;

      const isMine = tile.owner_id === this.currentPlayerId;
      const ctrl = tile.control_level || 'claimed';
      let hasBoundary = false;

      // Check if any neighbor has a different owner
      for (const [dq, dr] of HEX_DIRS) {
        const nKey = `${tile.q + dq},${tile.r + dr}`;
        const neighbor = this.tiles.get(nKey);
        if (!neighbor || neighbor.owner_id !== tile.owner_id) {
          hasBoundary = true;
          break;
        }
      }

      if (hasBoundary) {
        hexPath(ctx, screen.x, screen.y, screenSize);
        if (isMine) {
          ctx.strokeStyle = ctrl === 'improved' ? '#00E676' : ctrl === 'occupied' ? '#FFD700' : '#FF9800';
          ctx.lineWidth = ctrl === 'improved' ? 2.5 : ctrl === 'occupied' ? 2 : 1.5;
          if (ctrl === 'claimed') { ctx.setLineDash([4, 3]); }
        } else {
          ctx.strokeStyle = hexColorToRgba(this.playerColors.get(tile.owner_id) || '#E63946', 0.7);
          ctx.lineWidth = 1.5;
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // --- Layer 5: Elevation shadows ---
    if (camera.zoom > 0.3) {
      for (const { tile, screen, screenSize } of visible) {
        if (tile.terrain_type === 'mountain' || tile.terrain_type === 'forest') {
          const shadowAlpha = tile.terrain_type === 'mountain' ? 0.15 : 0.08;
          // SE shadow
          const sx = screen.x + screenSize * 0.15;
          const sy = screen.y + screenSize * 0.2;
          ctx.save();
          hexPath(ctx, sx, sy, screenSize * 0.9);
          ctx.clip();
          ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
          ctx.fillRect(sx - screenSize, sy - screenSize, screenSize * 2, screenSize * 2);
          ctx.restore();
        }
      }
    }

    // --- Layer 6: Roads + supply lines ---
    if (camera.zoom > 0.15) {
      ctx.strokeStyle = 'rgba(180,160,100,0.6)';
      ctx.lineWidth = Math.max(size * camera.zoom * 0.1, 1.5);
      ctx.setLineDash([5, 4]);
      ctx.lineDashOffset = -(Date.now() / 80 % 18); // Animated flow

      for (const tile of this.tiles.values()) {
        if (!tile.infrastructure_road) continue;
        const world1 = hexToPixel(tile.q, tile.r, size);
        const s1 = camera.worldToScreen(world1.x, world1.y);
        for (const [dq, dr] of HEX_DIRS) {
          const nKey = `${tile.q + dq},${tile.r + dr}`;
          const neighbor = this.tiles.get(nKey);
          if (neighbor?.infrastructure_road && nKey > `${tile.q},${tile.r}`) {
            const world2 = hexToPixel(neighbor.q, neighbor.r, size);
            const s2 = camera.worldToScreen(world2.x, world2.y);
            ctx.beginPath();
            ctx.moveTo(s1.x, s1.y);
            ctx.lineTo(s2.x, s2.y);
            ctx.stroke();
          }
        }
      }
      ctx.setLineDash([]);
    }

    // Supply range overlay
    if (this.showSupplyOverlay) {
      const cityTiles = [];
      for (const tile of this.tiles.values()) {
        if (this._cityTileKeys.has(`${tile.q},${tile.r}`) && tile.owner_id === this.currentPlayerId) {
          cityTiles.push(tile);
        }
      }
      for (const { tile, screen, screenSize } of visible) {
        const range = tile.infrastructure_road ? 15 : 10;
        let inRange = false;
        for (const ct of cityTiles) {
          const dist = (Math.abs(ct.q - tile.q) + Math.abs(ct.r - tile.r) + Math.abs(ct.q + ct.r - tile.q - tile.r)) / 2;
          if (dist <= range) { inRange = true; break; }
        }
        if (inRange) {
          hexPath(ctx, screen.x, screen.y, screenSize);
          ctx.fillStyle = 'rgba(39, 174, 96, 0.08)';
          ctx.fill();
        }
      }
    }

    // --- Layer 7: Fog of war (textured) ---
    for (const { tile, screen, screenSize } of visible) {
      if (!tile.fog_state || tile.fog_state === 'visible') continue;

      hexPath(ctx, screen.x, screen.y, screenSize);
      if (tile.fog_state === 'unexplored') {
        ctx.fillStyle = 'rgba(8, 10, 18, 0.85)';
      } else {
        ctx.fillStyle = 'rgba(15, 20, 35, 0.50)';
      }
      ctx.fill();

      // Noise texture on fog for visual interest
      if (screenSize > 8 && tile.fog_state === 'unexplored') {
        const grain = this._texMgr.getNoiseGrain();
        if (grain) {
          ctx.save();
          hexPath(ctx, screen.x, screen.y, screenSize);
          ctx.clip();
          ctx.globalAlpha = 0.3;
          ctx.drawImage(grain, screen.x - screenSize, screen.y - screenSize, screenSize * 2, screenSize * 2);
          ctx.globalAlpha = 1.0;
          ctx.restore();
        }
      }
    }

    // --- Layer 8: Cities, resources, armies ---
    for (const { tile, screen, screenSize } of visible) {
      if (tile.fog_state === 'unexplored') continue;

      const tileKey = `${tile.q},${tile.r}`;
      const hasCity = this._cityTileKeys.has(tileKey);

      // City marker
      if (hasCity && screenSize > 8) {
        const cs = Math.max(screenSize * 0.3, 5);
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 1.5;
        // Improved city shape — multiple buildings
        if (screenSize > 20) {
          // Detailed: multiple buildings
          ctx.fillRect(screen.x - cs * 0.4, screen.y - cs * 0.3, cs * 0.3, cs * 0.6);
          ctx.fillRect(screen.x - cs * 0.05, screen.y - cs * 0.5, cs * 0.25, cs * 0.8);
          ctx.fillRect(screen.x + cs * 0.25, screen.y - cs * 0.2, cs * 0.2, cs * 0.5);
          ctx.strokeRect(screen.x - cs * 0.5, screen.y - cs * 0.55, cs, cs * 0.95);
        } else {
          // Simple: single rectangle
          ctx.fillRect(screen.x - cs * 0.3, screen.y - cs * 0.3, cs * 0.6, cs * 0.6);
        }
      }

      // Resource icon (from TextureManager)
      if (tile.resource_type && screenSize > 8 && tile.fog_state !== 'stale') {
        const icon = this._texMgr.getResourceIcon(tile.resource_type);
        const dotY = hasCity ? screen.y + screenSize * 0.35 : screen.y;
        const iconSize = Math.max(screenSize * 0.4, 10);
        if (icon) {
          ctx.drawImage(icon, screen.x - iconSize / 2, dotY - iconSize / 2, iconSize, iconSize);
        }
      }

      // Resource label
      if (tile.resource_type && screenSize > 22 && tile.fog_state === 'visible') {
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.font = `bold ${Math.max(screenSize * 0.24, 8)}px Oswald, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const labelY = hasCity ? screen.y + screenSize * 0.5 : screen.y + screenSize * 0.28;
        ctx.fillText(tile.resource_type, screen.x, labelY);
      }

      // Terrain label (at high zoom)
      if (screenSize > 38 && tile.fog_state === 'visible') {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = `${Math.max(screenSize * 0.18, 7)}px Oswald, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(tile.terrain_type, screen.x, screen.y - screenSize * 0.2);
      }
    }

    // Army counters (NATO-style rectangular)
    if (this._armies) {
      for (const [tileId, armies] of this._armies) {
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

        // Draw NATO-style counter for primary army + count badge
        const primary = armies[0];
        const isMine = primary.player_id === this.currentPlayerId;
        const cw = Math.max(screenSize * 0.5, 14);
        const ch = Math.max(screenSize * 0.35, 10);
        const cx = screen.x - cw / 2;
        const cy = screen.y - screenSize * 0.45;

        // Counter background
        ctx.fillStyle = isMine ? 'rgba(60, 100, 180, 0.9)' : 'rgba(180, 50, 50, 0.9)';
        ctx.fillRect(cx, cy, cw, ch);
        ctx.strokeStyle = isMine ? '#2A5A9A' : '#8B0000';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx, cy, cw, ch);

        // Unit type icon (X for infantry)
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        if (screenSize > 12) {
          ctx.beginPath();
          ctx.moveTo(cx + 3, cy + 3);
          ctx.lineTo(cx + cw - 3, cy + ch - 3);
          ctx.moveTo(cx + cw - 3, cy + 3);
          ctx.lineTo(cx + 3, cy + ch - 3);
          ctx.stroke();
        }

        // Status indicator
        if (primary.status === 'marching') {
          ctx.fillStyle = '#FFD700';
          ctx.font = `bold ${Math.max(ch * 0.6, 8)}px sans-serif`;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'top';
          ctx.fillText('→', cx + cw + 8, cy);
        } else if (primary.status === 'fortified') {
          ctx.fillStyle = '#4CAF50';
          ctx.font = `${Math.max(ch * 0.5, 7)}px sans-serif`;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'top';
          ctx.fillText('🛡', cx + cw + 8, cy);
        }

        // Stack count badge
        if (armies.length > 1) {
          const badgeR = Math.max(cw * 0.2, 6);
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(cx + cw, cy, badgeR, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.font = `bold ${badgeR}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(armies.length, cx + cw, cy);
        }
      }
    }

    // --- Layer 9: Selection highlight ---
    if (this.selectedTile) {
      const world = hexToPixel(this.selectedTile.q, this.selectedTile.r, size);
      const screen = camera.worldToScreen(world.x, world.y);
      const screenSize = size * camera.zoom;

      hexPath(ctx, screen.x, screen.y, screenSize);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.stroke();

      hexPath(ctx, screen.x, screen.y, screenSize);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.12)';
      ctx.fill();
    }

    // --- Layer 10: Post-processing (vignette) ---
    if (camera.zoom > 0.3) {
      const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.25)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // Zoom indicator
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '10px Oswald, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${(camera.zoom * 100).toFixed(0)}%`, 8, 50);

    // Continuously render for animated elements (roads, supply lines)
    if (camera.zoom > 0.15) {
      requestAnimationFrame(() => this.requestRender());
    }
  }

  // =====================================================================
  // MINIMAP
  // =====================================================================
  renderMinimap() {
    if (!this.minimapCtx) return;
    const ctx = this.minimapCtx;
    const cw = this.minimapCanvas.width;
    const ch = this.minimapCanvas.height;

    ctx.fillStyle = '#0D1117';
    ctx.fillRect(0, 0, cw, ch);

    if (this.tiles.size === 0) return;

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

    for (const tile of this.tiles.values()) {
      const p = hexToPixel(tile.q, tile.r);
      const sx = p.x * scale + offsetX;
      const sy = p.y * scale + offsetY;

      const fog = tile.fog_state || 'visible';
      if (fog === 'unexplored') {
        ctx.fillStyle = '#080a12';
      } else if (fog === 'stale') {
        ctx.fillStyle = tile.owner_id
          ? (tile.owner_id === this.currentPlayerId ? '#8B7530' : '#444')
          : '#1a1e28';
      } else if (tile.owner_id) {
        ctx.fillStyle = tile.owner_id === this.currentPlayerId
          ? '#FFD700' : (this.playerColors.get(tile.owner_id) || '#888');
      } else {
        ctx.fillStyle = TERRAIN_COLORS[tile.terrain_type] || '#333';
      }

      ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
    }

    const cam = this.camera;
    const tl = { x: cam.x - this.canvas.width / 2 / cam.zoom, y: cam.y - this.canvas.height / 2 / cam.zoom };
    const br = { x: cam.x + this.canvas.width / 2 / cam.zoom, y: cam.y + this.canvas.height / 2 / cam.zoom };

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tl.x * scale + offsetX, tl.y * scale + offsetY, (br.x - tl.x) * scale, (br.y - tl.y) * scale);
  }
}
