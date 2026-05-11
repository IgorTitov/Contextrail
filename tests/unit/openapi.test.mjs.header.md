---
fileId: contextrail-template:tests:unit:openapi
module: tests/unit
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - modules/openapi/public-api.mjs
summary: Unit proof for the openapi bounded module — builder shape, validation, and adapter behavior.
owns: Unit proof for the openapi bounded module.
boundaries: Test only the public API surface. No deep imports.
invariants: buildOpenApiDocument() is pure and validates input; both adapters satisfy assertOpenApiDocumentPort().
securityPrivacy: Test-only; no I/O.
notesForLLM: This test file imports exclusively from public-api.mjs to prove the hexagonal import rule.
tests: self
linkedDocs: modules/openapi/README.md
related: modules/openapi/public-api.mjs
specRefs:
  - TPL-001
---

# openapi.test.mjs
