---
fileId: contextrail-template:.claude:skills:control-plane-design:SKILL
module: .claude/skills/control-plane-design
stability: evolving
steward: human
api: Claude skill
dependsOn:
  - .claude/CLAUDE.md
  - docs/adr/0002-trunk-based-delivery.md
  - scripts/checks/control-plane-check.mjs
summary: Define a reusable method for shaping control-plane changes through canonical owners, smallest change sets, and explicit proof surfaces.
owns: The reusable method for repository-shaping control-plane design work.
boundaries: This skill defines a design method only. It must not replace canonical repository policy or specialist operational prompts.
invariants: Control-plane changes prefer existing owners, avoid duplicate authority, and add proof plus discoverability when a new surface is genuinely required.
risks: Drift here can normalize unnecessary files, overlapping authority, or unproven workflow changes.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Start from the current source of truth. Modify it first. Add a new surface only when the existing one would become overloaded or ambiguous.
tests:
  - node scripts/checks/control-plane-check.mjs
  - tests/integration/control-plane-coherence.test.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - docs/adr/0002-trunk-based-delivery.md
related:
  - .claude/agents/repo-architect.md
  - .claude/skills/control-plane-audit/SKILL.md
  - .claude/skills/trunk-bba/SKILL.md
---

# SKILL.md
