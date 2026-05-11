<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Folder guide for the 17 R1 fixtures (bad / good / whitelist) the static check exercises in --self-test mode.
@sidecar README.md.header.md
@layer tests | @hex _none_ | @ctx _none_
@public false
@edit rewrite-ok -->

# tests/checks/fixtures/test-isolation

17 small fixtures, each demonstrating exactly one
test-isolation pattern. Used by:

- `scripts/checks/test-isolation-check.mjs --self-test` —
  runs every fixture through `detect()` and asserts the verdict
  matches the file name.
- `tests/checks/test-isolation-check.test.mjs` (meta-test) —
  asserts the same shape and the allowlist-discipline invariants.

## Categories

| Prefix | Meaning |
|--------|---------|
| `bad-*` | Must produce a violation. The fixture name implies the expected pattern. |
| `good-*` | Must produce zero violations. |
| `whitelisted-*` | Tests the whitelist mechanism (per-file annotation + allowlist file). |

## Editing rules

- Each fixture is intentionally small — one pattern, no clutter.
- Adding a new fixture requires extending
  `SELF_TEST_EXPECTATIONS` in `scripts/checks/test-isolation-check.mjs`
  AND bumping the count assertion in the meta-test. That's an
  audit-visible change.
- Do NOT delete existing fixtures — the meta-test fails loudly if
  they go missing.
- The `// @test-isolation: live-repo-allowed | reason: ...` marker
  on the whitelisted fixtures is part of the pattern under test;
  do not remove it.

## Related

- `docs/adr/0015-test-isolation-enforcement.md` — anti-evasion matrix
- `scripts/checks/test-isolation-check.mjs` — the check itself
- `scripts/checks/test-isolation-allowlist.json` — empty initial
  allowlist; growth is audit-visible
