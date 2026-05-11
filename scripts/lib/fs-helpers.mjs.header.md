---
fileId: contextrail-template:scripts:lib:fs-helpers
module: scripts/lib
stability: evolving
steward: shared
api: Shared filesystem helpers for scripts
dependsOn:
  - node:fs
  - node:fs/promises
  - node:path
summary: Pure filesystem and path utilities shared across repository scripts.
owns: Pure filesystem and path utilities used by multiple repository scripts.
boundaries: This file provides filesystem operations only. No header schema, CLI parsing, or output formatting.
invariants: All path operations normalize to POSIX separators. ROOT is always process.cwd().
risks: Breaking these helpers affects all scripts that use file discovery and read/write.
securityPrivacy: Local filesystem only; no network access.
notesForLLM: Keep helpers pure and stateless where possible. toPosix is the canonical path normalizer.
tests: tests/unit/shared-helpers.test.mjs
linkedDocs: scripts/lib/README.md
related:
  - scripts/checks/_shared.mjs
  - scripts/lib/cli-helpers.mjs
  - scripts/lib/output.mjs
---

# fs-helpers.mjs
