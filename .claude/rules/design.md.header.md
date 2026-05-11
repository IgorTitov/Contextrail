---
fileId: contextrail-template:.claude:rules:design
module: .claude/rules
stability: evolving
steward: shared
api: Topic rule document
dependsOn:
  - .claude/CLAUDE.md
  - .claude/agents/repo-architect.md
  - .claude/skills/control-plane-design/SKILL.md
  - .claude/rules/architecture.md
summary: Capture short repository-local design rules that keep change sets small, explicit, canonical-owner-first, and easy for humans and LLMs to reason about.
owns: The short rule set for repository-shaping design decisions, smallest-change-set selection, and control-plane growth discipline.
boundaries: This file states concise design rules only. It must not become a duplicate of agent prompts, an architecture handbook, or a second policy source.
invariants: Rules stay short, source-oriented, and aligned with the repo’s canonical-owner-first method.
risks: Drift here can normalize duplicate authority, unnecessary files, or control-plane growth that makes the repo harder for humans and LLMs to navigate.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Read this rule file when deciding where a change should live. Prefer modifying the canonical owner over creating a new surface.
tests:
  - node scripts/checks/control-plane-check.mjs
  - node scripts/checks/header-check.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/agents/repo-architect.md
  - .claude/skills/control-plane-design/SKILL.md
related:
  - .claude/rules/architecture.md
  - .claude/rules/development.md
---

# design.md
