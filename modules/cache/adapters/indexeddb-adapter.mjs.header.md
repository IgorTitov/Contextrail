---
fileId: contextrail-template:modules:cache:adapters:indexeddb-adapter
module: modules/cache
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: cache
summary: "IndexedDB adapter for the cache module. Persists state in the browser's IndexedDB store."
owns: The Indexeddb adapter implementation for the cache module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Browser-only. Use when the cache module needs persistent client-side storage larger than localStorage allows. Operations are async.
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
specRefs: TPL-145
linkedDocs: modules/cache/adapters/README.md
implementsPort: cache-port
transport: db/kv
runtimeEnvironment: browser
externalSystems:
  - browser-indexeddb
---

# indexeddb-adapter.mjs
