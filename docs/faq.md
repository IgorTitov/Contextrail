<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Document faq for this repository.
@sidecar faq.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Frequently Asked Questions

**Contextrail Template v0.6.6**

---

## General

### What is this template?

Contextrail is **architectural guardrails for AI coding agents** — a reference implementation of COA (Context-Optimized Architecture) that makes the right path easy and the wrong path structurally impossible. *One repo. Many agents. Zero collisions.*

It provides 40 hexagonal modules, deterministic quality gates, and a file-based claims protocol so that multiple AI agents (or human + agent pairs) can work on different features simultaneously without merge conflicts. Measured: 99% of module pairs are parallel-safe, agents orient on any module within ~2,800 tokens, and the full template has just 1 runtime dependency (`jose`).

The template also includes a zero-bundler build system, 5 deployment targets, a browser-side RAG stack, and a structured delivery process orchestrated by 16 specialized AI agents and 17 reusable skills. Run `pnpm demo` to verify every claim from a fresh clone.

### Who is this template for?

- Teams adopting Claude Code or OpenAI Codex for AI-assisted development
- Developers who want strict architectural boundaries from day one
- Projects that need multi-platform deployment (web, PWA, desktop, mobile, extension)
- Teams building AI/ML features (RAG, chat, local LLM) without heavy frameworks

### Do I need Claude Code to use this template?

No. The template works standalone as a plain JavaScript project. Claude Code (or Codex) adds the AI-assisted workflow layer — agent routing, structured delivery, automated quality gates — but all code, tests, and builds work without any AI tool.

### Do I need TypeScript?

No. The template uses plain JavaScript with JSDoc annotations and `.d.ts` sidecar files for IDE support. See [ADR 0005](adr/0005-js-jsdoc-over-typescript.md) for the full rationale. A concrete migration path to TypeScript is documented if you decide to switch later.

### What is COA?

**Context-Optimized Architecture** — a methodology that treats the AI agent's context window as a first-class design constraint. Every module is sized so an agent can orient from a ~2,800-token cold read. Boundaries are enforced by deterministic gates (not just instructions), so multiple agents can work in parallel without collisions. Contextrail is the open-source reference implementation of COA.

### How is this different from Nx / Turborepo?

They're orthogonal, not competing. **Nx/Turborepo** orchestrate builds, caches, and task graphs across packages in a monorepo. **COA/Contextrail** structures how AI agents navigate, modify, and coordinate within the codebase. You could use both: Nx for build orchestration, Contextrail for agent-safe module boundaries. COA doesn't manage builds; Nx doesn't manage agent context budgets or parallel-safety claims.

### How is BBA different from LaunchDarkly / feature flags?

BBA (Branch by Abstraction) is a **delivery pattern** — a way to land incomplete work on trunk safely. Feature-flag services (LaunchDarkly, Unleash) are **runtime infrastructure** for controlling behavior in production. BBA seams are temporary — they exist during migration and are removed after cutover. Feature flags are permanent operational controls. You can use both: BBA for safe trunk delivery, a feature-flag service for production rollout. The `feature-seams` module provides the BBA infrastructure; it doesn't replace a hosted flag service.

---

## Architecture

### Can I use React (or Vue, Svelte, Angular) inside a hex module?

Yes. Domain and ports must stay framework-free, but **adapters can use any framework**. A hex module with `domain/board-logic.mjs` (pure JS) and `adapters/react-board-view.tsx` (React component) is valid hex architecture. The template ships vanilla JS to demonstrate that hex works without a framework — real projects should use whatever framework they need. See [ADR-0012](adr/0012-framework-adapters-in-hex-modules.md) and the [framework-in-hex guide](guides/framework-in-hex-modules.md).

### Does COA require vanilla JavaScript?

No. COA requires that **domain logic is framework-free** — pure functions, no React hooks, no Vue refs. But adapters, app shell, and UI components can use any framework. TypeScript (`.tsx`, `.ts`) is fine in adapters too. The template uses vanilla JS + JSDoc (ADR-0005) as a demonstration choice, not a COA requirement.

### How do I expose my app to AI agents via MCP?

MCP (Model Context Protocol) is just another adapter in hex architecture. Write an MCP adapter that wraps your domain logic — same as you'd write a REST controller. The domain doesn't know MCP exists. Install `@modelcontextprotocol/sdk` in your app (not in the template), create the adapter in `modules/<name>/adapters/mcp-*.mjs`, and register in `.claude/settings.json`. See the [MCP Integration Guide](guides/mcp-integration.md) and [ADR-0013](adr/0013-inter-app-communication.md).

### How do two Contextrail apps talk to each other?

Through ports and adapters, never by importing each other's modules. App A exposes a REST/GraphQL/WebSocket API via an adapter. App B consumes it via its own adapter implementing its own port. The template provides building blocks: `api-client` (outbound HTTP), `openapi` (spec generation), `graphql` (query language), `realtime` (WebSocket/SSE). See the [Inter-App API Guide](guides/inter-app-api.md).

### Why hexagonal architecture?

Hexagonal architecture (ports and adapters) provides:
- **Testability** — domain logic tested without infrastructure
- **Swappability** — change storage, API, or UI without touching core logic
- **AI-friendliness** — clear contracts make LLM navigation reliable
- **Modularity** — modules can be added or removed independently

### Can I use React/Vue/Svelte with this template?

Yes. The hex modules are framework-agnostic — they export plain JavaScript functions and objects. The `apps/starter/` app shell is framework-free, but you can replace it with any framework while keeping the module layer intact.

### Why is cross-module deep importing forbidden?

Deep imports create hidden coupling. If module A imports `modules/B/adapters/foo.mjs` directly, it depends on B's internal structure. When B refactors, A breaks. The `public-api.mjs` pattern ensures modules communicate through stable, documented contracts. Contract tests enforce this automatically.

### How do I add a new hex module?

1. Create `modules/my-module/` with the standard structure (domain, ports, adapters, public-api.mjs, messages.mjs, types.d.ts, manifest.json, README.md)
2. Write port contracts in `ports/`
3. Implement at least one adapter in `adapters/`
4. Export the public surface through `public-api.mjs`
5. Add unit tests and a hex contract test
6. See [Getting Started Guide](guides/getting-started.md#step-8-create-your-first-feature) for a detailed walkthrough

---

## Build and Deployment

### Why no bundler (Webpack/Vite/esbuild)?

The template demonstrates that modern browsers handle ES modules natively. Benefits:
- Zero build configuration
- Source code is the deployed code
- No source maps needed for debugging
- Faster development loop
- Simpler CI/CD

For production use with hundreds of modules, you can add a bundler later — the hex module structure is bundler-friendly.

### How does tree-shaking work without a bundler?

The `--treeshake` build flag uses `scripts/import-graph.mjs` to statically analyze the ES module import graph from the entry point. It copies only the `modules/` directories that are actually imported, leaving unused modules out of `dist/`.

```bash
pnpm build:hosted -- --treeshake
```

### Can I deploy to Vercel/Netlify/Cloudflare Pages?

Yes. Run `pnpm build:hosted` and deploy the `dist/` directory as a static site. No server-side rendering is needed.

### How do I add Electron support?

1. Build with `pnpm build:electron`
2. Copy the Electron scaffold from `templates/electron/` into your project root
3. Install Electron: `npm install --save-dev electron`
4. Run: `npx electron .`

See [Electron Guide](guides/electron.md) for details.

### How do I make it a PWA?

1. Set `appConfig.mode` to `"pwa"` in package.json (or build with `pnpm build:pwa`)
2. Customize `apps/starter/manifest.json` with your app name and icons
3. Replace placeholder icons in `apps/starter/icons/`

See [PWA Guide](guides/pwa.md) for details.

---

## Modules

### Do I need all 24 modules?

No. Remove any modules you don't need using the detachment CLI:

```bash
node scripts/detach-module.mjs --list     # see what's available
node scripts/detach-module.mjs auth       # remove auth module
```

The CLI handles dependency checking and test file cleanup.

### Can modules work in the browser?

Yes — all 24 modules are browser-compatible. They use no `node:*` built-ins. Counter-based IDs replace `node:crypto`, and all algorithms (BM25, cosine similarity, RRF, Union-Find) are implemented from first principles.

### How do I use the RAG module?

See the [Module Catalog — retrieval](module-catalog.md#10-retrieval) for the full API. Quick example:

```javascript
import {
  createBm25Adapter,
  createCharacterChunker,
  createAugmentPrompt,
} from '../../modules/retrieval/public-api.mjs';

const chunker = createCharacterChunker({ chunkSize: 500, chunkOverlap: 50 });
const chunks = chunker.chunk(myDocument);

const bm25 = createBm25Adapter();
bm25.index(chunks);

const augment = createAugmentPrompt(bm25, { topK: 3 });
const prompt = augment('What is the main topic?');
// → prompt with relevant context injected
```

### How do I use local LLM inference?

```javascript
import { createWebLlmAdapter } from '../../modules/local-llm/public-api.mjs';

const llm = createWebLlmAdapter();
await llm.loadModel('Llama-3-8B-Instruct-q4f16', (p) => console.log(`${p*100}%`));
const response = await llm.sendMessage('Hello');
```

Requires WebGPU support (Chrome/Edge 113+). For wider browser support, use `createTransformersAdapter()` (WASM-based).

---

## Testing

### Why Node.js built-in test runner instead of Jest/Vitest?

- Zero additional dependencies
- Ships with Node.js 18+ (no installation needed)
- Fast startup (no framework initialization)
- Simple and predictable behavior
- Compatible with any CI/CD system

### How do I run specific test files?

```bash
node --test tests/unit/my-module.test.mjs
```

### How do I add E2E tests?

1. Install Playwright browsers: `pnpm playwright:install`
2. Create a spec file in `tests/e2e/`:
```javascript
import { test, expect } from '@playwright/test';
import { CSS } from '../../apps/starter/ui-selectors.mjs';

test('my feature works', async ({ page }) => {
  await page.goto('file:///path/to/dist/index.html');
  await expect(page.locator(CSS.MY_ELEMENT)).toBeVisible();
});
```
3. Run: `pnpm test:e2e:smoke`

### What are contract tests?

Contract tests verify that hex module boundaries are intact. They check:
- Required files exist (public-api.mjs, manifest.json, types.d.ts, README.md)
- No deep imports cross module boundaries
- Domain code doesn't import adapter code
- Port validators work correctly

They run automatically as part of `pnpm test`.

---

## Process and Workflow

### Why so many pre-commit checks?

The checks enforce process-as-code. Without them, architectural rules, traceability, and documentation quality erode over time. Each check takes milliseconds. Together they prevent:
- Orphan traceability IDs
- Missing planning artifacts
- Hex boundary violations
- Stale documentation
- Broken test coverage
- Changelog drift

### Can I skip the pre-commit hook?

```bash
git commit --no-verify
```

But this is strongly discouraged. If a check consistently fails during normal work, investigate and fix the root cause.

### What is "Branch by Abstraction"?

Instead of long-lived feature branches, new behavior is introduced behind a **seam** (feature flag) on trunk:

1. Introduce the seam (disabled by default)
2. Implement new behavior behind the seam
3. Prove the new behavior with tests
4. Enable the seam
5. Remove old behavior in a later commit

The `feature-seams` module provides the infrastructure. See [Feature Seams](technical-reference.md#9-feature-seams-branch-by-abstraction) in the Technical Reference.

### What is a "slice"?

A slice is the smallest independently reviewable, user-meaningful change. It becomes exactly one atomic commit. A slice may include:
- Seam introduction
- Tests (written first)
- Implementation
- Documentation updates
- Header and README alignment

### How does traceability work?

Every change traces through a single ID namespace:

```
PRD (why) → USM (who/how) → Backlog (what) → Code (SpecRefs) → Tests → CHANGELOG → Commit
```

IDs are monotonic: `TPL-001`, `TPL-002`, etc. (replace `TPL` with your project key). The `spec-check` script validates that all links resolve.

---

## AI Agents

### Do I need all 16 agents?

No. The minimum viable set is:
- `product-planner` — for intake and decomposition
- `feature-implementer` — for implementation
- `acceptance-tester` — for validation

Other agents add value for specific work types. See [AI Development Workflow](guides/ai-development-workflow.md) for the full routing map.

### Can I use Codex instead of Claude?

Yes. Both tools operate from the same canonical contract (`docs/agent-contract/compatibility-contract.json`). Codex reads `AGENTS.md` and `.agents/`, while Claude reads `.claude/CLAUDE.md` and `.claude/agents/`. Both are generated from the same source.

### How do I add a custom agent?

1. Create the agent definition in `.claude/agents/my-agent.md` (for Claude) and/or `.agents/skills/my-skill/SKILL.md` (for Codex)
2. Update the compatibility contract if needed
3. Run `node scripts/agent-contract/sync.mjs`
4. Run `node scripts/agent-contract/check.mjs` to verify parity

### Can multiple AI agents work on the same repo simultaneously?

Yes — this is the core value proposition. Measured: **99% of module pairs are parallel-safe** and **35 of 40 modules** can be edited simultaneously (reproducible via `pnpm demo`).

The template provides a three-layer coordination model:

1. **BBA-first rule (~80% of cases):** Every cross-boundary change is framed as an addition (new export behind a BBA seam), not a modification of existing code. Two agents adding to the same file merges cleanly — this is why 99% of pairs are conflict-free.
2. **File-based claims (~20%):** For unavoidable modifications, agents file structured claims in `.claims/` to declare intent and detect overlaps before starting work. Protected paths (CHANGELOG, package.json, CI configs) are blocked without a claim.
3. **Human escalation (rare):** For truly simultaneous equal-priority claims that can't be resolved by timestamp.

See [ADR 0008](adr/0008-inter-agent-coordination-protocol.md) and the [inter-agent coordination guide](guides/inter-agent-coordination.md).

### What happens if an agent ignores the claims protocol?

Graceful degradation. The pre-commit hook blocks commits on active modify/replace conflicts, but hex boundaries and BBA seams structurally prevent most collisions even without claims. The protocol adds safety for the residual ~20% of cross-boundary modifications.

### How do I see what files are currently claimed?

```bash
node scripts/checks/claim-check.mjs --query=<path>   # Check a specific file
node scripts/checks/claim-check.mjs --audit           # Full claims audit
```

---

## Design System

### How do I add new design tokens?

Add CSS custom properties to the appropriate file:
- **Spacing, typography, shadows, z-index:** `apps/starter/design/tokens.css`
- **Colors, radius, transitions:** `apps/starter/theme-toggle/theme-variables.css`

Then reference them in `apps/starter/design/components.css` or feature-specific CSS.

### How does dark mode work?

Two mechanisms:
1. **Automatic:** `prefers-color-scheme: dark` media query (follows OS setting)
2. **Manual:** `data-theme="dark"` attribute on `<html>` element (user toggle)

Color tokens in `theme-variables.css` define both light and dark values.

---

## Versioning and Releases

### How is versioning managed?

- **`VERSION`** file — single source of truth (e.g., `0.2.2`)
- **`package.json`** — synced by `version-bump.mjs`
- **Headers** — carry version stamp for alignment validation
- **`pnpm mergezip`** — auto-bumps patch version

### How do I create a release?

```bash
# 1. Ensure all tests pass
pnpm test

# 2. Bump version
node scripts/checks/version-bump.mjs 0.3.0

# 3. Update CHANGELOG.md

# 4. Commit
git add VERSION package.json CHANGELOG.md
git commit -m "release: v0.3.0"

# 5. Generate artifacts
pnpm mergezip
```

### What goes into `.backups/`?

- `merge-<name>(<version>).txt` — plain-text snapshot of all tracked files
- `merge-<name>(<version>).zip` — ZIP archive of the same

These are local artifacts for backup and distribution, not committed to git.

---

## Troubleshooting

### Pre-commit hook fails with "spec-check: duplicate ID"

Two trace-yaml blocks have the same `id` field. Search for the duplicate:
```bash
grep -r "id: TPL-042" docs/
```
Remove the duplicate from the non-canonical location.

### Pre-commit hook fails with "header-check: ERROR"

A file header has `_none_` in semantic fields (Owns, Boundaries, Invariants, NotesForLLM). Fill in meaningful values or use the header-guardian agent to generate them.

### Tests fail after removing a module

The detachment CLI removes the module and its listed test files, but there may be:
- Import references in other test files
- References in contract tests
- References in integration tests

Search for the module name across tests:
```bash
grep -r "modules/removed-module" tests/
```

### "Cannot find module" errors in IDE

Ensure `.d.ts` files exist for the module. If you created a new module, add `types.d.ts` with the public API type definitions.

### Build output is missing modules

If using `--treeshake`, only modules reachable from the entry point's import graph are copied. Ensure your app shell imports the module (directly or transitively).

Without `--treeshake`, all modules are copied to `dist/`.
