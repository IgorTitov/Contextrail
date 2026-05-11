/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose CQRS demo routes: dispatch command, ask query, list events via the cqrs public API.
 * @sidecar cqrs.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-001
/**
 * CQRS demo routes — exercise the cqrs module's public API from a host
 * server using the in-memory command bus, query bus, and event store.
 * Real deployments should swap the adapters for persistent ones (SQL,
 * Kafka, EventStoreDB) at composition time without touching these routes.
 *
 * GET /api/cqrs/dispatch?type=Counter.Increment&by=3  → dispatch a command
 * GET /api/cqrs/ask?type=Counter.Get&id=counter       → ask a query
 * GET /api/cqrs/events                                 → list all recorded events
 */

/**
 * Build a payload object from the query params other than `type`. Values
 * are parsed as numbers when they look numeric so the demo Counter
 * handler receives `{ by: 3 }` rather than `{ by: '3' }`.
 *
 * @param {URLSearchParams} query
 * @returns {Record<string, unknown>}
 */
function buildPayload(query) {
  /** @type {Record<string, unknown>} */
  const payload = {};
  for (const [key, value] of query.entries()) {
    if (key === 'type') continue;
    if (value !== '' && !Number.isNaN(Number(value))) {
      payload[key] = Number(value);
    } else {
      payload[key] = value;
    }
  }
  return payload;
}

/**
 * @param {{ query: URLSearchParams }} req
 * @param {object} ctx
 */
export async function dispatchCommandHandler(req, ctx) {
  const type = req.query.get('type');
  if (!type) throw new TypeError('type is required');
  const payload = buildPayload(req.query);
  const result = await ctx.commandBus.dispatch({ type, payload });
  return { ok: true, result };
}

/**
 * @param {{ query: URLSearchParams }} req
 * @param {object} ctx
 */
export async function askQueryHandler(req, ctx) {
  const type = req.query.get('type');
  if (!type) throw new TypeError('type is required');
  const payload = buildPayload(req.query);
  const result = await ctx.queryBus.ask({ type, payload });
  return { ok: true, result };
}

/**
 * @param {{ query: URLSearchParams }} _req
 * @param {object} ctx
 */
export async function listEventsHandler(_req, ctx) {
  const events = ctx.eventStore.loadAll();
  return {
    total: events.length,
    events: events.map((event) => ({
      id: event.id,
      sequence: event.sequence,
      type: event.type,
      aggregateId: event.aggregateId,
      payload: event.payload,
      recordedAt: event.recordedAt,
    })),
  };
}
