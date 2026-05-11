---
fileId: contextrail-template:.claude:skills:header-sidecar:README
module: .claude/skills/header-sidecar
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - .claude/skills/header-sidecar/SKILL.md
  - .claude/agents/header-guardian.md
  - scripts/checks/header-check.mjs
summary: Introduce the header-sidecar skill folder and clarify that it owns the reusable method for structured headers and <file>.header.md sidecars.
owns: The folder-level entrypoint for the header-sidecar skill and its role in the repository header system.
boundaries: This file is a quick folder guide only. It must not duplicate the detailed header method, enum rules, or script mechanics.
invariants: The README stays short, sidecar-rule aware, and aligned with the current structured header v2 standard.
risks: Drift here can obscure where header policy really lives or blur the split between skill guidance and script enforcement.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Read this file for quick orientation, then use SKILL.md for field semantics, insertion rules, and decision guidance.
tests: Manual review plus scripts/checks/header-check.mjs and readme-check.mjs
linkedDocs: .claude/CLAUDE.md
related:
  - .claude/skills/header-sidecar/SKILL.md
  - .claude/agents/header-guardian.md
---

# README.md
