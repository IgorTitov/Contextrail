<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose PRD for server-side starter applications demonstrating hex modules with Node.js adapters.
@sidecar server-starters.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Server-Side Starter Applications

## Requirement intent

The template needs a server-side starter app (`apps/api-starter/`) that demonstrates the same hex module architecture used in browser starters, but with server-appropriate adapters (Node.js HTTP, structured JSON logging, EventEmitter event bus, memory DB).

This proves that hex modules are truly framework-agnostic: the domain layer is identical across browser and server platforms, only the adapter layer differs.

## Classification

This is **technical/architectural** work. It provides a server-side reference implementation. USM is intentionally skipped.

## Scope

### api-starter (TPL-177)

Minimal Node.js HTTP server at `apps/api-starter/` using zero external dependencies.

- Wires server-side hex module adapters (log, cache, event-bus, db)
- Simple JSON router with health check and greeting routes
- Greeting route demonstrates i18n via `modules/i18n`
- App config with mode detection (development/production)
- All hex module imports go through `public-api.mjs` only

### Server adapters (included in TPL-177)

- `modules/cache/adapters/redis-adapter.mjs` — Redis cache adapter stub
- `modules/state/adapters/sqlite-adapter.mjs` — SQLite state adapter stub
- `modules/auth/adapters/server-session-adapter.mjs` — Server session auth
- `modules/event-bus/adapters/node-eventemitter-adapter.mjs` — Node EventEmitter
- `modules/log/adapters/file-adapter.mjs` — File-based logging
- `modules/realtime/adapters/ws-server-transport.mjs` — WebSocket server transport
