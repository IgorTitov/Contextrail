<!-- @HEADER
@version 0.7.108 | 2026-05-06
@purpose Document 0032-slice-id-config for this repository.
@sidecar 0032-slice-id-config.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0032: Config-based slice ID detection

**Status:** Accepted  
**Date:** 2026-05-06  
**Slice:** TPL-300  
**Supersedes:** Greedy-regex detection in `detectDefaultPrefix()` (introduced TPL-280 / ADR-0029)

---

## Context

ADR-0029 introduced `coa-worktree --create` auto-pick mode, which scanned the last 500
commits to find the most frequent `UPPER-NNN` prefix and used that as the default. This
worked for the template repository (only one prefix: `TPL`) but failed for downstream
repositories that have multiple prefix namespaces.

### The AIC-132 regression

Cockpit (a downstream COA repository) uses two prefix namespaces:
- `AIC-NNN` — Igor's personal kanban, not AI-session work items
- `AIC-DEV-NNN` — AI agent sessions shared namespace

When `coa-worktree --create` ran in Cockpit, `detectDefaultPrefix()` scanned git history
and found `AIC` appearing most often (it matched both `AIC-NNN` and the `AIC` part of
`AIC-DEV-NNN`). It returned `AIC` as the detected prefix. The auto-picked ID was then
`AIC-132` — bare kanban namespace — instead of `AIC-DEV-168`.

Consequences:
1. Wrong prefix polluted kanban with AI-generated IDs.
2. Sub-prefix collision: `AIC-132` looked like a kanban item, not an agent work item.
3. claim-check uniqueness detection failed to distinguish `AIC-132` (kanban) from
   `AIC-132` (auto-picked agent ID), causing false collision passes.

### The convention-leak anti-pattern

The greedy-regex approach hard-wired a specific detection heuristic into the template
itself, implying that all downstream repositories would use a prefix structure compatible
with that heuristic. Template code that bakes in naming conventions is a convention leak —
it is prescriptive where it should be neutral.

---

## Decision

Replace the greedy-regex `detectDefaultPrefix()` with a config-based approach:

1. Each repository declares its slice ID convention in **`.coa/slice-id-config.json`**.
2. `detectDefaultPrefix(repoRoot)` reads the config and returns `config.prefix`.
3. If the config is absent, a `ConfigMissingError` is thrown with a recovery hint.
4. `coa-worktree --create` surfaces `ConfigMissingError` as a human-readable error
   and exits non-zero instead of silently picking a wrong prefix.
5. `bootstrap.mjs --init-slice-config` scaffolds a default config if one does not exist.
6. The `--auto-pick-prefix=` CLI flag remains as an explicit operator override that
   bypasses the config (for one-off cross-namespace operations).

### Config schema (`.coa/slice-id-config.json`)

```jsonc
{
  "prefix": "TPL",           // required: [A-Z][A-Z0-9]+
  "format": "TPL-{NNN}",     // optional: must contain {NNN}
  "numbering_start": 1,      // optional: integer >= 0
  "padding": 3,              // optional: 1-6 digits
  "description": "..."       // optional: human note
}
```

### Operator override precedence

```
explicit --auto-pick-prefix=<X>  >  config.prefix
```

---

## Consequences

### Positive

- **No more prefix guessing.** The repo's convention is explicit and machine-readable.
- **Sub-prefix collision eliminated.** `AIC-DEV` can coexist with `AIC` because the
  config declares which namespace is used for agent work items.
- **Convention leak closed.** Template code no longer encodes assumptions about what
  prefix conventions downstream users will adopt.
- **AI-agent friendly.** AI agents can read the config instead of guessing. The config
  provides a stable, authoritative source of truth.
- **Bootstrap integration.** Running `bootstrap.mjs --name "X" --key "Y"` now also
  creates the config, so new projects get a correct config from day one.

### Negative / trade-offs

- **Config now required.** Repos that do not have `.coa/slice-id-config.json` will see
  a `ConfigMissingError` from `coa-worktree --create`. Migration is one command:
  `node scripts/bootstrap.mjs --init-slice-config`.
- **Backport needed.** Cockpit and Zvenix must create their own
  `.coa/slice-id-config.json` (Wave O backport plan). Until backported, those repos
  must use `--auto-pick-prefix=` to avoid the error.

### Migration

Existing repos (Cockpit, Zvenix) must run `bootstrap.mjs --init-slice-config` and edit
the generated file to set the correct prefix for their AI-session namespace:

```json
// Cockpit — uses DEV prefix for agent sessions (separate from AIC kanban)
{ "prefix": "DEV", "format": "DEV-{NNN}", "numbering_start": 100 }

// Zvenix
{ "prefix": "DEV", "format": "DEV-{NNN}", "numbering_start": 1 }
```

---

## Anti-evasion analysis

| Evasion | Defense |
|---|---|
| Config missing → tool falls back to history scan | `ConfigMissingError` thrown; no fallback. Operator must create config. |
| Empty `prefix` bypasses pattern validation | `validateSliceIdConfig` requires `[A-Z][A-Z0-9]+`. Empty string rejected. |
| `prefix` from config is wrong namespace | Operator sets correct prefix in config. Auto-pick never guesses. |
| Hardcode `--auto-pick-prefix=` to skip config | Documented as intentional operator escape hatch. No silent bypass. |
| Multiple agents race to pick same prefix ID | Claim atomicity (existing, per ADR-0029) is unchanged; config only changes *which* prefix is used. |

---

## References

- [ADR-0029: coa-worktree auto-pick](0029-coa-worktree-auto-pick.md)
- [docs/guides/slice-id-config.md](../guides/slice-id-config.md) — full schema + AI-agent guide
- [scripts/lib/slice-id-config.mjs](../../scripts/lib/slice-id-config.mjs)
- TPL-300 (this slice)
