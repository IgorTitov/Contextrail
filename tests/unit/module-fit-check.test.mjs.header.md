---
fileId: contextrail-template:tests:unit:module-fit-check.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: scripts/checks/module-fit-check.mjs
summary: Unit tests for module-fit-check.mjs pure helpers — token approximation across edge cases, distribution percentile math, deterministic file pickers (domain→adapters fallback, prefix-matched test names), and measureWorkSurface integration on a synthetic on-disk fixture.
owns: Unit proof of module-fit-check pure helpers and their decision logic against a controlled fixture under tests/.fixtures/module-fit/.
boundaries: Must not touch real modules/ or tests/unit/ directories at runtime; all module-shape assertions go against the fixture root that is created in `before()` and torn down in `after()`. No network, no spawning the CLI.
invariants: All tests must be independent and deterministic. The fixture set is created exactly once per suite. measureWorkSurface tests assert that totalTokens equals the sum of parts (no rounding drift between aggregate and components). DEFAULT_ERROR_TOKENS export must remain ≤ 16384 (the local-LLM 16K floor).
notesForLLM: Add new fixture modules by following the alpha/beta/gamma/delta/epsilon pattern in `before()`. The "epsilon" module exists specifically to exercise the hyphenated test-name prefix-match heuristic (epsilon-extras.test.mjs). The "delta" module (no files at all) covers the no-source-dir branch. Keep file contents tiny — the tests assert behavior, not throughput.
tests: node --test tests/unit/module-fit-check.test.mjs
linkedDocs:
  - docs/adr/0013-module-work-surface-budget.md
  - docs/prd/module-work-surface-budget.md
specRefs: TPL-210
related: scripts/checks/module-fit-check.mjs
---

# module-fit-check.test.mjs
