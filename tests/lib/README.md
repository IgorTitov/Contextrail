<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Shared test helpers and environment configuration for cross-test reuse.
@sidecar README.md.header.md
@layer tests | @hex _none_ | @ctx _none_
@public false
@edit rewrite-ok -->

# tests/lib

Shared test helpers that are imported across test layers (unit, integration, BDD).

- `seam-test-env.mjs` — `SEAM_STATE` env var helper for CI seam-state matrix testing.
