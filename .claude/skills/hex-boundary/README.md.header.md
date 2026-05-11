---
fileId: contextrail-template:.claude:skills:hex-boundary:README
module: .claude/skills/hex-boundary
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - .claude/skills/hex-boundary/SKILL.md
  - .claude/skills/hex-boundary/module-template.md
  - scripts/checks/architecture-check.mjs
summary: Introduce the hex-boundary skill folder and clarify when to use it for module structure, boundary, and public API review.
owns: The folder-level entrypoint for the hex-boundary skill and its structural review references.
boundaries: This file is a quick folder guide only. It must not replace the main skill method or absorb the reference material from module-template.md.
invariants: The README stays short, structure-focused, and aligned with current architecture-check expectations.
risks: Drift here can make agents miss the supporting template or use the skill for non-structural work.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Read this file first for quick orientation, then go to SKILL.md for the method and the module template for structure examples.
tests: Manual review plus scripts/checks/header-check.mjs and readme-check.mjs
linkedDocs: .claude/CLAUDE.md
related:
  - .claude/skills/hex-boundary/SKILL.md
  - .claude/skills/hex-boundary/module-template.md
---

# README.md
