<!-- @HEADER
@version 0.7.98 | 2026-05-05
@purpose Index the product requirement documents tracked in this template and explain how PRD work is normalized from intake.
@sidecar index.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# PRD index

PRD is the source of truth for requirement intent.

Use PRD to capture:

- what outcome is wanted
- which rules or constraints apply
- what is explicitly in scope or out of scope
- what acceptance boundary downstream work must respect

Technical or non-functional work may start here without USM.
User-facing workflow changes must pass through USM first and then formalize their requirement intent here.

Starter real PRD example: `docs/prd/bootstrap-template.md`.

Recommended requirement statuses:

- `draft`
- `clarified`
- `approved`

A requirement is ready for backlog slicing when:

- blocking clarification is closed
- the source path is known
- acceptance is testable
- the module or affected area is named

Replace this starter content with your real product requirements.

```trace-yaml
work_item:
  id: TPL-001
  type: epic
  title: Bootstrap the Claude Code delivery template
  parent_ref:
  status: done
  module_ref: core
  spec_refs:
    - docs/prd/index.md
    - docs/prd/bootstrap-template.md
    - docs/usm/scenarios/maintainer/bootstrap-workflow.md
  test_refs:
    - tests/bdd/features/template.feature
  bdd_refs:
    - tests/bdd/features/template.feature#Scenario: Bootstrap the project template
  acceptance:
    - The repository has project-local Claude Code instructions and hooks.
    - The repository has deterministic scripts for traceability and gates.
```

## Starter Common Features

Epic: TPL-005 — see `docs/prd/starter-common-features.md` for the canonical trace block and requirement intent.

## Multi-Platform Abstraction Seams

Epic: TPL-022 — see `docs/prd/platform-seams.md` for the canonical trace block and requirement intent. Technical/architectural work; USM intentionally skipped.

## Feature Seams Module

Epic: TPL-036 — see `docs/prd/feature-seams.md` for the canonical trace block and requirement intent. Technical/architectural work providing formal BBA/TBD infrastructure; USM intentionally skipped.

## Event Bus + State Management

Epic: TPL-043 — see `docs/prd/event-bus-state.md` for the canonical trace block and requirement intent. Technical/architectural work providing typed eventing and observable state infrastructure; USM intentionally skipped.

## Design Tokens + Brandbook

Epic: TPL-054 — see `docs/prd/design-tokens-brandbook.md` for the canonical trace block and requirement intent. Design-system infrastructure providing CSS custom-property tokens, minimal reset, token-based component styles, and a brandbook template; USM intentionally skipped.

## Auth Port + API Client

Epic: TPL-062 — see `docs/prd/auth-api-client.md` for the canonical trace block and requirement intent. Technical/architectural work providing pluggable authentication ports with multiple adapters and a typed HTTP client abstraction; USM intentionally skipped.

## AI Chat Port + UI

Epic: TPL-071 — see `docs/prd/ai-chat.md` for the canonical trace block and requirement intent. Mixed technical/architectural + UI work providing a port-based AI chat abstraction with pluggable adapters, message history management, and a starter chat panel UI; USM intentionally skipped.

## In-Browser LLM Module

Epic: TPL-079 — see `docs/prd/local-llm.md` for the canonical trace block and requirement intent. Mixed technical/architectural work providing in-browser LLM adapters conforming to AiChatPort via WebLLM (WebGPU) and Transformers.js (WASM), with model loading lifecycle and browser-based model caching; USM intentionally skipped.

## RAG Retrieval Module

Epic: TPL-086 — see `docs/prd/retrieval.md` for the canonical trace block and requirement intent. Technical/architectural work providing in-browser retrieval-augmented generation infrastructure with RetrievalPort, text chunker, BM25 keyword adapter, vector-local cosine similarity adapter, and augmentPrompt pipeline; USM intentionally skipped.

## Tree-Shaking Build Optimization

Epic: TPL-093 — see `docs/prd/tree-shaking.md` for the canonical trace block and requirement intent. Technical/architectural work adding an import-graph analyzer and opt-in `--treeshake` flag to the zero-bundler build script for copying only referenced module directories; USM intentionally skipped.

## RAG Extensions

Epic: TPL-097 — see `docs/prd/rag-extensions.md` for the canonical trace block and requirement intent. Technical/architectural work extending the retrieval module with pluggable chunking (ChunkerPort), tokenizer and embedder ports, hybrid search with RRF and re-ranking, a new knowledge-graph hex module (GraphRAG), and document loaders with query pipeline; USM intentionally skipped.

## Module Detachment + Language Strategy ADR

Epic: TPL-129 (detachment tooling) and TPL-134 (ADR) — see `docs/prd/module-detachment.md` for the canonical trace blocks and requirement intent. Technical/architectural work providing module dependency manifests, a detach-module CLI script, a detachment guide, and a formal ADR documenting the JS+JSDoc+.d.ts language strategy; USM intentionally skipped.

## Inter-Agent Coordination Protocol

Epic: TPL-172 — see `docs/prd/inter-agent-coordination.md` for the canonical trace block and requirement intent. Technical/architectural work providing file-based claims for parallel agent coordination; USM intentionally skipped.

## Manifest Capabilities (F3)

Epic: TPL-178 — see `docs/prd/manifest-capabilities.md` for the canonical trace block and requirement intent. Technical/architectural control-plane work that adds a generator (`scripts/checks/capabilities-sync.mjs`) to write a top-level `capabilities` block into every module manifest, sourced from JSDoc `@typedef` or sibling `types.d.ts`, and wires a hard-fail `--check` into the pre-commit hook and CI quality-gates; closes Mode B audit finding F3; USM intentionally skipped; `failureModes` (F5) is explicitly deferred. See also `docs/adr/0010-manifest-capabilities.md`.

## Infrastructure Modules

Epic: TPL-136 — see `docs/prd/infrastructure-modules.md` for the canonical trace block and requirement intent. Technical/architectural work providing nine new hex modules: LogPort (structured logging), CachePort (caching with TTL/LRU), FormValidation (composable validation rules), RealtimePort (Primus-style transport abstraction with WebSocket/SSE/long-polling/WebRTC), TaskPort (Web Worker background processing), PermissionPort (RBAC), FilePort (file upload/download/processing), AnalyticsPort (analytics with behavioral telemetry), and SchedulerPort (periodic tasks with visibility awareness); USM intentionally skipped.

## Agent-context Briefer

Epic: TPL-288 — see `docs/prd/agent-context-briefer.md` for the canonical trace block and requirement intent. Technical/developer-facing tooling providing a slice-aware, token-budgeted context brief CLI (`scripts/agent-context.mjs`) for harness-agnostic LLM delivery; emits SYSTEM_MAP fragment, module manifests, sidecar neighborhood, and touched-file source in priority order; shares work-surface library with `module-fit-check.mjs`; USM intentionally skipped.
