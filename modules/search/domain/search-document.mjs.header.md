---
fileId: contextrail-template:modules:search:search-document
module: modules/search
stability: evolving
steward: shared
api: Domain
boundedContext: search
summary: Pure search-document domain — validates shape and returns canonical SearchDocument.
owns: createSearchDocument, documentText, SearchDocument/SearchHit/SearchResult typedefs.
boundaries: Stays inside the search bounded context. No I/O, no imports from adapters/.
invariants: Pure functions only. All errors use i18n keys from messages.mjs.
notesForLLM: Domain stays framework-free. Do not import from adapters/ or infrastructure.
specRefs:
  - TPL-001
---

# search-document.mjs
