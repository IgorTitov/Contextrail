---
fileId: contextrail-template:docs:adr:0005-js-jsdoc-over-typescript
module: docs/adr
stability: evolving
steward: shared
api: Documentation
summary: Record the accepted architectural decision to use plain ES module JavaScript with JSDoc annotations and .d.ts sidecars instead of TypeScript across all template hex modules.
owns: Authoritative rationale for the JS+JSDoc+.d.ts language strategy used across all template hex modules.
boundaries: Must not prescribe application-layer bundler or build tooling; must not become a TypeScript migration guide that contradicts the zero-build-step philosophy.
invariants: The decision status stays Accepted until a superseding ADR is recorded; arguments and migration path sections must reflect the actual module structure.
risks: If module structure diverges from the table in the Current State section the ADR becomes misleading without a visible update.
notesForLLM: The decision is JS+JSDoc+.d.ts; the .d.ts sidecar is the canonical type authority; port assertion functions substitute for compile-time type checks. Do not suggest switching to TypeScript without a new ADR.
linkedDocs:
  - docs/adr/
  - modules/
specRefs: TPL-134
---

# 0005-js-jsdoc-over-typescript.md
