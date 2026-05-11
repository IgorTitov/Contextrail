---
fileId: contextrail-template:modules:prerender:manifest.json.header
module: modules/prerender
stability: evolving
steward: shared
api: Documentation
boundedContext: prerender
dependsOn: modules/prerender/manifest.json
summary: Module metadata and capability surface for the prerender hex module.
owns: Documentation for modules/prerender/manifest.json.header.md without modifying the comment-sensitive or tool-managed file body.
boundaries: Pure metadata. Does not import or execute code; only lists files and auto-generated capability surface.
invariants: Structure block must match the real files on disk; capabilities section is owned by scripts/checks/capabilities-sync.mjs.
notesForLLM: Keep this sidecar aligned with modules/prerender/manifest.json.header.md; do not invent a second sidecar convention.
---

# manifest.json
