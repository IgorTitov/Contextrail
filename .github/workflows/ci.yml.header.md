---
fileId: contextrail-template:github:workflows:ci
module: .github/workflows
stability: stable
stabilityRationale: CI is the public-facing proof that every gate runs on every PR; changes here affect every contributor and must be reviewed deliberately.
steward: shared
api: GitHub Actions workflow
summary: CI pipeline running lint, format check, unit/integration/contract/BDD tests across Node 18/20/22, an E2E smoke job, quality gates (including agent-contract check), and gitleaks secret scanning on every push and PR.
owns: The hosted proof that lint, format, the four test layers, the E2E smoke pass, quality gates, and secret scanning pass on every push and PR — independent of whether the contributor's local hooks were active.
boundaries: This file defines the GitHub-hosted pipeline only. It must not become the canonical owner of any check; the deterministic scripts under scripts/checks/ remain the source of truth and this workflow only invokes them.
invariants: Every job runs on a clean ubuntu-latest with frozen-lockfile installs; the test job runs the full Node version matrix; the quality-gates job stays in sync with the .githooks/pre-commit deterministic check set; all actions are SHA-pinned; top-level permissions use least-privilege (contents read).
notesForLLM: When adding a new deterministic gate to .githooks/pre-commit, add the same script to the quality-gates job here so fork PRs without local hooks cannot bypass it.
linkedDocs: .githooks/pre-commit
related:
  - .github/workflows/release.yml
  - package.json
  - .githooks/pre-commit
---

# ci.yml
