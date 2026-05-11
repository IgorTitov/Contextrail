/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single cross-module entry point for the seo module.
 * @sidecar public-api.mjs.header.md
 * @layer public-api | @hex _none_ | @ctx seo
 * @public true
 * @edit careful
 */

// Domain
export { createMetaTags, renderMetaTagsHtml, escapeAttribute } from './domain/meta-tags.mjs';
export { createSitemap, renderSitemapXml, escapeXml } from './domain/sitemap.mjs';
export { createRobotsTxt, renderRobotsTxt } from './domain/robots.mjs';

// Ports
export { assertSeoPublisherPort } from './ports/seo-publisher-port.mjs';

// Adapters
export { createMemorySeoPublisher } from './adapters/memory-seo-publisher.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
