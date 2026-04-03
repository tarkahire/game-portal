// ==========================================================================
// SceneManager — Simple scene state machine
//
// Each scene has enter() and exit() callbacks. Only one scene is active at
// a time. Switching scenes exits the current one before entering the next.
// ==========================================================================

export class SceneManager {
  constructor() {
    /** @type {Map<string, {enter: Function, exit: Function}>} */
    this._scenes = new Map();

    /** @type {string|null} */
    this._current = null;
  }

  /**
   * Register a named scene with enter/exit lifecycle hooks.
   * @param {string} name   — unique scene identifier
   * @param {object} hooks
   * @param {Function} hooks.enter — called when the scene becomes active
   * @param {Function} hooks.exit  — called when the scene is deactivated
   */
  register(name, { enter, exit }) {
    if (this._scenes.has(name)) {
      console.warn(`[SceneManager] Overwriting existing scene "${name}"`);
    }
    this._scenes.set(name, { enter, exit });
  }

  /**
   * Transition to a new scene. Exits the current scene first.
   * @param {string} name — the scene to switch to
   * @param {*} [data]    — optional data passed to the enter() callback
   */
  switchTo(name, data) {
    if (!this._scenes.has(name)) {
      console.error(`[SceneManager] Unknown scene "${name}"`);
      return;
    }

    // Exit current scene
    if (this._current && this._scenes.has(this._current)) {
      try {
        this._scenes.get(this._current).exit();
      } catch (err) {
        console.error(`[SceneManager] Error exiting scene "${this._current}":`, err);
      }
    }

    // Enter new scene
    this._current = name;
    try {
      this._scenes.get(name).enter(data);
    } catch (err) {
      console.error(`[SceneManager] Error entering scene "${name}":`, err);
    }
  }

  /**
   * Returns the name of the currently active scene.
   * @returns {string|null}
   */
  getCurrent() {
    return this._current;
  }
}
