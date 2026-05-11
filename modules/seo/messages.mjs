/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the seo module.
 * @sidecar messages.mjs.header.md
 * @layer messages | @hex _none_ | @ctx seo
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the seo module.
 * All user-facing copy from seo flows through this layer.
 */

const locales = {
  en: {
    'seo.meta.invalid': 'meta tag input must be a non-null object.',
    'seo.meta.invalid_title': 'meta tag "title" must be a non-empty string.',
    'seo.meta.invalid_description': 'meta tag "description" must be a string when provided.',
    'seo.meta.invalid_canonical': 'meta tag "canonical" must be a non-empty string when provided.',
    'seo.meta.invalid_robots': 'meta tag "robots" must be a string when provided.',
    'seo.meta.invalid_open_graph': 'meta tag "openGraph" must be a plain object when provided.',
    'seo.meta.invalid_twitter': 'meta tag "twitter" must be a plain object when provided.',

    'seo.sitemap.invalid': 'sitemap input must be a non-null object with a "urls" array.',
    'seo.sitemap.invalid_url_entry':
      'sitemap url entry must have an absolute "loc" starting with http:// or https://.',
    'seo.sitemap.invalid_lastmod':
      'sitemap "lastmod" must be an ISO 8601 date string when provided.',
    'seo.sitemap.invalid_changefreq':
      'sitemap "changefreq" must be one of: always, hourly, daily, weekly, monthly, yearly, never.',
    'seo.sitemap.invalid_priority':
      'sitemap "priority" must be a number between 0.0 and 1.0 when provided.',

    'seo.robots.invalid': 'robots.txt input must be a non-null object.',
    'seo.robots.invalid_rules': 'robots.txt "rules" must be an array.',
    'seo.robots.invalid_rule_entry':
      'robots.txt rule must have a non-empty "userAgent" string and optional allow/disallow arrays of strings.',
    'seo.robots.invalid_sitemap':
      'robots.txt "sitemaps" must be an array of absolute URL strings when provided.',

    'seo.publisher.not_object': 'SEO publisher adapter must be a non-null object.',
    'seo.publisher.missing_publishSitemap':
      'SEO publisher adapter must implement publishSitemap(xml).',
    'seo.publisher.missing_publishRobots':
      'SEO publisher adapter must implement publishRobots(text).',
    'seo.publisher.missing_publishMeta':
      'SEO publisher adapter must implement publishMeta(pageId, html).',
    'seo.publisher.missing_clear': 'SEO publisher adapter must implement clear().',
  },
};

let currentLocale = 'en';

/** @param {string} locale */
export function setLocale(locale) {
  if (!locales[locale]) {
    throw new Error(`Unknown locale: ${locale}`);
  }
  currentLocale = locale;
}

/** @returns {string} */
export function getLocale() {
  return currentLocale;
}

/**
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function t(key, params = {}) {
  const template = locales[currentLocale]?.[key];
  if (template == null) return key;
  return Object.entries(params).reduce(
    (str, [k, v]) => str.replaceAll(`{${k}}`, String(v)),
    template,
  );
}

/**
 * @param {string} locale
 * @param {Record<string, string>} messages
 */
export function registerLocale(locale, messages) {
  locales[locale] = { ...(locales[locale] || {}), ...messages };
}

export function resetLocale() {
  currentLocale = 'en';
}
