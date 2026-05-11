---
fileId: contextrail-template:scripts:checks:module-fit-check
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/module-fit-check.mjs [--json] [--warn-only] [--report] [--warn=N] [--error=N]; named exports approximateTokenCount(text), pickRepresentativeImpl(moduleDirAbs), pickRepresentativeTest(moduleName, testDirsAbs), measureWorkSurface(moduleName, opts), computeDistribution(totals), discoverModuleNames(rootAbs), DEFAULT_WARN_TOKENS, DEFAULT_ERROR_TOKENS"
dependsOn:
  - modules
  - tests/unit
  - tests/contract
summary: Measure each hex module's "work surface" token cost (manifest + public-api + sidecars + one representative impl + one representative test) and flag modules over the local-LLM 16K-context budget thresholds defined in ADR-0013.
owns: Deterministic per-module token-budget measurement, distribution statistics (min/p50/p75/p95/max/mean), and warn-only reporting against the data-driven 8K/12K thresholds. Exposes pure helpers so unit tests do not need a temporary repo.
boundaries: Read-only filesystem walk. Does not edit modules, does not enforce hard fails by default (warn-only is the wired pre-commit mode), does not pull in a real tokenizer dependency, does not own the cleanup of oversized modules — that is a separate follow-up TPL.
invariants: Token approximation is always Math.ceil(bytes/4) for cheapness and consistency with docs/SYSTEM_MAP.md. File picks are deterministic (largest-by-lines in domain/, then adapters/; sorted prefix match for tests). Missing files contribute 0 tokens and never throw. Default thresholds (8K warn, 12K error) sit inside the 16K local-LLM context floor — DEFAULT_ERROR_TOKENS must remain ≤ 16384 minus harness overhead.
risks: Heuristic token approximation can drift from real tokenizer output for unusual content (very long lines, dense unicode); good enough for relative budgeting but not exact cost. If thresholds get bumped without re-measuring the distribution, the gate loses its empirical anchor.
securityPrivacy: Reads local repository files only.
notesForLLM: This script is the architectural keystone of the multi-tier-agent-universality plan (v0.7.17). The pure helpers must stay exported and pure — they are the unit-test surface. main() is guarded behind a direct-run check so importers do not trigger CLI argv parsing or process.exit. The --report flag writes docs/_generated/module-fit-report.json which is opt-in and not tracked under integrity-manifest. When the cleanup TPL lands (currently 6 modules over warn at v0.7.17), promote pre-commit Phase 6 from `--warn-only` to enforcing mode.
tests:
  - tests/unit/module-fit-check.test.mjs
  - Used directly in pre-commit Phase 6 (warn-only)
linkedDocs:
  - docs/adr/0013-module-work-surface-budget.md
  - docs/prd/module-work-surface-budget.md
  - docs/backlog/inter-agent-coordination.md
specRefs: TPL-210
related:
  - .githooks/pre-commit
  - docs/adr/0006-context-optimized-architecture.md
  - docs/adr/0007-tiered-file-size-limits.md
  - docs/adr/0009-sidecar-first-headers.md
---

# module-fit-check.mjs
