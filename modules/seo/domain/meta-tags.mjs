/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure SEO meta-tag descriptor + safe HTML renderer with attribute escaping.
 * @sidecar meta-tags.mjs.header.md
 * @layer domain | @hex _none_ | @ctx seo
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Pure meta-tag descriptor + safe HTML renderer. Describes the head
 * content a page should emit — title, description, canonical URL, Open
 * Graph block, Twitter card block, robots hint. The renderer escapes
 * every attribute value to eliminate injection risk, so callers can
 * feed user-controlled titles and descriptions without sanitizing them
 * first.
 *
 * @typedef {object} OpenGraphTags
 * @property {string} [title]
 * @property {string} [description]
 * @property {string} [image]
 * @property {string} [url]
 * @property {string} [type]
 *
 * @typedef {object} TwitterTags
 * @property {string} [card]
 * @property {string} [site]
 * @property {string} [creator]
 *
 * @typedef {object} MetaTagDescriptor
 * @property {string} title
 * @property {string} [description]
 * @property {string} [canonical]
 * @property {string} [robots]
 * @property {OpenGraphTags} [openGraph]
 * @property {TwitterTags} [twitter]
 */

/**
 * Validate and construct a frozen {@link MetaTagDescriptor}.
 *
 * @param {{
 *   title: string,
 *   description?: string,
 *   canonical?: string,
 *   robots?: string,
 *   openGraph?: OpenGraphTags,
 *   twitter?: TwitterTags
 * }} input
 * @returns {Readonly<MetaTagDescriptor>}
 */
export function createMetaTags(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError(t('seo.meta.invalid'));
  }
  const { title, description, canonical, robots, openGraph, twitter } = input;
  if (typeof title !== 'string' || title.length === 0) {
    throw new TypeError(t('seo.meta.invalid_title'));
  }
  if (description != null && typeof description !== 'string') {
    throw new TypeError(t('seo.meta.invalid_description'));
  }
  if (canonical != null && (typeof canonical !== 'string' || canonical.length === 0)) {
    throw new TypeError(t('seo.meta.invalid_canonical'));
  }
  if (robots != null && typeof robots !== 'string') {
    throw new TypeError(t('seo.meta.invalid_robots'));
  }
  if (openGraph != null && (typeof openGraph !== 'object' || Array.isArray(openGraph))) {
    throw new TypeError(t('seo.meta.invalid_open_graph'));
  }
  if (twitter != null && (typeof twitter !== 'object' || Array.isArray(twitter))) {
    throw new TypeError(t('seo.meta.invalid_twitter'));
  }

  /** @type {MetaTagDescriptor} */
  const descriptor = { title };
  if (description != null) descriptor.description = description;
  if (canonical) descriptor.canonical = canonical;
  if (robots != null) descriptor.robots = robots;
  if (openGraph) descriptor.openGraph = Object.freeze({ ...openGraph });
  if (twitter) descriptor.twitter = Object.freeze({ ...twitter });
  return Object.freeze(descriptor);
}

/**
 * Escape a string for safe placement inside an HTML attribute value.
 *
 * @param {string} value
 * @returns {string}
 */
export function escapeAttribute(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Render a MetaTagDescriptor to an HTML string of head elements.
 *
 * @param {MetaTagDescriptor} descriptor
 * @returns {string}
 */
export function renderMetaTagsHtml(descriptor) {
  /** @type {string[]} */
  const lines = [];
  lines.push(`<title>${escapeAttribute(descriptor.title)}</title>`);
  if (descriptor.description != null) {
    lines.push(`<meta name="description" content="${escapeAttribute(descriptor.description)}">`);
  }
  if (descriptor.canonical) {
    lines.push(`<link rel="canonical" href="${escapeAttribute(descriptor.canonical)}">`);
  }
  if (descriptor.robots != null) {
    lines.push(`<meta name="robots" content="${escapeAttribute(descriptor.robots)}">`);
  }
  if (descriptor.openGraph) {
    for (const [key, value] of Object.entries(descriptor.openGraph)) {
      if (value == null) continue;
      lines.push(`<meta property="og:${key}" content="${escapeAttribute(String(value))}">`);
    }
  }
  if (descriptor.twitter) {
    for (const [key, value] of Object.entries(descriptor.twitter)) {
      if (value == null) continue;
      lines.push(`<meta name="twitter:${key}" content="${escapeAttribute(String(value))}">`);
    }
  }
  return lines.join('\n');
}
