---
fileId: contextrail-template:modules:analytics:ports:analytics-port
module: modules/analytics
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: inbound
boundedContext: analytics
summary: Analytics port contract for the analytics module.
owns: The Analytics port interface definition for the analytics module.
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
specRefs: TPL-163
portCategory: telemetry
contractTests: tests/contract/analytics-hex-contract.test.mjs
linkedDocs: modules/analytics/ports/README.md
---

# analytics-port.mjs
