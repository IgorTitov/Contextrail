---
fileId: contextrail-template:tests:integration:claim-check-frozen-test
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
  - tests/_setup/safe-git.mjs
summary: TPL-317 — proves claim-check --frozen=<paths> subset stores a frozen list at acquire time, --enforce --staged refuses commits that touch frozen paths in any active claim, two-factor operator override is required for bypass, legacy claims without a frozen field continue to behave unchanged, and --query / --audit surface frozen-path counts.
owns: The behavioral proof that the F12 explicit-scope defense-in-depth gate actually fires end-to-end at the CLI boundary, that backwards compatibility with pre-TPL-317 claim corpora is preserved (Tests #6, #7), and that the two-factor override mirrors ADR-0041 (Tests #9-#12).
boundaries: Integration spec only. Spawns the real claim-check CLI in an isolated tempdir cwd; never touches the repo's own .claims/. Each scenario constructs its own temp repo, hand-writes .claims/clm-*.json files for fixture control, and cleans up in finally. Override scenarios write .git/COMMIT_EDITMSG directly to simulate git commit -m's COMMIT_EDITMSG seeding.
invariants: Tests #6 and #7 (backwards compatibility) MUST pass without any modification to legacy claim shapes — failure of either is a hard regression. Tests #10/#11/#12 pin the two-factor override (env required, marker required, ≥3-char reason). Test #8 pins the "frozen wins over targets" semantic.
risks: If the test starts mutating the repo's real .claims/ directory (e.g., via cwd misconfiguration), it would silently corrupt operational claim fixtures. Mitigation - the runClaimCheck helper sets CLAIMS_DIR explicitly to the temp repo's .claims/ directory.
securityPrivacy: Local-only; no network, no secrets. The override-reason strings used in fixtures are dummy text and do not leak any operator credentials.
notesForLLM: When extending this suite, follow the existing pattern - createRepo() seeds a real git repo so .git/COMMIT_EDITMSG resolution works; CLAIMS_DIR env override keeps fixtures isolated; COA_SKIP_HISTORY_CHECK=1 prevents history-match against the live repo from poisoning slice-id collision checks. Use safeGitSpawn for every git op (R1 / ADR-0015).
tests: pnpm test:integration
specRefs:
  - TPL-317
linkedDocs:
  - tests/integration/README.md
  - .claims/README.md
  - docs/adr/0008-inter-agent-coordination-protocol.md
  - docs/adr/0043-claim-check-frozen-paths.md
related:
  - scripts/checks/claim-check.mjs
  - tests/integration/claim-check-collision-rehearsal.test.mjs
  - tests/integration/test-deletion-guard.test.mjs
---

# claim-check-frozen.test.mjs
