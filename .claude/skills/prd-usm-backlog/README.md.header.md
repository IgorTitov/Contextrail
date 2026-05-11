---
fileId: contextrail-template:.claude:skills:prd-usm-backlog:README
module: .claude/skills/prd-usm-backlog
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - .claude/skills/prd-usm-backlog/SKILL.md
  - .claude/agents/product-planner.md
summary: Introduce the PRD-USM-backlog skill folder and clarify when to use it for product-intake, decomposition, and execution-slicing work.
owns: The folder-level entrypoint for the PRD-USM-backlog planning skill.
boundaries: This file is a quick guide only. It must not duplicate the full planning method.
invariants: The README stays short, repository-specific, and focused on when this skill should be used.
risks: Drift here can hide the skill or make it sound broader than it is.
securityPrivacy: Documentation content only; avoid embedding secrets or credentials.
notesForLLM: Read this file first for quick orientation, then use SKILL.md for the actual method.
tests: node scripts/checks/product-docs-check.mjs
linkedDocs: .claude/CLAUDE.md
related: .claude/skills/spec-traceability/SKILL.md
---

# README.md
