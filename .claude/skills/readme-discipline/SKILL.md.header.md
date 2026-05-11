---
fileId: contextrail-template:.claude:skills:readme-discipline:SKILL
module: .claude/skills/readme-discipline
stability: evolving
steward: human
api: Claude skill
dependsOn:
  - .claude/CLAUDE.md
  - scripts/checks/readme-check.mjs
  - scripts/checks/readme-fix.mjs
  - .claude/agents/readme-guardian.md
summary: Keep README.md present in every meaningful folder and make each folder’s purpose, boundaries, and common operations obvious to humans and agents.
owns: The reusable method for folder-level README coverage, clarity, and boundary guidance.
boundaries: This file defines a reusable folder-documentation method. It must not become a generic writing guide or duplicate the full README policy elsewhere.
invariants: The skill stays focused on meaningful folders, purpose, inclusion and exclusion rules, common operations, and where to look next.
risks: Drift here can leave folders undocumented, flatten important boundaries, or create bloated README prose that does not aid navigation.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this skill when folders are created, repurposed, or approaching completion. Optimize for navigation and boundaries, not prose volume.
tests:
  - node scripts/checks/readme-check.mjs
  - node scripts/checks/readme-fix.mjs
  - manual skill use on folder changes
linkedDocs: .claude/CLAUDE.md
related:
  - scripts/checks/readme-check.mjs
  - scripts/checks/readme-fix.mjs
  - .claude/agents/readme-guardian.md
---

# SKILL.md
