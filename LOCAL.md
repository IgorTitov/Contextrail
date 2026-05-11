<!-- @HEADER
@version 0.7.107 | 2026-05-06
@purpose Describe the role of LOCAL in this repository.
@sidecar LOCAL.md.header.md
@layer root | @hex _none_ | @ctx _none_
@public false
@edit careful -->

<!-- generated from compatibility-contract.json — do not edit by hand -->
<!-- source: docs/agent-contract/compatibility-contract.json | regenerate: node scripts/agent-contract/sync.mjs -->

# LOCAL — slim contract for local-tier harnesses

You are a **mid-** or **small-tier** agent (16K-32K context) running in a tool-use harness (Aider, Cline, Continue, LM Studio + a local 7B/70B model). Read this file, then start work. The full Claude/Codex adapter lives in `AGENTS.md` if you ever need it; you do not need it for bounded slices.

## First action — get a slice brief

Before any other action, run `node scripts/agent-context.mjs --slice=$SLICE_ID --files=<comma-separated paths>` to receive a token-budgeted brief sized to your tier (`--profile=small` for ≤16K context, `--profile=mid` for default, `--profile=frontier` for ≥64K). Read the brief top to bottom; deep-read only the Touched files section.

```bash
node scripts/agent-context.mjs --slice=<SLICE_ID> --files=<comma-separated-paths>
```

## Capability tier (for context, not action)

- **mid** (≥32,000 ctx tokens) — Single-agent tool-use loop. Owns bounded slices inside ONE module.
- **small** (≥16,000 ctx tokens) — Deterministic helper only — header sync, README touch-ups, commit-message templating, prettier-fix. NOT a slice owner.

You own bounded slices inside ONE module at a time. Architectural decisions, multi-module refactors, and control-plane work belong to a frontier-tier agent — escalate by surfacing the question, not by improvising.

## Non-negotiable rules

- Prefer the smallest implementation-ready slice that can be proven locally.
- Route user-facing behavior changes through PRD/USM before implementing.
- Keep commits atomic and reviewable; one slice should become one commit before the next slice begins.
- Never mark work complete before checks, acceptance proof, changelog discipline, and commit discipline are satisfied.
- Use deterministic repository scripts and hooks as the executable truth.
- Keep architectural boundaries explicit and avoid broad repo wandering.
- Treat trunk plus Branch by Abstraction as the default delivery model.
- Never git add -u or git add . — always name specific files. Scope repo-wide fix scripts (header-fix, readme-fix, prettier, eslint) to your active directory, not repo-wide.

## Coordination — file a claim before cross-file work

Before editing files outside your single target module, acquire a claim. The pre-commit hook blocks commits that touch claimed files without a claim of your own.

```bash
node scripts/checks/claim-check.mjs --targets=<paths> --action=<extend|modify|replace>
node scripts/checks/claim-check.mjs --query=<path>
node scripts/checks/claim-check.mjs --audit
```

See `.claims/README.md` for the full lifecycle.

## Commit ceremony — use coa-merge

Do not touch `VERSION`, `CHANGELOG.md`, or `package.json` by hand. `coa-merge` does the pull, claim, version bump, and changelog release atomically:

```bash
git add <your slice files>
node scripts/coa-merge.mjs --message="feat(module): description (TPL-XXX)"
```

Commit message rules: `<type>(<scope>): <summary>` ≤100 chars; types ∈ {feat, fix, docs, test, refactor, chore, perf, build, ci, style}; include a work-item ID like `(TPL-209)` in the header or `Refs TPL-209` in the body.

## Header discipline (ADR-0009)

Every meaningful tracked file carries a slim 7-line inline header plus a sparse `<file>.header.md` sidecar. **Do not write `@version` yourself** — leave whatever value is there; the pre-commit hook stamps the right number.

Inline header (7 lines):

```
/* @HEADER
 * @version <untouched>
 * @purpose One line on the file role.
 * @sidecar <filename>.header.md
 * @layer <layer> | @hex <hex-layer> | @ctx <bounded-context>
 * @public <true|false>
 * @edit <careful|rewrite-ok|append-only|sync-only|generated|manual-only>
 */
```

Use `node scripts/checks/header-create.mjs <file>` to scaffold both inline + sidecar.

```bash
node scripts/checks/header-create.mjs <files...>
node scripts/checks/header-check.mjs
```

## Module size constraint (ADR-0013)

Each module has a **work-surface budget** so it fits a 16K local-LLM context. Warn threshold: 8K tokens. If you find yourself touching a module that already warns, prefer trimming the representative test or splitting an adapter over adding more code. Run `pnpm modules:fit-check` to inspect.

## Test gate

- TDD is the default.
- Bugfixes start from a failing regression test.
- UI or UX changes require Gherkin coverage.

## Definition of done

- Trace links resolve for the changed slice.
- The changed implementation/proof files reference a ready work item through SpecRefs.
- Required tests and deterministic checks pass.
- Architecture and public-API boundaries still hold.
- Headers, READMEs, and generated adapters are aligned.
- Acceptance proof is explicit.
- CHANGELOG.md and commit discipline are satisfied.

## Quality and compatibility commands

```bash
node scripts/agent-contract/sync.mjs
node scripts/agent-contract/check.mjs
```

## Local-tier equivalents (when role delegation is unavailable)

When the canonical workflow says "route through X" or "delegate to Y" but your harness can only invoke deterministic commands, run the equivalent below instead. Each entry has a **scope** (what the script does) and **limits** (what still requires reasoning) — read the canonical contract for those before relying on the command.

| Role/skill | Run instead |
| --- | --- |
| `acceptance-tester` (role) | `node scripts/checks/test-gate.mjs` |
| `control-plane-supervisor` (role) | `node scripts/checks/control-plane-check.mjs` |
| `release-operator` (role) | `node scripts/coa-merge.mjs` |
| `acceptance-validation` (skill) | `node scripts/checks/test-gate.mjs` |
| `changelog-release` (skill) | `node scripts/checks/changelog-release.mjs` |
| `control-plane-audit` (skill) | `node scripts/checks/control-plane-check.mjs` |
| `header-sidecar` (skill) | `node scripts/checks/header-fix.mjs --changed` |
| `hex-boundary` (skill) | `node scripts/checks/architecture-check.mjs` |
| `readme-discipline` (skill) | `node scripts/checks/readme-fix.mjs` |
| `spec-traceability` (skill) | `node scripts/checks/spec-check.mjs` |

### Cannot run locally — escalate or stop

These roles/skills require reasoning that no deterministic script substitutes for. If the workflow points here and your harness has no higher tier to delegate to, surface the question to the operator and stop.

- `repo-architect` (role)
- `product-planner` (role)
- `designer` (role)
- `feature-implementer` (role)
- `frontend-specialist` (role)
- `bdd-playwright` (skill)
- `control-plane-design` (skill)
- `design-delivery` (skill)
- `feature-delivery` (skill)
- `frontend-delivery` (skill)
- `prd-usm-backlog` (skill)
- `repo-nav` (skill)
- `security-audit` (skill)
- `tdd` (skill)
- `trunk-bba` (skill)

## What this adapter intentionally OMITS

- Detailed role routing (frontier-tier concern — see `AGENTS.md`).
- Hooks, skills, and runtime-tool plugin protocols (Claude/Codex-class harness features).
- BDD modularity detail (apply only when touching `.feature` files; see canonical contract).
- Multi-module atomic-commit checklists (escalate to a frontier-tier agent).

If your harness lacks the equivalent of those concepts, run only what the canonical contract calls executable truth: the deterministic scripts under `scripts/`. They are the source of authority — your agent loop is the decision authority for the slice itself.

## When the slice gets bigger than this file

If you find yourself needing to read `AGENTS.md` end-to-end, or wandering across more than two modules, **stop and surface that to the operator**. Local-tier agents are specifically scoped to bounded slices; growing the slice silently is the wrong path.

Footer — full contract: `docs/agent-contract/compatibility-contract.json`. Human guide: `docs/agent-contract/README.md`.
