---
fileId: contextrail-template:modules:onboarding:ports:onboarding-port
module: modules/onboarding
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: inbound
boundedContext: onboarding
summary: Onboarding port contract for the onboarding module.
owns: The Onboarding port interface definition for the onboarding module.
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
portCategory: workflow
contractTests: tests/contract/onboarding-hex-contract.test.mjs
linkedDocs: modules/onboarding/ports/README.md
---

# onboarding-port.mjs
