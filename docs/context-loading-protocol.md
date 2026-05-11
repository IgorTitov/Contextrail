<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Informational reference for orchestrator authors and framework integrators — how to decide which files to load, in what order, and at what token cost, given an agent's effective context window.
@sidecar context-loading-protocol.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit rewrite-ok -->

# Context Loading Protocol

The Context Loading Protocol (CLP) is an informational reference for deciding which repository files to load into an agent's context, in what order, and at what measured token cost. It is keyed to the agent's effective context window.

**What this document is:** an operational guide for orchestrator authors (AutoGen, CrewAI, LangGraph), framework integrators, and anyone building multi-agent tooling on a COA repository.

**What this document is not:** a mandatory gate, a CI check, or a configuration file. Agents with 16K+ effective context can navigate the repository adaptively using the tiered documentation model without following this protocol step-by-step. The protocol exists so that orchestrators have a shared vocabulary for context-aware task routing.

**Decision rationale:** [ADR 0006 — Context-Optimized Architecture](adr/0006-context-optimized-architecture.md)
**Operational entry point:** [docs/SYSTEM_MAP.md](SYSTEM_MAP.md)
**Measured token budgets:** [Whitepaper §6.4](whitepaper.md)

---

## 1. Agent Capability Declaration

An orchestrator routing tasks to agents benefits from knowing each agent's effective context budget. The following declaration format is **proposed** — COA does not yet require agents to declare capabilities. The format is here so orchestrators have a shared vocabulary.

```json
{
  "agent": "feature-implementer",
  "model": "qwen2.5-14b-q4",
  "contextWindow": 32768,
  "effectiveQualityRange": 16384,
  "kvCacheAvailable": true,
  "canExtendContext": false,
  "loadingStrategy": "tiered-16k"
}
```

| Field | Meaning |
|-------|---------|
| `agent` | Agent role name |
| `model` | Model identifier |
| `contextWindow` | Raw context window in tokens |
| `effectiveQualityRange` | The range where attention quality stays within tolerable bounds — this is what matters for routing, not the raw window |
| `kvCacheAvailable` | Whether the inference runtime supports KV-cache persistence across turns |
| `canExtendContext` | Whether the agent can use RAG or external memory to extend effective context |
| `loadingStrategy` | One of the four preset strategies below |

The distinction between `contextWindow` and `effectiveQualityRange` is critical. A model claiming 128K native context may degrade significantly after 16K–32K. The effective quality range — not the raw number — determines which loading strategy to use.

---

## 2. Loading Strategies

Four preset strategies are keyed to the agent's effective context:

| Strategy | Effective range | Tier 1 load | Tier 2 load | Multi-module | Capabilities compact view |
| -------- | --------------- | ----------- | ----------- | ----------- | ------------------------ |
| `minimal-8k` | 6K–8K | Focused (~950 tok) | Small modules only; capabilities compact for mid/large | No | Recommended |
| `tiered-16k` | 12K–16K | Focused (~950 tok) | Full manifest for any single module | 2-module pairs OK | Optional |
| `comfortable-32k` | 24K–32K | Full (~2010 tok) | Full manifest, multiple modules | Up to 3 modules | Not needed |
| `unlimited` | 64K+ | Full | Everything needed | Any span | Not needed |

**`minimal-8k`** — the agent loads SYSTEM_MAP in focused mode (category index + one category section), then loads only small module manifests in full. For mid-to-large modules, the agent should use the capabilities compact view (~600 tok for auth instead of ~2725 tok full). Multi-module work is not feasible at this budget; the orchestrator should split cross-module tasks into sequential single-module slices.

**`tiered-16k`** — the general-purpose strategy. Full manifest for any single module fits comfortably. Two-module pairs fit when at least one module is small-to-mid. This is the recommended comfortable minimum for general module work.

**`comfortable-32k`** — ample room for full SYSTEM_MAP, multiple module manifests, and runtime discovery. Three-module atomic commits are feasible for small modules.

**`unlimited`** — cloud-hosted models (Claude, GPT-4) with 64K+ effective context. The tiered model is still valuable for efficiency — loading 38 manifests (~60K tok) would be wasteful even with ample context — but budget pressure is not a concern.

---

## 3. Tiered Loading Model

Agents load repository documentation in tiers, stopping at the tier that provides sufficient context for the task. All token costs are measured by `bytes / 4` against the v0.6.0 tree at HEAD.

### Tier 0: System prompt and rules

| Agent type | Cost | Content |
|------------|------|---------|
| Claude Code | ~8,515 tok | `.claude/CLAUDE.md` + `.claude/rules/*.md` (auto-loaded) |
| External agent | ~400 tok | Custom system prompt with COA navigation instructions |

### Tier 1: SYSTEM_MAP.md

| Mode | Cost | Content |
|------|------|---------|
| Full | ~2,010 tok | Category index + all 9 category detail sections + dependency graph + entry points |
| Focused (Tier 1.5) | ~950 tok | Category index + one target category section + dependency graph + entry points |

**Navigation pattern:** scan the Category Index to find the target domain, then read only that category detail section. This saves ~430 tokens vs. full load and is recommended for agents at 8K–16K.

### Tier 2: Target module

Load `manifest.json` + `public-api.mjs` + `README.md` for the target module only.

| Module size | Example | Tier 2 cost |
|-------------|---------|-------------|
| Small | form-validation | ~850 tok |
| Mid | auth (full manifest) | ~2,725 tok |
| Large | retrieval | ~4,300 tok |

For mid-to-large modules at `minimal-8k`, the capabilities compact view (`manifest.json#capabilities` alone, ~600 tok compact) can substitute for the full manifest.

### Tier 3: Module catalog

**File:** `docs/module-catalog.md` (specific section, ~400 tok per module)

Full API reference with function signatures, parameters, return types, and usage examples. Load only when Tier 2 is insufficient — typically for unfamiliar API details not visible from the public-api header.

### Token cost note

These figures are from v0.6.0 measurements and will drift as modules evolve. The `bytes / 4` heuristic is pessimistic for code (code tokens are shorter on average) but consistent across files.

---

## 4. Measured Budget Scenarios

From [Whitepaper §6.4](whitepaper.md):

```
                            small             mid               large            multi-module
                            (form-validation) (auth, full)      (retrieval)      (auth + permission)
System prompt + rules            ~400 tok         ~400 tok          ~400 tok          ~400 tok
Tier 1 (SYSTEM_MAP, focused)     ~950 tok         ~950 tok          ~950 tok          ~950 tok
Tier 2 (manifest path)           ~850 tok        ~2725 tok         ~4300 tok         ~4525 tok (2 modules)
File(s) being edited            ~1500 tok        ~1500 tok         ~1500 tok         ~2400 tok
Reasoning + output              ~1100 tok        ~1100 tok         ~1100 tok         ~1500 tok
                                ─────────        ─────────         ─────────         ──────────
Total                           ~4800 tok        ~6675 tok         ~8250 tok         ~9775 tok
Minimum window                   8K               8K                16K               16K
```

**Budget rule:** if loading context for a task exceeds 50% of the available window, the task is too large. Options: shrink the slice, carve a seam, or promote metadata to reduce source reading.

---

## 5. Orchestrator Integration Patterns

These patterns show how an orchestrator can use the capability declaration and loading strategies to route tasks.

### Pattern 1: Single-agent, single-module task

The most common case. One agent works on one module using standard tiered loading.

```
Task: "Add email normalization to form-validation module"

Agent: feature-implementer (effectiveQualityRange: 16384, loadingStrategy: tiered-16k)

Loading sequence:
  1. Tier 1.5 — SYSTEM_MAP focused on "Validation & formatting" category    ~950 tok
  2. Tier 2   — modules/form-validation/manifest.json + public-api.mjs      ~850 tok
  3. Target   — modules/form-validation/domain/validators.mjs              ~800 tok
  4. Reasoning + output                                                    ~1100 tok
                                                                           ──────
  Total                                                                    ~4100 tok
  Remaining at 16K                                                         ~11,900 tok
```

### Pattern 2: Cross-module task at 16K+

An agent with 16K+ effective context can hold two modules simultaneously. The auth + permission route-guard example:

```
Task: "Add role-based route guards spanning auth and permission modules"

Agent: feature-implementer (effectiveQualityRange: 16384, loadingStrategy: tiered-16k)

Loading sequence:
  1. Tier 1.5 — SYSTEM_MAP focused on "Identity & access" category         ~950 tok
  2. Tier 2   — modules/auth/manifest.json + public-api.mjs               ~2725 tok
  3. Tier 2   — modules/permission/manifest.json + public-api.mjs         ~1800 tok
  4. Targets  — two edit files                                            ~2400 tok
  5. Reasoning + output                                                   ~1500 tok
                                                                          ──────
  Total                                                                   ~9375 tok
  Remaining at 16K                                                        ~6625 tok

Workflow:
  - Acquire claims on both modules via --acquire before editing
  - Single atomic commit: feat(auth,permission): add role-based route guards
  - Complete claims via --auto-complete --staged
```

### Pattern 3: Cross-module task at <16K

When the available agent cannot hold two modules, the orchestrator splits the task into sequential single-module slices with `dependsOn` ordering.

```
Task: "Add role-based route guards spanning auth and permission modules"

Available agent: effectiveQualityRange: 8192, loadingStrategy: minimal-8k

Orchestrator splits:
  Slice A: "Add hasRoutePermission to permission module"
    → Assign to Agent 1 (single-module, fits 8K)
    → Atomic commit

  Slice B: "Add createRouteGuard to auth module (consumes permission.hasRoutePermission)"
    → dependsOn: Slice A
    → Assign to Agent 2 after Slice A completes
    → Atomic commit

Two commits instead of one, but each agent works within its budget.
The dependsOn ordering ensures Slice B can reference the export from Slice A.
```

---

## 6. Extended Context Considerations

### Retrieval-Augmented Generation (RAG)

COA's tiered model maps naturally to a retrieval index:

| Retrieval tier | COA artifact | Granularity |
|----------------|-------------|-------------|
| Top (always in context) | SYSTEM_MAP.md | Repository-level |
| Mid (retrieved on demand) | Module manifests, public-api headers | Module-level |
| Leaf (retrieved for edits) | Source files, test files | File-level |

An agent backed by RAG can operate with a smaller in-context budget — SYSTEM_MAP stays in context, and module metadata is retrieved as needed. The manifests and headers are ideal RAG chunks: structured, bounded, and self-describing.

### KV-cache offloading

Inference frameworks like vLLM can offload KV cache to CPU RAM, effectively extending context at the cost of increased latency. For COA, this means an agent with a small GPU-resident context can still process longer sessions — but the effective quality range may not improve. Use `effectiveQualityRange` (not `contextWindow`) when choosing a loading strategy.

### Sliding window attention

Some models (Mistral family) use a small sliding window (e.g., 4K) but process longer sequences via rolling attention. The effective quality range for such models may be much smaller than the nominal context window. Tier 1 content (SYSTEM_MAP) should be placed early in the prompt so it falls within the highest-attention region.

---

## 7. Relationship to Other Documents

| Document | Relationship |
|----------|-------------|
| [Whitepaper §6](whitepaper.md) | Theoretical framework, measured token budgets, and the four-budget table reproduced in §4 above |
| [SYSTEM_MAP.md](SYSTEM_MAP.md) | The actual Tier 1 entry point that every agent session loads first |
| [Module manifests](../modules/) (`manifest.json`) | The actual Tier 2 data — module metadata, capabilities, structure |
| [ADR 0006](adr/0006-context-optimized-architecture.md) | Decision rationale for the three pillars: metadata over source, boundaries as context walls, atomic tasks as session scope |
| [`.claude/CLAUDE.md`](../.claude/CLAUDE.md) | Claude-specific navigation instructions that implement this protocol implicitly |
| [Context Window Threshold Analysis](analysis/context-window-threshold-analysis-v0.5.2.md) | Source analysis for the dual-tier framing and loading strategy presets |
