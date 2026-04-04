# Gameplay Systems

## Dungeon Generation
- Procedural room-based layout on a 60x60 tile grid
- 8 + (floor * 2) rooms per floor, connected by corridors
- Room types: **start**, **combat**, **treasure**, **shop**, **boss**
- Fog of war: rooms revealed when entered, corridors visible near player
- Torches placed in special rooms for ambient lighting
- Infinite floors with scaling difficulty

## Combat
- Real-time action combat (not turn-based)
- **Basic attack**: Click/Numpad0 — melee arc or ranged projectile depending on class
- **Special (E/Num1)**: Class-specific powerful ability with cooldown
- **Secondary (R/Num5)**: Second ability for some classes (Gojo, Sasuke, Naruto, etc.)
- **Dodge (Space/Num2)**: Quick invincible dash, 800ms cooldown
- All projectiles **bounce off walls** up to 5 times
- Damage numbers, screen shake, blood particles on hit

## Enemy Types
| Type | Behavior | Notes |
|------|----------|-------|
| Skeleton | Basic melee | Chases player |
| Archer Skeleton | Ranged | Shoots projectiles |
| Slime | Slow melee | Splits into 2 bats on death |
| Bat | Fast erratic melee | Low HP, hard to hit |
| Dark Knight | Tanky melee | Shield, high HP |
| Necromancer | Summoner | Spawns skeletons |

Enemies spawn when rooms are discovered. Difficulty scales with floor number (+25% HP/damage per floor).

## Bosses (cycle every 5 floors)
1. **Bone King** — Summons skeleton minions
2. **Slime Mother** — Splits into 4 slimes
3. **Shadow Wraith** — Teleports near player, ranged attacks
4. **Dragon Hatchling** — Fire breath cone, charges
5. **Lich Lord** — Phase shift (speed up/slow down), ranged

Boss stats scale with floor. Defeating a boss spawns stairs to next floor.

## Loot System
- **Weapons**: Class-specific (swords, staves, daggers, bows, claws, etc.)
- **Armor**: Universal (cloth to dark plate, increasing defense)
- **Potions**: Health (instant heal), Speed (1.5x 5s), Power (1.5x damage 5s)
- **Rarity**: Common (white), Uncommon (green), Rare (blue), Epic (purple)
- Rarity multiplier: 1x / 1.3x / 1.7x / 2.2x on base stats
- Drops from enemies (20% chance), bosses (100%), treasure room chests
- Shops sell 3 random items per floor for gold

## Inventory
- 15 slots + weapon slot + armor slot
- Click item to equip (weapons/armor) or use (potions)
- Per-player in co-op — opening inventory only freezes that player
- Tab (P1) / Numpad 3 (P2) to toggle

## Meta Progression (localStorage)
- **Gold**: Earned in runs, persists after death
- **Shop unlocks**: Better starting weapons, +20 HP, starting potions
- **Stats tracked**: Total runs, best floor, total kills
- Gold banked on death/disconnect

## Game Modes
- **Solo**: Single player, full-screen view
- **2P Local Co-op**: Split-screen, shared keyboard
- **Online Co-op**: Up to 3 players across devices via PeerJS
- **2 Local + 1 Online**: Two players on one computer + one remote
