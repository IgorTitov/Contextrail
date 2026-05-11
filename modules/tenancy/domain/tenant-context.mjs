/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure tenant context — immutable { tenant } shape with require/with helpers.
 * @sidecar tenant-context.mjs.header.md
 * @layer domain | @hex _none_ | @ctx tenancy
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Pure tenant context. A plain `{ tenant }` shape other modules can thread
 * through their call sites to stay tenant-aware without touching global
 * state. `AsyncLocalStorage`-backed variants live in `adapters/` so the
 * domain stays free of `node:async_hooks`.
 *
 * @typedef {import('./tenant.mjs').Tenant} Tenant
 * @typedef {object} TenantContext
 * @property {Tenant | null} tenant   Currently bound tenant, or null.
 */

/**
 * Create a new tenant context. `tenant` may be null when nothing is bound
 * yet — `withTenant` returns a fresh context with the tenant attached.
 *
 * @param {Tenant | null} [tenant]
 * @returns {TenantContext}
 */
export function createTenantContext(tenant = null) {
  return { tenant: tenant ?? null };
}

/**
 * Return the bound tenant or throw if the context is empty.
 *
 * @param {TenantContext} ctx
 * @returns {Tenant}
 */
export function requireTenant(ctx) {
  if (!ctx || typeof ctx !== 'object' || !ctx.tenant) {
    throw new TypeError(t('tenancy.context.missing_tenant'));
  }
  return ctx.tenant;
}

/**
 * Return a new context with the given tenant bound. The original context
 * is not mutated, so callers can stack scopes safely.
 *
 * @param {TenantContext} ctx
 * @param {Tenant} tenant
 * @returns {TenantContext}
 */
export function withTenant(ctx, tenant) {
  if (!ctx || typeof ctx !== 'object') {
    return { tenant };
  }
  return { ...ctx, tenant };
}
