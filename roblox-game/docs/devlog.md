# Dev log

Reverse chronological. Most recent at the top.

## 2026-05-30 — Initial scaffold

First commit. Goal: smallest playable thing that proves the loop works end-to-end.

**Scope cut for MVP:**
- 1 character (Sorcerer) — picking abilities was the fun part, character variety is a fast follow.
- 4 abilities (Q/E/R/F) covering the 4 archetypes: projectile-yank, AOE shockwave, line beam, mobility blink. Picked these so each maps to a different VFX renderer — proves the dispatcher pattern works.
- 1v1 only, with a shared global queue. No ELO yet.
- Standard Roblox character (the blocky default) — custom meshes is a later pass.
- No sound effects.

**Stuff that took thought:**
- Decided to keep client code in one `Client.client.lua` rather than split by concern. For someone new to Studio, having every client-side thing in one file is easier to navigate. Will split around 600 lines.
- Server-authoritative cooldowns and damage from day 1. The cost is low (one `cd` table) and adding it later would mean rewriting `AbilityHandler`.
- Arena offset to z=200 rather than a separate place. A separate place needs `TeleportService` and game IDs that don't exist yet; offsetting in the same place is simpler and matches how most small Roblox games handle it.
- `Remotes.lua` lazily creates events instead of declaring them in `default.project.json` — fewer moving parts, no chance of typos between client and server names.
- `Characters.lua` modeled after the browser games' `definitions.js`. Easy parallel for when we port more characters from the JJK / dungeon-crawler-3d roster.

**Not done:**
- Camera-aim for beam direction (uses character facing — known issue, in todo.md).
- Match-aware enemy targeting (works fine for 1v1, will break for FFA — in todo.md).
- VFX is intentionally cheap (single Part per effect, Debris cleanup). Pooling not needed yet.
