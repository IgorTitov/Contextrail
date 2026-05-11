---
fileId: contextrail-template:tests:unit:app-shell.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn:
  - apps/starter/app.mjs
  - apps/starter/app-config.mjs
summary: Verify that the app shell correctly reports adapter plans for all modes and assembles a well-formed app context without requiring a real DOM.
owns: The 8-test suite covering getAdapterPlan shape for all 5 modes, createAppContext structure, and createAppContext reflection of mode changes.
boundaries: Must not invoke initApp() — DOM-dependent initialization belongs in e2e tests. Must not test feature-flag logic — that is owned by app-config.test.mjs. Must not import modules other than app.mjs and app-config.mjs.
invariants: resetConfig() must be called in beforeEach; getAdapterPlan tests must cover all 5 MODES entries so that adding a new mode triggers a visible test gap; createAppContext must always include mode, flags, and adapterPlan keys.
securityPrivacy: No secrets; test-only file.
notesForLLM: When getAdapterPlan gains mode-specific branching (e.g., IndexedDB for electron), extend the per-mode assertions here to capture the new adapter names. Do not expand this file to test the full initApp() flow — keep that in e2e or integration tests.
tests: self
specRefs: TPL-024
related: docs/backlog/platform-seams.md
---

# app-shell.test.mjs
