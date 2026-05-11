<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose End-to-end BBA walkthrough showing seam introduction, shadow/active switchover, and cleanup across 3 atomic commits.
@sidecar bba-walkthrough.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit rewrite-ok -->

# BBA Walkthrough: 3 Commits from Seam to Cleanup

A concrete end-to-end example of Branch by Abstraction using the `feature-seams` module. By the end you will see how a non-trivial implementation swap lands on trunk safely across three atomic commits.

**Scenario:** The `auth` module currently hashes passwords with bcrypt. We want to switch to argon2. A direct swap risks breakage — BBA lets both implementations coexist until the new path is proven.

**Prerequisites:** Familiarity with hexagonal modules and the [feature-seams public API](../../modules/feature-seams/public-api.mjs). See [ADR 0002](../adr/0002-trunk-based-delivery.md) for the delivery model.

---

## Commit 1 — Introduce the seam (disabled by default)

**Goal:** Register a `use-argon2` seam, create the new adapter, and wire the seam into the existing port — without changing any behavior.

### 1a. Register the seam

In the auth module's bootstrap or composition root:

```javascript
// modules/auth/bootstrap.mjs
import { createMemorySeamAdapter, SEAM_STATES } from '../feature-seams/public-api.mjs';

const seams = createMemorySeamAdapter();

seams.register('use-argon2', {
  state: SEAM_STATES.DISABLED,   // old path stays active
  owner: 'auth-team',
  description: 'Switch password hashing from bcrypt to argon2',
});

export { seams };
```

### 1b. Create the new adapter alongside the old one

```javascript
// modules/auth/adapters/argon2-hasher.mjs  (NEW FILE)
export function createArgon2Hasher() {
  return {
    async hash(password) {
      // argon2 implementation
      const { hash } = await import('argon2');
      return hash(password);
    },
    async verify(password, hashed) {
      const { verify } = await import('argon2');
      return verify(hashed, password);
    },
  };
}
```

The existing `bcrypt-hasher.mjs` is untouched.

### 1c. Wire the seam into the hash-password port

```javascript
// modules/auth/domain/auth-service.mjs
import { whenEnabled } from '../../feature-seams/public-api.mjs';
import { createBcryptHasher } from '../adapters/bcrypt-hasher.mjs';
import { createArgon2Hasher } from '../adapters/argon2-hasher.mjs';

const bcrypt = createBcryptHasher();
const argon2 = createArgon2Hasher();

export function hashPassword(seams, password) {
  return whenEnabled(
    seams,
    'use-argon2',
    () => argon2.hash(password),   // new path (only when seam is active)
    () => bcrypt.hash(password),   // old path (default)
  );
}
```

### 1d. Tests

```javascript
// tests/unit/auth-bba.test.mjs
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemorySeamAdapter, SEAM_STATES } from '../../modules/feature-seams/public-api.mjs';
import { hashPassword } from '../../modules/auth/domain/auth-service.mjs';

describe('auth BBA: use-argon2 seam', () => {
  test('disabled seam uses bcrypt (old path)', async () => {
    const seams = createMemorySeamAdapter();
    seams.register('use-argon2', { state: SEAM_STATES.DISABLED, owner: 'test' });

    const hashed = await hashPassword(seams, 'secret');
    assert.ok(hashed.startsWith('$2b$'), 'expected bcrypt hash prefix');
  });

  test('active seam uses argon2 (new path)', async () => {
    const seams = createMemorySeamAdapter();
    seams.register('use-argon2', { state: SEAM_STATES.ACTIVE, owner: 'test' });

    const hashed = await hashPassword(seams, 'secret');
    assert.ok(hashed.startsWith('$argon2'), 'expected argon2 hash prefix');
  });
});
```

### Why this is safe on trunk

- The seam defaults to `DISABLED` — every caller gets bcrypt, the same behavior as before.
- The new argon2 adapter is reachable only through the seam guard.
- Both paths are tested independently. Zero behavior change for production.

### Claim (if cross-boundary)

Only needed if `auth-service.mjs` is claimed by another agent:

```bash
node scripts/checks/claim-check.mjs --acquire \
  --agent=auth-team --slice=S-11 \
  --targets=modules/auth/domain/auth-service.mjs \
  --action=modify
```

---

## Commit 2 — Prove the new path

**Goal:** Run the new path in shadow or active mode, confirm equivalence, and build confidence before removing the old code.

### 2a. Shadow mode (optional but recommended)

Shadow mode runs both paths and returns the old result, letting you compare without risk:

```javascript
// modules/auth/domain/auth-service.mjs  (updated)
export async function hashPassword(seams, password) {
  const seamEntry = seams.list().find(s => s.flag === 'use-argon2');

  if (seamEntry?.state === 'shadow') {
    const [oldResult, newResult] = await Promise.all([
      bcrypt.hash(password),
      argon2.hash(password),
    ]);
    console.log('[BBA shadow] bcrypt and argon2 both produced hashes');
    return oldResult;  // old path wins in shadow mode
  }

  return whenEnabled(
    seams,
    'use-argon2',
    () => argon2.hash(password),
    () => bcrypt.hash(password),
  );
}
```

### 2b. Switch to active

Once shadow logs confirm equivalence, flip the seam:

```javascript
// In bootstrap or configuration:
seams.register('use-argon2', {
  state: SEAM_STATES.ACTIVE,   // new path wins
  owner: 'auth-team',
  description: 'Switch password hashing from bcrypt to argon2',
});
```

### 2c. Tests

```javascript
test('shadow mode runs both paths, returns old result', async () => {
  const seams = createMemorySeamAdapter();
  seams.register('use-argon2', { state: SEAM_STATES.SHADOW, owner: 'test' });

  const hashed = await hashPassword(seams, 'secret');
  assert.ok(hashed.startsWith('$2b$'), 'shadow returns bcrypt result');
});
```

All existing tests still pass — callers unaware of the seam see no change.

### Why this is safe on trunk

- Shadow mode produces zero behavior change — old result is always returned.
- Active mode is opt-in by the seam owner. No caller needs to change.
- If argon2 has a problem, flipping the seam back to `DISABLED` is a one-line fix.

---

## Commit 3 — Switch and cleanup

**Goal:** The new path is proven. Remove the seam, the old adapter, and simplify the code.

### 3a. Remove the seam guard

```javascript
// modules/auth/domain/auth-service.mjs  (final)
import { createArgon2Hasher } from '../adapters/argon2-hasher.mjs';

const argon2 = createArgon2Hasher();

export function hashPassword(password) {
  return argon2.hash(password);
}
```

The `whenEnabled` guard, the bcrypt import, and the shadow logic are all gone.

### 3b. Remove the old adapter

Delete `modules/auth/adapters/bcrypt-hasher.mjs`.

### 3c. Remove the seam registration

```javascript
// modules/auth/bootstrap.mjs  (cleaned up)
// No seam registration — the migration is complete.
```

### 3d. Update tests

```javascript
describe('auth: password hashing', () => {
  test('hashes with argon2', async () => {
    const hashed = await hashPassword('secret');
    assert.ok(hashed.startsWith('$argon2'), 'expected argon2 hash');
  });
});
```

Remove the seam-specific tests — they tested a temporary mechanism that no longer exists.

### Why this is safe on trunk

- The seam was `ACTIVE` in the previous commit — all callers already use argon2.
- This commit only removes dead code (bcrypt adapter, seam wiring).
- The module is now simpler than before the migration started.

---

## The pattern

| Commit | Seam state | Active path | Risk |
| --- | --- | --- | --- |
| 1. Introduce | `disabled` | bcrypt (old) | Zero — nothing changes |
| 2. Prove | `shadow` then `active` | argon2 (new) | Low — instant rollback via seam |
| 3. Cleanup | removed | argon2 (direct) | Zero — dead code removal |

Each commit lands on trunk independently. At no point is trunk broken. The seam is a temporary coordination mechanism — it exists only long enough to de-risk the switch, then disappears.

---

## When to use BBA

BBA is worth the overhead when:

- **The swap is non-trivial** — a direct replacement risks breakage or needs monitoring.
- **Multiple agents or developers** may touch the same module — the seam prevents conflicts.
- **Rollback must be instant** — flipping a seam state is faster than reverting a commit.

For trivial one-line fixes where old and new behavior cannot coexist, a direct
commit is acceptable — but always file a claim first to prevent parallel conflicts.

---

## Cross-module seams

When a seam affects multiple modules (e.g., `auth` changes hashing and `permission`
needs to verify the new hashes):

1. **Seam lives in the owning module** — `auth` owns `auth.argon2-migration`
2. **Consumer modules** import the seam flag through auth's `public-api.mjs`:
   ```js
   import { whenEnabled } from '../../modules/auth/public-api.mjs';
   // permission module checks auth's seam state
   ```
3. **File claims** on all affected modules before starting:
   ```bash
   node scripts/checks/claim-check.mjs --acquire \
     --agent=feature-implementer --slice=TPL-XXX \
     --targets=modules/auth/public-api.mjs,modules/permission/public-api.mjs \
     --action=modify
   ```
4. The seam registration, guard calls, and cleanup all stay in `auth`.
   `permission` only reads seam state — it never registers or modifies it.

See [Seam Creation Checklist](seam-creation-checklist.md) §7 for the full pattern.

---

## Related guides

- [Seam Creation Checklist](seam-creation-checklist.md) — generic template
- [Seam Rollback Procedure](seam-rollback-procedure.md) — emergency runbook
- [Seam Data Migration](seam-data-migration.md) — dual-read/dual-write patterns
- [ADR 0002](../adr/0002-trunk-based-delivery.md) — trunk-based delivery model
- [Inter-Agent Coordination](inter-agent-coordination.md) — claims protocol
