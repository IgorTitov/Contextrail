---
fileId: contextrail-template:modules:cache:manifest.json.header
module: modules/cache
stability: evolving
steward: shared
api: Documentation
boundedContext: cache
dependsOn: modules/cache/manifest.json
summary: Sidecar header for the cache module manifest.
owns: Documentation for modules/cache/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Keep this sidecar aligned with modules/cache/manifest.json.header.md; do not invent a second sidecar convention.
linkedDocs: modules/cache/README.md
---

# manifest.json
