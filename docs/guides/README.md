<!-- @HEADER
@version 0.8.4 | 2026-05-10
@purpose Index of all platform deployment guides in docs/guides/, mapping each guide to its deployment target.
@sidecar README.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

<!--
SpecRefs: TPL-034
-->

# Guides

Step-by-step guides for using and deploying the template.

| Guide | Description |
| --- | --- |
| [getting-started.md](getting-started.md) | Step-by-step guide from clone to first feature |
| [upgrading.md](upgrading.md) | Upgrading an existing Contextrail-based project to the latest version |
| [quick-start-first-module.md](quick-start-first-module.md) | Hands-on tutorial: create a hex module in 15 minutes |
| [ai-development-workflow.md](ai-development-workflow.md) | How to use the 17 AI agents effectively |
| [platforms.md](platforms.md) | Overview of all supported platforms |
| [pwa.md](pwa.md) | Progressive Web App setup |
| [local-app.md](local-app.md) | Running from the local filesystem |
| [electron.md](electron.md) | Electron desktop app |
| [extension.md](extension.md) | Browser extension (Manifest V3) |
| [deployment.md](deployment.md) | Build commands and hosting options |
| [tree-shaking.md](tree-shaking.md) | Import-graph analyzer and `--treeshake` build flag |
| [module-detachment.md](module-detachment.md) | Safely removing unused hex modules |
| [framework-integration.md](framework-integration.md) | Using hex modules with Next.js, Angular, Vue, Svelte |
| [framework-in-hex-modules.md](framework-in-hex-modules.md) | React/Vue/Svelte/Angular inside hex module adapters (ADR-0012) |
| [brownfield-migration.md](brownfield-migration.md) | Migrating existing React/Vue/Angular/Svelte apps into COA |
| [bba-walkthrough.md](bba-walkthrough.md) | End-to-end BBA example: 3 commits from seam to cleanup |
| [inter-agent-coordination.md](inter-agent-coordination.md) | BBA-first rule, file-based claims, and safe parallel delivery |
| [parallel-sessions.md](parallel-sessions.md) | Running multiple Claude Code sessions safely — worktrees, branch isolation |
| [server-deployment.md](server-deployment.md) | PM2, systemd, Docker, K8s deployment for server apps |
| [agent-framework-integration.md](agent-framework-integration.md) | Connecting third-party AI coding agents (Pi, Aider, Gemini CLI, etc.) |
| [local-frameworks.md](local-frameworks.md) | End-to-end setup for Aider / Continue / Cline + LM Studio + a local 7B model |
| [byollm-feature-dispatch.md](byollm-feature-dispatch.md) | Dispatch bounded feature slices to a local LLM using the briefer + Aider workflow |
| [cross-tool-ceremony.md](cross-tool-ceremony.md) | COA commit ceremony walkthrough for Codex CLI and Aider users (worktree → work → coa-merge → teardown) |
| [prompt-injection-defense.md](prompt-injection-defense.md) | Threat model and defenses for indirect prompt injection via instruction files |
| [mcp-integration.md](mcp-integration.md) | Exposing hex modules as MCP servers for AI agent consumption |
| [inter-app-api.md](inter-app-api.md) | Communication patterns between Contextrail apps (REST, GraphQL, WebSocket) |
| [seam-creation-checklist.md](seam-creation-checklist.md) | Decision tree, naming convention, and step-by-step template for creating a feature seam |
| [seam-rollback-procedure.md](seam-rollback-procedure.md) | Emergency rollback runbook when a seam switch causes issues |
| [seam-data-migration.md](seam-data-migration.md) | Dual-read, dual-write, and decoupled schema migration patterns behind seams |
| [seam-deployment-integration.md](seam-deployment-integration.md) | Contract for integrating seam rollback with deployment pipelines |
| [server-adapters.md](server-adapters.md) | Server-side adapter wiring patterns for monitoring, job-queue, email, search, payments |
| [parallel-work-quickstart.md](parallel-work-quickstart.md) | Quick reference for multi-agent parallel work with claims |
| [aggregator-checklist.md](aggregator-checklist.md) | Pre-flight checklist for sessions that issue parallel-work prompts to other sessions |
| [env-and-keys.md](env-and-keys.md) | Environment variables and secrets management |
| [typescript-migration.md](typescript-migration.md) | Incremental TypeScript migration checklist |

## Reference

| Document | Description |
| --- | --- |
| [context-loading-protocol.md](../context-loading-protocol.md) | How orchestrators decide which files to load, in what order, and at what token cost per agent context budget |
| [bdd-conventions.md](../design/bdd-conventions.md) | BDD modularity conventions: one feature per module, step definition scope, file-size discipline |
