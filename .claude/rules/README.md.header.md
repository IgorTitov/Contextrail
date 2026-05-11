---
fileId: contextrail-template:.claude:rules:README
module: .claude/rules
stability: evolving
steward: shared
api: Folder index
dependsOn:
  - .claude/CLAUDE.md
  - .claude/rules/architecture.md
  - .claude/rules/design.md
  - .claude/rules/development.md
  - .claude/rules/docs.md
  - .claude/rules/security.md
  - .claude/rules/testing.md
summary: Index the short topic-specific operating rules that complement the canonical .claude/CLAUDE.md contract.
owns: The authoritative folder index for short topic-specific operating rules.
boundaries: This file is an index only. It must not duplicate the full contents of the rule files or replace .claude/CLAUDE.md.
invariants: The listed rule files must match the real folder contents and their high-level topics.
risks: Drift here sends readers to the wrong rule file or hides topic coverage gaps.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this file as a map to the rule set. Read the canonical contract first, then the specific rule file that matches the current work.
tests:
  - node scripts/checks/control-plane-check.mjs
  - node scripts/checks/header-check.mjs
linkedDocs: .claude/CLAUDE.md
related: .claude/README.md
---

# README.md
