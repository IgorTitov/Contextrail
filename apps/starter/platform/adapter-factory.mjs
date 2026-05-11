/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Adapter Factory for the starter app.
 * @sidecar adapter-factory.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Platform adapter factory — selects and creates the correct storage adapter
 * based on the resolved runtime mode and detected environment capabilities.
 *
 * This is the single integration point between app-config, environment
 * detection, and the user-preferences hex module adapters.
 *
 * SpecRefs: TPL-031
 *
 * @param {string} mode — resolved runtime mode from app-config.mjs
 * @param {import('./environment-detect.mjs').EnvironmentCapabilities} capabilities
 * @returns {Promise<import('../../../modules/user-preferences/ports/storage-port.mjs').StoragePort>}
 */
export async function createStorageAdapter(mode, capabilities) {
  // Electron and local modes prefer IndexedDB (more reliable than localStorage
  // in wrapped/file:// contexts), falling back to localStorage then memory.
  if (mode === 'electron' || mode === 'local') {
    if (capabilities.hasIndexedDB) {
      const { createIndexedDBAdapter } =
        await import('../../../modules/user-preferences/public-api.mjs');
      return createIndexedDBAdapter();
    }
  }

  // Capacitor: prefer IndexedDB (native bridge can make localStorage flaky)
  if (mode === 'capacitor' && capabilities.hasIndexedDB) {
    const { createIndexedDBAdapter } =
      await import('../../../modules/user-preferences/public-api.mjs');
    return createIndexedDBAdapter();
  }

  // Default path: localStorage when available, memory fallback
  if (capabilities.hasLocalStorage) {
    const { createLocalStorageAdapter } =
      await import('../../../modules/user-preferences/public-api.mjs');
    return createLocalStorageAdapter();
  }

  // Last resort: in-memory (data lost on reload)
  const { createMemoryAdapter } = await import('../../../modules/user-preferences/public-api.mjs');
  return createMemoryAdapter();
}

/**
 * Determine the adapter plan name for a given mode and capabilities.
 * Returns a string label used by getAdapterPlan() in app.mjs.
 *
 * @param {string} mode
 * @param {import('./environment-detect.mjs').EnvironmentCapabilities} capabilities
 * @returns {string} — 'indexedDB', 'localStorage', or 'memory'
 */
export function resolveStorageType(mode, capabilities) {
  if ((mode === 'electron' || mode === 'local') && capabilities.hasIndexedDB) {
    return 'indexedDB';
  }
  if (mode === 'capacitor' && capabilities.hasIndexedDB) {
    return 'indexedDB';
  }
  if (capabilities.hasLocalStorage) {
    return 'localStorage';
  }
  return 'memory';
}
