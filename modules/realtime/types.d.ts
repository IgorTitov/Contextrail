/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose TypeScript type definitions for the realtime module.
 * @sidecar types.d.ts.header.md
 * @layer module | @hex _none_ | @ctx realtime
 * @public false
 * @edit careful
 */

/**
 * Type declarations for the realtime bounded module.
 */

// --- Connection States ---

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';

export declare const ConnectionStates: {
  readonly DISCONNECTED: 'disconnected';
  readonly CONNECTING: 'connecting';
  readonly CONNECTED: 'connected';
  readonly RECONNECTING: 'reconnecting';
  readonly FAILED: 'failed';
};

export interface ConnectionStateMachine {
  getState(): ConnectionState;
  transition(to: ConnectionState): void;
  onStateChange(cb: (state: ConnectionState) => void): void;
}

export declare function createConnectionStateMachine(
  initial?: ConnectionState,
): ConnectionStateMachine;

// --- Reconnection ---

export interface ReconnectionOptions {
  baseDelay?: number;
  multiplier?: number;
  maxDelay?: number;
  jitter?: boolean;
  maxAttempts?: number;
}

export interface ReconnectionStrategy {
  readonly attempt: number;
  nextDelay(): number;
  reset(): void;
}

export declare function createReconnectionStrategy(
  options?: ReconnectionOptions,
): ReconnectionStrategy;

// --- Heartbeat ---

export interface HeartbeatOptions {
  interval?: number;
  timeout?: number;
}

export interface Heartbeat {
  start(sendFn: () => void, onTimeout: () => void): void;
  stop(): void;
  receivedPong(): void;
}

export declare function createHeartbeat(options?: HeartbeatOptions): Heartbeat;

// --- Transport Port ---

export interface TransportPort {
  open(url: string, options?: Record<string, unknown>): Promise<void>;
  close(options?: Record<string, unknown>): Promise<void>;
  send(data: unknown): void;
  onMessage(callback: (data: unknown) => void): void;
  onStateChange(callback: (state: string) => void): void;
  getState(): string;
  isSupported(): boolean;
}

export declare function assertTransportPort(adapter: unknown): asserts adapter is TransportPort;

// --- Realtime Port ---

export interface RealtimePort {
  connect(url: string, options?: Record<string, unknown>): Promise<void>;
  disconnect(): Promise<void>;
  send(channel: string, data: unknown): void;
  subscribe(channel: string, callback: (data: unknown) => void): void;
  unsubscribe(channel: string, callback?: (data: unknown) => void): void;
  onConnectionChange(callback: (state: string) => void): void;
  getState(): string;
}

export declare function assertRealtimePort(adapter: unknown): asserts adapter is RealtimePort;

// --- Transport Adapters ---

export declare function createWebSocketTransport(): TransportPort;

export interface SseTransportOptions {
  sendEndpoint?: string;
}

export declare function createSseTransport(options?: SseTransportOptions): TransportPort;

export interface LongPollingTransportOptions {
  pollEndpoint?: string;
  sendEndpoint?: string;
  timeout?: number;
  retryDelay?: number;
}

export declare function createLongPollingTransport(
  options?: LongPollingTransportOptions,
): TransportPort;

export declare function createWebRtcTransport(
  signalingFn: (signal: { type: string; payload: unknown }) => Promise<unknown>,
): TransportPort;

// --- Transport Manager ---

export interface TransportManagerOptions {
  reconnection?: ReconnectionOptions;
  heartbeat?: HeartbeatOptions;
  autoReconnect?: boolean;
}

export declare function createTransportManager(
  transports: TransportPort[],
  options?: TransportManagerOptions,
): RealtimePort;

// --- Messages ---

export declare function t(key: string, params?: Record<string, string | number>): string;
export declare function setLocale(locale: string): void;
export declare function getLocale(): string;
export declare function registerLocale(locale: string, messages: Record<string, string>): void;
export declare function resetLocale(): void;
