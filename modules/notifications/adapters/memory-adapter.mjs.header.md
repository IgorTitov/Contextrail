---
fileId: contextrail-template:modules:notifications:adapters:memory-adapter
module: modules/notifications
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: notifications
summary: "In-process memory adapter for the notifications module. Ephemeral, lost on restart."
owns: The Memory adapter implementation for the notifications module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Use for tests and single-node dev where durability is not required. Prefer a persistent sibling adapter in production.
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
adapterType: in-memory
linkedDocs: modules/notifications/adapters/README.md
implementsPort: notification-port
runtimeEnvironment: universal
---

# memory-adapter.mjs
