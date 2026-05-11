---
fileId: contextrail-template:modules:api-client:manifest.json.header
module: modules/api-client
stability: evolving
steward: shared
api: Documentation
boundedContext: api-client
dependsOn: modules/api-client/manifest.json
summary: Sidecar header for the api-client module manifest.
owns: Documentation for modules/api-client/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Keep this sidecar aligned with modules/api-client/manifest.json.header.md; do not invent a second sidecar convention.
linkedDocs: modules/api-client/README.md
---

# manifest.json
