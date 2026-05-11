/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose AsyncLocalStorage-backed tenant context helper — scopes a tenant across async call graphs.
 * @sidecar als-tenant-context.mjs.header.md
 * @layer adapter | @hex _none_ | @ctx tenancy
 * @public false
 * @edit careful
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { t } from '../messages.mjs';

/**
 * Node `AsyncLocalStorage`-backed tenant context. Lets server-side request
 * handlers bind a tenant once at the boundary and have downstream async
 * code read it without threading `ctx` through every call site.
 *
 * This is the **only** file in the tenancy module allowed to import
 * `node:async_hooks`. The pure domain must stay ALS-free so it can run
 * in a browser, worker, or test harness without special Node features.
 *
 * @typedef {import('../domain/tenant.mjs').Tenant} Tenant
 *
 * @typedef {object} AlsTenantContext
 * @property {<T>(tenant: Tenant, fn: () => T) => T} run       Run `fn` with `tenant` bound to the current async scope.
 * @property {() => (Tenant | null)} current                    Return the currently bound tenant, or null if outside a run.
 * @property {() => Tenant} require                             Return the currently bound tenant, or throw if outside a run.
 */

/**
 * Create an {@link AlsTenantContext}. A single instance is typically shared
 * across an application; each call creates a fresh `AsyncLocalStorage`
 * that is fully isolated from any other instance.
 *
 * @returns {AlsTenantContext}
 */
export function createAlsTenantContext() {
  /** @type {AsyncLocalStorage<Tenant>} */
  const als = new AsyncLocalStorage();

  return {
    run(tenant, fn) {
      return als.run(tenant, fn);
    },
    current() {
      return als.getStore() ?? null;
    },
    require() {
      const tenant = als.getStore();
      if (!tenant) {
        throw new TypeError(t('tenancy.als.outside_run'));
      }
      return tenant;
    },
  };
}
