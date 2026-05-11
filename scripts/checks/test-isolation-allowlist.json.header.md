---
fileId: contextrail-template:scripts:checks:test-isolation-allowlist:json
module: scripts/checks
stability: stable
steward: shared
api: JSON config
summary: R1 allowlist (ADR-0015) — files explicitly cleared to invoke git outside the safeGit helper. Initial state is empty; growth is audit-visible.
owns: |
  The list of test files that bypass the test-isolation static check.
  Each entry must be paired with a per-file annotation
  `// @test-isolation: live-repo-allowed | reason: <text >= 60 chars>`
  and a CHANGELOG entry describing the addition reason.
boundaries: |
  Allowlist scope is the static check only. The runtime guard still
  enforces tmpdir-cwd at execution time regardless of allowlist
  membership.
invariants: |
  - files[] starts empty in the template; the meta-test asserts this.
  - Both the per-file marker AND the allowlist entry are required;
    one without the other still fails.
  - Allowlist file is in claim-check protectedPaths (modifying without
    a claim is blocked at pre-commit).
risks: |
  - Bulk-adding entries silently widens the escape hatch. The meta-test
    pins the empty-initial-state, so any growth visible at CI time
    fails until an explicit assertion update lands.
securityPrivacy: |
  Configuration only. No secrets.
notesForLLM: |
  Do not add to this list to suppress a false positive — investigate
  whether the test should switch to safeGit instead. If a genuine
  exception is unavoidable, add the per-file marker, the allowlist
  entry, AND a CHANGELOG line citing the reason in the same commit.
linkedDocs:
  - docs/adr/0015-test-isolation-enforcement.md
related:
  - scripts/checks/test-isolation-check.mjs
generated: false
---

# test-isolation-allowlist.json
