---
fileId: contextrail-template:.claude:skills:hex-boundary:SKILL
module: .claude/skills/hex-boundary
stability: evolving
steward: human
api: Claude skill
dependsOn:
  - .claude/CLAUDE.md
  - scripts/checks/architecture-check.mjs
  - .claude/rules/architecture.md
summary: Preserve modular-monolith boundaries, public API discipline, and hexagonal layering when structure, imports, or adapters are being changed.
owns: The reusable method for reviewing boundaries, public surfaces, and layer discipline during structural change.
boundaries: This file defines a reusable boundary-review method. It must not become a full architecture handbook or replace deterministic boundary checks.
invariants: The skill stays focused on imports, public APIs, ports, adapters, and layer purity rather than general code-style review.
risks: Drift here can normalize deep imports, leaky frameworks, or unclear public API boundaries.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this skill when structure changes, modules move, or adapter boundaries feel uncertain. Return concrete boundary findings, not architecture slogans.
tests:
  - scripts/checks/architecture-check.mjs
  - manual skill use on structural change sets
linkedDocs: .claude/CLAUDE.md
related:
  - scripts/checks/architecture-check.mjs
  - .claude/agents/hex-architect.md
  - .claude/rules/architecture.md
---

# SKILL.md
