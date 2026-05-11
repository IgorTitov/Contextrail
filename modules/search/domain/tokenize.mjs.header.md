---
fileId: contextrail-template:modules:search:tokenize
module: modules/search
stability: evolving
steward: shared
api: Domain
boundedContext: search
summary: Pure tokenizer — Unicode-safe lowercase split with stop-word filtering.
owns: tokenize, defaultStopWords.
boundaries: Pure string function. No I/O, no imports from adapters/.
invariants: Unicode-aware via \p{L}\p{N}; stop-word list is injectable; returns a fresh array.
notesForLLM: Callers that need stemming or fuzzy matching should compose on top of tokenize, not modify it.
specRefs:
  - TPL-001
---

# tokenize.mjs
