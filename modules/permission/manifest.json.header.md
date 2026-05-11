---
fileId: contextrail-template:modules:permission:manifest.json.header
module: modules/permission
stability: evolving
steward: shared
api: Documentation
boundedContext: permission
dependsOn: modules/permission/manifest.json
summary: Sidecar header for the permission module manifest.
owns: Documentation for modules/permission/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Keep this sidecar aligned with modules/permission/manifest.json.header.md; do not invent a second sidecar convention.
linkedDocs: modules/permission/README.md
---

# manifest.json
