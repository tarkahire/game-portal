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
| `exam_g3` | contact | Slay the manifested Grade Exam boss curse | 300 XP, 150 g, **Grade 4 → 3** |

Flow: accept at the relevant interactable → objective shows in the HUD
mission tracker → progress counts on curse kills (`questProgress()`) /
boss death (`onBossKilled()`) → `completeQuest()` pays out, applies
`gradeUp`, autosaves.

`exam_g3` spawns its boss curse on accept (`spawnCurse(true)`).

## Quest types planned (stretch)

Escort/patrol (move an NPC town→town), Veil clear (enter dome, survive
a wave), Investigation (visit markers → ambush). All slot into the same
manager + state shape; only new def entries + objective hooks needed.
