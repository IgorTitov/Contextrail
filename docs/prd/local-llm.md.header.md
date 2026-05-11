---
fileId: contextrail-template:docs:prd:local-llm
module: docs/prd
stability: evolving
steward: shared
api: PRD document
dependsOn:
  - docs/prd/index.md
  - docs/backlog/index.md
  - docs/prd/ai-chat.md
summary: Define the umbrella PRD for the Local LLM hex module that provides in-browser LLM adapters conforming to AiChatPort, with model loading lifecycle management and browser-based model caching.
owns: The requirement intent for the In-Browser LLM module epic.
boundaries: This file owns requirement intent and acceptance boundaries for the local-llm module. It does not own execution status (backlog) or workflow decomposition (USM). USM is intentionally skipped because this is technical/architectural infrastructure extending the ai-chat pattern.
invariants: Each deliverable is independently implementable as a backlog slice. Acceptance boundaries are testable. The module must not break existing starter features or hex boundaries. Adapters must dynamically import their backing libraries.
risks: Drift here can decouple the local-llm requirements from the backlog slices that implement them, or allow the module to bypass hex architecture conventions. Runtime library availability is not guaranteed and must be checked gracefully.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials. Models are downloaded from external sources at runtime -- production use requires proper security review for model provenance and data privacy (inference runs locally, but model downloads traverse the network).
notesForLLM: This is the umbrella PRD for the local-llm hex module. This is mixed technical/architectural work -- no USM required. Individual backlog slices reference this document for requirement intent. Slice 10 items are TPL-080 through TPL-085. All user-facing error messages and UI copy must go through the i18n layer. The module dynamically imports WebLLM and Transformers.js -- it does NOT bundle these libraries or any ML models. The local-llm adapters conform to AiChatPort from the ai-chat module but are defined in their own bounded module.
tests:
  - node scripts/checks/product-docs-check.mjs
  - node scripts/checks/pre-impl-gate.mjs
linkedDocs:
  - docs/prd/index.md
  - docs/backlog/local-llm.md
  - docs/prd/ai-chat.md
specRefs: TPL-079
related:
  - docs/prd/ai-chat.md
  - docs/prd/feature-seams.md
  - docs/prd/event-bus-state.md
---

# local-llm.md
