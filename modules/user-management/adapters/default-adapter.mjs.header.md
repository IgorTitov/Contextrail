---
fileId: contextrail-template:modules:user-management:default-adapter
module: modules/user-management
stability: evolving
steward: shared
api: "Adapter"
boundedContext: user-management
summary: Default adapter for the user-management module.
owns: Default adapter for the user-management module.
boundaries: Stays inside the user-management bounded context. Do not couple to other modules' internals.
invariants: Implements a port contract; isolates infrastructure.
notesForLLM: Replace the placeholder with a real implementation. Adapters isolate infrastructure; the domain must not import this file.
specRefs:
  - TPL-001
---

# default-adapter.mjs
