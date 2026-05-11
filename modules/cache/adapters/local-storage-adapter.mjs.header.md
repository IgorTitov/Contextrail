---
fileId: contextrail-template:modules:cache:adapters:local-storage-adapter
module: modules/cache
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: cache
summary: localStorage adapter for the cache module. Persists small scalar state synchronously in the browser.
owns: The Local Storage adapter implementation for the cache module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: "Browser-only. Synchronous but capped at roughly 5 MB. Use for small preferences, not hot or large data."
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
specRefs: TPL-144
linkedDocs: modules/cache/adapters/README.md
implementsPort: cache-port
transport: db/kv
runtimeEnvironment: browser
externalSystems:
  - browser-localstorage
---

# local-storage-adapter.mjs
