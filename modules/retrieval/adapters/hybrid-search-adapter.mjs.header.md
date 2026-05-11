---
fileId: contextrail-template:modules:retrieval:adapters:hybrid-search-adapter
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: retrieval
summary: Hybrid search adapter for the retrieval module. Combines sparse and dense scores.
owns: The Hybrid Search adapter implementation for the retrieval module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: "Wraps underlying sparse + dense adapters; tune fusion weights through the port contract, not inside this file."
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
implementsPort: retrieval-port
runtimeEnvironment: universal
---

# hybrid-search-adapter.mjs
