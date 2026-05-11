---
fileId: contextrail-template:modules:retrieval:adapters:echo-embedder
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: retrieval
summary: Echo/passthrough adapter for the retrieval module. Returns synthetic deterministic responses.
owns: The Echo Embedder adapter implementation for the retrieval module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Test and development use. Exercises the port contract without calling real infrastructure.
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
adapterType: test-stub
linkedDocs: modules/retrieval/adapters/README.md
---

# echo-embedder.mjs
