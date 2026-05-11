---
fileId: contextrail-template:modules:auth:adapters:oauth-stub-adapter.d
module: modules/auth
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: auth
summary: OAuth 2.0 stub credential adapter for the auth module. Placeholder for local dev.
owns: Oauth Stub Adapter.D adapter within the auth module.
boundaries: Scoped to the auth module. Do not use outside this module boundary.
invariants: Must remain consistent with the auth module's port contracts.
notesForLLM: Stub only. Replace with a real OAuth provider integration before production use. Useful for wiring the port contract during development.
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
linkedDocs: modules/auth/adapters/README.md
---

# oauth-stub-adapter.d.ts
