---
fileId: contextrail-template:modules:log:adapters:remote-adapter
module: modules/log
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: log
summary: Remote log sink adapter for the log module. Ships records to a remote endpoint.
owns: The Remote adapter implementation for the log module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Use for centralized logging. Must handle network failures without blocking the caller.
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
adapterType: infrastructure
specRefs: TPL-141
linkedDocs: modules/log/adapters/README.md
implementsPort: log-port
runtimeEnvironment: universal
transport: http/rest
externalSystems:
  - http
---

# remote-adapter.mjs
