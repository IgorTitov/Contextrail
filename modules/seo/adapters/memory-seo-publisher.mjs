/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose In-memory SeoPublisherPort adapter — Map-backed sitemap + robots + meta store for tests and dev.
 * @sidecar memory-seo-publisher.mjs.header.md
 * @layer adapter | @hex _none_ | @ctx seo
 * @public false
 * @edit careful
 */

/**
 * In-memory SeoPublisherPort adapter. Backs a deterministic fake for
 * tests, local development, and the api-starter demo. Keeps the
 * sitemap XML, robots.txt body, and per-page meta HTML snippets in a
 * `Map` keyed by path and returns defensive copies so callers cannot
 * mutate internal state.
 *
 * @param {object} [options]
 * @param {() => number} [options.now]   Clock function (defaults to Date.now).
 * @param {string} [options.sitemapPath] Defaults to 'sitemap.xml'.
 * @param {string} [options.robotsPath]  Defaults to 'robots.txt'.
 * @returns {import('../ports/seo-publisher-port.mjs').SeoPublisherPort & {
 *   getSitemap: () => string | null,
 *   getRobots: () => string | null,
 *   getMeta: (pageId: string) => string | null,
 * }}
 */
export function createMemorySeoPublisher(options = {}) {
  const now = options.now ?? Date.now;
  const sitemapPath = options.sitemapPath ?? 'sitemap.xml';
  const robotsPath = options.robotsPath ?? 'robots.txt';

  /** @type {Map<string, import('../ports/seo-publisher-port.mjs').SeoAssetRecord & { body: string }>} */
  const assets = new Map();

  /**
   * @param {import('../ports/seo-publisher-port.mjs').SeoAssetRecord & { body: string }} record
   * @returns {import('../ports/seo-publisher-port.mjs').SeoAssetRecord}
   */
  function clone(record) {
    return {
      kind: record.kind,
      path: record.path,
      contentType: record.contentType,
      size: record.size,
      publishedAt: record.publishedAt,
    };
  }

  return {
    async publishSitemap(xml) {
      if (typeof xml !== 'string' || xml.length === 0) {
        throw new TypeError('publishSitemap: xml must be a non-empty string.');
      }
      const record = {
        kind: /** @type {const} */ ('sitemap'),
        path: sitemapPath,
        contentType: 'application/xml',
        size: Buffer.byteLength(xml),
        publishedAt: now(),
        body: xml,
      };
      assets.set(sitemapPath, record);
      return clone(record);
    },

    async publishRobots(text) {
      if (typeof text !== 'string' || text.length === 0) {
        throw new TypeError('publishRobots: text must be a non-empty string.');
      }
      const record = {
        kind: /** @type {const} */ ('robots'),
        path: robotsPath,
        contentType: 'text/plain',
        size: Buffer.byteLength(text),
        publishedAt: now(),
        body: text,
      };
      assets.set(robotsPath, record);
      return clone(record);
    },

    async publishMeta(pageId, html) {
      if (typeof pageId !== 'string' || pageId.length === 0) {
        throw new TypeError('publishMeta: pageId must be a non-empty string.');
      }
      if (typeof html !== 'string') {
        throw new TypeError('publishMeta: html must be a string.');
      }
      const path = `meta/${pageId}.html`;
      const record = {
        kind: /** @type {const} */ ('meta'),
        path,
        contentType: 'text/html',
        size: Buffer.byteLength(html),
        publishedAt: now(),
        body: html,
      };
      assets.set(path, record);
      return clone(record);
    },

    listAssets() {
      return [...assets.values()].map(clone);
    },

    clear() {
      assets.clear();
    },

    getSitemap() {
      return assets.get(sitemapPath)?.body ?? null;
    },

    getRobots() {
      return assets.get(robotsPath)?.body ?? null;
    },

    getMeta(pageId) {
      return assets.get(`meta/${pageId}.html`)?.body ?? null;
    },
  };
}
