---
fileId: contextrail-template:modules:cache:ports:cache-port
module: modules/cache
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: inbound
boundedContext: cache
summary: Cache port contract for the cache module.
owns: The Cache port interface definition for the cache module.
boundaries: Port interface only. No implementation details or infrastructure code.
invariants: Must define and export a contract assertion function.
notesForLLM: Port contract. Adapters in adapters/ must satisfy this interface.
allowedDependencies:
  - ./
  - "../types.*"
forbiddenDependencies:
  - "../adapters/**"
  - "../di/**"
  - react
  - express
  - fastify
  - "node:*"
  - fs
  - path
  - "modules/<other>/**"
specRefs: TPL-142
portCategory: storage
contractTests: tests/contract/cache-hex-contract.test.mjs
linkedDocs: modules/cache/ports/README.md
---

# cache-port.mjs
