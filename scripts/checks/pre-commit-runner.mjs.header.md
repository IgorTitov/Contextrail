---
fileId: contextrail-template:scripts:checks:pre-commit-runner
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/pre-commit-runner.mjs [--fast|--phase=N|--json|--dry-run]"
dependsOn:
  - node:child_process
summary: Single-process pre-commit orchestrator replacing bash-based multi-spawn.
owns: Phase ordering, parallel vs sequential execution, scope detection, gate logic.
boundaries: Orchestrator only — delegates to individual check scripts via execFileSync.
invariants: Phase list must match .githooks/pre-commit phases. Gate and skip logic must be identical.
risks: Drift between bash hook and this runner if one is updated without the other.
securityPrivacy: Local execution only. Runs the same scripts as the bash hook.
notesForLLM: When adding a new check to pre-commit, update both .githooks/pre-commit and this runner.
related:
  - .githooks/pre-commit
  - scripts/checks/README.md
---

# pre-commit-runner.mjs
