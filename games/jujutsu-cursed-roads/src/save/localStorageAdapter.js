// ═══════════════════════════════════════════════════════════════
//  LOCALSTORAGE SAVE ADAPTER (MVP)
//  Implements SaveAdapter against window.localStorage. Per-name slot
//  keyed `jcr_save_<name>`; an index list under `jcr_slots`.
// ═══════════════════════════════════════════════════════════════

import { SaveAdapter } from './saveAdapter.js';

const SLOT_PREFIX = 'jcr_save_';
const INDEX_KEY = 'jcr_slots';

export class LocalStorageAdapter extends SaveAdapter {
    _index() {
        try { return JSON.parse(localStorage.getItem(INDEX_KEY) || '[]'); }
        catch { return []; }
    }
    _writeIndex(list) {
        localStorage.setItem(INDEX_KEY, JSON.stringify([...new Set(list)]));
    }

    async listSlots() {
        return this._index();
    }

    async load(name) {
        try {
            const raw = localStorage.getItem(SLOT_PREFIX + name);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }

    async save(data) {
        data.updatedAt = Date.now();
        try {
            localStorage.setItem(SLOT_PREFIX + data.name, JSON.stringify(data));
            const idx = this._index();
            idx.push(data.name);
            this._writeIndex(idx);
        } catch (e) {
            console.warn('[save] localStorage write failed', e);
        }
    }

    async remove(name) {
        localStorage.removeItem(SLOT_PREFIX + name);
        this._writeIndex(this._index().filter(n => n !== name));
    }
}
