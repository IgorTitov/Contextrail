# tests/contract/fixtures

Static fixture files for contract tests.

These files are intentionally exempt from header-check (`HEADER_EXEMPT_PREFIXES`)
because they use deliberate non-standard formats required by the tests they support.

Current fixtures:

- `architecture-test-entity.md` — provides a `@HEADER-START / FILEINFO-BEGIN` structured
  header so `scripts/reports/architecture-report.mjs` and `test-run-report.mjs` always
  produce at least one declared node/entity in CI environments where
  `docs/analysis/session-summaries/` is not present.
