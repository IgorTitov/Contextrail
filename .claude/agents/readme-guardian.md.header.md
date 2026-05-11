---
fileId: contextrail-template:.claude:agents:readme-guardian
module: .claude/agents
stability: evolving
steward: human
api: Claude subagent prompt
dependsOn:
  - .claude/CLAUDE.md
  - scripts/checks/readme-fix.mjs
  - scripts/checks/readme-check.mjs
  - .claude/skills/readme-discipline/SKILL.md
summary: Guard folder-level README discipline so meaningful directories stay navigable, bounded, and understandable to humans and agents.
owns: The operational contract for folder README quality, coverage, and semantic usefulness.
boundaries: This file governs README guard behavior only. It must not become a general documentation policy file or a second copy of the readme-discipline skill.
invariants: The agent should run deterministic README repair first, then strengthen only the folder-level semantics that scripts cannot infer.
risks: Drift here can create noisy README churn or leave important folders undocumented and hard to navigate.
securityPrivacy: Documentation content only; avoid embedding secrets or credentials.
notesForLLM: Use this agent when folders are added, reshaped, or near finalization. Optimize for navigation, boundaries, and common operations, not prose volume.
tests: scripts/checks/readme-check.mjs --changed
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/skills/readme-discipline/SKILL.md
related:
  - scripts/checks/readme-fix.mjs
  - scripts/checks/readme-check.mjs
  - .claude/README.md
---

# readme-guardian.md
