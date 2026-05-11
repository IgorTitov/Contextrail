---
fileId: contextrail-template:tests:unit:feature-seams.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: modules/feature-seams/public-api.mjs
summary: Unit-test the foundational behavior of the feature-seams module — port assertion, SEAM_STATES constants, memory + config adapters, whenEnabled / ifEnabled guards, and onTransition / cleanupBy registry mechanics.
owns: Behavioral proof for assertSeamPort, SEAM_STATES constants, createMemorySeamAdapter, createConfigSeamAdapter, whenEnabled / ifEnabled guards, and the onTransition / cleanupBy registry mechanics.
boundaries: Must not test hex structural layout — that belongs in the contract test. Must not import from module internals; all access goes through public-api.mjs only. Shadow-mode behavior, divergence tracking, auto-disable, and the health adapter live in feature-seams-shadow.test.mjs.
invariants: Adapters must be exercised through the SeamPort interface only; guard tests must cover both enabled and disabled state branches; cleanupBy and timestamp behavior must remain visible through list().
risks: If public-api.mjs renames or removes an export, tests fail loudly — but a contributor may be tempted to patch the test import rather than align the module contract.
notesForLLM: All imports come through public-api.mjs — never add direct internal imports here. The beforeEach pattern in adapter tests creates a fresh adapter per test; preserve that isolation. Guard tests (whenEnabled, ifEnabled) must cover both the enabled branch and the disabled branch.
tests: node --test tests/unit/feature-seams.test.mjs
linkedDocs: docs/design/feature-seams.md
related: tests/unit/feature-seams-shadow.test.mjs
specRefs:
  - TPL-037
  - TPL-038
  - TPL-039
  - TPL-040
  - TPL-218
---

# feature-seams.test.mjs
