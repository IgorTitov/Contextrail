---
fileId: contextrail-template:modules:feature-seams:manifest.json.header
module: modules/feature-seams
stability: evolving
steward: shared
api: Documentation
boundedContext: feature-seams
dependsOn: modules/feature-seams/manifest.json
summary: Sidecar header for the feature-seams module manifest.
owns: Documentation for modules/feature-seams/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Keep this sidecar aligned with modules/feature-seams/manifest.json.header.md; do not invent a second sidecar convention.
linkedDocs: modules/feature-seams/README.md
---

# manifest.json
