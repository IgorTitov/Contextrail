---
fileId: contextrail-template:modules:tenancy:tenant-resolver
module: modules/tenancy
stability: experimental
steward: tenancy-module
api: Domain
boundedContext: tenancy
summary: Pure resolvers for extracting a tenant id from HTTP headers or a subdomain.
owns: resolveTenantFromHeaders, resolveTenantFromSubdomain.
boundaries: No I/O. Does not validate the id against any store — only parses.
invariants: Returns null for "no tenant found"; throws TypeError only on malformed input or missing rootDomain config.
notesForLLM: Both resolvers accept options so callers can override the header name, root domain, and ignore list.
specRefs:
  - TPL-001
---

# tenant-resolver.mjs
