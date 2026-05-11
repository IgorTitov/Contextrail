---
fileId: contextrail-template:docs:prd:rag-extensions
module: docs/prd
stability: evolving
steward: shared
api: PRD document
dependsOn:
  - docs/prd/index.md
  - docs/backlog/index.md
  - docs/prd/retrieval.md
summary: Define the umbrella PRD for the RAG Extensions epic that adds pluggable chunking strategies, tokenizer and embedder ports, hybrid search with re-ranking, a knowledge-graph module, and document loaders with query pipeline to the retrieval infrastructure.
owns: The requirement intent for the RAG Extensions epic (Slices 13-17).
boundaries: This file owns requirement intent and acceptance boundaries for RAG extensions. It does not own execution status (backlog) or workflow decomposition (USM). USM is intentionally skipped because this is technical/architectural infrastructure.
invariants: Each deliverable is independently implementable as a backlog slice. Acceptance boundaries are testable. New ports and adapters must follow the hex architecture pattern. The retrieval module remains standalone. The knowledge-graph module is a new standalone hex module.
risks: Drift here can decouple the extension requirements from the backlog slices that implement them, or allow cross-module boundary violations between retrieval, knowledge-graph, and other modules.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: This is the umbrella PRD for RAG extensions across Slices 13-17. This is technical/architectural work -- no USM required. The existing retrieval module (Slice 11) is the foundation. Slice 13 adds ChunkerPort with pluggable strategies. Slice 14 adds TokenizerPort and EmbedderPort. Slice 15 adds hybrid search and re-ranking. Slice 16 creates a new knowledge-graph hex module. Slice 17 adds document loaders and query pipeline. All error messages must go through the i18n layer. No external npm dependencies unless explicitly noted.
tests:
  - node scripts/checks/product-docs-check.mjs
  - node scripts/checks/pre-impl-gate.mjs
linkedDocs:
  - docs/prd/index.md
  - docs/backlog/rag-extensions.md
  - docs/prd/retrieval.md
specRefs: TPL-097
related:
  - docs/prd/retrieval.md
  - docs/prd/local-llm.md
  - docs/prd/ai-chat.md
---

# rag-extensions.md
