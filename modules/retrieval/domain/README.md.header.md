---
fileId: contextrail-template:modules:retrieval:domain:README
module: modules/retrieval
stability: evolving
steward: shared
api: Documentation
hexLayer: domain
boundedContext: retrieval
dependsOn:
  - modules/retrieval/domain/chunker.mjs
  - modules/retrieval/domain/augment-prompt.mjs
owns: "Human-readable orientation for the domain layer: pure text-processing utilities with no external dependencies."
boundaries: Domain files must remain framework-free and must not import from adapters or browser APIs.
invariants: Must stay aligned with actual exports from chunker.mjs and augment-prompt.mjs.
risks: Stale descriptions mislead agents about chunker overlap behavior or prompt template substitution conventions.
notesForLLM: Both domain files are pure functions with no side effects and no imports from adapters. Chunker uses character-level sliding window with configurable overlap. augmentPrompt sorts results by score descending and truncates to maxContextLength.
tests: _n/a_
linkedDocs: docs/prd/retrieval.md
specRefs:
  - TPL-088
  - TPL-091
related:
  - modules/retrieval/domain/chunker.mjs
  - modules/retrieval/domain/augment-prompt.mjs
summary: Directory overview for the domain layer of the retrieval module.
---

# README.md
