---
fileId: contextrail-template:tests:unit:output-helpers.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for the output-helpers module.
owns: Unit proof of output formatting helpers (now(), todayIsoDateUTC(), result() edge cases) from scripts/lib/output.mjs and parseArgs() edge cases from scripts/lib/cli-helpers.mjs.
boundaries: Must not test filesystem operations, trace collection, or i18n; output and CLI argument utilities only.
invariants: now() must always return a valid ISO 8601 timestamp parseable by Date; todayIsoDateUTC() must match the current UTC date; result() must always produce errors/warnings/data arrays.
risks: todayIsoDateUTC() test can flake at UTC midnight; result() serialization tests assume String() coercion of non-Error values.
notesForLLM: Covers edge cases not exercised by higher-level script tests; check scripts/lib/output.mjs and cli-helpers.mjs exports before adding cases here.
tests:
  - pnpm test:unit
  - node --test tests/unit/output-helpers.test.mjs
related:
  - scripts/lib/output.mjs
  - scripts/lib/cli-helpers.mjs
---

# output-helpers.test.mjs
