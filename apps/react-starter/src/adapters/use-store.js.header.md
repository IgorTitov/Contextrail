---
fileId: contextrail-template:apps:react-starter:src:adapters:use-store
module: apps/react-starter
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
summary: Store adapter hook for the react-starter React app.
owns: React hook bridging the store hex module to React components.
boundaries: Adapter layer only. Wraps hex module API in React hook conventions.
invariants: Must delegate to hex module public API. No direct infrastructure access.
notesForLLM: React adapter hook. Bridges hex modules to the React component layer.
---

# use-store.js
