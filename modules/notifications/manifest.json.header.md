---
fileId: contextrail-template:modules:notifications:manifest.json.header
module: modules/notifications
stability: evolving
steward: shared
api: Documentation
boundedContext: notifications
dependsOn: modules/notifications/manifest.json
summary: Sidecar header for the notifications module manifest.
owns: Documentation for modules/notifications/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Keep this sidecar aligned with modules/notifications/manifest.json.header.md; do not invent a second sidecar convention.
linkedDocs: modules/notifications/README.md
---

# manifest.json
