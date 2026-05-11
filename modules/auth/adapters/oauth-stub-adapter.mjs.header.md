---
fileId: contextrail-template:modules:auth:adapters:oauth-stub-adapter
module: modules/auth
stability: evolving
steward: shared
api: module-public
hexLayer: adapter
boundedContext: auth
dependsOn: modules/auth/domain/auth-state.mjs
owns: Mock OAuth sign-in and sign-out flow; configurable provider name and delay for test scenarios; mock token generation.
boundaries: Must not perform real OAuth redirects, contact external authorization servers, or store tokens in persistent storage. Not for production use.
invariants: signIn must always succeed with a mock token bearing the configured providerName; signOut must clear auth state; mockDelay must default to 0 if not provided.
risks: Mistakenly used in production builds results in authentication bypass; mock tokens could leak to production API if wired incorrectly.
securityPrivacy: Mock tokens only — not cryptographically signed or validated. Must not be shipped to production.
notesForLLM: Stub only. Replace with a real OAuth provider integration before production use. Useful for wiring the port contract during development.
tests: tests/unit/auth.test.mjs
linkedDocs: docs/prd/auth-api-client.md
specRefs: TPL-066
related:
  - modules/auth/public-api.mjs
  - modules/auth/domain/auth-state.mjs
summary: OAuth 2.0 stub credential adapter for the auth module. Placeholder for local dev.
allowedDependencies:
  - "../ports/*"
  - "../types.*"
  - ./
  - "frameworks as needed (react, express, node: builtins)"
forbiddenDependencies:
  - "../domain/**"
  - "../application/**"
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/adapters/**"
adapterType: test-stub
implementsPort: auth-port
runtimeEnvironment: universal
---

# oauth-stub-adapter.mjs
