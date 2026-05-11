---
fileId: contextrail-template:.claude:skills:frontend-delivery:SKILL
module: .claude/skills/frontend-delivery
stability: evolving
steward: human
api: Claude skill
dependsOn:
  - .claude/CLAUDE.md
  - .claude/skills/feature-delivery/SKILL.md
  - .claude/skills/bdd-playwright/SKILL.md
  - .claude/rules/architecture.md
  - docs/design/design-system.md
  - scripts/checks/delivery-flow-check.mjs
  - scripts/checks/design-docs-check.mjs
summary: Define the canonical frontend implementation method for user-visible slices in this template.
owns: The reusable method for bounded user-visible implementation work.
boundaries: This skill defines frontend implementation method only. It must not replace product planning, design-lane ownership, architecture review, or acceptance closure.
invariants: Frontend slices stay tied to scenario intent, stable selectors, accessibility, registry-backed automation hooks, externalized user-facing copy through an i18n/messages layer, and the smallest necessary UI surface.
risks: Drift here can normalize fragile UI coupling, inaccessible changes, or selectors that break downstream tests and agents.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Keep visible changes aligned with scenario intent. Deep-read only the touched UI files and direct state seams. Use a bounded registry for automation-facing hooks so later tests and agents do not need brittle DOM archeology.
tests:
  - node scripts/checks/delivery-flow-check.mjs
  - node scripts/checks/design-docs-check.mjs
  - tests/contract/delivery-agents-contract.test.mjs
  - tests/contract/ui-selector-registry-contract.test.mjs
  - tests/integration/delivery-flow-coherence.test.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/skills/bdd-playwright/SKILL.md
  - .claude/agents/frontend-specialist.md
  - docs/design/design-system.md
related:
  - .claude/skills/feature-delivery/SKILL.md
  - .claude/agents/acceptance-tester.md
  - .claude/agents/designer.md
---

# SKILL.md
