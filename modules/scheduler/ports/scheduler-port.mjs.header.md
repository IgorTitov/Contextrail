---
fileId: contextrail-template:modules:scheduler:ports:scheduler-port
module: modules/scheduler
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: inbound
boundedContext: scheduler
summary: Scheduler port contract for the scheduler module.
owns: The Scheduler port interface definition for the scheduler module.
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
specRefs: TPL-168
portCategory: workflow
contractTests: tests/contract/scheduler-hex-contract.test.mjs
linkedDocs: modules/scheduler/ports/README.md
---

# scheduler-port.mjs
