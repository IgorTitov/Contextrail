<!-- @HEADER
@version 0.7.102 | 2026-05-05
@purpose Document 0029-coa-worktree-auto-pick for this repository.
@sidecar 0029-coa-worktree-auto-pick.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0029 — coa-worktree auto-pick mode for next-free slice ID

**Status:** Accepted  
**Date:** 2026-05-05  
**Slice:** TPL-280

## Context

Every transport worktree requires a unique slice ID (e.g. `TPL-291`). The
pre-commit hook enforces uniqueness via C4 (TPL-282): `claim-check --acquire`
refuses if the ID already exists in git history or has an active claim.

Before this ADR, the operator (human or dispatched session) had to manually:

1. Run `git log --all --oneline | grep -oE "TPL-\d+" | sort -u` to find the
   max committed ID.
2. Check `.claims/*.json` for active claims that might occupy the next number.
3. Pick the next free ID.
4. Verify it by running `coa-worktree --create --slice=<candidate>` and
   watching for a collision error.
5. If collision: increment and repeat from step 3.

In practice this protocol consistently hit multiple collision steps. The
Cockpit AIC-DEV-161 ceremony required 8 increments (153→160 occupied by
Igor's sessions, landed at 161). Similar patterns repeated in ZVX-DEV-098
(097→098) and ZVX-DEV-105 (104→105).

Dispatching sessions were also forced to pre-pick a "likely next" ID in the
prompt — which became stale if another session committed between prompt
authoring and execution.

## Decision

### Default behaviour flip (ADR-0029 core decision)

`coa-worktree --create` without `--slice=` or `--name=` now **auto-picks** the
next-free ID instead of creating an anonymous session worktree. The session
worktree mode remains accessible via `--name=<session>`.

Rationale: the transport worktree (with its own branch and slice-ID claim) is
the 99% case for structured delivery. Defaulting to auto-pick removes operator
toil without removing any capability.

### Algorithm

1. **Scan git history**: `git log --all --oneline` — extract all
   `PREFIX-NNN` references, find the maximum NNN.
2. **Scan active claims**: read every `.claims/*.json` whose `status` is
   `"active"`, find the maximum NNN for the same prefix.
3. **Candidate = max + 1** (zero-padded to at least 3 digits).
4. **Atomically acquire** the candidate via `claim-check --acquire` (C4
   invariant, TPL-282). This is the atomic lock.
5. If acquire fails with `slice-id-collision` (race between scan and acquire):
   increment candidate by 1 and retry, up to **5 attempts**.
6. If all 5 attempts fail: surface clear error; operator must investigate.

### Prefix detection

Default prefix is detected by scanning the most recent 500 commits for
`UPPER-NNN` patterns and picking the most common prefix. Falls back to `'TPL'`
for empty repos. Operator can override with `--auto-pick-prefix=<PREFIX>`.

### Conflict rules

| `--slice=` | `--auto-pick` | `--name=` | Behaviour |
|---|---|---|---|
| Set | Not set | Not set | Explicit ID (existing) |
| Not set | Set | Not set | Auto-pick |
| Not set | Not set | Not set | **Auto-pick (new default)** |
| Not set | Not set | Set | Session worktree (existing) |
| Set | Set | * | **Refused** — mutually exclusive |

### Output

On success, auto-pick emits:

```
[coa-worktree] auto-picked: TPL-291
```

…before the standard `--create` output. In JSON mode (`--json`), the result
object includes `"autoPicked": "TPL-291"`. Dispatch prompts can capture this
line or read the JSON field to learn the exact ID.

## Consequences

### Positive

- Eliminates manual verify-and-rollforward protocol (8 steps in worst observed
  case → 0 steps).
- Dispatch prompts no longer need to guess or pre-pick a slice ID.
- Race-safe: bounded retry + atomic claim-check lock prevents two sessions from
  landing on the same ID.

### Constraints

- Session worktrees (`--name=`) still require explicit invocation; the default
  path always creates a transport branch now.
- The 5-retry limit means a highly contended repo (many concurrent sessions
  starting in the same second) could still fail. In practice, claims are claimed
  within milliseconds — 5 retries is ample.
- Prefix detection scans only the last 500 commits for performance. In very
  active repos with mixed prefixes this could pick the wrong default; operators
  should use `--auto-pick-prefix=` in those cases.

## Anti-evasion matrix

| Vector | Defence |
|---|---|
| Two parallel auto-picks acquire same ID | `claim-check --acquire` uses a lock file — only one wins; second retries |
| Stale history scan (another session commits between scan and acquire) | Bounded retry catches collision, increments |
| Operator wants specific ID | `--slice=<X>` still works; auto-pick does not fire |
| `--slice=` + `--auto-pick` passed together | Refused with "mutually exclusive" error |
| Invalid prefix produces invalid slice ID | `isValidSliceId` validates the generated candidate; fails fast |

## Related

- C4 (slice-ID uniqueness) in `docs/rules-registry.md`
- TPL-282 (`claim-check --acquire`)
- ADR-0016 (worktree lifecycle)
- `scripts/coa-worktree.mjs`
- `tests/integration/coa-worktree-auto-pick.test.mjs`
