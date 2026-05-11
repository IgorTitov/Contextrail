---
fileId: contextrail-template:docs:product-data:persona-economics:economics-template
module: docs/product-data/persona-economics
stability: evolving
steward: shared
api: Reusable template document
dependsOn: docs/product-data/persona-economics/README.md
summary: Provide the canonical template for per-persona economics files so new personas get structured commercial data from day one.
owns: The canonical template for new per-persona economics files.
boundaries: This file is a reusable template only. It must not drift into project-specific content.
invariants: The template stays placeholder-driven and aligned with the persona-economics JSON contract.
risks: Drift here makes economics file creation inconsistent.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Copy this file when creating economics data for a new persona. Replace all {{PLACEHOLDERS}}.
tests: node scripts/checks/product-data-check.mjs
linkedDocs:
  - docs/product-data/persona-economics/README.md
  - docs/product-data/README.md
related: docs/usm/personas/persona-template.md
---

# economics-template.md
