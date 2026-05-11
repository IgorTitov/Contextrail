/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the tenancy module.
 * @sidecar messages.mjs.header.md
 * @layer messages | @hex _none_ | @ctx tenancy
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the tenancy module.
 * All user-facing copy from tenancy flows through this layer.
 */

const locales = {
  en: {
    'tenancy.invalid': 'tenant input must be a non-null object.',
    'tenancy.invalid_id':
      'tenant id must be a non-empty slug-like string matching /^[a-z0-9][a-z0-9-]{0,63}$/.',
    'tenancy.invalid_name': 'tenant name must be a string when provided.',
    'tenancy.invalid_metadata': 'tenant metadata must be a flat string map when provided.',

    'tenancy.store.not_object': 'Tenancy adapter must be a non-null object.',
    'tenancy.store.missing_createTenant': 'Tenancy adapter must implement createTenant(input).',
    'tenancy.store.missing_getTenant': 'Tenancy adapter must implement getTenant(id).',
    'tenancy.store.missing_listTenants': 'Tenancy adapter must implement listTenants().',
    'tenancy.store.missing_deleteTenant': 'Tenancy adapter must implement deleteTenant(id).',
    'tenancy.store.missing_clear': 'Tenancy adapter must implement clear().',
    'tenancy.store.duplicate': 'tenant "{id}" already exists.',

    'tenancy.context.missing_tenant':
      'requireTenant: tenant context is empty — no tenant has been bound.',

    'tenancy.resolver.invalid_headers':
      'resolveTenantFromHeaders: headers must be a non-null object.',
    'tenancy.resolver.invalid_host': 'resolveTenantFromSubdomain: host must be a non-empty string.',
    'tenancy.resolver.missing_root_domain':
      'resolveTenantFromSubdomain: options.rootDomain must be a non-empty string.',

    'tenancy.als.outside_run': 'requireTenant: no tenant is currently bound to the ALS scope.',
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
