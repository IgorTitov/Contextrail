<!-- @HEADER
@version 0.7.123 | 2026-05-06
@purpose Document 0042-sidecar-referents-check for this repository.
@sidecar 0042-sidecar-referents-check.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0042 — Sidecar referent integrity check (advisory) (TPL-316)

**Status:** Accepted (advisory mode)
**Date:** 2026-05-07
**Deciders:** Igor Titov
**Refs:** TPL-316, R10, ADR-0009 (sidecar-first headers), ADR-0041
(test-deletion-guard — sibling deterministic-gate pattern from TPL-314),
D6 BYO-LLM cross-variant findings (F9 metadata hallucination)

## Context

The D6 BYO-LLM evaluation surfaced finding **F9 — sidecar metadata
hallucination**: Devstral 24B (Mistral SWE-tune lineage), and likely
other models in that family, confidently fabricates plausible-but-false
values for sidecar fields. Two concrete fabrications were captured:

- `fileId: sample-mjs-header` — a synthetic kebab-case identifier with
  no relation to the canonical convention
  `contextrail-template:apps:starter:sample`.
- `tests: tests/unit/sample.test.mjs` — a path that does not exist in
  the repository.

Both pass header-check (R8) because header-check validates *shape*
(slim header present, sidecar exists, no `_none_` filler) — not whether
the metadata values *refer to anything real*. The result is **false
documentation**: future agents reading the sidecar are pointed at a
nonexistent test or to an identifier that does not match any other
artefact in the repository.

F9 is lower severity than F8 (silent test deletion, ADR-0041) because
hallucinated sidecar metadata cannot directly break a build — it
misleads the next reader. But it erodes the load-bearing function of
sidecars (cheap navigation and cross-reference) and grows quietly. The
defense surface is the same as F8: a deterministic pre-commit check
that any agent — local LLM, cloud agent, or human — must pass.

## Decision

Introduce a Phase 6 advisory pre-commit gate,
`scripts/checks/sidecar-referents-check.mjs`, that walks each
`*.header.md` sidecar in the staged set (default) or the entire repo
(`--audit`) and verifies three referent classes when the corresponding
field is present:

1. **`fileId:`** — must equal the canonical derivation from the source
   path. Two forms are accepted because the committed corpus uses
   both: dot-preserving (`.claims:clm-ex0001`) and dot-stripping
   (`.agents` → `agents`). Any value matching neither form is flagged.
2. **`tests:`** — single string or YAML list. Each entry that looks
   like a path (no spaces, not prefixed `node `/`pnpm `) must exist on
   disk. Command-shaped entries are skipped — committed sidecars
   legitimately use `tests:` for runnable commands as well as paths.
3. **`module:`** — must reference a directory that exists on disk
   relative to the repo root.

The gate runs in **advisory mode** initially: warnings printed to
stderr, exit 0. Promotion to hard-fail requires
`COA_OPERATOR_PROMOTE_SIDECAR_CHECK=1` in the environment. Phase 6 is
listed as advisory (skippable via `COA_SKIP_GATES=6`) — this rule does
not belong on the non-skippable list because trunk currently carries
~445 pre-existing warnings (see baseline below) which would block
every commit until cleaned.

### Frontmatter parsing — Design Call B (regex-based, no dependency)

ADR-0009 constrains sidecar frontmatter to sparse YAML: single-value
fields and short list fields, no nested mappings, no multi-line
strings. A minimal regex-based parser is adequate and avoids pulling
a YAML library:

- `^---\s*$` — opening and closing delimiters
- `^([A-Za-z_][\w-]*)\s*:\s*(.*)$` — top-level `key: value`
- `^\s+-\s+(.+)$` after a key with empty value — list entry
- Trailing `# comment` stripped; quoted values unquoted

Out-of-scope shapes (multi-line `|`/`>`, flow-style arrays `[a, b]`,
nested mappings) are not used by any committed sidecar. If parsing
fails (most commonly missing closing `---`), the sidecar is **skipped
with a warning**, not crashed — sidecar shape validity is owned by
header-check (R8), not this rule.

### `fileId` derivation — Design Call C (path-with-extension-stripped)

For sidecar at `<dir>/<basename>.<ext>.header.md`:

1. Strip trailing `.header.md` → `<dir>/<basename>.<ext>`.
2. Strip the **final** extension (after the last dot in the basename
   only). Inner dots are preserved:
   `tests/unit/foo.test.mjs` → `tests/unit/foo.test`. This matches the
   committed corpus (e.g. `contextrail-template:tests:unit:foo.test`).
3. Replace `/` with `:`.
4. Prepend `contextrail-template:`.
5. The dot-stripping alternate variant is also produced for hidden
   directory segments (`.agents` → `agents`).

### Phase placement — Design Call F

Phase 6 is the existing parallel-validation tier in `.githooks/pre-commit`.
Inserting the advisory check inline (as a sequential follow-up to the
parallel block) keeps its output identifiable in hook stdout
(`[pre-commit] Phase 6 advisory: sidecar-referents-check (R10)`)
without conflating its warnings with the hard-fail Phase 6 checks.

## Consequences

### Positive

- F9 fabrications (kebab-case fileIds, nonexistent tests entries,
  invented module names) become visible at commit time instead of
  rotting silently in trunk.
- Defense is universal — local LLMs, cloud agents, and humans all
  pass through the same gate.
- Audit mode (`--audit`) provides a one-shot scan of trunk for
  inherited drift; the resulting baseline is the promotion criterion.
- Adds zero new runtime dependencies (regex parser, no YAML library).

### Negative

- Trunk audit baseline at TPL-316 commit time: **445 warnings across
  1503 sidecars** (270 fileId mismatches, 138 tests entries, 24
  module references, 13 unparseable sidecars). The advisory mode is
  the explicit acknowledgement that this baseline must be triaged
  before promotion to hard-fail.
- Regex-based parser has known blind spots (multi-line strings,
  flow-style arrays). These are out-of-scope per ADR-0009; if a
  legitimate sidecar adopts those shapes the parser must be hardened
  before they land.
- Two accepted fileId forms (dot-preserving + dot-stripping) widen
  the pass surface slightly. A future ADR may pick one canonical form
  and bulk-migrate sidecars; this gate would then tighten alongside.

## Promotion criteria

Promote to hard-fail (`COA_OPERATOR_PROMOTE_SIDECAR_CHECK=1` becomes
the default and the phase joins `NON_SKIPPABLE_PHASES`) when:

- `node scripts/checks/sidecar-referents-check.mjs --audit` reports
  **≤ 5 warnings** on a clean trunk, AND
- the remaining warnings are documented exceptions (e.g. generated
  artefacts whose canonical fileId genuinely diverges from path).

Until then the rule earns its keep by surfacing F9-class fabrications
in *new* sidecars without blocking commits over historical drift.

## Anti-evasion matrix

See `docs/rules-registry.md` R10 for the full table. Summary:

| Vector                                              | Defense                                            |
| --------------------------------------------------- | -------------------------------------------------- |
| V1 — fabricate `fileId` as plausible kebab-case     | path-derivation comparison (both accepted forms) |
| V2 — fabricate `tests:` path that "would make sense" | `fs.existsSync` per entry                         |
| V3 — pick valid module name for the wrong file      | NOT defended — needs cross-reference to module's exposed-files manifest. Future hardening. |
| V4 — mass-add `_none_` placeholders                  | NOT defended here — owned by header-check (R8)    |

**Explicit non-vector:** omitting all referent fields is a *valid*
sparse-YAML pattern per ADR-0009. This rule only validates fields that
are *present*; absence is silence, not a warning.

## Related

- ADR-0009 (sidecar-first headers) — defines the format this rule
  validates against.
- ADR-0041 (test-deletion-guard) — sibling deterministic-gate pattern
  from TPL-314, also surfaced by D6 BYO-LLM findings.
- ADR-0015 (test isolation) and ADR-0017 (transport branch) — broader
  family of rules where deterministic gates close failure-mode classes
  that runtime checks alone cannot.
