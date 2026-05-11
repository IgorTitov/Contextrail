/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the prerender module.
 * @sidecar messages.mjs.header.md
 * @layer messages | @hex _none_ | @ctx prerender
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the prerender module.
 * All user-facing copy from prerender flows through this layer.
 */

const locales = {
  en: {
    'prerender.manifest.invalid': 'prerender route manifest input must be a non-null object.',
    'prerender.manifest.routes_not_array': 'prerender route manifest "routes" must be an array.',
    'prerender.manifest.route_not_object':
      'prerender route at index {index} must be a non-null object.',
    'prerender.manifest.route_path_invalid':
      'prerender route at index {index} must have a string "path" starting with "/".',
    'prerender.manifest.route_title_invalid':
      'prerender route "{path}" title must be a string when provided.',
    'prerender.manifest.route_meta_invalid':
      'prerender route "{path}" meta must be a non-null object when provided.',
    'prerender.manifest.duplicate_path': 'prerender route manifest has a duplicate path "{path}".',

    'prerender.result.invalid': 'prerender render result input must be a non-null object.',
    'prerender.result.path_invalid':
      'prerender render result "path" must be a string starting with "/".',
    'prerender.result.html_invalid': 'prerender render result "html" must be a string.',
    'prerender.result.status_invalid':
      'prerender render result "status" must be an integer between 100 and 599 when provided.',
    'prerender.result.headers_invalid':
      'prerender render result "headers" must be a non-null object when provided.',

    'prerender.plan.invalid': 'prerender plan input must be a non-null object.',
    'prerender.plan.manifest_invalid':
      'prerender plan "manifest" must be a frozen route manifest from createRouteManifest.',
    'prerender.plan.base_url_invalid':
      'prerender plan "baseUrl" must be an absolute http(s) URL without a path component.',

    'prerender.render_fn.not_function':
      'prerender render function must be a function with signature (path, context) => Promise<{ html, status?, headers? }>.',

    'prerender.output.not_object': 'prerender static output adapter must be a non-null object.',
    'prerender.output.missing_write':
      'prerender static output adapter must implement write(path, html).',
    'prerender.output.missing_list': 'prerender static output adapter must implement list().',
    'prerender.output.missing_clear': 'prerender static output adapter must implement clear().',
    'prerender.output.write_path_invalid':
      'prerender static output write: path must be a string starting with "/".',
    'prerender.output.write_html_invalid': 'prerender static output write: html must be a string.',

    'prerender.runner.missing_render_fn': 'prerender runner requires a renderFn function.',
    'prerender.runner.missing_output': 'prerender runner requires a StaticOutputPort instance.',
    'prerender.runner.invalid_plan': 'prerender runner run(plan) expects a frozen prerender plan.',
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
