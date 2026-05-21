# Save System

## MVP: name sign-in + localStorage

- Sign-in screen takes a **name** (max 16 chars) = the save-slot key.
- Returning with the same name resumes; a new name starts a new sorcerer.
- Known names are listed under the input as one-click "Continue" slots
  (kept in `localStorage['jcr_slots']`).
- Autosave triggers: level up, grade up, quest accept/complete, shop
  purchase, every 20 s, on `beforeunload`, and on Save & Quit.

## Adapter Contract

Gameplay code **never** touches `localStorage` directly — it goes through
`SaveAdapter` (`src/save/saveAdapter.js`):

```
listSlots(): Promise<string[]>
load(name):  Promise<SaveData|null>
save(data):  Promise<void>
remove(name):Promise<void>
```

`SaveData` = `{ name, level, xp, grade, gold, quests, flags, updatedAt }`
where `flags` holds permanent smith upgrades (currently just
`dmgBonus`). Old saves may still carry a `technique` field (and/or
`flags.ceBonus`) from before the 2026-05-21 cursed-technique removal —
those fields are simply ignored.

Position is intentionally **not** saved — you respawn at town on load
(simpler, and town is the natural hub). Add to schema later if needed.

## Swapping to a real backend later

Implement the same interface in e.g. `supabaseAdapter.js` (email /
magic-link via the existing **Resend** account, a `saves` row per user)
and change the one `new LocalStorageAdapter()` line in `main.js`. No
gameplay code changes — that's the whole point of the adapter boundary.

Storage keys: `jcr_save_<name>`, index `jcr_slots`.
