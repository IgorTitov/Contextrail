---
fileId: contextrail-template:apps:api-starter:app
module: apps/api-starter
stability: evolving
steward: shared
api: file-local
summary: Main entry point for the api-starter application.
owns: Application bootstrap and wiring for the api-starter app.
boundaries: App-layer orchestration only. Business logic lives in hex modules.
invariants: Must wire hex module adapters and expose the app's public surface.
notesForLLM: Main entry point. Wires hex module adapters into the application context.
---

# app.mjs
