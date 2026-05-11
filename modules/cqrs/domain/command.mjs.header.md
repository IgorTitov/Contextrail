---
fileId: contextrail-template:modules:cqrs:command
module: modules/cqrs
stability: experimental
steward: cqrs-module
api: Domain
boundedContext: cqrs
summary: Pure Command value object — validated type + payload + optional metadata.
owns: createCommand, the Command typedef, and the type-shape regex.
boundaries: Stays inside the cqrs bounded context. No I/O, no imports from adapters/.
invariants: Type matches /^[A-Za-z][A-Za-z0-9]*\.[A-Za-z][A-Za-z0-9]*$/. Payload is a plain object. Metadata is a flat string map.
notesForLLM: Validation errors throw TypeError with i18n keys from messages.mjs. id/createdAt are stamped by the bus adapter, not here.
specRefs:
  - TPL-001
---

# command.mjs
