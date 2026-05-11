---
fileId: contextrail-template:modules:user-preferences:manifest.json.header
module: modules/user-preferences
stability: evolving
steward: shared
api: Documentation
boundedContext: user-preferences
dependsOn: modules/user-preferences/manifest.json
summary: Sidecar header for the user-preferences module manifest.
owns: Documentation for modules/user-preferences/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Keep this sidecar aligned with modules/user-preferences/manifest.json.header.md; do not invent a second sidecar convention.
linkedDocs: modules/user-preferences/README.md
---

# manifest.json
