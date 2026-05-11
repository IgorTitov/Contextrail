---
fileId: contextrail-template:modules:i18n:ports:i18n-port
module: modules/i18n
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: inbound
boundedContext: i18n
summary: I18n port contract for the i18n module.
owns: The I18n port interface definition for the i18n module.
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
portCategory: ui-i18n
contractTests: tests/contract/i18n-hex-contract.test.mjs
linkedDocs: modules/i18n/ports/README.md
---

# i18n-port.mjs
