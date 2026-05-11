---
name: transport-branch.mjs
description: Pure helpers for R2 / ADR-0017 transport-branch enforcement — name validation, marker file shape, age thresholds. No git, no I/O.
type: tooling
layer: tooling
public: false
edit: careful
sidecarOf: transport-branch.mjs
relatedAdr:
  - docs/adr/0017-transport-branch-enforcement.md
relatedRule: r2-transport-branch
ports:
  - isTransportBranchName(name)
  - isTrunkBranchName(name)
  - isAcceptableBranchName(name)
  - extractSliceFromTransportName(name)
  - findBannedBranchReason(name)
  - mergingMarkerPath(repoRoot)
  - mergingMarkerContent({ pid, branch, ts })
  - parseMergingMarker(content)
  - hoursSinceBranchCreation(creationTs, nowTs)
  - ageVerdict(hours, warnThreshold?, refuseThreshold?)
  - ceremonyFilesIn(stagedPaths)
constants:
  - TRANSPORT_BRANCH_AGE_WARN_HOURS=24
  - TRANSPORT_BRANCH_AGE_REFUSE_HOURS=168
  - MERGING_MARKER_FILENAME=.coa-merging.lock
  - MERGING_MARKER_MAX_AGE_MS=300000
  - CEREMONY_FILES=[VERSION, package.json, CHANGELOG.md]
  - BANNED_BRANCH_PATTERNS (frozen list)
invariants:
  - Module is pure logic — no node:fs, no node:child_process imports.
  - Branch-name regex `tx-<UPPER_PROJECT>-<DIGITS>(-<lower-suffix>)?` is the only accepted shape.
  - Marker shape `{pid, branch, ts}` is the contract — checker enforces parent-PID match.
  - CEREMONY_FILES list is fixed: VERSION, package.json, CHANGELOG.md.
testSurface:
  - tests/unit/transport-branch.test.mjs (≥ 25 cases, ≥ 1 per port)
  - tests/integration/transport-branch-flow.test.mjs (uses these exports via the checker)
---

# transport-branch.mjs

Pure helpers backing R2 (ADR-0017): validate transport-branch names,
compose/parse the merge marker, classify branch age. Exposed via small
named exports so the static checker (`scripts/checks/transport-branch-check.mjs`)
and the worktree creator (`scripts/coa-worktree.mjs`) both consume the
same source-of-truth without duplicating regex/threshold magic.

The file is the canonical owner of the transport-branch convention's
machine-readable rules. Doc-side ownership lives in
`docs/adr/0017-transport-branch-enforcement.md`.
