---
fileId: contextrail-template:scripts:checks:header-message-keys-fill
module: scripts/checks
stability: evolving
steward: agent
api: cli-entry
summary: Backfill messageKeys on messages.mjs sidecars by parsing the bounded en locale block of each module's i18n registry.
owns: The conservative source-text parser that extracts the canonical English key set from a `const locales = { en: { ... } }` shape and writes it to the sidecar.
boundaries: Additive only. Must not overwrite existing messageKeys entries. Touches only modules/<mod>/messages.<ext>. Conservative — if the locales shape does not match, the file is reported as empty rather than guessed at.
invariants: Idempotent — re-running after success produces zero changes. Never reads JS at runtime; relies on a regex over source text only.
risks: Parser drift — if a module ever switches to a different i18n shape (e.g. computed keys, multiple en blocks, JSON imports), this script will silently miss those keys. The "empty" counter exists to surface that drift in the run summary.
notesForLLM: Run after any large change to messages.mjs files. The right fix for parser drift is to keep the bounded shape stable, not to make this script smarter. messageKeys is the machine-readable surface of the module's user-facing copy — agents read it from the sidecar instead of opening source.
tests: scripts/checks/header-check.mjs
related:
  - modules/*/messages.mjs
  - .claude/rules/architecture.md
---

# header-message-keys-fill.mjs
