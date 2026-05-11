/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Port contract for SEO publisher adapters (sitemap + robots + per-page meta HTML).
 * @sidecar seo-publisher-port.mjs.header.md
 * @layer port | @hex _none_ | @ctx seo
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Port contract for SEO publisher adapters. Adapters own where the
 * rendered sitemap XML, robots.txt body, and per-page meta HTML
 * snippets actually live — in-memory for tests, filesystem for a
 * static build, CDN for an edge deployment — without leaking those
 * concerns into the pure domain renderers.
 *
 * @typedef {object} SeoAssetRecord
 * @property {'sitemap'|'robots'|'meta'} kind
 * @property {string} path
 * @property {string} contentType
 * @property {number} size      Byte length of the serialized asset.
 * @property {number} publishedAt Epoch ms the asset was (re)published.
 *
 * @typedef {object} SeoPublisherPort
 * @property {(xml: string) => Promise<SeoAssetRecord>} publishSitemap
 * @property {(text: string) => Promise<SeoAssetRecord>} publishRobots
 * @property {(pageId: string, html: string) => Promise<SeoAssetRecord>} publishMeta
 * @property {() => void} clear
 */

const REQUIRED = [
  ['publishSitemap', 'seo.publisher.missing_publishSitemap'],
  ['publishRobots', 'seo.publisher.missing_publishRobots'],
  ['publishMeta', 'seo.publisher.missing_publishMeta'],
  ['clear', 'seo.publisher.missing_clear'],
];

/**
 * Validate that an adapter conforms to the SeoPublisherPort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertSeoPublisherPort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('seo.publisher.not_object'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  for (const [method, key] of REQUIRED) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t(key));
    }
  }
}
