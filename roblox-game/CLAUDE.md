# Duel Arena — Claude project notes

## What this is

A 1v1 anime-ability duel game built in Roblox using Luau. Players spawn in a lobby, click a Queue button, get matched, and fight on a separate arena until one HP hits 0.

This is **NOT** part of the static browser portal — it's a standalone Roblox project that just happens to live in the same git repo so it shares the user's auto-push workflow.

## Quick reference

- **Tech**: Luau, Roblox Studio, Rojo for file sync
- **Entry**: `default.project.json` (Rojo project descriptor)
- **No build step** — Rojo serves files live into Studio
- **One character so far**: `Sorcerer` (Q pull / E shockwave / R beam / F blink)

## Project structure

| Path | Purpose |
|------|---------|
| `default.project.json` | Rojo tree mapping `src/*` to Studio services |
| `src/ReplicatedStorage/Shared/Characters.lua` | Character + ability stats (shared client+server) |
| `src/ReplicatedStorage/Shared/Remotes.lua` | RemoteEvent registry (lazy creation) |
| `src/ServerScriptService/Arena.server.lua` | Builds lobby + arena parts at startup |
| `src/ServerScriptService/MatchManager.server.lua` | Duel queue + teleport + win check + lobby return |
| `src/ServerScriptService/AbilityHandler.server.lua` | Validates cooldowns, applies damage + motion, broadcasts VFX |
| `src/StarterPlayer/StarterPlayerScripts/Client.client.lua` | HUD (HP + cooldown pips), match banner, queue button, input, VFX renderers |

## Key conventions

- **Server-authoritative**: damage and cooldowns are enforced server-side. Client cooldown gates are visual only.
- **Single source of truth for stats**: `Characters.lua` is required by both client and server.
- **Single source of truth for remotes**: `Remotes.lua` lazily creates events on first require; no manual setup in Studio.
- **Match state messages**: `lobby` / `queued` / `fight` / `win` / `loss` — server fires `Remotes.MatchState` to drive client UI.
- **Spawn coordinates**: lobby at world origin, arena at z=200 (so they don't interact visually).

## Running locally

```powershell
cd "C:\Users\user\Coding projects\game-portal\roblox-game"
.\rojo.exe serve
```

Then in Studio: New Baseplate → Rojo plugin → Connect → Play.

For 2-player duels: Studio → Test tab → Local Server → 2 players.

## What's intentionally not done yet

- Per-player character select (everyone is Sorcerer)
- Persistent ELO / win records
- More than one ability set
- Sound effects
- Match-aware enemy targeting (currently abilities just hit "any other player" — fine for 1v1, will need fixing for free-for-all)
- Sword/melee M1
- Mobile controls (touch buttons)

See `docs/todo.md` for the prioritized list.
