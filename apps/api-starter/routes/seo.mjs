/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose SEO demo routes — serve sitemap.xml, robots.txt, and rendered meta tag HTML from the seo module.
 * @sidecar seo.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-001
/**
 * SEO demo routes — exercise the seo module's public API from a host
 * server. The sitemap and robots.txt are rendered on first request and
 * cached in the in-memory publisher. Real deployments swap the adapter
 * for a filesystem, S3, or CDN publisher behind the same
 * `SeoPublisherPort` without touching these routes.
 *
 * GET /sitemap.xml          → the site map XML
 * GET /robots.txt           → the robots.txt body
 * GET /api/seo/meta?page=id → JSON { html } with rendered meta tags
 */

import {
  createMetaTags,
  createSitemap,
  createRobotsTxt,
  renderMetaTagsHtml,
  renderSitemapXml,
  renderRobotsTxt,
} from '../../../modules/seo/public-api.mjs';
import { RAW_RESPONSE } from '../app.mjs';

const DEMO_SITEMAP_XML = renderSitemapXml(
  createSitemap({
    urls: [
      {
        loc: 'https://example.com/',
        lastmod: '2026-04-09',
        changefreq: 'daily',
        priority: 1.0,
      },
      {
        loc: 'https://example.com/health',
        changefreq: 'hourly',
        priority: 0.5,
      },
    ],
  }),
);

const DEMO_ROBOTS_TXT = renderRobotsTxt(
  createRobotsTxt({
    rules: [
      { userAgent: '*', disallow: ['/admin/'] },
      { userAgent: 'Googlebot', allow: ['/public/'] },
    ],
    sitemaps: ['https://example.com/sitemap.xml'],
  }),
);

/** @type {Record<string, import('../../../modules/seo/domain/meta-tags.mjs').MetaTagDescriptor>} */
const META_PAGES = {
  home: createMetaTags({
    title: 'Contextrail API Starter — Home',
    description: 'Hexagonal starter demonstrating 35 modules with zero dependencies.',
    canonical: 'https://example.com/',
    robots: 'index,follow',
    openGraph: {
      title: 'Contextrail API Starter',
      description: 'Hexagonal starter for AI-assisted teams.',
      type: 'website',
      url: 'https://example.com/',
    },
    twitter: { card: 'summary_large_image', site: '@contextrail' },
  }),
  health: createMetaTags({
    title: 'Health — Contextrail API Starter',
    description: 'Liveness probe for the api-starter server.',
    canonical: 'https://example.com/health',
    robots: 'noindex',
  }),
};

/**
 * @param {{ query: URLSearchParams }} _req
 * @param {object} ctx
 */
export async function seoSitemapHandler(_req, ctx) {
  if (!ctx.seoPublisher.getSitemap()) {
    await ctx.seoPublisher.publishSitemap(DEMO_SITEMAP_XML);
  }
  return {
    [RAW_RESPONSE]: true,
    contentType: 'application/xml',
    body: ctx.seoPublisher.getSitemap(),
  };
}

/**
 * @param {{ query: URLSearchParams }} _req
 * @param {object} ctx
 */
export async function seoRobotsHandler(_req, ctx) {
  if (!ctx.seoPublisher.getRobots()) {
    await ctx.seoPublisher.publishRobots(DEMO_ROBOTS_TXT);
  }
  return {
    [RAW_RESPONSE]: true,
    contentType: 'text/plain',
    body: ctx.seoPublisher.getRobots(),
  };
}

/**
 * @param {{ query: URLSearchParams }} req
 * @param {object} ctx
 */
export async function seoMetaHandler(req, ctx) {
  const page = req.query.get('page') || 'home';
  const descriptor = META_PAGES[page];
  if (!descriptor) {
    throw new TypeError(`unknown page id: ${page}`);
  }
  const html = renderMetaTagsHtml(descriptor);
  await ctx.seoPublisher.publishMeta(page, html);
  return { page, html };
}
