---
fileId: contextrail-template:modules:form-validation:manifest.json.header
module: modules/form-validation
stability: evolving
steward: shared
api: Documentation
boundedContext: form-validation
dependsOn: modules/form-validation/manifest.json
summary: Sidecar header for the form-validation module manifest.
owns: Documentation for modules/form-validation/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Keep this sidecar aligned with modules/form-validation/manifest.json.header.md; do not invent a second sidecar convention.
linkedDocs: modules/form-validation/README.md
---

# manifest.json
