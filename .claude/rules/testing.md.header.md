---
fileId: contextrail-template:.claude:rules:testing
module: .claude/rules
stability: evolving
steward: shared
api: Topic rule document
dependsOn:
  - .claude/CLAUDE.md
  - .claude/skills/tdd/SKILL.md
  - .claude/skills/bdd-playwright/SKILL.md
  - scripts/checks/test-gate.mjs
summary: Capture the short repository-local testing rules that enforce TDD, regression-first bugfixes, and mandatory BDD for user-visible changes.
owns: The short rule set for proving-layer selection, regression-first fixes, and required BDD coverage for visible behavior changes.
boundaries: This file states concise testing rules only. It must not become a full testing handbook or duplicate the detailed test skills.
invariants: Testing rules stay short, enforceable, and aligned with the actual proving layers and commit gate expectations in the repo.
risks: Drift here can normalize missing regressions, oversized E2E reliance, or absent BDD coverage for visible changes.
securityPrivacy: Documentation content only; avoid embedding secrets or credentials.
notesForLLM: Read this rule file when test scope or proving strategy is part of the change. Keep edits crisp, enforceable, and consistent with test-gate behavior.
tests:
  - scripts/checks/test-gate.mjs
  - manual review on behavior-changing work
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/skills/tdd/SKILL.md
  - .claude/skills/bdd-playwright/SKILL.md
related: .claude/agents/test-guardian.md
---

# testing.md
