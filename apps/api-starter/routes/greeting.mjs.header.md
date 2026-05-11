---
fileId: contextrail-template:apps:api-starter:routes:greeting
module: apps/api-starter
stability: evolving
steward: shared
api: file-local
summary: Greeting route handler for the api-starter API.
owns: HTTP handler for the greeting endpoint in api-starter.
boundaries: Route handling only. Business logic lives in hex modules.
invariants: Must accept (req, ctx) and return a response. Must use ctx adapters, not direct infra.
notesForLLM: Route handler. Uses app context adapters for caching, logging, and data access.
---

# greeting.mjs
