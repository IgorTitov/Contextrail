---
fileId: contextrail-template:modules:knowledge-graph:README
module: modules/knowledge-graph
stability: evolving
steward: shared
api: Documentation
boundedContext: knowledge-graph
dependsOn:
  - modules/knowledge-graph/public-api.mjs
  - modules/knowledge-graph/ports/graph-store-port.mjs
  - modules/knowledge-graph/ports/entity-extractor-port.mjs
  - modules/knowledge-graph/adapters/memory-graph-adapter.mjs
  - modules/knowledge-graph/adapters/regex-entity-extractor.mjs
  - modules/knowledge-graph/adapters/cooccurrence-relationship-extractor.mjs
  - modules/knowledge-graph/domain/graph-algorithms.mjs
owns: "Human-readable orientation for the knowledge-graph bounded module: purpose, key exports, and structural layout."
boundaries: Must not duplicate implementation details already clear from file headers; must not describe infrastructure concerns.
invariants: Must stay aligned with the actual public-api.mjs exports and module folder structure.
risks: Stale descriptions if adapters or algorithms are added without updating this README.
notesForLLM: This module has no cross-module dependencies. It composes with retrieval to form a full GraphRAG pipeline. See docs/module-catalog.md for the composed use case.
tests: _n/a_
linkedDocs: docs/module-catalog.md
specRefs: TPL-121
related:
  - modules/knowledge-graph/public-api.mjs
  - modules/retrieval/README.md
summary: Overview and navigation guide for the knowledge-graph hex module.
---

# README.md
