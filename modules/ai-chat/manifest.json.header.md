---
fileId: contextrail-template:modules:ai-chat:manifest.json.header
module: modules/ai-chat
stability: evolving
steward: shared
api: Documentation
boundedContext: ai-chat
dependsOn: modules/ai-chat/manifest.json
summary: Sidecar header for the ai-chat module manifest.
owns: Documentation for modules/ai-chat/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Keep this sidecar aligned with modules/ai-chat/manifest.json.header.md; do not invent a second sidecar convention.
linkedDocs: modules/ai-chat/README.md
---

# manifest.json
