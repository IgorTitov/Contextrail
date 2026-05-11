/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure monitoring event, metric, and span domain for the monitoring module.
 * @sidecar monitoring.mjs.header.md
 * @layer domain | @hex _none_ | @ctx monitoring
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Pure domain for monitoring. Three primitives every backend speaks:
 * events (exceptions + messages), metrics (counter/gauge/histogram),
 * and spans (a start/end pair with status). All time comes from the
 * caller; all records are immutable; redaction and sampling are pure.
 *
 * @typedef {'debug' | 'info' | 'warning' | 'error' | 'fatal'} Severity
 * @typedef {'counter' | 'gauge' | 'histogram'} MetricKind
 *
 * @typedef {object} MonitoringContext
 * @property {Record<string, unknown>} [tags]
 * @property {Record<string, unknown>} [extra]
 * @property {string} [user]
 *
 * @typedef {{ kind: 'exception', timestamp: number, severity: Severity, name: string, message: string, stack?: string, context: MonitoringContext }} ExceptionEvent
 * @typedef {{ kind: 'message', timestamp: number, severity: Severity, message: string, context: MonitoringContext }} MessageEvent
 * @typedef {{ kind: MetricKind, name: string, value: number, timestamp: number, tags: Record<string, string> }} Metric
 * @typedef {{ id: string, name: string, startedAt: number, endedAt: number, durationMs: number, status: 'ok' | 'error', attributes: Record<string, unknown> }} Span
 * @typedef {{ redactKeys?: string[] }} RedactConfig
 */

const VALID_SEVERITIES = new Set(['debug', 'info', 'warning', 'error', 'fatal']);
const VALID_METRIC_KINDS = new Set(['counter', 'gauge', 'histogram']);
const REDACTED = '[REDACTED]';

/** @param {Record<string, unknown> | undefined} record @param {string[]} redactKeys @returns {Record<string, unknown>} */
export function redact(record, redactKeys = []) {
  if (!record || typeof record !== 'object') return {};
  const set = new Set(redactKeys.map((k) => k.toLowerCase()));
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, value] of Object.entries(record)) {
    out[key] = set.has(key.toLowerCase()) ? REDACTED : value;
  }
  return out;
}

/** @param {MonitoringContext | undefined} context @param {string[]} redactKeys @returns {MonitoringContext} */
export function redactContext(context, redactKeys = []) {
  const ctx = context ?? {};
  /** @type {MonitoringContext} */
  const out = {
    tags: redact(ctx.tags, redactKeys),
    extra: redact(ctx.extra, redactKeys),
  };
  if (ctx.user != null) out.user = String(ctx.user);
  return out;
}

/** Deterministic FNV-1a hash based sampling against a 0..1 rate. @param {string} id @param {number} sampleRate @returns {boolean} */
export function shouldSample(id, sampleRate) {
  if (typeof sampleRate !== 'number' || Number.isNaN(sampleRate)) return true;
  if (sampleRate >= 1) return true;
  if (sampleRate <= 0) return false;
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const normalized = ((hash >>> 0) % 1_000_000) / 1_000_000;
  return normalized < sampleRate;
}

/** @param {unknown} error @param {number} now @param {MonitoringContext} [context] @param {RedactConfig} [redactConfig] @returns {ExceptionEvent} */
export function buildExceptionEvent(error, now, context, redactConfig) {
  if (typeof now !== 'number') {
    throw new TypeError(t('monitoring.event.invalid_timestamp'));
  }
  const redactKeys = redactConfig?.redactKeys ?? [];
  const e = /** @type {{ name?: string; message?: string; stack?: string }} */ (
    error && typeof error === 'object' ? error : {}
  );
  return {
    kind: 'exception',
    timestamp: now,
    severity: 'error',
    name: typeof e.name === 'string' && e.name.length > 0 ? e.name : 'Error',
    message: typeof e.message === 'string' && e.message.length > 0 ? e.message : String(error),
    stack: typeof e.stack === 'string' ? e.stack : undefined,
    context: redactContext(context, redactKeys),
  };
}

/** @param {string} message @param {Severity} severity @param {number} now @param {MonitoringContext} [context] @param {RedactConfig} [redactConfig] @returns {MessageEvent} */
export function buildMessageEvent(message, severity, now, context, redactConfig) {
  if (typeof message !== 'string' || message.length === 0) {
    throw new TypeError(t('monitoring.event.invalid_message'));
  }
  if (!VALID_SEVERITIES.has(severity)) {
    throw new TypeError(t('monitoring.event.invalid_severity'));
  }
  if (typeof now !== 'number') {
    throw new TypeError(t('monitoring.event.invalid_timestamp'));
  }
  return {
    kind: 'message',
    timestamp: now,
    severity,
    message,
    context: redactContext(context, redactConfig?.redactKeys ?? []),
  };
}

/** @param {MetricKind} kind @param {string} name @param {number} value @param {number} now @param {Record<string, unknown>} [tags] @returns {Metric} */
export function buildMetric(kind, name, value, now, tags) {
  if (!VALID_METRIC_KINDS.has(kind)) {
    throw new TypeError(t('monitoring.metric.invalid_kind'));
  }
  if (typeof name !== 'string' || name.length === 0) {
    throw new TypeError(t('monitoring.metric.invalid_name'));
  }
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new TypeError(t('monitoring.metric.invalid_value'));
  }
  if (typeof now !== 'number') {
    throw new TypeError(t('monitoring.event.invalid_timestamp'));
  }
  /** @type {Record<string, string>} */
  const stringTags = {};
  if (tags && typeof tags === 'object') {
    for (const [k, v] of Object.entries(tags)) {
      stringTags[k] = String(v);
    }
  }
  return { kind, name, value, timestamp: now, tags: stringTags };
}

/** @param {{ id: string; name: string; startedAt: number; attributes?: Record<string, unknown> }} pending @param {number} endedAt @param {'ok' | 'error'} [status='ok'] @returns {Span} */
export function finalizeSpan(pending, endedAt, status = 'ok') {
  if (!pending || typeof pending !== 'object') {
    throw new TypeError(t('monitoring.span.invalid_pending'));
  }
  if (typeof pending.startedAt !== 'number' || typeof endedAt !== 'number') {
    throw new TypeError(t('monitoring.event.invalid_timestamp'));
  }
  if (status !== 'ok' && status !== 'error') {
    throw new TypeError(t('monitoring.span.invalid_status'));
  }
  const duration = Math.max(0, endedAt - pending.startedAt);
  return {
    id: pending.id,
    name: pending.name,
    startedAt: pending.startedAt,
    endedAt,
    durationMs: duration,
    status,
    attributes: { ...(pending.attributes ?? {}) },
  };
}
