<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Record the accepted architectural decision to optimize code structure, metadata, and documentation for AI agents with limited context windows (4K-8K tokens).
@sidecar 0006-context-optimized-architecture.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR 0006 — Context-Optimized Architecture (COA)

## Status

Accepted

## Context

Traditional software development assumes that the developer holds a mental model of the entire system. Large cloud-hosted LLMs approximate this through enormous context windows (100K+ tokens). But this creates a dependency on expensive infrastructure and limits AI-assisted development to teams with cloud API budgets.

Consumer-grade GPUs (up to 24 GB VRAM) can run 7B-13B parameter models with 4K-8K token context windows. These models have sufficient reasoning ability for bounded code tasks — but only if the architecture is designed so that any atomic task fits within that budget **together with enough system understanding** to execute it correctly.

The question: can we design code architecture and documentation so that **metadata replaces source code** as the primary navigation tool for AI agents?

## Decision

Adopt **Context-Optimized Architecture (COA)**: structure code, metadata, and documentation so that any atomic development task can be completed by an agent with a 4K-8K token context window.

### Three pillars

| Pillar | Principle | Mechanism |
|--------|-----------|-----------|
| **Metadata over source** | Agents read metadata, not implementation code of neighboring modules | Structured headers, manifest.json, public-api.mjs, module READMEs |
| **Boundaries = context walls** | Hex module boundary = context boundary. Everything outside the module is accessed through metadata only | Hex architecture, public-api.mjs barrel exports, forbidden deep imports |
| **Atomic tasks = session scope** | One agent session handles one bounded slice, then ends. Session starts clean. | Atomic slices, one-slice-one-commit discipline, agent routing |

### Tiered documentation model

Agents load documentation in tiers, stopping at the level that provides sufficient context:

| Tier | Content | Tokens | When to load |
|------|---------|--------|-------------|
| **Tier 1** | `docs/SYSTEM_MAP.md` — category-grouped module index, dependency graph, navigation pointers | ~1900 (~950 focused) | Always first. Every agent session begins here. |
| **Tier 2** | Module `manifest.json` (incl. capabilities) + `public-api.mjs` header + `README.md` | ~1800 | For the target module only. Sufficient for most implementation tasks. |
| **Tier 3** | `docs/module-catalog.md` section for the target module | ~400 | Only when full API reference is needed. Rarely required. |

All figures measured by `bytes ÷ 4` on raw file content. The F3 capability surface promotion (TPL-178) moved ~565 tokens of port typedefs into `manifest.json`, trading a larger Tier 2 for the ability to answer capability questions without deep-reading port files.

### Context budget for a 6K window (tight minimum)

```
System prompt + rules        ~400 tokens   ██░░░░░░░░░░░░░░░░░░
Tier 1 (SYSTEM_MAP, focused)  ~950 tokens   ████░░░░░░░░░░░░░░░░
Tier 2 (module metadata)    ~1300 tokens   ████████░░░░░░░░░░░░
File being edited           ~1500 tokens   ████████████░░░░░░░░
Reasoning + output          ~1850 tokens   ████████████████████
                            ─────────────
Total                       ~6000 tokens
```

8K is the recommended comfortable minimum after the F3 expansion; 4K is no longer a realistic target.

### Context loading protocol

Each agent definition includes a **Context Loading Protocol** section specifying:
1. Which files to load, in what order
2. Expected token cost per step
3. When to stop loading (budget checkpoint)

This eliminates guesswork and prevents agents from wasting context on irrelevant files.

### Metadata density requirements

Every navigable file must carry enough metadata for an agent to understand its role without reading its implementation:

- **`Summary` field** in FILEINFO header — one-line compact description (~30 tokens). Agents can skim 10 file summaries for ~300 tokens.
- **`manifest.json`** per module — dependencies, dependents, internal structure (domain/ports/adapters file counts). ~100 tokens.
- **`public-api.mjs` header** — complete export list, allowed/forbidden dependencies, NotesForLLM. ~200 tokens.
- **`README.md`** per module — purpose, components, key design decisions, code example. ~500 tokens.
- **`docs/_generated/dependency-graph.json`** — generated from manifests and import scans, contains forward/reverse deps, consumer edges, topological layers, safe removal order. ~800 tokens for full graph.

## Consequences

### Positive

- **Democratizes AI-assisted development** — consumer GPUs become sufficient for structured development
- **Forces good architecture** — the constraint that "every task must fit in 4K tokens" naturally produces small, bounded, well-documented modules
- **Reduces cloud API costs** — local models handle routine implementation; cloud models reserved for complex planning
- **Improves human readability** — metadata-rich code is also easier for human developers to navigate
- **Enables parallel agent workflows** — independent agents can work on different modules simultaneously without context conflicts

### Negative

- **Metadata maintenance overhead** — every file needs a header, every module needs a README, manifests must stay current
- **Header verbosity** — ~~~50-90 lines of metadata per file increases file size~~ resolved by ADR 0009 (sidecar-first headers: 7-line slim inline + sparse sidecar)
- **Script dependency** — header-fix, header-check, dependency-graph scripts must be run regularly
- **Learning curve** — contributors must understand the tiered model and maintain metadata quality

### Mitigations

- Automated scripts (`header-fix.mjs`, `header-check.mjs`, `dependency-graph.mjs`) reduce manual maintenance
- Pre-commit hooks enforce metadata quality automatically
- Agent routing and context loading protocols are embedded in agent definitions, not external documentation

## References

- ADR 0003 — Architecture metadata for AI cockpit (predecessor: hex metadata for visualization)
- ADR 0005 — JS + JSDoc over TypeScript (aligned: zero-build-step philosophy)
- `docs/SYSTEM_MAP.md` — the Tier 1 entry point
- `docs/_generated/dependency-graph.json` — generated dependency graph
- `.claude/agents/*.md` — context loading protocols per agent
