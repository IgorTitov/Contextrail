/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure tenant resolution helpers — extract tenant id from HTTP headers or subdomain.
 * @sidecar tenant-resolver.mjs.header.md
 * @layer domain | @hex _none_ | @ctx tenancy
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Pure resolvers for pulling a tenant id out of an incoming HTTP request.
 * Two strategies are supported out of the box:
 *
 *  - **Header** — `x-tenant-id: acme` (key configurable via options).
 *  - **Subdomain** — `acme.example.com` → `acme` given a known root domain.
 *
 * Both return `null` on "no tenant found" so callers can decide whether
 * that is an error or a default fall-through. TypeError is only thrown on
 * malformed input (non-object headers, non-string host, missing root
 * domain configuration).
 *
 * Resolvers do not validate the id against any store — that is the job
 * of the downstream `getTenant` call. They only parse.
 *
 * @typedef {object} HeaderResolverOptions
 * @property {string} [headerName]  Header to read (defaults to 'x-tenant-id'). Case-insensitive.
 *
 * @typedef {object} SubdomainResolverOptions
 * @property {string} rootDomain          Root domain to strip (e.g. 'example.com').
 * @property {string[]} [ignore]          Subdomains to treat as "no tenant" (defaults to ['www']).
 */

const DEFAULT_HEADER = 'x-tenant-id';
const DEFAULT_IGNORE = ['www'];

/**
 * Extract a tenant id from a request headers object. Headers are expected
 * to be lowercased by the HTTP stack (Node's `req.headers` already lowers
 * them); we also accept the configured key as-is and fall back to the
 * lowercase form for safety.
 *
 * @param {Record<string, string | string[] | undefined>} headers
 * @param {HeaderResolverOptions} [options]
 * @returns {string | null}
 */
export function resolveTenantFromHeaders(headers, options = {}) {
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
    throw new TypeError(t('tenancy.resolver.invalid_headers'));
  }
  const key = (options.headerName ?? DEFAULT_HEADER).toLowerCase();
  const raw = headers[key] ?? headers[options.headerName ?? DEFAULT_HEADER];
  if (raw == null) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Extract a tenant id from the subdomain portion of an HTTP host header.
 * Given `host = 'acme.example.com'` and `options.rootDomain = 'example.com'`,
 * returns `'acme'`. Returns `null` when:
 *
 *  - the host equals the root domain exactly (no subdomain)
 *  - the subdomain appears in `options.ignore` (defaults to `['www']`)
 *  - the host does not end with `.<rootDomain>`
 *
 * Throws TypeError on malformed input or missing root domain config.
 *
 * @param {string} host
 * @param {SubdomainResolverOptions} options
 * @returns {string | null}
 */
export function resolveTenantFromSubdomain(host, options) {
  if (typeof host !== 'string' || host.length === 0) {
    throw new TypeError(t('tenancy.resolver.invalid_host'));
  }
  if (!options || typeof options.rootDomain !== 'string' || options.rootDomain.length === 0) {
    throw new TypeError(t('tenancy.resolver.missing_root_domain'));
  }
  // Strip any :port suffix before matching.
  const bareHost = host.split(':')[0].toLowerCase();
  const rootDomain = options.rootDomain.toLowerCase();
  if (bareHost === rootDomain) return null;
  const suffix = `.${rootDomain}`;
  if (!bareHost.endsWith(suffix)) return null;
  const subdomain = bareHost.slice(0, -suffix.length);
  if (subdomain.length === 0) return null;
  // Multi-level subdomains (api.acme.example.com) — take the left-most label.
  const firstLabel = subdomain.split('.')[0];
  const ignore = options.ignore ?? DEFAULT_IGNORE;
  if (ignore.includes(firstLabel)) return null;
  return firstLabel;
}
