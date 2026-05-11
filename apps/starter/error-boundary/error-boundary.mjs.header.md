---
fileId: contextrail-template:apps:starter:error-boundary:error-boundary
module: apps/starter
stability: evolving
steward: shared
api: file-local
summary: Error Boundary for the starter app.
owns: Error Boundary within the starter application.
boundaries: Scoped to the starter app layer. Business logic lives in hex modules.
invariants: Must use hex module public APIs for cross-module access.
notesForLLM: Part of the starter app. Uses hex module adapters for business logic.
---

# error-boundary.mjs
