# Abilities

How to add or modify abilities.

## Current ability set (Sorcerer)

| Key | Name | Effect | Damage | CD | Notes |
|-----|------|--------|--------|----|----|
| Q | Blue (Pull) | Yanks enemy toward you | 22 | 4s | Hits 1 enemy + ~20 vertical impulse |
| E | Red (Repulsion) | Radial shockwave + knockback | 32 | 6s | 14-stud radius, 90 knockback |
| R | Hollow Purple | Forward beam, line-trace damage | 85 | 18s | 70-stud range, 4-stud lateral hit radius |
| F | Blink | Short teleport in look direction | 0 | 7s | 30-stud distance |

## Adding a new ability

Abilities are data in `Characters.lua` and an effect function in `AbilityHandler.server.lua` (+ optional VFX in `Client.client.lua`).

### 1. Define the ability

In `src/ReplicatedStorage/Shared/Characters.lua`, add it to the character's `abilities` table. Pick a key (Q/E/R/F are taken; common extras are T/V/C/G):

```lua
T = {
    name = "Hollow Purple Bigger",
    key = "T",
    cooldown = 25,
    damage = 120,
    effect = "beam",
    range = 100,
    radius = 6,
},
```

If you reuse an existing `effect` (`pull` / `shockwave` / `beam` / `blink`), the existing handler + VFX will pick it up automatically — you only need to tune the numbers.

### 2. Wire the input

In `Client.client.lua`, add the key to the `KEYS` table and `PIP_KEYS` array:

```lua
local KEYS = {
    [Enum.KeyCode.Q] = "Q",
    [Enum.KeyCode.E] = "E",
    [Enum.KeyCode.R] = "R",
    [Enum.KeyCode.F] = "F",
    [Enum.KeyCode.T] = "T",
}

local PIP_KEYS = { "Q", "E", "R", "F", "T" }
```

The HUD pip frame width may need bumping if you add many keys (`pipFrame.Size` + `pip.Position` math).

### 3. New effect type (only if needed)

If your ability does something the existing 4 effects can't, add a new `effect` name and:

**Server side** — in `AbilityHandler.server.lua`, add to the `effects` table:

```lua
function effects.summon(caster, ability)
    -- spawn a thing in the world that fights for caster
    -- ...
    Remotes.AbilityFx:FireAllClients("summon", rootOf(caster).Position, nil, ability)
end
```

**Client side** — in `Client.client.lua`, add a renderer:

```lua
local function fxSummon(origin, _, ability)
    -- visual flash where the thing spawned
end

local fxByEffect = {
    pull = fxPull,
    shockwave = fxShockwave,
    beam = fxBeam,
    blink = fxBlink,
    summon = fxSummon,
}
```

## Why server-authoritative?

Anyone in the game with the Studio plugin can edit their LocalScripts. If damage or cooldowns were enforced client-side, they could:
- Send `CastAbility` 100×/sec by spamming `FireServer`.
- Tell the server "I just did 9999 damage".

By having the server own the cooldown timer (per-player `cd` table keyed by ability name) and apply damage directly to the target Humanoid, the worst a cheater can do is request a cast they don't have ready — which the server just ignores.

The client local cooldown table is a UI hint only — it shows the cooldown pip filling up so the player gets feedback, but the actual gate is on the server.

## Tuning notes

- **Beam range** is checked along the caster's `LookVector` at the moment of cast. So if the camera was facing the target when they pressed R, the beam hits even if the camera moves mid-effect.
- **Shockwave knockback** uses `AssemblyLinearVelocity` directly, which respects Roblox character physics. Too high a value can fling people off the arena — current 90 leaves them on the floor.
- **Pull yank** also uses `AssemblyLinearVelocity`. The +20 vertical kicker prevents stutter-stop on the ground.
- **Blink distance** doesn't currently check for walls, so you can blink through cover pillars. Add a `Raycast` if that becomes a problem.

## Future ability ideas

- **Domain Expansion** (R upgrade): freeze enemy in place for 3s with a guaranteed-hit aura. Spec'd in `todo.md`.
- **Sword combo** (M1): 3-hit chain with the final hit doing knockback. Useful for between-cooldown filler damage.
- **Sukuna Dismantle**: cone of slash damage 30° wide, 20 studs.
- **Heavenly Restriction** (passive): no abilities, but M1 hits 3× as hard.
