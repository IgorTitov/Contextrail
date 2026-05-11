/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Locale Resolver domain logic for the i18n module.
 * @sidecar locale-resolver.mjs.header.md
 * @layer module | @hex domain | @ctx i18n
 * @public false
 * @edit careful
 */

/**
 * Locale fallback chain resolution.
 * Strips BCP 47 subtags progressively until a matching locale is found.
 */

/**
 * Build a fallback chain from a locale tag.
 * Example: buildFallbackChain('zh-Hant-TW', 'en') → ['zh-Hant-TW', 'zh-Hant', 'zh', 'en']
 *
 * @param {string} locale - BCP 47 locale tag.
 * @param {string} defaultLocale - Final fallback locale.
 * @returns {string[]} Ordered chain of locale tags to try.
 */
export function buildFallbackChain(locale, defaultLocale) {
  const chain = [locale];
  const parts = locale.split('-');

  // Progressively strip subtags from the right
  while (parts.length > 1) {
    parts.pop();
    chain.push(parts.join('-'));
  }

  // Append default locale if not already in the chain
  if (!chain.includes(defaultLocale)) {
    chain.push(defaultLocale);
  }

  return chain;
}

/**
 * Resolve a message key using a fallback chain.
 *
 * @param {string[]} chain - Locale fallback chain from buildFallbackChain().
 * @param {{ resolve(locale: string, key: string): string | undefined }} registry
 * @param {string} key - Message key to look up.
 * @returns {string | undefined} The first matching template, or undefined.
 */
export function resolveWithFallback(chain, registry, key) {
  for (const locale of chain) {
    const template = registry.resolve(locale, key);
    if (template !== undefined) return template;
  }
  return undefined;
}
