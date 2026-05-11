---
fileId: contextrail-template:modules:retrieval:ports:retrieval-port
module: modules/retrieval
stability: evolving
steward: shared
api: module-public
hexLayer: port
portType: inbound
boundedContext: retrieval
dependsOn: modules/retrieval/messages.mjs
owns: RetrievalPort contract definition; assertRetrievalPort runtime validator; REQUIRED_METHODS list; the canonical list of methods every retrieval adapter must implement.
boundaries: Must not contain adapter logic, storage API references, or scoring algorithm code. Must remain the sole shape authority for what constitutes a valid retrieval adapter.
invariants: assertRetrievalPort must check all four required methods; error messages must go through t() from messages.mjs; the REQUIRED_METHODS list must stay in sync with the RetrievalPort interface in types.d.ts.
risks: Adding a new required method to RetrievalPort without updating REQUIRED_METHODS creates a silent validation hole; removing a method breaks all existing adapters silently.
notesForLLM: This is the sole shape authority for the retrieval port contract. assertRetrievalPort throws TypeError with localized messages on failure. The REQUIRED_METHODS list must be kept in sync with the RetrievalPort interface in types.d.ts. Changes here cascade to both adapters.
tests:
  - tests/unit/retrieval.test.mjs
  - tests/contract/retrieval-hex-contract.test.mjs
linkedDocs: docs/prd/retrieval.md
specRefs: TPL-087
related:
  - modules/retrieval/public-api.mjs
  - modules/retrieval/types.d.ts
  - modules/retrieval/adapters/bm25-adapter.mjs
  - modules/retrieval/adapters/vector-local-adapter.mjs
allowedDependencies: modules/retrieval/messages.mjs
summary: Retrieval port contract for the retrieval module.
forbiddenDependencies:
  - "../adapters/**"
  - "../di/**"
  - react
  - express
  - fastify
  - "node:*"
  - fs
  - path
  - "modules/<other>/**"
portCategory: ai-pipeline
contractTests: tests/contract/retrieval-hex-contract.test.mjs
---

# retrieval-port.mjs
