---
fileId: contextrail-template:scripts:lib:cli-helpers
module: scripts/lib
stability: evolving
steward: shared
api: Shared CLI helpers for scripts
summary: CLI argument parsing utilities shared across repository scripts.
owns: CLI argument parsing utilities used by multiple repository scripts.
boundaries: This file provides CLI parsing only. No filesystem, header schema, or output formatting.
invariants: parseArgs returns a Map; flags map to true; key=value pairs split on first =.
risks: Breaking parseArgs affects all scripts that accept CLI flags.
securityPrivacy: No filesystem or network access.
notesForLLM: Keep parseArgs simple and predictable. No magic inference.
tests: tests/unit/shared-helpers.test.mjs
linkedDocs: scripts/lib/README.md
related:
  - scripts/checks/_shared.mjs
  - scripts/lib/fs-helpers.mjs
  - scripts/lib/output.mjs
---

# cli-helpers.mjs
