/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Search demo routes: index a document and query the in-memory inverted index.
 * @sidecar search.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-177
/**
 * Search demo routes — exercise the search module's public API from a host
 * server. The index is seeded at startup with a few sample documents so the
 * /api/search/query route returns meaningful hits without extra setup.
 *
 * GET /api/search/query?q=hexagonal        → ranked hits + highlights
 * GET /api/search/index?id=...&title=...   → index (or replace) one document
 */

/**
 * Seed the in-memory index with a handful of documents so the starter works
 * out of the box. Safe to call multiple times — re-indexing by id replaces
 * the previous postings.
 *
 * @param {import('../../../modules/search/public-api.mjs').SearchPort} index
 */
export async function seedSearchIndex(index) {
  await index.indexBatch([
    {
      id: 'hex',
      fields: {
        title: 'Hexagonal architecture',
        body: 'Ports and adapters keep the domain pure and swappable.',
      },
      facets: { tag: 'arch' },
    },
    {
      id: 'trunk',
      fields: {
        title: 'Trunk-based delivery',
        body: 'Small slices, frequent commits, branch by abstraction.',
      },
      facets: { tag: 'process' },
    },
    {
      id: 'modules',
      fields: {
        title: 'Modular monolith',
        body: 'Bounded contexts and hexagonal modules inside one repo.',
      },
      facets: { tag: ['arch', 'modules'] },
    },
  ]);
}

/**
 * @param {{ query: URLSearchParams }} req
 * @param {object} ctx
 */
export async function searchQueryHandler(req, ctx) {
  const q = req.query.get('q') || '';
  const limit = Number(req.query.get('limit') || '10');
  const tag = req.query.get('tag');
  const result = await ctx.searchIndex.search(q, {
    limit: Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10,
    filters: tag ? { tag } : undefined,
  });
  ctx.log.info('Search query', { q, total: result.total });
  return {
    q,
    total: result.total,
    took: result.took,
    hits: result.hits.map((h) => ({
      id: h.id,
      score: Number(h.score.toFixed(4)),
      title: h.document.fields.title,
      highlights: h.highlights,
    })),
  };
}

/**
 * @param {{ query: URLSearchParams }} req
 * @param {object} ctx
 */
export async function searchIndexHandler(req, ctx) {
  const id = req.query.get('id');
  const title = req.query.get('title');
  const body = req.query.get('body') || '';
  if (!id || !title) {
    throw new TypeError('id and title are required');
  }
  const doc = await ctx.searchIndex.index({
    id,
    fields: { title, body },
  });
  return { id: doc.id, indexed: true };
}
