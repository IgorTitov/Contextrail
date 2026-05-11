/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Regex Entity Extractor adapter for the knowledge-graph module.
 * @sidecar regex-entity-extractor.mjs.header.md
 * @layer module | @hex adapter | @ctx knowledge-graph
 * @public false
 * @edit careful
 */

/**
 * Regex-based entity extractor — extracts proper nouns and quoted terms.
 * SpecRefs: TPL-117
 *
 * @typedef {import('../types.d.ts').Entity} Entity
 */

// Common words that should NOT be treated as entities
const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'shall',
  'can',
  'need',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
  'i',
  'we',
  'you',
  'he',
  'she',
  'they',
  'me',
  'him',
  'her',
  'us',
  'them',
  'my',
  'your',
  'his',
  'our',
  'their',
  'what',
  'which',
  'who',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'every',
  'both',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'not',
  'only',
  'own',
  'same',
  'so',
  'than',
  'too',
  'very',
  'just',
  'because',
  'as',
  'until',
  'while',
  'of',
  'at',
  'by',
  'for',
  'with',
  'about',
  'against',
  'between',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'to',
  'from',
  'up',
  'down',
  'in',
  'out',
  'on',
  'off',
  'over',
  'under',
  'again',
  'further',
  'then',
  'once',
  'here',
  'there',
  'and',
  'but',
  'or',
  'nor',
  'if',
  'so',
  'yet',
]);

/**
 * @returns {{ extractEntities: (text: string) => Entity[] }}
 */
export function createRegexEntityExtractor() {
  let counter = 0;

  return {
    /** @param {string} text @returns {Entity[]} */
    extractEntities(text) {
      if (!text) return [];

      /** @type {Map<string, Entity>} */
      const seen = new Map();

      // Extract capitalized words (potential proper nouns)
      // Matches sequences of capitalized words (e.g., "New York", "Alice")
      const capsRe = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
      let m;
      while ((m = capsRe.exec(text)) !== null) {
        const name = m[1].trim();
        if (name.length < 2) continue;
        if (STOP_WORDS.has(name.toLowerCase())) continue;
        // Skip if it's the first word of a sentence (might just be capitalized)
        const before = text.slice(0, m.index);
        const isStartOfSentence = before.length === 0 || /[.!?]\s*$/.test(before);
        // Still include if it appears elsewhere too, but for single-word at sentence start, skip
        if (isStartOfSentence && !name.includes(' ') && name.length < 4) continue;

        if (!seen.has(name)) {
          seen.set(name, {
            id: `entity-${++counter}`,
            name,
            type: 'proper_noun',
            metadata: {},
          });
        }
      }

      // Extract quoted terms
      const quotedRe = /"([^"]{2,})"/g;
      while ((m = quotedRe.exec(text)) !== null) {
        const name = m[1].trim();
        if (!seen.has(name)) {
          seen.set(name, {
            id: `entity-${++counter}`,
            name,
            type: 'quoted_term',
            metadata: {},
          });
        }
      }

      return [...seen.values()];
    },
  };
}
