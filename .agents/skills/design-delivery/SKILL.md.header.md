---
fileId: contextrail-template:agents:skills:design-delivery:SKILL
module: .agents/skills/design-delivery
stability: evolving
steward: shared
api: Codex skill
dependsOn:
  - docs/agent-contract/compatibility-contract.json
  - AGENTS.md
  - .claude/skills/design-delivery/SKILL.md
summary: Carry user-facing design work from intent to accepted handoff without replacing PRD or USM.
owns: The generated Codex-facing summary for the design-delivery workflow module.
boundaries: This skill is an adapter summary. It must not become the canonical owner of the workflow.
invariants: The shared process summary stays aligned with the canonical contract; Claude-specific detail remains referenced instead of duplicated.
risks: Manual edits here can fork the design-delivery workflow away from the canonical contract.
securityPrivacy: Documentation content only; avoid secrets or credentials.
notesForLLM: Read this as the Codex-friendly workflow summary. For repo-specific Claude elaboration, consult the linked .claude skill after confirming the shared contract still matches.
tests:
  - node scripts/agent-contract/check.mjs
  - tests/contract/agent-adapter-consistency.test.mjs
linkedDocs:
  - AGENTS.md
  - docs/agent-contract/README.md
  - .claude/skills/design-delivery/SKILL.md
related:
  - .agents/skills/README.md
  - .claude/skills/design-delivery/SKILL.md
generated: true
---

# SKILL.md
