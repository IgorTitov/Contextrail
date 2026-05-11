---
fileId: contextrail-template:modules:knowledge-graph:messages
module: modules/knowledge-graph
stability: evolving
steward: shared
api: file-local
boundedContext: knowledge-graph
summary: i18n message registry for the knowledge-graph module.
owns: All user-facing text for the knowledge-graph module.
boundaries: Message key-value definitions only. No business logic.
invariants: Every user-facing string in the knowledge-graph module must come from this registry.
notesForLLM: i18n layer for knowledge-graph. Add new user-facing strings here, not inline in code.
specRefs:
  - TPL-114
  - TPL-121
messageKeys:
  - kg.error.graph_store_port_not_object
  - kg.error.graph_store_port_missing_method
  - kg.error.entity_extractor_port_not_object
  - kg.error.entity_extractor_port_missing_method
  - kg.error.relationship_extractor_port_not_object
  - kg.error.relationship_extractor_port_missing_method
linkedDocs: modules/knowledge-graph/README.md
---

# messages.mjs
