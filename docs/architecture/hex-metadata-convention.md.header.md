---
fileId: contextrail-template:docs:architecture:hex-metadata-convention
module: docs/architecture
stability: evolving
steward: shared
api: Documentation
summary: Document the convention for hexagonal architecture metadata in structured headers and machine-readable reports.
owns: Convention documentation for hex architecture metadata in structured headers.
boundaries: Documents the convention only. Implementation lives in scripts/lib/.
invariants: Field names and enum values must stay aligned with scripts/lib/header.mjs.
risks: Convention drift if header.mjs changes without updating this document.
securityPrivacy: Public documentation.
notesForLLM: This is the human-readable reference for the convention. Keep it concise and aligned with the code.
linkedDocs:
  - docs/adr/0003-architecture-metadata-for-ai-cockpit.md
  - scripts/reports/README.md
related:
  - scripts/lib/header.mjs
  - scripts/lib/architecture-graph.mjs
---

# hex-metadata-convention.md
