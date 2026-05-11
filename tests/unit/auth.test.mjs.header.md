---
fileId: contextrail-template:tests:unit:auth.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: modules/auth/public-api.mjs
summary: Prove the auth port contract and the simpler auth adapters — anonymous, local-password, and oauth-stub — through unit tests using only the public API.
owns: Unit-level coverage of assertAuthPort and the createAnonymousAdapter / createLocalPasswordAdapter / createOAuthStubAdapter factories.
boundaries: Must import only through modules/auth/public-api.mjs — no deep imports into auth internals. Must not perform network calls or real storage I/O. JWT, route guard, authenticated client, server-session, and OAuth provider adapters live in sibling auth-*.test.mjs files.
invariants: All tests must pass with no external service dependencies; tests must not share mutable state across cases; each adapter must be tested in isolation.
risks: Deep imports into auth internals would couple tests to implementation details and break on refactoring; shared state between test cases can cause order-dependent flakiness.
notesForLLM: All auth imports must go through public-api.mjs. Use stub StoragePort when testing local-password adapter. Check both success and failure paths for login and logout.
tests: node --test tests/unit/auth.test.mjs
linkedDocs: docs/prd/auth-api-client.md
specRefs:
  - TPL-063
  - TPL-064
  - TPL-065
  - TPL-066
  - TPL-067
  - TPL-218
related:
  - modules/auth/public-api.mjs
  - tests/unit/auth-jwt.test.mjs
  - tests/unit/auth-oauth.test.mjs
  - tests/unit/auth-route-guard.test.mjs
  - tests/contract/auth-hex-contract.test.mjs
---

# auth.test.mjs
