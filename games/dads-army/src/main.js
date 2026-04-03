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
} from './api/queries.js';

// ---------- Globals ----------

const auth = new AuthManager(supabase);
const scenes = new SceneManager();

/** Currently authenticated user, kept in sync via auth state listener. */
let currentUser = null;

/** Server ID chosen in the server-select screen. */
let selectedServerId = null;

/** Alignment key chosen in the alignment screen. */
let selectedAlignment = null;

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
  btnGoogle:        $('btn-google'),
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

// Google OAuth button
dom.btnGoogle.addEventListener('click', async () => {
  hideAuthError();
  setButtonLoading(dom.btnGoogle, true);
  const { error } = await auth.signInWithGoogle();
  setButtonLoading(dom.btnGoogle, false, 'Sign in with Google');

  if (error) {
    showAuthError(error.message || 'Google sign-in failed.');
  }
  // On success, browser redirects to Google; no further action here
});

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
          <span>${server.player_count || 0} / ${server.max_players || '?'} players</span>
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
      card.dataset.alignment = align.key;

      card.innerHTML = `
        <div class="alignment-name">${escapeHtml(align.name)}</div>
        <div class="alignment-desc">${escapeHtml(align.description || '')}</div>
        <div class="alignment-bonus">${escapeHtml(align.bonus_text || '')}</div>
      `;

      card.addEventListener('click', () => {
        // Deselect all
        dom.alignmentGrid.querySelectorAll('.alignment-card').forEach((c) => c.classList.remove('selected'));
        // Select this one
        card.classList.add('selected');
        selectedAlignment = align.key;
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
  enter(data) {
    activateScreen(dom.screenGame);

    // Resize the game canvas to fill available space
    resizeGameCanvas();
    window.addEventListener('resize', resizeGameCanvas);

    // TODO: Initialize hex map renderer, resource polling, realtime
    // subscriptions, and other game systems here.
    console.log('[Main] Entered game scene', data);
  },
  exit() {
    window.removeEventListener('resize', resizeGameCanvas);
    dom.screenGame.classList.remove('active');
  },
});

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
