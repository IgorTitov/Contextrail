---
fileId: contextrail-template:tests:contract:permission-hex-contract.test
module: tests/contract
stability: evolving
steward: shared
api: file-local
summary: Hex contract tests for the permission module.
owns: Structural contract proof that modules/permission/ respects hex folder layout, exports only through public-api.mjs, contains a valid manifest.json (including the auth module dependency), and has a README.
boundaries: Must not test authorization rule logic, role hierarchy behaviour, or UI gating; must only assert structural and boundary constraints of the permission hex module.
invariants: Tests must stay red if domain/, ports/, or adapters/ are missing; tests must stay red if public-api.mjs is absent; manifest.json must declare name as "permission", include public-api.mjs in exports, and declare "auth" in module dependencies; must not import from module internals directly.
notesForLLM: When the permission module gains new required folders, public-api exports, or manifest dependencies, add structural assertions here first (TDD). The auth module dependency assertion in manifest.json is load-bearing — do not remove it.
tests:
  - node:test runner via pnpm test:contract
  - passes as part of the full test gate
related: tests/unit/permission.test.mjs
specRefs: TPL-157
---

# permission-hex-contract.test.mjs
