---
fileId: contextrail-template:docs:design:design-system
module: docs/design
stability: evolving
steward: shared
api: Design document
dependsOn:
  - docs/design/README.md
  - .claude/rules/architecture.md
  - .claude/skills/frontend-delivery/SKILL.md
summary: Record reusable UI patterns, visible-state rules, and implementation-facing design constraints for the design and frontend lanes.
owns: The design-system guidance for reusable UI patterns and implementation-facing design constraints.
boundaries: This file owns reusable design patterns and implementation-facing visual constraints only. It must not duplicate PRD scope or become a test handbook.
invariants: The design-system stays tied to visible states, accessibility-aware patterns, externalized user-facing copy semantics, and bounded implementation surfaces.
risks: Drift here can leave design and frontend lanes inconsistent or normalize fragile UI hooks and wide churn.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this file to understand reusable UI patterns and the implementation-facing selector-registry rule. Keep it small, explicit, and aligned with bounded frontend slices.
tests:
  - node scripts/checks/design-docs-check.mjs
  - tests/contract/ui-selector-registry-contract.test.mjs
linkedDocs:
  - docs/design/brandbook.md
  - docs/design/prompts/README.md
  - .claude/skills/frontend-delivery/SKILL.md
related:
  - docs/design/assets/README.md
  - .claude/agents/frontend-specialist.md
specRefs: TPL-060
---

# design-system.md
