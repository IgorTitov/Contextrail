---
fileId: contextrail-template:modules:task:ports:task-port
module: modules/task
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: inbound
boundedContext: task
summary: Task port contract for the task module.
owns: The Task port interface definition for the task module.
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
specRefs: TPL-154
portCategory: workflow
contractTests: tests/contract/task-hex-contract.test.mjs
linkedDocs: modules/task/ports/README.md
---

# task-port.mjs
