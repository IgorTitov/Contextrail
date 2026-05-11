<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Record the decision on how Contextrail-based applications communicate via API and MCP, and where these concerns live in the hex architecture.
@sidecar 0013-inter-app-communication.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR 0013 — Inter-Application Communication (API and MCP)

**Status:** Accepted
**Date:** 2026-04-16
**Context:** Multiple Contextrail-based applications (Cockpit, MedOps, Zvenix)
need to expose data to AI agents (via MCP) and communicate with each other
(via REST/GraphQL/WebSocket).

---

## Context

A single Contextrail-based application is a modular monolith. But real
ecosystems have multiple applications:

- **App-to-AI-agent:** an application exposes its data and tools to
  Claude, Codex, or other AI agents via MCP (Model Context Protocol)
- **App-to-app:** two Contextrail applications communicate via REST,
  GraphQL, or WebSocket
- **App-to-external:** an application calls third-party APIs

The template already has building blocks for all three patterns:

| Pattern | Existing modules |
|---------|-----------------|
| Outbound HTTP | `api-client` (fetch adapter with port contract) |
| API spec | `openapi` (document builder, route registry adapter) |
| Query language | `graphql` (schema, parser, executor) |
| Real-time | `realtime` (WebSocket, SSE, long-polling, WebRTC transports) |
| In-process events | `event-bus` (pub/sub, memory + Node adapters) |
| Server scaffold | `apps/api-starter` (Node.js HTTP server with route wiring) |

What's missing is **guidance** on how to compose these into inter-app
communication patterns, and how MCP fits into the hex architecture.

## Decision

### 1. MCP is an adapter, not a module

MCP (Model Context Protocol) is a **transport layer** — it connects
AI agents to application resources and tools. In hex architecture,
this means:

```
modules/kanban/
  domain/board-logic.mjs        ← business logic (framework-free)
  ports/board-port.mjs          ← contract
  adapters/
    mcp-board-resource.mjs      ← MCP resource: exposes board state
    mcp-board-tools.mjs         ← MCP tools: moveCard, addCard, etc.
    rest-board-controller.mjs   ← REST: traditional HTTP endpoints
    memory-board-adapter.mjs    ← memory: for testing
```

An MCP adapter wraps domain logic behind the MCP protocol, just as
a REST controller wraps it behind HTTP. The domain doesn't know or
care which protocol is used.

### 2. Inter-app communication goes through ports

Two Contextrail applications never import each other's modules
directly. Communication always goes through a network boundary:

```
App A                          App B
─────                          ─────
domain/scoring.mjs             domain/dashboard.mjs
       │                              │
ports/scoring-port.mjs         ports/data-source-port.mjs
       │                              │
adapters/                      adapters/
  rest-scoring-api.mjs           rest-scoring-client.mjs
  (serves /api/scores)           (calls App A's /api/scores)
```

Each app defines its own port. The adapter on the server side
exposes the port via HTTP/WebSocket/MCP. The adapter on the client
side consumes it. The domain layers never cross application boundaries.

### 3. The template provides building blocks, not a service mesh

The template provides:
- **Ports and adapters** for every communication pattern (HTTP, WebSocket,
  GraphQL, MCP)
- **Guides** showing how to compose them
- **The `api-starter` app** as a reference server implementation

The template does **not** provide:
- Service discovery
- API gateway / reverse proxy
- Distributed tracing
- Circuit breakers
- Service mesh (Istio, Linkerd)

These are deployment infrastructure concerns that vary by
environment. The hex architecture makes them easy to add as adapters
without touching domain logic.

## Consequences

### Positive

- **MCP integration is straightforward.** Write an adapter that
  implements the MCP server protocol, wrapping existing domain logic
  and port contracts. No architectural changes needed.
- **Inter-app API is standardized.** Use `api-client` for outbound,
  `openapi` for spec generation, `realtime` for streaming. All hex-clean.
- **Testable without network.** Domain logic tested with memory
  adapters. MCP/REST adapters tested with contract tests against the
  port. Integration tests use in-process or localhost.

### Negative

- **MCP SDK is external.** The template doesn't ship an MCP SDK (it
  changes too fast). Adopters add `@modelcontextprotocol/sdk` as a
  dependency in their app, not in the template.
- **No turnkey inter-app example.** Adopters must compose the building
  blocks themselves. The guides show how.
