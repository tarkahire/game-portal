// ==========================================================================
// Database Query Layer — All Supabase queries centralized here
//
// Functions either query tables directly (select/insert) or call
// server-side RPC functions (supabase.rpc) for operations that require
// transactional logic or elevated privileges.
// ==========================================================================

import { supabase } from './supabaseClient.js';

// ==========================================================================
// Game Servers
// ==========================================================================

/**
 * Fetch all servers that are active or upcoming (not archived/ended).
 * @returns {Promise<object[]>}
 */
export async function getActiveServers() {
  const { data, error } = await supabase
    .from('game_servers')
    .select('id, name, status, current_day, max_players, created_at')
    .in('status', ['lobby', 'active'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[queries] getActiveServers:', error);
    throw error;
  }

  return data;
}

/**
 * Fetch full details for a single server.
 * @param {string} serverId — UUID
 * @returns {Promise<object|null>}
 */
export async function getServerDetails(serverId) {
  const { data, error } = await supabase
    .from('game_servers')
    .select('*')
    .eq('id', serverId)
    .single();

  if (error) {
    console.error('[queries] getServerDetails:', error);
    throw error;
  }

  return data;
}

// ==========================================================================
// Player
// ==========================================================================

/**
 * Get the current user's player record on a specific server, or null if
 * they haven't joined that server yet.
 * @param {string} serverId — UUID
 * @returns {Promise<object|null>}
 */
export async function getPlayerOnServer(serverId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('server_id', serverId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[queries] getPlayerOnServer:', error);
    throw error;
  }

  return data;
}

/**
 * Join a server by calling the server-side RPC. This creates the player
 * record, assigns starting resources, and spawns the initial city.
 * @param {string} serverId
 * @param {string} displayName
 * @param {string} alignment — alignment key (e.g. 'allies-uk')
 * @returns {Promise<object>} — the new player record
 */
export async function joinServer(serverId, displayName, alignment) {
  const { data, error } = await supabase.rpc('join_server', {
    p_server_id: serverId,
    p_display_name: displayName,
    p_alignment: alignment,
  });

  if (error) {
    console.error('[queries] joinServer:', error);
    throw error;
  }

  return data;
}

// ==========================================================================
// Alignment Definitions
// ==========================================================================

/**
 * Fetch all alignment/doctrine definitions (static game data).
 * @returns {Promise<object[]>}
 */
export async function getAlignmentDefs() {
  const { data, error } = await supabase
    .from('alignment_defs')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('[queries] getAlignmentDefs:', error);
    throw error;
  }

  return data;
}

// ==========================================================================
// Tiles
// ==========================================================================

/**
 * Load all tiles with fog of war applied. Returns fog_state per tile:
 * 'visible' (full info), 'stale' (previously seen), 'unexplored' (no info).
 * Sensitive data (owner, resources, fortifications) is hidden outside vision.
 * @param {string} serverId
 * @returns {Promise<object[]>}
 */
export async function getServerTiles(serverId) {
  const { data, error } = await supabase.rpc('get_visible_tiles', {
    p_server_id: serverId,
  });

  if (error) {
    console.error('[queries] getServerTiles (get_visible_tiles):', error);
    throw error;
  }

  return data;
}

/**
 * Claim an unoccupied tile for the current player via RPC.
 * @param {string} tileId — UUID
 * @param {string} serverId — UUID
 * @returns {Promise<object>}
 */
export async function claimTile(tileId, serverId) {
  const { data, error } = await supabase.rpc('claim_tile', {
    p_tile_id: tileId,
    p_server_id: serverId,
  });

  if (error) {
    console.error('[queries] claimTile:', error);
    throw error;
  }

  return data;
}

// ==========================================================================
// Cities
// ==========================================================================

/**
 * Get all cities belonging to the current player on a server.
 * @param {string} serverId
 * @returns {Promise<object[]>}
 */
export async function getPlayerCities(serverId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get player_id for this user on this server
  const { data: playerData } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .eq('server_id', serverId)
    .single();

  if (!playerData) return [];

  const { data, error } = await supabase
    .from('cities')
    .select('id, name, tile_id, level, is_capital, land_quality_at_founding, created_at')
    .eq('server_id', serverId)
    .eq('player_id', playerData.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[queries] getPlayerCities:', error);
    throw error;
  }

  return data;
}

/**
 * Get all cities on a server (all players, for map display).
 * @param {string} serverId
 * @returns {Promise<object[]>}
 */
export async function getAllCities(serverId) {
  const { data, error } = await supabase
    .from('cities')
    .select('id, name, tile_id, level, is_capital, player_id')
    .eq('server_id', serverId);

  if (error) {
    console.error('[queries] getAllCities:', error);
    return [];
  }

  return data || [];
}

/**
 * Build a new city on a tile via RPC.
 * @param {string} tileId
 * @param {string} serverId
 * @param {string} name — city name
 * @returns {Promise<object>}
 */
export async function buildCity(tileId, serverId, name) {
  const { data, error } = await supabase.rpc('build_city', {
    p_tile_id: tileId,
    p_server_id: serverId,
    p_name: name,
  });

  if (error) {
    console.error('[queries] buildCity:', error);
    throw error;
  }

  return data;
}

/**
 * Get all buildings in a city.
 * @param {string} cityId
 * @returns {Promise<object[]>}
 */
export async function getCityBuildings(cityId) {
  const { data, error } = await supabase
    .from('buildings')
    .select('id, building_def, slot_index, level, is_constructing, construction_started_at, construction_completes_at')
    .eq('city_id', cityId)
    .order('slot_index', { ascending: true });

  if (error) {
    console.error('[queries] getCityBuildings:', error);
    throw error;
  }

  return data;
}

/**
 * Build a new building in a city slot via RPC.
 * @param {string} cityId
 * @param {string} buildingDef — building definition id (e.g. 'barracks')
 * @param {number} slotIndex — the slot to build in
 * @returns {Promise<object>}
 */
export async function buildBuilding(cityId, buildingDef, slotIndex) {
  const { data, error } = await supabase.rpc('build_building', {
    p_city_id: cityId,
    p_building_def: buildingDef,
    p_slot_index: slotIndex,
  });

  if (error) {
    console.error('[queries] buildBuilding:', error);
    throw error;
  }

  return data;
}

/**
 * Upgrade an existing building to the next level via RPC.
 * @param {string} buildingId — buildings UUID
 * @returns {Promise<void>}
 */
export async function upgradeBuilding(buildingId) {
  const { data, error } = await supabase.rpc('upgrade_building', {
    p_building_id: buildingId,
  });

  if (error) {
    console.error('[queries] upgradeBuilding:', error);
    throw error;
  }

  return data;
}

// ==========================================================================
// Resources
// ==========================================================================

/**
 * Get current resource stockpiles for a city.
 * @param {string} cityId
 * @returns {Promise<object[]>}
 */
export async function getCityResources(cityId) {
  const { data, error } = await supabase
    .from('city_resources')
    .select('resource_type, amount, production_rate, storage_capacity')
    .eq('city_id', cityId);

  if (error) {
    console.error('[queries] getCityResources:', error);
    throw error;
  }

  return data;
}

/**
 * Get all resource fields (tiles with resources) on a server that belong
 * to the current player.
 * @param {string} serverId
 * @returns {Promise<object[]>}
 */
export async function getResourceFields(serverId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('tiles')
    .select('id, q, r, resource_type, resource_level')
    .eq('server_id', serverId)
    .eq('owner_id', user.id)
    .not('resource_type', 'is', null);

  if (error) {
    console.error('[queries] getResourceFields:', error);
    throw error;
  }

  return data;
}

/**
 * Get the resource field record for a specific tile on a server.
 * Returns null if the tile has no developed resource field.
 * @param {number} tileId — tile integer ID
 * @param {string} serverId — UUID
 * @returns {Promise<object|null>}
 */
export async function getResourceFieldForTile(tileId, serverId) {
  const { data, error } = await supabase
    .from('resource_fields')
    .select('id, tile_id, player_id, extraction_intensity, infrastructure_level, production_rate, status')
    .eq('tile_id', tileId)
    .eq('server_id', serverId)
    .maybeSingle();

  if (error) {
    console.error('[queries] getResourceFieldForTile:', error);
    throw error;
  }

  return data;
}

/**
 * Change extraction intensity on a resource field via RPC.
 * @param {string} fieldId — resource_fields UUID
 * @param {string} intensity — 'sustainable' | 'normal' | 'intensive'
 * @returns {Promise<void>}
 */
export async function setExtractionIntensity(fieldId, intensity) {
  const { data, error } = await supabase.rpc('set_extraction_intensity', {
    p_field_id: fieldId,
    p_intensity: intensity,
  });

  if (error) {
    console.error('[queries] setExtractionIntensity:', error);
    throw error;
  }

  return data;
}

/**
 * Develop (upgrade) a resource field tile via RPC.
 * @param {string} tileId
 * @param {string} serverId
 * @returns {Promise<object>}
 */
export async function developResourceField(tileId, serverId) {
  const { data, error } = await supabase.rpc('develop_resource_field', {
    p_tile_id: tileId,
    p_server_id: serverId,
  });

  if (error) {
    console.error('[queries] developResourceField:', error);
    throw error;
  }

  return data;
}

// ==========================================================================
// City Upgrades
// ==========================================================================

/**
 * Upgrade a city to the next level via RPC.
 * @param {string} cityId
 * @param {string} serverId
 * @returns {Promise<void>}
 */
export async function upgradeCity(cityId, serverId) {
  const { data, error } = await supabase.rpc('upgrade_city', {
    p_city_id: cityId,
    p_server_id: serverId,
  });

  if (error) {
    console.error('[queries] upgradeCity:', error);
    throw error;
  }

  return data;
}

// ==========================================================================
// Tile Control
// ==========================================================================

/**
 * Improve a tile to full yield using an army with engineers.
 * @param {string} armyId
 * @param {number} tileId
 * @param {string} serverId
 * @returns {Promise<void>}
 */
export async function improveTile(armyId, tileId, serverId) {
  const { data, error } = await supabase.rpc('improve_tile', {
    p_army_id: armyId,
    p_tile_id: tileId,
    p_server_id: serverId,
  });

  if (error) {
    console.error('[queries] improveTile:', error);
    throw error;
  }

  return data;
}

// ==========================================================================
// Roads & Infrastructure
// ==========================================================================

/**
 * Build a road between two adjacent tiles via RPC.
 * @param {number} fromTile — tile ID
 * @param {number} toTile — tile ID
 * @param {string} serverId — UUID
 * @returns {Promise<void>}
 */
export async function buildRoad(fromTile, toTile, serverId) {
  const { data, error } = await supabase.rpc('build_road', {
    p_from_tile: fromTile,
    p_to_tile: toTile,
    p_server_id: serverId,
  });

  if (error) {
    console.error('[queries] buildRoad:', error);
    throw error;
  }

  return data;
}

// ==========================================================================
// Military
// ==========================================================================

/**
 * Get all armies belonging to the current player on a server.
 * @param {string} serverId
 * @returns {Promise<object[]>}
 */
export async function getPlayerArmies(serverId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get player_id first
  const { data: playerData } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .eq('server_id', serverId)
    .single();

  if (!playerData) return [];

  const { data, error } = await supabase
    .from('armies')
    .select(`
      id, name, tile_id, status, is_garrison, supply_status,
      army_units (
        unit_def, quantity, hp_percent, experience
      )
    `)
    .eq('server_id', serverId)
    .eq('player_id', playerData.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[queries] getPlayerArmies:', error);
    throw error;
  }

  return data;
}

/**
 * Get the training queue for a city.
 * @param {string} cityId
 * @returns {Promise<object[]>}
 */
export async function getTrainingQueue(cityId) {
  const { data, error } = await supabase
    .from('training_queue')
    .select('id, unit_def, quantity, started_at, completes_at')
    .eq('city_id', cityId)
    .order('started_at', { ascending: true });

  if (error) {
    console.error('[queries] getTrainingQueue:', error);
    throw error;
  }

  return data;
}

/**
 * Get all visible armies on a server (fog-of-war filtered).
 * Only returns armies the player can see.
 * @param {string} serverId
 * @returns {Promise<object[]>}
 */
export async function getAllArmies(serverId) {
  const { data, error } = await supabase.rpc('get_visible_armies', {
    p_server_id: serverId,
  });

  if (error) {
    console.error('[queries] getAllArmies (get_visible_armies):', error);
    return [];
  }

  return data || [];
}

/**
 * Queue unit training at a city via RPC.
 * @param {string} cityId
 * @param {string} unitDef — unit definition key
 * @param {number} quantity
 * @returns {Promise<object>}
 */
export async function trainUnits(cityId, unitDef, quantity) {
  const { data, error } = await supabase.rpc('train_units', {
    p_city_id: cityId,
    p_unit_def: unitDef,
    p_quantity: quantity,
  });

  if (error) {
    console.error('[queries] trainUnits:', error);
    throw error;
  }

  return data;
}

/**
 * Form a new army from units in a city garrison via RPC.
 * @param {string} cityId
 * @param {string} name — army name
 * @param {Array<{unit_def_key: string, quantity: number}>} units
 * @returns {Promise<object>}
 */
export async function formArmy(cityId, name, units) {
  const { data, error } = await supabase.rpc('form_army', {
    p_city_id: cityId,
    p_army_name: name,
    p_units: units,
  });

  if (error) {
    console.error('[queries] formArmy:', error);
    throw error;
  }

  return data;
}

/**
 * Order an army to march to a destination tile via RPC.
 * @param {string} armyId
 * @param {string} destinationTile — tile UUID
 * @returns {Promise<object>}
 */
export async function marchArmy(armyId, destinationTile) {
  const { data, error } = await supabase.rpc('march_army', {
    p_army_id: armyId,
    p_destination_tile: destinationTile,
  });

  if (error) {
    console.error('[queries] marchArmy:', error);
    throw error;
  }

  return data;
}

// ==========================================================================
// Definitions (static game data)
// ==========================================================================

/**
 * Fetch all building definitions.
 * @returns {Promise<object[]>}
 */
export async function getBuildingDefs() {
  const { data, error } = await supabase
    .from('building_defs')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('[queries] getBuildingDefs:', error);
    throw error;
  }

  return data;
}

/**
 * Fetch all military unit definitions.
 * @returns {Promise<object[]>}
 */
export async function getUnitDefs() {
  const { data, error } = await supabase
    .from('unit_defs')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('[queries] getUnitDefs:', error);
    throw error;
  }

  return data;
}

/**
 * Fetch all research/tech tree definitions.
 * @returns {Promise<object[]>}
 */
export async function getResearchDefs() {
  const { data, error } = await supabase
    .from('research_defs')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('[queries] getResearchDefs:', error);
    throw error;
  }

  return data;
}

// ==========================================================================
// Battle Reports
// ==========================================================================

/**
 * Fetch battle reports involving the current player on a server.
 * @param {string} serverId
 * @returns {Promise<object[]>}
 */
export async function getPlayerBattleReports(serverId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get player_id
  const { data: playerData } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .eq('server_id', serverId)
    .single();

  if (!playerData) return [];

  const { data, error } = await supabase
    .from('battle_reports')
    .select('id, attacker_id, defender_id, tile_id, result, attacker_army_snapshot, defender_army_snapshot, terrain_type, modifiers_applied, rounds, attacker_losses, defender_losses, war_damage_caused, occurred_at')
    .eq('server_id', serverId)
    .or(`attacker_id.eq.${playerData.id},defender_id.eq.${playerData.id}`)
    .order('occurred_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[queries] getPlayerBattleReports:', error);
    throw error;
  }

  return data;
}

// ==========================================================================
// Notifications
// ==========================================================================

/**
 * Fetch unread notifications for the current player.
 * @returns {Promise<object[]>}
 */
export async function getUnreadNotifications() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, created_at')
    .eq('user_id', user.id)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[queries] getUnreadNotifications:', error);
    throw error;
  }

  return data;
}

/**
 * Mark a notification as read.
 * @param {string} notificationId — UUID
 * @returns {Promise<void>}
 */
export async function markNotificationRead(notificationId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('[queries] markNotificationRead:', error);
    throw error;
  }
}
