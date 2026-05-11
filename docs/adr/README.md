<!-- @HEADER
@version 0.7.34 | 2026-04-28
@purpose Explain the architecture decision record area and how ADR files are used to capture durable design decisions in the template.
@sidecar README.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit rewrite-ok -->

# ADR

Keep short architecture decisions here.
One ADR should capture one material decision and its rationale.

Current ADRs:

- `0001-template-scope.md` — establishes that this repository is a standalone Claude Code template.
- `0002-trunk-based-delivery.md` — defines Trunk-Based Development plus Branch by Abstraction for this template.
- `0003-architecture-metadata-for-ai-cockpit.md` — structured metadata for AI agent navigation.
- `0004-multi-platform-seams.md` — multi-platform abstraction seams.
- `0005-js-jsdoc-over-typescript.md` — JavaScript + JSDoc over TypeScript.
- `0006-context-optimized-architecture.md` — COA: context as a design constraint.
- `0007-tiered-file-size-limits.md` — per-layer file-size soft limits.
- `0008-inter-agent-coordination-protocol.md` — BBA-first rule + file-based claims for parallel agent delivery.
- `0009-sidecar-first-headers.md` — slim inline headers + sparse `.header.md` sidecars.
- `0010-manifest-capabilities.md` — generator-owned `capabilities` blocks in module manifests sourced from JSDoc `@typedef` or sibling `types.d.ts`.
- `0011-system-map-hierarchy.md` — category-grouped hierarchical format for SYSTEM_MAP.md, replacing the flat module table for scalability.
- `0012-framework-adapters-in-hex-modules.md` — domain/ports are framework-free; adapters may use React, Vue, Svelte, Angular.
- `0013-inter-app-communication.md` — MCP is an adapter; inter-app communication goes through ports; template provides building blocks, not service mesh.
- `0014-per-file-version-semantics.md` — `@version` in file headers tracks last-meaningfully-changed-at-VERSION, not last-released VERSION (Proposed; implementation in TPL-233).
