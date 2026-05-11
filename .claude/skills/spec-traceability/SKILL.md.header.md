---
fileId: contextrail-template:.claude:skills:spec-traceability:SKILL
module: .claude/skills/spec-traceability
stability: evolving
steward: human
api: Claude skill
dependsOn:
  - .claude/CLAUDE.md
  - docs/prd/index.md
  - docs/usm/index.md
  - docs/backlog/index.md
  - scripts/checks/spec-check.mjs
  - scripts/checks/spec-sync.mjs
  - scripts/checks/backlog-sync.mjs
summary: Maintain one coherent traceability surface across PRD, USM, backlog, BDD, tests, headers, changelog, and commit-ready work items.
owns: The reusable method for keeping work-item traceability coherent across structured docs, tests, headers, and changelog.
boundaries: This file defines a reusable traceability method. It must not replace deterministic sync scripts or invent a second trace schema.
invariants: The skill stays aligned with the repository’s project-wide ID namespace, trace blocks, and explicit refs across docs, tests, and code.
risks: Drift here can normalize orphan refs, missing BDD or test links, or inconsistent work-item state across artifacts.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this skill proactively whenever behavior changes. Preserve one ID namespace and keep references explicit instead of burying trace data in prose.
tests:
  - node scripts/checks/spec-check.mjs
  - node scripts/checks/spec-sync.mjs
  - node scripts/checks/backlog-sync.mjs
  - manual skill use on behavior changes
linkedDocs: .claude/CLAUDE.md
related:
  - docs/prd/index.md
  - docs/usm/index.md
  - docs/backlog/index.md
  - scripts/checks/spec-check.mjs
  - scripts/checks/spec-sync.mjs
---

# SKILL.md
