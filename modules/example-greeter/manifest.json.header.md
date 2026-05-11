---
fileId: contextrail-template:modules:example-greeter:manifest.json.header
module: modules/example-greeter
stability: evolving
steward: shared
api: Documentation
boundedContext: example-greeter
dependsOn: modules/example-greeter/manifest.json
summary: Sidecar header for the example-greeter module manifest.
owns: Documentation for modules/example-greeter/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Keep this sidecar aligned with modules/example-greeter/manifest.json.header.md; do not invent a second sidecar convention.
linkedDocs: modules/example-greeter/README.md
---

# manifest.json
