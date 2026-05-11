---
fileId: contextrail-template:docs:prd:ai-chat
module: docs/prd
stability: evolving
steward: shared
api: PRD document
dependsOn:
  - docs/prd/index.md
  - docs/backlog/index.md
summary: Define the umbrella PRD for the AI Chat hex module that provides a port-based AI chat abstraction with pluggable adapters, message history management, and a starter UI panel.
owns: The requirement intent for the AI Chat Port + UI module epic.
boundaries: This file owns requirement intent and acceptance boundaries for the ai-chat module. It does not own execution status (backlog) or workflow decomposition (USM). USM is intentionally skipped because the module is technical/architectural infrastructure and the starter UI is a template demonstration component.
invariants: Each deliverable is independently implementable as a backlog slice. Acceptance boundaries are testable. The module must not break existing starter features or hex boundaries.
risks: Drift here can decouple the ai-chat requirements from the backlog slices that implement them, or allow the module to bypass hex architecture conventions.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials. The HTTP API adapter communicates with external AI services -- production use requires proper security review for API key handling and data transmission.
notesForLLM: This is the umbrella PRD for the ai-chat hex module. This is mixed technical/architectural + UI work -- no USM required. Individual backlog slices reference this document for requirement intent. Slice 9 items are TPL-072 through TPL-078. All user-facing error messages and UI copy must go through the i18n layer. The http-api adapter depends on the api-client module but imports only through that module's public-api.mjs.
tests:
  - node scripts/checks/product-docs-check.mjs
  - node scripts/checks/pre-impl-gate.mjs
linkedDocs:
  - docs/prd/index.md
  - docs/backlog/ai-chat.md
specRefs: TPL-071
related:
  - docs/prd/auth-api-client.md
  - docs/prd/event-bus-state.md
  - docs/prd/feature-seams.md
---

# ai-chat.md
