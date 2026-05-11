---
fileId: contextrail-template:modules:local-llm:manifest.json.header
module: modules/local-llm
stability: evolving
steward: shared
api: Documentation
boundedContext: local-llm
dependsOn: modules/local-llm/manifest.json
summary: Sidecar header for the local-llm module manifest.
owns: Documentation for modules/local-llm/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Keep this sidecar aligned with modules/local-llm/manifest.json.header.md; do not invent a second sidecar convention.
linkedDocs: modules/local-llm/README.md
---

# manifest.json
