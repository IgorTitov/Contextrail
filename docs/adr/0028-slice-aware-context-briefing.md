<!-- @HEADER
@version 0.7.98 | 2026-05-05
@purpose ADR-0028: slice-aware context briefing for harness-agnostic LLM delivery — introduces scripts/agent-context.mjs with four-tier token-budgeted output and a shared module-work-surface library.
@sidecar 0028-slice-aware-context-briefing.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0028 — Slice-aware context briefing for harness-agnostic delivery

**Status:** Accepted
**Date:** 2026-05-05
**Slice:** TPL-288
**Supersedes:** n/a
**Related:** ADR-0013 (agent universality), ADR-0009 (sidecar-first headers), ADR-0016 (worktree lifecycle)

---

## Problem

Local-tier agents (7B–14B models running via Aider, Cline, or Continue.dev) have a bounded context window — typically 8K–32K tokens. Most of that budget is consumed by repository discovery: grepping for relevant files, reading whole source files to extract a short section, and walking directory trees to identify what to skip.

The static `LOCAL.md` (~1.4K tokens) provides universal process rules but is slice-agnostic. It tells an agent *how* to work, not *which files to read* for a specific slice. Every agent session re-discovers the same slice-relevant files from scratch, wasting a large portion of the effective context window before any implementation begins.

The same problem applies to mid-tier agents (smaller Sonnet tabs) that start a fresh conversation without prior slice context.

---

## Decision

Introduce `scripts/agent-context.mjs` — a CLI tool that accepts a slice ID or explicit file list and emits a single token-budgeted markdown document (a "context brief") containing exactly the information an agent needs for that slice.

### Four-tier content model

Content is assembled in priority order and subject to a token budget ceiling:

| Tier | Content | Drop policy |
|------|---------|-------------|
| T1 | SYSTEM_MAP category fragment for touched modules | **Never dropped** — architectural context is non-negotiable |
| T2 | Module manifest + public-api surface for each touched module | Partially droppable (lowest-priority modules dropped first) |
| T3 | `.header.md` sidecars for bounded neighborhood around touched files | **Dropped first** — highest cost, most skippable |
| T4 | Full source of each `--files` entry | **Never dropped** — agent must see what it is changing |

When budget is exceeded, T3 is dropped first, then T2 partial. T1 and T4 are always emitted regardless of budget.

### Token budget profiles

Budget defaults are profile-aware. `--budget=N` always overrides:

| Invocation | Resolved profile | Resolved budget |
|---|---|---|
| (no flags) | `mid` | `16000` |
| `--profile=small` | `small` | `12000` |
| `--profile=mid` | `mid` | `16000` |
| `--profile=frontier` | `frontier` | `64000` |
| `--profile=X --budget=N` | `X` | `N` (explicit override) |

Token budget is measured as `bytes ÷ 4` — the same heuristic used by SYSTEM_MAP and ADR-0013.

### Stable output sections (in order)

1. `# Slice context` — slice ID, resolved files, profile, budget
2. `## How to read this brief` — usage preamble
3. `## Architectural map` — T1 SYSTEM_MAP fragment
4. `## Module manifests` — T2 manifests + public-api surfaces
5. `## Sidecar neighborhood` — T3 sidecar sidecars
6. `## Touched files (full source)` — T4 full source
7. `## Suggested next actions` — checklist from `LOCAL.md` process rules
8. `## Token budget` — per-tier counts and headroom

---

## Rationale

### Why a CLI, not an MCP server?

A CLI is invoked once at slice-start, produces a static document, and terminates. An MCP server is a persistent tool-call endpoint that must respond to arbitrary mid-session queries. The problem being solved (discovery overhead at slice-start) does not require persistent state. A CLI is simpler, deterministic, composable, and works with every harness that can run a shell command.

### Why markdown output, not JSON?

`LOCAL.md`, `AGENTS.md`, and `SYSTEM_MAP.md` are all markdown. An agent that can read those files can read the brief with zero format overhead. JSON would require the harness to parse and re-render the brief before presenting it to the agent. Markdown is the correct first-class output; `--format=json` is deferred as a low-priority polish item (TPL-295).

### Why a shared `scripts/lib/module-work-surface.mjs` library?

`module-fit-check.mjs` already computes bounded neighborhoods around modules for the module-fit report. Extracting this computation into `scripts/lib/module-work-surface.mjs` (TPL-291) achieves two goals:

1. The briefer's Tier-3 neighborhood computation uses the same radius definitions as the fit-report, so "neighborhood" means the same thing in both tools.
2. Behavior-preserving refactor: all existing `module-fit-check` tests continue to pass; only the import source changes.

---

## Consequences

- **Reduced discovery overhead.** Local-tier agents start each slice with a ready-made context brief rather than discovering the codebase from scratch.
- **Harness-agnostic.** Any tool that can invoke a shell command (Aider, Cline, Continue.dev, Codex, custom scripts) can produce the brief.
- **Deterministic.** Given the same inputs, the brief is reproducible.
- **`LOCAL.md` / `AGENTS.md` updated.** TPL-294 wires `node scripts/agent-context.mjs --slice=$SLICE_ID` as the recommended first command in the shared compatibility contract.
- **New shared library.** `scripts/lib/module-work-surface.mjs` becomes a dependency of both the briefer and `module-fit-check.mjs`. Changes to neighborhood radius definitions affect both tools.
