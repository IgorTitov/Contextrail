---
fileId: contextrail-template:modules:rate-limit:default-adapter
module: modules/rate-limit
stability: evolving
steward: shared
api: "Adapter"
boundedContext: rate-limit
summary: Default adapter for the rate-limit module.
owns: Default adapter for the rate-limit module.
boundaries: Stays inside the rate-limit bounded context. Do not couple to other modules' internals.
invariants: Implements a port contract; isolates infrastructure.
notesForLLM: Replace the placeholder with a real implementation. Adapters isolate infrastructure; the domain must not import this file.
specRefs:
  - TPL-001
---

# default-adapter.mjs
