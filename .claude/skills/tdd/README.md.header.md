---
fileId: contextrail-template:.claude:skills:tdd:README
module: .claude/skills/tdd
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - .claude/skills/tdd/SKILL.md
  - .claude/skills/tdd/examples.md
  - scripts/checks/test-gate.mjs
summary: Introduce the tdd skill folder and clarify when to use it for red-green-refactor delivery and regression-first bugfixes.
owns: The folder-level entrypoint for the tdd skill and its proving-loop examples.
boundaries: This file is a quick folder guide only. It must not duplicate the detailed TDD method or absorb the examples content.
invariants: The README stays short, proving-loop focused, and aligned with the current regression-first testing posture.
risks: Drift here can hide the examples file or blur the difference between quick orientation and the actual method.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Read this file first for quick orientation, then use SKILL.md for the method and examples.md for concrete proving-loop examples.
tests: Manual review plus scripts/checks/header-check.mjs and readme-check.mjs
linkedDocs: .claude/CLAUDE.md
related:
  - .claude/skills/tdd/SKILL.md
  - .claude/skills/tdd/examples.md
---

# README.md
