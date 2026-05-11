---
fileId: contextrail-template:.claude:skills:control-plane-audit:README
module: .claude/skills/control-plane-audit
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - .claude/skills/control-plane-audit/SKILL.md
  - .claude/agents/control-plane-supervisor.md
summary: Introduce the control-plane-audit skill folder and clarify when to use it for cross-plane drift detection.
owns: The folder-level entrypoint for the control-plane-audit skill.
boundaries: This file is a quick folder guide only. It must not duplicate the full audit method.
invariants: The README stays short, repository-specific, and focused on when the skill should be used.
risks: Drift here can hide the skill or make it look like a second constitution.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Read this file first for quick orientation, then use SKILL.md for the audit method.
tests: node scripts/checks/control-plane-check.mjs
linkedDocs: .claude/CLAUDE.md
related: .claude/skills/control-plane-design/README.md
---

# README.md
