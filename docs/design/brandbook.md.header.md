---
fileId: contextrail-template:docs:design:brandbook
module: docs/design
stability: evolving
steward: shared
api: Design document
dependsOn:
  - docs/design/README.md
  - docs/design/design-system.md
summary: Record the repository-local visual language and brand constraints that user-facing design work should respect.
owns: The visual language and identity constraints for the design lane.
boundaries: This file owns brand and visual-language guidance only. It must not duplicate PRD scope or the implementation details of the design system.
invariants: The brandbook stays concise, implementation-aware, and specific enough to guide mockups and reviews.
risks: Drift here can leave design prompts visually inconsistent or make accepted designs hard to review against a stable visual language.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Treat this file as the visual-language source. Keep it concrete enough to guide prompts and review, not as generic branding prose.
tests: node scripts/checks/design-docs-check.mjs
linkedDocs:
  - docs/design/README.md
  - docs/design/design-system.md
related: docs/design/prompts/README.md
specRefs: TPL-059
---

# brandbook.md
