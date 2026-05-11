---
fileId: contextrail-template:modules:knowledge-graph:manifest.json.header
module: modules/knowledge-graph
stability: evolving
steward: shared
api: Documentation
boundedContext: knowledge-graph
dependsOn: modules/knowledge-graph/manifest.json
summary: Sidecar header for the knowledge-graph module manifest.
owns: Documentation for modules/knowledge-graph/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Keep this sidecar aligned with modules/knowledge-graph/manifest.json.header.md; do not invent a second sidecar convention.
linkedDocs: modules/knowledge-graph/README.md
---

# manifest.json
