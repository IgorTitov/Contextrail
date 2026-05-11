---
fileId: contextrail-template:modules:retrieval:adapters:multi-query-transformer
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: retrieval
summary: Multi-query expansion transformer adapter for the retrieval module.
owns: The Multi Query Transformer adapter implementation for the retrieval module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Expands a single query into several reformulations. Improves recall at the cost of more retrieval work.
allowedDependencies:
  - "../ports/*"
  - "../types.*"
  - ./
  - "frameworks as needed (react, express, node: builtins)"
forbiddenDependencies:
  - "../domain/**"
  - "../application/**"
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/adapters/**"
adapterType: infrastructure
linkedDocs: modules/retrieval/adapters/README.md
---

# multi-query-transformer.mjs
