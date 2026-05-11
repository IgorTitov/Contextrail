---
fileId: contextrail-template:tests:unit:auth-jwt.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: modules/auth/public-api.mjs
summary: Prove the JWT auth adapter — token verification, claim validation (issuer / audience), HS256 + asymmetric keys, refresh tokens, custom claim mapping, and lifecycle.
owns: Unit-level coverage of createJwtAdapter — verification with public/private keys, HS256 symmetric secret, issuer/audience claim validation, refresh-token storage, mapClaims, login/logout listeners, and destroy cleanup.
boundaries: Must import only through modules/auth/public-api.mjs. Must not perform network calls. Use the test helpers (createTestKeyPair / createTestSecret / signTestToken) re-exported through the public API.
invariants: Verification failure must return success:false with the auth.jwt.verification_failed error code; isAuthenticated must reflect login state; custom mapClaims must be applied without mutating the original claims object.
risks: Forgetting to call adapter.destroy() can leak the refresh-timer; accidentally using a static key across tests can mask key-rotation bugs.
notesForLLM: Each test pulls a fresh key pair from createTestKeyPair in beforeEach; reuse that pattern. Always call adapter.destroy() at the end of each test to avoid timer leaks.
tests: node --test tests/unit/auth-jwt.test.mjs
linkedDocs: docs/prd/auth-api-client.md
specRefs:
  - TPL-070
  - TPL-218
related:
  - modules/auth/public-api.mjs
  - tests/unit/auth.test.mjs
  - tests/unit/auth-route-guard.test.mjs
  - tests/contract/auth-hex-contract.test.mjs
---

# auth-jwt.test.mjs
