---
fileId: contextrail-template:modules:knowledge-graph:adapters:cooccurrence-relationship-extractor
module: modules/knowledge-graph
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: knowledge-graph
summary: Co-occurrence relationship extractor adapter for the knowledge-graph module.
owns: The Cooccurrence Relationship Extractor adapter implementation for the knowledge-graph module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Derives edges from entity co-occurrence within a window. Good zero-shot baseline for relationship discovery.
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

# cooccurrence-relationship-extractor.mjs
