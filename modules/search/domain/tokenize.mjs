/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure tokenizer — lowercase, split on non-word, drop stop words.
 * @sidecar tokenize.mjs.header.md
 * @layer domain | @hex _none_ | @ctx search
 * @public false
 * @edit careful
 */

/**
 * Tiny stop-word list. Kept small on purpose: enough to stop "the", "a",
 * "of" from dominating TF, but not so long that legitimate query tokens
 * get silently dropped. Callers that want stricter stop-word handling can
 * compose their own tokenizer on top.
 */
const DEFAULT_STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'to',
  'of',
  'in',
  'on',
  'at',
  'for',
  'with',
  'by',
  'from',
  'as',
  'it',
  'its',
  'this',
  'that',
  'these',
  'those',
]);

/**
 * Split text into lowercased word tokens, dropping stop words and empty
 * strings. Unicode-friendly via \p{L}\p{N} so accented characters survive.
 *
 * @param {string} text
 * @param {{ stopWords?: Set<string>, minLength?: number }} [options]
 * @returns {string[]}
 */
export function tokenize(text, options = {}) {
  if (typeof text !== 'string' || text.length === 0) return [];
  const stopWords = options.stopWords ?? DEFAULT_STOP_WORDS;
  const minLength = options.minLength ?? 1;
  const raw = text.toLowerCase().split(/[^\p{L}\p{N}]+/u);
  /** @type {string[]} */
  const out = [];
  for (const token of raw) {
    if (token.length < minLength) continue;
    if (stopWords.has(token)) continue;
    out.push(token);
  }
  return out;
}

/**
 * Expose the default stop-word set so callers can compose on top (extend,
 * replace, or clear). Returned as a fresh Set to keep callers from mutating
 * shared state.
 *
 * @returns {Set<string>}
 */
export function defaultStopWords() {
  return new Set(DEFAULT_STOP_WORDS);
}
