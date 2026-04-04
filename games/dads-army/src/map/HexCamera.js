// ==========================================================================
// HexCamera — Pan and zoom controls for the hex map canvas
//
// The camera defines a viewport into the hex world. All rendering uses
// camera.worldToScreen() to transform world coordinates to canvas pixels.
// Pan via mouse drag, zoom via scroll wheel.
// ==========================================================================

export class HexCamera {
  constructor(canvas) {
    this.canvas = canvas;
    // Camera position in world space (center of viewport)
    this.x = 0;
    this.y = 0;
    // Zoom level (1.0 = default, higher = zoomed in)
    this.zoom = 1.0;
    this.minZoom = 0.15;
    this.maxZoom = 3.0;

    // Drag state
    this._dragging = false;
    this._dragStartX = 0;
    this._dragStartY = 0;
    this._dragCamStartX = 0;
    this._dragCamStartY = 0;

    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onWheel = this._onWheel.bind(this);

    this._attached = false;
  }

  /** Attach mouse/wheel listeners to the canvas. */
  attach() {
    if (this._attached) return;
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mouseup', this._onMouseUp);
    this.canvas.addEventListener('mouseleave', this._onMouseUp);
    this.canvas.addEventListener('wheel', this._onWheel, { passive: false });
    this._attached = true;
  }

  /** Detach listeners. */
  detach() {
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('mouseleave', this._onMouseUp);
    this.canvas.removeEventListener('wheel', this._onWheel);
    this._attached = false;
  }

  /** Convert world coordinates to screen (canvas) coordinates. */
  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.zoom + this.canvas.width / 2,
      y: (wy - this.y) * this.zoom + this.canvas.height / 2,
    };
  }

  /** Convert screen (canvas) coordinates to world coordinates. */
  screenToWorld(sx, sy) {
    return {
      x: (sx - this.canvas.width / 2) / this.zoom + this.x,
      y: (sy - this.canvas.height / 2) / this.zoom + this.y,
    };
  }

  /** Current hex size in screen pixels (accounts for zoom). */
  get screenHexSize() {
    // We import HEX_SIZE in the renderer, but camera needs it for culling
    return 28 * this.zoom;
  }

  /** Center camera on a world position. */
  centerOn(wx, wy) {
    this.x = wx;
    this.y = wy;
  }

  // --- Internal event handlers ---

  _onMouseDown(e) {
    if (e.button !== 0) return; // Left click only
    this._dragging = true;
    this._dragStartX = e.clientX;
    this._dragStartY = e.clientY;
    this._dragCamStartX = this.x;
    this._dragCamStartY = this.y;
    this.canvas.style.cursor = 'grabbing';
  }

  _onMouseMove(e) {
    if (!this._dragging) return;
    const dx = e.clientX - this._dragStartX;
    const dy = e.clientY - this._dragStartY;
    this.x = this._dragCamStartX - dx / this.zoom;
    this.y = this._dragCamStartY - dy / this.zoom;
    // Trigger re-render via requestAnimationFrame in the renderer
    if (this.onMove) this.onMove();
  }

  _onMouseUp(e) {
    this._dragging = false;
    this.canvas.style.cursor = 'grab';
  }

  _onWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * zoomFactor));

    // Zoom toward mouse position
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldBefore = this.screenToWorld(mouseX, mouseY);

    this.zoom = newZoom;

    const worldAfter = this.screenToWorld(mouseX, mouseY);
    this.x += worldBefore.x - worldAfter.x;
    this.y += worldBefore.y - worldAfter.y;

    if (this.onMove) this.onMove();
  }

  /** Did the user just click (not drag)? */
  wasClick(e) {
    const dx = Math.abs(e.clientX - this._dragStartX);
    const dy = Math.abs(e.clientY - this._dragStartY);
    return dx < 4 && dy < 4;
  }
}
