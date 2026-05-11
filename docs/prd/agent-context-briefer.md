<!-- @HEADER
@version 0.7.98 | 2026-05-05
@purpose Define the requirement intent for the slice-aware agent-context briefer — a token-budgeted CLI that produces harness-agnostic context briefs for any LLM agent.
@sidecar agent-context-briefer.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Agent-context briefer

## Requirement intent

Local-tier agents (7B–14B models via Aider, Cline, Continue) and even mid-tier agents (smaller Sonnet tabs) have a bounded context window. A 16K-context local model loses most of its productive budget to discovery work: grepping the repository to find the relevant module, reading whole source files to extract a relevant section, walking directory trees to identify what to skip. The static `LOCAL.md` (~1.4K tokens) gives universal process rules and is designed to remain slim, but it is slice-agnostic. It tells the agent *how* to work, not *which files to read* for a specific slice.

The agent-context briefer — `scripts/agent-context.mjs` — closes this gap. Given a slice ID or an explicit file list, it emits a single token-budgeted markdown document that:

1. Selects the relevant SYSTEM_MAP category fragment for the touched modules (Tier 1).
2. Includes module manifests and public-API surfaces for those modules (Tier 2).
3. Includes `.header.md` sidecars for the bounded neighborhood around the touched files (Tier 3).
4. Includes full source only for the files the agent will actually change (Tier 4).

The brief is deterministic, reproducible, and tunable by token budget. Any harness that can run a shell command (Aider, Cline, Continue.dev, Codex, custom scripts) can use it.

## Classification

Technical / developer-facing tooling. No USM required. The briefer extends the existing multi-tier agent-universality infrastructure (TPL-208..215, `compatibility-contract.json`, ADR-0013) rather than introducing new user-facing workflows.

## Non-goals

- This is not an MCP server. It is a CLI invoked once at slice-start, not a persistent tool-call endpoint.
- It does not replace `LOCAL.md` or `AGENTS.md`. Those files provide process rules; the briefer provides scope-scoped content.
- It does not replace `MICRO.md` for deterministic-helper agents.
- It is not a harness. It does not invoke the agent, manage the conversation, or submit commits.
- It does not crawl the entire repository. It reads only the tiers relevant to the active slice.
- It does not produce JSON by default. Markdown is the first-class output format (consistent with `LOCAL.md`, `AGENTS.md`, `SYSTEM_MAP.md`). Optional `--format=json` is a low-priority polish item (TPL-295).

## Scope

### Inputs

The briefer accepts the following flags:

| Flag | Description | Default |
|---|---|---|
| `--slice=<id>` | Backlog slice ID (e.g. `TPL-289`). Used to resolve `--files` from backlog targets if `--files` is omitted. | — |
| `--files=<paths>` | Comma-separated list of repository-relative file paths that the agent will touch. | — |
| `--budget=<tokens>` | Hard token ceiling for the brief (measured as `bytes ÷ 4`). Overrides profile default. | (profile default) |
| `--profile=<name>` | Agent capability profile. Resolves default budget. Values: `small`, `mid`, `frontier`. | `mid` |
| `--neighborhood-radius=<size>` | Sidecar neighborhood radius. Values: `small`, `medium`, `large`. | `medium` |
| `--out=<path\|->` | Output path. `-` means stdout. | stdout |

At least one of `--slice` or `--files` must be provided.

### Outputs

A single markdown document with these stable section headings (in order):

1. `# Slice context` — slice ID, files list, profile, and budget resolved.
2. `## How to read this brief` — one-paragraph preamble: "read top to bottom; deep-read only Touched files; sidecars give intent without source."
3. `## Architectural map` — SYSTEM_MAP fragment for relevant domain categories (Tier 1).
4. `## Module manifests` — manifest.json + public-api surface for each touched module (Tier 2).
5. `## Sidecar neighborhood` — `.header.md` sidecars for bounded neighborhood (Tier 3).
6. `## Touched files (full source)` — full source of each `--files` entry (Tier 4).
7. `## Suggested next actions` — short checklist derived from process rules in `LOCAL.md`.
8. `## Token budget` — per-tier token consumption and headroom remaining.

### Token budget contract

Token budget defaults are profile-aware. Explicit `--budget=N` always overrides:

| Invocation | Resolved profile | Resolved budget |
|---|---|---|
| (no flags) | `mid` | `16000` |
| `--profile=small` | `small` | `12000` |
| `--profile=mid` | `mid` | `16000` |
| `--profile=frontier` | `frontier` | `64000` |
| `--profile=X --budget=N` | `X` | `N` (explicit override) |

Source: `docs/analysis/byollm-delivery-plan.md` Entry 2.3.

The 16K bare default matches the `LOCAL.md` "small-tier floor" documented in `docs/agent-contract/compatibility-contract.json`. Budget is measured consistently as `bytes ÷ 4` (the same heuristic used by SYSTEM_MAP and ADR-0013).

When the resolved content exceeds the budget, tiers are dropped in reverse priority order:

1. Drop sidecar neighborhood first (Tier 3, highest cost, most skippable).
2. Drop lower-priority module manifests next (Tier 2 partial).
3. Never drop Tier-4 touched-file source — the agent must see what it is changing.
4. Never drop Tier-1 SYSTEM_MAP fragment — architectural context is non-negotiable.

A `[truncated]` marker is emitted at the drop point.

## Integration points

- **`LOCAL.md`** — process rules that the brief's `## Suggested next actions` section references. Updated in TPL-294 (Slice 1.5) to recommend `node scripts/agent-context.mjs --slice=$SLICE_ID` as the first command an agent runs.
- **`AGENTS.md`** — similarly updated in TPL-294 via `compatibility-contract.json` sync.
- **`MICRO.md`** — not updated; deterministic-helper agents do not need slice-scoped briefs.
- **`module-fit-check.mjs`** — shares the work-surface computation library extracted in TPL-291 (Slice 1.3a). Both tools consume `scripts/lib/module-work-surface.mjs` for consistent bounded-radius definitions.
- **`scripts/lib/module-work-surface.mjs`** — new shared library (TPL-291). Single source of truth for "which files are in the bounded neighborhood of a module."
- **`docs/agent-contract/compatibility-contract.json`** — updated in TPL-294 to wire the briefer recommendation into the generated `LOCAL.md`/`AGENTS.md` outputs.

## Acceptance for the epic (TPL-288)

The epic is accepted when:

- The briefer CLI exists at `scripts/agent-context.mjs` and is invocable via `node scripts/agent-context.mjs`.
- All four tiers (SYSTEM_MAP fragment, module manifests, sidecar neighborhood, touched-file source) are present in a brief over a real slice.
- Token budget is enforced with tier-drop semantics described above.
- Stable section headings are present in every brief output.
- `LOCAL.md` and `AGENTS.md` recommend the briefer as the first command.
- The shared `module-work-surface.mjs` library is consumed by both the briefer and `module-fit-check.mjs`.
- At least one local-tier agent (per Slice 2 / D6 validation experiment) completes a bounded slice end-to-end using the brief as first input, validating that the briefer reduces discovery overhead in practice.

```trace-yaml
work_item:
  id: TPL-288
  type: meta
  title: Agent-context briefer for harness-agnostic delivery
  parent_ref:
  status: done
  module_ref: tooling
  spec_refs:
    - docs/prd/agent-context-briefer.md
    - docs/prd/index.md
  test_refs:
  bdd_refs:
  acceptance:
    - Briefer CLI exists at scripts/agent-context.mjs with --slice, --files, --budget, --profile, --neighborhood-radius, --out flags.
    - All four tiers emitted in stable section-heading order.
    - Token budget enforcement drops tiers in reverse priority; never drops Tier-4 source.
    - LOCAL.md and AGENTS.md recommend the briefer as the first command an agent runs.
    - Shared scripts/lib/module-work-surface.mjs consumed by both briefer and module-fit-check.mjs.
    - At least one local-tier D6 validation run completes a bounded slice end-to-end using the brief as first input.
```
