---
fileId: contextrail-template:modules:search:search-port
module: modules/search
stability: evolving
steward: shared
api: Port
boundedContext: search
summary: Port contract for full-text search adapters (memory, FTS5, Meilisearch, Elasticsearch).
owns: SearchPort typedef and assertSearchPort runtime validator.
boundaries: Defines the seam between domain and infrastructure. No adapter-specific logic.
invariants: Contract is stable — changes require a capability-sync rerun and adapter migration.
notesForLLM: Add new methods only via capability-sync; update assertSearchPort in lockstep with the typedef.
specRefs:
  - TPL-001
---

# search-port.mjs
