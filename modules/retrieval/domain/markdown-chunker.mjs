/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Markdown Chunker domain logic for the retrieval module.
 * @sidecar markdown-chunker.mjs.header.md
 * @layer module | @hex domain | @ctx retrieval
 * @public false
 * @edit careful
 */

/**
 * Markdown-aware chunker.
 * Splits markdown by headings, preserving heading hierarchy in chunk metadata.
 *
 * SpecRefs: TPL-102
 *
 * @typedef {import('../types.d.ts').RetrievalChunk} RetrievalChunk
 */

/**
 * Split markdown by headings, preserving heading hierarchy in metadata.
 *
 * @param {{ maxChunkSize?: number }} [options]
 * @returns {{ chunk: (text: string, documentId: string) => RetrievalChunk[] }}
 */
export function createMarkdownChunker(options = {}) {
  const maxChunkSize = options.maxChunkSize ?? 2000;

  return {
    /** @param {string} text @param {string} documentId @returns {RetrievalChunk[]} */
    chunk(text, documentId) {
      if (!text || text.length === 0) return [];

      // Split into sections by heading lines
      const headingRe = /^(#{1,6})\s+(.+)$/gm;
      /** @type {{ level: number, title: string, start: number }[]} */
      const headings = [];
      let hm;
      while ((hm = headingRe.exec(text)) !== null) {
        headings.push({ level: hm[1].length, title: hm[2].trim(), start: hm.index });
      }

      if (headings.length === 0) {
        return [
          {
            documentId,
            chunkIndex: 0,
            content: text,
            startOffset: 0,
            endOffset: text.length,
            metadata: {},
          },
        ];
      }

      /** @type {{ content: string, headings: { level: number, title: string }[], startOffset: number }[]} */
      const sections = [];

      // Content before first heading
      if (headings[0].start > 0) {
        const pre = text.slice(0, headings[0].start).trim();
        if (pre) {
          sections.push({ content: pre, headings: [], startOffset: 0 });
        }
      }

      // Build heading stack for hierarchy tracking
      /** @type {{ level: number, title: string }[]} */
      let headingStack = [];

      for (let i = 0; i < headings.length; i++) {
        const h = headings[i];
        const sectionEnd = i + 1 < headings.length ? headings[i + 1].start : text.length;
        const sectionText = text.slice(h.start, sectionEnd).trim();

        // Update heading stack — pop everything >= current level, then push
        headingStack = headingStack.filter((s) => s.level < h.level);
        headingStack.push({ level: h.level, title: h.title });

        if (sectionText) {
          sections.push({
            content: sectionText,
            headings: [...headingStack],
            startOffset: h.start,
          });
        }
      }

      // Now split large sections if needed and produce final chunks
      /** @type {RetrievalChunk[]} */
      const chunks = [];
      let chunkIndex = 0;

      for (const section of sections) {
        if (section.content.length <= maxChunkSize) {
          chunks.push({
            documentId,
            chunkIndex,
            content: section.content,
            startOffset: section.startOffset,
            endOffset: section.startOffset + section.content.length,
            metadata: {
              headings: section.headings,
              ...(section.headings.length > 0
                ? { headingLevel: section.headings[section.headings.length - 1].level }
                : {}),
            },
          });
          chunkIndex++;
        } else {
          // Split large section by spaces
          const words = section.content.split(' ');
          let buffer = '';
          let subOffset = section.startOffset;
          for (const word of words) {
            const candidate = buffer ? buffer + ' ' + word : word;
            if (candidate.length > maxChunkSize && buffer) {
              chunks.push({
                documentId,
                chunkIndex,
                content: buffer,
                startOffset: subOffset,
                endOffset: subOffset + buffer.length,
                metadata: {
                  headings: section.headings,
                  ...(section.headings.length > 0
                    ? { headingLevel: section.headings[section.headings.length - 1].level }
                    : {}),
                },
              });
              chunkIndex++;
              subOffset += buffer.length + 1;
              buffer = word;
            } else {
              buffer = candidate;
            }
          }
          if (buffer) {
            chunks.push({
              documentId,
              chunkIndex,
              content: buffer,
              startOffset: subOffset,
              endOffset: subOffset + buffer.length,
              metadata: {
                headings: section.headings,
                ...(section.headings.length > 0
                  ? { headingLevel: section.headings[section.headings.length - 1].level }
                  : {}),
              },
            });
            chunkIndex++;
          }
        }
      }

      return chunks;
    },
  };
}
