---
fileId: contextrail-template:scripts:lib:output
module: scripts/lib
stability: evolving
steward: shared
api: Shared output helpers for scripts
summary: Structured output formatting and timestamp utilities shared across repository scripts.
owns: Structured output formatting used by multiple repository scripts via result().
boundaries: This file provides output formatting only. No filesystem, CLI parsing, or header schema.
invariants: result() returns a consistent shape with kind, ok, generatedAt, errors, warnings, data. Typed errors serialize via toJSON().
risks: Breaking result() affects the structured output of all check scripts.
securityPrivacy: No filesystem or network access.
notesForLLM: Keep result() backward-compatible. The toJSON() path is load-bearing for typed error serialization.
tests: tests/unit/shared-helpers.test.mjs
linkedDocs: scripts/lib/README.md
related:
  - scripts/checks/_shared.mjs
  - scripts/lib/fs-helpers.mjs
  - scripts/lib/cli-helpers.mjs
  - scripts/lib/errors.mjs
---

# output.mjs
