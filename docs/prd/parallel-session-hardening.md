<!-- @HEADER
@version 0.7.69 | 2026-05-03
@purpose Requirement intent for v0.7.0 parallel-session hardening — worktree isolation default, merge wrapper, enforcement-in-code.
@sidecar parallel-session-hardening.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Parallel-Session Hardening v0.7.0 — PRD

## Intent

Make multi-agent parallel development the **proven, tested, default** mode of working in Contextrail. Move from "fixed reactively after incidents" to "structurally sound and enforced by code."

Three production incidents (staging bleed v0.6.7, pre-commit scope v0.6.8, VERSION drift v0.6.9) exposed that the single-worktree model requires every script to be parallel-aware — a fragile invariant that breaks with each new script. v0.7.0 switches the default to worktree-per-session isolation, which eliminates the entire class of staging bleed and script-scope bugs at the filesystem level.

## Outcome

1. **Worktree isolation as default** — each agent session works in a disposable `git worktree`, not the shared trunk worktree. Staging bleed, ORIG_STAGED gaps, `changedRepoFiles()` scope bugs become structurally impossible.

2. **Merge wrapper script** — `coa-merge.mjs` replaces the 9-step manual commit ceremony with a single command that enforces all invariants (pull --rebase, claims, VERSION bump, CHANGELOG, tests, merge, cleanup). Agents cannot skip steps.

3. **Three-layer enforcement** — git hooks (local, any agent), merge wrapper (scripted ceremony), branch protection (remote, any agent). Every critical rule is a script that blocks on violation, not an instruction that hopes for compliance.

4. **Integration tests for parallel scenarios** — test suite proving staged isolation, claim enforcement, VERSION race protection, and merge wrapper correctness. Without these tests, regressions are invisible.

5. **Claims remain** — worktree isolation solves physical conflicts (two processes writing one file). Claims solve logical conflicts (two agents modifying one module in separate copies, producing merge conflicts). BBA-first rule, --acquire, --enforce all stay.

## Constraints

- Trunk-based development stays. Short-lived worktree branches (< 1 day) are TBD-compliant.
- No feature branches. Worktrees merge to trunk, not to each other.
- Must work for all supported agents (Claude Code, Copilot, Aider, Codex), not just Claude.
- Single-worktree mode stays as documented fallback for simple sequential work.
- Claims protocol stays and strengthens (not replaced by worktrees).
- No external services, databases, or central orchestrators.

## Scope

### In scope

- Worktree bootstrap and teardown tooling (`coa-worktree.mjs`)
- Merge wrapper script (`coa-merge.mjs`)
- Integration test suite for parallel-session scenarios
- Recovery script for merge conflicts and VERSION drift (`coa-recover.mjs`)
- `--force-expire` for manual stale claim removal
- `--scope` guard on header-*-fill manual-run scripts
- Collision telemetry markers
- Documentation updates (parallel-sessions.md, ADR-0002, CLAUDE.md, agent contract)

### Out of scope

- Single-worktree script-by-script hardening (Variant A from audit — superseded by worktree isolation)
- Real-time inter-agent communication
- External orchestration services
- Feature branch workflows

## Classification

- Type: technical / non-functional (no user-visible behavior change)
- USM: not required (internal tooling)
- Design: not required (no UI)

## Decision reference

- Audit: `docs/analysis/parallel-session-hardening-audit-v0.6.9.md`
- ADR: `docs/adr/0002-trunk-based-delivery.md` (will be updated)
- ADR: `docs/adr/0008-inter-agent-coordination-protocol.md` (will be updated)

## Acceptance boundaries

- All parallel-session integration tests pass.
- `coa-merge.mjs` enforces VERSION bump, CHANGELOG, claims, tests in one command.
- `coa-worktree.mjs` creates and tears down worktrees with node_modules symlink.
- No single-worktree-specific hacks (ORIG_STAGED, changedRepoFiles scope) are required for correctness.
- Claims protocol works identically in worktree and single-worktree modes.
- Documentation reflects worktree-first default.

## R8 Hook integrity follow-ups

R8.1 (TPL-247) and R8.2 (TPL-256) are incremental bypass-closer sub-checks under this PRD. They extend the three-layer enforcement goal: hooks that can be silently tampered provide no enforcement.

- **R8.1** (TPL-247): pre-push snapshot-coverage-check catches `--no-verify` skips of coa-merge.
- **R8.2** (TPL-256): sha256 fingerprints of all `.githooks/*` files; non-skippable pre-commit Phase 1.0 + pre-push catch-net detect hook tampering. Operator-gated `--update` (COA_OPERATOR=1) is the sanctioned registry update path.

## Epic

**Work item:** TPL-189 (canonical trace-yaml record in `docs/backlog/parallel-session-hardening.md`)
