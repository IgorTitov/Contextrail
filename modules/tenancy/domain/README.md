<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for tenancy/domain.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# modules/tenancy/domain/

Pure domain logic for the tenancy module. Framework-free, no network, no persistence, no `node:async_hooks`. Contains the `Tenant` value object, the pure `TenantContext` helper, and pure header/subdomain resolvers that extract a tenant id from raw HTTP inputs.
