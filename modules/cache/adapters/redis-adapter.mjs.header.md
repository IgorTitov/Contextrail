---
fileId: contextrail-template:modules:cache:adapters:redis-adapter
module: modules/cache
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: cache
summary: Redis-backed adapter for the cache module. Persists state in a shared Redis instance.
owns: The Redis adapter implementation for the cache module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Use when cache state must survive process restarts and be shared across processes. Requires a running Redis server. Prefer a memory adapter for tests.
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
linkedDocs: modules/cache/adapters/README.md
implementsPort: cache-port
transport: db/kv
runtimeEnvironment: universal
---

# redis-adapter.mjs
