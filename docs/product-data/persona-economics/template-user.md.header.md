---
fileId: contextrail-template:docs:product-data:persona-economics:template-user
module: docs/product-data/persona-economics
stability: evolving
steward: shared
api: Persona economics document
dependsOn:
  - docs/product-data/persona-economics/README.md
  - docs/usm/personas/template-user.md
summary: Store the current product-data assumptions for the Template User persona.
owns: Economics assumptions for the Template User persona.
boundaries: This file stores economics data only. It must not duplicate the persona definition.
invariants: The personaRef matches the cockpit-persona id in the persona file.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: This is a starter example with provisional values. Replace with real assumptions when bootstrapping a product.
tests: node scripts/checks/product-data-check.mjs
linkedDocs:
  - docs/product-data/README.md
  - docs/usm/personas/template-user.md
related: docs/product-data/persona-economics/economics-template.md
---

# template-user.md
