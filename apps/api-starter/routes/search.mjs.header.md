---
fileId: contextrail-template:apps:api-starter:routes:search
module: apps/api-starter/routes
stability: evolving
steward: shared
api: Route
boundedContext: api-starter
summary: Search demo routes — index a document and run full-text queries against the in-memory adapter.
owns: seedSearchIndex, searchQueryHandler, searchIndexHandler.
boundaries: App-layer route handlers. Import only from the search public-api.
invariants: Handlers stay thin — all scoring/filtering lives inside modules/search.
notesForLLM: Seed data ships with the starter so the query route returns hits out of the box.
specRefs:
  - TPL-001
  - TPL-177
---

# search.mjs
