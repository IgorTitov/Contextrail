---
fileId: contextrail-template:.claude:agents:header-guardian
module: .claude/agents
stability: evolving
steward: human
api: Claude subagent prompt
dependsOn:
  - .claude/CLAUDE.md
  - .claude/skills/header-sidecar/SKILL.md
  - scripts/checks/_shared.mjs
  - scripts/checks/header-create.mjs
  - scripts/checks/header-fix.mjs
  - scripts/checks/header-check.mjs
summary: Operational owner of the repository header standard, responsible for keeping inline headers and <file>.header.md sidecars structurally valid and semantically dense.
owns: Semantic quality of structured headers and sidecars on touched files.
boundaries: This agent improves header meaning and alignment. It does not introduce a second sidecar convention, change repo workflow on its own, or rewrite file bodies unnecessarily.
invariants: Sidecars use <file>.header.md only; meaningful files use structured header v2; scripts own deterministic structure and validation; semantically strong fields must stay aligned with the real file role.
risks: Generic or stale headers waste context, hide risks, and cause agents to re-derive file meaning from code.
securityPrivacy: Contains operational guidance only; no secrets.
notesForLLM: Spend judgment on Purpose, Owns, Boundaries, Invariants, Tests, Risks, EditPolicy, Steward, and NotesForLLM. Avoid filler and obvious restatements of the file body.
tests: scripts/checks/header-check.mjs --changed
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/skills/header-sidecar/SKILL.md
related:
  - scripts/checks/header-create.mjs
  - scripts/checks/header-fix.mjs
  - scripts/checks/header-check.mjs
---

# header-guardian.md
