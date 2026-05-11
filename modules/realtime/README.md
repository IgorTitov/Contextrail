<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the realtime hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx realtime
@public false
@edit careful -->

# realtime

Hexagonal bounded module for Primus-style transparent transport selection with graceful fallback.

## Transport abstraction

The transport manager automatically selects the best available transport and falls back gracefully if one stops working. Transports are tried in priority order:

1. **WebSocket** (full-duplex, lowest latency)
2. **SSE** (server-push with HTTP POST for send)
3. **Long-polling** (universal fallback via fetch)
4. **WebRTC** (peer-to-peer data channels via injected signaling)

All transports implement the same `TransportPort` contract. The `TransportManager` composes them into a single `RealtimePort` with channel multiplexing, automatic reconnection, and heartbeat monitoring.

## Architecture

| Layer | File | Responsibility |
|-------|------|---------------|
| Ports | `ports/realtime-port.mjs` | `RealtimePort` contract + `assertRealtimePort()` validator |
| Ports | `ports/transport-port.mjs` | `TransportPort` contract + `assertTransportPort()` validator |
| Domain | `domain/channel-router.mjs` | Channel-based pub/sub message routing |
| Domain | `domain/connection-state.mjs` | State machine with valid transition enforcement |
| Domain | `domain/reconnection.mjs` | Exponential backoff with jitter |
| Domain | `domain/heartbeat.mjs` | Periodic keep-alive with timeout detection |
| Domain | `domain/transport-manager.mjs` | Primus-style transport composition (implements RealtimePort) |
| Adapters | `adapters/websocket-transport.mjs` | Native WebSocket adapter |
| Adapters | `adapters/sse-transport.mjs` | Native EventSource + fetch POST adapter |
| Adapters | `adapters/long-polling-transport.mjs` | Native fetch long-polling adapter |
| Adapters | `adapters/webrtc-transport.mjs` | Native RTCPeerConnection data channel adapter |
| Adapters | `adapters/ws-server-transport.mjs` | Server-side WebSocket adapter with driver injection (isomorphic proof) |
| Messages | `messages.mjs` | i18n message layer for all user-facing copy |
| Public API | `public-api.mjs` | Single cross-module entry point |

## Usage

```js
import {
  createWebSocketTransport,
  createSseTransport,
  createLongPollingTransport,
  createTransportManager,
  assertRealtimePort,
} from '../../modules/realtime/public-api.mjs';

// Create transports in priority order
const transports = [
  createWebSocketTransport(),
  createSseTransport({ sendEndpoint: '/api/sse/send' }),
  createLongPollingTransport({ pollEndpoint: '/api/poll', sendEndpoint: '/api/send' }),
];

// Compose into a single realtime connection
const rt = createTransportManager(transports);
assertRealtimePort(rt);

await rt.connect('wss://example.com/realtime');

rt.subscribe('chat', (msg) => console.log('Chat:', msg));
rt.send('chat', { text: 'Hello!' });

rt.onConnectionChange((state) => console.log('State:', state));
```

## Failure surface

Things integrators need to know on first read — these are the load-bearing failure modes that cold reads of the code don't surface:

- **WebSocket handshake reject** (HTTP 401/403 or close code 4xxx) — `connect()` rejects with the close reason; the manager moves to the next transport but does not retry the rejected one.
- **Token expiry mid-session** — server closes the socket; reconnection runs but will reject again until the caller refreshes credentials and calls `connect()` with a fresh URL.
- **Heartbeat timeout** — no pong within `heartbeat.timeout` flips state to `disconnected` even if the underlying socket still appears open. Tune `heartbeat.intervalMs` for high-RTT networks.
- **SSE silent close** — some proxies drop the stream without an `error` event; the heartbeat is the only reliable detector. Without an explicit heartbeat over SSE, dead connections can sit silent for minutes.
- **Long-polling 504 from intermediary proxies** — coalesces under load; treated as transport-level error, falls through to the next transport once the retry budget for the current one is exhausted.
- **WebRTC ICE gathering timeout** — no STUN/TURN candidates → `connect()` rejects with `iceFailure`. Provide TURN if the deployment crosses NATs.
- **Channel callback throws** — the router catches and isolates per-subscriber, so one buggy listener does not block others, but the throw is **not** surfaced upstream — wrap callbacks if you need observability.
- **Reconnection backoff cap reached** — after `reconnection.maxAttempts`, manager stops and emits a terminal `disconnected` state. Caller is responsible for prompting the user or scheduling a retry.

## Rules

- Cross-module consumers import from `public-api.mjs` only.
- Deep imports into `domain/`, `ports/`, or `adapters/` are forbidden.
- Domain must stay framework-free.
- All transports use only native browser APIs (no external dependencies).
