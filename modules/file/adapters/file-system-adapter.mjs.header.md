---
fileId: contextrail-template:modules:file:adapters:file-system-adapter
module: modules/file
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: file
summary: Node filesystem adapter for the file module. Stores file state on disk.
owns: The File System adapter implementation for the file module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Node-only. Uses fs; must not run in the browser. Verify path safety before writing.
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
specRefs: TPL-162
linkedDocs: modules/file/adapters/README.md
implementsPort: file-port
transport: file
runtimeEnvironment: node
externalSystems:
  - node-fs
---

# file-system-adapter.mjs
