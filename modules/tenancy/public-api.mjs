/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single cross-module entry point for the tenancy module.
 * @sidecar public-api.mjs.header.md
 * @layer public-api | @hex _none_ | @ctx tenancy
 * @public true
 * @edit careful
 */

// Domain
export { createTenant } from './domain/tenant.mjs';
export { createTenantContext, requireTenant, withTenant } from './domain/tenant-context.mjs';
export { resolveTenantFromHeaders, resolveTenantFromSubdomain } from './domain/tenant-resolver.mjs';

// Ports
export { assertTenantStorePort } from './ports/tenant-store-port.mjs';

// Adapters
export { createMemoryTenantStore } from './adapters/memory-tenant-store.mjs';
export { createAlsTenantContext } from './adapters/als-tenant-context.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
