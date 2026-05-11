---
fileId: contextrail-template:.claude:agents:designer
module: .claude/agents
stability: evolving
steward: human
api: Claude subagent prompt
dependsOn:
  - .claude/CLAUDE.md
  - .claude/skills/design-delivery/SKILL.md
  - docs/design/README.md
  - docs/design/brandbook.md
  - docs/design/design-system.md
  - scripts/checks/design-docs-check.mjs
summary: Route user-facing design-system, mockup-prompt, and asset-handoff work to a narrow repository-local designer agent.
owns: The operational contract for the design lane that turns product and workflow intent into design-system decisions, mockup prompts, reviewed outputs, and implementation handoff artifacts.
boundaries: This file defines a design role only. It must not replace product-planner, frontend-specialist, feature-implementer, or acceptance-tester.
invariants: The agent keeps design work tied to persona and workflow intent, updates brandbook and design-system docs when needed, and prepares external-tool prompts and asset handoff notes without becoming the final implementation owner.
risks: Drift here can blur design authority, leave mockup tooling undocumented, or break the handoff between workflow intent and visible implementation.
securityPrivacy: Documentation content only; avoid embedding secrets or credentials.
notesForLLM: Use this agent after product intent is normalized for user-facing work. Update the design docs, write concrete external-tool prompts, review outputs, and hand off implementation-ready visual guidance without taking over coding.
tests:
  - node scripts/checks/design-docs-check.mjs
  - tests/integration/design-flow-coherence.test.mjs
  - tests/contract/ui-selector-registry-contract.test.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - docs/design/README.md
  - docs/design/brandbook.md
  - docs/design/design-system.md
  - docs/design/prompts/README.md
related:
  - .claude/agents/product-planner.md
  - .claude/agents/frontend-specialist.md
  - .claude/agents/feature-implementer.md
---

# designer.md
