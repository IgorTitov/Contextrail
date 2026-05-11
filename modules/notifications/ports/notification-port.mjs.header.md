---
fileId: contextrail-template:modules:notifications:ports:notification-port
module: modules/notifications
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: inbound
boundedContext: notifications
summary: Notification port contract for the notifications module.
owns: The Notification port interface definition for the notifications module.
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
portCategory: ui-notification
contractTests: tests/contract/notifications-hex-contract.test.mjs
linkedDocs: modules/notifications/ports/README.md
---

# notification-port.mjs
