---
fileId: contextrail-template:tests:integration:parallel-sessions-test
module: tests/integration
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:child_process
  - node:fs
  - node:os
  - node:path
  - scripts/checks/claim-check.mjs
  - scripts/checks/release-discipline-check.mjs
  - scripts/checks/dependency-graph.mjs
  - scripts/coa-worktree.mjs
  - scripts/coa-merge.mjs
summary: Integration scenarios proving parallel-session safety — claim acquisition, stale auto-expiration, VERSION race protection, dep-graph regeneration on demand, and protected-path enforcement, all exercised against the real CLI scripts in temp git repos.
owns: The end-to-end behavioural proof that the parallel-hardening surfaces (claims, VERSION discipline, dep-graph staleness recovery) actually fire correctly at the CLI boundary. Adds the TPL-220 regression that proves running dependency-graph.mjs with no flags brings a stale artefact back to fresh so a follow-up --check passes.
boundaries: Integration spec only. Each scenario spawns scripts in an isolated mkdtempSync directory, must never touch the repo's real .claims/, .git, VERSION, or docs/_generated/ files, and must clean up its temp dir in a finally block.
invariants: Every existing scenario must keep its assertion shape — adding scenarios is fine, weakening assertions is not. The TPL-220 dep-graph scenario must keep all four steps (initial gen, stale mutation, --check fails, plain run regenerates, --check passes) because each step pins one link of the chain that pre-commit Phase 5 → Phase 6 relies on.
risks: If a scenario chdirs into the repo or shares a temp path between runs, it can race other parallel sessions or corrupt the example fixtures other gates read. Using mkdtempSync per scenario and absolute REPO_ROOT references is mandatory.
securityPrivacy: Local-only; no network, no secrets.
notesForLLM: When asserting CLI exit codes from spawnSync, always spawn with `cwd: <tempdir>` and use `process.execPath` (not "node") for portability. The TPL-220 scenario uses the same pattern as the claim-check rehearsal — REPO_ROOT-relative script path, tempdir cwd. Keep the scenarios deterministic — no sleeps, no real time-based assertions beyond pastDate/farFuture helpers.
tests: pnpm test:integration
specRefs:
  - TPL-192
  - TPL-220
linkedDocs:
  - tests/integration/README.md
  - .claims/README.md
  - docs/backlog/inter-agent-coordination.md
  - docs/prd/parallel-session-hardening.md
related:
  - scripts/checks/claim-check.mjs
  - scripts/checks/dependency-graph.mjs
  - scripts/coa-worktree.mjs
  - scripts/coa-merge.mjs
---

# parallel-sessions.test.mjs
