---
fileId: contextrail-template:.claude:skills:trunk-bba:SKILL
module: .claude/skills/trunk-bba
stability: evolving
steward: human
api: Claude skill
dependsOn:
  - .claude/CLAUDE.md
  - docs/adr/0002-trunk-based-delivery.md
  - scripts/checks/test-gate.mjs
  - .githooks/pre-commit
summary: Define the repository-local delivery method for Trunk-Based Development with Branch by Abstraction, including atomic slice definition, safe seams, and parallel-actor coordination.
owns: The reusable delivery method for trunk-based development, safe abstraction seams, disabled-by-default new paths, and multi-actor coordination.
boundaries: This file defines a delivery method only. It must not become a generic release guide or duplicate artifact workflow details that belong elsewhere.
invariants: Trunk stays primary, new behavior reaches trunk only behind a safe seam, and old behavior remains active until the new path is proven.
risks: Drift here can normalize long-lived feature branches, unsafe early switch-overs, or silent conflicts around temporary abstractions.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Treat this as the operational definition of trunk/BBA in this repository. Keep it concrete, slice-oriented, and aligned with the actual pre-commit and proof flow.
tests:
  - node scripts/checks/control-plane-check.mjs
  - tests/integration/control-plane-coherence.test.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - docs/adr/0002-trunk-based-delivery.md
  - .githooks/README.md
related:
  - .claude/skills/tdd/SKILL.md
  - .claude/skills/bdd-playwright/SKILL.md
  - .claude/agents/repo-architect.md
---

# SKILL.md
