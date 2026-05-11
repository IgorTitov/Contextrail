<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Index of deterministic repo scripts used by the template.
@sidecar README.md.header.md
@layer tooling | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# scripts/checks

These scripts are deterministic repo automation, not prompt logic.

## Validation and gates

- `spec-check.mjs` — validates traceability docs.
- `product-docs-check.mjs` — validates raw-intake routing, persona storage, PRD/USM/backlog source-of-truth wording, and template coherence.
- `usm-check.mjs` — validates mandatory persona/workflow templates, real starter artifacts, and user-facing USM coverage.
- `pre-impl-gate.mjs` — blocks implementation-oriented changes that are not linked to ready work items with required PRD/USM coverage.
- `design-docs-check.mjs` — validates designer-lane routing, design docs discovery, and selector-registry wording across the canonical repository surfaces.
- `architecture-check.mjs` — enforces repo structure and boundaries.
- `delivery-flow-check.mjs` — validates agreement across the implementation, frontend, and acceptance lanes plus the bounded-reading rules they depend on.
- `control-plane-check.mjs` — validates agreement across canonical instructions, rules, scripts, hooks, tasks, docs, and proof surfaces.
- `header-check.mjs` — validates structured headers and sidecars.
- `readme-check.mjs` — ensures meaningful folders carry `README.md`.
- `test-gate.mjs` — runs the deterministic checks plus the granular smoke-test layers from `package.json`.
- `changeset-size-check.mjs` — warns when the staged changeset looks too large for a single bounded slice.
- `claim-check.mjs` — inter-agent claims: `--acquire`, `--enforce`, `--query`, `--audit`, `--auto-expire`, `--auto-complete`.
- `capabilities-sync.mjs` — validates manifest capability surface matches public API exports.
- `dependency-graph.mjs` — generates `docs/_generated/dependency-graph.json`; `--check` for CI staleness.
- `instruction-integrity-check.mjs` — blocks merges when canonical agent instruction files change without CODEOWNERS review.
- `product-data-check.mjs` — validates persona and product-data integrity.
- `seam-audit.mjs` — finds all feature seam registrations, warns on orphaned/ghost/naming issues; `--strict` for CI.
- `seam-inventory.mjs` — inventories all seam API usages across the codebase.
- `release-discipline-check.mjs` — pre-commit gate: VERSION bump is +1, CHANGELOG section exists, Unreleased is clean.
- `seam-rollback-check.mjs` — verifies that disabling each active seam keeps tests green.
- `sidecar-content-check.mjs` — scans `.header.md` sidecars for prompt-injection patterns.
- `sidecar-age-check.mjs` — reports stale `.header.md` sidecars.
- `manifest-staleness-check.mjs` — compares `manifest.json` timestamps against last git-commit.
- `generated-integrity-check.mjs` — SHA-256 digest verification of generated canonical files.
- `system-map-check.mjs` — validates module count and maturity breakdown in SYSTEM_MAP.md.
- `header-exports-fill.mjs` — backfills `exports:` in public-api sidecars; `--check` for CI.
- `numbers-sync.mjs` — syncs hardcoded test/module counts in README and SYSTEM_MAP to match live repo; `--check` for CI.
- `migration-check.mjs` — compares project against template to identify upgrade gaps; `--template=<path>`.
- `compile-user-guide.mjs` — scans `*.help.md` sidecars and assembles `docs/user-guide.md`; `--check` for CI.

## Sync and repair

- `spec-sync.mjs` — keeps spec-linked docs aligned.
- `backlog-sync.mjs` — keeps backlog references aligned.
- `header-create.mjs` — creates a new structured header or sidecar shell.
- `header-fix.mjs` — repairs structured header placement and shape.
- `readme-fix.mjs` — scaffolds missing folder `README.md` files.
- `changelog-sync.mjs` — keeps `CHANGELOG.md` structurally ready for the current change set.
- `version-bump.mjs` — updates version surfaces consistently.

## Setup

- `install-hooks.mjs` — points Git at `.githooks/`.
- `run-e2e.mjs` — launches Playwright with optional headed mode in a cross-platform way.

## Scaffolding

- `create-module.mjs` — scaffold a new hex module under `modules/<name>/` with the canonical domain/ports/adapters/public-api/messages/manifest/README skeleton and ADR-0009 sidecar headers on every file. Run as `node scripts/checks/create-module.mjs --name=<kebab-name> [--description="..."] [--force]` or `pnpm create-module -- --name=<kebab-name>`.
- `commit-msg-check.mjs` — pure Conventional Commits validator that the `.githooks/commit-msg` hook delegates to. Enforces type, header length, no-trailing-period, blank-line-before-body, and required work-item ID.

