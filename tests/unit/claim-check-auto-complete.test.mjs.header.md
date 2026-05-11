---
name: claim-check-auto-complete.test.mjs
description: Regression tests for auto-complete caller self-identification (TPL-254): commit-author does not gate completion; --agent= and --from-pre-commit-hook are the trust signals.
type: tests
layer: tests
public: false
edit: careful
sidecarOf: claim-check-auto-complete.test.mjs
covers:
  - scripts/checks/claim-check.mjs
  - scripts/coa-merge.mjs
specRefs: TPL-254
invariants:
  - verifyAgentAuthorization authorizes when callerAgent matches claim.agent regardless of git commit author.
  - verifyClaimWorkCommitted bypasses HEAD check when fromPreCommitHook=true.
  - Missing callerAgent is always rejected (Layer A gate).
  - Wrong agent is classified cross-agent-no-really (silent skip, not hard-reject).
---

# claim-check-auto-complete.test.mjs
