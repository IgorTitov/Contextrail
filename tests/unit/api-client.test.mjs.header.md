---
fileId: contextrail-template:tests:unit:api-client.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: modules/api-client/public-api.mjs
summary: Prove the behavioral contract of the fetch-adapter and ApiClientPort shape validation using only the public API, with fetch mocked in-process.
owns: Unit-level behavioral coverage for fetch-adapter and port shape validation; regression protection for error normalization and base URL handling.
boundaries: Must import only through modules/api-client/public-api.mjs — no deep imports. Must mock fetch globally rather than making real network calls.
invariants: All tests must pass without network access; fetch mock must be restored after each test; tests must not share adapter instances across cases.
risks: Leaking a fetch mock across tests can cause unrelated tests to behave incorrectly; tests that do not cover non-2xx normalization miss the adapter's primary safety contract.
notesForLLM: All api-client imports must go through public-api.mjs. Use node:test mock.method to stub global fetch. Restore mocks in afterEach to prevent state leakage across test files.
tests: self
linkedDocs: docs/prd/auth-api-client.md
specRefs:
  - TPL-068
  - TPL-069
related:
  - modules/api-client/public-api.mjs
  - tests/contract/api-client-hex-contract.test.mjs
---

# api-client.test.mjs
