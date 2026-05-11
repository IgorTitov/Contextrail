/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Seam Registry domain logic for the feature-seams module.
 * @sidecar seam-registry.mjs.header.md
 * @layer module | @hex domain | @ctx feature-seams
 * @public false
 * @edit careful
 */

/**
 * Pure domain logic for feature seam management.
 * Framework-free, no external dependencies.
 *
 * SpecRefs: TPL-037
 */

/**
 * Valid seam states.
 * - active: new path is used
 * - shadow: both paths run, old path wins (for monitoring)
 * - disabled: old path is used (seam exists but inactive)
 *
 * @readonly
 * @enum {string}
 */
export const SEAM_STATES = Object.freeze({
  ACTIVE: 'active',
  SHADOW: 'shadow',
  DISABLED: 'disabled',
});

const VALID_STATES = new Set(Object.values(SEAM_STATES));

/**
 * @typedef {Object} SeamConfig
 * @property {'active' | 'shadow' | 'disabled'} state
 * @property {string} owner
 * @property {string} [description]
 * @property {string} [created]
 * @property {string} [cleanupBy] - ISO date or description of when this seam should be removed
 */

/**
 * @typedef {Object} SeamEntry
 * @property {string} flag
 * @property {'active' | 'shadow' | 'disabled'} state
 * @property {string} owner
 * @property {string} [description]
 * @property {string} [created]
 * @property {string} [cleanupBy]
 * @property {string} [enabledAt]
 * @property {string} [disabledAt]
 */

/**
 * @typedef {Object} TransitionEvent
 * @property {'register' | 'enable' | 'disable' | 'remove' | 'auto-disable'} type
 * @property {string} flag
 * @property {string} [previousState]
 * @property {string} [newState]
 * @property {string} timestamp
 */

/**
 * @typedef {Object} RegistryOptions
 * @property {(event: TransitionEvent) => void} [onTransition] - Called on every state change
 */

/**
 * Create a new seam registry (in-memory Map-backed).
 * This is the core domain object — adapters wrap it with persistence.
 *
 * @param {RegistryOptions} [options]
 * @returns {{ register: (flag: string, config: SeamConfig) => void, isEnabled: (flag: string) => boolean, isShadow: (flag: string) => boolean, enable: (flag: string) => void, disable: (flag: string) => void, list: () => SeamEntry[], remove: (flag: string) => void }}
 */
export function createSeamRegistry(options = {}) {
  const { onTransition } = options;
  /** @type {Map<string, SeamEntry>} */
  const seams = new Map();

  return {
    /**
     * Register a new feature seam.
     * @param {string} flag
     * @param {SeamConfig} config
     */
    register(flag, config) {
      if (seams.has(flag)) {
        throw new Error(`Seam "${flag}" is already registered`);
      }
      if (!VALID_STATES.has(config.state)) {
        throw new Error(`Invalid seam state: "${config.state}"`);
      }
      const now = new Date().toISOString();
      seams.set(flag, {
        flag,
        state: config.state,
        owner: config.owner,
        description: config.description ?? '',
        created: config.created ?? now,
        cleanupBy: config.cleanupBy ?? undefined,
        enabledAt: config.state === SEAM_STATES.ACTIVE ? now : undefined,
        disabledAt: config.state === SEAM_STATES.DISABLED ? now : undefined,
      });
      if (onTransition) {
        onTransition({ type: 'register', flag, newState: config.state, timestamp: now });
      }
    },

    /**
     * Check whether a seam flag is enabled (state === 'active').
     * Unknown flags return false.
     * @param {string} flag
     * @returns {boolean}
     */
    isEnabled(flag) {
      const entry = seams.get(flag);
      return entry != null && entry.state === SEAM_STATES.ACTIVE;
    },

    /**
     * Check whether a seam flag is in shadow state.
     * Unknown flags return false.
     * @param {string} flag
     * @returns {boolean}
     */
    isShadow(flag) {
      const entry = seams.get(flag);
      return entry != null && entry.state === SEAM_STATES.SHADOW;
    },

    /**
     * Switch a seam to active state.
     * @param {string} flag
     */
    enable(flag) {
      const entry = seams.get(flag);
      if (!entry) throw new Error(`Seam "${flag}" is not registered`);
      const prev = entry.state;
      entry.state = SEAM_STATES.ACTIVE;
      entry.enabledAt = new Date().toISOString();
      if (onTransition) {
        onTransition({
          type: 'enable',
          flag,
          previousState: prev,
          newState: 'active',
          timestamp: entry.enabledAt,
        });
      }
    },

    /**
     * Switch a seam to disabled state.
     * @param {string} flag
     */
    disable(flag) {
      const entry = seams.get(flag);
      if (!entry) throw new Error(`Seam "${flag}" is not registered`);
      const prev = entry.state;
      entry.state = SEAM_STATES.DISABLED;
      entry.disabledAt = new Date().toISOString();
      if (onTransition) {
        onTransition({
          type: 'disable',
          flag,
          previousState: prev,
          newState: 'disabled',
          timestamp: entry.disabledAt,
        });
      }
    },

    /**
     * List all registered seams (returns copies).
     * @returns {SeamEntry[]}
     */
    list() {
      return [...seams.values()].map((e) => ({ ...e }));
    },

    /**
     * Remove a seam. Silent if not found.
     * @param {string} flag
     */
    remove(flag) {
      const entry = seams.get(flag);
      seams.delete(flag);
      if (entry && onTransition) {
        onTransition({
          type: 'remove',
          flag,
          previousState: entry.state,
          timestamp: new Date().toISOString(),
        });
      }
    },
  };
}
