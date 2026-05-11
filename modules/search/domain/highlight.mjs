/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure highlight helper — wraps matched query tokens in <mark> tags.
 * @sidecar highlight.mjs.header.md
 * @layer domain | @hex _none_ | @ctx search
 * @public false
 * @edit careful
 */

/**
 * Wrap every occurrence of any query token inside the text with
 * `<mark>…</mark>` (case-insensitive). The output is intended for display
 * in HTML clients that already escape the rest of the text; callers that
 * emit to other media should post-process.
 *
 * The match is whole-token-ish: it uses word boundaries so "search" inside
 * "researcher" is NOT marked. Tokens are lowercased before matching, but
 * the original text casing is preserved in the output.
 *
 * @param {string} text
 * @param {string[]} queryTokens
 * @returns {string}
 */
export function highlightMatches(text, queryTokens) {
  if (typeof text !== 'string' || text.length === 0) return text ?? '';
  if (!Array.isArray(queryTokens) || queryTokens.length === 0) return text;
  const unique = Array.from(
    new Set(queryTokens.filter((t) => typeof t === 'string' && t.length > 0)),
  );
  if (unique.length === 0) return text;
  const escaped = unique.map(escapeRegExp).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(?<!\\p{L})(${escaped.join('|')})(?!\\p{L})`, 'giu');
  return text.replace(pattern, '<mark>$1</mark>');
}

/**
 * @param {string} raw
 * @returns {string}
 */
function escapeRegExp(raw) {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
