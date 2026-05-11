<!-- @HEADER
@version 0.8.0 | 2026-05-08
@purpose Contribution guidelines and quality-gate workflow.
@sidecar CONTRIBUTING.md.header.md
@layer root | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Contributing to Contextrail

Thank you for your interest in contributing to Contextrail!

Looking for a place to start? See [Good First Issues](docs/good-first-issues.md) for pre-scoped entry points.

## How to contribute

1. **Open an issue first.** Before starting work, open an issue describing
   the change you want to make. This helps avoid duplicate effort and lets
   maintainers give early feedback.

2. **Fork and branch.** Fork the repository and create a feature branch from
   `main`. Use a descriptive branch name (e.g. `fix/cache-ttl-overflow`).

3. **Follow the architecture.** This project uses strict hexagonal
   architecture with Context-Optimized Architecture (COA) conventions:
   - Business logic goes in `modules/<name>/domain/`.
   - Cross-module access uses `public-api.mjs` only — no deep imports.
   - Adapters isolate infrastructure. Domain stays framework-free.
   - See [docs/technical-reference.md](docs/technical-reference.md) for the full architecture overview.

4. **Write tests first.** TDD is the default. Bugfixes require a failing
   regression test. UI/UX changes require Gherkin scenarios under
   `tests/bdd/`.

5. **Keep changes small.** One reviewable slice per pull request.
   Atomic commits that can be understood without chasing the whole codebase.

6. **Run the quality gates before submitting** (the pre-commit hook runs
   these automatically, but it helps to catch issues early):

   For trivial changes (typo fixes, comment edits), you can skip hooks
   with `git commit --no-verify` — but please run at least `pnpm test:unit`
   manually.

   For larger changes, use `COA_GATE=fast` to run only the lightweight
   validation phases (Phase 6 + 7) during local development:

   ```bash
   COA_GATE=fast git commit -m "your message"
   ```

   The full gate suite runs in CI regardless, so `COA_GATE=fast` is a safe
   local speedup. For docs-only changes (*.md, *.txt, docs/*), the hook
   detects this automatically and uses the fast path — no env var needed.

7. **Quality gate commands:**

   ```bash
   pnpm test:all
   node scripts/checks/architecture-check.mjs
   node scripts/checks/header-check.mjs
   node scripts/checks/readme-check.mjs
   node scripts/checks/changelog-sync.mjs --check
   ```

8. **Update the changelog.** Add an entry under the current version section
   in `CHANGELOG.md` describing what changed and why.

## Code style

- ESLint is configured — run `pnpm lint` before submitting.
- Keep files small, narrow in responsibility, and LLM-friendly.
- All user-facing UI copy goes through the i18n/messages layer.

## Reporting bugs

Open an issue with:

- Steps to reproduce
- Expected vs. actual behavior
- Node.js version and OS

## Suggesting features

Open an issue tagged as a feature request. Describe the use case and the
problem it solves. We will route it through the product planning flow.

## License

By contributing, you agree that your contributions will be licensed under
the [Apache License 2.0](LICENSE).
