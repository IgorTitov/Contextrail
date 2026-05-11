---
fileId: contextrail-template:modules:cache:adapters:memory-lru-adapter
module: modules/cache
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: cache
summary: "In-process LRU memory adapter for the cache module. Bounded-size, lost on restart."
owns: The Memory Lru adapter implementation for the cache module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Use for single-node deployments or tests where persistence is unnecessary. Evicts least-recently-used entries when full.
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
specRefs: TPL-143
linkedDocs: modules/cache/adapters/README.md
implementsPort: cache-port
runtimeEnvironment: universal
---

# memory-lru-adapter.mjs
