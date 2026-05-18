# Dev Log

Reverse-chronological record of notable changes. Newest first.

---

## 2026-05-18 — Mahito added (base model only)

New playable character **Mahito** (`mahito` in `definitions.js`,
`type: curse`, 145 HP, fist). Base model only — no abilities yet.

- `buildMahitoModel()`: pale blue-grey patchwork skin, dark
  high-collar coat, **shoulder-length wavy ash hair** (side curtains
  to the shoulders + back mass + messy tufts), faint soul-blue aura.
- Local `stitchSeam(group,x,y,z,len,axis,ticks,tilt)` helper draws a
  thin dark thread line + perpendicular stitch ticks. Used for the
  signature **vertical seam through the right eye** plus forehead,
  cheek, jaw, neck, coat-front and forearm seams.
- Wired into `buildPlayerModelForClass` + the P1/P2 `startGame`
  chains. Class-select card is auto-generated from `CLASSES`.
- Reuses Sukuna's walk/idle anim (`_isSukuna`). No `fruitAbility`
  branch yet → Z/X/C/V/F no-op; M1 fist combo works.

`node --check` clean. Docs (characters.md) updated.

---

## 2026-05-18 — Boss killcam (slow-mo death)

Killing a boss now plays a cinematic slow-mo killcam instead of the
flat 1.5s delay before the floor advances.

- New global `killcam`; `_killcamScale(now)` time-dilation curve
  (ease to 0.12× → hold → ease back to 1×) multiplied into `dt` at the
  top of `update()`, so the whole sim slows.
- `triggerBossKillcam(e)` fires from the boss branch of
  `dealDamageToEnemy`: hitstop + FOV punch + red light/particles +
  ground ring, a desaturated blood-red vignette overlay
  (`#killcam-overlay`, `backdrop-filter`), and a "<BOSS> SLAIN"
  caption via `showCinematicSubtitle`.
- `updateKillcam(now)` (called after `playerLight` copy in `update()`)
  overrides the camera into a slow inward+downward orbit around the
  boss while it shrinks and sinks through the floor with gore bursts.
  **No material-opacity fade** — enemy materials are shared
  module-level, so fading would hit every enemy's teeth/eyes.
- `_endKillcam(advance)` hides the corpse, clears `_cutsceneActive`,
  fades the overlay, and schedules `nextFloor()`. `loadFloor()` tears
  down a stale killcam defensively. Player invincible + world frozen
  (`_cutsceneActive`) for the duration.

`node --check` clean.

---

## 2026-05-18 — Infinite Void freeze + Chimera Shadow Garden rework

### Gojo — Infinite Void (V)
Now reliably **freezes every enemy in place** for the full domain
instead of only snapshotting enemies in range at the cast instant. The
trap loop was extracted to `trapInside()`, the radius widened
(15→18 world units) to cover the visible void, and `trapInside()` is
re-run every 500ms damage tick so enemies that wander in also lock.
Freeze itself is the existing `_domainTrapped` check in `update()`.

### Megumi — Chimera Shadow Garden (V) — full rework
Replaced the blue dome/rings/spokes visual with a **spreading black
puddle of darkness**, and added a Malevolent-Shrine-style cinematic
cut-in with on-screen subtitles taken from the reference clip
(`src/classes/domain expansion.gif`).

- New top-level helper `showCinematicSubtitle(text, holdMs, opts)` —
  fade-in/hold/fade-out anime caption (z-index 60).
- Cut-in (~1750ms): `setCinematic()` front camera on Megumi,
  `_cutsceneActive` freezes the world, both arms raise + clasp into
  the domain seal with a press tremor, a navy/violet shadow-energy orb
  condenses + brightens between the hands. Subtitles fire on a
  timeline: **"Screw it!" → "I'll do it!" → "Domain Expansion:" →
  "Chimera Shadow Garden"**. On completion: flare, clear cinematic,
  `beginGarden()`.
- `beginGarden()`: irregular pitch-black `CircleGeometry` pool +
  deeper void core + faint violet rim + low purple light, all sized to
  the full **8-tile** gameplay radius (`radius * TILE` — the old dome
  was only ~2 tiles wide vs its damage field) and eased outward over
  750ms. Enemies inside are frozen via `_domainTrapped` (re-applied
  each tick), take a 3× activation burst then 0.8×/tick, with shadow
  lightning on the toughest enemy every 4th tick. 2 temporary divine
  dogs still spawn. Collapse shrinks/fades the puddle, `disposeGroup()`
  frees it, and `releaseTint()` clears the shadow emissive on enemies.
- Player invincible for the whole cut-in + domain.

`node --check` clean.

---

## 2026-05-17 — Malevolent Shrine: 3D structure + hand-sign cut-in

Sukuna's **Malevolent Shrine** (V / Domain Expansion) was upgraded from a
plain expanding red dome into a full animated set-piece matching the
reference GIF (`src/classes/malevolant shrine.gif`).

### Commits
- `0ca99e1` — Malevolent Shrine rises as a 3D pagoda structure
- `b4c2137` — Malevolent Shrine hand-sign cut-in before the rise

### Files touched
| File | Change |
|------|--------|
| `src/main.js` | New `buildMalevolentShrine()` + `disposeGroup()` helpers; Sukuna `slot === 'v'` block rewritten with hand-sign cut-in + `beginShrine()` |
| `docs/characters.md` | New "Sukuna — Malevolent Shrine (V)" section |
| `docs/devlog.md` | This log (new file) |

### What changed

**1. `buildMalevolentShrine()` (new top-level builder)**
Returns a `THREE.Group` for the shrine:
- 3-tier shrinking dark pagoda: solid dark cores, 4 corner pillars,
  glowing-red torii frames (lintel + sill + 2 posts) on all 4 faces,
  lit red interior cavity panels.
- Flared 4-sided eave roofs with red under-glow rings; spire finial
  (pole + stacked rings + glowing red orb).
- 8 skeletal spider-rib `TubeGeometry` arches sweeping from a ~9.5-unit
  ground ring up over the tower, with bone spikes.
- Dark reflective floor disc + 3 faint cyan reflection rings.
- 2 red domain `PointLight`s.
- `userData` exposes `glowMats` (each `{mat, base}`), `lights`
  (`{light, base}`), `ribGroup`, `towerTopY` so the ability code can
  ramp/pulse them.

**2. `disposeGroup(g)` (new helper)**
Traverses a group, disposes every geometry + material (array-safe),
removes it from the scene. Used for shrine teardown.

**3. Sukuna V rewrite — three phases**
- **Hand-sign cut-in (~1100ms):** `setCinematic()` front camera on
  Sukuna; `_cutsceneActive` freezes enemy AI; both arms raise and
  converge into the domain seal with a press/clench tremor; a
  cursed-energy orb (red shell + white core + point light) condenses
  and brightens between the hands while wisps spiral inward. On finish
  it flares, clears the cinematic, and calls `beginShrine()`.
- **`beginShrine()`:** traps enemies, builds the shrine 6 tiles in
  front, then **Rise** (~1300ms ease-out: structure erupts upward while
  every glow mat/light ramps 0→base, ground-breach ring + debris) →
  **Active** (heartbeat pulse on all glow/lights + slow rib drift;
  white/red Dismantle slash planes rain down) → **Collapse** after the
  12 damage ticks (sinks back + glow fades, then `disposeGroup()`).
- Player invincible for the whole ~8.8s sequence.

### Balance — unchanged
Trap radius (15 world units / 3.75 tiles), 12 damage ticks @ 400ms of
`player.damage * 1.5` within 8 tiles, and domain duration are identical
to the previous dome version. Only visuals/choreography changed.

### Notes / follow-ups
- The Sukuna model's hands are simple boxes — the seal reads as
  clasped-hands-plus-orb, not literally interlaced finger geometry.
  A future pass could add articulated finger bones to
  `buildSukunaModel()` for true interlocking fingers.
- `node --check` clean after each commit.
