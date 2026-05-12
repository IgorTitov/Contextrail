<!-- @HEADER
@version 0.7.102 | 2026-05-05
@purpose Index the current backlog intake items and actionable execution slices tracked in this template.
@sidecar index.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Backlog index

Every new request enters the backlog as raw intake at the bottom first.

Backlog is the source of truth for:

- intake order
- priority
- dependency
- execution status
- ready-for-implementation state

Recommended intake and execution statuses:

- `proposed`
- `needs-clarification`
- `classified`
- `normalized`
- `todo`
- `in-progress`
- `blocked`
- `validating`
- `done`

## Ready for implementation

An item is ready for implementation only when:

- its path is classified
- blocking clarification is closed
- the right PRD and USM artifacts exist for the change type
- the slice can pass `node scripts/checks/pre-impl-gate.mjs`
- acceptance is testable
- dependencies are named
- the item is small enough to implement and verify in one slice

## Starter intake example

```trace-yaml
work_item:
  id: TPL-004
  type: intake
  title: Raw request: add saved filters to the search experience
  parent_ref:
  status: proposed
  module_ref: search
  spec_refs:
    - docs/backlog/index.md
    - docs/usm/scenarios/maintainer/bootstrap-workflow.md
    - docs/prd/bootstrap-template.md
    - docs/usm/scenarios/maintainer/bootstrap-workflow.md
    - docs/prd/bootstrap-template.md
  test_refs:
    - tests/contract/product-docs-contract.test.mjs
  bdd_refs:
    - tests/bdd/features/template.feature#Scenario: Bootstrap the project template
  acceptance:
    - The raw request is preserved before classification and normalization.
```

## Starter actionable example

```trace-yaml
work_item:
  id: TPL-003
  type: task
  title: Add repo-local git hooks and deterministic gate scripts
  parent_ref: TPL-002
  status: todo
  module_ref: core
  spec_refs:
    - docs/backlog/index.md
    - docs/usm/scenarios/maintainer/bootstrap-workflow.md
    - docs/prd/bootstrap-template.md
  test_refs:
    - scripts/checks/test-gate.mjs
  bdd_refs:
    - tests/bdd/features/template.feature#Scenario: Bootstrap the project template
  acceptance:
    - Pre-commit hook exists.
    - Post-commit hook exists.
    - Gate scripts are callable from the command line.
```

## Starter Common Features

Epic: TPL-005 (canonical in `docs/prd/starter-common-features.md`).
Tasks: TPL-014 through TPL-021 — see `docs/backlog/starter-common-features.md` for the full backlog.

## Multi-Platform Abstraction Seams

Epic: TPL-022 (canonical in `docs/prd/platform-seams.md`).
Tasks: TPL-023 through TPL-035 — see `docs/backlog/platform-seams.md` for the full backlog. Slice 1 (TPL-023 through TPL-025) is done. Slice 2 (TPL-026 through TPL-028) is done. Slice 3 (TPL-029 through TPL-032) is done. Slice 4 (TPL-033 through TPL-035) is done.

## Feature Seams Module

Epic: TPL-036 (canonical in `docs/prd/feature-seams.md`).
Tasks: TPL-037 through TPL-042 — see `docs/backlog/feature-seams.md` for the full backlog. Slice 5 (TPL-037 through TPL-042) is done.

## Event Bus + State Management

Epic: TPL-043 (canonical in `docs/prd/event-bus-state.md`).
Tasks: TPL-044 through TPL-053 — see `docs/backlog/event-bus-state.md` for the full backlog. Slice 6 (TPL-044 through TPL-053) is done.

## Design Tokens + Brandbook

Epic: TPL-054 (canonical in `docs/prd/design-tokens-brandbook.md`).
Tasks: TPL-055 through TPL-061 — see `docs/backlog/design-tokens-brandbook.md` for the full backlog.
Status: done.

## Auth Port + API Client

Epic: TPL-062 (canonical in `docs/prd/auth-api-client.md`).
Tasks: TPL-063 through TPL-070 — see `docs/backlog/auth-api-client.md` for the full backlog.
Status: done.

## AI Chat Port + UI

Epic: TPL-071 (canonical in `docs/prd/ai-chat.md`).
Tasks: TPL-072 through TPL-078 — see `docs/backlog/ai-chat.md` for the full backlog.
Status: done.

## In-Browser LLM Module

Epic: TPL-079 (canonical in `docs/prd/local-llm.md`).
Tasks: TPL-080 through TPL-085 — see `docs/backlog/local-llm.md` for the full backlog.
Status: done.

## RAG Retrieval Module

Epic: TPL-086 (canonical in `docs/prd/retrieval.md`).
Tasks: TPL-087 through TPL-092 — see `docs/backlog/retrieval.md` for the full backlog.
Status: done.

## Tree-Shaking Build Optimization

Epic: TPL-093 (canonical in `docs/prd/tree-shaking.md`).
Tasks: TPL-094 through TPL-096 — see `docs/backlog/tree-shaking.md` for the full backlog.
Status: done.

## RAG Extensions

Epic: TPL-097 (canonical in `docs/prd/rag-extensions.md`).
Tasks: TPL-098 through TPL-128 — see `docs/backlog/rag-extensions.md` for the full backlog.
Slice 13 (ChunkerPort + pluggable chunking): TPL-098 through TPL-103.
Slice 14 (TokenizerPort + EmbedderPort): TPL-104 through TPL-109.
Slice 15 (Hybrid Search + Re-ranker): TPL-110 through TPL-113.
Slice 16 (GraphRAG knowledge-graph module): TPL-114 through TPL-121.
Slice 17 (Document Loaders + Query Pipeline): TPL-122 through TPL-128.
Status: done.

## Module Detachment + Language Strategy ADR

Epic: TPL-129 (canonical in `docs/prd/module-detachment.md`).
Tasks: TPL-130 through TPL-133 — see `docs/backlog/module-detachment.md` for the full backlog.
Standalone task: TPL-134 (TS vs JS ADR).
Status: done.

## Inter-Agent Coordination Protocol

Epic: TPL-172 (canonical in `docs/adr/0008-inter-agent-coordination-protocol.md`).
Tasks: TPL-173 through TPL-176 — see `docs/backlog/inter-agent-coordination.md` for the full backlog.
Phase 1 (MVP): TPL-173. Phase 2 (Enforcement): TPL-174. Phase 3 (Negotiation): TPL-175. Phase 4 (Federation): TPL-176.
Status: done (all 4 phases complete).

## Infrastructure Modules

Epic: TPL-136 (canonical in `docs/prd/infrastructure-modules.md`).
Tasks: TPL-137 through TPL-171 — see `docs/backlog/infrastructure-modules.md` for the full backlog.
Slice 19 (LogPort — Structured Logging): TPL-137 through TPL-141.
Slice 20 (CachePort — Caching with Policies): TPL-142 through TPL-145.
Slice 21 (FormValidation — Composable Rules): TPL-146 through TPL-147.
Slice 22 (RealtimePort — Transport Abstraction): TPL-148 through TPL-153.
Slice 23 (TaskPort — Background Processing): TPL-154 through TPL-156.
Slice 24 (PermissionPort — RBAC): TPL-157 through TPL-159.
Slice 25 (FilePort — File Handling): TPL-160 through TPL-162.
Slice 26 (AnalyticsPort — Analytics and Behavioral Telemetry): TPL-163 through TPL-167.
Slice 27 (SchedulerPort — Periodic Tasks): TPL-168 through TPL-171.
Status: done.

## Manifest Capabilities (F3)

Epic: TPL-178 (canonical in `docs/prd/manifest-capabilities.md`).
Tasks: TPL-179 through TPL-186 — see `docs/backlog/manifest-capabilities.md` for the full backlog.
Status: todo. Variant 2 — hard fail from day one, OSS launch delayed. F5 (`failureModes`) is deferred to a later epic. Empirical basis: `docs/analysis/mode-b-review.md` and `docs/analysis/port-jsdoc-coverage.md`.

## Server-Side Starter Applications

Epic: TPL-177 (canonical in `docs/prd/server-starters.md`).
Status: done.

```trace-yaml
work_item:
  id: TPL-177
  type: task
  title: Add api-starter app with server-side hex adapters
  parent_ref:
  status: done
  module_ref: core
  spec_refs:
    - docs/prd/server-starters.md
    - docs/backlog/index.md
  test_refs:
    - tests/unit/api-starter.test.mjs
    - tests/bdd/api-starter.test.mjs
  bdd_refs:
  acceptance:
    - api-starter app exists at apps/api-starter/ with zero external dependencies.
    - Health and greeting routes return valid JSON responses.
    - All hex module imports use public-api.mjs only.
    - Server adapters exist for cache, state, auth, event-bus, log, and realtime modules.
    - Unit and BDD tests pass.
```

## Main-Worktree Guard (R5)

```trace-yaml
work_item:
  id: TPL-276
  title: R5 main-worktree guard — block direct commits to main worktree
  status: done
  type: rule
  module_ref: tooling
  spec_refs:
    - docs/adr/0018-main-worktree-guard.md
  test_refs:
    - tests/unit/main-worktree-guard.test.mjs
  impl: scripts/checks/main-worktree-guard.mjs
  adr: docs/adr/0018-main-worktree-guard.md
  acceptance:
    - main-worktree-guard.mjs exists at scripts/checks/ with --self-test and --json modes.
    - Phase 0 added to pre-commit hook as non-skippable (NON_SKIPPABLE_PHASES includes 0).
    - Direct git commit from main worktree exits 1 with R5 FATAL message.
    - COA_OPERATOR=1 in main worktree prints WARNING and exits 0.
    - All 8 isTransportWorktree fixture paths pass --self-test.
    - Unit tests in tests/unit/main-worktree-guard.test.mjs pass.
    - ADR-0018 documents decision, consequences, and COA_OPERATOR bypass rationale.
    - R5 entry added to docs/rules-registry.md with whitehack table.
```

## Phase-5 finalize: auto-stage allow-list + post-stamp hook-integrity regen (TPL-278)

```trace-yaml
work_item:
  id: TPL-278
  title: Extend pre-commit auto-stage allow-list + post-stamp hook-integrity regen
  status: done
  type: bugfix
  module_ref: tooling
  spec_refs:
    - docs/adr/0019-phase-5-finalize.md
    - docs/adr/0014-pre-commit-stamp-discipline.md
  test_refs:
    - tests/integration/phase-5-finalize.test.mjs
    - tests/unit/hook-integrity.test.mjs
    - tests/integration/hook-integrity-check.test.mjs
  impl:
    - .githooks/pre-commit
    - scripts/checks/hook-integrity-check.mjs
  upstream: AIC-DEV-136,TPL-277-chore,AIC-DEV-137
  acceptance:
    - Post-commit git status --porcelain is empty after a version-bump slice.
    - Post-commit git status --porcelain is empty after a hook-touching slice.
    - Phase 1.0 passes on the commit after a hook-touching slice (no follow-up registry-regen).
    - --from-pre-commit-hook with GIT_DIR set bypasses COA_OPERATOR gate.
    - --from-pre-commit-hook without GIT_DIR is refused (exit 1).
    - Auto-stage block uses explicit paths only (no git add . or git add :/).
```

## commentStyle JSON/SVG sidecar fix (TPL-277)

```trace-yaml
work_item:
  id: TPL-277
  title: commentStyle() returns sidecar for .json/.svg/etc regardless of directory path
  status: done
  type: bugfix
  module_ref: tooling
  spec_refs:
    - docs/adr/0009-sidecar-first-headers.md
  test_refs:
    - tests/unit/header-engine.test.mjs
    - tests/unit/hook-integrity.test.mjs
    - tests/integration/hook-integrity-check.test.mjs
  impl:
    - scripts/lib/header.mjs
    - scripts/lib/hook-integrity.mjs
  upstream: ZVX-DEV-073
  acceptance:
    - commentStyle('.githooks/policy.json') returns 'sidecar'.
    - commentStyle('.githooks/.fingerprints.json') returns 'sidecar'.
    - commentStyle('.githooks/icon.svg') returns 'sidecar'.
    - commentStyle('.githooks/pre-commit', shebang) returns 'hash' (no regression).
    - loadFingerprints strips inline header prefix before parsing.
    - loadFingerprints throws SyntaxError when no JSON object found.
    - Manual smoke: probe.json in .githooks/ left untouched by header-fix.
    - HEADER_EXEMPT_FILES['.githooks/.fingerprints.json'] retained (belt-and-braces).
```

## coa-worktree auto-pick mode (TPL-280)

```trace-yaml
work_item:
  id: TPL-280
  title: coa-worktree --create auto-picks next-free slice ID eliminating manual verify-and-rollforward
  status: done
  type: task
  module_ref: tooling
  spec_refs:
    - docs/adr/0029-coa-worktree-auto-pick.md
    - docs/rules-registry.md
  test_refs:
    - tests/integration/coa-worktree-auto-pick.test.mjs
  impl:
    - scripts/coa-worktree.mjs
  acceptance:
    - --create without --slice or --name auto-picks next-free ID from history+claims.
    - --auto-pick flag explicitly triggers auto-pick.
    - --auto-pick-prefix=<P> overrides detected prefix.
    - --slice + --auto-pick together is refused.
    - stdout includes [coa-worktree] auto-picked: <ID> line.
    - result.autoPicked field set in returned result.
    - 11 integration tests pass.
```

## Slice-ID uniqueness invariant (TPL-282)

```trace-yaml
work_item:
  id: TPL-282
  title: C4 slice-ID uniqueness invariant — claim-check --acquire blocks reuse of active or historically committed slice IDs
  status: done
  type: task
  module_ref: tooling
  spec_refs:
    - docs/adr/0020-slice-id-uniqueness.md
    - docs/rules-registry.md
  test_refs:
    - tests/unit/claim-check-slice-id-uniqueness.test.mjs
    - tests/integration/coa-worktree-slice-id-lock.test.mjs
    - tests/integration/coa-worktree-slice-id-race.test.mjs
  impl:
    - scripts/checks/claim-check.mjs
    - scripts/coa-worktree.mjs
  upstream: AIC-DEV-135,AIC-DEV-136,AIC-DEV-137,ZVX-DEV-068
  acceptance:
    - claim-check --acquire --slice=X refuses when active claim with slice=X exists.
    - claim-check --acquire --slice=X refuses when (X) appears in any commit subject.
    - coa-worktree --create --slice=X surfaces collision error before worktree creation.
    - --allow-id-collision without COA_OPERATOR=1 is refused.
    - Two sequential --acquire calls for the same slice ID: only first succeeds.
    - Self-proof: post-commit claim-check --acquire --slice=TPL-282 refused with slice-id-collision.
```

## Commit-msg slice-coverage check — CG-C4-1 closure (TPL-281)

```trace-yaml
work_item:
  id: TPL-281
  title: commit-msg-check layer — verify slice ID in subject covered by active claim or history (CG-C4-1)
  status: done
  type: task
  module_ref: tooling
  spec_refs:
    - docs/prd/inter-agent-coordination.md
    - docs/adr/0025-commit-msg-slice-coverage.md
    - docs/adr/0020-slice-id-uniqueness.md
    - docs/rules-registry.md
  test_refs:
    - tests/unit/commit-msg-check-slice-coverage.test.mjs
  impl:
    - scripts/checks/commit-msg-check.mjs
  upstream: TPL-282
  acceptance:
    - Orphan slice ID (no claim, no history) refused with slice-id-orphan error.
    - Active claim with matching slice field passes check.
    - Prior commit in history passes check with INFO log.
    - Merge and Revert commit shapes bypass coverage check.
    - Dual-key override (COA_OPERATOR=1 + COMMIT_MSG_ALLOW_ORPHAN_SLICE=1) passes even orphan.
    - Single-key override refused.
    - Multiple IDs in subject — first ID verified, second is cross-reference.
    - Self-proof: own commit (TPL-281) passed via active claim clm-b4c259.
    - Negative self-proof: TPL-99999 refused with exit 1.
```

## Agent-context briefer epic (TPL-288)

Epic: TPL-288 — see `docs/backlog/agent-context-briefer.md` for the canonical trace blocks and execution state. Technical/tooling work adding `scripts/agent-context.mjs` (slice-aware, token-budgeted context brief CLI) and extracting `scripts/lib/module-work-surface.mjs` from `module-fit-check.mjs`; sub-slices TPL-289 through TPL-295.
