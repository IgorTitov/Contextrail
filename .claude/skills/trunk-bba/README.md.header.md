---
fileId: contextrail-template:.claude:skills:trunk-bba:README
module: .claude/skills/trunk-bba
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - .claude/skills/trunk-bba/SKILL.md
  - docs/adr/0002-trunk-based-delivery.md
summary: Introduce the trunk-bba skill folder and clarify when to use it for trunk-based delivery and abstraction-seam changes.
owns: The folder-level entrypoint for the trunk-bba skill.
boundaries: This file is a quick folder guide only. It must not duplicate the full delivery method.
invariants: The README stays short, repository-specific, and focused on when the skill should be used.
risks: Drift here can hide the delivery model or make it sound like generic agile prose.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Read this file first for quick orientation, then use SKILL.md for the actual delivery method.
tests: node scripts/checks/control-plane-check.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - docs/adr/0002-trunk-based-delivery.md
related: .claude/skills/control-plane-design/README.md
---

# README.md
