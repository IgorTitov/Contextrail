---
fileId: contextrail-template:modules:user-management:user-management
module: modules/user-management
stability: evolving
steward: shared
api: "Domain"
boundedContext: user-management
summary: Pure domain logic for the user-management module.
owns: Pure domain logic for the user-management module.
boundaries: Stays inside the user-management bounded context. Do not couple to other modules' internals.
invariants: Pure functions only; no IO.
notesForLLM: Domain stays framework-free. Do not import from adapters/ or infrastructure.
specRefs:
  - TPL-001
---

# user-management.mjs
