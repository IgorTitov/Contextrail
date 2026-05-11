---
fileId: contextrail-template:apps:starter:layout:layout
module: apps/starter
stability: evolving
steward: shared
api: file-local
summary: Layout for the starter app.
owns: Layout within the starter application.
boundaries: Scoped to the starter app layer. Business logic lives in hex modules.
invariants: Must use hex module public APIs for cross-module access.
notesForLLM: Part of the starter app. Uses hex module adapters for business logic.
---

# layout.mjs
