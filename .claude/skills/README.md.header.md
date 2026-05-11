---
fileId: contextrail-template:.claude:skills:README
module: .claude/skills
stability: evolving
steward: shared
api: Folder index
dependsOn:
  - .claude/CLAUDE.md
  - .claude/skills/*
summary: Index the repository-local skill set and explain how the skills folder is organized so humans and agents can choose the right reusable method quickly.
owns: The authoritative folder index for the repository-local skill surface and its high-level organization.
boundaries: This file is a navigation index only. It must not duplicate the detailed method content from the skills themselves.
invariants: The listed skills stay aligned with the real directory contents and the file remains concise and easy to scan.
risks: Drift here makes it harder for agents to discover the right reusable method.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this file as a map to the available skills. Read the specific skill for method details instead of expanding this index into a handbook.
tests:
  - node scripts/checks/control-plane-check.mjs
  - node scripts/checks/product-docs-check.mjs
  - node scripts/checks/design-docs-check.mjs
  - node scripts/checks/delivery-flow-check.mjs
linkedDocs: .claude/CLAUDE.md
related: .claude/README.md
---

# README.md
