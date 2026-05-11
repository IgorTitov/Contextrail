---
fileId: contextrail-template:.claude:rules:development
module: .claude/rules
stability: evolving
steward: shared
api: Topic rule document
dependsOn:
  - .claude/CLAUDE.md
  - .claude/skills/tdd/SKILL.md
  - .claude/skills/trunk-bba/SKILL.md
  - .claude/rules/testing.md
  - docs/adr/0002-trunk-based-delivery.md
summary: Capture short repository-local development rules for trunk-based delivery, safe seams, proof-first work, temporary abstraction coordination, and bounded UI hook usage.
owns: The short rule set for day-to-day implementation flow, proof-first work, and safe parallel development on trunk.
boundaries: This file states concise development rules only. It must not become a full workflow handbook or duplicate the detailed trunk-bba skill.
invariants: Rules stay short, operational, and aligned with TDD plus trunk/BBA delivery.
risks: Drift here can normalize test-after-coding behavior, unsafe switch-overs, confusing temporary seams, or brittle scattered selector literals during visible UI work.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Read this rule file when implementing behavior changes. Keep the new path disabled by default behind a safe seam until proof is green, and keep automation-facing UI hooks registry-driven instead of hardcoded.
tests:
  - node scripts/checks/control-plane-check.mjs
  - node scripts/checks/delivery-flow-check.mjs
  - node scripts/checks/design-docs-check.mjs
  - node scripts/checks/header-check.mjs
  - tests/contract/ui-selector-registry-contract.test.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/skills/tdd/SKILL.md
  - .claude/skills/trunk-bba/SKILL.md
  - docs/adr/0002-trunk-based-delivery.md
related:
  - .claude/rules/testing.md
  - .claude/rules/design.md
  - .claude/skills/frontend-delivery/SKILL.md
---

# development.md
