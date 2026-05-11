---
fileId: contextrail-template:modules:realtime:manifest.json.header
module: modules/realtime
stability: evolving
steward: shared
api: Documentation
boundedContext: realtime
dependsOn: modules/realtime/manifest.json
summary: Sidecar header for the realtime module manifest.
owns: Documentation for modules/realtime/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Keep this sidecar aligned with modules/realtime/manifest.json.header.md; do not invent a second sidecar convention.
linkedDocs: modules/realtime/README.md
---

# manifest.json
