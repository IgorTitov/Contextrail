---
fileId: contextrail-template:tests:unit:auth-route-guard.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: modules/auth/public-api.mjs
summary: Prove the auth route guard, the authenticated API client wiring, and the server-session adapter using only the public API.
owns: Unit-level coverage of createRouteGuard (allow / deny / role-based), createAuthenticatedClient (Authorization header injection on auth state change, delegation), and createServerSessionAdapter (login / logout / sessionId / listener / custom store).
boundaries: Must import only through modules/auth/public-api.mjs. The mock ApiClientPort lives inline in this file; do not extract it to a shared helper without renaming the rep file. Must not perform real HTTP, network, or storage I/O.
invariants: Route guard must use auth. error codes for denial reasons; createAuthenticatedClient must inject "Bearer <token>" only when the user has an accessToken; server-session adapter must remove session entries from the store on logout.
risks: Forgetting to call client.destroy() in createAuthenticatedClient tests will leak the auth-change listener and may pollute follow-up tests in the same file.
notesForLLM: Always call client.destroy() at the end of each createAuthenticatedClient test. Use createOAuthStubAdapter with mockUser to drive route-guard role tests.
tests: node --test tests/unit/auth-route-guard.test.mjs
linkedDocs: docs/prd/auth-api-client.md
specRefs:
  - TPL-066
  - TPL-067
  - TPL-218
related:
  - modules/auth/public-api.mjs
  - tests/unit/auth.test.mjs
  - tests/unit/auth-jwt.test.mjs
  - tests/contract/auth-hex-contract.test.mjs
---

# auth-route-guard.test.mjs
