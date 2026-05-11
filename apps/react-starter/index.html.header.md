---
fileId: contextrail-template:apps:react-starter:index
module: apps/react-starter
stability: evolving
steward: shared
api: file-local
summary: HTML entry point for the react-starter app.
owns: The HTML shell for the react-starter application.
boundaries: HTML structure only. Behavior lives in JS modules.
invariants: Must load the app's main JS module and reference the UI selector registry.
notesForLLM: HTML entry point. DOM hooks should come from the UI selector registry.
---

# index.html
