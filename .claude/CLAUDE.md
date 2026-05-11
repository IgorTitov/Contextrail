<!-- @HEADER
@version 0.7.119 | 2026-05-06
@purpose Claude-facing adapter to the shared repo-level delivery contract plus Claude-specific workflow routing, headers, tests, architecture, and release notes.
@sidecar CLAUDE.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# Claude Code operating contract

This is the Claude Code adapter for this repository.

The root `CLAUDE.md` is only a short pointer. Shared cross-tool workflow policy lives in `docs/agent-contract/compatibility-contract.json`, while Claude-specific routing and runtime notes live here.

<!-- AGENT-CONTRACT:START -->
## Shared compatibility contract

The cross-tool source of truth is `docs/agent-contract/compatibility-contract.json` and the human guide is `docs/agent-contract/README.md`.

Claude remains fully supported in this repository, but `.claude/CLAUDE.md` is now the **Claude adapter** to the shared delivery contract rather than the only source of process truth.

### Shared non-negotiables

- Prefer the smallest implementation-ready slice that can be proven locally.
- Before implementing any user-facing behavior change, use product-planner first and confirm persona/workflow USM plus PRD coverage exists.
- Keep commits atomic and reviewable; one slice should become one commit before the next slice begins.
- Never mark work complete before checks, acceptance proof, changelog discipline, and commit discipline are satisfied.
- Use deterministic repository scripts and hooks as the executable truth.
- Keep architectural boundaries explicit and avoid broad repo wandering.
- Treat trunk plus Branch by Abstraction as the default delivery model.
- Never git add -u or git add . — always name specific files. Scope repo-wide fix scripts (header-fix, readme-fix, prettier, eslint) to your active directory, not repo-wide.

### Shared parity workflow

- Edit the canonical contract first when the shared process changes.
- Regenerate adapters and synced sections before commit-ready finalization.
- Do not mark work complete until checks, acceptance proof, changelog discipline, and commit discipline are satisfied.

```bash
node scripts/agent-contract/sync.mjs
node scripts/agent-contract/check.mjs
```

### Enforced rules

These rules are blocked at lint time AND at runtime; bypass paths are explicitly closed (see each ADR).

Canonical narrative registry with whitehack analysis: `docs/rules-registry.md`. Coverage backlog: `docs/backlog/rule-coverage-gaps.md`.

- **r1-test-isolation** — Tests must not write to git repositories outside os.tmpdir() / RUNNER_TEMP.
  - Owner: `scripts/checks/test-isolation-check.mjs`
  - Runtime guard: `tests/_setup/no-live-git.mjs`
  - Sanctioned helper: `tests/_setup/safe-git.mjs`
  - ADR: `docs/adr/0015-test-isolation-enforcement.md`
  - Non-skippable pre-commit phase: `2.5`
- **r4-worktree-lifecycle** — Worktrees are ephemeral; audit + safe cleanup primitives required.
  - Owner: `scripts/coa-worktree.mjs`
  - Audit library: `scripts/lib/worktree-audit.mjs`
  - Refresh library: `scripts/lib/worktree-refresh.mjs`
  - ADR: `docs/adr/0016-worktree-lifecycle.md`
  - Operator-gated commands: `--teardown-stale --execute`
- **r2-transport-branch** — Every commit lands on trunk OR on a tx-<slice> transport branch; ceremony bumps gated by a coa-merge marker; ff-update to trunk is repo-shape-aware (F12).
  - Owner: `scripts/checks/transport-branch-check.mjs`
  - ADR: `docs/adr/0017-transport-branch-enforcement.md`
  - Non-skippable pre-commit phase: `2.7`

### Codex and Cursor parity surfaces generated from the same contract

- `AGENTS.md`
- `.agents/README.md`
- `.agents/skills/README.md`
- `.agents/skills/*/SKILL.md`
- `.cursorrules`

<!-- AGENT-CONTRACT:END -->

## Initial workspace setup

After cloning this template into a new project, run bootstrap to establish the slice ID
convention and scaffold placeholder replacements:

```bash
node scripts/bootstrap.mjs --name "MyApp" --key "MYPROJ" [--author "Name"] [--email "e@mail"]
```

This creates `.coa/slice-id-config.json` declaring the project's slice ID convention
(prefix = the value of `--key`). Edit that file to customize `padding` or `numbering_start`.

Without `.coa/slice-id-config.json`, `coa-worktree --create` will refuse with a recovery
hint. Run `node scripts/bootstrap.mjs --init-slice-config` to create the config alone.

See [docs/guides/slice-id-config.md](../docs/guides/slice-id-config.md) for the full schema
and AI-agent guidance.

### --create requires agent identity (TPL-310 / ADR-0038)

`coa-worktree --create` (in transport mode — `--slice=`, `--auto-pick`, or
default auto-pick) requires caller identity via `--agent=<role>` or
`COA_AGENT` environment variable. The value is recorded in
`.coa-session.agent` so coa-merge step 0.5 ownership check matches without
`COA_OPERATOR=1 + COA_ALLOW_FOREIGN_WORKTREE=1` override on every routine
ceremony. Pass the same role to both `--create` and `coa-merge`:

```bash
node scripts/coa-worktree.mjs --create --agent=feature-implementer
# ...work in worktree...
node scripts/coa-merge.mjs --message="..." --agent=feature-implementer
```

### When --create fails

If `coa-worktree --create` fails with "branch already exists" or any other error:
**STOP. Do NOT try to bypass by reusing existing state.**
Read the full error message — it includes specific recovery options.
If the path forward is unclear, escalate to the operator before proceeding.

## Always true

- **Start with `docs/SYSTEM_MAP.md`** — the ultra-compact system overview (~1900 tokens full, ~950 focused, measured by `bytes ÷ 4`). Modules are grouped into 9 domain categories (ADR 0011). Scan the Category Index to find your target domain, then read only that category detail section. Navigate to `modules/X/manifest.json` + `public-api.mjs` for your target module (Tier 2), and `docs/module-catalog.md` only if you need full API details (Tier 3).

## Rules registry

The canonical narrative list of every rule this template enforces or aspires to enforce, with per-rule whitehack analysis (evasion vectors + defenses) and test coverage status, lives in [docs/rules-registry.md](../docs/rules-registry.md). Sized follow-up coverage slices are tracked in [docs/backlog/rule-coverage-gaps.md](../docs/backlog/rule-coverage-gaps.md).

When implementing a new feature or rule:

1. Read the registry entries for any rules your work touches.
2. If your work establishes a new rule, add a registry entry with evasion analysis **in the same commit**.
3. If your work evades or weakens an existing rule, justify in commit body and obtain explicit operator approval.

## Hard stop before implementation

STOP. Before implementing any user-facing behavior change, route through `product-planner` and confirm USM coverage exists.

This is not optional. A change is non-compliant if it starts implementation before the linked persona/workflow USM, PRD intent, and implementation-ready backlog slice exist.

### Decision tree — does this change need USM?

1. **Bugfix or internal refactor** with no user-visible behavior change? → Skip USM. File PRD directly if scope is non-trivial, or proceed to implementation for small fixes.
2. **Technical / non-functional improvement** (performance, CI, tooling, docs)? → Skip USM. Route through PRD if it changes developer-facing contracts.
3. **Changes what a user sees, clicks, or experiences?** → Route through `product-planner`. USM coverage is mandatory before implementation.

Use the deterministic stop-gates before or alongside the first implementation slice:

```bash
node scripts/checks/usm-check.mjs
node scripts/checks/pre-impl-gate.mjs
```

- TDD is the default.
- Bugfixes should start with a failing regression test.
- One slice equals one commit. Do not batch multiple completed slices before commit-ready finalization.
- UI or UX changes require Gherkin coverage.
- Hexagonal boundaries matter: cross-module access goes through public APIs only.
- Deep imports are forbidden.
- The app layer (`apps/*`) may use any UI framework. Hex module domain/ and ports/ are framework-free; adapters/ may use React, Vue, Svelte, Angular (ADR-0012). When migrating, extract business logic into domain/ — keep framework code in adapters/. **Deleting the existing UI framework and rebuilding in vanilla JS is explicitly prohibited.** See [docs/guides/framework-in-hex-modules.md](../docs/guides/framework-in-hex-modules.md).
- Every meaningful tracked folder should have a `README.md`.
- Every meaningful tracked file should have a slim inline header and a sparse `<file>.header.md` sidecar (ADR-0009).
- Delivery uses Trunk-Based Development with Branch by Abstraction.
- Unfinished behavior should reach trunk only behind a stable seam or flag.
- Every new feature request enters backlog as raw intake first.
- Technical or non-functional work may move from intake to PRD without USM.
- UX, UI, or behavior work must pass through persona and workflow USM before PRD slicing and implementation backlog.
- Implementation work must stop when the linked slice is not yet ready or its required planning artifacts are missing.
- Canonical personas live under `docs/usm/personas/`.
- Design docs live under `docs/design/` and supplement user-facing work without replacing PRD or USM.
- Automation-facing DOM hooks such as stable `data-testid`, reusable DOM `id`, and derived selectors should come from a bounded registry instead of being hardcoded independently in templates, JS, and tests. See `apps/starter/ui-selectors.mjs` for the concrete starter example and `docs/design/design-system.md` for the full pattern.
- For untouched repository areas, prefer headers, public APIs, tests, and nearby docs before opening implementation internals.
- Deep-read implementation code mainly in files you will actually change and their direct collaborators.
- Prefer slices small enough that one bounded module or seam can be understood without chasing the whole codebase.
- The current artifact path is `.backups/`.
- `post-commit` is **narrow warning-only, no mutation** (TPL-246 + TPL-260). Pre-commit Phase 5 stamps `@version` preemptively; post-commit never writes files or touches the index. TPL-260 adds one read-only exception: if HEAD bumped VERSION but `.backups/` lacks the matching snapshot, a `console.log` warning is printed reminding the operator to run `pnpm mergezip:no-bump`. The hook exits 0 always. Adding a *mutating* post-commit behavior requires a new ADR.
- Prefer local skills, local subagents, and deterministic repo scripts over ad-hoc prompting.
- All user-facing UI copy must go through a simple i18n/messages layer from day one, even if the app initially ships with only one locale.

## Header discipline (ADR-0009: sidecar-first)

Every meaningful file carries a **slim inline header** (7 lines) plus a **sparse `.header.md` sidecar** for full metadata.

### Slim inline header format

```js
/* @HEADER
 * @version 0.4.0 | 2026-04-06
 * @purpose One-line description of the file's role.
 * @sidecar <filename>.header.md
 * @layer <layer> | @hex <hex-layer> | @ctx <bounded-context>
 * @public <true|false>
 * @edit <careful|rewrite-ok|append-only|sync-only|generated|manual-only>
 */
```

- Only these 7 fields stay inline — everything else lives in the sidecar.
- For comment-unsafe formats (JSON, SVG, binary): sidecar-only, no inline header.

### Sparse sidecar format

The `.header.md` contains only fields with meaningful values — no `_none_` padding. All fields live in YAML frontmatter (both machine and narrative, using camelCase keys). The markdown body is decorative only (`# filename`), not parsed by tools.

### Migration

Both old (heavy inline) and new (slim + sidecar) formats are accepted during migration. Use `header-migrate.mjs` to convert.

- Header quality is owned by `header-guardian` and the `header-sidecar` skill.
- Use deterministic scripts first.

```bash
node scripts/checks/header-create.mjs <files...>
node scripts/checks/header-fix.mjs
node scripts/checks/header-check.mjs
node scripts/checks/header-migrate.mjs
```

## Product-doc flow

1. Add the raw request to backlog intake first.
2. Route PRD, USM, and backlog normalization through `product-planner` (skill: `prd-usm-backlog`). This stop is mandatory before behavior implementation.
3. Ask clarifying questions only when the repo cannot proceed safely without them.
4. Use USM first for persona-centered workflow and behavior changes.
5. Use PRD first for technical and non-functional requirement intent.
6. Slice only implementation-ready backlog items forward.
7. Run `node scripts/checks/usm-check.mjs` and `node scripts/checks/pre-impl-gate.mjs` before or alongside the first implementation slice.

## Design flow

- Route user-facing visual language, prompt-authoring, and asset handoff work through `designer`.
- Keep brandbook, design-system, prompt templates, and accepted asset guidance in `docs/design/`.
- Let design supplement product intent and visible-state understanding, not replace PRD or USM.

## Default delivery flow

1. Route structural or control-plane changes through `repo-architect`.
2. Route feature intake and decomposition through `product-planner`.
3. Route user-facing design work through `designer` when brand, visual, screen-state, or mockup guidance is needed.
4. Update spec or traceability docs if behavior changed.
5. Write the smallest proving test first.
6. Route implementation-ready slices through `feature-implementer`.
7. Route visible UI-heavy slices through `frontend-specialist` when needed.
8. Close acceptance through `acceptance-tester` before finalization.
9. Commit the bounded slice before starting the next slice.
10. Sync headers and READMEs.
11. Run architecture, delivery-flow, control-plane, product-doc, USM, pre-implementation, test, and changelog checks.
12. Use artifact commands only when snapshots or zips are actually needed.

## Branching and delivery model

- Trunk is the primary integration line.
- Prefer Branch by Abstraction over long-lived feature branches.
- Introduce the seam first when needed, keep the old path active, prove the new path, then switch.
- Keep new behavior disabled by default until proof is green.
- Remove old behavior in a later atomic commit when that keeps the change set clearer.
- Keep the policy summary here and the operational detail in `docs/adr/0002-trunk-based-delivery.md`.

## Cross-boundary coordination

Before modifying files outside your target module, check `.claims/` for active claims and file your own claim.

- **BBA-first rule**: frame cross-boundary changes as additions (new export behind a BBA seam) rather than modifications of existing code. Use `strategy: "bba-additive"` whenever possible.
- If modification is unavoidable, use `--acquire` to atomically check for conflicts and create the claim. This is the recommended way to start cross-boundary work (fail fast, not fail late).
- `--create` still works for backward compatibility but does not block on conflicts.
- Claims are enforced — the pre-commit hook blocks commits on active `modify`/`replace` conflicts and auto-expires stale claims.
- Protected shared-infra files (package.json, SYSTEM_MAP.md, CI configs, etc.) produce advisory warnings when staged without a claim. Configure in `.claims/config.json`.
- For irreducible conflicts, file a counter-claim with `strategy: "negotiate"` and `counterTo` referencing the original claim. Priority ordering resolves when priorities differ.
- Use `--query=<path>` to discover which claims are active on a specific file before modifying it.
- Use `dependsOn` to sequence claims — blocked claims are reported automatically.
- Use `--federated=<dir>` to include claims from other repositories in overlap checks and audit.
- See `.claims/README.md` for the claim format and lifecycle.

```bash
# Before starting cross-boundary work (recommended):
node scripts/checks/claim-check.mjs --acquire --agent=<name> --slice=<id> --targets=<paths> --action=<action>

node scripts/checks/claim-check.mjs --targets=modules/auth/public-api.mjs --action=modify
node scripts/checks/claim-check.mjs --query=modules/auth/public-api.mjs
node scripts/checks/claim-check.mjs --enforce --staged
node scripts/checks/claim-check.mjs --auto-expire
node scripts/checks/claim-check.mjs --create --agent=<name> --slice=<id> --targets=<paths> --action=<action>
node scripts/checks/claim-check.mjs --auto-complete --staged
node scripts/checks/claim-check.mjs --audit
node scripts/checks/claim-check.mjs --federated=../other-repo/.claims --audit
```

### Operator hygiene: claim cleanup (TPL-309 / ADR-0037)

Periodically (e.g. weekly), purge stale claim files from `.claims/`:

```bash
COA_OPERATOR=1 node scripts/checks/claim-check.mjs --clean-expired --dry-run
# review output, then:
COA_OPERATOR=1 node scripts/checks/claim-check.mjs --clean-expired
```

Deletes `status=expired` immediately and `status=completed` older than 30 days
(override with `--keep-completed-days=N`). Active and example claims are
spared. Audit log entry per deletion is written before unlink.

Operational detail: `docs/adr/0008-inter-agent-coordination-protocol.md` and `docs/design/inter-agent-coordination-protocol.md`.

### Operator hygiene: bulk dirty-worktree cleanup (TPL-312 / ADR-0040)

`coa-merge` Step 9e correctly preserves dirty worktrees post-ceremony, but the
preserved-but-merged residue accumulates. To bulk-clean merged-but-dirty `tx-*`
worktrees:

```bash
COA_OPERATOR=1 node scripts/coa-worktree.mjs --teardown-stale --include-dirty --dry-run
# review the Clean and Dirty sections, then:
COA_OPERATOR=1 node scripts/coa-worktree.mjs --teardown-stale --execute --include-dirty
```

Ancestor-safety is preserved (only merged tx-* eligible); `--include-dirty`
adds force-removal, not ancestor-bypass. Dirty teardowns emit a distinct
`worktree-teardown-dirty` audit log event with a `dirty_status_summary` field.

## Multi-module atomic commits

When a cross-cutting change cannot split into independent single-module commits without a broken intermediate state, a multi-module atomic commit is acceptable.

Checklist before committing across modules:

- [ ] Confirmed that splitting would leave a broken intermediate state.
- [ ] Acquired claims on **all** target modules via `--acquire` with all targets listed.
- [ ] No more than 3 modules in one atomic commit.
- [ ] Commit message lists all affected modules: `feat(auth,permission): ...`
- [ ] Contract tests pass for all touched modules.
- [ ] "While I'm here" edits excluded — only the minimum spanning change.

## Preferred scripts

Header and README discipline:

```bash
node scripts/checks/header-create.mjs <files...>
node scripts/checks/header-check.mjs
node scripts/checks/header-fix.mjs
node scripts/checks/readme-check.mjs
node scripts/checks/readme-fix.mjs
```

Traceability and product docs:

```bash
node scripts/checks/spec-check.mjs
node scripts/checks/spec-sync.mjs
node scripts/checks/backlog-sync.mjs
node scripts/checks/product-docs-check.mjs
node scripts/checks/product-data-check.mjs
node scripts/checks/design-docs-check.mjs
```

Quality gates:

```bash
node scripts/checks/architecture-check.mjs
node scripts/checks/delivery-flow-check.mjs
node scripts/checks/control-plane-check.mjs
node scripts/checks/claim-check.mjs
node scripts/checks/test-gate.mjs
node scripts/checks/changelog-sync.mjs --check
```

Artifacts:

```bash
pnpm snapshot
pnpm mergezip
pnpm test:all:mergezip
```

## Agent routing

Use these subagents when the work matches their role:

- `product-planner`
- `designer`
- `feature-implementer`
- `frontend-specialist`
- `acceptance-tester`
- `repo-architect`
- `control-plane-supervisor`
- `tech-writer`
- `test-guardian`
- `hex-architect`
- `release-operator`
- `security-screener`
- `repo-cartographer`
- `changelog-curator`
- `header-guardian`
- `readme-guardian`

Feature intake and decomposition route to `product-planner`.
User-facing design framing, prompt authoring, and asset handoff route to `designer`.
Implementation-ready backlog slices route to `feature-implementer`.
Visible UI-heavy work routes to `frontend-specialist`.
Acceptance closure routes to `acceptance-tester`.
Header work routes to `header-guardian`.
README discipline routes to `readme-guardian`.
Cross-plane drift review routes to `control-plane-supervisor`.

## Release and artifact notes

- `pnpm mergezip` is the current one-command artifact flow.
- It bumps the patch version unless explicitly told not to.
- It writes the merged snapshot and zip archive into `.backups/`.
- `pnpm test:all:mergezip` is the wrapper flow for “run all tests, but still produce artifacts”.
- Do not resurrect legacy external ops-folder workflows.
- Do not add *mutating* behavior to `post-commit` — it is warning-only per TPL-246 + TPL-260. Any hook behavior that writes files or touches the git index requires a new ADR.

## Done means

A change is not done until:

- trace links still resolve
- relevant tests pass
- architectural boundaries still hold
- headers and READMEs are aligned with the real file roles
- inactive paths are clearly isolated behind the intended seam or flag
- the right canonical product-doc owners were updated
- the right design docs or handoff docs were updated for user-facing work
- automation-facing UI hooks come from the bounded registry instead of scattered literals
- the implemented slice was validated against its acceptance
- `CHANGELOG.md` is current when the change is commit-ready
- artifacts were produced when the task actually needed them
