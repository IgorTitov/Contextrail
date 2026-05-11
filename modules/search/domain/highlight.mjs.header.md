---
fileId: contextrail-template:modules:search:highlight
module: modules/search
stability: evolving
steward: shared
api: Domain
boundedContext: search
summary: Pure highlight helper — wraps query tokens in <mark> with word-boundary matching.
owns: highlightMatches.
boundaries: Pure string function. No I/O, no imports from adapters/.
invariants: Case-insensitive match; original casing preserved; non-word boundaries enforced so partial matches are not highlighted.
notesForLLM: Output is intended for HTML; callers emitting to other media should post-process.
specRefs:
  - TPL-001
---

# highlight.mjs
