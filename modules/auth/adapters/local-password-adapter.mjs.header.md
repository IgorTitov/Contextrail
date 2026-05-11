---
fileId: contextrail-template:modules:auth:adapters:local-password-adapter
module: modules/auth
stability: evolving
steward: shared
api: module-public
hexLayer: adapter
boundedContext: auth
dependsOn: modules/auth/domain/auth-state.mjs
owns: Demo credential registration and login flow; simple hash comparison against StoragePort; session token generation for development use.
boundaries: Must not implement cryptographically secure hashing, server-side sessions, or token refresh. Must not be used in production deployments.
invariants: signIn must fail with a clear error when credentials are absent or mismatched; register must reject duplicate usernames; storage interaction must go through the StoragePort argument only.
risks: Weak hash used for demo only — if mistakenly deployed to production, credentials are trivially reversible; StoragePort coupling means storage failures are not isolated.
securityPrivacy: Demo hash only — NOT for production. Passwords are weakly hashed and stored via the injected StoragePort.
notesForLLM: Use for self-contained apps without an identity provider. Hashing algorithm and salt live behind the port; verify test coverage before changes.
tests: tests/unit/auth.test.mjs
linkedDocs: docs/prd/auth-api-client.md
specRefs: TPL-065
related:
  - modules/auth/public-api.mjs
  - modules/auth/domain/auth-state.mjs
summary: Local password credential adapter for the auth module. Validates credentials against locally stored password hashes.
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
adapterType: credential
implementsPort: auth-port
runtimeEnvironment: universal
---

# local-password-adapter.mjs
