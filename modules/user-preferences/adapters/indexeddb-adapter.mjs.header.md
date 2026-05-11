---
fileId: contextrail-template:modules:user-preferences:adapters:indexeddb-adapter
module: modules/user-preferences
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: user-preferences
summary: "IndexedDB adapter for the user-preferences module. Persists state in the browser's IndexedDB store."
owns: The Indexeddb adapter implementation for the user-preferences module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Browser-only. Use when the user-preferences module needs persistent client-side storage larger than localStorage allows. Operations are async.
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
adapterType: storage
specRefs: TPL-029
linkedDocs: modules/user-preferences/adapters/README.md
implementsPort: storage-port
transport: db/kv
runtimeEnvironment: browser
externalSystems:
  - browser-indexeddb
---

# indexeddb-adapter.mjs
