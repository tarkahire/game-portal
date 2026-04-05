# Online Multiplayer (network.js)

## Overview
Online co-op uses **PeerJS** (WebRTC peer-to-peer) for real-time multiplayer with no backend server. Supports up to 4 players across multiple devices, with optional 2-local-players per device.

## How It Works

### Room Creation
1. Host clicks "Create Room" — generates a 4-letter room code (e.g. `ABCD`)
2. PeerJS creates a peer with ID `dc-abcd` on the public PeerJS signaling server
3. Other players connect by entering the code

### Connection Flow
```
Host                          Client
  |  PeerJS peer created        |
  |  (id: dc-XXXX)              |
  |                              |  PeerJS connects to dc-XXXX
  |  <── connection event ──     |
  |  ── welcome message ──>     |  (assigns playerIndex)
  |  <── localCount msg ──      |  (tells host how many local players)
  |  <── classSelect msg ──     |  (each player picks class)
  |  ── startGame + dungeon ──> |  (host sends map data)
  |                              |
  |  [GAME RUNNING]              |
  |  <── input every frame ──   |  (client sends keys/mouse)
  |  ── gameState 20Hz ──>      |  (host broadcasts full state)
```

### Host-Authoritative Model
- **Host** runs the full game simulation (physics, combat, AI, spawning)
- **Clients** do zero simulation — they only:
  1. Send their keyboard/mouse input to the host
  2. Receive game state and render it
  3. Update local visual effects (particles, damage numbers, screen shake)

### State Broadcast (20 Hz)
Host sends every 50ms:
- All player positions, HP, stats, effects
- All alive enemies with positions and state
- All projectiles
- Domain expansion state
- Summoned minions, healing circles, lightning nets
- Room explored status (for fog of war sync)
- Current floor, run stats, game time

### 2 Local Players Per Device
- "Create Room (2 local)" or "Join (2 local)" options
- P1 uses WASD+Mouse, P2 uses Arrows+Numpad on same keyboard
- Host assigns separate player indices for each local player
- Client sends two input messages: `input` (P1) and `input2` (P2)

### Dungeon Sync
- Host generates the dungeon and sends map/rooms/torches data with `startGame` message
- Clients use the host's dungeon data instead of generating their own
- On floor changes, host sends new dungeon data via `nextFloor` message
- Room explored status synced every frame in state broadcast

## NET Object
```javascript
NET = {
    peer,             // PeerJS instance
    connections,      // Array of peer connections
    isHost,           // true if this device is hosting
    isOnline,         // true if in online mode
    roomCode,         // 4-letter room code
    playerIndex,      // first local player's index
    localPlayerCount, // 1 or 2 players on this device
    lobbyPlayers,     // lobby state array
    remoteInputs,     // playerIndex -> latest input from remote
    stateInterval,    // setInterval handle for state broadcast
    maxPlayers: 4,    // max total players across all devices
}
```

## Connection Reliability
- **Auto-retry**: Clients automatically retry up to 3 times (1.5s delay) on connection failure
- **Timeout**: 8-second timeout on stalled connections triggers retry
- **STUN servers**: Google STUN servers configured on both host and client for better NAT traversal
- **ICE servers**: `stun:stun.l.google.com:19302`, `stun1`, `stun2`, `stun3`

## Client Aiming
- Clients compute their `facingAngle` locally from mouse position relative to their viewport
- The pre-computed angle is sent to the host as part of the input message
- Host uses the received angle directly for remote player facing direction
- This avoids screen-size/viewport conversion issues between different devices

## Synced HUD Properties
State broadcast includes: `lastSpecial`, `specialCooldown`, `dodgeCd`, `_haki` — ensuring all client screens show accurate cooldown timers and Katakuri Haki state
