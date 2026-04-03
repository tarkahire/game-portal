// ==========================================================================
// Realtime Subscription Manager
//
// Manages Supabase Realtime channels for live game updates. Each function
// creates a channel that listens for Postgres changes on a specific table
// and invokes the provided callback with the new/changed row.
//
// Call unsubscribeAll() when leaving a game session or logging out to
// clean up all active channels.
// ==========================================================================

import { supabase } from './supabaseClient.js';

/** @type {import('@supabase/supabase-js').RealtimeChannel[]} */
const activeChannels = [];

// ==========================================================================
// Tile Changes
// ==========================================================================

/**
 * Subscribe to tile ownership and state changes on a server. Fires when
 * any tile on the server is inserted, updated, or deleted.
 *
 * @param {string} serverId — UUID of the game server
 * @param {(payload: object) => void} callback — receives the realtime payload
 * @returns {import('@supabase/supabase-js').RealtimeChannel}
 */
export function subscribeToTileChanges(serverId, callback) {
  const channel = supabase
    .channel(`tiles:server:${serverId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tiles',
        filter: `server_id=eq.${serverId}`,
      },
      (payload) => {
        try {
          callback(payload);
        } catch (err) {
          console.error('[Subscriptions] Tile change handler error:', err);
        }
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Subscriptions] Listening for tile changes on server ${serverId}`);
      }
      if (status === 'CHANNEL_ERROR') {
        console.error('[Subscriptions] Tile changes channel error');
      }
    });

  activeChannels.push(channel);
  return channel;
}

// ==========================================================================
// Army Movements
// ==========================================================================

/**
 * Subscribe to army position and status changes on a server. Fires on
 * inserts (new armies), updates (movement, combat status), and deletes
 * (army destroyed).
 *
 * @param {string} serverId — UUID of the game server
 * @param {(payload: object) => void} callback
 * @returns {import('@supabase/supabase-js').RealtimeChannel}
 */
export function subscribeToArmyMovements(serverId, callback) {
  const channel = supabase
    .channel(`armies:server:${serverId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'armies',
        filter: `server_id=eq.${serverId}`,
      },
      (payload) => {
        try {
          callback(payload);
        } catch (err) {
          console.error('[Subscriptions] Army movement handler error:', err);
        }
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Subscriptions] Listening for army movements on server ${serverId}`);
      }
      if (status === 'CHANNEL_ERROR') {
        console.error('[Subscriptions] Army movements channel error');
      }
    });

  activeChannels.push(channel);
  return channel;
}

// ==========================================================================
// Battle Reports
// ==========================================================================

/**
 * Subscribe to new battle reports involving the current player. Fires
 * when a new report is inserted where the player is attacker or defender.
 *
 * @param {string} playerId — UUID of the player (auth user ID)
 * @param {(payload: object) => void} callback
 * @returns {import('@supabase/supabase-js').RealtimeChannel}
 */
export function subscribeToBattleReports(playerId, callback) {
  // Supabase Realtime filters support a single column filter, so we
  // create two subscriptions on the same channel for attacker & defender.
  const channel = supabase
    .channel(`battles:player:${playerId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'battle_reports',
        filter: `attacker_id=eq.${playerId}`,
      },
      (payload) => {
        try {
          callback(payload);
        } catch (err) {
          console.error('[Subscriptions] Battle report (attacker) handler error:', err);
        }
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'battle_reports',
        filter: `defender_id=eq.${playerId}`,
      },
      (payload) => {
        try {
          callback(payload);
        } catch (err) {
          console.error('[Subscriptions] Battle report (defender) handler error:', err);
        }
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Subscriptions] Listening for battle reports for player ${playerId}`);
      }
      if (status === 'CHANNEL_ERROR') {
        console.error('[Subscriptions] Battle reports channel error');
      }
    });

  activeChannels.push(channel);
  return channel;
}

// ==========================================================================
// Notifications
// ==========================================================================

/**
 * Subscribe to new notifications for the current player.
 *
 * @param {string} playerId — UUID of the player (auth user ID)
 * @param {(payload: object) => void} callback
 * @returns {import('@supabase/supabase-js').RealtimeChannel}
 */
export function subscribeToNotifications(playerId, callback) {
  const channel = supabase
    .channel(`notifications:player:${playerId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${playerId}`,
      },
      (payload) => {
        try {
          callback(payload);
        } catch (err) {
          console.error('[Subscriptions] Notification handler error:', err);
        }
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Subscriptions] Listening for notifications for player ${playerId}`);
      }
      if (status === 'CHANNEL_ERROR') {
        console.error('[Subscriptions] Notifications channel error');
      }
    });

  activeChannels.push(channel);
  return channel;
}

// ==========================================================================
// Cleanup
// ==========================================================================

/**
 * Unsubscribe from all active realtime channels. Call this when leaving
 * a game session or logging out to prevent memory leaks and stale listeners.
 */
export function unsubscribeAll() {
  const count = activeChannels.length;

  while (activeChannels.length > 0) {
    const channel = activeChannels.pop();
    try {
      supabase.removeChannel(channel);
    } catch (err) {
      console.error('[Subscriptions] Error removing channel:', err);
    }
  }

  if (count > 0) {
    console.log(`[Subscriptions] Removed ${count} realtime channel(s)`);
  }
}
