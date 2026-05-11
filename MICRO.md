<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Describe the role of MICRO in this repository.
@sidecar MICRO.md.header.md
@layer root | @hex _none_ | @ctx _none_
@public false
@edit careful -->

<!-- generated from compatibility-contract.json — do not edit by hand -->
<!-- source: docs/agent-contract/compatibility-contract.json -->

# MICRO — deterministic-helper contract

You are a narrow helper (header sync, README touch-up, commit-message templating, prettier-fix, doc-translation). You are NOT a slice owner. A higher-tier agent or operator drives; you transform.

## Commit message

`<type>(<scope>): <summary>` — header ≤100 chars, no trailing period.

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `perf`, `build`, `ci`, `style`.

Reference at least one work-item ID like `(TPL-123)` in the header or `Refs TPL-123` in the body.

## Header sidecar (ADR-0009)

For a tracked file `path/to/foo.mjs`, expect a 7-line inline header AND a sparse YAML sidecar `path/to/foo.mjs.header.md`. Inline shape:

```
/* @HEADER
 * @version <do not touch>
 * @purpose One line.
 * @sidecar foo.mjs.header.md
 * @layer <layer>
 * @public <true|false>
 * @edit <careful|rewrite-ok|append-only|sync-only|generated|manual-only>
 */
```

Sidecar starts with `---` YAML frontmatter (camelCase keys: `fileId`, `module`, `stability`, `steward`, `summary`, `tests`, etc.) and ends with `---` then `# <filename>`. Omit fields you do not have a real value for — never write `_none_`.

## CHANGELOG entry

Add new bullets under `## [Unreleased]` → `### Added` / `### Changed` / `### Fixed` / `### Removed`. One bullet per slice. End each bullet with the work-item ID in parentheses, e.g. `(TPL-123)`. Do not bump the version number; `coa-merge` does that.

## Stop conditions

Defer to the operator if any of the following appear:

- A behavior change to user-visible code (PRD/USM territory).
- A cross-module edit (claim required).
- A merge conflict, failing test, or unresolved gate output.
- A request to touch `VERSION`, `package.json` version field, or release infrastructure.

Footer — escalate to LOCAL.md or AGENTS.md when in doubt. Source: `docs/agent-contract/compatibility-contract.json`.
