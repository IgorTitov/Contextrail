---
fileId: contextrail-template:modules:search:memory-search-adapter
module: modules/search
stability: evolving
steward: shared
api: Adapter
boundedContext: search
summary: In-memory SearchPort adapter — inverted index with TF×IDF scoring, filters, highlights.
owns: createMemorySearchAdapter — validates through the domain, builds a token->doc postings map, runs ranked queries.
boundaries: Stays inside the search bounded context. Single-process only — not durable across restarts.
invariants: Implements the full SearchPort contract; uses domain tokenize/highlight helpers; clock is injectable.
notesForLLM: Replace with SQLite FTS5, Meilisearch, Elasticsearch, or Typesense adapters behind the same port — callers never change.
specRefs:
  - TPL-001
---

# memory-search-adapter.mjs
