/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure sitemap.xml descriptor + renderer per sitemaps.org protocol with XML entity escaping.
 * @sidecar sitemap.mjs.header.md
 * @layer domain | @hex _none_ | @ctx seo
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Pure sitemap value object + renderer. Produces an XML document that
 * conforms to the sitemaps.org protocol with XML entity escaping on
 * every `<loc>` so user-controlled URLs cannot break the output.
 *
 * @typedef {'always'|'hourly'|'daily'|'weekly'|'monthly'|'yearly'|'never'} ChangeFreq
 *
 * @typedef {object} SitemapUrl
 * @property {string} loc                       Absolute URL (http:// or https://).
 * @property {string} [lastmod]                  ISO 8601 date string.
 * @property {ChangeFreq} [changefreq]
 * @property {number} [priority]                 Between 0.0 and 1.0 inclusive.
 *
 * @typedef {object} Sitemap
 * @property {SitemapUrl[]} urls
 */

const CHANGE_FREQS = new Set(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * Validate and construct a frozen {@link Sitemap}.
 *
 * @param {{ urls: SitemapUrl[] }} input
 * @returns {Readonly<Sitemap>}
 */
export function createSitemap(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.urls)) {
    throw new TypeError(t('seo.sitemap.invalid'));
  }
  const urls = input.urls.map((raw) => validateUrl(raw));
  return Object.freeze({ urls: Object.freeze(urls.map((u) => Object.freeze({ ...u }))) });
}

/**
 * @param {unknown} raw
 * @returns {SitemapUrl}
 */
function validateUrl(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new TypeError(t('seo.sitemap.invalid_url_entry'));
  }
  const entry = /** @type {Record<string, unknown>} */ (raw);
  const loc = entry.loc;
  if (typeof loc !== 'string' || !/^https?:\/\//.test(loc)) {
    throw new TypeError(t('seo.sitemap.invalid_url_entry'));
  }
  /** @type {SitemapUrl} */
  const url = { loc };
  if (entry.lastmod != null) {
    if (typeof entry.lastmod !== 'string' || !ISO_DATE_RE.test(entry.lastmod)) {
      throw new TypeError(t('seo.sitemap.invalid_lastmod'));
    }
    url.lastmod = entry.lastmod;
  }
  if (entry.changefreq != null) {
    if (typeof entry.changefreq !== 'string' || !CHANGE_FREQS.has(entry.changefreq)) {
      throw new TypeError(t('seo.sitemap.invalid_changefreq'));
    }
    url.changefreq = /** @type {ChangeFreq} */ (entry.changefreq);
  }
  if (entry.priority != null) {
    if (typeof entry.priority !== 'number' || entry.priority < 0 || entry.priority > 1) {
      throw new TypeError(t('seo.sitemap.invalid_priority'));
    }
    url.priority = entry.priority;
  }
  return url;
}

/**
 * Escape a string for safe placement inside an XML text node.
 *
 * @param {string} value
 * @returns {string}
 */
export function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/**
 * Render a {@link Sitemap} to an XML string per the sitemaps.org protocol.
 *
 * @param {Sitemap} sitemap
 * @returns {string}
 */
export function renderSitemapXml(sitemap) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];
  for (const url of sitemap.urls) {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXml(url.loc)}</loc>`);
    if (url.lastmod) lines.push(`    <lastmod>${escapeXml(url.lastmod)}</lastmod>`);
    if (url.changefreq) lines.push(`    <changefreq>${url.changefreq}</changefreq>`);
    if (url.priority != null) lines.push(`    <priority>${url.priority.toFixed(1)}</priority>`);
    lines.push('  </url>');
  }
  lines.push('</urlset>');
  return lines.join('\n');
}
