---
fileId: contextrail-template:modules:retrieval:manifest.json.header
module: modules/retrieval
stability: evolving
steward: shared
api: Documentation
boundedContext: retrieval
dependsOn: modules/retrieval/manifest.json
summary: Document modules/retrieval/manifest.json.header.md because inline comments are unsafe or undesirable.
owns: Documentation for modules/retrieval/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Keep this sidecar aligned with modules/retrieval/manifest.json.header.md; do not invent a second sidecar convention.
specRefs:
  - TPL-087
  - TPL-088
linkedDocs: modules/retrieval/README.md
---

# manifest.json
