---
fileId: contextrail-template:tests:unit:app-config.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: apps/starter/app-config.mjs
summary: Verify all public behaviors of the app-config module including mode constants, detection logic, setMode/getMode, feature-flag defaults per mode, manual overrides, resolveConfig, and resetConfig.
owns: The 22-test suite covering MODES constants, detectMode hint priority, setMode/getMode round-trips, per-mode flag defaults, flag override isolation, resolveConfig composition, and resetConfig idempotency.
boundaries: Must not test DOM behavior or adapter wiring — those belong in app-shell tests and e2e specs. Must not import any module other than app-config.mjs.
invariants: resetConfig() must be called in beforeEach to prevent cross-test state bleed; all 5 modes must have explicit flag-default coverage; detectMode must be tested with injected hints only (no live browser environment).
securityPrivacy: No secrets; test-only file.
notesForLLM: The beforeEach resetConfig() call is load-bearing for isolation — do not remove it. When adding a new mode to app-config.mjs, add corresponding MODES export test, detectMode hint test, and getFeatureFlags default test here.
tests: self
specRefs: TPL-023
related: docs/backlog/platform-seams.md
---

# app-config.test.mjs
