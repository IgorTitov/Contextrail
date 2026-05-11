---
fileId: contextrail-template:modules:auth:adapters:local-password-adapter.d
module: modules/auth
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: auth
summary: Local password credential adapter for the auth module. Validates credentials against locally stored password hashes.
owns: Local Password Adapter.D adapter within the auth module.
boundaries: Scoped to the auth module. Do not use outside this module boundary.
invariants: Must remain consistent with the auth module's port contracts.
notesForLLM: Use for self-contained apps without an identity provider. Hashing algorithm and salt live behind the port; verify test coverage before changes.
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

# local-password-adapter.d.ts
