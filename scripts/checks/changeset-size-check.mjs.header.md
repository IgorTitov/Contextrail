---
fileId: contextrail-template:scripts:checks:changeset-size-check
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/changeset-size-check.mjs [--json] [--strict]"
dependsOn:
  - node:child_process
  - scripts/checks/_shared.mjs
summary: Warn or fail when the current staged changeset is unusually large for a single bounded slice.
owns: The advisory size gate for batched staged changesets.
boundaries: This file warns about oversized slices only. It must not pretend to infer semantic correctness.
invariants: Thresholds stay explicit and deterministic; default mode warns without blocking; strict mode fails.
risks: If this script drifts, large batched commits may stop surfacing early enough for humans and agents to reslice work.
securityPrivacy: Local git metadata only; avoid network access.
notesForLLM: This is advisory by default. Use it to spot batching risk, not as a substitute for architectural judgment.
tests: pnpm test:integration
linkedDocs:
  - .claude/CLAUDE.md
  - AGENTS.md
related:
  - .githooks/pre-commit
  - scripts/checks/pre-impl-gate.mjs
---

# changeset-size-check.mjs
