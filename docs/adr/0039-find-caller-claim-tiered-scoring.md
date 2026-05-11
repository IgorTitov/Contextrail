<!-- @HEADER
@version 0.7.118 | 2026-05-06
@purpose Document 0039-find-caller-claim-tiered-scoring for this repository.
@sidecar 0039-find-caller-claim-tiered-scoring.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0039 — coa-merge `findCallerActiveClaim` tiered scoring (TPL-311)

**Status:** Accepted
**Date:** 2026-05-06
**Deciders:** Igor Titov
**Refs:** TPL-311, TPL-280 Incident #2, TPL-222 / M3 (J5 auto-extend)

## Context

Step 2.5 of `coa-merge` auto-extends the caller's active claim with
ceremony files (VERSION, CHANGELOG.md, package.json) and Phase-5 regen
paths so Phase-3 enforcement does not block on uncovered shared-infra
paths. The agent recorded on the matched claim drives the
`claim-check --extend` identity, so picking the wrong claim silently
extends a peer session's claim with the caller's ceremony paths.

Pre-fix selection logic in `findCallerActiveClaim`:

```js
candidates.sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
return candidates[0];
```

i.e. the most-recently-created intersecting active claim wins. The
intersection filter only required one staged file to overlap one claim
target, and ceremony files (VERSION, CHANGELOG.md, package.json) are
typically present on every concurrent slice's claim. A parallel session
filing its claim 1 ms after the caller's is therefore preferred even
though it belongs to a different agent and slice.

**TPL-280 Incident #2 (2026-05-05)** captured this in the wild:

> coa-merge `findCallerActiveClaim` picked wrong claim: `clm-683a3a`
> (TPL-292, from a parallel session) was created 1 ms after `clm-a5c0ce`
> (TPL-280) and intersected with staged files because it held
> VERSION/CHANGELOG/package.json. `findCallerActiveClaim` sorts by
> most-recently-created, so it picked the wrong claim. Manual recovery:
> add the only uncovered protected staged file directly to `clm-a5c0ce`
> before re-running.

The recovery was operator-driven; the underlying ranker was unfixed.
Rules-registry M3 vector #2 already prescribed "filter by agent
identity" as the documented defense, but the implementation never
actually used `caller.agent` — recency was the sole signal.

## Decision

Replace the recency-only sort with deterministic tiered scoring in a
new pure function `pickCallerClaim`, which `findCallerActiveClaim` now
delegates to. Tier weights:

| Tier | Signal                                         | Weight  |
|------|------------------------------------------------|---------|
| 1    | `claim.agent === callerAgent`                  | 1000    |
| 2    | `claim.slice === slice`                        | 500     |
| 3    | per overlapping staged target                  | 10      |
| 4    | recency tiebreaker only (`created.getTime() / 1e15`) | ~1.7e-3 |

Spacing rationale: realistic claims cover ≤ ~10 files, so tier 3 caps
at ~100. Tier 2 (500) dominates any tier-3 combination by a wide
margin; tier 1 (1000) dominates tier 2 + tier 3. Tier 4 is so small
it never overrides a single tier-3 target overlap, ensuring recency
only resolves true tiebreaks where tiers 1-3 are exactly equal.

`pickCallerClaim` returns a tagged result:

- `{ ok: true, claim, reason: 'unambiguous'|'scored'|'override' }` on success
- `{ ok: false, reason: 'not-found'|'ambiguous'|'override-not-found', candidates }` on failure

Step 2.5 maps each failure reason to a specific operator hint.

### `--claim-id=<id>` operator override

A new CLI flag `--claim-id=<id>` short-circuits scoring entirely: the
named active claim is returned regardless of agent, slice, target, or
recency. The override still requires `status === 'active'` and a
non-expired `expires` field. This is the documented escape hatch when
two genuinely-tied claims surface a `reason: 'ambiguous'` refusal.

### Caller identity resolution

Step 2.5 now resolves caller identity unconditionally via
`resolveCallerAgent(args)` (already present for transport-mode
ownership verification) and the slice from `branchAtEntry` when in
transport mode. Trunk-mode flows pass `slice: null` — only tier 1
(agent) and tier 3 (target overlap) discriminate, which still closes
the TPL-280 Incident #2 class for transport-driven concurrent slices.

## Backward compatibility

- **Single-claim case unchanged.** `pickCallerClaim` short-circuits when
  exactly one active claim intersects the staged set — no scoring runs,
  no recency tiebreak, no ambiguous refusal.
- **Legacy claims missing `agent` or `slice` fields** simply do not
  contribute to tier 1/2; ranking falls through to target overlap and
  recency. Existing claims under `.claims/` continue to work.
- **No new required CLI flags.** `--agent=` is already required in
  transport mode (ADR-0034); `--claim-id=` is opt-in.

## Anti-evasion

| # | Vector | Defense |
|---|---|---|
| 1 | Parallel session's wrong-claim leaked through 1 ms recency advantage | Tiered scoring — tier 1 (agent) outranks tier 4 (recency) by ~580k× (Test 7) |
| 2 | Operator wants to force a specific claim (rare migration / cleanup) | `--claim-id=<id>` override |
| 3 | Two claims genuinely tie on every signal (same agent, slice, targets, created ms) | Refuse with `reason: 'ambiguous'` and surface candidate ids — no silent wrong pick |
| 4 | Single-claim regression | `intersecting.length === 1` short-circuit, asserted by Case 1 |
| 5 | Legacy claim with missing `agent` field | Tier 1 contributes 0; tier 2-4 carry the decision |
| 6 | Override targets a closed claim | `pickCallerClaim` filters to `status === 'active'` before override match |

## Consequences

- Concurrent transport-branch ceremonies on overlapping ceremony files
  no longer fall to recency. Each agent's own claim wins by tier 1.
- Rules-registry M3 vector #2 ("J5 picks the wrong one") moves from
  *prescriptive but unimplemented* to *enforced + tested*.
- New unit suite `coa-merge-find-caller-claim.test.mjs` (13 cases)
  freezes the ranking semantics. Future weight changes must update
  the suite first.
- The ambiguous-tie path is reachable but rare; operators have a
  documented escape (`--claim-id=`) without needing
  `COA_OPERATOR=1` overrides.
