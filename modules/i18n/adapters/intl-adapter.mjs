/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Intl adapter for the i18n module.
 * @sidecar intl-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx i18n
 * @public false
 * @edit careful
 */

/**
 * Production i18n adapter using browser Intl API.
 * Composes domain modules: message-registry, locale-resolver, interpolation, pluralization.
 */

import { createMessageRegistry } from '../domain/message-registry.mjs';
import { buildFallbackChain, resolveWithFallback } from '../domain/locale-resolver.mjs';
import { interpolate } from '../domain/interpolation.mjs';
import { createPluralResolver } from '../domain/pluralization.mjs';

/**
 * @typedef {object} IntlAdapterOptions
 * @property {string} [defaultLocale='en'] - Fallback locale.
 * @property {Record<string, Record<string, Record<string, string>>>} [initialMessages]
 *   Bulk registration: { namespace: { locale: { key: template } } }
 */

/**
 * Create a production i18n adapter backed by Intl APIs.
 *
 * @param {IntlAdapterOptions} [options]
 * @returns {import('../ports/i18n-port.mjs').I18nPort}
 */
export function createIntlAdapter(options = {}) {
  const defaultLocale = options.defaultLocale || 'en';
  let currentLocale = defaultLocale;

  const registry = createMessageRegistry();

  /** @type {Map<string, ReturnType<typeof createPluralResolver>>} */
  const pluralResolvers = new Map();

  // Bulk-register initial messages
  if (options.initialMessages) {
    for (const [namespace, localeMap] of Object.entries(options.initialMessages)) {
      for (const [locale, messages] of Object.entries(localeMap)) {
        registry.register(namespace, locale, messages);
      }
    }
  }

  /**
   * @param {string} locale
   * @returns {ReturnType<typeof createPluralResolver>}
   */
  function getPluralResolver(locale) {
    if (!pluralResolvers.has(locale)) {
      pluralResolvers.set(locale, createPluralResolver(locale));
    }
    return /** @type {ReturnType<typeof createPluralResolver>} */ (pluralResolvers.get(locale));
  }

  return {
    /**
     * Translate a message key with optional interpolation.
     *
     * @param {string} key
     * @param {Record<string, string | number>} [params]
     * @returns {string}
     */
    t(key, params) {
      const chain = buildFallbackChain(currentLocale, defaultLocale);
      const template = resolveWithFallback(chain, registry, key);
      if (template === undefined) return key;
      return interpolate(template, params);
    },

    /**
     * Translate with pluralization.
     *
     * @param {string} key - Used as fallback if no forms match.
     * @param {number} count
     * @param {Record<string, string>} forms - e.g. { one: "{count} item", other: "{count} items" }
     * @param {Record<string, string | number>} [params]
     * @returns {string}
     */
    tp(key, count, forms, params) {
      const resolver = getPluralResolver(currentLocale);
      const template = resolver.resolve(count, forms);
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

    /**
     * Register a message bundle.
     *
     * @param {string} namespace
     * @param {string} locale
     * @param {Record<string, string>} messages
     */
    registerMessages(namespace, locale, messages) {
      registry.register(namespace, locale, messages);
    },

    /**
     * Format a number using Intl.NumberFormat.
     *
     * @param {number} n
     * @param {Intl.NumberFormatOptions} [opts]
     * @returns {string}
     */
    formatNumber(n, opts) {
      return new Intl.NumberFormat(currentLocale, opts).format(n);
    },

    /**
     * Format a date using Intl.DateTimeFormat.
     *
     * @param {Date} d
     * @param {Intl.DateTimeFormatOptions} [opts]
     * @returns {string}
     */
    formatDate(d, opts) {
      return new Intl.DateTimeFormat(currentLocale, opts).format(d);
    },

    /**
     * Format a currency amount using Intl.NumberFormat.
     *
     * @param {number} amount
     * @param {string} currency - ISO 4217 currency code (e.g. 'USD', 'EUR').
     * @param {Intl.NumberFormatOptions} [opts]
     * @returns {string}
     */
    formatCurrency(amount, currency, opts) {
      return new Intl.NumberFormat(currentLocale, {
        style: 'currency',
        currency,
        ...opts,
      }).format(amount);
    },
  };
}
