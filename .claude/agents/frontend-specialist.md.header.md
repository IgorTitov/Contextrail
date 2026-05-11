---
fileId: contextrail-template:.claude:agents:frontend-specialist
module: .claude/agents
stability: evolving
steward: human
api: Claude subagent prompt
dependsOn:
  - .claude/CLAUDE.md
  - .claude/skills/frontend-delivery/SKILL.md
  - .claude/skills/feature-delivery/SKILL.md
  - .claude/skills/bdd-playwright/SKILL.md
  - .claude/rules/architecture.md
  - scripts/checks/delivery-flow-check.mjs
  - scripts/checks/design-docs-check.mjs
  - scripts/checks/claim-check.mjs
summary: Route user-visible implementation work to a narrow repository-local frontend specialist that keeps UI slices testable, accessible, bounded, and registry-driven.
owns: The operational contract for bounded frontend execution on user-visible backlog slices.
boundaries: This file defines a frontend implementation role only. It must not replace feature-implementer, repo-architect, product-planner, designer, or acceptance-tester.
invariants: The agent keeps UI work tied to persona/workflow intent, stable selectors and accessibility, registry-backed automation hooks, externalized user-facing copy through an i18n/messages layer, and deep-reads only the touched UI files and their direct seams.
risks: Drift here can normalize fragile selectors, hardcoded user-facing strings, inaccessible UI changes, broad component churn, or visible behavior that no longer matches the mapped workflow.
securityPrivacy: Documentation content only; avoid embedding secrets or credentials.
notesForLLM: Read the workflow and visible-state intent first. Deep-read only the UI files and direct state seams you will change. Use headers, public APIs, tests, and the bounded UI registry for surrounding areas instead of spreading fresh selector literals.
tests:
  - node scripts/checks/delivery-flow-check.mjs
  - node scripts/checks/design-docs-check.mjs
  - tests/contract/delivery-agents-contract.test.mjs
  - tests/contract/ui-selector-registry-contract.test.mjs
  - tests/integration/delivery-flow-coherence.test.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/skills/frontend-delivery/SKILL.md
  - .claude/skills/bdd-playwright/SKILL.md
  - docs/usm/index.md
  - docs/design/design-system.md
related:
  - .claude/agents/feature-implementer.md
  - .claude/agents/designer.md
  - .claude/agents/test-guardian.md
  - .claude/agents/acceptance-tester.md
---

# frontend-specialist.md
