---
fileId: contextrail-template:modules:auth:adapters:server-session-adapter
module: modules/auth
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: auth
summary: Server-managed session credential adapter for the auth module. Session state lives server-side.
owns: The Server Session adapter implementation for the auth module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Use when you need server-side session revocation or state. Requires a cooperating server endpoint.
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
implementsPort: auth-port
runtimeEnvironment: universal
---

# server-session-adapter.mjs
