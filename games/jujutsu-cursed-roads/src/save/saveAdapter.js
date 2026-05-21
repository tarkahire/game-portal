// ═══════════════════════════════════════════════════════════════
//  SAVE ADAPTER INTERFACE
//  Gameplay code ONLY talks to an object shaped like this. Swapping
//  localStorage for a real backend (Supabase / Vercel KV + Resend
//  magic-link) later = drop in a new adapter, zero gameplay changes.
// ═══════════════════════════════════════════════════════════════

/**
 * @typedef {Object} SaveData
 * @property {string} name
 * @property {number} level
 * @property {number} xp
 * @property {number} grade   // 4 = Grade 4 ... 0 = Special Grade
 * @property {number} gold
 * @property {object} quests  // { [id]: { state, progress } }
 * @property {object} flags   // misc booleans (examUnlocked, etc.)
 * @property {number} updatedAt
 */

export class SaveAdapter {
    /** @returns {Promise<string[]>} known save slot names */
    async listSlots() { throw new Error('not implemented'); }
    /** @param {string} name @returns {Promise<SaveData|null>} */
    async load(name) { throw new Error('not implemented'); }
    /** @param {SaveData} data @returns {Promise<void>} */
    async save(data) { throw new Error('not implemented'); }
    /** @param {string} name @returns {Promise<void>} */
    async remove(name) { throw new Error('not implemented'); }
}

// Fresh save for a new sorcerer.
export function newSave(name) {
    return {
        name,
        pwHash: '',               // set on registration. Client-side hash —
                                  // this is a friend gate, not real auth.
        level: 1,
        xp: 0,
        grade: 4,                 // everyone starts Grade 4
        gold: 0,
        shards: 0,                // cursed-spirit shards (drop from curse kills)
        ownedTechniques: [],      // technique IDs the player has purchased
        equipped: null,           // currently-equipped technique ID
        quests: {},               // id -> { state:'available'|'active', progress:0, completedCount }
        flags: {},
        updatedAt: Date.now(),
    };
}
