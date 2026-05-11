<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Patterns for migrating data formats behind a feature seam — dual-read, dual-write, and lifecycle.
@sidecar seam-data-migration.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Seam Data Migration Patterns

When a feature seam changes not just code paths but also data formats,
you need a migration strategy that keeps rollback safe.

---

## The problem

The [BBA Walkthrough](bba-walkthrough.md) shows migrating bcrypt to argon2.
But it dodges a real question: **what about existing bcrypt hashes in storage?**

If you switch the seam to active and start writing argon2 hashes, you can't
just flip the seam back to disabled — the old code can't read argon2 hashes.

## Pattern 1: Dual-read (lazy migration)

Read both formats. Convert on access. Write new format only.

```js
// Adapter behind the seam
function verifyPassword(stored, input) {
  if (isArgon2Hash(stored)) {
    return argon2Verify(stored, input);
  }
  // Legacy format — verify with old algorithm
  const valid = bcryptVerify(stored, input);
  if (valid) {
    // Lazy migrate: rewrite hash in new format on successful login
    const newHash = argon2Hash(input);
    updateStoredHash(userId, newHash);
  }
  return valid;
}
```

**When to use:** Read-heavy data where migration can happen gradually.
Rollback-safe: old code can still read old-format entries. New-format
entries accumulate but can be converted back if needed.

**Lifecycle:**
1. Seam disabled → reads old format, writes old format
2. Seam active → reads both formats, writes new format, lazy-converts on read
3. Monitor: track % of entries in new format
4. Once 100% converted → cleanup: remove old-format reader

## Pattern 2: Dual-write (shadow migration)

Write both formats during shadow mode. Read from old format.

```js
// During shadow mode
function saveHash(userId, password) {
  const oldHash = bcryptHash(password);
  const newHash = argon2Hash(password);

  // Write both — old is authoritative
  storage.set(`hash:${userId}`, oldHash);
  storage.set(`hash-v2:${userId}`, newHash);
}
```

**When to use:** When you need to verify the new format in production
before switching reads. Shadow mode writes both; you compare offline.

**Lifecycle:**
1. Shadow mode → write both, read old
2. Verify: compare old vs new format entries for correctness
3. Active → switch reads to new format
4. Cleanup → stop writing old format, remove old entries

## Pattern 3: Decoupled schema migration

For database schema changes, decouple the migration from the seam switch:

1. **Commit 1:** Add new column/table (additive schema change). Old code ignores it.
2. **Commit 2:** Seam in shadow mode — writes to both old and new columns.
3. **Commit 3:** Backfill migration — populate new column for existing rows.
4. **Commit 4:** Seam active — reads from new column.
5. **Commit 5:** Cleanup — drop old column (only after all rollback risk has passed).

**Key rule:** schema changes are always additive first. Never drop a column
in the same commit that switches the seam.

## Anti-patterns

| Anti-pattern | Why it's dangerous |
|-------------|-------------------|
| Schema migration coupled to seam switch | Can't roll back the seam without rolling back the schema |
| Write-only-new without dual-read | Old code can't read new-format data after rollback |
| Lazy migration without progress tracking | You never know when it's safe to remove the old reader |
| Converting in-place without backup | Can't revert if the conversion has bugs |

## Integration with seam lifecycle

```
Seam disabled ────> Shadow (dual-write) ────> Active (dual-read) ────> Cleanup
                    Write both formats       Read both, write new     Remove old format
                    Compare offline          Lazy-convert on read     Drop old column
```

The seam guards the code path. The migration guards the data.
Both must be independently rollback-safe.

See [Seam Rollback Procedure](seam-rollback-procedure.md) for emergency rollback
when data has already been migrated.
