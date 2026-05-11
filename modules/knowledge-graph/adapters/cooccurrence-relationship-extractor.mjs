/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Cooccurrence Relationship Extractor adapter for the knowledge-graph module.
 * @sidecar cooccurrence-relationship-extractor.mjs.header.md
 * @layer module | @hex adapter | @ctx knowledge-graph
 * @public false
 * @edit careful
 */

/**
 * Co-occurrence relationship extractor — finds entities mentioned
 * in the same sentence and creates relationships between them.
 * SpecRefs: TPL-118
 *
 * @typedef {import('../types.d.ts').Entity} Entity
 * @typedef {import('../types.d.ts').Relationship} Relationship
 */

/**
 * @returns {{ extractRelationships: (text: string, entities: Entity[]) => Relationship[] }}
 */
export function createCooccurrenceRelationshipExtractor() {
  return {
    /**
     * @param {string} text
     * @param {Entity[]} entities
     * @returns {Relationship[]}
     */
    extractRelationships(text, entities) {
      if (!text || entities.length < 2) return [];

      // Split text into sentences
      const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

      /** @type {Map<string, Relationship>} */
      const seen = new Map();

      for (const sentence of sentences) {
        const lower = sentence.toLowerCase();
        // Find which entities appear in this sentence
        const found = entities.filter((e) => lower.includes(e.name.toLowerCase()));

        // Create pairwise co-occurrence relationships
        for (let i = 0; i < found.length; i++) {
          for (let j = i + 1; j < found.length; j++) {
            const key = [found[i].id, found[j].id].sort().join(':');
            if (!seen.has(key)) {
              seen.set(key, {
                source: found[i].id,
                target: found[j].id,
                type: 'co_occurrence',
                weight: 1,
                metadata: {},
              });
            } else {
              seen.get(key).weight++;
            }
          }
        }
      }

      return [...seen.values()];
    },
  };
}
