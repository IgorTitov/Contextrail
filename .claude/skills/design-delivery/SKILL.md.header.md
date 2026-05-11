---
fileId: contextrail-template:.claude:skills:design-delivery:SKILL
module: .claude/skills/design-delivery
stability: evolving
steward: human
api: Claude skill
dependsOn:
  - .claude/CLAUDE.md
  - docs/design/README.md
  - docs/design/brandbook.md
  - docs/design/design-system.md
  - docs/design/prompts/README.md
  - scripts/checks/design-docs-check.mjs
summary: Define the canonical design-lane method for brandbook, design-system, prompt-authoring, and asset-handoff work in this template.
owns: The reusable method for the template’s design lane.
boundaries: This skill defines design-lane method only. It must not replace product-planning, implementation, acceptance validation, or architecture review.
invariants: Design work stays tied to persona and workflow intent, updates the canonical design docs, and hands implementation-ready guidance to frontend without becoming a second source of product truth.
risks: Drift here can normalize disconnected mockups, undocumented external-tool prompts, or design guidance that never becomes implementable.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Start from normalized intent, not raw product guessing. Update the right design docs, write concrete external-tool prompts, review generated output against the brandbook and design-system, and hand off implementation-ready guidance.
tests:
  - node scripts/checks/design-docs-check.mjs
  - tests/integration/design-flow-coherence.test.mjs
  - tests/contract/ui-selector-registry-contract.test.mjs
linkedDocs:
  - docs/design/README.md
  - docs/design/brandbook.md
  - docs/design/design-system.md
  - docs/design/prompts/README.md
related:
  - .claude/agents/designer.md
  - .claude/agents/product-planner.md
  - .claude/agents/frontend-specialist.md
---

# SKILL.md
