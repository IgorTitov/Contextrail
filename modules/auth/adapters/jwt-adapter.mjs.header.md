---
fileId: contextrail-template:modules:auth:adapters:jwt-adapter
module: modules/auth
stability: evolving
steward: shared
api: module-public
hexLayer: adapter
boundedContext: auth
dependsOn:
  - jose
  - modules/auth/domain/auth-state.mjs
summary: Provide a production-grade JWT AuthPort adapter that decodes, verifies, and manages access/refresh token lifecycles.
owns: "JWT-based authentication lifecycle: token verification, claim extraction, expiry detection, and auto-refresh scheduling."
boundaries: Must not perform HTTP calls directly — use the injected loginFn/refreshFn. Must not store tokens in persistent storage (caller decides storage strategy). Not for use without proper key management.
invariants: Tokens must be verified before claims are trusted; expired tokens must trigger refresh or logout; auto-refresh timer must be cleaned up on logout and destroy.
risks: Weak key configuration or skipped verification can lead to authentication bypass; uncleared refresh timers can cause memory leaks.
securityPrivacy: Handles cryptographic keys and tokens in memory. Keys must not be logged. Use asymmetric algorithms (ES256, RS256) in production over symmetric HS256.
notesForLLM: This is the production-path auth adapter. It requires jose. loginFn and refreshFn are dependency-injected to keep the adapter decoupled from any specific backend. Always call destroy() to clear refresh timers.
tests:
  - tests/unit/auth.test.mjs
  - tests/contract/auth-hex-contract.test.mjs
linkedDocs:
  - docs/prd/auth-api-client.md
  - docs/guides/env-and-keys.md
specRefs: TPL-135
related:
  - modules/auth/public-api.mjs
  - modules/auth/adapters/oauth-stub-adapter.mjs
allowedDependencies: jose
forbiddenDependencies:
  - "../domain/**"
  - "../application/**"
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/adapters/**"
adapterType: credential
implementsPort: auth-port
runtimeEnvironment: universal
---

# jwt-adapter.mjs
