---
fileId: contextrail-template:modules:event-bus:manifest.json.header
module: modules/event-bus
stability: evolving
steward: shared
api: Documentation
boundedContext: event-bus
dependsOn: modules/event-bus/manifest.json
summary: Sidecar header for the event-bus module manifest.
owns: Documentation for modules/event-bus/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Keep this sidecar aligned with modules/event-bus/manifest.json.header.md; do not invent a second sidecar convention.
linkedDocs: modules/event-bus/README.md
---

# manifest.json
