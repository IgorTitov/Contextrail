/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Echo Embedder adapter for the retrieval module.
 * @sidecar echo-embedder.mjs.header.md
 * @layer module | @hex adapter | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Echo/deterministic embedder for testing.
 * Generates deterministic Float32Array embeddings from text using a simple hash.
 *
 * SpecRefs: TPL-109
 */

/**
 * @param {{ dimensions?: number }} [options]
 * @returns {import('../types.d.ts').EmbedderPort}
 */
export function createEchoEmbedder(options = {}) {
  const dimensions = options.dimensions ?? 384;

  /**
   * Simple deterministic hash-based embedding.
   * @param {string} text
   * @returns {Float32Array}
   */
  function hashEmbed(text) {
    const vec = new Float32Array(dimensions);
    if (!text) return vec;

    // Simple hash spread across dimensions
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      const idx = (i * 31 + code) % dimensions;
      vec[idx] += (code - 64) / 128;
    }

    // Normalize to unit vector
    let norm = 0;
    for (let i = 0; i < dimensions; i++) norm += vec[i] * vec[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < dimensions; i++) vec[i] /= norm;

    return vec;
  }

  return {
    /**
     * @param {string[]} texts
     * @returns {Promise<Float32Array[]>}
     */
    async embed(texts) {
      return texts.map(hashEmbed);
    },
  };
}
