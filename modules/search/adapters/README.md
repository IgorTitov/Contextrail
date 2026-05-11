<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for search/adapters.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# modules/search/adapters/

Concrete SearchPort adapters. Ships an in-memory inverted-index adapter (`createMemorySearchAdapter`) for tests and dev. SQLite FTS5, Meilisearch, Elasticsearch, Typesense and other adapters can plug in behind the same port without changing callers.
