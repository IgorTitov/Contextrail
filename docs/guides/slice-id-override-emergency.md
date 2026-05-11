<!-- @HEADER
@version 0.8.12 | 2026-05-11
@purpose Operator emergency guide: when and how to use .coa/slice-id-override.json to bypass the slice-ID uniqueness check at commit time.
@sidecar slice-id-override-emergency.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Slice-ID override — emergency guide

The slice-ID uniqueness check (`checkSliceIdUniqueness` in `commit-msg-check.mjs`, ADR-0049) rejects commits whose slice ID already appears in any commit subject line in git history. This protects against parallel agents accidentally landing the same slice ID twice.

In rare recovery scenarios, the same slice ID must genuinely be reused. This guide explains the override mechanism.

## When to use the override

Use only in these scenarios:

| Category | When to use |
|----------|-------------|
| `history-restoration` | A prior ceremony completed the commit but the worktree was corrupted before the merge ceremony finished. The slice ID is in history but the work was lost or incomplete. You are re-committing the same slice. |
| `legitimate-reuse` | Two distinct deliverables are genuinely tracked under the same ID (e.g., a backport commit that must carry the same slice reference as its source). |
| `testing` | Test suites exercising the override path in an isolated repo. |

**Do NOT use `legitimate-reuse` or `history-restoration` unless the scenario genuinely matches.** The log is audited.

## How to create the override file

The override file is **ephemeral** — it must exist at the moment the `commit-msg` hook fires, and it expires 60 seconds after its `timestamp` field.

Create `.coa/slice-id-override.json` immediately before running `git commit`:

```json
{
  "slice_id": "TPL-NNN",
  "timestamp": "PASTE_ISO8601_NOW",
  "reason": "Explain why reuse is legitimate (must be >= 20 characters).",
  "category": "history-restoration"
}
```

You can use this one-liner to generate the timestamp:

```bash
node -e "console.log(new Date().toISOString())"
```

Then immediately commit:

```bash
git commit -m "feat(scope): your message (TPL-NNN)"
```

The hook validates the file, archives it to `.coa/slice-id-override-log/`, and deletes the input file.

## Valid categories

- `history-restoration` — re-committing after a failed ceremony.
- `legitimate-reuse` — two deliverables genuinely share the same tracking ID.
- `testing` — test suites only (not for production commits).

## TTL

The `timestamp` field must be **within 60 seconds** of the commit attempt. Stale files are rejected. Create the file and commit in one uninterrupted sequence.

## What happens on consumption

1. The override is validated (TTL, category, `slice_id` match, reason length).
2. A log entry is written to `.coa/slice-id-override-log/<timestamp>-<slice-id>.json`.
3. `.coa/slice-id-override.json` is deleted.
4. The commit proceeds.

The log directory IS tracked in git — it is the audit trail. The input file is gitignored.

## If the override is rejected

The hook prints the rejection reason. Common causes:

- **TTL expired** — you created the file more than 60 seconds ago. Re-create it.
- **Wrong category** — use only `legitimate-reuse`, `history-restoration`, or `testing`.
- **slice_id mismatch** — the `slice_id` field must exactly match the ID in the commit subject.
- **Reason too short** — the `reason` field must be at least 20 characters.
- **Future timestamp** — the clock on your machine is ahead by more than 5 seconds.

## See also

- `ADR-0049` — decision record for the uniqueness check
- `.coa/slice-id-override.example.json` — example file
- `scripts/lib/rationale-override.mjs` — implementation of the validation helper
