<!-- @HEADER
@version 0.8.11 | 2026-05-11
@purpose Operator guide — when and how to use the R5 rationale-file override for emergency direct-trunk commits.
@sidecar r5-override-emergency.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# R5 override — emergency direct-trunk commit

R5 (`main-worktree-guard.mjs`) blocks every `git commit` from the main
worktree. The **only** authorised bypass is a one-shot rationale file placed
at `.coa/r5-override.json` immediately before the commit.

`COA_OPERATOR=1` alone no longer bypasses R5 (changed in ADR-0047 / TPL-329).

---

## When this is justified

| Category | Meaning | Example |
| --- | --- | --- |
| `self-modifying-ceremony` | The slice modifies the pre-commit hook or coa-merge/coa-worktree scripts themselves, and the ceremony cannot run its own tests. | Fixing a bug in `coa-merge.mjs` that prevents worktree creation. |
| `hotfix-trunk-blocked` | The transport ceremony machinery is itself broken and cannot be used for this recovery commit. | `coa-worktree --create` fails due to corrupted git state. |
| `docs-only-no-headers` | The change touches only plain `.md` files that carry no slim inline header — pre-commit Phase 5 would not re-stamp anything. | Typo fix in `README.md`. |

**If your change does not match one of these three categories, you must use
the transport ceremony.** Direct commits to trunk without override are a
process violation regardless of change size.

### `self-modifying-ceremony` — ceremony path requirement (TPL-331)

When using `self-modifying-ceremony`, every path listed in `expected_files`
**must match at least one ceremony path pattern**. The guard enforces this
at validation time and refuses with `category-files-mismatch` if any path
does not qualify.

Allowed ceremony paths include:

- `scripts/coa-*.mjs` — top-level ceremony scripts (`coa-merge.mjs`,
  `coa-worktree.mjs`, `coa-recover.mjs`)
- `scripts/lib/` prefixes: `coa-`, `transport-branch`, `r5-override`,
  `fs-helpers`, `worktree-audit`, `worktree-refresh`
- `scripts/checks/` ceremony guards: `main-worktree-guard.mjs`,
  `transport-branch-check.mjs`, `test-isolation-check.mjs`,
  `hook-integrity-check.mjs`, `trunk-integrity-check.mjs`
- `.githooks/pre-commit`, `.githooks/commit-msg`, `.githooks/pre-push`,
  `.githooks/post-commit`

If your slice touches files outside this set (e.g., a module adapter or
application code), use `hotfix-trunk-blocked` or the normal transport
ceremony instead.

---

## Procedure

### Step 1 — Verify the emergency is real

Ask: "Can I create a transport worktree and run coa-merge?"

If yes → use the ceremony. This path is fewer total commands.

### Step 2 — Create the rationale file (TTL: 60 seconds)

The file expires 60 seconds after the `timestamp` field. Create it
immediately before running `git commit`:

```bash
node -e "
const fs = require('fs');
const override = {
  timestamp: new Date().toISOString(),
  slice_id: 'TPL-NNN',  // replace with your slice ID
  reason: 'Describe the emergency here — at least 20 characters explaining why the transport ceremony is unavailable.',
  expected_files: [
    'path/to/file1.mjs',
    'path/to/file2.md'
  ],
  category: 'hotfix-trunk-blocked'  // or self-modifying-ceremony / docs-only-no-headers
};
fs.writeFileSync('.coa/r5-override.json', JSON.stringify(override, null, 2));
console.log('Override file written. You have 60 seconds.');
"
```

Or copy `.coa/r5-override.example.json`, edit it, and save to
`.coa/r5-override.json`.

### Step 3 — Commit immediately

```bash
git add <your files>
git commit -m "type(scope): message (SLICE-ID)"
```

The pre-commit Phase 0 guard:

1. Reads and validates `.coa/r5-override.json`.
2. On success: archives it to `.coa/r5-override-log/<ts>-<slice-id>.json`
   and deletes the input file.
3. Allows the commit to proceed.

The override file is **one-shot** — it authorises exactly one commit.

### Step 4 — Include the log entry in the commit

The archive file created in `.coa/r5-override-log/` should be staged and
included in the same commit so the audit trail lands on trunk atomically:

```bash
git add .coa/r5-override-log/
```

---

## What NOT to do

- Do not pre-create the override file before starting your work session
  (it will expire before you commit).
- Do not re-use the same override file for multiple commits (it is deleted
  after the first use — create a fresh file for each commit).
- Do not set `COA_OPERATOR=1` and expect it to bypass R5 — it does not.
- Do not add `.coa/r5-override.json` to git (it is gitignored).

---

## Audit trail

Every accepted override is archived to `.coa/r5-override-log/`. Review this
directory periodically. A high frequency of log entries is a signal that the
transport ceremony should be repaired or that the override is being misused.

---

## Related

- `docs/adr/0047-r5-override-rationale-file.md` — why the rationale-file
  design was chosen over the env-var bypass.
- `docs/adr/0018-main-worktree-guard.md` — original R5 design.
- `scripts/lib/r5-override.mjs` — library that validates and consumes the file.
- `scripts/checks/main-worktree-guard.mjs` — pre-commit Phase 0 guard.
