---
fileId: contextrail-template:apps:starter:theme-toggle:theme-toggle
module: apps/starter
stability: evolving
steward: shared
api: file-local
summary: Theme Toggle for the starter app.
owns: Theme Toggle within the starter application.
boundaries: Scoped to the starter app layer. Business logic lives in hex modules.
invariants: Must use hex module public APIs for cross-module access.
notesForLLM: Part of the starter app. Uses hex module adapters for business logic.
---

# theme-toggle.mjs
