/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose I18n port contract for the i18n module.
 * @sidecar i18n-port.mjs.header.md
 * @layer module | @hex port | @ctx i18n
 * @public false
 * @edit careful
 */

/**
 * Port contract for i18n adapters.
 *
 * @typedef {object} I18nPort
 * @property {(key: string, params?: Record<string, string | number>) => string} t
 * @property {(key: string, count: number, forms: Record<string, string>, params?: Record<string, string | number>) => string} tp
 * @property {(locale: string) => void} setLocale
 * @property {() => string} getLocale
 * @property {() => string[]} getAvailableLocales
 * @property {(namespace: string, locale: string, messages: Record<string, string>) => void} registerMessages
 * @property {(n: number, opts?: Intl.NumberFormatOptions) => string} formatNumber
 * @property {(d: Date, opts?: Intl.DateTimeFormatOptions) => string} formatDate
 * @property {(amount: number, currency: string, opts?: Intl.NumberFormatOptions) => string} formatCurrency
 */

import { t } from '../messages.mjs';

const REQUIRED_METHODS = [
  't',
  'tp',
  'setLocale',
  'getLocale',
  'getAvailableLocales',
  'registerMessages',
  'formatNumber',
  'formatDate',
  'formatCurrency',
];

/**
 * Validate that an adapter conforms to the I18nPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertI18nPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('i18n.port.invalid_adapter'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  for (const method of REQUIRED_METHODS) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t('i18n.port.missing_method', { method }));
    }
  }
}
