<!-- @HEADER-START
version 0.1.0 | 2026-05-12
path: tests/contract/fixtures/architecture-test-entity.md
Purpose: Fixture providing structured-header metadata for architecture-report contract tests.
CHANGELOG-BEGIN
Summary:
- test fixture
Added:
- Initial fixture for architecture-report-contract.test.mjs
CHANGELOG-END
FILEINFO-BEGIN
FileId: contextrail-template:tests:contract:fixtures:architecture-test-entity
Path: tests/contract/fixtures/architecture-test-entity.md
Layer: tests
Module/Package: tests/contract
HexLayer: _none_
BoundedContext: _none_
Public: false
Stability: stable
EditPolicy: careful
Steward: test-guardian
DependsOn: _none_
FILEINFO-END
HEADER-END -->

# architecture-test-entity

Contract test fixture. Not a real module — exists solely to provide a structured-header
entity so that `scripts/reports/architecture-report.mjs` and `test-run-report.mjs` always
produce at least one declared node/entity in both local and CI environments.

The `tests/contract/fixtures/` directory is exempt from `header-check` (via
`HEADER_EXEMPT_PREFIXES`) but NOT from `architecture-report.mjs`, which only skips
`HEADER_EXEMPT_FILES` (an explicit Set). This asymmetry is intentional.
