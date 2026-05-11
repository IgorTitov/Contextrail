---
fileId: contextrail-template:modules:openapi:manifest.json.header
module: modules/openapi
stability: evolving
steward: shared
api: Documentation
boundedContext: openapi
dependsOn: modules/openapi/manifest.json
summary: Sidecar header for the openapi module manifest.
owns: Documentation for modules/openapi/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Keep this sidecar aligned with modules/openapi/manifest.json.header.md; do not invent a second sidecar convention.
linkedDocs: modules/openapi/README.md
specRefs:
  - TPL-001
---

# manifest.json
