---
fileId: contextrail-template:scripts:checks:header-backfill
module: scripts/checks
stability: evolving
steward: shared
api: node CLI
dependsOn:
  - scripts/checks/_shared.mjs
  - scripts/lib/header.mjs
  - scripts/lib/fs-helpers.mjs
  - scripts/lib/repo-meta.mjs
  - node:child_process
  - node:fs/promises
  - node:url
summary: One-shot migration script that walks every header-bearing file and rewrites @version to the file's last-content-change VERSION (ADR-0014 / TPL-233).
owns: The git log + git show resolution algorithm and the per-file structured audit report at docs/_generated/header-backfill-report.json (gitignored).
boundaries: Runs once per repository as the migration step bundled with TPL-233. Never invoked by hooks or CI; the steady-state stamping path is `header-fix --files-from=-` driven by the post-commit hook.
invariants: Empty git history → fall back to current VERSION + warn. git show <hash>:VERSION failure → fall back to current VERSION + warn. Idempotent re-runs on a converged tree drift zero files. Sidecar @version mirrors parent's resolved value (parent-tracking, ADR-0014).
notesForLLM: Exports `resolveBackfillVersion` as a pure function for unit testing. The CLI `main()` runs only when invoked directly; `tests/unit/header-backfill.test.mjs` imports the helper without triggering execution.
tests:
  - tests/unit/header-backfill.test.mjs
  - tests/integration/parallel-sessions.test.mjs
linkedDocs:
  - docs/adr/0014-per-file-version-semantics.md
  - .githooks/post-commit
  - .githooks/pre-commit
specRefs:
  - TPL-233
related:
  - scripts/checks/header-fix.mjs
  - scripts/lib/header.mjs
---

# header-backfill.mjs
