<!-- @HEADER
@version 0.7.109 | 2026-05-06
@purpose Document slice-id-config for this repository.
@sidecar slice-id-config.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Slice ID Config

Every COA repository must declare its slice ID convention in `.coa/slice-id-config.json`.
This file tells `coa-worktree --create`, `claim-check`, and AI agents which prefix format
to use when generating work-item IDs.

## Quick start

```bash
node scripts/bootstrap.mjs --init-slice-config
# → Creates .coa/slice-id-config.json with prefix "MYPROJ"
# Edit the file to set your actual prefix.
```

Or pass `--key` during the full bootstrap:

```bash
node scripts/bootstrap.mjs --name "My App" --key "APP"
# → Bootstraps the repo AND creates .coa/slice-id-config.json with prefix "APP"
```

## Schema

```jsonc
{
  "$schema": "https://contextrail.dev/schemas/slice-id-config.v1.json",
  "prefix": "MYPROJ",          // required: [A-Z][A-Z0-9]+(-[A-Z][A-Z0-9]+)*
  "format": "MYPROJ-{NNN}",    // optional: must contain {NNN}
  "numbering_start": 1,        // optional: integer >= 0 (default: 1)
  "padding": 3,                // optional: 1-6 digits (default: 3)
  "description": "..."         // optional: human note, ignored by tools
}
```

### Fields

| Field | Required | Type | Description |
|---|---|---|---|
| `prefix` | **yes** | string `[A-Z][A-Z0-9]+(-[A-Z][A-Z0-9]+)*` | Uppercase prefix for all slice IDs in this repo. Single-segment is the industry default; multi-segment supported for cross-repo/hierarchical conventions. |
| `format` | no | string with `{NNN}` | Informational pattern. Tools use `${prefix}-${padded}`. |
| `numbering_start` | no | integer ≥ 0 | First ID number issued. Default: `1`. |
| `padding` | no | 1–6 | Zero-pad width for the numeric part. Default: `3`. |
| `description` | no | string | Human note. Not parsed by any tool. |

## Examples

### Default template convention

```json
{
  "prefix": "TPL",
  "format": "TPL-{NNN}",
  "numbering_start": 1,
  "padding": 3
}
```

Produces IDs: `TPL-001`, `TPL-002`, …

### Project with sub-namespace (Cockpit pattern)

```json
{
  "prefix": "DEV",
  "format": "DEV-{NNN}",
  "numbering_start": 100,
  "padding": 3
}
```

Produces IDs: `DEV-100`, `DEV-101`, …
This uses a distinct prefix namespace for agent sessions, keeping them separate
from the operator's kanban IDs (`AIC-NNN`). Single-segment is the industry default.

### Multi-segment prefix (cross-repo / hierarchical)

Multi-segment prefixes are supported when you need namespace disambiguation across
repos or a hierarchical naming convention (TPL-303 / ADR-0033):

```json
{
  "prefix": "AIC-DEV",
  "format": "AIC-DEV-{NNN}",
  "numbering_start": 100,
  "padding": 3
}
```

Produces IDs: `AIC-DEV-100`, `AIC-DEV-101`, …

```json
{
  "prefix": "RELEASE-Q1-FEAT",
  "format": "RELEASE-Q1-FEAT-{NNN}",
  "padding": 3
}
```

Produces IDs: `RELEASE-Q1-FEAT-001`, `RELEASE-Q1-FEAT-002`, …

**When to use multi-segment:** when two repos share a prefix root (e.g. Cockpit uses
both `AIC-NNN` for kanban and `AIC-DEV-NNN` for agent sessions). Multi-segment makes
the namespace unambiguous in cross-repo commit history and federated claim checks.

**Industry default is single-segment.** Use multi-segment only when you have a real
cross-repo or hierarchical naming need. Single-segment repos (`TPL`, `MYAPP`, etc.)
are unaffected by this feature.

### Feature-prefixed slices

```json
{
  "prefix": "FEAT",
  "format": "FEAT-{NNN}",
  "padding": 4
}
```

Produces IDs: `FEAT-0001`, `FEAT-0002`, …

### Numeric-only (JIRA style)

JIRA uses `PROJECT-1234` where `PROJECT` is the key. Map as:

```json
{
  "prefix": "JIRA",
  "format": "JIRA-{NNN}",
  "padding": 4
}
```

This works with `coa-worktree`, but `claim-check` matching is pattern-based — ensure
your JIRA board keys do not collide with other prefixes in the same repo.

## How auto-pick uses this config

`coa-worktree --create` (default: auto-pick mode) calls `readSliceIdConfig(repoRoot)`,
reads `prefix`, `padding`, and `numbering_start`, then:

1. Scans `git log --all` for the highest existing `{prefix}-NNN` in commit messages.
2. Scans `.claims/*.json` for active claims using the same prefix.
3. Picks `max(history, claims) + 1`, floors at `numbering_start`, zero-pads to `padding` digits.
4. Atomically acquires a claim for that candidate (retries up to 5 times on collision).

```bash
node scripts/coa-worktree.mjs --create
# stdout: [coa-worktree] auto-picked: TPL-301
```

### Operator override

The `--auto-pick-prefix=` flag overrides the config prefix without reading the config file.
Use this for one-off cross-namespace operations where the config would give the wrong prefix.

```bash
node scripts/coa-worktree.mjs --create --auto-pick-prefix=SPIKE
```

---

## For AI agents

**If you are an AI agent working in a COA repository, read this section first.**

### When cloning or setting up a new project from this template

1. **First step after `git clone`:** Run bootstrap to establish the slice ID convention:
   ```bash
   node scripts/bootstrap.mjs --name "My Project" --key "MYPROJ"
   # This creates .coa/slice-id-config.json with prefix "MYPROJ"
   ```
   Or use the dedicated command:
   ```bash
   node scripts/bootstrap.mjs --init-slice-config
   # Edit .coa/slice-id-config.json to set the right prefix
   ```

2. **Never hardcode prefixes in code or prompts.** The config is the single source of truth.
   If you find yourself writing `AIC-`, `TPL-`, or any other prefix literally in a script,
   stop and read the config instead.

3. **Always read config when making slice ID decisions:**
   ```js
   import { readSliceIdConfig } from './scripts/lib/slice-id-config.mjs';
   const { prefix, padding, numbering_start } = readSliceIdConfig(repoRoot);
   ```

4. **If config is missing → refuse to proceed.** Surface the `ConfigMissingError` message
   to the operator and ask them to run `bootstrap.mjs --init-slice-config`. Do not guess
   or hardcode a fallback prefix.

5. **Do not create slice IDs manually.** Use `coa-worktree --create` (auto-pick mode).
   It atomically acquires a claim to prevent parallel-session collisions.

6. **For cross-repo or federated work:** Each repository has its own `.coa/slice-id-config.json`.
   Do not assume another repo uses the same prefix. Read the config in the target repo.

7. **Multi-segment prefixes are supported** (TPL-303 / ADR-0033): `AIC-DEV`, `RELEASE-Q1-FEAT`,
   etc. are valid `prefix` values. Single-segment (`TPL`, `MYAPP`) is the industry default.
   Use multi-segment only when cross-repo or hierarchical namespace disambiguation is needed.
   Examples: `{ "prefix": "AIC-DEV" }` produces `AIC-DEV-100`, `AIC-DEV-101`, …

### Detecting the current repo's prefix in a script

```js
import { readSliceIdConfig, ConfigMissingError } from './scripts/lib/slice-id-config.mjs';

let prefix;
try {
  const config = readSliceIdConfig(repoRoot);
  prefix = config.prefix;
} catch (err) {
  if (err instanceof ConfigMissingError) {
    console.error(err.message); // includes recovery hint
    process.exit(1);
  }
  throw err;
}
```

---

## Migration: adding config to an existing repo

If your repo predates TPL-300 and doesn't have `.coa/slice-id-config.json`:

1. Run: `node scripts/bootstrap.mjs --init-slice-config`
2. Edit `.coa/slice-id-config.json` — set `prefix` to the prefix already in use in your commit history.
3. Set `numbering_start` to the next free ID (or keep `1` and let auto-pick scan history).
4. Commit the new file: `git add .coa/slice-id-config.json`.

After migration, `coa-worktree --create` will read the config instead of guessing from history.

## Related

- [ADR-0033: Multi-segment prefix support](../adr/0033-multi-segment-prefix.md) — regex relaxation
- [ADR-0032: Config-based slice-id detection](../adr/0032-slice-id-config.md)
- [ADR-0029: coa-worktree auto-pick](../adr/0029-coa-worktree-auto-pick.md)
- [scripts/lib/slice-id-config.mjs](../../scripts/lib/slice-id-config.mjs) — reader + validator
- [scripts/coa-worktree.mjs](../../scripts/coa-worktree.mjs) — auto-pick implementation
