---
fileId: contextrail-template:modules:scheduler:manifest.json.header
module: modules/scheduler
stability: evolving
steward: shared
api: Documentation
boundedContext: scheduler
dependsOn: modules/scheduler/manifest.json
summary: Sidecar header for the scheduler module manifest.
owns: Documentation for modules/scheduler/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Keep this sidecar aligned with modules/scheduler/manifest.json.header.md; do not invent a second sidecar convention.
linkedDocs: modules/scheduler/README.md
---

# manifest.json
