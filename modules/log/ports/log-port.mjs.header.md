---
fileId: contextrail-template:modules:log:ports:log-port
module: modules/log
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: inbound
boundedContext: log
summary: Log port contract for the log module.
owns: The Log port interface definition for the log module.
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
specRefs: TPL-137
portCategory: logging
contractTests: tests/contract/log-hex-contract.test.mjs
linkedDocs: modules/log/ports/README.md
---

# log-port.mjs
