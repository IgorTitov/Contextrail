---
fileId: contextrail-template:modules:task:manifest.json.header
module: modules/task
stability: evolving
steward: shared
api: Documentation
boundedContext: task
dependsOn: modules/task/manifest.json
summary: Sidecar header for the task module manifest.
owns: Documentation for modules/task/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Keep this sidecar aligned with modules/task/manifest.json.header.md; do not invent a second sidecar convention.
linkedDocs: modules/task/README.md
---

# manifest.json
