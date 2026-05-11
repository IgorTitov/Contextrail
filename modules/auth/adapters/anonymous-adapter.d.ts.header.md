---
fileId: contextrail-template:modules:auth:adapters:anonymous-adapter.d
module: modules/auth
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: auth
summary: Anonymous/guest credential adapter for the auth module. No real authentication.
owns: Anonymous Adapter.D adapter within the auth module.
boundaries: Scoped to the auth module. Do not use outside this module boundary.
invariants: Must remain consistent with the auth module's port contracts.
notesForLLM: Use for public read-only flows or initial onboarding before the user authenticates. Never gate sensitive capabilities on this adapter.
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
linkedDocs: modules/auth/adapters/README.md
---

# anonymous-adapter.d.ts
