---
fileId: contextrail-template:modules:analytics:manifest.json.header
module: modules/analytics
stability: evolving
steward: shared
api: Documentation
boundedContext: analytics
dependsOn: modules/analytics/manifest.json
summary: Sidecar header for the analytics module manifest.
owns: Documentation for modules/analytics/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Keep this sidecar aligned with modules/analytics/manifest.json.header.md; do not invent a second sidecar convention.
linkedDocs: modules/analytics/README.md
---

# manifest.json
