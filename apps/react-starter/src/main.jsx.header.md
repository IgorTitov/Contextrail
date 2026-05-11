---
fileId: contextrail-template:apps:react-starter:src:main
module: apps/react-starter
stability: evolving
steward: shared
api: file-local
summary: Main entry point for the react-starter application.
owns: Application bootstrap and wiring for the react-starter app.
boundaries: App-layer orchestration only. Business logic lives in hex modules.
invariants: Must wire hex module adapters and expose the app's public surface.
notesForLLM: Main entry point. Wires hex module adapters into the application context.
---

# main.jsx
