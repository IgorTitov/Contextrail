/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure W3C Web App Manifest value object with validation and icon normalization.
 * @sidecar web-manifest.mjs.header.md
 * @layer domain | @hex _none_ | @ctx pwa
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Pure Web App Manifest value object. Conforms to the W3C Web App Manifest
 * spec shape that browsers read from `<link rel="manifest">`. Pure — no
 * file I/O, no browser globals, all errors carry i18n keys.
 *
 * @typedef {object} WebManifestIcon
 * @property {string} src     Icon URL.
 * @property {string} sizes   Sizes string like "192x192".
 * @property {string} [type]  MIME type like "image/png".
 * @property {string} [purpose] Icon purpose ("any", "maskable", "monochrome").
 *
 * @typedef {object} WebManifest
 * @property {string} name
 * @property {string} shortName
 * @property {string} startUrl
 * @property {'fullscreen'|'standalone'|'minimal-ui'|'browser'} display
 * @property {string} [themeColor]
 * @property {string} [backgroundColor]
 * @property {WebManifestIcon[]} icons
 */

const DISPLAY_MODES = new Set(['fullscreen', 'standalone', 'minimal-ui', 'browser']);

/**
 * Validate and construct a frozen {@link WebManifest}.
 *
 * @param {{
 *   name: string,
 *   shortName: string,
 *   startUrl: string,
 *   display: 'fullscreen'|'standalone'|'minimal-ui'|'browser',
 *   themeColor?: string,
 *   backgroundColor?: string,
 *   icons?: WebManifestIcon[]
 * }} input
 * @returns {Readonly<WebManifest>}
 */
export function createWebManifest(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError(t('pwa.manifest.invalid'));
  }
  const { name, shortName, startUrl, display, themeColor, backgroundColor, icons } = input;

  if (typeof name !== 'string' || name.length === 0) {
    throw new TypeError(t('pwa.manifest.invalid_name'));
  }
  if (typeof shortName !== 'string' || shortName.length === 0) {
    throw new TypeError(t('pwa.manifest.invalid_short_name'));
  }
  if (typeof startUrl !== 'string' || startUrl.length === 0) {
    throw new TypeError(t('pwa.manifest.invalid_start_url'));
  }
  if (typeof display !== 'string' || !DISPLAY_MODES.has(display)) {
    throw new TypeError(t('pwa.manifest.invalid_display'));
  }
  if (themeColor != null && (typeof themeColor !== 'string' || themeColor.length === 0)) {
    throw new TypeError(t('pwa.manifest.invalid_color', { field: 'themeColor' }));
  }
  if (
    backgroundColor != null &&
    (typeof backgroundColor !== 'string' || backgroundColor.length === 0)
  ) {
    throw new TypeError(t('pwa.manifest.invalid_color', { field: 'backgroundColor' }));
  }

  const normalizedIcons = normalizeIcons(icons);

  /** @type {WebManifest} */
  const manifest = {
    name,
    shortName,
    startUrl,
    display,
    icons: normalizedIcons,
  };
  if (themeColor) manifest.themeColor = themeColor;
  if (backgroundColor) manifest.backgroundColor = backgroundColor;

  return Object.freeze({
    ...manifest,
    icons: Object.freeze(normalizedIcons.map((icon) => Object.freeze({ ...icon }))),
  });
}

/**
 * Normalize the icons array — validates each entry and freezes the shape.
 *
 * @param {unknown} icons
 * @returns {WebManifestIcon[]}
 */
function normalizeIcons(icons) {
  if (icons == null) return [];
  if (!Array.isArray(icons)) {
    throw new TypeError(t('pwa.manifest.invalid_icons'));
  }
  return icons.map((raw) => {
    if (!raw || typeof raw !== 'object') {
      throw new TypeError(t('pwa.manifest.invalid_icon_entry'));
    }
    const entry = /** @type {Record<string, unknown>} */ (raw);
    const src = entry.src;
    const sizes = entry.sizes;
    if (typeof src !== 'string' || src.length === 0) {
      throw new TypeError(t('pwa.manifest.invalid_icon_entry'));
    }
    if (typeof sizes !== 'string' || sizes.length === 0) {
      throw new TypeError(t('pwa.manifest.invalid_icon_entry'));
    }
    /** @type {WebManifestIcon} */
    const icon = { src, sizes };
    if (typeof entry.type === 'string' && entry.type.length > 0) {
      icon.type = entry.type;
    }
    if (typeof entry.purpose === 'string' && entry.purpose.length > 0) {
      icon.purpose = entry.purpose;
    }
    return icon;
  });
}

/**
 * Serialize a WebManifest to the W3C JSON shape browsers expect (snake_case
 * field names for `short_name`, `start_url`, `theme_color`, etc.).
 *
 * @param {WebManifest} manifest
 * @returns {Record<string, unknown>}
 */
export function webManifestToJson(manifest) {
  /** @type {Record<string, unknown>} */
  const json = {
    name: manifest.name,
    short_name: manifest.shortName,
    start_url: manifest.startUrl,
    display: manifest.display,
    icons: manifest.icons.map((icon) => {
      /** @type {Record<string, string>} */
      const out = { src: icon.src, sizes: icon.sizes };
      if (icon.type) out.type = icon.type;
      if (icon.purpose) out.purpose = icon.purpose;
      return out;
    }),
  };
  if (manifest.themeColor) json.theme_color = manifest.themeColor;
  if (manifest.backgroundColor) json.background_color = manifest.backgroundColor;
  return json;
}
