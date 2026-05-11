/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose TypeScript type definitions for the analytics module.
 * @sidecar types.d.ts.header.md
 * @layer module | @hex _none_ | @ctx analytics
 * @public false
 * @edit careful
 */

/**
 * Type declarations for the analytics bounded module.
 */

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
}

export interface ConsentState {
  analytics: boolean;
  behavioral: boolean;
}

export interface SessionInfo {
  sessionId: string;
  startedAt: number;
  pageViews: number;
  lastActivity: number;
}

export interface BehavioralEvent {
  type: 'click' | 'scroll' | 'visibility' | 'mouse';
  data: Record<string, any>;
  timestamp: number;
}

export interface MouseSample {
  x: number;
  y: number;
  viewportWidth: number;
  viewportHeight: number;
  timestamp: number;
}

export interface AnalyticsPort {
  track(eventName: string, properties?: Record<string, any>): void;
  identify(userId: string, traits?: Record<string, any>): void;
  page(pageName?: string, properties?: Record<string, any>): void;
  setProperties(properties: Record<string, any>): void;
  reset(): void;
  getConsent(): ConsentState;
  setConsent(consent: Partial<ConsentState>): void;
}

export function assertAnalyticsPort(adapter: unknown): asserts adapter is AnalyticsPort;

export function createSessionManager(options?: {
  timeout?: number;
}): {
  getSession(): SessionInfo;
  touch(): void;
  isExpired(): boolean;
  newSession(): void;
  incrementPageViews(): void;
};

export function isConsentGranted(consent: ConsentState, category: 'analytics' | 'behavioral'): boolean;
export function respectsDoNotTrack(): boolean;
export function createDefaultConsent(): ConsentState;

export function createMouseCollector(options?: {
  sampleInterval?: number;
  flushFn?: (samples: MouseSample[]) => void;
  batchSize?: number;
}): {
  start(): void;
  stop(): void;
  destroy(): void;
  getPendingCount(): number;
};

export function createAnalyticsConsoleAdapter(options?: {
  initialConsent?: Partial<ConsentState>;
}): AnalyticsPort;

export function createAnalyticsNoOpAdapter(): AnalyticsPort;

export function createBehavioralAdapter(
  innerPort: AnalyticsPort,
  options?: {
    scrollThresholds?: number[];
    clickDebounceMs?: number;
    visibilityThreshold?: number;
    scrollDebounceMs?: number;
  },
): {
  startTracking(): void;
  stopTracking(): void;
  observe(element: Element): void;
  unobserve(element: Element): void;
  destroy(): void;
  isTracking(): boolean;
};
