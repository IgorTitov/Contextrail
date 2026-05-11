---
fileId: contextrail-template:modules:auth:public-api
module: modules/auth
stability: evolving
steward: shared
api: module-public
hexLayer: application
boundedContext: auth
dependsOn:
  - modules/auth/ports/auth-port.mjs
  - modules/auth/ports/oauth-provider-port.mjs
  - modules/auth/adapters/anonymous-adapter.mjs
  - modules/auth/adapters/github-oauth-provider.mjs
  - modules/auth/adapters/google-oauth-provider.mjs
  - modules/auth/adapters/jwt-adapter.mjs
  - modules/auth/adapters/local-password-adapter.mjs
  - modules/auth/adapters/memory-oauth-provider.mjs
  - modules/auth/adapters/oauth-stub-adapter.mjs
  - modules/auth/adapters/server-session-adapter.mjs
  - modules/auth/domain/auth-api-integration.mjs
  - modules/auth/domain/route-guard.mjs
  - modules/auth/messages.mjs
summary: Single entry point for the auth bounded module — re-exports port contracts, 5 adapters (anonymous, local-password, OAuth-stub, JWT, server-session), route guard, and API client integration.
owns: The complete and stable external surface of the auth module; the boundary enforcing no deep imports from outside consumers.
boundaries: Must not contain business logic. Must not import from other modules' internals. Must not grow to re-export internal helpers not meant for cross-module use.
invariants: All cross-module auth imports must go through this file only; removing an export is a breaking change requiring a version bump; exports must remain consistent with the auth hex contract test.
risks: Adding an internal export here accidentally broadens the module surface; removing an export silently breaks consumers not caught by contract tests.
notesForLLM: This is the only file external code may import from the auth module. Before adding an export here, confirm it belongs to the public surface and is covered by contract tests.
tests: tests/contract/auth-hex-contract.test.mjs
linkedDocs:
  - docs/prd/auth-api-client.md
  - docs/_generated/dependency-graph.json
specRefs: TPL-062
related:
  - modules/auth/ports/auth-port.mjs
  - tests/contract/auth-hex-contract.test.mjs
allowedDependencies:
  - "./domain/*"
  - "./application/*"
  - "./ports/*"
  - "./adapters/*"
  - "./messages.*"
  - "./types.*"
forbiddenDependencies:
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/ports/**"
  - "modules/<other>/adapters/**"
  - react
  - express
  - fastify
  - "node:*"
exports:
  - assertAuthPort
  - assertOAuthProviderPort
  - base64url
  - buildAuthorizeUrl
  - createAnonymousAdapter
  - createAuthenticatedClient
  - createGitHubOAuthProvider
  - createGoogleOAuthProvider
  - createJwtAdapter
  - createLocalPasswordAdapter
  - createMemoryOAuthProvider
  - createNodeOAuthState
  - createNodePkcePair
  - createOAuthStubAdapter
  - createRouteGuard
  - createServerSessionAdapter
  - createTestKeyPair
  - createTestSecret
  - generateOAuthState
  - generatePkcePair
  - getLocale
  - nodeRandomBytesFn
  - nodeSha256Fn
  - registerLocale
  - resetLocale
  - setLocale
  - signTestToken
  - t
  - toAuthUserFromGithub
  - toAuthUserFromGoogle
---

# public-api.mjs

