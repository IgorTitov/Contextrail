<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Emergency rollback procedure when a seam switch causes issues.
@sidecar seam-rollback-procedure.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Seam Rollback Procedure

Emergency runbook for rolling back a seam that was switched to active
and is causing problems.

---

## When to use this

The new path (active seam) is causing errors, performance degradation,
or incorrect results. You need to revert to the old path immediately.

## Decision tree

```
Is the seam still registered? (Has cleanup been done?)
├─ No  → Seam was already removed. You must revert the cleanup commit.
│        git revert <cleanup-commit-hash>
└─ Yes
   ├─ Has the new path changed any stored data format?
   │  ├─ No  → Flip the seam to disabled. This is instant and safe.
   │  └─ Yes → Flip the seam AND apply a forward-fix for data.
   │           See "Data rollback" below.
   └─ (Either way, flip the seam first — it's the fastest path.)
```

## Step 1: Flip the seam

```js
// In your app initialization or emergency script:
seams.disable('auth.argon2-migration');
```

This immediately routes all calls through the old path.
No deployment needed if seam state is configurable at runtime.

## Step 2: Verify the old path works

```bash
# Run tests with seam explicitly disabled
SEAM_STATE=all-disabled pnpm test:unit

# Or verify the specific module
node --test "tests/unit/auth.test.mjs"
```

## Step 3: Deploy with seam disabled

If seam state is in config:

```js
// config/seams.json
{
  "auth.argon2-migration": {
    "state": "disabled",
    "owner": "auth-team",
    "description": "Rolled back — argon2 causing latency spike"
  }
}
```

## Data rollback

When the new path has written data in a new format:

**If using dual-write (recommended):** Both formats exist in storage.
Flipping the seam to disabled means reads now use the old format.
New-format data is orphaned but harmless. Clean up later.

**If using write-only-new:** Old-format data may be stale or missing.
You need a forward-fix migration:

1. Flip the seam to disabled (stops new writes immediately)
2. Write a migration script that converts new-format data back to old format
3. Run the migration
4. Verify data integrity

See [Seam Data Migration](seam-data-migration.md) for dual-read/dual-write patterns
that make rollback safe.

## When seam flip is NOT enough

- **Schema migration already ran** — if a database schema change was coupled
  to the seam switch, flipping the seam won't undo the schema. You need a
  reverse migration. This is why schema changes should be decoupled from
  seam switches when possible.
- **External system notified** — if the new path sent webhooks, emails, or
  API calls to external systems, flipping the seam won't undo those.
  Forward-fix the external state.
- **Cleanup commit already merged** — the old path code is gone. You must
  `git revert` the cleanup commit to restore it.

## Post-rollback

1. File a post-mortem note in the seam registration's `description` field
2. Keep the seam registered in disabled state (don't remove it)
3. Investigate the root cause before re-enabling
4. Re-enable via shadow mode first — use `whenShadow` to verify the fix
   before switching back to active

## Prevention: shadow mode first

The best rollback is the one you don't need. Before switching a seam to active:

1. Run in **shadow mode** for at least 1 sprint
2. Monitor divergence via `onDivergence` callback
3. Only switch to active when divergence rate is zero
4. Keep the old path available for at least 1 sprint after switching

See [Seam Creation Checklist](seam-creation-checklist.md) §5 for shadow mode setup.
