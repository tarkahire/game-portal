# Online Co-op

## Overview
Standard online co-op (Option A): each player on their own device, full-screen first-person view of *their own* character, sees other players as 3D character models running around the same dungeon. Each device controls only its own character.

This replaces the earlier split-screen-everywhere behavior with proper online multiplayer.

## Lobby Flow

| Step | Host | Client |
|------|------|--------|
| 1 | Click "Online Co-op" → "Create Room" | Click "Online Co-op" → enter code → "Join" |
| 2 | Code shown as `....` until peer registers with broker | "Looking for room... / Looking again (n/5)..." retry on `peer-unavailable` |
| 3 | Code appears once `peer.on('open')` fires — share with friends | Connects, receives `welcome` with `playerIndex` |
| 4 | Pick class on lobby grid | Pick class on lobby grid (sent to host via `classSelect` message) |
| 5 | Click "Start Game" once everyone has picked | Auto-enters game when host starts |

## Networking

PeerJS WebRTC data channels with `reliable: true`. STUN servers configured (Google STUN 0–3) for NAT traversal.

**Peer ID format**: `dc3d-<roomcode_lowercase>` — e.g. host with code `ABCD` registers as `dc3d-abcd`.

### Message types

**Host → Client(s):**
| Type | Payload | Purpose |
|------|---------|---------|
| `welcome` | `{ playerIndex, roomCode }` | Assign player slot on join |
| `lobby` | `{ players: [...] }` | Broadcast lobby state to all clients |
| `full` | `{}` | Reject connection if room is full |
| `startGame` | `{ classes, dungeon }` | Start the game with a synced dungeon |
| `gameState` | `{ state: { players: [{ idx, x, z, yaw, hp, alive }, ...] } }` | Position broadcast (~30Hz) for all known players |

**Client → Host:**
| Type | Payload | Purpose |
|------|---------|---------|
| `classSelect` | `{ classId }` | Inform host of class choice during lobby |
| `input` | `{ x, z, yaw, hp, alive }` | Position update (~30Hz) |

## Position Sync

- **Tick rate**: 30Hz (`NET_SEND_INTERVAL_MS = 33ms`)
- **Authority**: host-authoritative for state broadcast — host echoes client positions back to all peers
- **Interpolation**: receivers store `{ targetX, targetZ, targetYaw, targetTime }` per remote player. Each frame the visual position lerps toward the target with a ~55ms time constant. Yaw uses angle-wrap-aware lerp so characters never spin the long way around.

## Dungeon Sync

- Host generates the dungeon in `loadFloor()` then sends a stripped serialization (`map`, `rooms`, `torches`, `floor`) via `startGame`.
- Client stores it in `_pendingDungeon`. When the client's `startGame()` runs, `loadFloor()` uses the pending dungeon instead of generating a fresh one.
- All players walk the same map.

## Spawn / Visibility

- Local player spawns at the start room center.
- Each remote player spawns at a polar offset (~1.4 tiles) from the start point so they're not stacked inside you on frame 1.
- Each remote player gets a bright per-slot **aura PointLight** parented to their mesh (cyan / orange / purple / green by slot index) so they're easy to spot across a room.
- Each remote player gets a colored **dot + facing arrow on the minimap** in their aura color.

## Local vs Online Mode Distinction

`coopMode` and `onlineMode` are independent flags:

| Mode | `coopMode` | `onlineMode` | Behavior |
|------|------------|--------------|----------|
| Solo | false | false | Single fpsCamera, full screen render |
| Local 2P | **true** | false | Both fpsCamera + fpsCamera2 active, split-screen render, P2 keys (arrows/numpad) enabled |
| Online | false | **true** | Single fpsCamera (full screen), P2 keys disabled, remote player meshes from network |

P2 keyboard handlers in `init()` are gated behind `coopMode && !onlineMode` so they only fire during local 2P.

## Known Limitations (MVP)

- **Enemies are NOT synced** — each device runs its own enemy AI and spawn. The goblin you kill is still alive on your friend's screen.
- **Projectiles, abilities, HP damage** are not networked — combat is local-only.
- **Floor transitions** are not synced — first device to advance leaves others behind.

These are intentional MVP scope cuts. Address with a follow-up host-authoritative simulation pass.

## Debug Overlay

Top-left overlay (auto-shown in online mode, F3 to force-show in solo). Lines:

```
[ONLINE HOST]                       ← role
Room: ABCD  myIdx: 0
Connections: 1 (open)               ← (open) confirms data channel up
Remote players: 1
  P2 gojo (5.3, 6.1) 33ms           ← position + ms since last update
Last recv: 12ms ago                 ← <100ms = healthy
FPS: 60
```

If "Connections" shows `closed` or "Last recv" climbs over a few hundred ms, the data channel is dead. Console logs prefixed `[net/host]` and `[net/client]` show every event in the connection lifecycle.

## Connection Reliability

- **Join retry**: on `peer-unavailable` (host not yet registered with broker), client retries up to 5 times with 2s delay between attempts.
- **Long-stop fallback**: 8s timeout per attempt — if neither open nor error fires, retry.
- **Code-display safety**: host's room code shows `....` until `peer.on('open')` fires, then swaps to the real code. Prevents sharing a code before the peer is actually addressable.
- **Error mapping**: `unavailable-id`, `network`, `server-error`, `socket-error`, `peer-unavailable` all produce specific user-facing status messages.
