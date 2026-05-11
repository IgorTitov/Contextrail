---
fileId: contextrail-template:modules:onboarding:manifest.json.header
module: modules/onboarding
stability: evolving
steward: shared
api: Documentation
boundedContext: onboarding
dependsOn: modules/onboarding/manifest.json
summary: Sidecar header for the onboarding module manifest.
owns: Documentation for modules/onboarding/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Keep this sidecar aligned with modules/onboarding/manifest.json.header.md; do not invent a second sidecar convention.
linkedDocs: modules/onboarding/README.md
---

# manifest.json
