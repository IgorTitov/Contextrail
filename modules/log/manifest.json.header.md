---
fileId: contextrail-template:modules:log:manifest.json.header
module: modules/log
stability: evolving
steward: shared
api: Documentation
boundedContext: log
dependsOn: modules/log/manifest.json
summary: Sidecar header for the log module manifest.
owns: Documentation for modules/log/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Keep this sidecar aligned with modules/log/manifest.json.header.md; do not invent a second sidecar convention.
linkedDocs: modules/log/README.md
---

# manifest.json
