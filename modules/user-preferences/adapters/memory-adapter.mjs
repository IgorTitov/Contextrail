/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Memory adapter for the user-preferences module.
 * @sidecar memory-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx user-preferences
 * @public false
 * @edit careful
 */

/**
 * In-memory storage adapter for testing and SSR fallback.
 * Implements the StoragePort contract.
 *
 * @returns {import('../ports/storage-port.mjs').StoragePort}
 */
export function createMemoryAdapter() {
  let stored = null;
  return {
    load() {
      return stored;
    },
    save(state) {
      stored = { ...state };
    },
  };
}
