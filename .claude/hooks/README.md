<!-- @HEADER
@version 0.6.5 | 2026-04-28
@purpose Explain the small set of repository-local Claude hook scripts and the constraints they must satisfy.
@sidecar README.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit rewrite-ok -->

# hooks

These scripts are referenced by `.claude/settings.json`.

## Canonical entrypoint

- `run-dangerous-command-blocker.mjs` — portable Node entrypoint wired by Claude settings.

## Supporting implementation

- `dangerous-command-blocker.py` — kept as a local reference implementation for the same safety policy.

## Proof surface

- `tests/integration/dangerous-command-hook.test.mjs` — direct end-to-end proof that the wired Node launcher blocks destructive commands and sensitive edits.

## Guardrails

- keep hooks deterministic, small, and auditable
- keep hook wiring aligned with `.claude/settings.json`
- keep local proof aligned with the actual wired entrypoint
- do not add hidden network calls or environment-specific side effects
