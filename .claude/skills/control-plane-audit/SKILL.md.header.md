---
fileId: contextrail-template:.claude:skills:control-plane-audit:SKILL
module: .claude/skills/control-plane-audit
stability: evolving
steward: human
api: Claude skill
dependsOn:
  - scripts/checks/control-plane-check.mjs
  - tests/integration/control-plane-coherence.test.mjs
  - .claude/CLAUDE.md
summary: Define a reusable method for deterministic-first control-plane drift auditing across canonical repository surfaces.
owns: The reusable method for control-plane drift auditing across canonical repository surfaces.
boundaries: This skill defines an audit method only. It must not become a second policy document or replace specialist operational prompts.
invariants: Audits start with deterministic checks, classify findings by drift type, and fix the source of disagreement rather than adding explanatory duplication.
risks: Drift here can normalize stale docs, duplicated authority, or process claims that are not backed by executable checks.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Run the script first. Then focus on semantic drift it cannot fully judge, and repair the source file rather than adding compensating prose elsewhere.
tests:
  - node scripts/checks/control-plane-check.mjs
  - tests/integration/control-plane-coherence.test.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - docs/adr/0002-trunk-based-delivery.md
related:
  - .claude/agents/control-plane-supervisor.md
  - .claude/skills/control-plane-design/SKILL.md
---

# SKILL.md
