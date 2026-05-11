---
fileId: contextrail-template:docs:prd:templates:work-item
module: docs/prd/templates
stability: evolving
steward: shared
api: Reusable template document
dependsOn:
  - docs/prd/index.md
  - docs/usm/index.md
  - docs/backlog/index.md
summary: Provide the canonical PRD work-item template used when creating new requirement documents in this template.
owns: One canonical PRD work-item template intended for reuse when creating requirement documents.
boundaries: This file is a reusable template. It must preserve the expected placeholder structure and not drift into one-off project content.
invariants: The template stays reusable, clearly placeholder-driven, and compatible with the repository’s requirement and trace conventions.
risks: If this template drifts into example-specific content, new PRD documents become inconsistent or harder to author.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Treat this file as the canonical PRD template. Preserve placeholders and field structure unless the template schema itself changes.
tests: node scripts/checks/product-docs-check.mjs
linkedDocs:
  - docs/prd/templates/README.md
  - docs/prd/index.md
related:
  - docs/backlog/templates/work-item.md
  - docs/backlog/templates/intake-item.md
  - docs/usm/templates/story-map.md
---

# work-item.md
