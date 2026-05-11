---
fileId: contextrail-template:tests:integration:coa-worktree-lifecycle:test:mjs
module: tests/integration
stability: stable
steward: shared
api: Test
dependsOn:
  - scripts/coa-worktree.mjs
  - scripts/lib/worktree-audit.mjs
  - scripts/lib/worktree-refresh.mjs
  - tests/_setup/safe-git.mjs
summary: End-to-end R4 lifecycle proofs — every audit verdict reachable, refresh dry-run vs execute, teardown-stale operator gate, claim coordination, and audit-log write atomicity — all running on tmpdir bare-repo fixtures via safeGit (R1).
owns: Integration coverage for the audit / refresh / teardown-stale subcommands across 23 scenarios spanning the eight-tag verdict taxonomy + anti-evasion guards.
boundaries: Uses safeGit / safeGitSpawn exclusively (R1, ADR-0015). No direct execSync('git ...') anywhere; the static check would reject it at pre-commit time.
invariants: Every git invocation goes through the sanctioned helper; cwd resolves under tmpdir(); eligibility for teardown is verdict === clean-merged AND no claim AND not preserved AND COA_OPERATOR=1 AND prior dry-run marker.
risks: A direct execSync('git ...') would slip past the static check only by edits to test-isolation-check.mjs, which is in protectedPaths.
securityPrivacy: All work is confined to fresh tmpdir mkdtemp() roots; the runtime guard refuses to start with inherited GIT_DIR.
notesForLLM: Add new scenarios at the end of the file, keep them independent (no shared mutable state), and use safeGitSpawn for any args containing whitespace.
tests:
  - node --test "tests/integration/coa-worktree-lifecycle.test.mjs"
linkedDocs:
  - docs/adr/0016-worktree-lifecycle.md
  - docs/adr/0015-test-isolation-enforcement.md
  - docs/guides/parallel-sessions.md
related:
  - tests/integration/parallel-sessions.test.mjs
generated: false
---

# coa-worktree-lifecycle.test.mjs
