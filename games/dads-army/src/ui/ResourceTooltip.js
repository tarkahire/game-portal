// ==========================================================================
// ResourceTooltip — Rich hover tooltips for the resource bar
// ==========================================================================

export class ResourceTooltip {
  constructor() {
    this._el = document.createElement('div');
    this._el.className = 'resource-tooltip';
    this._timer = null;
    this._cityData = null; // Map<cityId, {name, resources[]}>
    this._bound = {
      enter: (e) => this._onEnter(e),
      leave: () => this._onLeave(),
      move: (e) => this._onMove(e),
    };
  }

  /** Attach to the resource bar element. */
  attach(barEl) {
    this._barEl = barEl;
    document.getElementById('screen-game')?.appendChild(this._el);
    barEl.addEventListener('mouseenter', this._bound.enter, true);
    barEl.addEventListener('mouseleave', this._bound.leave, true);
    barEl.addEventListener('mousemove', this._bound.move, true);
  }

  /** Detach and clean up. */
  detach() {
    if (this._barEl) {
      this._barEl.removeEventListener('mouseenter', this._bound.enter, true);
      this._barEl.removeEventListener('mouseleave', this._bound.leave, true);
      this._barEl.removeEventListener('mousemove', this._bound.move, true);
    }
    this._el.remove();
    clearTimeout(this._timer);
  }

  /** Set per-city resource data for breakdown display. */
  setCityData(cities, cityResourceMap) {
    this._cityData = { cities, resources: cityResourceMap };
  }

  _onEnter(e) {
    const item = e.target.closest('.resource-item');
    if (!item) return;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this._show(item, e);
    }, 200);
  }

  _onLeave() {
    clearTimeout(this._timer);
    this._el.classList.remove('visible');
  }

  _onMove(e) {
    if (!this._el.classList.contains('visible')) return;
    const item = e.target.closest('.resource-item');
    if (!item) { this._onLeave(); return; }
    this._position(e);
  }

  _show(item, e) {
    const key = item.dataset.resourceKey;
    if (!key) return;

    const title = item.getAttribute('title') || '';
    const name = key.charAt(0).toUpperCase() + key.slice(1);

    // Build tooltip content
    let html = `<div class="tooltip-name">${name}</div>`;

    // Get aggregate data from title attr (format: "Name: amount (rate/tick)")
    // Better: read from data attributes
    const amount = item.dataset.amount || '0';
    const rate = item.dataset.rate || '0';
    const cap = item.dataset.cap || '?';
    const rateNum = parseFloat(rate);
    const rateClass = rateNum > 0 ? 'positive' : rateNum < 0 ? 'negative' : '';
    const rateSign = rateNum >= 0 ? '+' : '';

    html += `<div class="tooltip-row"><span class="tooltip-label">Amount</span><span class="tooltip-value">${amount} / ${cap}</span></div>`;
    html += `<div class="tooltip-row"><span class="tooltip-label">Rate</span><span class="tooltip-value ${rateClass}">${rateSign}${rateNum.toFixed(1)} / tick</span></div>`;

    // Per-city breakdown if available
    if (this._cityData?.cities && this._cityData?.resources) {
      const { cities, resources } = this._cityData;
      const sources = [];
      for (const city of cities) {
        const cityRes = resources.get(city.id);
        if (!cityRes) continue;
        const r = cityRes.find(cr => cr.resource_type === key);
        if (r && (r.amount > 0 || r.production_rate > 0)) {
          sources.push({ name: city.name, amount: Math.floor(r.amount), rate: r.production_rate });
        }
      }
      if (sources.length > 0) {
        html += `<div class="tooltip-divider"></div>`;
        for (const s of sources) {
          const sRate = s.rate > 0 ? `+${s.rate.toFixed(1)}` : s.rate.toFixed(1);
          html += `<div class="tooltip-source">${s.name}: ${s.amount} (${sRate}/t)</div>`;
        }
      }
    }

    this._el.innerHTML = html;
    // Remove native title to prevent double tooltip
    item.removeAttribute('title');
    this._position(e);
    this._el.classList.add('visible');
  }

  _position(e) {
    const x = e.clientX;
    const y = e.clientY + 16; // Below cursor
    const rect = this._el.getBoundingClientRect();
    const maxX = window.innerWidth - 290;
    const maxY = window.innerHeight - rect.height - 10;
    this._el.style.left = Math.min(x, maxX) + 'px';
    this._el.style.top = Math.min(y, maxY) + 'px';
  }
}
