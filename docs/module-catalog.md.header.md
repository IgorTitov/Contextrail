---
fileId: contextrail-template:docs:module-catalog
module: docs
stability: evolving
steward: shared
api: Documentation
summary: Per-module API documentation, usage examples, dependency graph, and safe removal order for all 38 hex modules.
owns: Per-module API documentation, usage examples, dependency graph, and safe removal order for all 38 hex modules.
boundaries: Must not contain architecture rationale (whitepaper) or configuration reference (technical-reference). One section per module plus composed use cases.
invariants: Module count and names must match modules/ directory. Public API imports must match each module's public-api.mjs.
risks: Module API changes can make examples stale. Verify imports against public-api.mjs when updating.
securityPrivacy: No secrets.
notesForLLM: When a module's public API changes, update the matching section here. The composed use case section (GraphRAG) shows cross-module patterns — update when new composed patterns emerge.
linkedDocs:
  - docs/whitepaper.md
  - docs/technical-reference.md
  - docs/guides/module-detachment.md
related:
  - docs/whitepaper.md
  - docs/technical-reference.md
  - docs/guides/getting-started.md
---

# module-catalog.md
