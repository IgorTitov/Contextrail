---
fileId: contextrail-template:modules:auth:adapters:anonymous-adapter
module: modules/auth
stability: evolving
steward: shared
api: module-public
hexLayer: adapter
boundedContext: auth
dependsOn: modules/auth/domain/auth-state.mjs
owns: Anonymous user initialization; no-op sign-in and sign-out implementations satisfying AuthPort.
boundaries: Must not enforce credentials, contact storage, or redirect. Must not be used as a skeleton for real auth adapters without replacing all stubs.
invariants: getCurrentUser must always return a non-null anonymous user; signIn must always succeed; signOut must reset to the anonymous user, not to null.
risks: Accidentally used as the default in production builds that expect real auth, silently bypassing access control.
notesForLLM: Use for public read-only flows or initial onboarding before the user authenticates. Never gate sensitive capabilities on this adapter.
tests: tests/unit/auth.test.mjs
linkedDocs: docs/prd/auth-api-client.md
specRefs: TPL-064
related:
  - modules/auth/public-api.mjs
  - modules/auth/domain/auth-state.mjs
summary: Anonymous/guest credential adapter for the auth module. No real authentication.
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

# anonymous-adapter.mjs
