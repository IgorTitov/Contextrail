/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Message Registry domain logic for the i18n module.
 * @sidecar message-registry.mjs.header.md
 * @layer module | @hex domain | @ctx i18n
 * @public false
 * @edit careful
 */

/**
 * Central in-memory registry that collects message bundles from all modules/screens.
 * Bridges per-module messages.mjs files to the i18n infrastructure.
 */

/**
 * @typedef {object} MessageRegistry
 * @property {(namespace: string, locale: string, messages: Record<string, string>) => void} register
 * @property {(locale: string, key: string) => string | undefined} resolve
 * @property {() => string[]} getAvailableLocales
 * @property {(locale: string) => string[]} getKeysForLocale
 * @property {() => void} clear
 */

/**
 * Create a new message registry.
 *
 * @returns {MessageRegistry}
 */
export function createMessageRegistry() {
  /** @type {Map<string, Map<string, string>>} locale → (key → template) */
  const store = new Map();

  return {
    /**
     * Register a message bundle.
     *
     * @param {string} namespace - Module identifier, e.g. 'log' or 'auth'.
     * @param {string} locale - BCP 47 locale tag.
     * @param {Record<string, string>} messages - Flat key → template map.
     */
    register(namespace, locale, messages) {
      if (!namespace || typeof namespace !== 'string') {
        throw new TypeError('Namespace must be a non-empty string.');
      }
      if (!locale || typeof locale !== 'string') {
        throw new TypeError('Locale must be a non-empty string.');
      }
      if (!messages || typeof messages !== 'object') {
        throw new TypeError('Messages must be a non-null object.');
      }

      if (!store.has(locale)) {
        store.set(locale, new Map());
      }
      const localeMap = /** @type {Map<string, string>} */ (store.get(locale));
      for (const [key, template] of Object.entries(messages)) {
        localeMap.set(key, template);
      }
    },

    /**
     * Resolve a message template for the given locale and key.
     *
     * @param {string} locale
     * @param {string} key
     * @returns {string | undefined}
     */
    resolve(locale, key) {
      return store.get(locale)?.get(key);
    },

    /**
     * Return all registered locale tags, sorted alphabetically.
     *
     * @returns {string[]}
     */
    getAvailableLocales() {
      return [...store.keys()].sort();
    },

    /**
     * Return all registered keys for a given locale.
     *
     * @param {string} locale
     * @returns {string[]}
     */
    getKeysForLocale(locale) {
      const localeMap = store.get(locale);
      return localeMap ? [...localeMap.keys()] : [];
    },

    /** Remove all registered bundles. */
    clear() {
      store.clear();
    },
  };
}
