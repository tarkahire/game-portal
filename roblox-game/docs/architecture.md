# Architecture

How the pieces fit together. Useful when extending the game or debugging weird behavior.

## High-level flow

```
                Lobby (spawn at origin)
                          │
                  [click QUEUE]
                          │
              Remotes.Queue → server
                          │
              MatchManager queues player
                          │
            When 2 players queued: startMatch
                          │
       Teleport both to arena, FireClient "fight"
                          │
        Players use Q/E/R/F → Remotes.CastAbility
                          │
     AbilityHandler validates cooldown, applies dmg,
        FireAllClients("AbilityFx", ...) for VFX
                          │
            Humanoid.Died fires on one side
                          │
           MatchManager.endMatch picks winner
                          │
         FireClient win/loss, wait 3s, teleport to
              lobby, FireClient "lobby"
```

## Client / server split

| Concern | Side | Why |
|---------|------|-----|
| HP, damage application, ability cooldown enforcement | Server | If client controls it, anyone editing Studio can cheat |
| Match state machine (queue, teleport, end) | Server | Same |
| Input → "I want to cast Q" | Client | Only the local client sees their own keypress |
| VFX rendering (beam, ring, puff) | Client | Cheap, visual-only, no security risk if it desyncs |
| HUD (HP bar, ability pips, banner) | Client | Per-player |
| World geometry (lobby, arena) | Server | Single canonical world for everyone |

## Module responsibilities

### `ReplicatedStorage/Shared/Characters.lua`
Plain data table. `Characters.list.Sorcerer.abilities.Q` returns the ability spec. Both client and server require this so they agree on cooldowns, damage, ranges.

### `ReplicatedStorage/Shared/Remotes.lua`
Lazily creates `RemoteEvent` instances under `ReplicatedStorage.Remotes` and exposes them by name. Required by every script that needs to talk between client and server.

Events:
- `CastAbility` — client→server (`key`)
- `AbilityFx` — server→all clients (`effect`, `origin`, `target`, `ability`)
- `Queue` — client→server (no args)
- `MatchState` — server→client (`state`, `opponentName?`)
- `HpChanged` — server→client (`hp`, `maxHp`)

### `ServerScriptService/Arena.server.lua`
Runs once at server start. Builds:
- **Lobby** (Folder under Workspace): 120×120 floor at origin, 4 neon pillars, welcome sign.
- **Arena** (Folder under Workspace): 160×160 floor centered at (0, 0, 200), neon border, 4 cover pillars.

### `ServerScriptService/MatchManager.server.lua`
1v1 state machine:
- Maintains a `queue` list and a `matches` map (`player → match`).
- On `Remotes.Queue` event: appends to queue and calls `tryMatchmake`.
- When 2 players queued: `startMatch` teleports both to arena and broadcasts `fight`.
- On `Humanoid.Died`: ends the match, picks winner, broadcasts `win`/`loss`, teleports both home after 3s.
- Also fires initial `HpChanged` + `lobby` state when each character spawns so the HUD syncs.

### `ServerScriptService/AbilityHandler.server.lua`
- On `Remotes.CastAbility`: looks up the ability spec, checks server-side cooldown, calls the effect function.
- Effect functions:
  - `pull` — yank enemy toward caster, deal damage
  - `shockwave` — radial damage + knockback around caster
  - `beam` — line trace, damage anyone close to the line within range
  - `blink` — teleport caster forward
- After applying gameplay effect, fires `AbilityFx` to all clients with origin/target so they can render VFX.

### `StarterPlayer/StarterPlayerScripts/Client.client.lua`
One monolithic LocalScript. Sections:
- **HUD setup** — HP bar, ability pips for Q E R F, match state banner, queue button.
- **Match state listener** — switches button/banner text based on `MatchState` events.
- **HP listener** — tweens HP bar on `HpChanged`.
- **Input** — listens for Q/E/R/F, checks local cooldown gate (visual only), fires `CastAbility`.
- **Cooldown HUD tick** — Heartbeat loop updates the cooldown pips.
- **VFX renderers** — `pull` / `shockwave` / `beam` / `blink` builders driven by `AbilityFx` events.

## Coordinate system

- Lobby center: `(0, 0, 0)`
- Arena center: `(0, 0, 200)`
- Arena spawn A: `(-40, 5, 200)` facing +X
- Arena spawn B: `(40, 5, 200)` facing -X
- Lobby return: `(0, 5, 0)`

Both spaces are 160 units across, so players can't accidentally walk between them.

## Why monolithic Client.client.lua?

For a first-time Roblox user, having one client script makes the codebase navigable — every client-side concern is in one file. We'll split when it grows past ~600 lines, and the natural fault lines will be: input/cooldown, HUD/state, VFX.
