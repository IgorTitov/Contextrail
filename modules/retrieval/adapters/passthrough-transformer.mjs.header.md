---
fileId: contextrail-template:modules:retrieval:adapters:passthrough-transformer
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: retrieval
summary: Passthrough query transformer adapter for the retrieval module. Returns the query unchanged.
owns: The Passthrough Transformer adapter implementation for the retrieval module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Default transformer. Use when no rewriting or expansion is desired.
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

# passthrough-transformer.mjs
