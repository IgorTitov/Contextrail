<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Explain the repository-local Git hooks, with explicit guidance that pre-commit mutates and stages deterministic repo updates while post-commit stays intentionally disabled.
@sidecar README.md.header.md
@layer git-hooks | @hex _none_ | @ctx _none_
@public false
@edit rewrite-ok -->

# .githooks

This folder contains the repository-local Git hooks for the standalone Claude Code template.

Install them with `node scripts/checks/install-hooks.mjs`, which sets `core.hooksPath=.githooks` for the repository.

## Hook roster

### `pre-commit`

`pre-commit` is **mutating by design**.

It runs the repository’s deterministic sync and validation pipeline, including spec, backlog, product-doc, design-doc, claim-check (auto-expire + enforce), compatibility sync/check, header, README, architecture, delivery-flow, control-plane, test-gate, and changelog steps, and then finishes with `git add -u`.

That means this hook does not only validate. It can rewrite generated or normalized repository state, including the Claude↔Codex adapter layer, and stage those updates into the commit automatically.

### `commit-msg`

`commit-msg` is validation-only.

It delegates to `scripts/checks/commit-msg-check.mjs`, which validates the Conventional Commits header shape, allowed types (`feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `perf`, `build`, `ci`, `style`), header length (≤ 100 chars), the no-trailing-period rule, the blank-line-before-body rule, and requires at least one project work-item ID such as `TPL-001`. The pure validator is unit-tested under `tests/unit/commit-msg-check.test.mjs`. The hook itself must not rewrite the message or duplicate `pre-commit` responsibilities.

### `post-commit`

`post-commit` is intentionally disabled.

The file exists to reserve the slot and make the workflow stance explicit. It should stay inert unless the repository workflow is deliberately redesigned and documented.

## Workflow implications

- Do not assume only manually edited files will be committed after `git commit` starts.
- Expect the staged set to expand when deterministic sync or fix scripts touch tracked files.
- Treat changes to `.githooks/pre-commit` as workflow changes, not as harmless shell cleanup.
- Keep release or archive automation out of `post-commit` unless the repository policy changes on purpose.

## Troubleshooting

If hooks are not running, reinstall them with `node scripts/checks/install-hooks.mjs` and verify that Git points `core.hooksPath` at `.githooks`.
