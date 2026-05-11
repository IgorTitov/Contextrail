<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Documentation for the changelog fragments directory.
@sidecar README.md.header.md
@layer root | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Changelog Fragments

Each file in this directory represents one changelog entry. On release, fragments are compiled into `CHANGELOG.md` and deleted.

## Fragment format

Each fragment is a Markdown file named:

```
<work-item-id>.<category>.md
```

**Examples:**
- `TPL-042.added.md`
- `TPL-100.fixed.md`
- `TPL-055.changed.md`

### Categories

| Category | Meaning |
|----------|---------|
| `added` | New features or modules |
| `changed` | Changes to existing behavior |
| `fixed` | Bug fixes |
| `removed` | Removed features or deprecated code |
| `security` | Security-related changes |
| `internal` | Internal changes (tooling, CI, refactoring) — not shown in public changelog |

### Fragment content

Write the entry as plain Markdown. The first line is the summary; additional lines provide detail.

```markdown
Server-side adapter examples guide covering auth sessions, Redis cache, SQLite, WebSocket transport, tenancy ALS, and structured logging with full DI wiring example.
```

Keep entries concise. One fragment per logical change, not per file touched.

## Commands

```bash
# Compile fragments into CHANGELOG.md (dry run)
node scripts/checks/changelog-compile.mjs --dry-run

# Compile fragments into CHANGELOG.md
node scripts/checks/changelog-compile.mjs

# Check that no stale fragments exist after a release
node scripts/checks/changelog-compile.mjs --check
```

## Workflow

1. When you make a change, create a fragment file in this directory.
2. Commit the fragment alongside your code change.
3. At release time, run `changelog-compile.mjs` to merge fragments into `CHANGELOG.md`.
4. The compile script deletes consumed fragments and updates the `[Unreleased]` section.
