---
name: transport-branch-check.mjs
description: R2 enforcement (ADR-0017) — refuses commits on non-trunk non-tx branches and gates VERSION/CHANGELOG/package.json bumps behind a coa-merge marker.
type: tooling
layer: tooling
public: false
edit: careful
sidecarOf: transport-branch-check.mjs
relatedAdr:
  - docs/adr/0017-transport-branch-enforcement.md
relatedRule: r2-transport-branch
modes:
  - --self-test (asserts helper behaviour, no scan)
  - --phase=pre-commit (default; pre-commit hook entry)
  - --json (machine-readable output)
  - --really (operator override for 7d age refusal; requires COA_OPERATOR=1)
nonSkippablePhase: 2.7
ports:
  - runPreCommit({ repoRoot, json, really, silent })
  - branchCreationTimestamp(branch)
  - checkMarker(repoRoot, branch)
  - ancestorPids(pid)
invariants:
  - Self-test runs first in pre-commit so a tampered helper fails meta-validation.
  - Trunk commits always pass (backward compatibility for direct main work).
  - Ceremony bumps on transport branches require a fresh marker with branch + parent-PID match.
  - Marker freshness max 5 minutes; chain-validation falls back to fresh+branch when ps/wmic unavailable.
  - 24h warn / 168h refuse age thresholds (operator-overrideable for refuse).
testSurface:
  - tests/integration/transport-branch-flow.test.mjs (≥ 18 cases)
---

# transport-branch-check.mjs

Pre-commit guardian for R2. Imports pure helpers from
`scripts/lib/transport-branch.mjs`, asks git for the current branch
and staged-file set, and decides pass/refuse with copy-pasteable
operator hints. Mirrors the R1 (test-isolation) self-test-first
invocation pattern.
