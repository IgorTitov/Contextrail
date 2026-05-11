---
fileId: contextrail-template:.claude:skills:security-audit:scripts:README
module: .claude/skills/security-audit/scripts
stability: evolving
steward: shared
api: Folder guide
dependsOn: .claude/skills/security-audit/scripts/audit-skill.py
summary: Explain the small local helper scripts that support the security-audit skill without becoming part of the main repository runtime.
owns: The folder-level guide to security-audit helper scripts.
boundaries: This file is a folder guide only. It must not duplicate the implementation details of the helper scripts or the main skill method.
invariants: The folder stays small, local to the skill, and limited to helper behavior that supports pre-enablement review.
risks: Drift here can make helper scripts look more central or more capable than they really are.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this file to understand what helper scripts exist in this skill folder. Read the script itself when implementation details matter.
tests: Manual review plus scripts/checks/header-check.mjs and readme-check.mjs
linkedDocs: .claude/CLAUDE.md
related: .claude/skills/security-audit/SKILL.md
---

# README.md
