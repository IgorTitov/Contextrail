---
fileId: contextrail-template:modules:db:manifest.json.header
module: modules/db
stability: evolving
steward: shared
api: Documentation
boundedContext: db
dependsOn: modules/db/manifest.json
summary: Sidecar header for the db module manifest.
owns: Documentation for modules/db/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Keep this sidecar aligned with modules/db/manifest.json.header.md; do not invent a second sidecar convention.
linkedDocs: modules/db/README.md
specRefs:
  - TPL-001
---

# manifest.json
