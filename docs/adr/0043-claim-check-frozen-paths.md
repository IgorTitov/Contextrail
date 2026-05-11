<!-- @HEADER
@version 0.7.124 | 2026-05-06
@purpose Document 0043-claim-check-frozen-paths for this repository.
@sidecar 0043-claim-check-frozen-paths.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0043 — claim-check `--frozen=<paths>` subset for explicit-scope defense-in-depth (TPL-317)

**Status:** Accepted
**Date:** 2026-05-07
**Deciders:** Igor Titov
**Refs:** TPL-317, R-NN (frozen-paths registry entry, see `docs/rules-registry.md`),
ADR-0008 (`docs/adr/0008-inter-agent-coordination-protocol.md`),
ADR-0041 (`docs/adr/0041-test-deletion-guard.md`),
D6 cross-variant synthesis (`docs/analysis/session-summaries/2026-05-06_D6-CrossVariant-synthesis.md`),
F12 incident class (Variant 3 — Qwen3-Coder MoE explicit-scope violation)

## Context

D6's BYO-LLM evaluation surfaced an F12 failure mode on Variant 3
(Qwen3-Coder MoE running through aider): the model, faced with an
ambiguous prompt about `module/X`, retried the same edit shape against
unrelated files until something landed, including paths the slice was
explicitly told not to touch. The synthesis classifies F12 as
**edit-format-modulated** — the underlying retry-frenzy is suppressed
once the operator switches aider to `--edit-format whole`, which
fixes the more aggressive F11 class. So F12 is rarely seen in practice
when the F11 mitigation is active; this ADR is **defense-in-depth (P4)**
for the residual case rather than urgent surface coverage.

The mitigation has to live where the explicit-scope intent is already
captured — the active claim. `claim-check` already knows which paths a
slice owns (`targets`); it does not yet have a way to record "and these
paths are off-limits even though I have the modify privilege". Adding
that channel costs one optional flag and one staging-time check.

## Decision

Extend `scripts/checks/claim-check.mjs` with a `--frozen=<paths>` subset
applied to `--acquire`, plus matching enforcement in `--enforce --staged`,
visibility in `--query` / `--audit`, and a two-factor operator override
that mirrors ADR-0041's `Allow-test-deletion` pattern.

1. **Acquisition.** `--acquire --frozen=path1,path2 …` parses the CSV,
   validates each path with `isValidTargetPath` (no traversal, no
   absolute paths), and stores the list as a top-level `frozen: [...]`
   array on the new claim JSON. Empty / absent flag → no `frozen` field
   is written, keeping the on-disk shape identical to pre-TPL-317
   builds.
2. **Enforcement.** `--enforce --staged` (Phase 3 in pre-commit) walks
   every active claim. For each claim with a non-empty `frozen` list,
   it intersects that list with the staged file set; any non-empty
   intersection refuses the commit with a per-violation summary line
   naming the path, claim ID, slice, and agent.
3. **Override.** Two factors, both required:
   - `COA_OPERATOR=1` in the environment.
   - A line `Allow-frozen-write: <reason>` in the commit-message body
     (read from `.git/COMMIT_EDITMSG`), where `<reason>` has at least
     `FROZEN_MIN_REASON_LEN` (3) non-whitespace chars after the colon.
   - When both clear, the guard accepts and writes a
     `frozen-override-accepted` event to `.claims/audit.log` with the
     reason and the violation list.
4. **Query / audit visibility.** `--query=<path>` reports a `FROZEN`
   line (and `frozenClaims` array in JSON mode) when the queried path
   sits in any active claim's `frozen` list. `--audit` carries a
   `frozenCount` per active claim and a `frozenPathCount` total in
   JSON mode, with a `FROZEN PATHS:` summary line in CLI mode when
   any active claim declares one.

The legacy claim shape — no `frozen` field at all — is treated as
`frozen: []` everywhere. No migration step, no on-disk normalization,
no behaviour change for any pre-TPL-317 claim. Test #6 in
`tests/integration/claim-check-frozen.test.mjs` proves this empirically.

### Backwards compatibility (non-negotiable)

The integration suite covers two compatibility-critical scenarios:

- Test #6 — a hand-crafted legacy claim file with no `frozen` field
  must produce no blocks regardless of staging set; the file must NOT
  be mutated on disk by parse-time normalization.
- Test #7 — `--acquire` without `--frozen` builds a claim that omits
  the field entirely, and `--enforce --staged` finds nothing to act
  on.

Layered on top, the existing 304-test claim-check surface is
re-run unmodified after the implementation lands; passing the full
surface is part of the slice's acceptance.

### Path overlap semantics — Design Call

When a path appears in BOTH `targets` and `frozen` for the same claim,
**frozen wins** (the path is blocked at staging time). This is the
canonical "I may need to read this file but must not write it" use
case — e.g. claim modules/X but freeze X's `public-api.mjs` so the
slice cannot accidentally drift the public contract. Test #8 pins
this semantic.

### Operator-override contract — Design Call

Two factors, both required, mirrors ADR-0041 (test-deletion-guard).
Removing either factor (env alone, marker alone, marker with
sub-3-char reason) refuses the commit. There is no env-only escape,
no editor-prompt bypass, no recognised env-var-name alternative —
only the literal `Allow-frozen-write:` marker counts.

The script writes a `frozen-override-accepted` audit event to
`.claims/audit.log` with the reason and the violation list, so the
override is observable after the fact through `claim-check --audit`'s
audit-log tail.

## Anti-evasion matrix

| # | Vector | Defense (current) |
| --- | --- | --- |
| 1 | Agent stages a frozen file | Pre-commit `claim-check --enforce --staged` finds the intersection and refuses with a `FROZEN` block. |
| 2 | Agent renames a frozen file (delete `frozen-path` + add `new-path`) | Documented gap. The rename appears as `D <frozen>` + `A <new>` in the diff; the deleted side still matches the frozen list and the rename itself triggers. The new path is not frozen by name and the rename does not auto-propagate the freeze; this is a residual gap that an operator review of staged diffs catches in practice. Mitigation candidate: extend `getStagedFiles` to surface rename-source paths in addition to current names. Out of scope for this slice. |
| 3 | Agent edits the frozen file in a nested working copy (linked worktree, submodule) | `claim-check` reads `.claims/` from the resolved main-repo root (`resolveMainRepoRoot`) regardless of cwd, so the active claim is found. Pre-commit always fires in the worktree where the commit is being created, so the staged-file set is the right one to compare against. |
| 4 | Agent uses `--no-verify` to skip pre-commit | R8 hook-integrity (Phase 1.0 + pre-push catch-net) closes `--no-verify` for the whole pre-commit surface; same defense as R1 / R2 / R9. |
| 5 | Agent removes the `frozen` field from a foreign claim file by editing `.claims/clm-*.json` | Touching another agent's claim file is a separate violation surface (claim-tampering); not in scope of this guard, but the next acquire-time scan re-asserts the field if the original agent re-runs ceremony. |
| 6 | Agent appends `Allow-frozen-write:` to the commit body without `COA_OPERATOR=1` | Two-factor: env required. Test #11 pins this. |
| 7 | Agent sets `COA_OPERATOR=1` in shell without an Allow-frozen-write line | Two-factor: marker required. Test #10 pins this. |
| 8 | Agent inserts `Allow-frozen-write:` with a 1-char reason | `FROZEN_MIN_REASON_LEN=3` after trimming. Test #12 pins this. |
| 9 | Agent embeds `Allow-frozen-write:` inside a multi-paragraph body to hide it from review | The marker is logged verbatim to stderr by the guard and to `.claims/audit.log`; review surfaces it. |
| 10 | Agent uses `claim-check --extend` to remove the `frozen` field | `--extend` only adds targets; it does not strip top-level fields. Field is preserved across extension. |

### Explicit non-vector

**Legacy claims without a `frozen` field bypass enforcement.** This is
**by design** (backwards compatibility). The whole rule mode is
opt-in per claim — no slice that does not declare a frozen list pays
any complexity cost, and no historical claim corpus suddenly behaves
differently after this slice lands. Test #6 (legacy compat) and Test
#7 (no-flag acquire) pin the contract.

## Test surface

`tests/integration/claim-check-frozen.test.mjs` covers 14 scenarios:

- **5 block paths**: simple frozen, multi-file, multi-frozen, both-targets-and-frozen, override-half-2 (no env)
- **3 pass paths**: no intersection, no-frozen-flag acquire, override-half-1 (no marker)
- **1 store path**: `--acquire --frozen=…` writes the list verbatim
- **2 backwards-compat paths**: legacy claim shape, no `--frozen` flag
- **1 allow path**: full two-factor override + reason logged + audit event
- **1 short-reason path**: `Allow-frozen-write: ab` rejected
- **1 visibility path**: `--query` / `--audit` surface frozen status

Every git invocation in the test suite goes through `safeGit` /
`safeGitSpawn` per R1 / ADR-0015.

## Consequences

- A slice owner can declare paths off-limits inside their own scope
  without splitting work across two claims. The new mode is opt-in
  per claim; no slice that doesn't declare a frozen list pays any
  cost.
- Pre-commit refuses commits that touch frozen paths (in any active
  claim, not only the committer's own — defense-in-depth). The
  operator override is the sanctioned escape hatch for genuine
  cross-cutting fixes.
- Legacy claim corpora are unchanged on disk and continue to behave
  exactly as before. The protection rolls out incrementally as new
  slices opt in.
- One residual gap (Vector 2 — rename out of frozen) is documented
  rather than closed in this slice. Rename detection is a follow-up
  candidate when D6 evidence shows it being exploited in practice.

## Related

- ADR-0008 (inter-agent coordination protocol) — claim file format and
  the surface this slice extends.
- ADR-0041 (test-deletion-guard / R9) — the two-factor override
  template this slice mirrors (`COA_OPERATOR=1` + `Allow-…:` marker).
- ADR-0036 (acquire-time recently-completed check / TPL-308) — sibling
  slice-uniqueness layer in `--acquire`.
