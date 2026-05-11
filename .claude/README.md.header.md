---
fileId: contextrail-template:.claude:README
module: .claude
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - .claude/CLAUDE.md
  - .claude/agents/README.md
  - .claude/skills/README.md
  - .claude/rules/README.md
  - .claude/hooks/README.md
summary: Explain the role, structure, and boundaries of the repository-local Claude control plane.
owns: The folder-level guide to the repository’s Claude instructions, agents, skills, rules, hooks, and local memory.
boundaries: This file is a navigation and boundary guide only. It must not become a duplicate of .claude/CLAUDE.md or the detailed subfolder READMEs.
invariants: The described structure should match the real control-plane layout; guidance should stay concise, navigational, and operational.
risks: Drift here makes the control plane harder to navigate and increases overlap between instructions.
securityPrivacy: Documentation content only; avoid embedding secrets or credentials.
notesForLLM: Read this file for control-plane orientation. Use it to find the right subfolder, not as a substitute for the canonical policy in .claude/CLAUDE.md.
tests: Manual review plus scripts/checks/header-check.mjs and readme-check.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/agents/README.md
  - .claude/skills/README.md
  - .claude/rules/README.md
  - .claude/hooks/README.md
related:
  - .claude/MEMORY.md
  - .claude/settings.json.header.md
---

# README.md
