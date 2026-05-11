---
fileId: contextrail-template:modules:log:adapters:file-adapter
module: modules/log
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: log
summary: File sink adapter for the log module. Appends records to a local file.
owns: The File adapter implementation for the log module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Node-only. Use for durable local logs. Rotate files externally (logrotate or similar); this adapter does not manage rotation itself.
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
linkedDocs: modules/log/adapters/README.md
implementsPort: log-port
transport: file
runtimeEnvironment: universal
---

# file-adapter.mjs
