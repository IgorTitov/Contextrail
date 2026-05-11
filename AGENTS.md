<!-- @HEADER
 * @version 0.8.6 | 2026-05-11
 * @purpose Codex adapter for the shared repo-level delivery contract and skill map.
 * @sidecar AGENTS.md.header.md
 * @layer root
 * @public true
 * @edit sync-only
 -->
# AGENTS

This repository supports **Claude, Codex, Cursor, and any harness driving a frontier-, mid-, or small-tier agent** through one shared delivery contract.

## Canonical source of truth

- Machine source: `docs/agent-contract/compatibility-contract.json`
- Human guide: `docs/agent-contract/README.md`

Do not define a second process contract here. Edit the canonical contract first, then regenerate this adapter.

## Agent capability tiers

Contextrail supports mixed-tier teams. Each role and skill names the **minimum** tier that can fulfill it; higher tiers may always step in.

- **frontier** (≥200,000 ctx tokens) — Frontier-class hosted models with rich harness tooling. Owns architecture, control-plane, multi-module slices.
  - Capabilities: subagents, hooks, skills, memory-persistence, long-horizon-reasoning, cross-module-architectural-decisions
  - Harnesses: Claude Code, Codex CLI, Cursor
- **mid** (≥32,000 ctx tokens) — Mid-tier capabilities — single-agent tool use without subagent dispatch. Owns bounded slices within one module. May run cloud (Sonnet, GPT-4o-mini) or local (Llama-3.1-70B, Qwen-2.5-72B in LM Studio/Ollama).
  - Capabilities: skills, tool-use, single-agent-loop, bounded-implementation, i18n-aware-edits
  - Harnesses: Aider, Cline, Continue, Claude Code with Sonnet/Haiku, Cursor with smaller cloud models
- **small** (≥16,000 ctx tokens) — Local-small tier (16K context floor). NOT a slice owner — runs as deterministic helper for header sync, README generation, commit-message templating, prettier-fix, doc-translation, narrow extracts. Always invoked by a higher-tier agent that owns the slice.
  - Capabilities: tool-use-narrow, deterministic-transformation
  - Harnesses: Aider with 7B-class models, Cline with 7B-class, Continue with 7B-class

Local-tier support is landing across TPL-208..215. The `local` adapter slot in `adapters` reserves `LOCAL.md` and `MICRO.md` for upcoming generation.

## Non-negotiable working rules

- Prefer the smallest implementation-ready slice that can be proven locally.
- Before implementing any user-facing behavior change, use product-planner first and confirm persona/workflow USM plus PRD coverage exists.
- Keep commits atomic and reviewable; one slice should become one commit before the next slice begins.
- Never mark work complete before checks, acceptance proof, changelog discipline, and commit discipline are satisfied.
- Use deterministic repository scripts and hooks as the executable truth.
- Keep architectural boundaries explicit and avoid broad repo wandering.
- Treat trunk plus Branch by Abstraction as the default delivery model.
- Never git add -u or git add . — always name specific files. Scope repo-wide fix scripts (header-fix, readme-fix, prettier, eslint) to your active directory, not repo-wide.

## Shared delivery flow

- Route structural or orchestration changes through repo-architect.
- Use product-planner first for new intake, decomposition, USM, or PRD routing.
- For user-facing behavior work, stop implementation until persona/workflow USM and PRD coverage are real and linked.
- Use designer for user-facing design or prompt-authoring work when needed.
- Update traceability artifacts before or alongside the first implementation slice.
- Write the smallest proving test first.
- Before modifying files outside your target module, check .claims/ for active claims and file your own claim (ADR 0008).
- Implement one bounded slice through feature-implementer or frontend-specialist.
- Close acceptance through acceptance-tester before finalization.
- Commit the bounded slice before starting the next slice.
- Sync headers, READMEs, and generated adapters.
- Run architecture, delivery, control-plane, compatibility, pre-implementation, USM, test, and changelog gates.
- Create artifacts only when a snapshot or zip is actually needed.

## Gates and finalization

### Test gate

- TDD is the default.
- Bugfixes start from a failing regression test.
- UI or UX changes require Gherkin coverage.
- Visible browser proof should be runnable in headed mode when debugging or validating user-facing flow changes.
- The test gate is not green until deterministic repo checks and the shipped fast-path proof layers pass.

### BDD modularity conventions

- One .feature file per module or per user flow — never a monolithic all-features file.
- Each .feature + its step definitions must fit within a 4K-8K token file-size budget (keeps test files small and modular).
- Each Scenario is fully independent — no shared mutable state, no ordering dependencies between scenarios.
- Scenarios describe user-visible behavior in domain language, not implementation mechanics.
- Selectors in Playwright-backed BDD come from the bounded ui-selectors registry, never hardcoded in step definitions or feature files.
- Test data uses builders or factory helpers, not hardcoded fixture objects that couple to model shape.
- Cross-module scenarios are forbidden in tests/bdd/ — one scenario proves one module's behavior.
- When a module is detached, its .feature file and step definitions detach cleanly with it.
- A dedicated cross-module walkthrough under tests/e2e/ is exempt from the one-module-per-feature rule — it intentionally chains flows across modules in a single headed browser session for visual end-to-end verification.
- Reference: docs/design/bdd-conventions.md

### Acceptance gate

- Acceptance closes the implemented slice against linked backlog and spec intent.
- Add only the smallest missing proof needed to decide readiness.
- A slice is not ready for finalization until acceptance proof is explicit.
- Ready-for-finalization does not mean done until the bounded slice is committed.

### Changelog flow

- Keep CHANGELOG.md current for commit-ready work.
- Use deterministic changelog sync rather than ad-hoc manual drift.
- Changelog notes must stay bounded to the current slice instead of batching several slices together.

### Commit flow

- Commit only after repo gates and acceptance are green.
- Use conventional commit shape with at least one work-item ID.
- One slice equals one commit; do not accumulate multiple completed slices before committing.
- Large batched changesets must be resliced or justified explicitly.

### Finalization discipline

- Do not treat a task as complete until checks, changelog, and commit discipline are satisfied.
- Use mergezip or test:all:mergezip only when release artifacts are needed.
- Keep unfinished behavior behind a stable seam or flag until proof is green.
- Do not move to the next slice while the current slice is still uncommitted.

## Enforced rules

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

## Commands to use

### Compatibility sync and parity

```bash
node scripts/agent-contract/sync.mjs
node scripts/agent-contract/check.mjs
```

### Traceability and docs

```bash
node scripts/checks/spec-check.mjs
node scripts/checks/spec-sync.mjs
node scripts/checks/backlog-sync.mjs
node scripts/checks/product-docs-check.mjs
node scripts/checks/usm-check.mjs
node scripts/checks/pre-impl-gate.mjs
node scripts/checks/design-docs-check.mjs
```

### Headers

```bash
node scripts/checks/header-create.mjs <files...>
node scripts/checks/header-check.mjs
node scripts/checks/header-fix.mjs
```

### Coordination (inter-agent claims)

```bash
node scripts/checks/claim-check.mjs --targets=<paths> --action=<extend|modify|replace>
node scripts/checks/claim-check.mjs --query=<path>
node scripts/checks/claim-check.mjs --audit
node scripts/checks/claim-check.mjs --auto-expire
node scripts/checks/claim-check.mjs --enforce --staged
node scripts/checks/claim-check.mjs --create --agent=<name> --slice=<id> --targets=<paths> --action=<action>
node scripts/checks/claim-check.mjs --auto-complete --staged
```

### Quality gates

```bash
node scripts/checks/architecture-check.mjs
node scripts/checks/delivery-flow-check.mjs
node scripts/checks/control-plane-check.mjs
node scripts/checks/changeset-size-check.mjs
node scripts/checks/test-gate.mjs
node scripts/checks/changelog-sync.mjs --check
```

### Artifacts

```bash
pnpm snapshot
pnpm mergezip
pnpm test:all:mergezip
```

## Role routing

- `repo-architect` _(tier: frontier)_ — structural, orchestration, control-plane, or seam design work; owns repo structure, canonical contract alignment, architectural seams.
- `product-planner` _(tier: frontier)_ — new intake, decomposition, backlog normalization, or mandatory PRD/USM routing before implementation; owns intake-first routing, mandatory planning stop, slice readiness, traceability normalization.
- `designer` _(tier: frontier)_ — user-facing visual language, prompt templates, accepted assets, or design handoff; owns design lane, visible-state guidance, design handoff refs.
- `feature-implementer` _(tier: mid)_ — bounded implementation slices outside heavy UI concerns; owns small slices, deep-read only touched files, low-magic implementation, one-slice-per-commit discipline.
- `frontend-specialist` _(tier: mid)_ — visible UI, accessibility, messages/i18n, or selector discipline matters; owns UI delivery, a11y, selector registry discipline.
- `acceptance-tester` _(tier: mid)_ — closing acceptance or deciding finalization readiness; owns acceptance gate, smallest missing proof, ready-for-finalization decision, commit-readiness confirmation.
- `control-plane-supervisor` _(tier: frontier)_ — cross-surface drift or orchestration consistency is in doubt; owns drift audit, adapter parity, source repair.
- `release-operator` _(tier: mid)_ — artifact packaging or release/finalization discipline is needed; owns CHANGELOG discipline, artifact commands, release readiness.

## Codex skills

Use the generated skills under `.agents/skills/` as workflow modules:

- `acceptance-validation` _(tier: mid)_ — Close an implemented slice against acceptance and determine readiness for finalization.
- `bdd-playwright` _(tier: mid)_ — Express visible behavior through Gherkin and deterministic browser-oriented proof when needed.
- `changelog-release` _(tier: small)_ — Keep changelog and release/finalization discipline aligned with the real change.
- `control-plane-audit` _(tier: frontier)_ — Audit drift across instructions, hooks, scripts, docs, and tests, then repair the real source.
- `control-plane-design` _(tier: frontier)_ — Shape repo-level orchestration and control-plane changes without creating duplicate authority.
- `design-delivery` _(tier: frontier)_ — Carry user-facing design work from intent to accepted handoff without replacing PRD or USM.
- `feature-delivery` _(tier: mid)_ — Implement one bounded backlog slice by deep-reading only touched files and direct collaborators.
- `frontend-delivery` _(tier: mid)_ — Implement visible UI slices with explicit accessibility, messages, and selector discipline.
- `header-sidecar` _(tier: small)_ — Keep structured headers and sidecars aligned with the real file role.
- `hex-boundary` _(tier: mid)_ — Preserve modular boundaries and public-API-only access across the repo.
- `prd-usm-backlog` _(tier: frontier)_ — Normalize intake, PRD, USM, and backlog so implementation slices start from the right source.
- `readme-discipline` _(tier: small)_ — Keep folder-level READMEs aligned with real ownership and entrypoints.
- `repo-nav` _(tier: frontier)_ — Navigate untouched repo areas through headers, public APIs, tests, and nearby docs first.
- `security-audit` _(tier: frontier)_ — Screen risky commands, sensitive paths, and security regressions before calling work done.
- `spec-traceability` _(tier: frontier)_ — Keep backlog, PRD, USM, design, and proof references aligned around the changed slice.
- `tdd` _(tier: mid)_ — Start from the smallest failing proof, then implement only what makes it pass.
- `trunk-bba` _(tier: frontier)_ — Ship through trunk using Branch by Abstraction and stable seams instead of long-lived hidden branches.

## Definition of done

- Trace links resolve for the changed slice.
- The changed implementation/proof files reference a ready work item through SpecRefs.
- Required tests and deterministic checks pass.
- Architecture and public-API boundaries still hold.
- Headers, READMEs, and generated adapters are aligned.
- Acceptance proof is explicit.
- CHANGELOG.md and commit discipline are satisfied.

## Adapter discipline

- `.claude/CLAUDE.md` is the Claude adapter.
- `AGENTS.md` is the Codex adapter.
- `.cursorrules` is the Cursor adapter.
- `LOCAL.md` / `MICRO.md` slots reserve the local-tier adapter (generated in TPL-209).
- `.agents/skills/*` are generated Codex-compatible workflow modules.
- Shared repo scripts, git hooks, and tests remain the executable truth for all tools.
