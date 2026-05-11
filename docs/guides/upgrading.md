<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Guide for upgrading an existing Contextrail-based project to the latest template version.
@sidecar upgrading.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Upgrading a Contextrail-Based Project

This guide covers upgrading an existing project that was created from
an earlier version of the Contextrail template. It is not about
adopting Contextrail into a non-Contextrail project — for that, see
[Brownfield Migration](brownfield-migration.md).

---

## Before you start

1. **Commit or stash all local changes.** The upgrade will touch
   many files.
2. **Note your current version:** check `package.json` → `version`
   and `VERSION` file.
3. **Read the CHANGELOG** in the template repo for all versions
   between yours and the target. Focus on **Changed** and **Fixed**
   sections — these contain breaking changes.
4. **Run the migration check** (if available):
   ```bash
   node scripts/checks/migration-check.mjs --template=<path-to-template>
   ```

## Upgrade checklist

Work through this checklist in order. Each section is an atomic slice
that can be committed independently.

### 1. Script path rename

If your project has `scripts/claude/`, rename it:

```bash
git mv scripts/claude scripts/checks
```

Then update all references:
- `.claude/CLAUDE.md` — all `scripts/claude/` → `scripts/checks/`
- `.claude/rules/*.md`
- `.claude/agents/*.md` and `.claude/skills/*/SKILL.md`
- `.githooks/pre-commit`
- `docs/agent-contract/compatibility-contract.json`
- Any other `.md` files that reference script paths

**Verify:** `grep -r "scripts/claude" . --include="*.md" --include="*.mjs" --include="*.json" --include="*.yml"`
should return zero results (excluding `docs/analysis/` historical files).

### 2. Header migration (ADR-0009)

If your project uses heavy inline headers (50+ lines with FILEINFO blocks),
migrate to slim inline + sparse sidecar:

```bash
# Port the migration script from the template if you don't have it:
cp <template>/scripts/checks/header-migrate.mjs scripts/checks/

# Dry run first:
node scripts/checks/header-migrate.mjs --dry-run

# Run migration:
node scripts/checks/header-migrate.mjs

# Verify:
node scripts/checks/header-check.mjs
```

The slim format is 7 lines: `@version`, `@purpose`, `@sidecar`, `@layer`,
`@hex`, `@public`, `@edit`. Everything else goes in the `.header.md` sidecar.

### 3. Manifest enrichment

If your module manifests lack `maturity` or `capabilities` fields:

```bash
# Check what's missing:
node scripts/checks/capabilities-sync.mjs --check
```

For each module manifest, add:
- `"maturity": "stable"` or `"beta"` or `"example"`
- `"capabilities"` block with port interfaces (copy structure from
  the template's equivalent module)

**Rule:** Only update modules that exist in your project. Do NOT
import new template modules — that's a separate decision.

### 4. Quality gate scripts

Compare your `scripts/checks/` against the template's. Copy missing
scripts that apply to your project:

**Core (always needed):**
- `architecture-check.mjs`
- `header-check.mjs`
- `readme-check.mjs`
- `test-gate.mjs`
- `changelog-sync.mjs`
- `commit-msg-check.mjs`

**Recommended:**
- `claim-check.mjs` — inter-agent coordination
- `spec-check.mjs` — traceability
- `delivery-flow-check.mjs`
- `control-plane-check.mjs`
- `system-map-check.mjs`
- `numbers-sync.mjs`
- `header-exports-fill.mjs`
- `sidecar-content-check.mjs`

**Optional (adopt when needed):**
- `seam-audit.mjs`, `seam-inventory.mjs`, `seam-rollback-check.mjs`
- `manifest-staleness-check.mjs`
- `generated-integrity-check.mjs`

### 5. Pre-commit hook update

The template's pre-commit hook uses a phased architecture with
scope detection and tiered execution. Compare your `.githooks/pre-commit`
against the template's and adopt:

- **7-phase structure** (read-only checks → syncs → claims → pre-impl → fixes → validation → heavy gates)
- **`COA_GATE=fast`** for development speed
- **`COA_SKIP_GATES`** for emergency bypass
- **`COA_SCOPE`** for per-module scoping
- **`pre-commit-runner.mjs`** for single-process execution

### 6. Claims protocol

If your project doesn't have `.claims/`:

```bash
mkdir -p .claims
```

Create `.claims/config.json`:
```json
{
  "protectedPathMode": "block",
  "protectedPaths": [
    "CHANGELOG.md",
    "package.json",
    "pnpm-lock.yaml",
    "docs/SYSTEM_MAP.md",
    ".github/workflows/*",
    ".githooks/*",
    ".claims/config.json"
  ]
}
```

Adjust protected paths to include your project's critical files.
Copy `.claims/README.md` from the template.

### 7. Control plane update

Update `.claude/CLAUDE.md` from the template, preserving your
project-specific sections. Key additions to look for:

- USM decision tree
- Cross-boundary coordination section
- Multi-module atomic commit checklist
- Agent routing table
- Header discipline section (ADR-0009)

Also update:
- `.claude/rules/*.md` — compare each rule file
- `.claude/agents/*.md` — add new agents, update existing
- `.claude/skills/*/SKILL.md` — add new skills

### 8. SYSTEM_MAP redesign

If your SYSTEM_MAP uses a flat module listing, switch to the
category-grouped format (ADR-0011):

1. Group your modules into domain categories
2. Add the Category Index table
3. Add the Navigation Tiers section
4. Update the Key Entry Points section

**Your SYSTEM_MAP should list only YOUR modules, not the template's
full set of 38.**

### 9. Missing ADRs

Copy any ADRs from the template that your project doesn't have.
Required set:
- 0002 (trunk-based delivery)
- 0006 (COA)
- 0007 (file-size limits)
- 0008 (inter-agent coordination)
- 0009 (sidecar-first headers)

### 10. CI and governance

Update `.github/workflows/ci.yml`:
- SHA-pin all Actions
- Add `permissions: contents: read`
- Add seam-state matrix if using feature-seams
- Add quality gates from §4 above

Add missing OSS files (use `{{PLACEHOLDER}}` format for fork safety):
- `SECURITY.md`
- `GOVERNANCE.md`
- `MAINTAINERS.md`
- `.github/CODEOWNERS`
- `.github/copilot-instructions.md`

### 11. Tool adapters

Generate or update cross-tool adapters:
```bash
node scripts/agent-contract/sync.mjs
node scripts/agent-contract/check.mjs
```

This creates/updates `.cursorrules`, `AGENTS.md`, `.agents/skills/`.

### 12. Verify

Run the full release gate:
```bash
node scripts/checks/architecture-check.mjs
node scripts/checks/header-check.mjs
node scripts/checks/readme-check.mjs
node scripts/checks/system-map-check.mjs
pnpm test:unit
```

---

## Known friction points

These issues were discovered during real-world migrations (Cockpit v0.3.0,
MedOps v0.3.1). They apply to any upgrade from a pre-0.6.x base.

### Migration commits need `--no-verify`

The pre-commit hook will block migration commits because:
- `pre-impl-gate` fails on generated headers (no SpecRefs)
- `header-fix` may re-stamp files you just migrated

**Use `git commit --no-verify` for migration slices**, then re-enable
the full hook after all slices are complete. This is expected and safe.

### Script transitive dependencies

When copying scripts from the template, some depend on shared libs.
If a copied script fails with `Cannot find module`, check whether it
needs files from `scripts/lib/`:

| Script | Depends on |
|--------|-----------|
| All scripts in `scripts/checks/` | `scripts/lib/fs-helpers.mjs`, `scripts/lib/cli-helpers.mjs`, `scripts/lib/output.mjs` |
| `_shared.mjs` | `scripts/lib/scope-helpers.mjs` |
| `capabilities-sync.mjs` | `scripts/lib/jsdoc-typedef-parser.mjs`, `scripts/lib/types-d-parser.mjs`, `scripts/lib/import-resolver.mjs` |
| `header-check.mjs`, `header-fix.mjs` | `scripts/lib/header.mjs` |
| `header-migrate.mjs` | `scripts/lib/header.mjs` |

Copy the entire `scripts/lib/` directory to be safe, or copy individual
files as errors indicate.

### header-fix vs header-migrate conflict

If `header-fix` runs in the pre-commit hook after you've migrated headers
with `header-migrate`, it may re-inject heavy headers on files that
`hasSlimHeader()` doesn't recognize. Solutions:
- Use `--no-verify` during migration (recommended)
- Run `header-migrate` as the final step, after all other slices

### Governance file identity

Template governance files (SECURITY.md, GOVERNANCE.md, MAINTAINERS.md,
CODEOWNERS) contain `{{PLACEHOLDER}}` values. After copying them, replace
with your project's identity, or run `pnpm bootstrap` with `--author`,
`--email`, `--github-org`, `--github-repo` flags.

### Runtime key migration on rebrand

When renaming a project (e.g., bootstrapping from a template or
rebranding), runtime storage keys are the highest-risk items.
`localStorage`, `IndexedDB` database names, log prefixes, and
`sessionStorage` keys that use the old project name will lose user
data if simply renamed.

**Pattern:** add a one-time migration on first load:
```js
// Migrate old storage key to new name
const OLD_KEY = 'rzd-filter-views';
const NEW_KEY = 'zvenix-filter-views';
const old = localStorage.getItem(OLD_KEY);
if (old) {
  localStorage.setItem(NEW_KEY, old);
  localStorage.removeItem(OLD_KEY);
}
```

Do this migration in the **first session** after rebranding — before
new code writes to the new keys. IndexedDB renames require opening
the old DB, reading data, writing to a new DB, and deleting the old one.

### Post-migration verification

After all slices, run:
```bash
node scripts/checks/migration-check.mjs --template=<path-to-template>
```

This reports remaining gaps by severity. Some gaps are intentional
(fewer modules than the template) — the report distinguishes these.

---

## What NOT to do during upgrade

- **Don't import new template modules** unless you need them. The
  template has 38 modules; your project may have fewer. That's fine.
- **Don't overwrite custom domain logic.** If your module's domain
  code has diverged from the template, keep yours.
- **Don't change your FileId namespace.** If you use `MED:` or
  `COCKPIT:`, keep it.
- **Don't adopt everything at once.** The checklist above is ordered
  by priority. You can stop after any step and have a working project.

## Minimal viable upgrade

If you want the smallest useful upgrade:

1. Script path rename (§1)
2. Core quality gate scripts (§4, core only)
3. Pre-commit hook update (§5)

This gives you modern enforcement without touching headers, manifests,
or docs. Everything else can be adopted incrementally.

---

**Related guides:**
- [Getting Started](getting-started.md) — new project setup
- [Brownfield Migration](brownfield-migration.md) — adding Contextrail to a non-Contextrail project
- [Module Detachment](module-detachment.md) — removing modules you don't need
