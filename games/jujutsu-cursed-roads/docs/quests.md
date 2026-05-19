# Quests

## Manager model

`QUESTS` is a static def table in `main.js`. Per-save state lives in
`save.quests[id] = { state, progress }` where `state` ∈
`available | active | done`. `giver` routes a quest to the **Mission
Board** or the **Jujutsu High Contact** overlay. `require(save)` gates
availability (e.g. the exam needs Lv.4 + the board quest done).

## MVP quests

| id | Giver | Objective | Reward |
|----|-------|-----------|--------|
| `exorcism1` | board | Exorcise 5 cursed spirits in the hills | 120 XP, 60 g |
| `exam` | contact | Slay the manifested exam boss (one per grade) | scales: `220+(4-g)·130` XP, `130+(4-g)·80` g, **+1 grade** |

The single reusable `exam` quest powers the **whole grade chain**.
The Contact gates it by `examReqLevel(grade)` (G4→Lv4, G3→7, G2→10,
G1→13) plus the cleansing quest being done. Each win: `completeQuest`
promotes one grade, then re-opens `exam` (`available`) for the next
grade, until Special Grade where it stays `done`. Boss HP/damage scale
via the existing grade multiplier.

Flow: accept at the relevant interactable → objective shows in the HUD
mission tracker → progress counts on curse kills (`questProgress()`) /
boss death (`onBossKilled()`) → `completeQuest()` pays out + autosaves.
`exam` spawns its boss curse on accept (`spawnCurse(true)` + boss SFX).

## Quest types planned (stretch)

Escort/patrol (move an NPC town→town), Veil clear (enter dome, survive
a wave), Investigation (visit markers → ambush). All slot into the same
manager + state shape; only new def entries + objective hooks needed.
