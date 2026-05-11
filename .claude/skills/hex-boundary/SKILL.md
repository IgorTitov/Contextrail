---
name: hex-boundary
description: Preserve hexagonal boundaries, explicit public APIs, and modular-monolith contracts.
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Preserve modular-monolith boundaries, public API discipline, and hexagonal layering when structure, imports, or adapters are being changed.
@sidecar SKILL.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# hex-boundary

## Rules

- domain is pure
- application orchestrates use cases
- ports define the boundary
- adapters isolate infrastructure
- DI only wires
- cross-module imports go through `public-api.ts` only

## Check

```bash
node scripts/checks/architecture-check.mjs
```
