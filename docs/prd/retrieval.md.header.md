---
fileId: contextrail-template:docs:prd:retrieval
module: docs/prd
stability: evolving
steward: shared
api: PRD document
dependsOn:
  - docs/prd/index.md
  - docs/backlog/index.md
summary: Define the umbrella PRD for the RAG Retrieval hex module that provides in-browser retrieval-augmented generation with RetrievalPort, text chunker, BM25 adapter, vector-local adapter, and augmentPrompt pipeline.
owns: The requirement intent for the RAG Retrieval module epic.
boundaries: This file owns requirement intent and acceptance boundaries for the retrieval module. It does not own execution status (backlog) or workflow decomposition (USM). USM is intentionally skipped because this is technical/architectural infrastructure.
invariants: Each deliverable is independently implementable as a backlog slice. Acceptance boundaries are testable. The module must not break existing starter features or hex boundaries. The module must remain fully standalone with no cross-module imports.
risks: Drift here can decouple the retrieval requirements from the backlog slices that implement them, or allow the module to bypass hex architecture conventions.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: This is the umbrella PRD for the retrieval hex module. This is technical/architectural work -- no USM required. Individual backlog slices reference this document for requirement intent. Slice 11 items are TPL-087 through TPL-092. All user-facing error messages must go through the i18n layer. The module is fully standalone and does NOT import from ai-chat, local-llm, or any other module. BM25 and cosine similarity are implemented from first principles with no external dependencies.
tests:
  - node scripts/checks/product-docs-check.mjs
  - node scripts/checks/pre-impl-gate.mjs
linkedDocs:
  - docs/prd/index.md
  - docs/backlog/retrieval.md
specRefs: TPL-086
related:
  - docs/prd/ai-chat.md
  - docs/prd/local-llm.md
---

# retrieval.md
