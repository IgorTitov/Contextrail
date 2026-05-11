---
fileId: contextrail-template:.claude:skills:security-audit:README
module: .claude/skills/security-audit
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - .claude/skills/security-audit/SKILL.md
  - .claude/skills/security-audit/scripts/*
  - .claude/rules/security.md
summary: Introduce the security-audit skill folder and clarify when to use it before enabling third-party automation or suspicious shell behavior.
owns: The folder-level entrypoint for the security-audit skill and its supporting helpers.
boundaries: This file is a quick folder guide only. It must not replace the main audit method or absorb script-level implementation details.
invariants: The README stays short, trust-posture aware, and aligned with the current audit surface.
risks: Drift here can obscure when to use the audit skill or make helper scripts seem more authoritative than the method.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Read this file for quick orientation, then use SKILL.md for the audit method and the scripts folder for helper implementation details.
tests: Manual review plus scripts/checks/header-check.mjs and readme-check.mjs
linkedDocs: .claude/CLAUDE.md
related:
  - .claude/skills/security-audit/SKILL.md
  - .claude/skills/security-audit/scripts/audit-skill.py
---

# README.md
