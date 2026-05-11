---
fileId: contextrail-template:tests:contract:api-client-hex-contract.test
module: tests/contract
stability: evolving
steward: shared
api: file-local
dependsOn: modules/api-client/public-api.mjs
summary: "Verify that the api-client module satisfies its hexagonal contract: correct folder layout, required public-api exports, and no deep import violations."
owns: Structural and surface compliance verification for the api-client module's hexagonal boundaries; export-list assertions against expected public surface.
boundaries: Must not test HTTP behavior or adapter implementation — that belongs in unit tests. Must not import api-client module internals directly.
invariants: Contract test must fail if any expected export is removed from public-api.mjs; test must be re-run whenever the public API surface changes.
risks: Contract tests that only check file existence without validating exports can miss removed public symbols; a passing contract test with weak assertions gives false confidence about boundary compliance.
notesForLLM: This test validates structure, not behavior. When adding a new public export to api-client/public-api.mjs, add a corresponding assertion here to keep the contract current.
tests: self
linkedDocs: docs/prd/auth-api-client.md
specRefs:
  - TPL-062
  - TPL-068
related:
  - modules/api-client/public-api.mjs
  - tests/unit/api-client.test.mjs
---

# api-client-hex-contract.test.mjs
