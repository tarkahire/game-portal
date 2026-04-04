// ==========================================================================
// Dad's Army — Main Entry Point
//
// Bootstraps the application: initializes auth, registers scene lifecycles,
// checks the initial auth state, and wires up all UI event listeners.
// ==========================================================================

import { supabase } from './api/supabaseClient.js';
import { AuthManager } from './systems/AuthManager.js';
import { SceneManager } from './systems/SceneManager.js';
import {
  getActiveServers,
  getPlayerOnServer,
  getAlignmentDefs,
  getServerTiles,
  getCityResources,
  getPlayerCities,
  getAllCities,
  getCityBuildings,
  getBuildingDefs,
  buildBuilding,
  upgradeBuilding,
  getUnitDefs,
  getTrainingQueue,
  getPlayerArmies,
  getAllArmies,
  trainUnits,
  formArmy,
  marchArmy,
  getPlayerBattleReports,
} from './api/queries.js';
import { HexRenderer } from './map/HexRenderer.js';

// ---------- Globals ----------

const auth = new AuthManager(supabase);
const scenes = new SceneManager();

/** Currently authenticated user, kept in sync via auth state listener. */
let currentUser = null;

/** Server ID chosen in the server-select screen. */
let selectedServerId = null;

/** Alignment key chosen in the alignment screen. */
let selectedAlignment = null;

/** Hex map renderer instance (created when game scene enters). */
let hexRenderer = null;

/** Current player record on the active server. */
let currentPlayerRecord = null;

/** Cached building definitions (loaded once per session). */
let buildingDefsCache = null;

/** Cached unit definitions (loaded once per session). */
let unitDefsCache = null;

/** All cities on the current server, keyed by tile_id. */
let citiesByTile = new Map();

/** All non-garrison armies on the current server. */
let armiesOnMap = [];

// ---------- DOM References ----------

const $ = (id) => document.getElementById(id);

const dom = {
  // Screens
  screenLogin:      $('screen-login'),
  screenServers:    $('screen-servers'),
  screenAlignment:  $('screen-alignment'),
  screenGame:       $('screen-game'),

  // Auth
  loginForm:        $('login-form'),
  registerForm:     $('register-form'),
  loginEmail:       $('login-email'),
  loginPassword:    $('login-password'),
  registerEmail:    $('register-email'),
  registerPassword: $('register-password'),
  registerName:     $('register-name'),
  btnLogin:         $('btn-login'),
  // btnGoogle:        $('btn-google'),  // Google OAuth deferred
  btnRegister:      $('btn-register'),
  showRegister:     $('show-register'),
  showLogin:        $('show-login'),
  authError:        $('auth-error'),

  // Servers
  serverList:       $('server-list'),
  userDisplayName:  $('user-display-name'),
  btnLogout:        $('btn-logout'),

  // Alignment
  alignmentGrid:    $('alignment-grid'),
  btnConfirmAlign:  $('btn-confirm-alignment'),
};

// ---------- Helpers ----------

/**
 * Show an error message in the auth error box.
 * @param {string} msg
 */
function showAuthError(msg) {
  dom.authError.textContent = msg;
  dom.authError.style.display = 'block';
}

/** Hide the auth error box. */
function hideAuthError() {
  dom.authError.style.display = 'none';
  dom.authError.textContent = '';
}

/**
 * Show one screen and hide all others.
 * @param {HTMLElement} screenEl
 */
function activateScreen(screenEl) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  screenEl.classList.add('active');
}

/**
 * Set a button to a loading state (disabled with spinner text).
 * @param {HTMLButtonElement} btn
 * @param {boolean} loading
 * @param {string} [originalText]
 */
function setButtonLoading(btn, loading, originalText) {
  if (loading) {
    btn._originalText = btn.textContent;
    btn.textContent = 'Please wait...';
    btn.disabled = true;
  } else {
    btn.textContent = originalText || btn._originalText || 'Submit';
    btn.disabled = false;
  }
}

// ---------- Scene: Login ----------

scenes.register('login', {
  enter() {
    activateScreen(dom.screenLogin);
    hideAuthError();
    // Reset to login form
    dom.loginForm.style.display = 'block';
    dom.registerForm.style.display = 'none';
  },
  exit() {
    dom.screenLogin.classList.remove('active');
  },
});

// Wire up auth form toggling
dom.showRegister.addEventListener('click', (e) => {
  e.preventDefault();
  dom.loginForm.style.display = 'none';
  dom.registerForm.style.display = 'block';
  hideAuthError();
});

dom.showLogin.addEventListener('click', (e) => {
  e.preventDefault();
  dom.registerForm.style.display = 'none';
  dom.loginForm.style.display = 'block';
  hideAuthError();
});

// Login button
dom.btnLogin.addEventListener('click', async () => {
  hideAuthError();
  const email = dom.loginEmail.value.trim();
  const password = dom.loginPassword.value;

  if (!email || !password) {
    showAuthError('Please enter both email and password.');
    return;
  }

  setButtonLoading(dom.btnLogin, true);
  const { session, error } = await auth.signIn(email, password);
  setButtonLoading(dom.btnLogin, false, 'Log In');

  if (error) {
    showAuthError(error.message || 'Login failed. Please try again.');
    return;
  }

  // Auth state listener will handle the scene transition
});

// Register button
dom.btnRegister.addEventListener('click', async () => {
  hideAuthError();
  const email = dom.registerEmail.value.trim();
  const password = dom.registerPassword.value;
  const name = dom.registerName.value.trim();

  if (!email || !password || !name) {
    showAuthError('Please fill in all fields.');
    return;
  }

  if (password.length < 6) {
    showAuthError('Password must be at least 6 characters.');
    return;
  }

  setButtonLoading(dom.btnRegister, true);
  const { user, error } = await auth.signUp(email, password, name);
  setButtonLoading(dom.btnRegister, false, 'Create Account');

  if (error) {
    showAuthError(error.message || 'Registration failed. Please try again.');
    return;
  }

  // Some Supabase configurations require email confirmation
  if (user && !user.confirmed_at && !user.email_confirmed_at) {
    showAuthError('Check your email for a confirmation link, then log in.');
    dom.registerForm.style.display = 'none';
    dom.loginForm.style.display = 'block';
    return;
  }

  // Auth state listener will handle the scene transition
});

// Google OAuth — deferred to future integration (see todo.md)
// When re-enabling: uncomment btn-google in index.html, uncomment btnGoogle in dom,
// and restore this event listener.

// Allow Enter key to submit login/register forms
dom.loginPassword.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') dom.btnLogin.click();
});
dom.registerName.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') dom.btnRegister.click();
});

// ---------- Scene: Servers ----------

scenes.register('servers', {
  async enter() {
    activateScreen(dom.screenServers);

    // Display user name
    if (currentUser) {
      dom.userDisplayName.textContent = auth.getUserDisplayName(currentUser);
    }

    // Load server list
    await loadServerList();
  },
  exit() {
    dom.screenServers.classList.remove('active');
  },
});

async function loadServerList() {
  dom.serverList.innerHTML = '<div class="loading-spinner" style="margin:40px auto"></div>';

  try {
    const servers = await getActiveServers();

    if (!servers || servers.length === 0) {
      dom.serverList.innerHTML = '<p style="text-align:center;color:var(--text-secondary)">No active servers available.</p>';
      return;
    }

    dom.serverList.innerHTML = '';

    for (const server of servers) {
      const card = document.createElement('div');
      card.className = 'server-card';
      card.dataset.serverId = server.id;

      const statusClass = server.status === 'active'
        ? 'active'
        : server.status === 'full'
          ? 'full'
          : 'upcoming';

      card.innerHTML = `
        <div>
          <div class="server-name">
            <span class="server-status ${statusClass}"></span>
            ${escapeHtml(server.name)}
          </div>
        </div>
        <div class="server-meta">
          <span>Day ${server.current_day || 1}</span>
          <span>${server.max_players || '?'} max players</span>
          <span>${capitalize(server.status)}</span>
        </div>
      `;

      card.addEventListener('click', () => onServerSelected(server));
      dom.serverList.appendChild(card);
    }
  } catch (err) {
    console.error('[Main] Failed to load servers:', err);
    dom.serverList.innerHTML = '<p style="text-align:center;color:var(--color-red)">Failed to load servers.</p>';
  }
}

async function onServerSelected(server) {
  selectedServerId = server.id;

  // Check if the player already exists on this server
  try {
    const player = await getPlayerOnServer(selectedServerId);

    if (player) {
      // Player already joined — go straight to game
      scenes.switchTo('game', { serverId: selectedServerId, player });
    } else {
      // New player on this server — choose alignment
      scenes.switchTo('alignment', { serverId: selectedServerId });
    }
  } catch (err) {
    console.error('[Main] Error checking player on server:', err);
    scenes.switchTo('alignment', { serverId: selectedServerId });
  }
}

// Logout button
dom.btnLogout.addEventListener('click', async () => {
  await auth.signOut();
  // Auth state listener handles transition to login
});

// ---------- Scene: Alignment ----------

scenes.register('alignment', {
  async enter(data) {
    activateScreen(dom.screenAlignment);
    selectedAlignment = null;
    dom.btnConfirmAlign.disabled = true;

    if (data?.serverId) {
      selectedServerId = data.serverId;
    }

    await loadAlignments();
  },
  exit() {
    dom.screenAlignment.classList.remove('active');
  },
});

async function loadAlignments() {
  dom.alignmentGrid.innerHTML = '<div class="loading-spinner" style="margin:40px auto"></div>';

  try {
    const alignments = await getAlignmentDefs();

    if (!alignments || alignments.length === 0) {
      dom.alignmentGrid.innerHTML = '<p style="color:var(--text-secondary)">No alignments available.</p>';
      return;
    }

    dom.alignmentGrid.innerHTML = '';

    for (const align of alignments) {
      const card = document.createElement('div');
      card.className = 'alignment-card';
      card.dataset.alignment = align.id;

      card.innerHTML = `
        <div class="alignment-name">${escapeHtml(align.name)}</div>
        <div class="alignment-desc">${escapeHtml(align.description || '')}</div>
      `;

      card.addEventListener('click', () => {
        // Deselect all
        dom.alignmentGrid.querySelectorAll('.alignment-card').forEach((c) => c.classList.remove('selected'));
        // Select this one
        card.classList.add('selected');
        selectedAlignment = align.id;
        dom.btnConfirmAlign.disabled = false;
      });

      dom.alignmentGrid.appendChild(card);
    }
  } catch (err) {
    console.error('[Main] Failed to load alignments:', err);
    dom.alignmentGrid.innerHTML = '<p style="color:var(--color-red)">Failed to load alignments.</p>';
  }
}

dom.btnConfirmAlign.addEventListener('click', async () => {
  if (!selectedAlignment || !selectedServerId) return;

  setButtonLoading(dom.btnConfirmAlign, true);

  try {
    // joinServer is imported from queries — this will be called when
    // the game systems are wired up. For now, transition to game.
    const { joinServer } = await import('./api/queries.js');
    const displayName = currentUser ? auth.getUserDisplayName(currentUser) : 'Soldier';
    const player = await joinServer(selectedServerId, displayName, selectedAlignment);

    scenes.switchTo('game', { serverId: selectedServerId, player });
  } catch (err) {
    console.error('[Main] Failed to join server:', err);
    showAuthError('Failed to join server: ' + (err.message || 'Unknown error'));
  } finally {
    setButtonLoading(dom.btnConfirmAlign, false, 'Confirm & Deploy');
  }
});

// ---------- Scene: Game ----------

scenes.register('game', {
  async enter(data) {
    activateScreen(dom.screenGame);
    resizeGameCanvas();
    window.addEventListener('resize', resizeGameCanvas);

    const serverId = data?.serverId;
    // data.player is either a UUID string (from joinServer RPC) or a player object (from getPlayerOnServer)
    const playerRaw = data?.player;
    const playerId = typeof playerRaw === 'object' && playerRaw !== null ? playerRaw.id : playerRaw;
    currentPlayerRecord = playerId;

    console.log('[Main] Entered game scene', { serverId, playerId });

    // Initialize hex renderer
    const canvas = document.getElementById('game-canvas');
    const minimap = document.getElementById('minimap-canvas');
    if (minimap) {
      minimap.width = minimap.offsetWidth || 200;
      minimap.height = minimap.offsetHeight || 200;
    }

    hexRenderer = new HexRenderer(canvas, minimap);
    hexRenderer.attach();

    // Handle tile click — show info panel
    hexRenderer.onClick((tile) => {
      showTileInfo(tile);
    });

    // Wire up battle reports button
    document.getElementById('btn-battle-reports')?.addEventListener('click', () => {
      showBattleReports();
    });

    // Load tiles, cities, and building defs from Supabase
    try {
      const [tiles, allCities, myCities, bDefs, uDefs, armies] = await Promise.all([
        getServerTiles(serverId),
        getAllCities(serverId),
        getPlayerCities(serverId),
        buildingDefsCache ? Promise.resolve(buildingDefsCache) : getBuildingDefs(),
        unitDefsCache ? Promise.resolve(unitDefsCache) : getUnitDefs(),
        getAllArmies(serverId),
      ]);
      buildingDefsCache = bDefs;
      unitDefsCache = uDefs;
      armiesOnMap = armies;
      console.log(`[Main] Loaded ${tiles.length} tiles, ${allCities.length} cities, ${uDefs.length} unit defs, ${armies.length} armies`);

      // Build cities-by-tile lookup
      citiesByTile.clear();
      for (const city of allCities) {
        citiesByTile.set(Number(city.tile_id), city);
      }

      // Mark tiles that have cities so we don't show "Build City" on them
      const cityTileIds = new Set(allCities.map(c => Number(c.tile_id)));
      for (const tile of tiles) {
        tile._hasCity = cityTileIds.has(Number(tile.id));
      }

      hexRenderer.loadTiles(tiles, playerId);
      hexRenderer.loadArmies(armies, playerId);

      // Load resources from capital city
      if (myCities.length > 0) {
        const capital = myCities.find(c => c.is_capital) || myCities[0];
        const resources = await getCityResources(capital.id);
        updateResourceBar(resources);
      }
    } catch (err) {
      console.error('[Main] Failed to load game data:', err);
    }
  },
  exit() {
    window.removeEventListener('resize', resizeGameCanvas);
    if (hexRenderer) {
      hexRenderer.detach();
      hexRenderer = null;
    }
    dom.screenGame.classList.remove('active');
  },
});

/** Show tile info in the side panel with action buttons. */
async function showTileInfo(tile) {
  const panel = document.getElementById('panel-tile-info');
  const title = document.getElementById('tile-info-title');
  const content = document.getElementById('tile-info-content');
  if (!panel || !content) return;

  title.textContent = `Tile (${tile.q}, ${tile.r})`;

  const isOwned = tile.owner_id === currentPlayerRecord;
  const isUnclaimed = !tile.owner_id;
  const isWater = tile.terrain_type === 'water';
  const isMountain = tile.terrain_type === 'mountain';
  const isLand = !isWater;
  // A tile "has resource" if it has resource_type OR terrain is farmland (farmland IS a resource)
  const hasResource = !!tile.resource_type || tile.terrain_type === 'farmland';
  const resourceType = tile.resource_type || (tile.terrain_type === 'farmland' ? 'farmland' : null);
  const reservesTotal = tile.resource_reserves_total || 0;
  const reservesRemaining = tile.resource_reserves_remaining || 0;
  const isExhausted = reservesTotal > 0 && (reservesRemaining / reservesTotal) < 0.20;
  // Use string comparison for _hasCity in case of type mismatch (int vs string)
  const hasCity = !!tile._hasCity;
  // Can build city: owned, not water/mountain, no city, no active resource (or exhausted)
  const canBuildCity = isOwned && !isWater && !isMountain && !hasCity &&
    (!hasResource || isExhausted);
  // Buildable terrain for cities
  const cityBuildableTerrain = ['plains', 'disused', 'farmland', 'forest', 'desert', 'marsh'];

  const ownerText = tile.owner_id
    ? (isOwned ? 'You' : 'Enemy')
    : 'Unclaimed';

  // Fetch resource field data if this is an owned resource tile
  let resourceField = null;
  if (isOwned && hasResource) {
    try {
      const { getResourceFieldForTile } = await import('./api/queries.js');
      resourceField = await getResourceFieldForTile(tile.id, selectedServerId);
    } catch (err) {
      console.error('[Main] Failed to fetch resource field:', err);
    }
  }

  let html = `
    <div class="tile-info-row"><strong>Terrain:</strong> ${tile.terrain_type}</div>
    <div class="tile-info-row"><strong>Owner:</strong> ${ownerText}</div>
  `;

  if (hasCity) {
    const city = citiesByTile.get(Number(tile.id));
    const cityName = city ? escapeHtml(city.name) : 'City';
    const cityLevel = city ? city.level : '?';
    html += `<div class="tile-info-row"><strong>City:</strong> ${cityName} (Lv ${cityLevel})</div>`;
    if (isOwned && city) {
      html += `<div class="tile-actions"><button class="btn-action btn-action-primary" id="btn-view-city" data-city-id="${city.id}">View City</button></div>`;
    }
  }

  if (hasResource) {
    html += `<div class="tile-info-row"><strong>Resource:</strong> ${resourceType}</div>`;
    if (reservesTotal > 0) {
      const pct = Math.round((reservesRemaining / reservesTotal) * 100);
      html += `<div class="tile-info-row"><strong>Reserves:</strong> ${pct}% (${Math.round(reservesRemaining)} / ${Math.round(reservesTotal)})</div>`;
    } else {
      html += `<div class="tile-info-row"><strong>Reserves:</strong> Undeveloped</div>`;
    }
  }

  // Resource field details (infrastructure, intensity, production)
  if (resourceField) {
    html += `<div class="tile-info-row"><strong>Infrastructure:</strong> Level ${resourceField.infrastructure_level}</div>`;
    html += `<div class="tile-info-row"><strong>Status:</strong> ${capitalize(resourceField.status)}</div>`;
    if (resourceField.production_rate > 0) {
      html += `<div class="tile-info-row"><strong>Production:</strong> ${resourceField.production_rate.toFixed(1)} / tick</div>`;
    }

    // Extraction intensity selector
    const intensities = ['sustainable', 'normal', 'intensive'];
    const intensityLabels = {
      sustainable: 'Sustainable (0.7x)',
      normal: 'Normal (1.0x)',
      intensive: 'Intensive (1.5x)',
    };
    html += `
      <div class="tile-info-section">
        <div class="tile-info-row"><strong>Extraction Intensity:</strong></div>
        <div class="intensity-selector">
    `;
    for (const int of intensities) {
      const isActive = resourceField.extraction_intensity === int;
      const isDisabled = int === 'intensive' && resourceField.infrastructure_level < 3;
      html += `<button class="intensity-btn${isActive ? ' active' : ''}"
        data-intensity="${int}"
        ${isDisabled ? 'disabled title="Requires infrastructure level 3+"' : ''}
      >${intensityLabels[int]}</button>`;
    }
    html += `</div></div>`;
  }

  if (tile.war_damage_level > 0) {
    html += `<div class="tile-info-row"><strong>War Damage:</strong> ${Math.round(tile.war_damage_level)}%</div>`;
  }

  html += `<div class="tile-info-row"><strong>Land Quality:</strong> ${Math.round(tile.land_quality)}%</div>`;

  if (tile.fortification_type) {
    html += `<div class="tile-info-row"><strong>Fortification:</strong> ${tile.fortification_type} (HP: ${Math.round(tile.fortification_hp)})</div>`;
  }

  if (tile.infrastructure_road) html += `<div class="tile-info-row">Road</div>`;
  if (tile.infrastructure_rail) html += `<div class="tile-info-row">Railway</div>`;

  // --- Action buttons ---
  html += '<div class="tile-actions">';

  // March destination (if a march is pending)
  if (window._pendingMarchArmyId && isLand) {
    // Show combat predictor if marching to an enemy tile
    if (!isOwned && !isUnclaimed && unitDefsCache) {
      try {
        const marchingArmy = armiesOnMap.find(a => a.id === window._pendingMarchArmyId);
        if (marchingArmy) {
          const { getPlayerArmies: getArmies } = await import('./api/queries.js');
          const myArmies = await getArmies(selectedServerId);
          const fullArmy = myArmies.find(a => a.id === window._pendingMarchArmyId);
          if (fullArmy?.army_units) {
            const atkUnits = fullArmy.army_units;
            // We don't know defender composition (fog), estimate empty or garrison
            const defUnits = []; // Unknown — predict vs undefended
            const prediction = predictCombat(atkUnits, defUnits, tile.terrain_type, hasCity, !!tile.fortification_type);
            const predColor = prediction.result === 'victory' ? 'var(--color-green)' : prediction.result === 'defeat' ? 'var(--color-red)' : 'var(--color-gold)';
            html += `<div class="combat-prediction" style="border-left:3px solid ${predColor}">
              <div class="prediction-title">Combat Prediction</div>
              <div class="prediction-result" style="color:${predColor}">${prediction.confidence}</div>
              <div class="prediction-detail">~${prediction.rounds} rounds | Your losses: ~${Math.round(prediction.atkLossPct * 100)}%</div>
              <div class="prediction-note">vs undefended tile (garrison unknown)</div>
            </div>`;
          }
        }
      } catch (e) { /* ignore prediction errors */ }
    }

    html += `<button class="btn-action btn-action-primary" id="btn-march-here">March Army Here</button>`;
    html += `<button class="btn-action" id="btn-cancel-march">Cancel March</button>`;
  }

  // Claim: unclaimed, land, not water
  if (isUnclaimed && isLand) {
    html += `<button class="btn-action" id="btn-claim-tile">Claim Tile</button>`;
  }

  // Develop resource: owned, has resource, not yet developed (no resource field)
  if (isOwned && hasResource && !resourceField && reservesRemaining > 0) {
    html += `<button class="btn-action" id="btn-develop-field">Develop Resource</button>`;
  }

  // Build city: owned, suitable terrain, no existing city, no active resource (or exhausted)
  if (canBuildCity && cityBuildableTerrain.includes(tile.terrain_type)) {
    html += `<button class="btn-action btn-action-primary" id="btn-build-city">Build City</button>`;
  }

  html += '</div>';
  content.innerHTML = html;
  panel.style.display = 'block';

  // Wire up march buttons
  const btnMarchHere = document.getElementById('btn-march-here');
  const btnCancelMarch = document.getElementById('btn-cancel-march');
  if (btnMarchHere) {
    btnMarchHere.addEventListener('click', async () => {
      const armyId = window._pendingMarchArmyId;
      window._pendingMarchArmyId = null;
      btnMarchHere.disabled = true;
      btnMarchHere.textContent = 'Marching...';
      try {
        await marchArmy(armyId, tile.id);
        await refreshMap();
      } catch (err) {
        console.error('[Main] March failed:', err);
        alert('March failed: ' + (err.message || 'Unknown error'));
      }
    });
  }
  if (btnCancelMarch) {
    btnCancelMarch.addEventListener('click', () => {
      window._pendingMarchArmyId = null;
      showTileInfo(tile);
    });
  }

  // Wire up "View City" button
  const btnViewCity = document.getElementById('btn-view-city');
  if (btnViewCity) {
    btnViewCity.addEventListener('click', () => {
      const cityId = btnViewCity.dataset.cityId;
      showCityPanel(cityId);
    });
  }

  // Wire up extraction intensity buttons
  if (resourceField) {
    const intensityBtns = content.querySelectorAll('.intensity-btn');
    for (const btn of intensityBtns) {
      btn.addEventListener('click', async () => {
        const intensity = btn.dataset.intensity;
        if (intensity === resourceField.extraction_intensity) return;
        // Disable all buttons during update
        intensityBtns.forEach(b => b.disabled = true);
        try {
          const { setExtractionIntensity } = await import('./api/queries.js');
          await setExtractionIntensity(resourceField.id, intensity);
          // Refresh the panel to show updated state
          await refreshMap();
        } catch (err) {
          console.error('[Main] Set intensity failed:', err);
          alert('Failed to change intensity: ' + (err.message || 'Unknown error'));
          intensityBtns.forEach(b => b.disabled = false);
        }
      });
    }
  }

  // Wire up action buttons
  const btnClaim = document.getElementById('btn-claim-tile');
  const btnDevelop = document.getElementById('btn-develop-field');
  const btnBuildCity = document.getElementById('btn-build-city');

  if (btnClaim) {
    btnClaim.addEventListener('click', async () => {
      btnClaim.disabled = true;
      btnClaim.textContent = 'Claiming...';
      try {
        const { claimTile } = await import('./api/queries.js');
        await claimTile(tile.id, selectedServerId);
        await refreshMap();
      } catch (err) {
        console.error('[Main] Claim failed:', err);
        alert('Claim failed: ' + (err.message || 'Must be adjacent to your territory'));
      }
    });
  }

  if (btnDevelop) {
    btnDevelop.addEventListener('click', async () => {
      btnDevelop.disabled = true;
      btnDevelop.textContent = 'Developing...';
      try {
        const { developResourceField } = await import('./api/queries.js');
        await developResourceField(tile.id, selectedServerId);
        await refreshMap();
      } catch (err) {
        console.error('[Main] Develop failed:', err);
        alert('Develop failed: ' + (err.message || 'Unknown error'));
      }
    });
  }

  if (btnBuildCity) {
    btnBuildCity.addEventListener('click', async () => {
      const cityName = prompt('Name your city:');
      if (!cityName || !cityName.trim()) return;
      btnBuildCity.disabled = true;
      btnBuildCity.textContent = 'Building...';
      try {
        const { buildCity } = await import('./api/queries.js');
        await buildCity(tile.id, selectedServerId, cityName.trim());
        await refreshMap();
        await refreshResources();
      } catch (err) {
        console.error('[Main] Build city failed:', err);
        alert('Build city failed: ' + (err.message || 'Unknown error'));
      }
    });
  }
}

// ---------- City Management Panel ----------

/** Slot counts per city level. */
const CITY_SLOTS = { 1: 3, 2: 5, 3: 8, 4: 12, 5: 16 };

/**
 * Show the city management panel for a given city.
 * @param {string} cityId — UUID
 */
async function showCityPanel(cityId) {
  const panel = document.getElementById('panel-city');
  const titleEl = document.getElementById('city-panel-title');
  const contentEl = document.getElementById('city-panel-content');
  if (!panel || !contentEl) return;

  contentEl.innerHTML = '<div class="loading-spinner" style="margin:30px auto"></div>';
  panel.style.display = 'block';

  try {
    const [buildings, resources, trainingQueue] = await Promise.all([
      getCityBuildings(cityId),
      getCityResources(cityId),
      getTrainingQueue(cityId),
    ]);

    // Find city info from our cache
    let cityInfo = null;
    for (const city of citiesByTile.values()) {
      if (city.id === cityId) { cityInfo = city; break; }
    }

    const cityName = cityInfo ? cityInfo.name : 'City';
    const cityLevel = cityInfo ? cityInfo.level : 1;
    const maxSlots = CITY_SLOTS[cityLevel] || 3;
    const isCapital = cityInfo?.is_capital;

    titleEl.textContent = cityName;

    // Build the panel HTML
    let html = '';

    // City header info
    html += `<div class="panel-section">
      <div class="panel-row"><span class="label">Level</span><span class="value">${cityLevel}</span></div>
      <div class="panel-row"><span class="label">Slots</span><span class="value">${buildings.length} / ${maxSlots}</span></div>
      ${isCapital ? '<div class="panel-row"><span class="label">Capital</span><span class="value" style="color:var(--color-gold)">Yes</span></div>' : ''}
    </div>`;

    // Resource production summary
    if (resources && resources.length > 0) {
      html += `<div class="panel-section"><div class="panel-section-title">Resources</div>`;
      for (const r of resources) {
        const rateClass = r.production_rate >= 0 ? '' : ' negative';
        const rateSign = r.production_rate >= 0 ? '+' : '';
        html += `<div class="panel-row">
          <span class="label">${capitalize(r.resource_type)}</span>
          <span class="value">${Math.floor(r.amount)} <span class="resource-rate${rateClass}">${rateSign}${r.production_rate.toFixed(1)}/t</span></span>
        </div>`;
      }
      html += `</div>`;
    }

    // Building slots
    html += `<div class="panel-section"><div class="panel-section-title">Buildings</div>`;

    // Create a map of slot_index → building
    const slotMap = new Map();
    for (const b of buildings) {
      slotMap.set(b.slot_index, b);
    }

    for (let i = 0; i < maxSlots; i++) {
      const building = slotMap.get(i);
      if (building) {
        const def = buildingDefsCache?.find(d => d.id === building.building_def);
        const bName = def ? def.name : building.building_def;
        const bCategory = def ? def.category : '';

        if (building.is_constructing) {
          // Under construction — show progress
          const completesAt = new Date(building.construction_completes_at);
          const now = Date.now();
          const remaining = Math.max(0, completesAt - now);
          const mins = Math.ceil(remaining / 60000);
          const targetLevel = building.level + 1;

          html += `<div class="building-slot constructing">
            <div class="building-slot-header">
              <span class="building-name">${escapeHtml(bName)}</span>
              <span class="building-level">Lv ${targetLevel}</span>
            </div>
            <div class="building-category">${capitalize(bCategory)}</div>
            <div class="building-progress-bar"><div class="building-progress-fill" style="width:0%"></div></div>
            <div class="building-eta">Building... ~${mins} min</div>
          </div>`;
        } else {
          // Completed building — show info + upgrade button
          const maxBuildingLevel = def ? def.max_level : 3;
          const canUpgrade = building.level < maxBuildingLevel;
          let upgradeCostHtml = '';
          if (canUpgrade && def) {
            const costs = def.costs_per_level?.[building.level];
            if (costs) {
              upgradeCostHtml = Object.entries(costs).map(([r, a]) =>
                `${Math.ceil(a)} ${r}`
              ).join(', ');
            }
          }

          html += `<div class="building-slot">
            <div class="building-slot-header">
              <span class="building-name">${escapeHtml(bName)}</span>
              <span class="building-level">Lv ${building.level}</span>
            </div>
            <div class="building-category">${capitalize(bCategory)}</div>
            ${canUpgrade ? `<button class="btn-action btn-upgrade" data-building-id="${building.id}">Upgrade to Lv ${building.level + 1}${upgradeCostHtml ? ` (${upgradeCostHtml})` : ''}</button>` : '<div class="building-maxed">Max Level</div>'}
          </div>`;
        }
      } else {
        // Empty slot — show build button
        html += `<div class="building-slot empty">
          <button class="btn-action btn-build-slot" data-slot="${i}" data-city-id="${cityId}">+ Build (Slot ${i + 1})</button>
        </div>`;
      }
    }

    html += `</div>`;

    // Training queue section
    const hasBarracks = buildings.some(b => b.building_def === 'barracks' && b.level >= 1 && !b.is_constructing);
    const hasTankFactory = buildings.some(b => b.building_def === 'tank_factory' && b.level >= 1 && !b.is_constructing);
    const hasMilitaryBuilding = hasBarracks || hasTankFactory;

    if (hasMilitaryBuilding) {
      html += `<div class="panel-section"><div class="panel-section-title">Training</div>`;

      // Show current training queue
      if (trainingQueue && trainingQueue.length > 0) {
        for (const tq of trainingQueue) {
          const uDef = unitDefsCache?.find(u => u.id === tq.unit_def);
          const uName = uDef ? uDef.name : tq.unit_def;
          const completesAt = new Date(tq.completes_at);
          const remaining = Math.max(0, completesAt - Date.now());
          const mins = Math.ceil(remaining / 60000);
          html += `<div class="training-item">
            <span class="training-name">${escapeHtml(uName)} x${tq.quantity}</span>
            <span class="training-eta">~${mins} min</span>
          </div>`;
        }
      } else {
        html += `<div class="training-item"><span class="training-name" style="color:var(--text-muted)">No units training</span></div>`;
      }

      html += `<button class="btn-action" id="btn-train-units">Train Units</button>`;
      html += `</div>`;
    }

    // Garrison section
    html += `<div class="panel-section"><div class="panel-section-title">Garrison & Armies</div>`;
    html += `<button class="btn-action" id="btn-view-armies" data-city-id="${cityId}">View Armies</button>`;
    html += `</div>`;

    contentEl.innerHTML = html;

    // Wire up train button
    document.getElementById('btn-train-units')?.addEventListener('click', () => {
      showTrainPicker(cityId, buildings);
    });

    // Wire up armies button
    document.getElementById('btn-view-armies')?.addEventListener('click', () => {
      showArmyPanel(cityId);
    });

    // Wire up upgrade buttons
    contentEl.querySelectorAll('.btn-upgrade').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Upgrading...';
        try {
          await upgradeBuilding(btn.dataset.buildingId);
          await showCityPanel(cityId); // Refresh panel
        } catch (err) {
          console.error('[Main] Upgrade failed:', err);
          alert('Upgrade failed: ' + (err.message || 'Unknown error'));
          btn.disabled = false;
        }
      });
    });

    // Wire up empty slot build buttons
    contentEl.querySelectorAll('.btn-build-slot').forEach(btn => {
      btn.addEventListener('click', () => {
        const slotIndex = parseInt(btn.dataset.slot, 10);
        showBuildPicker(cityId, slotIndex);
      });
    });

  } catch (err) {
    console.error('[Main] Failed to load city data:', err);
    contentEl.innerHTML = '<p style="padding:16px;color:var(--color-red)">Failed to load city data.</p>';
  }
}

/**
 * Show a building picker for an empty slot.
 * @param {string} cityId
 * @param {number} slotIndex
 */
function showBuildPicker(cityId, slotIndex) {
  const contentEl = document.getElementById('city-panel-content');
  if (!contentEl || !buildingDefsCache) return;

  // Group buildings by category
  const categories = {};
  for (const def of buildingDefsCache) {
    if (!categories[def.category]) categories[def.category] = [];
    categories[def.category].push(def);
  }

  let html = `<div class="panel-section">
    <div class="panel-section-title">Choose Building — Slot ${slotIndex + 1}</div>
    <button class="btn-action" id="btn-cancel-build" style="margin-bottom:10px">Cancel</button>
  `;

  for (const [cat, defs] of Object.entries(categories)) {
    html += `<div class="build-category-title">${capitalize(cat)}</div>`;
    for (const def of defs) {
      const costs = def.costs_per_level?.[0];
      const costStr = costs
        ? Object.entries(costs).map(([r, a]) => `${a} ${r}`).join(', ')
        : '?';
      const buildTimeSecs = def.build_time_per_level?.[0] || 0;
      const buildTimeMins = Math.ceil(buildTimeSecs / 60);

      html += `<div class="build-option" data-def-id="${def.id}">
        <div class="build-option-name">${escapeHtml(def.name)}</div>
        <div class="build-option-desc">${escapeHtml(def.description || '')}</div>
        <div class="build-option-cost">Cost: ${costStr}</div>
        <div class="build-option-time">Build: ~${buildTimeMins} min</div>
      </div>`;
    }
  }

  html += `</div>`;
  contentEl.innerHTML = html;

  // Cancel button
  document.getElementById('btn-cancel-build')?.addEventListener('click', () => {
    showCityPanel(cityId);
  });

  // Build option clicks
  contentEl.querySelectorAll('.build-option').forEach(opt => {
    opt.addEventListener('click', async () => {
      const defId = opt.dataset.defId;
      opt.style.opacity = '0.5';
      opt.style.pointerEvents = 'none';
      try {
        await buildBuilding(cityId, defId, slotIndex);
        await showCityPanel(cityId); // Refresh
      } catch (err) {
        console.error('[Main] Build failed:', err);
        alert('Build failed: ' + (err.message || 'Unknown error'));
        opt.style.opacity = '1';
        opt.style.pointerEvents = 'auto';
      }
    });
  });
}

/**
 * Show unit training picker for a city.
 * @param {string} cityId
 * @param {object[]} buildings — city's buildings
 */
function showTrainPicker(cityId, buildings) {
  const contentEl = document.getElementById('city-panel-content');
  if (!contentEl || !unitDefsCache) return;

  const hasBarracks = buildings.some(b => b.building_def === 'barracks' && b.level >= 1 && !b.is_constructing);
  const hasTankFactory = buildings.some(b => b.building_def === 'tank_factory' && b.level >= 1 && !b.is_constructing);

  // Filter available units based on buildings
  const available = unitDefsCache.filter(u => {
    if (u.category === 'infantry' && hasBarracks) return true;
    if (u.category === 'armor' && hasTankFactory) return true;
    if (u.category === 'artillery' && hasBarracks) return true;
    return false;
  });

  let html = `<div class="panel-section">
    <div class="panel-section-title">Train Units</div>
    <button class="btn-action" id="btn-cancel-train" style="margin-bottom:10px">Back to City</button>
  `;

  for (const u of available) {
    const costStr = u.train_cost
      ? Object.entries(u.train_cost).map(([r, a]) => `${a} ${r}`).join(', ')
      : '?';
    const trainMins = Math.ceil((u.train_time || 0) / 60);

    html += `<div class="build-option" data-unit-id="${u.id}">
      <div class="build-option-name">${escapeHtml(u.name)}</div>
      <div class="build-option-desc">${escapeHtml(u.description || '')} (${capitalize(u.category)})</div>
      <div class="build-option-cost">Cost: ${costStr} (per unit)</div>
      <div class="build-option-time">Train: ~${trainMins} min/unit | ATK ${u.attack} DEF ${u.defense} HP ${u.hp}</div>
    </div>`;
  }

  html += `</div>`;
  contentEl.innerHTML = html;

  document.getElementById('btn-cancel-train')?.addEventListener('click', () => showCityPanel(cityId));

  contentEl.querySelectorAll('.build-option').forEach(opt => {
    opt.addEventListener('click', async () => {
      const unitId = opt.dataset.unitId;
      const qtyStr = prompt('How many to train? (1-20)', '5');
      if (!qtyStr) return;
      const qty = parseInt(qtyStr, 10);
      if (isNaN(qty) || qty < 1 || qty > 100) { alert('Invalid quantity'); return; }

      opt.style.opacity = '0.5';
      opt.style.pointerEvents = 'none';
      try {
        await trainUnits(cityId, unitId, qty);
        await showCityPanel(cityId);
      } catch (err) {
        console.error('[Main] Train failed:', err);
        alert('Training failed: ' + (err.message || 'Unknown error'));
        opt.style.opacity = '1';
        opt.style.pointerEvents = 'auto';
      }
    });
  });
}

/**
 * Show the army management panel for a city (garrison + field armies).
 * @param {string} cityId
 */
async function showArmyPanel(cityId) {
  const panel = document.getElementById('panel-army');
  const contentEl = document.getElementById('army-panel-content');
  if (!panel || !contentEl) return;

  contentEl.innerHTML = '<div class="loading-spinner" style="margin:30px auto"></div>';
  panel.style.display = 'block';

  try {
    const armies = await getPlayerArmies(selectedServerId);

    // Find city info
    let cityInfo = null;
    for (const city of citiesByTile.values()) {
      if (city.id === cityId) { cityInfo = city; break; }
    }
    const cityTileId = cityInfo ? Number(cityInfo.tile_id) : null;

    // Split into garrison and field armies at this city's tile
    const garrison = armies.find(a => a.is_garrison && a.tile_id === cityTileId);
    const fieldArmies = armies.filter(a => !a.is_garrison && a.tile_id === cityTileId);
    const otherArmies = armies.filter(a => !a.is_garrison && a.tile_id !== cityTileId);

    let html = '';

    // Garrison
    html += `<div class="panel-section"><div class="panel-section-title">Garrison — ${cityInfo?.name || 'City'}</div>`;
    if (garrison && garrison.army_units && garrison.army_units.length > 0) {
      for (const au of garrison.army_units) {
        const uDef = unitDefsCache?.find(u => u.id === au.unit_def);
        const uName = uDef ? uDef.name : au.unit_def;
        html += `<div class="panel-row">
          <span class="label">${escapeHtml(uName)}</span>
          <span class="value">x${au.quantity} (${Math.round(au.hp_percent)}% HP)</span>
        </div>`;
      }
      html += `<button class="btn-action btn-action-primary" id="btn-form-army">Form Field Army</button>`;
    } else {
      html += `<div class="panel-row"><span class="label" style="color:var(--text-muted)">No garrison units</span></div>`;
    }
    html += `</div>`;

    // Field armies at this city
    if (fieldArmies.length > 0) {
      html += `<div class="panel-section"><div class="panel-section-title">Armies Here</div>`;
      for (const army of fieldArmies) {
        const totalUnits = army.army_units?.reduce((s, au) => s + au.quantity, 0) || 0;
        html += `<div class="army-card">
          <div class="army-card-header">${escapeHtml(army.name || 'Army')} <span class="army-status">${army.status}</span></div>
          <div class="army-card-units">${totalUnits} units</div>
          <button class="btn-action btn-march" data-army-id="${army.id}">March</button>
        </div>`;
      }
      html += `</div>`;
    }

    // Other armies (elsewhere on map)
    if (otherArmies.length > 0) {
      html += `<div class="panel-section"><div class="panel-section-title">Other Armies</div>`;
      for (const army of otherArmies) {
        const totalUnits = army.army_units?.reduce((s, au) => s + au.quantity, 0) || 0;
        html += `<div class="army-card">
          <div class="army-card-header">${escapeHtml(army.name || 'Army')} <span class="army-status">${army.status}</span></div>
          <div class="army-card-units">${totalUnits} units @ tile ${army.tile_id}</div>
        </div>`;
      }
      html += `</div>`;
    }

    html += `<button class="btn-action" id="btn-back-city" style="margin:12px 16px">Back to City</button>`;
    contentEl.innerHTML = html;

    // Wire up "Form Army" button
    document.getElementById('btn-form-army')?.addEventListener('click', async () => {
      if (!garrison?.army_units?.length) return;
      const armyName = prompt('Name your army:', 'Strike Force');
      if (!armyName?.trim()) return;

      // For MVP: form army with all garrison units
      const units = garrison.army_units.map(au => ({
        unit_def: au.unit_def,
        quantity: au.quantity,
      }));

      try {
        await formArmy(cityId, armyName.trim(), units);
        await showArmyPanel(cityId);
        await refreshMap();
      } catch (err) {
        console.error('[Main] Form army failed:', err);
        alert('Form army failed: ' + (err.message || 'Unknown error'));
      }
    });

    // Wire up march buttons
    contentEl.querySelectorAll('.btn-march').forEach(btn => {
      btn.addEventListener('click', () => {
        const armyId = btn.dataset.armyId;
        alert('Click a destination tile on the map, then confirm the march.\n\n(March destination selection coming in next iteration — for now use the tile info panel)');
        // Store pending march for tile click handler
        window._pendingMarchArmyId = armyId;
        panel.style.display = 'none';
      });
    });

    // Back button
    document.getElementById('btn-back-city')?.addEventListener('click', () => {
      panel.style.display = 'none';
      showCityPanel(cityId);
    });

  } catch (err) {
    console.error('[Main] Failed to load armies:', err);
    contentEl.innerHTML = '<p style="padding:16px;color:var(--color-red)">Failed to load armies.</p>';
  }
}

// ---------- Combat Predictor (Client-Side) ----------

/**
 * Predict combat outcome using the same logic as the server.
 * Returns a prediction object with estimated result, casualties, and confidence.
 * @param {object[]} attackerUnits — [{unit_def, quantity, hp_percent, category}]
 * @param {object[]} defenderUnits — same format (empty array if undefended)
 * @param {string} terrainType — terrain of the battle tile
 * @param {boolean} hasCity — whether the tile has a city
 * @param {boolean} hasFort — whether the tile has fortifications
 * @returns {object} — {result, rounds, atkLossPct, defLossPct, confidence}
 */
function predictCombat(attackerUnits, defenderUnits, terrainType, hasCity, hasFort) {
  // Gather stats by category
  const gatherStats = (units) => {
    const stats = { infAtk: 0, armAtk: 0, artAtk: 0, infHp: 0, armHp: 0, artHp: 0 };
    for (const u of units) {
      const def = unitDefsCache?.find(d => d.id === u.unit_def);
      if (!def) continue;
      const hpMod = (u.hp_percent || 100) / 100;
      const cat = def.category;
      if (cat === 'infantry') {
        stats.infAtk += u.quantity * def.attack * hpMod;
        stats.infHp += u.quantity * def.hp * hpMod;
      } else if (cat === 'armor') {
        stats.armAtk += u.quantity * def.attack * hpMod;
        stats.armHp += u.quantity * def.hp * hpMod;
      } else if (cat === 'artillery') {
        stats.artAtk += u.quantity * def.attack * hpMod;
        stats.artHp += u.quantity * def.hp * hpMod;
      }
    }
    return stats;
  };

  const atk = gatherStats(attackerUnits);
  const def = gatherStats(defenderUnits);

  const atkHpStart = atk.infHp + atk.armHp + atk.artHp;
  const defHpStart = def.infHp + def.armHp + def.artHp;

  // Terrain modifiers
  const terrainDefMod = { forest: 1.2, mountain: 1.4, urban: 1.3, ruins: 1.1 }[terrainType] || 1.0;
  const terrainAtkMod = 1.0;
  const cityBonus = hasCity ? 0.5 : 0;
  const fortBonus = hasFort ? 0.15 : 0;

  let atkMorale = 100, defMorale = 100;
  const maxRounds = 10;
  let rounds = 0;

  for (let r = 0; r < maxRounds; r++) {
    const atkTotalHp = atk.infHp + atk.armHp + atk.artHp;
    const defTotalHp = def.infHp + def.armHp + def.artHp;
    if (atkTotalHp <= 0 || defTotalHp <= 0 || atkMorale <= 0 || defMorale <= 0) break;
    rounds++;

    // Category effectiveness
    const atkTotal = (
      atk.infAtk * (def.artHp > 0 ? 1.25 : 1.0) * (def.armHp > 0 ? 0.75 : 1.0) +
      atk.armAtk * (def.infHp > 0 ? 1.25 : 1.0) * (def.artHp > 0 ? 0.75 : 1.0) +
      atk.artAtk * (def.armHp > 0 ? 1.25 : 1.0) * (def.infHp > 0 ? 0.75 : 1.0)
    ) * terrainAtkMod;

    const defTotal = (
      def.infAtk * (atk.artHp > 0 ? 1.25 : 1.0) * (atk.armHp > 0 ? 0.75 : 1.0) +
      def.armAtk * (atk.infHp > 0 ? 1.25 : 1.0) * (atk.artHp > 0 ? 0.75 : 1.0) +
      def.artAtk * (atk.armHp > 0 ? 1.25 : 1.0) * (atk.infHp > 0 ? 0.75 : 1.0)
    ) * terrainDefMod * (1.0 + fortBonus + cityBonus);

    // Apply 10% damage per round
    const atkDmg = atkTotal * 0.1;
    if (defTotalHp > 0) {
      def.infHp = Math.max(def.infHp - atkDmg * def.infHp / defTotalHp, 0);
      def.armHp = Math.max(def.armHp - atkDmg * def.armHp / defTotalHp, 0);
      def.artHp = Math.max(def.artHp - atkDmg * def.artHp / defTotalHp, 0);
    }
    const defDmg = defTotal * 0.1;
    if (atkTotalHp > 0) {
      atk.infHp = Math.max(atk.infHp - defDmg * atk.infHp / atkTotalHp, 0);
      atk.armHp = Math.max(atk.armHp - defDmg * atk.armHp / atkTotalHp, 0);
      atk.artHp = Math.max(atk.artHp - defDmg * atk.artHp / atkTotalHp, 0);
    }

    atkMorale -= defTotal * 0.05;
    defMorale -= atkTotal * 0.05;

    // Diminishing attack values
    atk.infAtk *= Math.max(atk.infHp / Math.max(atkHpStart * 0.5, 1), 0.1);
    atk.armAtk *= Math.max(atk.armHp / Math.max(atkHpStart * 0.5, 1), 0.1);
    atk.artAtk *= Math.max(atk.artHp / Math.max(atkHpStart * 0.5, 1), 0.1);
    def.infAtk *= Math.max(def.infHp / Math.max(defHpStart * 0.5, 1), 0.1);
    def.armAtk *= Math.max(def.armHp / Math.max(defHpStart * 0.5, 1), 0.1);
    def.artAtk *= Math.max(def.artHp / Math.max(defHpStart * 0.5, 1), 0.1);
  }

  const atkHpEnd = atk.infHp + atk.armHp + atk.artHp;
  const defHpEnd = def.infHp + def.armHp + def.artHp;
  const atkLossPct = atkHpStart > 0 ? 1 - (atkHpEnd / atkHpStart) : 1;
  const defLossPct = defHpStart > 0 ? 1 - (defHpEnd / defHpStart) : 1;

  const atkWins = (defHpEnd <= 0 || defMorale <= 0) && (atkHpEnd > 0 && atkMorale > 0);
  const defWins = (atkHpEnd <= 0 || atkMorale <= 0);

  let result, confidence;
  if (atkWins) {
    const survivalPct = 1 - atkLossPct;
    result = 'victory';
    confidence = survivalPct > 0.6 ? 'Likely Victory' : survivalPct > 0.3 ? 'Probable Victory' : 'Pyrrhic Victory';
  } else if (defWins) {
    result = 'defeat';
    confidence = atkLossPct > 0.8 ? 'Likely Defeat' : 'Probable Defeat';
  } else {
    result = 'uncertain';
    confidence = 'Uncertain';
  }

  return { result, rounds, atkLossPct, defLossPct, confidence };
}

// ---------- Battle Reports ----------

/** Show battle reports panel. */
async function showBattleReports() {
  const panel = document.getElementById('panel-battles');
  const contentEl = document.getElementById('battles-panel-content');
  if (!panel || !contentEl) return;

  contentEl.innerHTML = '<div class="loading-spinner" style="margin:30px auto"></div>';
  panel.style.display = 'block';

  try {
    const reports = await getPlayerBattleReports(selectedServerId);

    if (!reports || reports.length === 0) {
      contentEl.innerHTML = '<p style="padding:16px;color:var(--text-muted)">No battles yet.</p>';
      return;
    }

    let html = '';
    for (const r of reports) {
      const isAttacker = r.attacker_id === currentPlayerRecord;
      const won = (isAttacker && r.result === 'attacker_wins') || (!isAttacker && r.result === 'defender_wins');
      const resultClass = won ? 'battle-win' : (r.result === 'draw' ? 'battle-draw' : 'battle-loss');
      const resultText = won ? 'Victory' : (r.result === 'draw' ? 'Draw' : 'Defeat');
      const role = isAttacker ? 'Attacker' : 'Defender';
      const roundCount = Array.isArray(r.rounds) ? r.rounds.length : 0;
      const time = new Date(r.occurred_at).toLocaleString();

      html += `<div class="battle-report-card ${resultClass}" data-report-id="${r.id}">
        <div class="battle-report-header">
          <span class="battle-result">${resultText}</span>
          <span class="battle-role">${role}</span>
        </div>
        <div class="battle-report-meta">
          Tile ${r.tile_id} (${r.terrain_type}) &middot; ${roundCount} rounds &middot; War dmg: ${r.war_damage_caused?.toFixed(1) || '0'}
        </div>
        <div class="battle-report-time">${time}</div>
      </div>`;
    }

    contentEl.innerHTML = html;

    // Click to expand details
    contentEl.querySelectorAll('.battle-report-card').forEach(card => {
      card.addEventListener('click', () => {
        const reportId = card.dataset.reportId;
        const report = reports.find(r => r.id === reportId);
        if (report) showBattleDetail(report);
      });
    });
  } catch (err) {
    console.error('[Main] Failed to load battle reports:', err);
    contentEl.innerHTML = '<p style="padding:16px;color:var(--color-red)">Failed to load reports.</p>';
  }
}

/** Show detailed battle report. */
function showBattleDetail(report) {
  const contentEl = document.getElementById('battles-panel-content');
  if (!contentEl) return;

  const isAttacker = report.attacker_id === currentPlayerRecord;
  const won = (isAttacker && report.result === 'attacker_wins') || (!isAttacker && report.result === 'defender_wins');

  let html = `<button class="btn-action" id="btn-back-battles" style="margin:12px 16px">Back to Reports</button>`;

  html += `<div class="panel-section">
    <div class="panel-section-title">${won ? 'Victory' : 'Defeat'} — Tile ${report.tile_id}</div>
    <div class="panel-row"><span class="label">Terrain</span><span class="value">${report.terrain_type}</span></div>
    <div class="panel-row"><span class="label">War Damage</span><span class="value">${report.war_damage_caused?.toFixed(1) || '0'}</span></div>
  </div>`;

  // Army snapshots
  html += `<div class="panel-section"><div class="panel-section-title">Attacker Forces</div>`;
  if (Array.isArray(report.attacker_army_snapshot)) {
    for (const u of report.attacker_army_snapshot) {
      const uDef = unitDefsCache?.find(d => d.id === u.unit_def);
      html += `<div class="panel-row"><span class="label">${uDef?.name || u.unit_def}</span><span class="value">x${u.quantity} (${Math.round(u.hp_percent)}%)</span></div>`;
    }
  }
  html += `</div>`;

  html += `<div class="panel-section"><div class="panel-section-title">Defender Forces</div>`;
  if (Array.isArray(report.defender_army_snapshot) && report.defender_army_snapshot.length > 0) {
    for (const u of report.defender_army_snapshot) {
      const uDef = unitDefsCache?.find(d => d.id === u.unit_def);
      html += `<div class="panel-row"><span class="label">${uDef?.name || u.unit_def}</span><span class="value">x${u.quantity} (${Math.round(u.hp_percent)}%)</span></div>`;
    }
  } else {
    html += `<div class="panel-row"><span class="label" style="color:var(--text-muted)">Undefended</span></div>`;
  }
  html += `</div>`;

  // Round-by-round
  if (Array.isArray(report.rounds) && report.rounds.length > 0) {
    html += `<div class="panel-section"><div class="panel-section-title">Rounds</div>`;
    for (const rd of report.rounds) {
      const atkHp = rd.atk_hp || {};
      const defHp = rd.def_hp || {};
      const atkTotal = (atkHp.infantry || 0) + (atkHp.armor || 0) + (atkHp.artillery || 0);
      const defTotal = (defHp.infantry || 0) + (defHp.armor || 0) + (defHp.artillery || 0);
      html += `<div class="round-row">
        <span class="round-num">R${rd.round}</span>
        <span class="round-atk">ATK: ${Math.round(atkTotal)} HP / ${Math.round(rd.atk_morale)} MRL</span>
        <span class="round-def">DEF: ${Math.round(defTotal)} HP / ${Math.round(rd.def_morale)} MRL</span>
      </div>`;
    }
    html += `</div>`;
  }

  contentEl.innerHTML = html;

  document.getElementById('btn-back-battles')?.addEventListener('click', () => showBattleReports());
}

/** Reload tiles from Supabase and re-render the map. */
async function refreshMap() {
  if (!hexRenderer || !selectedServerId) return;
  try {
    const [tiles, allCities, armies] = await Promise.all([
      getServerTiles(selectedServerId),
      getAllCities(selectedServerId),
      getAllArmies(selectedServerId),
    ]);
    armiesOnMap = armies;
    // Update cities cache
    citiesByTile.clear();
    for (const city of allCities) {
      citiesByTile.set(Number(city.tile_id), city);
    }
    const cityTileIds = new Set(allCities.map(c => Number(c.tile_id)));
    for (const tile of tiles) {
      tile._hasCity = cityTileIds.has(Number(tile.id));
    }
    hexRenderer.loadTiles(tiles, currentPlayerRecord);
    hexRenderer.loadArmies(armies, currentPlayerRecord);
    // Re-select the same tile to refresh the panel
    if (hexRenderer.selectedTile) {
      const updated = tiles.find(t => t.q === hexRenderer.selectedTile.q && t.r === hexRenderer.selectedTile.r);
      if (updated) {
        hexRenderer.selectedTile = updated;
        showTileInfo(updated);
      }
    }
  } catch (err) {
    console.error('[Main] Failed to refresh map:', err);
  }
}

/** Reload player resources for the resource bar. */
async function refreshResources() {
  try {
    const cities = await getPlayerCities(selectedServerId);
    if (cities && cities.length > 0) {
      const resources = await getCityResources(cities[0].id);
      updateResourceBar(resources);
    }
  } catch (err) {
    console.error('[Main] Failed to refresh resources:', err);
  }
}

/** Update the resource bar at the top of the screen. */
function updateResourceBar(resources) {
  const bar = document.getElementById('resource-bar');
  if (!bar || !resources) return;

  const icons = {
    money: '💰', food: '🌾', steel: '⚙️', oil: '🛢️', manpower: '👥',
    ammunition: '🔫', copper: '🔶', coal: '⬛', iron: '🔩',
  };

  bar.innerHTML = resources.map(r =>
    `<div class="resource-item">
      <span class="resource-icon">${icons[r.resource_type] || '📦'}</span>
      <span class="resource-name">${r.resource_type}</span>
      <span class="resource-amount">${Math.floor(r.amount)}</span>
    </div>`
  ).join('');
}

function resizeGameCanvas() {
  const canvas = $('game-canvas');
  if (!canvas) return;

  const resourceBarHeight = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--resource-bar-height'),
    10,
  ) || 44;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - resourceBarHeight;
}

// ---------- Utility Functions ----------

/**
 * Basic HTML escaping to prevent XSS in dynamically rendered content.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Capitalize the first letter of a string.
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ---------- Initialization ----------

async function init() {
  // Check for an existing session
  const session = await auth.getSession();

  if (session) {
    currentUser = session.user;
    scenes.switchTo('servers');
  } else {
    scenes.switchTo('login');
  }

  // Listen for auth state changes (login, logout, token refresh)
  auth.onAuthStateChange((event, session) => {
    console.log('[Auth] State change:', event);

    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      currentUser = session?.user || null;
      // Only navigate to servers if we're on the login screen
      if (scenes.getCurrent() === 'login') {
        scenes.switchTo('servers');
      }
    }

    if (event === 'SIGNED_OUT') {
      currentUser = null;
      selectedServerId = null;
      selectedAlignment = null;
      scenes.switchTo('login');
    }
  });
}

init().catch((err) => {
  console.error('[Main] Initialization failed:', err);
});
