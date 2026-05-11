---
fileId: contextrail-template:.claude:skills:header-sidecar:SKILL
module: .claude/skills/header-sidecar
stability: evolving
steward: human
api: Claude skill
dependsOn:
  - .claude/CLAUDE.md
  - .claude/agents/header-guardian.md
  - scripts/checks/_shared.mjs
  - scripts/checks/header-create.mjs
  - scripts/checks/header-fix.mjs
  - scripts/checks/header-check.mjs
summary: Apply the repository’s structured header v2 standard consistently by choosing inline versus sidecar placement correctly and by writing high-signal semantic fields.
owns: The reusable method for deciding header placement, field semantics, and sidecar usage across the repository.
boundaries: This file defines the reusable header-application method only. It must not duplicate the full agent prompt, replace deterministic script logic, or introduce a second sidecar convention.
invariants: The repository uses one structured header schema and one sidecar naming rule only; markdown frontmatter stays before headers; shebang lines stay before headers; comment-sensitive files use <file>.header.md; semantic guidance stays aligned with script-enforced structure.
risks: Drift here can cause agents to place headers incorrectly, weaken semantic density, or generate headers that fail repository validation.
securityPrivacy: Guidance only; no secrets.
notesForLLM: Use this skill to decide placement, schema fields, and wording quality. Preserve the one-sidecar rule, preserve canonical insertion order, and let scripts own deterministic mechanics.
tests:
  - scripts/checks/header-check.mjs
  - tests/contract/header-version-stamp.test.mjs
  - manual review via header-guardian
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/agents/header-guardian.md
  - .claude/skills/header-sidecar/README.md
related:
  - scripts/checks/_shared.mjs
  - scripts/checks/header-create.mjs
  - scripts/checks/header-fix.mjs
  - scripts/checks/header-check.mjs
---

# SKILL.md
