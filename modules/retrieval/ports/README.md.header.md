---
fileId: contextrail-template:modules:retrieval:ports:README
module: modules/retrieval
stability: evolving
steward: shared
api: Documentation
hexLayer: port
boundedContext: retrieval
dependsOn: modules/retrieval/ports/retrieval-port.mjs
owns: "Human-readable orientation for the ports layer: the RetrievalPort contract and what adapters must implement."
boundaries: Must not duplicate implementation details already clear from retrieval-port.mjs header.
invariants: Must stay aligned with the method list required by assertRetrievalPort.
risks: Stale method lists mislead adapter authors about required contract surface.
notesForLLM: The RetrievalPort requires addDocuments, search, removeDocuments, and clear. All adapters must satisfy assertRetrievalPort to be valid.
tests: _n/a_
linkedDocs: docs/prd/retrieval.md
specRefs: TPL-087
related:
  - modules/retrieval/ports/retrieval-port.mjs
  - modules/retrieval/adapters/README.md
summary: Directory overview for the ports layer of the retrieval module.
---

# README.md
