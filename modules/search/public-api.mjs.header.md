---
fileId: contextrail-template:modules:search:public-api
module: modules/search
stability: evolving
steward: shared
api: Public API
boundedContext: search
summary: Single cross-module entry point for the search module.
owns: Re-exports of domain, port assertion, adapters, and messages.
boundaries: Only file in modules/search other modules may import. Deep imports into domain/ports/adapters are forbidden.
invariants: Every export is stable across minor versions. Additions require capability-sync rerun.
notesForLLM: Add new exports here only after they exist in domain/ports/adapters; never inline implementations.
linkedDocs: modules/search/README.md
specRefs:
  - TPL-001
exports:
  - assertSearchPort
  - createMemorySearchAdapter
  - createSearchDocument
  - defaultStopWords
  - documentText
  - getLocale
  - highlightMatches
  - registerLocale
  - resetLocale
  - setLocale
  - t
  - tokenize
---

# public-api.mjs
