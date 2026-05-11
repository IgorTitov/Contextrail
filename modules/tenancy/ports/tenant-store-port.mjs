/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Port contract for tenant-store adapters (CRUD for Tenant records).
 * @sidecar tenant-store-port.mjs.header.md
 * @layer port | @hex _none_ | @ctx tenancy
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Port contract for tenant-store adapters. Adapters own persistence of
 * {@link Tenant} records — in-memory for tests and dev, SQL/KV/HTTP for
 * real deployments. The domain validates tenant shape; the adapter stamps
 * persistence-specific details (timestamps, row ids, etc.) if any.
 *
 * This port is deliberately narrow — five methods covering the CRUD
 * lifecycle most starters need. Richer adapters may expose more internal
 * APIs, but cross-module callers must go through this contract.
 *
 * @typedef {import('../domain/tenant.mjs').Tenant} Tenant
 *
 * @typedef {object} TenantInput
 * @property {string} id
 * @property {string} [name]
 * @property {Record<string, string>} [metadata]
 *
 * @typedef {object} TenantStorePort
 * @property {(input: TenantInput) => Promise<Tenant>} createTenant   Create a tenant (rejects duplicate ids).
 * @property {(id: string) => Promise<Tenant | null>} getTenant       Fetch a tenant by id, or null.
 * @property {() => Tenant[]} listTenants                             Snapshot of known tenants for tests and dev.
 * @property {(id: string) => Promise<boolean>} deleteTenant          Remove a tenant; returns whether a row was deleted.
 * @property {() => void} clear                                        Drop all tenants.
 */

const REQUIRED = [
  ['createTenant', 'tenancy.store.missing_createTenant'],
  ['getTenant', 'tenancy.store.missing_getTenant'],
  ['listTenants', 'tenancy.store.missing_listTenants'],
  ['deleteTenant', 'tenancy.store.missing_deleteTenant'],
  ['clear', 'tenancy.store.missing_clear'],
];

/**
 * Validate that an adapter conforms to the TenantStorePort contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assertTenantStorePort(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError(t('tenancy.store.not_object'));
  }
  const a = /** @type {Record<string, unknown>} */ (adapter);
  for (const [method, key] of REQUIRED) {
    if (typeof a[method] !== 'function') {
      throw new TypeError(t(key));
    }
  }
}
