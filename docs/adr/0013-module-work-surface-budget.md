<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Record the decision to budget each hex module's work-surface tokens against the 16K local-LLM context floor, with measured thresholds.
@sidecar 0013-module-work-surface-budget.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR 0013 — Module work-surface budget for mixed-team support

## Status

Accepted

## Context

Contextrail commits to supporting **mixed-tier agent teams** as a first-class workflow: frontier-cloud agents (Claude Opus, GPT-5) collaborating in the same repository with mid-tier agents (Sonnet, GPT-4o-mini) and **local-tier small models** (Qwen-2.5-Coder-7B, DeepSeek-Coder-6.7B, Llama-8B running in LM Studio / Ollama via Aider, Cline, Continue). The empirical floor for the local tier is a **16K-token context window**.

For a local-tier agent to participate at all — even on a narrow task like regenerating sidecars for one module or drafting a CHANGELOG line — it must be able to load that module's "work surface" into one context window after subtracting harness overhead and conversation buffer. If the work surface alone consumes more than the available budget, no amount of slim-prompt engineering recovers it: the agent simply cannot see what it is editing.

This ADR closes that constraint by defining a measurable **per-module work-surface budget** and the gate that surfaces violations.

Background and motivation are laid out in `docs/analysis/multi-tier-agent-universality-v0.7.17.md` (Section 4 "Constraints", Section 6 TPL-210). The decision below is the architectural outcome of that analysis.

### What counts as the "work surface"

For a given module, the work surface a local-tier agent must hold to make a meaningful change is approximately:

```
manifest.json
+ public-api.{mjs,d.ts}
+ .header.md sidecars of the two surface files
+ one representative implementation file (largest in domain/, fallback adapters/)
+ one representative test file (tests/unit/<module>* or tests/contract/<module>*)
```

This is what `scripts/checks/module-fit-check.mjs` measures. Token count is approximated as `Math.ceil(bytes / 4)` — the same convention used in `docs/SYSTEM_MAP.md` and proven sufficient for relative budget comparisons.

### Measured distribution at v0.7.17

The first full run across the 40 hex modules in `modules/` produced:

| Statistic | Tokens |
| --- | --- |
| count | 40 |
| min   | 1,823 (`example-greeter`) |
| p50   | 5,234 |
| p75   | 6,299 |
| p95   | 8,706 |
| max   | 11,205 (`realtime`) |
| mean  | 5,334 |

Six modules currently exceed an 8K work-surface budget: `realtime` (11,205), `retrieval` (9,741), `analytics` (8,706), `feature-seams` (8,644), `auth` (8,176), `cache` (8,042). In every case the dominant contributor is the **representative test file**, not the implementation — for example `realtime`'s representative test file alone is 7,861 tokens.

## Decision

Adopt a **two-threshold module work-surface budget** anchored to the 16K local-LLM context floor:

1. **Warn threshold: 8,000 tokens per module work surface.** Captures the natural ceiling of well-shaped modules in the current repository (75th percentile sits at 6,299; 95th percentile at 8,706). A module above this threshold cannot comfortably be edited by a 16K-context agent once harness overhead and conversation buffer are subtracted.

2. **Error threshold: 12,000 tokens per module work surface.** Reserved for a follow-up cleanup TPL. Currently no module exceeds this — leaving headroom so the cleanup work can land warning-clean before the gate is promoted to a hard fail. A module above 12K is genuinely incompatible with the 16K floor regardless of harness.

3. **Headroom budget for the 16K floor.** The arithmetic the thresholds defend:

   ```
   16,384 (local-LLM context floor)
    - 8,000 (max well-shaped module work surface)
    - 5,000 (system prompt + LOCAL.md adapter + conversation buffer)
   = ~3,384 tokens for live editing context — tight but workable.
   ```

   At 12K work surface, only ~−616 tokens remain — the module no longer fits.

4. **Measurement methodology is fixed by `scripts/checks/module-fit-check.mjs`.** Pure helpers `approximateTokenCount`, `pickRepresentativeImpl`, `pickRepresentativeTest`, `measureWorkSurface`, and `computeDistribution` are exported for direct test coverage and re-use. Token approximation is `Math.ceil(bytes / 4)`. The script does not pull in a real tokenizer — that would add a heavy dependency for a check that runs on every commit.

5. **Gate placement is pre-commit Phase 6, in `--warn-only` mode initially.** The existing `.githooks/pre-commit` Phase 6 `run_parallel` block carries the call. Warnings are emitted to stderr and the exit code is 0 even when modules exceed the threshold. Promotion to hard error is a deliberate later TPL — see Sequencing below.

6. **`pnpm modules:fit-report` writes a structured report.** `node scripts/checks/module-fit-check.mjs --report` writes `docs/_generated/module-fit-report.json`. The report file itself is opt-in (regenerated on demand) and is not a tracked artifact under the integrity manifest. Contributors can use it to track the distribution over time without repository churn.

### Cleanup strategy for modules over the warn threshold

Three patterns are acceptable for bringing an oversized module under the warn threshold:

- **Split**. Decompose a thick module into two smaller ones with their own public APIs (e.g. an `auth/` and an `auth-oauth/` if OAuth surface is large enough to warrant it). Splitting is appropriate when the existing module already mixes two distinguishable bounded contexts.
- **Trim representative test**. The data shows tests dominate the bloat. Splitting a single mega-test into smaller scenario-focused files (one per user flow, per the BDD modularity convention in `.claude/rules/testing.md`) reduces the *representative* test that a small agent loads to understand the module, without losing coverage.
- **Adapter extraction**. Move thick adapter logic into its own file or its own module if the adapter is a self-contained integration (e.g. a third-party SDK wrapper). The existing `0007-tiered-file-size-limits.md` permits adapters up to 400 lines, but a 400-line adapter inside an already-large module compounds the work-surface problem.

A waiver process is intentionally **not** introduced. If a module genuinely cannot fit the 16K budget, the right answer is decomposition — not exempting it from the gate. Local-tier agents do not have a "waive me" capability.

### Sequencing — warn now, error later

The error threshold (12K) is wired into `module-fit-check.mjs` from day one so the script reports both bands, but `--warn-only` mode in the pre-commit hook keeps it advisory until a follow-up cleanup TPL has reduced the six over-warn modules. The promotion sequence:

1. **TPL-210 (this ADR + script + warning gate)** — measurement and surfacing only. No hard fail.
2. **Follow-up cleanup TPL** — split, trim, or extract the six over-warn modules until p95 sits at or below 8K.
3. **Promotion TPL** — flip the pre-commit invocation from `--warn-only` to enforcing mode (drop the flag), and remove the now-unused warn-only branch only if no other consumer relies on it.

This sequence lets the architectural commitment (16K floor support) land without blocking unrelated commits on pre-existing module shape.

## Consequences

### Positive

- The 16K-context support claim becomes empirically defended by a deterministic gate, not aspirational marketing copy.
- Module-shape pressure during normal slice work nudges contributors away from accidental bloat. A new module that lands at 7K is a clear signal to the next contributor.
- The data-driven thresholds (p75 + buffer for warn, headroom-arithmetic for error) are defensible and auditable. Future re-measurement can confirm the thresholds remain right as modules evolve.
- Surfaces an unexpected finding from the first run: oversized modules are oversized because of their **test files**, not their implementations. This redirects cleanup effort to the right layer.
- `module-fit-report.json` provides a longitudinal data surface for tracking progress over releases without polluting the diff with regenerated artifacts.

### Negative

- Six existing modules will emit warnings on every pre-commit until the cleanup TPL lands. This is the intended pressure but it is real noise in the meantime.
- The token approximation (`bytes / 4`) is a heuristic. Modules with unusually long lines, heavy unicode, or very dense JSDoc may report differently from a real tokenizer. The bias is acceptable for a relative-budget gate but should not be treated as exact token cost.
- Adding `module-fit-check` to pre-commit Phase 6 is a small extra latency (one filesystem walk per commit). Empirically <100ms across 40 modules — within budget for a parallel-run validation phase.
- The warn/error thresholds are not promoted into the agent contract (`compatibility-contract.json`) yet. Once `agentProfiles.local-small.minContextTokens=16384` lands via the parallel TPL-208, future agents could read both numbers and validate consistency at sync time.

### Out of scope for this ADR

- **Per-tier thresholds.** A frontier-cloud agent (200K+ context) does not need the 16K constraint. This ADR sets one threshold tied to the tightest tier — local-small. Per-tier thresholds are a possible refinement but add ceremony without obvious benefit, since well-shaped-for-local is also well-shaped-for-frontier.
- **Real tokenizer dependency.** Pulling `@anthropic-ai/tokenizer` or similar would change the cost from "free" to "another commit-time dependency". Deferred unless heuristic drift causes false positives at scale.
- **Tracking the report under integrity-manifest.** `module-fit-report.json` is regenerated on demand; tracking it would force a regeneration step on every module change. The existing `dependency-graph.json` and `module-capabilities.json` are tracked because they are referenced by other tooling; this report is currently consumed only by humans inspecting drift.

## Related

- ADR-0006 — Context-optimized architecture (the parent rationale for shaping modules to fit small context windows)
- ADR-0007 — Tiered file-size soft limits (sibling decision; per-file limits inside modules)
- ADR-0009 — Sidecar-first headers (the structure that lets the work surface stay small)
- `docs/prd/module-work-surface-budget.md` — PRD for TPL-210
- `docs/backlog/inter-agent-coordination.md` — backlog entry for TPL-210
- `docs/analysis/multi-tier-agent-universality-v0.7.17.md` — the analysis that motivated this work
