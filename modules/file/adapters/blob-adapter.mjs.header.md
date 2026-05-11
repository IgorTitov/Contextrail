---
fileId: contextrail-template:modules:file:adapters:blob-adapter
module: modules/file
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: file
summary: Blob-backed adapter for the file module. Uses the browser Blob API for in-memory binary storage.
owns: The Blob adapter implementation for the file module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Browser-only. Use when file needs to stage binary data that lives only for the current session.
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
specRefs: TPL-161
linkedDocs: modules/file/adapters/README.md
implementsPort: file-port
runtimeEnvironment: universal
externalSystems:
  - http
---

# blob-adapter.mjs
