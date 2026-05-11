---
fileId: contextrail-template:apps:api-starter:app-config
module: apps/api-starter
stability: evolving
steward: shared
api: file-local
summary: Configuration management for the api-starter application.
owns: Mode detection, config resolution, and environment setup for api-starter.
boundaries: Configuration only. No business logic or request handling.
invariants: Must export MODES, detectMode, getMode, setMode, resolveConfig, resetConfig.
notesForLLM: App config module. Used by app.mjs to wire the correct mode and settings.
---

# app-config.mjs
