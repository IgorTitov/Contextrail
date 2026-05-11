<!-- @HEADER
@version 0.8.0 | 2026-05-08
@purpose Ultra-compact system entry point for AI agents with limited context windows. Load this FIRST.
@sidecar SYSTEM_MAP.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# System Map

40 hex modules (16 stable · 23 beta · 1 teaching example) · 5 first-class runtime modes · generated contract adapters · deterministic delivery gates

## Category Index

| # | Category | Modules | Key Infra |
|---|----------|---------|-----------|
| 1 | [Core Infrastructure](#core-infrastructure-7-modules) | 7 | JWT, OAuth, IDB, Memory |
| 2 | [AI & Retrieval](#ai--retrieval-5-modules) | 5 | WASM, HTTP, Memory |
| 3 | [Data & Storage](#data--storage-3-modules) | 3 | IDB, SQL, Memory |
| 4 | [Communication](#communication-3-modules) | 3 | WS, SSE, SMTP |
| 5 | [Background Processing](#background-processing-3-modules) | 3 | Worker, Timer |
| 6 | [Observability](#observability-4-modules) | 4 | Console, HTTP |
| 7 | [Web Platform](#web-platform-6-modules) | 6 | DOM, Intl, Pure |
| 8 | [API & Commerce](#api--commerce-6-modules) | 6 | Memory, Pure |
| 9 | [Utilities & DX](#utilities--dx-3-modules) | 3 | Blob, Pure |

---

### Core Infrastructure (7 modules)

| Module | Maturity | Purpose | Infra | Deps | Depd-by | Files |
|--------|----------|---------|-------|------|---------|-------|
| api-client | 🔶 | HTTP client abstraction | Fetch | — | auth, ai-chat | 4 |
| auth | ✅ | Pluggable authentication | JWT/OAuth | api-client | — | 12 |
| state | ✅ | Observable state store | Memory/IDB | user-preferences | — | 7 |
| user-preferences | 🔶 | User settings storage | IDB/LS | — | state | 7 |
| event-bus | ✅ | Typed pub/sub event system | Memory | — | — | 6 |
| permission | 🔶 | RBAC / granular permissions | Memory | auth (type) | — | 7 |
| feature-seams | 🔶 | Feature flags (Branch by Abstraction) | Memory | — | — | 7 |

### AI & Retrieval (5 modules)

| Module | Maturity | Purpose | Infra | Deps | Depd-by | Files |
|--------|----------|---------|-------|------|---------|-------|
| ai-chat | ✅ | Pluggable AI chat | HTTP | api-client | local-llm | 6 |
| local-llm | ✅ | In-browser LLM inference | WASM/Worker | ai-chat | — | 6 |
| retrieval | ✅ | RAG: chunkers, BM25, vector search, re-rankers | Memory | — | — | 27 |
| knowledge-graph | 🔶 | GraphRAG: entities, relationships, BFS, Union-Find | Memory | — | — | 8 |
| search | ✅ | Full-text search with inverted index | Memory | — | — | 7 |

### Data & Storage (3 modules)

| Module | Maturity | Purpose | Infra | Deps | Depd-by | Files |
|--------|----------|---------|-------|------|---------|-------|
| db | ✅ | Database abstraction (query builder, transactions) | Memory/SQL | — | — | 6 |
| cache | ✅ | TTL/LRU caching | IDB/LS/Mem | — | — | 8 |
| cqrs | ✅ | Command/query separation + event sourcing | Memory | — | — | 12 |

### Communication (3 modules)

| Module | Maturity | Purpose | Infra | Deps | Depd-by | Files |
|--------|----------|---------|-------|------|---------|-------|
| realtime | 🔶 | Transport abstraction (WS/SSE/polling/WebRTC) | WS/SSE/RTC | — | — | 14 |
| notifications | 🔶 | Toast notifications | DOM | — | — | 6 |
| email | 🔶 | Email composition + transport abstraction | SMTP/HTTP | — | — | 6 |

### Background Processing (3 modules)

| Module | Maturity | Purpose | Infra | Deps | Depd-by | Files |
|--------|----------|---------|-------|------|---------|-------|
| task | 🔶 | Background processing (Web Workers) | Worker | — | — | 7 |
| job-queue | 🔶 | Background job processing with retries | Memory | — | — | 6 |
| scheduler | ✅ | Periodic tasks with cron-like scheduling | Timer/Idle | — | — | 8 |

### Observability (4 modules)

| Module | Maturity | Purpose | Infra | Deps | Depd-by | Files |
|--------|----------|---------|-------|------|---------|-------|
| log | ✅ | Structured logging | Console/HTTP | — | — | 9 |
| monitoring | 🔶 | Metrics, traces, health checks | Memory/HTTP | — | — | 7 |
| analytics | 🔶 | Privacy-first analytics + behavioral tracking | Console | — | — | 9 |
| rate-limit | 🔶 | Token bucket / sliding window rate limiting | Memory | — | — | 5 |

### Web Platform (6 modules)

| Module | Maturity | Purpose | Infra | Deps | Depd-by | Files |
|--------|----------|---------|-------|------|---------|-------|
| seo | 🔶 | SEO meta tags + sitemap generation | Pure | — | — | 7 |
| prerender | 🔶 | Static pre-rendering for SEO bots | Pure | — | — | 9 |
| i18n | ✅ | Interpolation, pluralization, Intl formatting | Intl API | — | — | 9 |
| pwa | 🔶 | PWA manifest + service worker helpers | Pure | — | — | 7 |
| theme | ✅ | Theme tokens + dark/light switching | Pure | — | — | 7 |
| onboarding | 🔶 | Guided walkthrough tours with spotlight overlay | DOM | — | — | 8 |

### API & Commerce (6 modules)

| Module | Maturity | Purpose | Infra | Deps | Depd-by | Files |
|--------|----------|---------|-------|------|---------|-------|
| graphql | ✅ | GraphQL schema + query parser + executor | Memory | — | — | 7 |
| openapi | 🔶 | OpenAPI 3.0 document builder | Pure | — | — | 6 |
| payments | ✅ | Payment intent + webhook abstraction | Memory | — | — | 8 |
| subscription | 🔶 | Plan tiers, entitlements, lifecycle, usage metering | Memory | — | — | 7 |
| user-management | 🔶 | User CRUD, invitation, verification, password reset | Memory | — | — | 7 |
| tenancy | 🔶 | Multi-tenant context + isolation | Memory | — | — | 8 |

### Utilities & DX (3 modules)

| Module | Maturity | Purpose | Infra | Deps | Depd-by | Files |
|--------|----------|---------|-------|------|---------|-------|
| form-validation | 🔶 | Composable validation rules | Pure | — | — | 4 |
| file | 🔶 | File upload/download/processing | Blob/XHR/FS | — | — | 8 |
| example-greeter | 📚 | Teaching hex example | Memory | — | — | 5 |

---

### Column Legend

| Notation | Meaning |
|----------|---------|
| ✅ | Stable — API surface frozen, breaking changes follow semver |
| 🔶 | Beta — functional and tested, API may evolve |
| 📚 | Example — teaching/reference only, not for production use |
| `X (type)` in Deps | Type-only dependency — imports types/interfaces from X, no runtime coupling |

## Dependency Graph

```
api-client ──┬── auth
             └── ai-chat ── local-llm

user-preferences ── state

standalone: event-bus, feature-seams, notifications, example-greeter, log, cache,
            task, file, analytics, scheduler, i18n, onboarding, db, openapi,
            rate-limit, monitoring, job-queue, email, search, payments, tenancy,
            cqrs, pwa, seo, theme, graphql, prerender
retrieval (composes with knowledge-graph for GraphRAG); knowledge-graph
form-validation (pure domain); realtime (Primus-style transport mgr)
permission (uses auth user context)
```

## Navigation Tiers

| Tier | What to load | Tokens | When |
|------|-------------|--------|------|
| **1. This file** | Full file (category index + detail tables + dependency graph) | ~2200 | Always first |
| **1.5. Focused load** | Category index + one relevant category + bottom sections | ~992 | When context is tight |
| **2. Module surface** | `modules/X/manifest.json` + `public-api.mjs` + `README.md` + nearby headers/sidecars | ~900–4300 | For the target module |
| **3. Source implementation** | Only the touched source files and proving tests | Variable | Only when implementation detail is required |

Token counts are measured from the shipped `v0.8.0` baseline. The point is not aggressive compression; it is bounded orientation. This file gives a compact whole-repo map first, then lets an agent or a new teammate descend into one bounded module without scanning the entire repository.

## Key Entry Points

- Public landing page: `README.md`
- Whitepaper: `docs/whitepaper.md`
- Shared agent contract surface: `AGENTS.md` and `docs/agent-contract/README.md`
- Starter app slice index: `apps/starter/README.md`
- Module APIs: `modules/*/public-api.mjs`
- Module metadata: `modules/*/manifest.json`
- Dependency graph (forward deps, reverse deps, consumers): `docs/_generated/dependency-graph.json`
- Spec index (work-item trace): `docs/_generated/spec-index.json`
- Public onboarding guides: `docs/guides/README.md`
- Open-core boundary: `docs/adr/0044-cockpit-migration-open-core-boundary.md`
- Cross-boundary claims: `.claims/`
