---
fileId: contextrail-template:modules:i18n:manifest.json.header
module: modules/i18n
stability: evolving
steward: shared
api: Documentation
boundedContext: i18n
dependsOn: modules/i18n/manifest.json
summary: Sidecar header for the i18n module manifest.
owns: Documentation for modules/i18n/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Keep this sidecar aligned with modules/i18n/manifest.json.header.md; do not invent a second sidecar convention.
linkedDocs: modules/i18n/README.md
---

# manifest.json
