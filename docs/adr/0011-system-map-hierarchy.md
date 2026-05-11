<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Record the decision to replace the flat module table in SYSTEM_MAP.md with a category-grouped hierarchical format that scales to 100+ modules.
@sidecar 0011-system-map-hierarchy.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR 0011 — System Map Hierarchical Scaling

## Status

Accepted

## Context

ADR-0006 established the tiered documentation model with `docs/SYSTEM_MAP.md` as the Tier 1 entry point — the first file every agent loads. At 38 modules the file uses ~1380 content tokens (measured `bytes ÷ 4`), which is already a significant share of a 6K–8K context window.

The current format is a **flat table** — one row per module, no grouping:

```
| Module | Purpose | Infra | Deps | Depd-by | Files |
| api-client | HTTP client abstraction | Fetch | — | auth, ai-chat | 4 |
| auth | Pluggable authentication | JWT/OAuth | api-client | — | 12 |
  ... 36 more rows ...
```

Two problems emerge:

1. **Token budget exhaustion.** At the current ~37 bytes per row, 76 modules would push the flat table past ~2800 content tokens — nearly half of a 6K window spent before the agent even loads its target module. The flat table scales linearly with no relief valve.

2. **Irrelevant scanning.** An agent working on `auth` must scan past `payments`, `seo`, `prerender`, `cqrs`, and 30+ other unrelated modules. The flat format offers no way to load only the relevant domain context.

## Decision

Replace the flat module table with a **category-grouped hierarchical format** that introduces two sub-tiers within Tier 1:

### Tier 1 — Category Index (always loaded)

A compact table of ~9 domain categories with module counts and key infrastructure notes. This is what every agent reads first:

```
| # | Category              | Modules | Key Infra           |
|---|-----------------------|---------|---------------------|
| 1 | Core Infrastructure   | 7       | JWT, OAuth, IDB     |
| 2 | AI & Retrieval        | 5       | WASM, HTTP, Memory  |
  ...
```

The category index, dependency graph, navigation tiers, and key entry points together form the **structural portion** of SYSTEM_MAP (~805 tokens at 38 modules). This portion stays under ~900 tokens even at 100+ modules (categories grow logarithmically — a new module joins an existing category, it doesn't create a new row).

### Tier 1.5 — Per-Category Detail (loaded on demand)

Each category has its own detail table with the same columns as the old flat table (Purpose, Infra, Deps, Depd-by, Files). Agents load only the category relevant to their task:

```
### Core Infrastructure (7 modules)
| Module | Purpose | Infra | Deps | Depd-by | Files |
| api-client | HTTP client abstraction | Fetch | — | auth, ai-chat | 4 |
  ...
```

Each category table adds ~80–180 tokens depending on module count. An agent working on `auth` loads the Core Infrastructure table (~150 tokens) and skips the other 8 categories.

### Scaling projection

| Modules | Flat table (old) | Full hierarchical | Structural portion | One category detail | Focused load |
|---------|-----------------|-------------------|--------------------|--------------------|-------------|
| 38      | ~1380 tok       | ~1900 tok         | ~805 tok           | ~130–170 tok       | ~950–975 tok |
| 76      | ~2800 tok       | ~3200 tok         | ~825 tok           | ~260–340 tok       | ~1100–1165 tok |
| 100     | ~3700 tok       | ~4100 tok         | ~840 tok           | ~340–450 tok       | ~1200–1290 tok |

"Focused load" = structural portion + one category detail. This is what a context-constrained agent loads (Tier 1.5). Agents with ample context load the full file. At 100 modules the focused load stays under ~1300 tokens — well within budget.

### Category taxonomy

Categories are grouped by **domain affinity**, not alphabetically:

1. **Core Infrastructure** — foundational services every app needs (auth, state, events, permissions, feature flags)
2. **AI & Retrieval** — AI chat, local inference, RAG, knowledge graphs, search
3. **Data & Storage** — database abstraction, caching, CQRS/event sourcing
4. **Communication** — realtime transport, notifications, email
5. **Background Processing** — workers, job queues, schedulers
6. **Observability** — logging, monitoring, analytics, rate limiting
7. **Web Platform** — SEO, pre-rendering, i18n, PWA, theming, onboarding
8. **API & Commerce** — GraphQL, OpenAPI, payments, multi-tenancy
9. **Utilities & DX** — form validation, file handling, teaching examples

New modules join the most fitting existing category. A new category is created only when 3+ modules share a domain that doesn't fit any existing group.

## Consequences

### Positive

- **Scales to 100+ modules** without exceeding the Tier 1 token budget
- **Reduces irrelevant context** — agents load only their domain category, not the full module list
- **Improves scanability** — domain grouping helps both agents and humans find related modules
- **Backward compatible** — all the same information is present, just reorganized

### Negative

- **Category maintenance** — new modules must be placed in the right category (low overhead: one row in one table)
- **Slightly larger file** — the category headers and index add ~200 tokens of structure overhead; total file is larger than the flat version, but the always-loaded portion is smaller
- **Reading convention** — agents must be told to load category index first, then only their relevant category section (documented in Navigation Tiers)

### Migration

- Single-step: replace the flat table with the hierarchical format in one commit
- Update token count references in CLAUDE.md, whitepaper, context-loading-protocol, ADR-0006, and agent definitions
- No API changes, no script changes, no module changes

## References

- ADR 0006 — Context-Optimized Architecture (established the tiered model)
- `docs/SYSTEM_MAP.md` — the file being restructured
- `docs/context-loading-protocol.md` — operational loading reference
