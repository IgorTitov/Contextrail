<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Folder guide for bounded check-meta-test fixture sets — one subfolder per check.
@sidecar README.md.header.md
@layer tests | @hex _none_ | @ctx _none_
@public false
@edit rewrite-ok -->

# tests/checks/fixtures

Bounded fixture sets used by the meta-tests under `tests/checks/`.

Each subfolder targets exactly one check — one folder per check
script keeps fixtures from polluting unrelated test suites and lets
each rule's "what should fire and why" stay co-located.

## Contents

- `test-isolation/` — 17 fixtures for the R1 (test-isolation)
  static check. See its own README for verdict conventions.

## Adding a new check

When adding a check that needs fixtures, create a sibling folder
named after the check (e.g., `claim-check/` for an upcoming
claim-check meta-test). Keep the folder's README short — verdict
table + editing rules.
