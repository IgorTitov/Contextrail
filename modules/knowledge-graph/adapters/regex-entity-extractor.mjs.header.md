---
fileId: contextrail-template:modules:knowledge-graph:adapters:regex-entity-extractor
module: modules/knowledge-graph
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: knowledge-graph
summary: Regex-based entity extractor adapter for the knowledge-graph module.
owns: The Regex Entity Extractor adapter implementation for the knowledge-graph module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Cheap and deterministic. Good starting baseline; swap in an NLP adapter when recall matters.
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
linkedDocs: modules/knowledge-graph/adapters/README.md
---

# regex-entity-extractor.mjs
