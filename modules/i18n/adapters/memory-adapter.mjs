/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Memory adapter for the i18n module.
 * @sidecar memory-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx i18n
 * @public false
 * @edit careful
 */

/**
 * Test-friendly i18n adapter with no Intl dependency.
 * Uses simple formatting and one/other pluralization.
 */

import { createMessageRegistry } from '../domain/message-registry.mjs';
import { buildFallbackChain, resolveWithFallback } from '../domain/locale-resolver.mjs';
import { interpolate } from '../domain/interpolation.mjs';

/**
 * @typedef {object} MemoryAdapterOptions
 * @property {string} [defaultLocale='en']
 * @property {Record<string, Record<string, Record<string, string>>>} [initialMessages]
 */

/**
 * Create a memory-only i18n adapter for testing.
 * No Intl.PluralRules, no Intl.NumberFormat, no Intl.DateTimeFormat.
 *
 * @param {MemoryAdapterOptions} [options]
 * @returns {import('../ports/i18n-port.mjs').I18nPort}
 */
export function createMemoryI18nAdapter(options = {}) {
  const defaultLocale = options.defaultLocale || 'en';
  let currentLocale = defaultLocale;

  const registry = createMessageRegistry();

  if (options.initialMessages) {
    for (const [namespace, localeMap] of Object.entries(options.initialMessages)) {
      for (const [locale, messages] of Object.entries(localeMap)) {
        registry.register(namespace, locale, messages);
      }
    }
  }

  return {
    /** @param {string} key @param {Record<string, string | number>} [params] @returns {string} */
    t(key, params) {
      const chain = buildFallbackChain(currentLocale, defaultLocale);
      const template = resolveWithFallback(chain, registry, key);
      if (template === undefined) return key;
      return interpolate(template, params);
    },

    /**
     * @param {string} key @param {number} count
     * @param {Record<string, string>} forms @param {Record<string, string | number>} [params]
     * @returns {string}
     */
    tp(key, count, forms, params) {
      // Simple one/other rule (no Intl.PluralRules)
      const category = count === 1 ? 'one' : 'other';
      const template = forms[category] ?? forms.other ?? '';
      if (!template) return key;
      return interpolate(template, { count, ...params });
    },

    /** @param {string} locale */
    setLocale(locale) {
      currentLocale = locale;
    },

    /** @returns {string} */
    getLocale() {
      return currentLocale;
    },

    /** @returns {string[]} */
    getAvailableLocales() {
      return registry.getAvailableLocales();
    },

    /** @param {string} namespace @param {string} locale @param {Record<string, string>} messages */
    registerMessages(namespace, locale, messages) {
      registry.register(namespace, locale, messages);
    },

    /** @param {number} n @returns {string} */
    formatNumber(n) {
      return String(n);
    },

    /** @param {Date} d @returns {string} */
    formatDate(d) {
      return d.toISOString();
    },

    /** @param {number} amount @param {string} currency @returns {string} */
    formatCurrency(amount, currency) {
      return `${currency} ${amount}`;
    },
  };
}
