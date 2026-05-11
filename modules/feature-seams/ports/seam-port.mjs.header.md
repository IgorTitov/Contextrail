---
fileId: contextrail-template:modules:feature-seams:ports:seam-port
module: modules/feature-seams
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: inbound
boundedContext: feature-seams
summary: Seam port contract for the feature-seams module.
owns: The Seam port interface definition for the feature-seams module.
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
specRefs: TPL-037
portCategory: infrastructure
contractTests: tests/contract/feature-seams-hex-contract.test.mjs
linkedDocs: modules/feature-seams/ports/README.md
---

# seam-port.mjs
