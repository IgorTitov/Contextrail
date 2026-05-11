/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure robots.txt descriptor + renderer with rule ordering and sitemap footer.
 * @sidecar robots.mjs.header.md
 * @layer domain | @hex _none_ | @ctx seo
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Pure robots.txt value object + renderer. Models the Robots Exclusion
 * Standard: one or more rule blocks (each with a `userAgent`, zero or
 * more `allow` paths, zero or more `disallow` paths), plus an optional
 * list of absolute sitemap URLs appended as a trailing footer.
 *
 * @typedef {object} RobotsRule
 * @property {string} userAgent
 * @property {string[]} [allow]
 * @property {string[]} [disallow]
 *
 * @typedef {object} RobotsTxt
 * @property {RobotsRule[]} rules
 * @property {string[]} sitemaps
 */

/**
 * Validate and construct a frozen {@link RobotsTxt}.
 *
 * @param {{ rules: RobotsRule[], sitemaps?: string[] }} input
 * @returns {Readonly<RobotsTxt>}
 */
export function createRobotsTxt(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError(t('seo.robots.invalid'));
  }
  if (!Array.isArray(input.rules)) {
    throw new TypeError(t('seo.robots.invalid_rules'));
  }
  const rules = input.rules.map((raw) => validateRule(raw));

  /** @type {string[]} */
  let sitemaps = [];
  if (input.sitemaps != null) {
    if (
      !Array.isArray(input.sitemaps) ||
      input.sitemaps.some((s) => typeof s !== 'string' || !/^https?:\/\//.test(s))
    ) {
      throw new TypeError(t('seo.robots.invalid_sitemap'));
    }
    sitemaps = [...input.sitemaps];
  }

  return Object.freeze({
    rules: Object.freeze(
      rules.map((r) =>
        Object.freeze({
          userAgent: r.userAgent,
          allow: Object.freeze([...(r.allow ?? [])]),
          disallow: Object.freeze([...(r.disallow ?? [])]),
        }),
      ),
    ),
    sitemaps: Object.freeze(sitemaps),
  });
}

/**
 * @param {unknown} raw
 * @returns {RobotsRule}
 */
function validateRule(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new TypeError(t('seo.robots.invalid_rule_entry'));
  }
  const entry = /** @type {Record<string, unknown>} */ (raw);
  if (typeof entry.userAgent !== 'string' || entry.userAgent.length === 0) {
    throw new TypeError(t('seo.robots.invalid_rule_entry'));
  }
  if (entry.allow != null) {
    if (!Array.isArray(entry.allow) || entry.allow.some((p) => typeof p !== 'string')) {
      throw new TypeError(t('seo.robots.invalid_rule_entry'));
    }
  }
  if (entry.disallow != null) {
    if (!Array.isArray(entry.disallow) || entry.disallow.some((p) => typeof p !== 'string')) {
      throw new TypeError(t('seo.robots.invalid_rule_entry'));
    }
  }
  /** @type {RobotsRule} */
  const rule = { userAgent: entry.userAgent };
  if (entry.allow) rule.allow = /** @type {string[]} */ (entry.allow);
  if (entry.disallow) rule.disallow = /** @type {string[]} */ (entry.disallow);
  return rule;
}

/**
 * Render a {@link RobotsTxt} to the plain-text robots.txt body. Each
 * rule block emits `User-agent:` followed by its `Allow:` / `Disallow:`
 * lines in input order; sitemap URLs are appended as a trailing
 * `Sitemap:` footer block.
 *
 * @param {RobotsTxt} robots
 * @returns {string}
 */
export function renderRobotsTxt(robots) {
  /** @type {string[]} */
  const lines = [];
  for (let i = 0; i < robots.rules.length; i++) {
    const rule = robots.rules[i];
    if (i > 0) lines.push('');
    lines.push(`User-agent: ${rule.userAgent}`);
    for (const path of rule.allow ?? []) lines.push(`Allow: ${path}`);
    for (const path of rule.disallow ?? []) lines.push(`Disallow: ${path}`);
  }
  if (robots.sitemaps.length > 0) {
    if (lines.length > 0) lines.push('');
    for (const sitemap of robots.sitemaps) lines.push(`Sitemap: ${sitemap}`);
  }
  return lines.join('\n') + '\n';
}
