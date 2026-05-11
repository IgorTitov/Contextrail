---
fileId: contextrail-template:modules:file:manifest.json.header
module: modules/file
stability: evolving
steward: shared
api: Documentation
boundedContext: file
dependsOn: modules/file/manifest.json
summary: Sidecar header for the file module manifest.
owns: Documentation for modules/file/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Keep this sidecar aligned with modules/file/manifest.json.header.md; do not invent a second sidecar convention.
linkedDocs: modules/file/README.md
---

# manifest.json
