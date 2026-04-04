// ==========================================================================
// TextureManager — Procedural terrain textures, resource icons, overlays
//
// Generates all visual assets at init time using offscreen canvases.
// No external PNG dependencies — everything is procedurally drawn.
// ==========================================================================

const TEX_SIZE = 128; // Terrain texture size
const ICON_SIZE = 24; // Resource icon size
const VARIANTS = 4;   // Color variants per terrain

// Seeded random for deterministic variation
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Vary a color by amount
function varyColor(hex, amount, rng) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const v = (rng() - 0.5) * 2 * amount;
  return `rgb(${clamp(r + v, 0, 255)}, ${clamp(g + v, 0, 255)}, ${clamp(b + v, 0, 255)})`;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// Terrain base colors and pattern config
const TERRAIN_CONFIG = {
  plains:   { base: '#8B9A46', range: 20, pattern: 'grass' },
  farmland: { base: '#6B8E23', range: 15, pattern: 'plowed' },
  forest:   { base: '#2D5A27', range: 18, pattern: 'canopy' },
  mountain: { base: '#7A7A7A', range: 12, pattern: 'jagged' },
  water:    { base: '#2A5C8A', range: 10, pattern: 'waves' },
  coast:    { base: '#4A8AB5', range: 10, pattern: 'shore' },
  desert:   { base: '#C4A35A', range: 15, pattern: 'stipple' },
  snow:     { base: '#D4D8DC', range: 8,  pattern: 'frost' },
  urban:    { base: '#6B6B6B', range: 10, pattern: 'blocks' },
  ruins:    { base: '#5A4A3A', range: 12, pattern: 'rubble' },
  marsh:    { base: '#4A6A4A', range: 15, pattern: 'wetland' },
  disused:  { base: '#9A8B6F', range: 12, pattern: 'bare' },
  river:    { base: '#3A6A9A', range: 10, pattern: 'flow' },
};

export class TextureManager {
  constructor() {
    this._terrainCache = new Map(); // "type_variant" → offscreen canvas
    this._iconCache = new Map();    // "resourceType" → offscreen canvas
    this._paperOverlay = null;
    this._noiseGrain = null;
    this._ready = false;
  }

  /** Initialize all textures. Call once at startup. */
  init() {
    // Generate terrain textures
    for (const [type, config] of Object.entries(TERRAIN_CONFIG)) {
      for (let v = 0; v < VARIANTS; v++) {
        const key = `${type}_${v}`;
        this._terrainCache.set(key, this._generateTerrain(type, config, v));
      }
    }

    // Generate resource icons
    this._generateResourceIcons();

    // Generate paper overlay
    this._paperOverlay = this._generatePaper();

    // Generate noise grain
    this._noiseGrain = this._generateNoise();

    this._ready = true;
  }

  /** Get terrain texture for a hex. */
  getTerrainTexture(terrainType, q, r) {
    const variant = Math.abs((q * 7 + r * 13) % VARIANTS);
    const key = `${terrainType}_${variant}`;
    return this._terrainCache.get(key) || this._terrainCache.get(`plains_0`);
  }

  /** Get resource icon canvas (24x24). */
  getResourceIcon(resourceType) {
    return this._iconCache.get(resourceType);
  }

  /** Get paper overlay texture. */
  getPaperOverlay() { return this._paperOverlay; }

  /** Get noise grain texture. */
  getNoiseGrain() { return this._noiseGrain; }

  // -----------------------------------------------------------------------
  // Terrain texture generation
  // -----------------------------------------------------------------------
  _generateTerrain(type, config, variant) {
    const canvas = document.createElement('canvas');
    canvas.width = TEX_SIZE;
    canvas.height = TEX_SIZE;
    const ctx = canvas.getContext('2d');
    const rng = seededRandom(variant * 1000 + type.charCodeAt(0) * 31);

    // Base fill with color variation
    const baseR = parseInt(config.base.slice(1, 3), 16);
    const baseG = parseInt(config.base.slice(3, 5), 16);
    const baseB = parseInt(config.base.slice(5, 7), 16);
    const vr = (variant - 1.5) * (config.range / 3);
    ctx.fillStyle = `rgb(${clamp(baseR + vr, 0, 255)}, ${clamp(baseG + vr, 0, 255)}, ${clamp(baseB + vr, 0, 255)})`;
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

    // Per-pixel noise for texture
    const imgData = ctx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const noise = (rng() - 0.5) * config.range * 0.8;
      imgData.data[i] = clamp(imgData.data[i] + noise, 0, 255);
      imgData.data[i + 1] = clamp(imgData.data[i + 1] + noise, 0, 255);
      imgData.data[i + 2] = clamp(imgData.data[i + 2] + noise, 0, 255);
    }
    ctx.putImageData(imgData, 0, 0);

    // Pattern overlay
    this._drawPattern(ctx, config.pattern, config, rng);

    return canvas;
  }

  _drawPattern(ctx, pattern, config, rng) {
    const s = TEX_SIZE;
    ctx.globalAlpha = 0.3;

    switch (pattern) {
      case 'grass':
        // Subtle horizontal brush strokes
        ctx.strokeStyle = 'rgba(120, 140, 60, 0.4)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 20; i++) {
          const y = rng() * s;
          ctx.beginPath();
          ctx.moveTo(rng() * s * 0.3, y);
          ctx.lineTo(rng() * s * 0.7 + s * 0.3, y + (rng() - 0.5) * 4);
          ctx.stroke();
        }
        break;

      case 'canopy':
        // Tree canopy circles
        for (let i = 0; i < 25; i++) {
          const x = rng() * s, y = rng() * s;
          const r = 4 + rng() * 8;
          ctx.fillStyle = `rgba(${20 + rng() * 40}, ${60 + rng() * 50}, ${15 + rng() * 30}, 0.5)`;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'jagged':
        // Angular mountain lines
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 12; i++) {
          ctx.beginPath();
          let x = rng() * s, y = rng() * s;
          ctx.moveTo(x, y);
          for (let j = 0; j < 4; j++) {
            x += (rng() - 0.5) * 25;
            y += (rng() - 0.3) * 15;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        // Peak highlights
        ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
        for (let i = 0; i < 5; i++) {
          const x = rng() * s, y = rng() * s * 0.5;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - 6, y + 10);
          ctx.lineTo(x + 6, y + 10);
          ctx.closePath();
          ctx.fill();
        }
        break;

      case 'waves':
        // Concentric wave arcs
        ctx.strokeStyle = 'rgba(30, 60, 110, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
          const cx = rng() * s, cy = rng() * s;
          const r = 10 + rng() * 20;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0.2, Math.PI - 0.2);
          ctx.stroke();
        }
        break;

      case 'shore':
        // Gradient from land to water
        const grad = ctx.createLinearGradient(0, 0, s, s);
        grad.addColorStop(0, 'rgba(140, 170, 80, 0.2)');
        grad.addColorStop(0.5, 'rgba(74, 138, 181, 0.1)');
        grad.addColorStop(1, 'rgba(42, 92, 138, 0.2)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, s, s);
        // Foam line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.4);
        for (let x = 0; x < s; x += 10) {
          ctx.lineTo(x, s * 0.4 + Math.sin(x * 0.1) * 5);
        }
        ctx.stroke();
        break;

      case 'plowed':
        // Parallel diagonal lines
        ctx.strokeStyle = 'rgba(80, 100, 20, 0.3)';
        ctx.lineWidth = 1;
        for (let i = -s; i < s * 2; i += 8) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i + s * 0.5, s);
          ctx.stroke();
        }
        break;

      case 'stipple':
        // Desert stipple dots
        ctx.fillStyle = 'rgba(180, 150, 70, 0.4)';
        for (let i = 0; i < 60; i++) {
          ctx.fillRect(rng() * s, rng() * s, 1 + rng() * 2, 1 + rng() * 2);
        }
        break;

      case 'frost':
        // Subtle blue shadow spots
        ctx.fillStyle = 'rgba(180, 200, 220, 0.2)';
        for (let i = 0; i < 10; i++) {
          const x = rng() * s, y = rng() * s;
          ctx.beginPath();
          ctx.arc(x, y, 3 + rng() * 5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'blocks':
        // Urban grid
        ctx.strokeStyle = 'rgba(80, 80, 80, 0.4)';
        ctx.lineWidth = 1;
        for (let x = 8; x < s; x += 12 + rng() * 6) {
          for (let y = 8; y < s; y += 10 + rng() * 5) {
            const w = 6 + rng() * 8, h = 5 + rng() * 7;
            ctx.strokeRect(x, y, w, h);
          }
        }
        break;

      case 'rubble':
        // Chaotic small rectangles
        ctx.fillStyle = 'rgba(100, 80, 60, 0.4)';
        for (let i = 0; i < 30; i++) {
          ctx.save();
          ctx.translate(rng() * s, rng() * s);
          ctx.rotate(rng() * Math.PI);
          ctx.fillRect(0, 0, 3 + rng() * 8, 2 + rng() * 5);
          ctx.restore();
        }
        break;

      case 'wetland':
        // Irregular blotchy patches
        for (let i = 0; i < 15; i++) {
          const c = rng() > 0.5 ? 'rgba(60, 90, 50, 0.3)' : 'rgba(40, 70, 80, 0.2)';
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.arc(rng() * s, rng() * s, 5 + rng() * 12, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'bare':
        // Bare land — subtle scratches
        ctx.strokeStyle = 'rgba(130, 115, 90, 0.3)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 15; i++) {
          ctx.beginPath();
          ctx.moveTo(rng() * s, rng() * s);
          ctx.lineTo(rng() * s, rng() * s);
          ctx.stroke();
        }
        break;

      case 'flow':
        // River flow lines
        ctx.strokeStyle = 'rgba(50, 90, 140, 0.3)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          let x = 0, y = s * 0.3 + rng() * s * 0.4;
          ctx.moveTo(x, y);
          while (x < s) {
            x += 10;
            y += (rng() - 0.5) * 8;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        break;
    }

    ctx.globalAlpha = 1.0;
  }

  // -----------------------------------------------------------------------
  // Resource icon generation (24x24 silhouettes)
  // -----------------------------------------------------------------------
  _generateResourceIcons() {
    const icons = {
      oil:      (ctx) => { this._drawDerrick(ctx); },
      iron:     (ctx) => { this._drawPickaxe(ctx, '#8B4513'); },
      coal:     (ctx) => { this._drawCoalBlock(ctx); },
      copper:   (ctx) => { this._drawPickaxe(ctx, '#B87333'); },
      farmland: (ctx) => { this._drawWheat(ctx); },
      fish:     (ctx) => { this._drawFish(ctx); },
      bauxite:  (ctx) => { this._drawIngot(ctx, '#CD853F'); },
      rubber:   (ctx) => { this._drawCircle(ctx, '#556B2F'); },
      tungsten: (ctx) => { this._drawCrystal(ctx); },
      uranium:  (ctx) => { this._drawRadiation(ctx); },
    };

    for (const [type, drawFn] of Object.entries(icons)) {
      const canvas = document.createElement('canvas');
      canvas.width = ICON_SIZE;
      canvas.height = ICON_SIZE;
      const ctx = canvas.getContext('2d');
      drawFn(ctx);
      this._iconCache.set(type, canvas);
    }
  }

  _drawDerrick(ctx) {
    const s = ICON_SIZE;
    ctx.strokeStyle = '#1A1A1A'; ctx.fillStyle = '#333';
    ctx.lineWidth = 2;
    // Derrick triangle
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.1);
    ctx.lineTo(s * 0.25, s * 0.85);
    ctx.lineTo(s * 0.75, s * 0.85);
    ctx.closePath();
    ctx.stroke();
    // Base
    ctx.fillRect(s * 0.2, s * 0.85, s * 0.6, s * 0.1);
  }

  _drawPickaxe(ctx, color) {
    const s = ICON_SIZE;
    ctx.strokeStyle = color; ctx.lineWidth = 2.5;
    // Handle
    ctx.beginPath();
    ctx.moveTo(s * 0.25, s * 0.75);
    ctx.lineTo(s * 0.75, s * 0.25);
    ctx.stroke();
    // Head
    ctx.beginPath();
    ctx.moveTo(s * 0.6, s * 0.15);
    ctx.lineTo(s * 0.85, s * 0.35);
    ctx.stroke();
  }

  _drawCoalBlock(ctx) {
    const s = ICON_SIZE;
    ctx.fillStyle = '#2A2A2A';
    ctx.fillRect(s * 0.2, s * 0.3, s * 0.6, s * 0.45);
    ctx.fillStyle = '#444';
    ctx.fillRect(s * 0.25, s * 0.35, s * 0.2, s * 0.15);
  }

  _drawWheat(ctx) {
    const s = ICON_SIZE;
    ctx.strokeStyle = '#DAA520'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const x = s * 0.3 + i * s * 0.15;
      ctx.beginPath();
      ctx.moveTo(x, s * 0.85);
      ctx.lineTo(x, s * 0.25);
      ctx.stroke();
      // Grain head
      ctx.fillStyle = '#DAA520';
      ctx.beginPath();
      ctx.ellipse(x, s * 0.2, 3, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawFish(ctx) {
    const s = ICON_SIZE;
    ctx.fillStyle = '#4682B4';
    ctx.beginPath();
    ctx.ellipse(s * 0.45, s * 0.5, s * 0.3, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tail
    ctx.beginPath();
    ctx.moveTo(s * 0.75, s * 0.5);
    ctx.lineTo(s * 0.9, s * 0.3);
    ctx.lineTo(s * 0.9, s * 0.7);
    ctx.closePath();
    ctx.fill();
    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s * 0.3, s * 0.45, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawIngot(ctx, color) {
    const s = ICON_SIZE;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(s * 0.3, s * 0.3);
    ctx.lineTo(s * 0.7, s * 0.3);
    ctx.lineTo(s * 0.8, s * 0.5);
    ctx.lineTo(s * 0.8, s * 0.7);
    ctx.lineTo(s * 0.2, s * 0.7);
    ctx.lineTo(s * 0.2, s * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  _drawCircle(ctx, color) {
    const s = ICON_SIZE;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(s * 0.5, s * 0.5, s * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  _drawCrystal(ctx) {
    const s = ICON_SIZE;
    ctx.fillStyle = '#708090';
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.15);
    ctx.lineTo(s * 0.75, s * 0.4);
    ctx.lineTo(s * 0.7, s * 0.75);
    ctx.lineTo(s * 0.3, s * 0.75);
    ctx.lineTo(s * 0.25, s * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,170,190,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  _drawRadiation(ctx) {
    const s = ICON_SIZE, cx = s * 0.5, cy = s * 0.5;
    ctx.fillStyle = '#7FFF00';
    // Three fan blades
    for (let a = 0; a < 3; a++) {
      const angle = a * (Math.PI * 2 / 3) - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, s * 0.35, angle - 0.4, angle + 0.4);
      ctx.closePath();
      ctx.fill();
    }
    // Center dot
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // -----------------------------------------------------------------------
  // Paper overlay (parchment texture)
  // -----------------------------------------------------------------------
  _generatePaper() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const rng = seededRandom(42);

    // Parchment base
    ctx.fillStyle = '#E8D5B5';
    ctx.fillRect(0, 0, size, size);

    // Noise grain
    const imgData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const n = (rng() - 0.5) * 30;
      imgData.data[i] = clamp(imgData.data[i] + n, 0, 255);
      imgData.data[i + 1] = clamp(imgData.data[i + 1] + n * 0.9, 0, 255);
      imgData.data[i + 2] = clamp(imgData.data[i + 2] + n * 0.7, 0, 255);
    }
    ctx.putImageData(imgData, 0, 0);

    // Age spots
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = `rgba(180, 150, 100, ${0.05 + rng() * 0.1})`;
      ctx.beginPath();
      ctx.arc(rng() * size, rng() * size, 10 + rng() * 30, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas;
  }

  // -----------------------------------------------------------------------
  // Noise grain overlay
  // -----------------------------------------------------------------------
  _generateNoise() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const rng = seededRandom(99);

    const imgData = ctx.createImageData(size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = rng() * 255;
      imgData.data[i] = v;
      imgData.data[i + 1] = v;
      imgData.data[i + 2] = v;
      imgData.data[i + 3] = 15; // Very low opacity
    }
    ctx.putImageData(imgData, 0, 0);

    return canvas;
  }
}
