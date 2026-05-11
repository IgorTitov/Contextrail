<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Project governance model, contribution tiers, and quality-gate guidance for contributors.
@sidecar GOVERNANCE.md.header.md
@layer root | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Governance

## Decision model

Contextrail uses a **Benevolent Dictator For Life (BDFL)** model during the
pre-1.0 phase. All architectural and process decisions are made by
{{AUTHOR_NAME}} ([@{{GITHUB_ORG}}](https://github.com/{{GITHUB_ORG}})). This will be
revisited as the community grows. See [MAINTAINERS.md](MAINTAINERS.md) for
the current maintainer list.

## Using vs Contributing

**Using Contextrail** requires no approval. Clone the template, adopt
whichever modules fit your project, and follow the architecture conventions
documented in `.claude/rules/` and `docs/`.

**Contributing to Contextrail** follows the process in [CONTRIBUTING.md](CONTRIBUTING.md):
open an issue first, fork and branch, follow TDD, keep changes small.

## Quality gates for contributors

The pre-commit hook runs 7 phases of validation (23 scripts). For local
development, use `COA_GATE=fast` to run only the lightweight phases:

```bash
COA_GATE=fast git commit -m "your message"
```

Docs-only changes (*.md, *.txt, docs/*) are detected automatically and
use the fast path without any environment variable.

The full gate suite always runs in CI.

## Trivial changes

Typo fixes, comment corrections, and documentation improvements are welcome
without a prior issue. Use `COA_GATE=fast` or the docs-only fast path
for a smooth local experience.

## Roadmap

The project roadmap is tracked in the [CHANGELOG](CHANGELOG.md) and
the whitepaper's §12 (Roadmap). Post-1.0 governance changes will be
proposed through the ADR process.
