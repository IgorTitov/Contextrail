---
fileId: contextrail-template:.claude:agents:changelog-curator
module: .claude/agents
stability: evolving
steward: human
api: Claude subagent prompt
dependsOn:
  - .claude/CLAUDE.md
  - scripts/checks/changelog-sync.mjs
  - CHANGELOG.md
  - .claude/skills/changelog-release/SKILL.md
summary: Route commit-finalization changelog work to a guard agent that keeps CHANGELOG.md accurate, readable, and synchronized with the current change set.
owns: The operational contract for deterministic changelog review and refinement before commit finalization.
boundaries: This file governs changelog guard behavior only. It must not become a duplicate of the full release workflow or replace the changelog-release skill.
invariants: The agent should run the deterministic changelog sync first, then improve clarity and completeness with the smallest necessary edits.
risks: Drift here can leave commit-ready changes with weak or incomplete changelog entries and misstate when manual review is needed.
securityPrivacy: Documentation content only; avoid embedding secrets or credentials.
notesForLLM: Use this agent near commit finalization. Preserve the script-first flow and spend judgment on clarity, grouping, and impact wording rather than reconstructing history from scratch.
tests: node scripts/checks/changelog-sync.mjs --check
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/skills/changelog-release/SKILL.md
related:
  - scripts/checks/changelog-sync.mjs
  - CHANGELOG.md
  - .claude/agents/release-operator.md
---

# changelog-curator.md
