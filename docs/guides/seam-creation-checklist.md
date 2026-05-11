<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Step-by-step checklist for creating a feature seam — decision tree, naming, registration, testing, cleanup.
@sidecar seam-creation-checklist.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Seam Creation Checklist

Generic step-by-step template for creating a feature seam using
Branch by Abstraction (BBA). For a concrete end-to-end example, see
[BBA Walkthrough](bba-walkthrough.md).

---

## 1. Do I need a seam?

```
Is this a behavior change?
├─ No  → Direct commit. No seam needed.
│        (Docs, config, refactor with identical behavior — no seam.)
└─ Yes
   ├─ Trivial one-line fix where old and new cannot coexist?
   │  └─ Yes → Direct commit. File a claim first to prevent parallel conflicts.
   ├─ Can the change be done in one safe atomic commit?
   │  ├─ Yes → Direct commit with tests. File a claim first.
   │  └─ No  → Create a seam. Continue to step 2.
   └─ Are multiple agents/humans working on the same area?
      └─ Yes → Create a seam + file a claim. See §7 below.
```

## 2. Choose the right pattern

| Pattern | When to use | Module |
|---------|-------------|--------|
| **feature-seams registry** | Migrating an implementation (old adapter → new adapter, old algorithm → new). Temporary — will be removed after cutover. | `modules/feature-seams/` |
| **Contract-first injection** | Volatile browser adapter behind a stable facade. The facade is permanent; only the implementation swaps. | `apps/starter/examples/contract-seam/` |
| **app-config seam** | Platform-specific wiring (hosted vs PWA vs Electron). Based on runtime mode detection, not feature flags. | `apps/starter/app-config.mjs` (ADR-0004) |

**Rule of thumb:** if the seam is temporary and will be removed → feature-seams registry.
If the abstraction layer is permanent → contract-first or app-config.

## 3. Name the seam

Convention: `<module>.<behavior>` in kebab-case.

| Good | Bad |
|------|-----|
| `auth.argon2-migration` | `use-argon2` (no module prefix) |
| `payments.stripe-v2` | `newPayments` (camelCase, no module) |
| `ui.dark-mode` | `dark-mode` (no module prefix) |

`seam-audit.mjs` warns on non-conforming names. Test-only flags
(`feat-*`, `test-*`) are exempt.

## 4. Register the seam

```js
import { createMemorySeamAdapter, SEAM_STATES } from '../../modules/feature-seams/public-api.mjs';

const seams = createMemorySeamAdapter();

seams.register('auth.argon2-migration', {
  state: SEAM_STATES.DISABLED,   // always start disabled
  owner: 'auth-team',
  description: 'Migrate password hashing from bcrypt to argon2',
});
```

## 5. Choose the right guard

| Guard | Use when |
|-------|----------|
| `whenEnabled(port, flag, newPath, oldPath)` | Binary branch: run new OR old path |
| `whenShadow(port, flag, newPath, oldPath, options?)` | Verification: run BOTH paths, return old, detect divergence |
| `ifEnabled(port, flag, action)` | Conditional: run action only if enabled, no else branch |

### Shadow mode — verification before switching

```js
import { whenShadow } from '../../modules/feature-seams/public-api.mjs';

const hash = whenShadow(seams, 'auth.argon2-migration',
  () => argon2Hash(password),       // new path
  () => bcryptHash(password),       // old path (returned)
  {
    onDivergence: (flag, oldResult, newResult) => {
      log.warn(`Shadow divergence on ${flag}`, { oldResult, newResult });
    },
    onError: (flag, err) => {
      log.error(`Shadow new-path error on ${flag}`, err);
    },
  },
);
```

Shadow mode duration guidance: run for at least 1 sprint or until
N invocations without divergence (project decides N). Then switch to active.

## 6. Test both paths

Write tests that prove:

1. **Disabled state** → old path runs, correct result
2. **Active state** → new path runs, correct result
3. **Shadow state** → both paths run, old result returned, divergence detectable

```js
test('old path when seam disabled', () => {
  seams.register('auth.argon2-migration', { state: SEAM_STATES.DISABLED, owner: 'test' });
  const result = whenEnabled(seams, 'auth.argon2-migration', newHash, oldHash);
  assert.equal(result, 'bcrypt-hash');
});

test('new path when seam active', () => {
  seams.register('auth.argon2-migration', { state: SEAM_STATES.ACTIVE, owner: 'test' });
  const result = whenEnabled(seams, 'auth.argon2-migration', newHash, oldHash);
  assert.equal(result, 'argon2-hash');
});
```

## 7. Cross-module seams

When a seam affects more than one module:

1. **Seam lives in the owning module** — the module whose behavior is changing.
2. **Consumer modules** import the seam flag through the owning module's `public-api.mjs`.
3. **File claims** on all affected `public-api.mjs` files:
   ```bash
   node scripts/checks/claim-check.mjs --acquire \
     --agent=feature-implementer \
     --slice=TPL-XXX \
     --targets=modules/auth/public-api.mjs,modules/permission/public-api.mjs \
     --action=modify
   ```
4. The seam registration, guard calls, and cleanup all stay in the owning module.
   Consumers only read seam state — they don't register or modify it.

## 8. Cleanup

After the new path is proven and active for the agreed duration:

1. Remove the seam guard — call `newPath()` directly
2. Delete the old adapter/implementation
3. Remove the seam registration
4. Remove the claim
5. Simplify tests — remove old-path and shadow tests

This is its own atomic commit: "cleanup: remove auth.argon2-migration seam".

---

**References:**
- [BBA Walkthrough](bba-walkthrough.md) — concrete 3-commit example
- [Seam Rollback Procedure](seam-rollback-procedure.md) — emergency rollback
- [Seam Data Migration](seam-data-migration.md) — dual-read/dual-write patterns
- [ADR-0002](../adr/0002-trunk-based-delivery.md) — trunk-based delivery model
