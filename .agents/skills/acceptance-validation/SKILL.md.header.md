---
fileId: contextrail-template:agents:skills:acceptance-validation:SKILL
module: .agents/skills/acceptance-validation
stability: evolving
steward: shared
api: Codex skill
dependsOn:
  - docs/agent-contract/compatibility-contract.json
  - AGENTS.md
  - .claude/skills/acceptance-validation/SKILL.md
summary: Close an implemented slice against acceptance and determine readiness for finalization.
owns: The generated Codex-facing summary for the acceptance-validation workflow module.
boundaries: This skill is an adapter summary. It must not become the canonical owner of the workflow.
invariants: The shared process summary stays aligned with the canonical contract; Claude-specific detail remains referenced instead of duplicated.
risks: Manual edits here can fork the acceptance-validation workflow away from the canonical contract.
securityPrivacy: Documentation content only; avoid secrets or credentials.
notesForLLM: Read this as the Codex-friendly workflow summary. For repo-specific Claude elaboration, consult the linked .claude skill after confirming the shared contract still matches.
tests:
  - node scripts/agent-contract/check.mjs
  - tests/contract/agent-adapter-consistency.test.mjs
linkedDocs:
  - AGENTS.md
  - docs/agent-contract/README.md
  - .claude/skills/acceptance-validation/SKILL.md
related:
  - .agents/skills/README.md
  - .claude/skills/acceptance-validation/SKILL.md
generated: true
---

# SKILL.md
