/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pluralization domain logic for the i18n module.
 * @sidecar pluralization.mjs.header.md
 * @layer module | @hex domain | @ctx i18n
 * @public false
 * @edit careful
 */

/**
 * Locale-aware plural form selection using Intl.PluralRules.
 */

/** @type {readonly string[]} */
export const PLURAL_CATEGORIES = Object.freeze(['zero', 'one', 'two', 'few', 'many', 'other']);

/**
 * Create a plural resolver for the given locale.
 *
 * @param {string} locale - BCP 47 locale tag (e.g. 'en', 'ru', 'ar')
 * @returns {{ resolve(count: number, forms: Record<string, string>): string }}
 */
export function createPluralResolver(locale) {
  /** @type {Intl.PluralRules | null} */
  let rules = null;
  try {
    rules = new Intl.PluralRules(locale);
  } catch {
    // Fallback: simple one/other rule
  }

  return {
    /**
     * Select the correct plural form for the given count.
     *
     * @param {number} count
     * @param {Record<string, string>} forms - e.g. { one: "{count} item", other: "{count} items" }
     * @returns {string} The selected form template (caller must still interpolate {count}).
     */
    resolve(count, forms) {
      const category = rules ? rules.select(count) : count === 1 ? 'one' : 'other';

      return forms[category] ?? forms.other ?? '';
    },
  };
}
