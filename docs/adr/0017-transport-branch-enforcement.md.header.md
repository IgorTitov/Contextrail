---
name: 0017-transport-branch-enforcement.md
description: ADR-0017 — transport-branch enforcement (R2); all commits land on trunk or tx-<slice> branches; ceremony bumps gated by a coa-merge marker.
type: docs
layer: docs
public: true
edit: careful
sidecarOf: 0017-transport-branch-enforcement.md
status: Accepted at v0.7.39
relatedRule: r2-transport-branch
relatedAdr:
  - docs/adr/0002-trunk-based-delivery.md
  - docs/adr/0008-inter-agent-coordination-protocol.md
  - docs/adr/0014-per-file-version-semantics.md
  - docs/adr/0015-test-isolation-enforcement.md
  - docs/adr/0016-worktree-lifecycle.md
ownsInvariants:
  - Branches accepted at commit time are exactly trunk + tx-<slice>.
  - Ceremony bumps on transport branches require a fresh coa-merge marker.
  - Transport-mode coa-merge ff-pushes via --force-with-lease against the captured mainSha.
codeOwners:
  - scripts/lib/transport-branch.mjs (pure helpers)
  - scripts/checks/transport-branch-check.mjs (pre-commit gate)
  - scripts/coa-worktree.mjs (--create --slice= entry)
  - scripts/coa-merge.mjs (transport-mode flow)
  - .githooks/pre-commit (Phase 2.7 wiring)
testSurface:
  - tests/unit/transport-branch.test.mjs
  - tests/integration/transport-branch-flow.test.mjs
  - tests/integration/coa-worktree-lifecycle.test.mjs (R2.A / R2.B blocks)
antiEvasionVectors: 13
---

# 0017-transport-branch-enforcement.md

ADR-0017 (R2) — codifies the transport-branch convention so the
long-lived backport-branch anti-pattern (Zvenix tpl222-backport,
zvx-053-tpl233-backport) is structurally impossible.
