---
fileId: contextrail-template:tests:unit:feature-seams-shadow.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: modules/feature-seams/public-api.mjs
summary: Prove the feature-seams shadow-mode behavior — isShadow predicate, whenShadow guard semantics, divergence tracker, auto-disable, and the health-port adapter.
owns: Behavioral proof for adapter.isShadow, whenShadow (run-both, divergence detection, custom compare, exception handling), createDivergenceTracker (sliding window + threshold), auto-disable on tracker breach, and createHealthAdapter / assertHealthPort.
boundaries: Must not test hex structural layout — that belongs in the contract test. Must not import from module internals; all access goes through public-api.mjs only. Foundational adapter / guard / port-assertion tests live in feature-seams.test.mjs.
invariants: whenShadow must always return the old-path result when both paths run; divergence tracker must respect windowSize and threshold; auto-disable must transition the seam out of the shadow state.
risks: Subtle whenShadow exception handling — if onError is omitted, the new-path exception must not crash but should still count as divergence when a tracker is provided.
notesForLLM: All imports come through public-api.mjs. Use small windowSize and maxDivergence values to make auto-disable behavior easy to assert. Custom compare functions are the canonical way to test deep-equality divergence semantics.
tests: node --test tests/unit/feature-seams-shadow.test.mjs
linkedDocs: docs/design/feature-seams.md
related: tests/unit/feature-seams.test.mjs
specRefs:
  - TPL-037
  - TPL-040
  - TPL-218
---

# feature-seams-shadow.test.mjs
