---
fileId: contextrail-template:modules:subscription:default-adapter
module: modules/subscription
stability: evolving
steward: shared
api: "Adapter"
boundedContext: subscription
summary: Default adapter for the subscription module.
owns: Default adapter for the subscription module.
boundaries: Stays inside the subscription bounded context. Do not couple to other modules' internals.
invariants: Implements a port contract; isolates infrastructure.
notesForLLM: Replace the placeholder with a real implementation. Adapters isolate infrastructure; the domain must not import this file.
specRefs:
  - TPL-001
---

# default-adapter.mjs
