---
fileId: contextrail-template:tests:unit:instruction-integrity-check-test
module: tests/unit
stability: stable
steward: shared
summary: Unit tests for instruction-integrity-check pure functions (checkPermissions, checkHookExists, checkAnchor).
owns: Test coverage for the instruction-integrity CI gate.
boundaries: Tests pure functions only; does not test the CLI main() entry point.
invariants: Each exported check function is tested for pass and fail cases.
tests: pnpm test
linkedDocs:
  - scripts/checks/instruction-integrity-check.mjs
related:
  - .claude/settings.json
  - .githooks/pre-commit
---

# instruction-integrity-check.test.mjs
