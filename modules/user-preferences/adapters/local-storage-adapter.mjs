/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Local Storage adapter for the user-preferences module.
 * @sidecar local-storage-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx user-preferences
 * @public false
 * @edit careful
 */

/**
 * localStorage adapter for browser preference persistence.
 * Implements the StoragePort contract.
 *
 * @param {string} [storageKey='user-prefs'] The localStorage key to use.
 * @returns {import('../ports/storage-port.mjs').StoragePort}
 */
export function createLocalStorageAdapter(storageKey = 'user-prefs') {
  return {
    load() {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw == null) return null;
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },
    save(state) {
      localStorage.setItem(storageKey, JSON.stringify(state));
    },
  };
}
