---
fileId: contextrail-template:tests:unit:search
module: tests/unit
stability: evolving
steward: shared
api: Tests
boundedContext: search
summary: Unit proofs for the search module — tokenizer, document, scoring, filters, highlights.
owns: Test cases covering pure domain functions and the in-memory adapter behavior.
boundaries: Imports from the search public-api only. No deep imports into domain/ports/adapters.
invariants: Deterministic — injectable clock and stable ordering for paged results.
notesForLLM: Add new cases here before changing the search public API; keep assertions narrow.
specRefs:
  - TPL-001
---

# search.test.mjs
