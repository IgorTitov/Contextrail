<!-- @HEADER
@version 0.8.0 | 2026-05-07
@purpose Navigational index pointing at the pre-migration state of operator-facing dispatch tooling that moved out of Contextrail into Cockpit at version 0.8.0 (TPL-318 / ADR-0044).
@sidecar cockpit-migration-index-v0.8.0.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Cockpit migration index — v0.8.0 (2026-05-07)

This file points at the pre-migration state of operator-facing dispatch
tooling that moved out of Contextrail into Cockpit at version 0.8.0
per ADR-0044.

## What was removed from Contextrail at 0.8.0

| Artifact | Last present in commit | What replaces it |
|---|---|---|
| `scripts/dispatch-local-llm.mjs` (TPL-306) | `6a587812` (HEAD before TPL-318) | Cockpit's Kanban "Dispatch" UI (slices C1-C5 in Cockpit codebase) |
| `scripts/aider-fence-strip-wrapper.mjs` (TPL-313) | `6a587812` | Cockpit's per-stack auto post-processing (slice C3) |
| `pnpm byollm:dispatch:coder` script entry | `6a587812` | Cockpit UI |
| `local-frameworks.md` operational subsections (F13 verbatim, fence-strip wrapper instructions) | `6a587812` | Cockpit auto-applies per stack-config; manual fallback documented in `docs/guides/byollm-feature-dispatch.md` Section 9 |

(`pnpm byollm:dispatch` was reserved for the TPL-306 wrapper but a
package script entry by that exact name was not present at HEAD —
operators invoked the wrapper directly via `node scripts/dispatch-
local-llm.mjs`. The wrapper itself is what moved out.)

## What stays canonical for non-Cockpit users

- `docs/guides/byollm-feature-dispatch.md` — full manual workflow
  including F13 prefix verbatim and Variant 3 `--edit-format whole` +
  fence-strip discipline (Section 9).
- `docs/guides/local-frameworks.md` — install, model picks, setup
  gotchas, and the four-stack safety classification reference table
  with the broken-Magistral warning.

## Where to find the history

- Git log: `git log --oneline -- scripts/dispatch-local-llm.mjs` (works
  even after deletion in 0.8.0; the full pre-deletion state is on the
  `6a587812` tree).
- Pre-migration snapshot: `.backups/0.7.124/` (contains the deleted
  artifacts intact, if the snapshot exists from the prior `coa-merge`
  ceremony for v0.7.124).
- ADR-0044 — open-core boundary rationale.

## Forward references

- ADR-0044 — Cockpit migration open-core boundary decision.
- `docs/analysis/byollm-delivery-plan.md` Entry 14 — strategic
  discussion (gitignored aggregator working file).
- Cockpit codebase — slices C1-C5 reimplement the migrated functionality
  as product UI (separate codebase).
