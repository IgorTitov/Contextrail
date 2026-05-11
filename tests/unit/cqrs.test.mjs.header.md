---
fileId: contextrail-template:tests:unit:cqrs
module: tests/unit
stability: experimental
steward: cqrs-module
api: Test
boundedContext: cqrs
summary: Unit proof for the cqrs bounded module — commands, queries, events, aggregates, memory adapters, and the full round-trip.
owns: Behavioral coverage of every public-api.mjs export from modules/cqrs.
boundaries: Imports only from modules/cqrs/public-api.mjs — no deep imports.
invariants: Every validation branch, every adapter lifecycle, and the integration round-trip is exercised.
notesForLLM: Adding a new public-api export requires a new describe block here.
specRefs:
  - TPL-001
---

# cqrs.test.mjs
