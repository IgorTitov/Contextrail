/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single entry point for the realtime bounded module — the only file other modules may import.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx realtime
 * @public true
 * @edit careful
 */

/**
 * Single entry point for the realtime bounded module.
 * The only file other modules may import.
 */

// Ports
export { assertRealtimePort } from './ports/realtime-port.mjs';
export { assertTransportPort } from './ports/transport-port.mjs';

// Domain
export { ConnectionStates, createConnectionStateMachine } from './domain/connection-state.mjs';
export { createReconnectionStrategy } from './domain/reconnection.mjs';
export { createHeartbeat } from './domain/heartbeat.mjs';
export { createTransportManager } from './domain/transport-manager.mjs';

// Adapters
export { createWebSocketTransport } from './adapters/websocket-transport.mjs';
export { createSseTransport } from './adapters/sse-transport.mjs';
export { createLongPollingTransport } from './adapters/long-polling-transport.mjs';
export { createWebRtcTransport } from './adapters/webrtc-transport.mjs';
export { createWsServerTransport } from './adapters/ws-server-transport.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
