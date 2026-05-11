/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose In-memory TenantStorePort adapter — Map-backed CRUD for tests and dev.
 * @sidecar memory-tenant-store.mjs.header.md
 * @layer adapter | @hex _none_ | @ctx tenancy
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';
import { createTenant } from '../domain/tenant.mjs';

/**
 * In-memory TenantStorePort adapter. Backs a deterministic fake store for
 * tests, local development, and the api-starter demo. Validates every
 * input through the pure domain `createTenant` and returns defensive
 * copies so callers cannot mutate internal state.
 *
 * @param {object} [options]
 * @param {() => number} [options.now]  Clock function (defaults to Date.now). Reserved for future createdAt stamping.
 * @returns {import('../ports/tenant-store-port.mjs').TenantStorePort}
 */
export function createMemoryTenantStore(options = {}) {
  // Clock is kept for API parity with other memory adapters and future
  // createdAt stamping; currently unused because Tenant is a pure value.
  const _clock = options.now ?? Date.now;
  void _clock;

  /** @type {Map<string, import('../domain/tenant.mjs').Tenant>} */
  const tenants = new Map();

  /**
   * @param {import('../domain/tenant.mjs').Tenant} tenant
   * @returns {import('../domain/tenant.mjs').Tenant}
   */
  function clone(tenant) {
    const copy = { id: tenant.id, metadata: { ...tenant.metadata } };
    if (tenant.name) copy.name = tenant.name;
    return copy;
  }

  return {
    async createTenant(input) {
      const tenant = createTenant(input);
      if (tenants.has(tenant.id)) {
        throw new TypeError(t('tenancy.store.duplicate', { id: tenant.id }));
      }
      tenants.set(tenant.id, tenant);
      return clone(tenant);
    },

    async getTenant(id) {
      const tenant = tenants.get(id);
      return tenant ? clone(tenant) : null;
    },

    listTenants() {
      return [...tenants.values()].map(clone);
    },

    async deleteTenant(id) {
      return tenants.delete(id);
    },

    clear() {
      tenants.clear();
    },
  };
}
