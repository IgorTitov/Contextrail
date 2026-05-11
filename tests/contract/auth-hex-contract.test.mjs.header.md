---
fileId: contextrail-template:tests:contract:auth-hex-contract.test
module: tests/contract
stability: evolving
steward: shared
api: file-local
dependsOn: modules/auth/public-api.mjs
summary: "Verify that the auth module satisfies its hexagonal contract: correct folder layout, required public-api exports, and no deep import violations."
owns: Structural and surface compliance verification for the auth module's hexagonal boundaries; export-list assertions against expected public surface.
boundaries: Must not test business logic or adapter behavior — that belongs in unit tests. Must not import auth module internals directly.
invariants: Contract test must fail if any expected export is removed from public-api.mjs; test must be re-run whenever the public API surface changes.
risks: Contract tests that only check file existence without validating exports can miss removed public symbols; a passing contract test with weak assertions gives false confidence about boundary compliance.
notesForLLM: This test validates structure, not behavior. When adding a new public export to auth/public-api.mjs, add a corresponding assertion here to keep the contract current.
tests: self
linkedDocs: docs/prd/auth-api-client.md
specRefs:
  - TPL-062
  - TPL-063
related:
  - modules/auth/public-api.mjs
  - tests/unit/auth.test.mjs
---

# auth-hex-contract.test.mjs
