# Controls

## Player 1 (Solo, Local-Coop, Online)

| Action | Key |
|--------|-----|
| Move forward | W |
| Move backward | S |
| Turn left | A |
| Turn right | D |
| Look around | Mouse (when pointer locked) |
| M1 attack (4-hit combo) | Left click |
| Attack (alt) | E |
| Ability 1 | Z |
| Ability 2 | X |
| Ability 3 | C |
| Ability 4 | V |
| Ability 5 (mobility) | F |
| Dash / Oversoul activate | Q |
| Dash (alt) | Space |
| Cursed Energy aura (toggle) | R |
| Toggle 1st/3rd person camera | T |
| Pause | ESC |
| Toggle debug overlay (force-on in solo) | F3 |

Q binding is class-specific:
- **Yoh / Ren / Horohoro**: activates permanent Spirit oversoul (first press only — toggles on)
- **All others**: dash with 300ms invincibility

## Player 2 (Local Co-op only — disabled in Online mode)

| Action | Key |
|--------|-----|
| Move forward | ↑ |
| Move backward | ↓ |
| Turn left | ← |
| Turn right | → |
| M1 attack | Backslash (`\`) |
| Ability 1 | M |
| Ability 2 | , (comma) |
| Ability 3 | . (period) |
| Ability 4 | / (slash) |
| Ability 5 | N |
| Dodge | Numpad 0 |
| Oversoul (Yoh/Ren/Horohoro) | 4 |
| Toggle camera (P2) | Y |

P2 controls are gated behind `coopMode && !onlineMode` in the keyboard handler — they only fire during local 2P co-op.

## Pointer Lock

Left click anywhere in the game canvas to acquire mouse pointer lock for look controls. ESC releases it (and pauses the game).

## Online Mode

Each player uses the **Player 1 controls** on their own device — the only "P2 keys" used in online play are when both players are choosing classes in the lobby grid (just standard mouse clicks).
