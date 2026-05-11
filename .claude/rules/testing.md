<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Capture the short repository-local testing rules that enforce TDD, regression-first bugfixes, and mandatory BDD for user-visible changes.
@sidecar testing.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# Testing rules

- New behavior requires tests first.
- Bugfixes require a failing regression test first.
- UI/UX changes require Gherkin scenarios.
- Prefer the smallest proving test set.
- Unit tests prove domain logic.
- Integration tests prove application orchestration.
- Contract tests prove adapter compliance.
- BDD proves user-visible flows.
- Relevant tests must pass before every commit.

## Git operations in tests (R1, ADR-0015)

Tests must use `safeGit(cwd, args)` / `safeGitSpawn(cwd, args)` from
`tests/_setup/safe-git.mjs` for every git invocation. Inline
`execSync('git ...', { cwd })` is rejected by `test-isolation-check`
at pre-commit time AND at runtime — the inherited-env attack
(GIT_DIR / GIT_WORK_TREE poisoning) is closed by the helper, not by
the cwd argument.

```js
import { safeGit, safeGitSpawn } from '../_setup/safe-git.mjs';

const dir = mkdtempSync(join(tmpdir(), 'fx-'));
safeGit(dir, 'init', { stdio: 'pipe' });
safeGitSpawn(dir, ['commit', '-m', 'init']);
```

`process.chdir` is banned outright in tests. Any `cwd` argument must
resolve under `os.tmpdir()` or `process.env.RUNNER_TEMP`.

The package.json test scripts load `tests/_setup/no-live-git.mjs` via
`node --import` so the runtime guard installs before any test code
runs. The guard refuses to start if `GIT_DIR` / `GIT_WORK_TREE` /
related vars are inherited from a poisoned parent shell.

See `docs/adr/0015-test-isolation-enforcement.md` for the full
anti-evasion matrix.

## BDD modularity conventions

- One `.feature` file per module or per user flow — never a monolithic all-features file.
- Each `.feature` + its step definitions must fit within a 4K-8K token file-size budget (keeps test files small and modular).
- Step definitions live next to their feature's module scope, not in a global shared folder.
- Reusable Given/When/Then steps go into a bounded shared-steps library scoped to the relevant feature area, not a single global step registry.
- Each Scenario is fully independent — no shared mutable state, no ordering dependencies between scenarios.
- Selectors in Playwright-backed BDD come from the bounded `ui-selectors` registry, never hardcoded in step definitions or feature files.
- Test data uses builders or factory helpers, not hardcoded fixture objects that couple to model shape.
- Scenarios describe user-visible behavior in domain language, not implementation mechanics ("the user sees a success message", not "the div has class .success").
- When a module is detached, its `.feature` file and step definitions detach cleanly with it.

### Exception: visible E2E walkthrough

A dedicated cross-module walkthrough scenario under `tests/e2e/` is exempt from the one-module-per-feature rule. This scenario intentionally chains flows across modules in a single headed browser session for visual end-to-end verification. It must stay in `tests/e2e/`, not in `tests/bdd/`. Modular BDD coverage under `tests/bdd/` remains the primary proving layer; the walkthrough is a supplementary visual smoke pass.
