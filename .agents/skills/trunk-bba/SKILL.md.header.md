---
fileId: contextrail-template:agents:skills:trunk-bba:SKILL
module: .agents/skills/trunk-bba
stability: evolving
steward: shared
api: Codex skill
dependsOn:
  - docs/agent-contract/compatibility-contract.json
  - AGENTS.md
  - .claude/skills/trunk-bba/SKILL.md
summary: Ship through trunk using Branch by Abstraction and stable seams instead of long-lived hidden branches.
owns: The generated Codex-facing summary for the trunk-bba workflow module.
boundaries: This skill is an adapter summary. It must not become the canonical owner of the workflow.
invariants: The shared process summary stays aligned with the canonical contract; Claude-specific detail remains referenced instead of duplicated.
risks: Manual edits here can fork the trunk-bba workflow away from the canonical contract.
securityPrivacy: Documentation content only; avoid secrets or credentials.
notesForLLM: Read this as the Codex-friendly workflow summary. For repo-specific Claude elaboration, consult the linked .claude skill after confirming the shared contract still matches.
tests:
  - node scripts/agent-contract/check.mjs
  - tests/contract/agent-adapter-consistency.test.mjs
linkedDocs:
  - AGENTS.md
  - docs/agent-contract/README.md
  - .claude/skills/trunk-bba/SKILL.md
related:
  - .agents/skills/README.md
  - .claude/skills/trunk-bba/SKILL.md
generated: true
---

# SKILL.md
