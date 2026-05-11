<!-- @HEADER
@version 0.8.7 | 2026-05-11
@purpose Document the R5 override audit log directory.
@sidecar README.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public false
@edit append-only -->

# R5 override audit log

Append-only audit trail of every R5 rationale-file override consumed by `main-worktree-guard.mjs`.

Each `.json` file here records one accepted direct-trunk commit authorisation.
Files are written by `scripts/lib/r5-override.mjs` and committed alongside the
slice that triggered them.

**Review periodically.** A high frequency of override log entries indicates the
transport ceremony is being avoided routinely — that is a process problem worth
investigating.

## File naming

`<unix-timestamp-ms>-<slice-id>.json`

## Contents

Each file is the consumed `r5-override.json` plus a `consumed_at` ISO-8601 field.

## Policy

- Files here are committed to the repository (the log is permanent).
- The input file (`.coa/r5-override.json`) is ephemeral and gitignored — it is
  deleted immediately after consumption.
- See `docs/adr/0047-r5-override-rationale-file.md` for the full design.
