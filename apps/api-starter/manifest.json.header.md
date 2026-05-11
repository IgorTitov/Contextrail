---
fileId: contextrail-template:apps:api-starter:manifest.json.header
module: apps/api-starter
stability: evolving
steward: shared
api: Documentation
dependsOn: apps/api-starter/manifest.json
summary: Sidecar header for api-starter/manifest.json.
owns: Documentation for apps/api-starter/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Configuration lives in the target file.
invariants: Must stay aligned with manifest.json content.
notesForLLM: Keep this sidecar aligned with apps/api-starter/manifest.json.header.md; do not invent a second sidecar convention.
---

# manifest.json
