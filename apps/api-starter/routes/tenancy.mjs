/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Tenancy demo routes: create, get, list tenants via the TenantStorePort.
 * @sidecar tenancy.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-001
/**
 * Tenancy demo routes — exercise the tenancy module's public API from a
 * host server using the in-memory store. Real deployments should swap
 * the adapter for a persistent one (SQL, KV, HTTP) at composition time
 * without touching these routes.
 *
 * GET /api/tenancy/create?id=acme&name=Acme   → create a tenant
 * GET /api/tenancy/get?id=acme                → fetch a tenant by id
 * GET /api/tenancy/list                       → snapshot of all tenants
 */

/**
 * @param {{ query: URLSearchParams }} req
 * @param {object} ctx
 */
export async function createTenantHandler(req, ctx) {
  const id = req.query.get('id');
  const name = req.query.get('name') || undefined;
  if (!id) throw new TypeError('id is required');
  const tenant = await ctx.tenancy.createTenant({ id, name });
  ctx.log.info('Tenant created', { id: tenant.id });
  return { id: tenant.id, name: tenant.name ?? null, metadata: tenant.metadata };
}

/**
 * @param {{ query: URLSearchParams }} req
 * @param {object} ctx
 */
export async function getTenantHandler(req, ctx) {
  const id = req.query.get('id');
  if (!id) throw new TypeError('id is required');
  const tenant = await ctx.tenancy.getTenant(id);
  if (!tenant) return { found: false, tenant: null };
  return {
    found: true,
    tenant: { id: tenant.id, name: tenant.name ?? null, metadata: tenant.metadata },
  };
}

/**
 * @param {{ query: URLSearchParams }} _req
 * @param {object} ctx
 */
export async function listTenantsHandler(_req, ctx) {
  const tenants = ctx.tenancy.listTenants();
  return {
    total: tenants.length,
    tenants: tenants.map((t) => ({
      id: t.id,
      name: t.name ?? null,
      metadata: t.metadata,
    })),
  };
}
