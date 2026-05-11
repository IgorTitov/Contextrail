/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure tenant value object — validated slug-like id + optional name and metadata.
 * @sidecar tenant.mjs.header.md
 * @layer domain | @hex _none_ | @ctx tenancy
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Pure tenant value object. Tenants are the isolation unit that other
 * modules (auth, billing, payments, search, …) scope their data and
 * behavior to in a multi-tenant deployment. The id is the stable external
 * handle (slug-like, safe for URLs, subdomains, and database keys). Name
 * and metadata are optional decoration.
 *
 * No I/O, no framework imports. All errors carry i18n keys.
 *
 * @typedef {object} Tenant
 * @property {string} id                        Slug-like external id (1-64 chars, [a-z0-9-]).
 * @property {string} [name]                    Optional display name.
 * @property {Record<string, string>} metadata  Flat string map (empty object when omitted).
 */

const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

/**
 * Validate and construct a {@link Tenant} value object.
 *
 * @param {{ id: string, name?: string, metadata?: Record<string, string> }} input
 * @returns {Tenant}
 */
export function createTenant(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError(t('tenancy.invalid'));
  }
  const { id, name, metadata } = input;
  if (typeof id !== 'string' || !ID_RE.test(id)) {
    throw new TypeError(t('tenancy.invalid_id'));
  }
  if (name != null && typeof name !== 'string') {
    throw new TypeError(t('tenancy.invalid_name'));
  }
  /** @type {Record<string, string>} */
  const meta = {};
  if (metadata != null) {
    if (typeof metadata !== 'object' || Array.isArray(metadata)) {
      throw new TypeError(t('tenancy.invalid_metadata'));
    }
    for (const [k, v] of Object.entries(metadata)) {
      if (typeof v !== 'string') {
        throw new TypeError(t('tenancy.invalid_metadata'));
      }
      meta[k] = v;
    }
  }
  /** @type {Tenant} */
  const tenant = { id, metadata: meta };
  if (name) tenant.name = name;
  return tenant;
}
