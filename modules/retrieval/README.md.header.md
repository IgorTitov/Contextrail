---
fileId: contextrail-template:modules:retrieval:README
module: modules/retrieval
stability: evolving
steward: shared
api: Documentation
boundedContext: retrieval
dependsOn:
  - modules/retrieval/public-api.mjs
  - modules/retrieval/ports/retrieval-port.mjs
  - modules/retrieval/adapters/bm25-adapter.mjs
  - modules/retrieval/adapters/vector-local-adapter.mjs
  - modules/retrieval/domain/chunker.mjs
  - modules/retrieval/domain/augment-prompt.mjs
owns: "Human-readable orientation for the retrieval bounded module: purpose, key exports, and structural layout."
boundaries: Must not duplicate implementation details already clear from file headers; must not describe infrastructure concerns that belong in adapter files.
invariants: Must stay aligned with the actual public-api.mjs exports and module folder structure.
risks: Stale descriptions mislead agents about which adapters or types exist; omitting the no-external-dependencies constraint causes incorrect assumptions about runtime requirements.
notesForLLM: The module's only permitted entry point for external consumers is public-api.mjs. Both adapters are pure JS with no external dependencies. Embedding is a separate concern — the vector adapter accepts pre-computed embeddings but does not embed text itself.
tests: _n/a_
linkedDocs: docs/prd/retrieval.md
specRefs:
  - TPL-086
  - TPL-087
related: modules/retrieval/public-api.mjs
summary: Overview and navigation guide for the retrieval hex module.
---

# README.md
