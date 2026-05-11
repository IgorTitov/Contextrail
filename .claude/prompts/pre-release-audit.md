<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Comprehensive 12-phase pre-release audit prompt for the Contextrail template repository.
@sidecar pre-release-audit.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# Pre-Release Re-Audit — Contextrail Template v0.5.1

You are re-auditing the Contextrail (COA) template repository after a round of fixes. The previous audit found 6 blocking issues and 10 warnings — all 6 blockers have been addressed. This audit verifies the fixes and checks for any remaining issues before release.

## Context

- Version: 0.5.1 (check VERSION file matches)
- Branch: main
- 24 hex modules in `modules/`
- 3 apps in `apps/` (starter, api-starter, react-starter)
- Zero domain/port-layer runtime dependencies; adapters may declare infrastructure deps (e.g., jose for JWT)
- Internal docs are gitignored but stay on disk (docs/plans/, docs/quality-assessment-v0.3.1.md, docs/quality-assessment-v0.3.3.md, docs/analysis/brownfield-experiment-case-study.md)

## Previous audit fixes applied

1. **ROOT_SCAN_DIRS** in `scripts/lib/header.mjs` now includes `modules` and `apps` — header-check/header-fix scan production code
2. **471 files** in modules/apps got version-bumped to 0.3.2 via header-fix
3. **358 files** got semantic header fields (Owns, Boundaries, Invariants, NotesForLLM) filled via `scripts/checks/header-semantic-fill.mjs`
4. **24 manifest.json.header.md** sidecars created for all modules
5. **README.md** agent/skill counts corrected (16 agents, 17 skills)
6. **CHANGELOG.md** promoted from [Unreleased] to [0.3.2]
7. **docker-compose.yml** test count fixed (2100+)
8. **SYSTEM_MAP** retrieval file count (27) and source total (250+) corrected
9. **modules/db/public-api.mjs** got full semantic header
10. **.claude/prompts/** directory with README and pre-release audit prompt added

Verify that ALL of these are correct and look for anything the previous audit or the fixes may have missed.

## Audit Plan

Run each phase below sequentially. For each phase, report findings as:
- OK: [what passed]
- WARN: [non-blocking issue, describe]  
- FAIL: [blocking issue that must be fixed before release]

At the end, produce a summary table with phase / status / issue count.

---

### Phase 1: Deterministic Script Gates

Run ALL validation scripts and capture output. These are the executable truth.

```bash
node scripts/checks/header-check.mjs
node scripts/checks/readme-check.mjs
node scripts/checks/architecture-check.mjs
node scripts/checks/spec-check.mjs
node scripts/checks/product-docs-check.mjs
node scripts/checks/product-data-check.mjs
node scripts/checks/design-docs-check.mjs
node scripts/checks/delivery-flow-check.mjs
node scripts/checks/control-plane-check.mjs
node scripts/checks/changelog-sync.mjs --check
node scripts/checks/seam-audit.mjs
node scripts/checks/usm-check.mjs
node scripts/checks/test-gate.mjs
node scripts/agent-contract/check.mjs
```

Report each script's exit code and any warnings/errors. Do NOT fix anything yet — just report.

---

### Phase 2: Version Consistency

Check that version 0.3.2 is consistent everywhere:
- `VERSION` file
- `package.json` version field
- Sample 20+ file headers across different directories (modules, apps, docs, tests, scripts, root files) — every header line `version X.X.X` must say `0.3.2`
- Check for any stale `0.3.1` or `0.3.0` references in headers

```bash
grep -r "version 0.3.1" --include="*.mjs" --include="*.md" --include="*.mts" --include="*.feature" -l
grep -r "version 0.3.0" --include="*.mjs" --include="*.md" --include="*.mts" --include="*.feature" -l
```

---

### Phase 3: Header Quality (Deep)

Beyond what header-check catches, manually inspect headers in these critical areas:
1. All 24 `modules/*/public-api.mjs` — Summary, Owns, Boundaries, Invariants, NotesForLLM must NOT be `_none_`
2. All `modules/*/manifest.json` — must have `.header.md` sidecar
3. All files in `apps/api-starter/` — headers must have `SpecRefs: TPL-177`
4. All files in `apps/starter/` — spot check 10 files for header quality
5. All files in `apps/react-starter/` — check headers exist and are meaningful
6. Root files: `CLAUDE.md`, `.gitignore`, `package.json`, `README.md`, `CHANGELOG.md`
7. Key docs: `docs/SYSTEM_MAP.md`, `docs/module-catalog.md`, `docs/technical-reference.md`, `docs/whitepaper.md`

For each, verify:
- Summary describes the real role (not placeholder)
- Owns is specific (not generic)
- Boundaries are stated
- Invariants are actionable
- NotesForLLM gives useful context to an agent

---

### Phase 4: README Coverage

Every meaningful tracked directory must have a README.md. Check:

```
. (root)
apps/
apps/starter/
apps/api-starter/
apps/api-starter/routes/
apps/react-starter/
modules/ (each of 24 modules)
docs/
docs/adr/
docs/analysis/
docs/backlog/
docs/design/
docs/guides/
docs/prd/
docs/usm/
docs/usm/personas/
docs/agent-contract/
docs/product-data/
tests/
tests/unit/
tests/bdd/
tests/bdd/features/
tests/contract/
tests/e2e/
scripts/
scripts/checks/
.claude/
.claude/rules/
.claims/
```

For each existing README.md:
- Is it non-empty and meaningful (not just a title)?
- Does it describe the folder's purpose?
- Are links valid?

---

### Phase 5: Tests — Full Run

Run the complete test suite:

```bash
pnpm test:all 2>&1
```

Report:
- Total test count
- Pass/fail counts
- Any skipped or todo tests
- Any timeouts or flaky failures (re-run once if flaky)

Then specifically check:
- `tests/unit/api-starter.test.mjs` — all pass?
- `tests/bdd/api-starter.test.mjs` — all pass?
- `tests/bdd/features/api-starter.feature` — scenarios match step definitions?

---

### Phase 6: Module Integrity

For each of the 24 modules:
1. `manifest.json` exists and is valid JSON
2. `public-api.mjs` exists and exports are real (not empty file)
3. `README.md` exists
4. Adapters directory structure is consistent
5. At least one test file references the module

Spot check 5 modules deeply:
- `auth` (complex, has adapters, depends on api-client)
- `cache` (server adapter exists: redis-adapter)
- `db` (newest module)
- `i18n` (used by api-starter greeting route)
- `retrieval` (largest module, 27 .mjs files)

For each deep check: read public-api.mjs, verify exports match manifest, verify adapter count matches.

---

### Phase 7: Backlog and Traceability

1. Read `docs/backlog/index.md` — verify all trace-yaml blocks parse cleanly
2. Check that every `status: done` item has valid `spec_refs` and `test_refs`
3. Verify TPL-177 (api-starter) is present and complete
4. Run spec-check and confirm zero errors:
   ```bash
   node scripts/checks/spec-check.mjs
   ```
5. Check `docs/backlog/_generated/backlog.json` exists and is consistent with index.md

---

### Phase 8: Architecture and Dependencies

1. Verify no deep imports (cross-module imports must go through public-api.mjs):
   ```bash
   grep -r "from '../../modules/" apps/ --include="*.mjs" | grep -v "public-api.mjs"
   grep -r "from '../" modules/ --include="*.mjs" | grep -v -E "(adapters/|domain/|ports/|__)" | head -20
   ```

2. Check `docs/_generated/dependency-graph.json` matches actual imports
3. Verify `docs/SYSTEM_MAP.md` module count (24) matches actual `modules/` directory count
4. Check no `node_modules/` content is tracked
5. Verify `.gitignore` excludes what it should and nothing more

---

### Phase 9: Documentation Quality

Read and verify these key docs for accuracy and completeness:
1. `README.md` (root) — is it release-ready? Does it explain COA, how to get started, project structure?
2. `docs/whitepaper.md` — no broken links, coherent narrative
3. `docs/guides/framework-integration.md` — accurate for current module set
4. `docs/guides/brownfield-migration.md` — consistent with architecture rules
5. `CHANGELOG.md` — has 0.3.2 section, entries match actual commits
6. `CONTRIBUTING.md` — exists? Guidelines make sense?
7. `LICENSE` — exists?
8. `docs/faq.md` — no stale answers

---

### Phase 10: Git Hygiene and Release Readiness

1. `git status` — working tree must be clean
2. `git log --oneline -10` — commits are conventional, have work-item IDs
3. No merge conflicts or leftover conflict markers:
   ```bash
   grep -r "<<<<<<" --include="*.mjs" --include="*.md" --include="*.json" -l
   ```
4. No TODO/FIXME/HACK in shipped code (list any found):
   ```bash
   grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.mjs" --include="*.md" | grep -v node_modules | grep -v ".header.md" | head -30
   ```
5. No console.log in production code (only in test files and log module):
   ```bash
   grep -rn "console\.\(log\|warn\|error\)" --include="*.mjs" modules/ apps/ | grep -v "log/" | grep -v "test" | head -20
   ```
6. No secrets, API keys, or tokens in tracked files
7. `.env.example` exists and contains only placeholder values
8. `package.json` scripts are all functional

---

### Phase 11: Apps Verification

#### apps/starter (vanilla JS browser app)
- `index.html` exists and loads correctly
- `ui-selectors.mjs` registry exists
- i18n messages layer is wired
- No hardcoded UI strings outside i18n

#### apps/api-starter (Node.js HTTP server)  
- `app.mjs` exports `createAppContext` and `startServer`
- `app-config.mjs` exports `MODES`, `detectMode`, `getMode`, `setMode`, `resolveConfig`, `resetConfig`
- Routes: `health.mjs` and `greeting.mjs` exist
- Zero external dependencies (no require/import of npm packages)
- Server adapters in modules/ are wired correctly

#### apps/react-starter (React app)
- Basic structure exists
- README explains its purpose
- If incomplete/placeholder, that's acceptable but must be clearly documented

---

### Phase 12: Security Scan

1. No secrets in any tracked file:
   ```bash
   grep -rn "sk-\|api_key\|password.*=.*['\"]" --include="*.mjs" --include="*.json" --include="*.md" | grep -v "example\|placeholder\|_none_\|YOUR_" | head -20
   ```
2. No eval() or Function() in production code
3. No unsafe HTML injection patterns
4. Check that `.gitignore` properly excludes `.env`, `.env.*`, key files
5. `docs/adr/` — any security-relevant ADRs?

---

## Final Report

After all phases, produce:

### Summary Table

| Phase | Name | Status | Issues |
|-------|------|--------|--------|
| 1 | Script Gates | OK/WARN/FAIL | count |
| ... | ... | ... | ... |

### Blocking Issues (must fix before release)
- List each FAIL with file path and description

### Warnings (should fix, not blocking)
- List each WARN

### Release Verdict
- READY / NOT READY
- If NOT READY, list the minimum fixes needed

---

**Important**: Do NOT fix anything during this audit. Only report findings. Fixes will be done in a separate step after the audit is reviewed.
