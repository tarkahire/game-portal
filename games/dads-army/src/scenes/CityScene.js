// ==========================================================================
// CityScene — Full-screen city management overlay
//
// Replaces the 340px side panel with a full-screen dossier-style view
// showing buildings, resources, training, and garrison in a spacious layout.
// ==========================================================================

import { collapsibleSection, wireCollapsibles } from '../ui/CollapsibleSection.js';

export class CityScene {
  constructor({ getCityBuildings, getCityResources, getTrainingQueue, getPlayerArmies,
                getBuildingDefs, getUnitDefs, buildBuilding, upgradeBuilding, upgradeCity,
                trainUnits, formArmy, supabase, serverId, playerId,
                buildingDefsCache, unitDefsCache, playerAlignment, onClose }) {
    this._q = { getCityBuildings, getCityResources, getTrainingQueue, getPlayerArmies,
                getBuildingDefs, getUnitDefs, buildBuilding, upgradeBuilding, upgradeCity,
                trainUnits, formArmy };
    this._supabase = supabase;
    this._serverId = serverId;
    this._playerId = playerId;
    this._buildingDefs = buildingDefsCache;
    this._unitDefs = unitDefsCache;
    this._playerAlignment = playerAlignment;
    this._onClose = onClose;
    this._cityId = null;
    this._timerInterval = null;
  }

  async open(cityId, cityInfo) {
    this._cityId = cityId;
    this._cityInfo = cityInfo;

    const overlay = document.getElementById('city-scene-overlay');
    overlay.style.display = 'flex';
    overlay.innerHTML = `
      <div class="city-scene-panel">
        <div class="city-scene-header">
          <div class="city-scene-title-block">
            <h2>${esc(cityInfo?.name || 'City')}</h2>
            <div class="city-scene-subtitle">Level ${cityInfo?.level || 1} ${cityInfo?.is_capital ? '★ Capital' : ''}</div>
          </div>
          <button class="btn-close" id="btn-close-city-scene">&times;</button>
        </div>
        <div class="city-scene-body" id="city-scene-body">
          <div class="loading-spinner" style="margin:40px auto"></div>
        </div>
      </div>
    `;

    document.getElementById('btn-close-city-scene')?.addEventListener('click', () => this.close());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.close(); });
    this._escHandler = (e) => { if (e.key === 'Escape') this.close(); };
    document.addEventListener('keydown', this._escHandler);

    // Start timer for construction countdowns
    this._timerInterval = setInterval(() => this._updateTimers(), 1000);

    await this._render();
  }

  close() {
    document.getElementById('city-scene-overlay').style.display = 'none';
    if (this._escHandler) document.removeEventListener('keydown', this._escHandler);
    if (this._timerInterval) { clearInterval(this._timerInterval); this._timerInterval = null; }
    if (this._onClose) this._onClose();
  }

  async _render() {
    const body = document.getElementById('city-scene-body');
    if (!body) return;

    try {
      const [buildings, resources, trainingQueue, armies] = await Promise.all([
        this._q.getCityBuildings(this._cityId),
        this._q.getCityResources(this._cityId),
        this._q.getTrainingQueue(this._cityId),
        this._q.getPlayerArmies(this._serverId),
      ]);

      const cityLevel = this._cityInfo?.level || 1;
      const SLOTS = { 1: 3, 2: 5, 3: 8, 4: 12, 5: 16 };
      const maxSlots = SLOTS[cityLevel] || 3;

      let html = '<div class="city-scene-grid">';

      // --- LEFT COLUMN: Resources + Upgrade ---
      html += '<div class="city-scene-col">';

      // City upgrade
      const upgradeCosts = { 1: { m: 1000, s: 200, p: 100 }, 2: { m: 3000, s: 500, p: 200 }, 3: { m: 8000, s: 1200, p: 400 }, 4: { m: 20000, s: 3000, p: 800 } };
      const uc = upgradeCosts[cityLevel];
      if (uc && cityLevel < 5) {
        html += `<div class="city-scene-card">
          <div class="city-scene-card-title">Upgrade to Level ${cityLevel + 1}</div>
          <div class="city-scene-card-detail">${uc.m} money, ${uc.s} steel, ${uc.p} manpower → ${SLOTS[cityLevel + 1]} slots</div>
          <button class="btn-action btn-action-primary" id="btn-cs-upgrade">Upgrade City</button>
        </div>`;
      }

      // Resources
      let resHtml = '';
      if (resources?.length > 0) {
        for (const r of resources) {
          const rateSign = r.production_rate >= 0 ? '+' : '';
          const rateClass = r.production_rate > 0 ? 'positive' : r.production_rate < 0 ? 'negative' : '';
          resHtml += `<div class="panel-row">
            <span class="label">${capitalize(r.resource_type)}</span>
            <span class="value">${Math.floor(r.amount)} / ${Math.floor(r.storage_capacity)} <span class="resource-rate ${rateClass}">${rateSign}${r.production_rate.toFixed(1)}/t</span></span>
          </div>`;
        }
      }
      html += collapsibleSection('cs-resources', 'Resources', resHtml || '<div class="panel-row"><span class="label">No resources</span></div>');

      // Garrison
      const cityTileId = this._cityInfo?.tile_id;
      const garrison = armies.find(a => a.is_garrison && a.tile_id === Number(cityTileId));
      let garrHtml = '';
      if (garrison?.army_units?.length > 0) {
        for (const au of garrison.army_units) {
          const uDef = this._unitDefs?.find(u => u.id === au.unit_def);
          garrHtml += `<div class="panel-row">
            <span class="label">${esc(uDef?.name || au.unit_def)}</span>
            <span class="value">x${au.quantity} (${Math.round(au.hp_percent)}% HP)</span>
          </div>`;
        }
      } else {
        garrHtml = '<div class="panel-row"><span class="label" style="color:var(--text-muted)">No garrison units</span></div>';
      }
      html += collapsibleSection('cs-garrison', 'Garrison', garrHtml);

      html += '</div>';

      // --- RIGHT COLUMN: Buildings + Training ---
      html += '<div class="city-scene-col">';

      // Buildings
      const slotMap = new Map();
      for (const b of buildings) slotMap.set(b.slot_index, b);

      let buildHtml = '';
      for (let i = 0; i < maxSlots; i++) {
        const building = slotMap.get(i);
        if (building) {
          const def = this._buildingDefs?.find(d => d.id === building.building_def);
          const bName = def ? def.name : building.building_def;
          const bCat = def ? capitalize(def.category) : '';

          if (building.is_constructing) {
            const remaining = Math.max(0, new Date(building.construction_completes_at) - Date.now());
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            const totalDur = new Date(building.construction_completes_at) - new Date(building.construction_started_at || building.construction_completes_at);
            const elapsed = Date.now() - new Date(building.construction_started_at || building.construction_completes_at);
            const pct = totalDur > 0 ? Math.min(Math.max(elapsed / totalDur * 100, 0), 100) : 0;

            buildHtml += `<div class="building-slot constructing">
              <div class="building-slot-header"><span class="building-name">${esc(bName)}</span><span class="building-level">Lv ${building.level + 1}</span></div>
              <div class="building-category">${bCat}</div>
              <div class="building-progress-bar"><div class="building-progress-fill" data-started-at="${building.construction_started_at}" data-completes-at="${building.construction_completes_at}" style="width:${pct.toFixed(1)}%"></div></div>
              <div class="building-eta" data-completes-at="${building.construction_completes_at}">${mins}m ${secs}s remaining</div>
            </div>`;
          } else {
            const maxLvl = def ? def.max_level : 3;
            const canUp = building.level < maxLvl;
            let costStr = '';
            if (canUp && def?.costs_per_level?.[building.level]) {
              costStr = Object.entries(def.costs_per_level[building.level]).map(([r, a]) => `${Math.ceil(a)} ${r}`).join(', ');
            }
            buildHtml += `<div class="building-slot">
              <div class="building-slot-header"><span class="building-name">${esc(bName)}</span><span class="building-level">Lv ${building.level}</span></div>
              <div class="building-category">${bCat}</div>
              ${canUp ? `<button class="btn-action btn-cs-upgrade-building" data-building-id="${building.id}">Upgrade to Lv ${building.level + 1}${costStr ? ` (${costStr})` : ''}</button>` : '<div class="building-maxed">Max Level</div>'}
            </div>`;
          }
        } else {
          buildHtml += `<div class="building-slot empty">
            <button class="btn-action btn-cs-build" data-slot="${i}">+ Build (Slot ${i + 1})</button>
          </div>`;
        }
      }
      html += collapsibleSection('cs-buildings', `Buildings (${buildings.length}/${maxSlots})`, buildHtml);

      // Training
      const hasBarracks = buildings.some(b => b.building_def === 'barracks' && b.level >= 1 && !b.is_constructing);
      const hasTankFactory = buildings.some(b => b.building_def === 'tank_factory' && b.level >= 1 && !b.is_constructing);

      if (hasBarracks || hasTankFactory) {
        let trainHtml = '';
        if (trainingQueue?.length > 0) {
          for (const tq of trainingQueue) {
            const uDef = this._unitDefs?.find(u => u.id === tq.unit_def);
            const remaining = Math.max(0, new Date(tq.completes_at) - Date.now());
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            trainHtml += `<div class="training-item">
              <span class="training-name">${esc(uDef?.name || tq.unit_def)} x${tq.quantity}</span>
              <span class="training-eta" data-completes-at="${tq.completes_at}">${mins}m ${secs}s</span>
            </div>`;
          }
        } else {
          trainHtml = '<div class="training-item"><span class="training-name" style="color:var(--text-muted)">No units training</span></div>';
        }
        trainHtml += `<button class="btn-action" id="btn-cs-train">Train Units</button>`;
        html += collapsibleSection('cs-training', 'Training', trainHtml);
      }

      html += '</div>';
      html += '</div>';

      body.innerHTML = html;
      wireCollapsibles(body);

      // Wire up buttons
      this._wireButtons(buildings);
    } catch (err) {
      body.innerHTML = `<p style="padding:20px;color:var(--color-red)">Failed to load city: ${err.message}</p>`;
    }
  }

  _wireButtons(buildings) {
    const body = document.getElementById('city-scene-body');

    // City upgrade
    document.getElementById('btn-cs-upgrade')?.addEventListener('click', async (e) => {
      e.target.disabled = true;
      e.target.textContent = 'Upgrading...';
      try {
        await this._q.upgradeCity(this._cityId, this._serverId);
        this._cityInfo.level = (this._cityInfo.level || 1) + 1;
        await this._render();
      } catch (err) { alert('Upgrade failed: ' + (err.message || 'Unknown error')); }
    });

    // Building upgrades
    body.querySelectorAll('.btn-cs-upgrade-building').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Upgrading...';
        try {
          await this._q.upgradeBuilding(btn.dataset.buildingId);
          await this._render();
        } catch (err) { alert('Upgrade failed: ' + (err.message || 'Unknown error')); btn.disabled = false; }
      });
    });

    // Build in slot
    body.querySelectorAll('.btn-cs-build').forEach(btn => {
      btn.addEventListener('click', () => {
        this._showBuildPicker(parseInt(btn.dataset.slot, 10));
      });
    });

    // Train units
    document.getElementById('btn-cs-train')?.addEventListener('click', () => {
      this._showTrainPicker(buildings);
    });
  }

  _showBuildPicker(slotIndex) {
    const body = document.getElementById('city-scene-body');
    if (!body || !this._buildingDefs) return;

    const categories = {};
    for (const def of this._buildingDefs) {
      if (!categories[def.category]) categories[def.category] = [];
      categories[def.category].push(def);
    }

    let html = `<div class="city-scene-picker">
      <div class="city-scene-card-title">Choose Building — Slot ${slotIndex + 1}</div>
      <button class="btn-action" id="btn-cs-cancel-build" style="margin-bottom:12px">Back to City</button>
      <div class="city-scene-picker-grid">`;

    for (const [cat, defs] of Object.entries(categories)) {
      html += `<div class="build-category-title">${capitalize(cat)}</div>`;
      for (const def of defs) {
        const costs = def.costs_per_level?.[0];
        const costStr = costs ? Object.entries(costs).map(([r, a]) => `${a} ${r}`).join(', ') : '?';
        const timeMins = Math.ceil((def.build_time_per_level?.[0] || 0) / 60);
        html += `<div class="build-option" data-def-id="${def.id}">
          <div class="build-option-name">${esc(def.name)}</div>
          <div class="build-option-desc">${esc(def.description || '')}</div>
          <div class="build-option-cost">Cost: ${costStr}</div>
          <div class="build-option-time">Build: ~${timeMins} min</div>
        </div>`;
      }
    }

    html += `</div></div>`;
    body.innerHTML = html;

    document.getElementById('btn-cs-cancel-build')?.addEventListener('click', () => this._render());

    body.querySelectorAll('.build-option').forEach(opt => {
      opt.addEventListener('click', async () => {
        opt.style.opacity = '0.5';
        opt.style.pointerEvents = 'none';
        try {
          await this._q.buildBuilding(this._cityId, opt.dataset.defId, slotIndex);
          await this._render();
        } catch (err) {
          alert('Build failed: ' + (err.message || 'Unknown error'));
          opt.style.opacity = '1'; opt.style.pointerEvents = 'auto';
        }
      });
    });
  }

  _showTrainPicker(buildings) {
    const body = document.getElementById('city-scene-body');
    if (!body || !this._unitDefs) return;

    const hasBarracks = buildings.some(b => b.building_def === 'barracks' && b.level >= 1 && !b.is_constructing);
    const hasTankFactory = buildings.some(b => b.building_def === 'tank_factory' && b.level >= 1 && !b.is_constructing);

    const available = this._unitDefs.filter(u => {
      if (u.category === 'infantry' && hasBarracks) return true;
      if (u.category === 'armor' && hasTankFactory) return true;
      if (u.category === 'artillery' && hasBarracks) return true;
      return false;
    });

    let html = `<div class="city-scene-picker">
      <div class="city-scene-card-title">Train Units</div>
      <button class="btn-action" id="btn-cs-cancel-train" style="margin-bottom:12px">Back to City</button>
      <div class="city-scene-picker-grid">`;

    const tankImgSrc = this._playerAlignment
      ? `assets/units/tanks/tank_${this._playerAlignment}.png` : null;

    for (const u of available) {
      const costStr = u.train_cost ? Object.entries(u.train_cost).map(([r, a]) => `${a} ${r}`).join(', ') : '?';
      const timeMins = Math.ceil((u.train_time || 0) / 60);
      const isArmor = u.category === 'armor';
      const tankThumb = isArmor && tankImgSrc
        ? `<img src="${tankImgSrc}" class="train-unit-img" alt="${esc(u.name)}">`
        : '';
      html += `<div class="build-option" data-unit-id="${u.id}">
        ${tankThumb}
        <div class="build-option-name">${esc(u.name)}</div>
        <div class="build-option-desc">${esc(u.description || '')} (${capitalize(u.category)})</div>
        <div class="build-option-cost">Cost: ${costStr} per unit</div>
        <div class="build-option-time">Train: ~${timeMins} min | ATK ${u.attack} DEF ${u.defense} HP ${u.hp}</div>
      </div>`;
    }

    html += `</div></div>`;
    body.innerHTML = html;

    document.getElementById('btn-cs-cancel-train')?.addEventListener('click', () => this._render());

    body.querySelectorAll('.build-option').forEach(opt => {
      opt.addEventListener('click', async () => {
        const qty = prompt('How many to train? (1-20)', '5');
        if (!qty) return;
        const n = parseInt(qty, 10);
        if (isNaN(n) || n < 1 || n > 100) { alert('Invalid quantity'); return; }
        opt.style.opacity = '0.5'; opt.style.pointerEvents = 'none';
        try {
          await this._q.trainUnits(this._cityId, opt.dataset.unitId, n);
          await this._render();
        } catch (err) {
          alert('Training failed: ' + (err.message || 'Unknown error'));
          opt.style.opacity = '1'; opt.style.pointerEvents = 'auto';
        }
      });
    });
  }

  _updateTimers() {
    const now = Date.now();
    document.querySelectorAll('#city-scene-body .building-eta').forEach(el => {
      const ca = el.dataset.completesAt;
      if (!ca) return;
      const rem = Math.max(0, new Date(ca) - now);
      if (rem <= 0) { el.textContent = 'Complete!'; el.style.color = 'var(--color-green)'; }
      else { el.textContent = `${Math.floor(rem / 60000)}m ${Math.floor((rem % 60000) / 1000)}s remaining`; }
    });
    document.querySelectorAll('#city-scene-body .building-progress-fill').forEach(bar => {
      const sa = bar.dataset.startedAt, ca = bar.dataset.completesAt;
      if (!sa || !ca) return;
      const total = new Date(ca) - new Date(sa), elapsed = now - new Date(sa);
      bar.style.width = Math.min(Math.max(elapsed / total * 100, 0), 100) + '%';
    });
    document.querySelectorAll('#city-scene-body .training-eta').forEach(el => {
      const ca = el.dataset.completesAt;
      if (!ca) return;
      const rem = Math.max(0, new Date(ca) - now);
      if (rem <= 0) { el.textContent = 'Done!'; el.style.color = 'var(--color-green)'; }
      else { el.textContent = `${Math.floor(rem / 60000)}m ${Math.floor((rem % 60000) / 1000)}s`; }
    });
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
