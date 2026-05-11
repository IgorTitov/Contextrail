---
fileId: contextrail-template:.claude:agents:README
module: .claude/agents
stability: evolving
steward: shared
api: Folder index
dependsOn:
  - .claude/CLAUDE.md
  - .claude/agents/*
summary: Index the repository-local Claude subagents and their role groupings so humans and agents can find the right helper quickly.
owns: The authoritative folder index for available subagents and their role grouping.
boundaries: This file is a navigation index only. It must not try to duplicate the detailed operating contracts from the individual agent files.
invariants: The listed agent names must match real filenames and current routing intent.
risks: Drift here sends humans and agents to the wrong helper or hides available capability.
securityPrivacy: Documentation content only; avoid embedding secrets or internal credentials.
notesForLLM: Treat this file as a folder map, not as agent behavior. Update it when the roster or grouping changes, not when a single agent prompt changes internally.
tests:
  - node scripts/checks/control-plane-check.mjs
  - node scripts/checks/product-docs-check.mjs
  - node scripts/checks/design-docs-check.mjs
  - node scripts/checks/delivery-flow-check.mjs
linkedDocs: .claude/CLAUDE.md
related:
  - .claude/agents/product-planner.md
  - .claude/agents/designer.md
  - .claude/agents/feature-implementer.md
  - .claude/agents/frontend-specialist.md
  - .claude/agents/acceptance-tester.md
---

# README.md
