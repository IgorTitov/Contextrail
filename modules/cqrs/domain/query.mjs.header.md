---
fileId: contextrail-template:modules:cqrs:query
module: modules/cqrs
stability: experimental
steward: cqrs-module
api: Domain
boundedContext: cqrs
summary: Pure Query value object — validated type + payload + optional metadata.
owns: createQuery, the Query typedef, and the type-shape regex.
boundaries: Stays inside the cqrs bounded context. No I/O, no imports from adapters/.
invariants: Type matches /^[A-Za-z][A-Za-z0-9]*\.[A-Za-z][A-Za-z0-9]*$/. Payload is a plain object. Metadata is a flat string map.
notesForLLM: Symmetry with Command is intentional — keep the shapes in lockstep.
specRefs:
  - TPL-001
---

# query.mjs
