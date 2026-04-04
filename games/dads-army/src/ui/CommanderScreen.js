// ==========================================================================
// CommanderScreen — Full statistics dashboard overlay
// ==========================================================================

export class CommanderScreen {
  constructor({ getPlayerCities, getCityResources, getCityBuildings, getPlayerArmies,
                getPlayerBattleReports, getPlayerResearch, getResearchDefs,
                serverId, playerId, hexRenderer, unitDefsCache, buildingDefsCache }) {
    this._queries = { getPlayerCities, getCityResources, getCityBuildings,
                      getPlayerArmies, getPlayerBattleReports, getPlayerResearch, getResearchDefs };
    this._serverId = serverId;
    this._playerId = playerId;
    this._hexRenderer = hexRenderer;
    this._unitDefs = unitDefsCache;
    this._buildingDefs = buildingDefsCache;
    this._activeTab = 'overview';
  }

  async open() {
    const overlay = document.getElementById('commander-overlay');
    overlay.style.display = 'flex';

    // Close handlers
    document.getElementById('btn-close-commander')?.addEventListener('click', () => this.close());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.close(); });
    this._escHandler = (e) => { if (e.key === 'Escape') this.close(); };
    document.addEventListener('keydown', this._escHandler);

    // Render tabs
    const tabs = ['Overview', 'Cities', 'Resources', 'Military', 'Research', 'Battles'];
    const tabsEl = document.getElementById('commander-tabs');
    tabsEl.innerHTML = tabs.map(t =>
      `<div class="commander-tab${t.toLowerCase() === this._activeTab ? ' active' : ''}" data-tab="${t.toLowerCase()}">${t}</div>`
    ).join('');

    tabsEl.querySelectorAll('.commander-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this._activeTab = tab.dataset.tab;
        tabsEl.querySelectorAll('.commander-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._renderTab();
      });
    });

    await this._renderTab();
  }

  close() {
    document.getElementById('commander-overlay').style.display = 'none';
    if (this._escHandler) document.removeEventListener('keydown', this._escHandler);
  }

  async _renderTab() {
    const content = document.getElementById('commander-content');
    content.innerHTML = '<div class="loading-spinner" style="margin:40px auto"></div>';

    try {
      switch (this._activeTab) {
        case 'overview': await this._renderOverview(content); break;
        case 'cities': await this._renderCities(content); break;
        case 'resources': await this._renderResources(content); break;
        case 'military': await this._renderMilitary(content); break;
        case 'research': await this._renderResearch(content); break;
        case 'battles': await this._renderBattles(content); break;
      }
    } catch (err) {
      content.innerHTML = `<p style="color:var(--color-red)">Failed to load: ${err.message}</p>`;
    }
  }

  async _renderOverview(el) {
    const [cities, armies, reports] = await Promise.all([
      this._queries.getPlayerCities(this._serverId),
      this._queries.getPlayerArmies(this._serverId),
      this._queries.getPlayerBattleReports(this._serverId),
    ]);

    // Territory stats from hex renderer
    let ownedTiles = 0, claimedTiles = 0, occupiedTiles = 0, improvedTiles = 0;
    if (this._hexRenderer?.tiles) {
      for (const tile of this._hexRenderer.tiles.values()) {
        if (tile.owner_id === this._playerId) {
          ownedTiles++;
          if (tile.control_level === 'claimed') claimedTiles++;
          else if (tile.control_level === 'occupied') occupiedTiles++;
          else if (tile.control_level === 'improved') improvedTiles++;
        }
      }
    }

    const totalUnits = armies.reduce((s, a) =>
      s + (a.army_units?.reduce((us, au) => us + au.quantity, 0) || 0), 0);
    const fieldArmies = armies.filter(a => !a.is_garrison).length;
    const wins = reports.filter(r => r.result === 'attacker_wins' && r.attacker_id === this._playerId
      || r.result === 'defender_wins' && r.defender_id === this._playerId).length;
    const losses = reports.filter(r => r.result === 'attacker_wins' && r.defender_id === this._playerId
      || r.result === 'defender_wins' && r.attacker_id === this._playerId).length;

    el.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-value">${cities.length}</div><div class="stat-label">Cities</div></div>
        <div class="stat-card"><div class="stat-value">${ownedTiles}</div><div class="stat-label">Territory</div></div>
        <div class="stat-card"><div class="stat-value">${fieldArmies}</div><div class="stat-label">Armies</div></div>
        <div class="stat-card"><div class="stat-value">${totalUnits}</div><div class="stat-label">Total Units</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--color-green)">${wins}</div><div class="stat-label">Victories</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--color-red)">${losses}</div><div class="stat-label">Defeats</div></div>
      </div>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-value" style="color:var(--color-red)">${claimedTiles}</div><div class="stat-label">Claimed (50%)</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--color-gold)">${occupiedTiles}</div><div class="stat-label">Occupied (75%)</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--color-green)">${improvedTiles}</div><div class="stat-label">Improved (100%)</div></div>
      </div>
    `;
  }

  async _renderCities(el) {
    const cities = await this._queries.getPlayerCities(this._serverId);
    let html = `<table class="commander-table">
      <thead><tr><th>City</th><th>Level</th><th>Capital</th><th>Buildings</th></tr></thead><tbody>`;
    for (const c of cities) {
      const buildings = await this._queries.getCityBuildings(c.id);
      const maxSlots = { 1: 3, 2: 5, 3: 8, 4: 12, 5: 16 }[c.level] || 3;
      html += `<tr>
        <td>${esc(c.name)}</td>
        <td>Lv ${c.level}</td>
        <td>${c.is_capital ? '⭐' : ''}</td>
        <td>${buildings.length} / ${maxSlots}</td>
      </tr>`;
    }
    html += `</tbody></table>`;
    el.innerHTML = html;
  }

  async _renderResources(el) {
    const cities = await this._queries.getPlayerCities(this._serverId);
    const allRes = await Promise.all(cities.map(c => this._queries.getCityResources(c.id)));

    // Aggregate
    const agg = {};
    for (const cityRes of allRes) {
      if (!cityRes) continue;
      for (const r of cityRes) {
        if (!agg[r.resource_type]) agg[r.resource_type] = { amount: 0, rate: 0, cap: 0 };
        agg[r.resource_type].amount += r.amount;
        agg[r.resource_type].rate += r.production_rate;
        agg[r.resource_type].cap += r.storage_capacity;
      }
    }

    let html = `<table class="commander-table">
      <thead><tr><th>Resource</th><th>Amount</th><th>Storage</th><th>Rate</th></tr></thead><tbody>`;
    for (const [type, d] of Object.entries(agg)) {
      const pct = d.cap > 0 ? (d.amount / d.cap * 100) : 0;
      const barClass = pct > 90 ? 'full' : pct > 70 ? 'high' : '';
      const rateColor = d.rate > 0 ? 'var(--color-green)' : d.rate < 0 ? 'var(--color-red)' : '';
      html += `<tr>
        <td>${capitalize(type)}</td>
        <td>${Math.floor(d.amount)}</td>
        <td><div class="storage-bar"><div class="storage-bar-fill ${barClass}" style="width:${pct.toFixed(0)}%"></div></div>${Math.floor(d.cap)}</td>
        <td style="color:${rateColor}">${d.rate >= 0 ? '+' : ''}${d.rate.toFixed(1)}/t</td>
      </tr>`;
    }
    html += `</tbody></table>`;
    el.innerHTML = html;
  }

  async _renderMilitary(el) {
    const armies = await this._queries.getPlayerArmies(this._serverId);
    const garrison = armies.find(a => a.is_garrison);
    const field = armies.filter(a => !a.is_garrison);

    // Unit totals by category
    const byCategory = { infantry: 0, armor: 0, artillery: 0 };
    for (const a of armies) {
      for (const au of (a.army_units || [])) {
        const def = this._unitDefs?.find(u => u.id === au.unit_def);
        const cat = def?.category || 'infantry';
        byCategory[cat] = (byCategory[cat] || 0) + au.quantity;
      }
    }

    let html = `<div class="stat-grid">
      <div class="stat-card"><div class="stat-value">${byCategory.infantry}</div><div class="stat-label">Infantry</div></div>
      <div class="stat-card"><div class="stat-value">${byCategory.armor}</div><div class="stat-label">Armor</div></div>
      <div class="stat-card"><div class="stat-value">${byCategory.artillery}</div><div class="stat-label">Artillery</div></div>
    </div>`;

    if (field.length > 0) {
      html += `<table class="commander-table">
        <thead><tr><th>Army</th><th>Units</th><th>Status</th><th>Supply</th></tr></thead><tbody>`;
      for (const a of field) {
        const units = a.army_units?.reduce((s, au) => s + au.quantity, 0) || 0;
        html += `<tr><td>${esc(a.name || 'Army')}</td><td>${units}</td><td>${a.status}</td><td>${a.supply_status || 'supplied'}</td></tr>`;
      }
      html += `</tbody></table>`;
    }

    if (garrison?.army_units?.length > 0) {
      html += `<h3 style="margin-top:16px">Garrison</h3><table class="commander-table">
        <thead><tr><th>Unit</th><th>Qty</th><th>HP</th></tr></thead><tbody>`;
      for (const au of garrison.army_units) {
        const def = this._unitDefs?.find(u => u.id === au.unit_def);
        html += `<tr><td>${def?.name || au.unit_def}</td><td>${au.quantity}</td><td>${Math.round(au.hp_percent)}%</td></tr>`;
      }
      html += `</tbody></table>`;
    }

    el.innerHTML = html;
  }

  async _renderResearch(el) {
    const [defs, progress] = await Promise.all([
      this._queries.getResearchDefs(),
      this._queries.getPlayerResearch(this._serverId),
    ]);

    const progressMap = {};
    for (const p of progress) progressMap[p.research_def] = p;

    let html = `<table class="commander-table">
      <thead><tr><th>Technology</th><th>Category</th><th>Level</th><th>Status</th></tr></thead><tbody>`;
    for (const d of defs) {
      const p = progressMap[d.id];
      const level = p?.level || 0;
      const status = p?.is_researching ? 'Researching...' : level > 0 ? `Level ${level}` : 'Not started';
      const color = p?.is_researching ? 'var(--color-gold)' : level > 0 ? 'var(--color-green)' : '';
      html += `<tr>
        <td>${esc(d.name)}</td>
        <td>${capitalize(d.category)}</td>
        <td>${level} / ${d.max_level}</td>
        <td style="color:${color}">${status}</td>
      </tr>`;
    }
    html += `</tbody></table>`;
    el.innerHTML = html;
  }

  async _renderBattles(el) {
    const reports = await this._queries.getPlayerBattleReports(this._serverId);

    if (!reports || reports.length === 0) {
      el.innerHTML = '<p style="color:var(--text-muted)">No battles yet.</p>';
      return;
    }

    const wins = reports.filter(r =>
      (r.result === 'attacker_wins' && r.attacker_id === this._playerId) ||
      (r.result === 'defender_wins' && r.defender_id === this._playerId)).length;
    const losses = reports.filter(r =>
      (r.result === 'attacker_wins' && r.defender_id === this._playerId) ||
      (r.result === 'defender_wins' && r.attacker_id === this._playerId)).length;
    const draws = reports.filter(r => r.result === 'draw').length;

    let html = `<div class="stat-grid">
      <div class="stat-card"><div class="stat-value">${reports.length}</div><div class="stat-label">Total Battles</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--color-green)">${wins}</div><div class="stat-label">Victories</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--color-red)">${losses}</div><div class="stat-label">Defeats</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--color-gold)">${draws}</div><div class="stat-label">Draws</div></div>
    </div>`;

    html += `<table class="commander-table">
      <thead><tr><th>Date</th><th>Tile</th><th>Role</th><th>Result</th><th>Damage</th></tr></thead><tbody>`;
    for (const r of reports) {
      const isAtk = r.attacker_id === this._playerId;
      const won = (isAtk && r.result === 'attacker_wins') || (!isAtk && r.result === 'defender_wins');
      const resultText = won ? 'Victory' : r.result === 'draw' ? 'Draw' : 'Defeat';
      const color = won ? 'var(--color-green)' : r.result === 'draw' ? 'var(--color-gold)' : 'var(--color-red)';
      html += `<tr>
        <td>${new Date(r.occurred_at).toLocaleDateString()}</td>
        <td>${r.tile_id}</td>
        <td>${isAtk ? 'Attacker' : 'Defender'}</td>
        <td style="color:${color}">${resultText}</td>
        <td>${r.war_damage_caused?.toFixed(1) || '0'}</td>
      </tr>`;
    }
    html += `</tbody></table>`;
    el.innerHTML = html;
  }
}

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
