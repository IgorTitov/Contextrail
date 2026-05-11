<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the cqrs hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx cqrs
@public false
@edit careful -->

# cqrs

Hexagonal CQRS (Command Query Responsibility Segregation) module — pure `Command`, `Query`, and `DomainEvent` value objects, an optional event-sourcing `Aggregate` helper with `replayAggregate`, and three narrow ports (`CommandBusPort`, `QueryBusPort`, `EventStorePort`) with zero-dependency in-memory adapters. Drop-in primitive for any module that wants to separate writes from reads and keep a durable event log. Zero external dependencies.

## Why

CQRS separates the write model (commands that change state) from the read model (queries that return state) so the two sides can evolve independently. Most Node templates either skip CQRS entirely or bundle it with a heavy framework (NestJS, MediatR). This module ships the minimum proving shape as pure JavaScript:

- a **command bus** validates and dispatches write intents to handlers
- a **query bus** routes read intents to projection-backed handlers
- an **event store** persists the full history of domain events with optimistic concurrency and replay

Handlers are plain functions. Commands, queries, and events are plain immutable objects. The domain is framework-free and runs in any JavaScript runtime (browser, worker, Node, edge). Adapters swap in without touching the domain.

`modules/cqrs/` is **orthogonal** to `modules/event-bus/`:

- `event-bus` is a transient in-process pub/sub primitive for cross-module notifications. No history, no replay, no concurrency control.
- `cqrs` is the write-model / read-model split with a durable event **store** (not a bus). Events are facts that persist, feed projections, and can be replayed to rebuild state.

Use both together when appropriate: CQRS handlers can publish to the event-bus for loosely-coupled cross-module side effects while keeping the authoritative write log in the event store.

Tenancy metadata (`tenantId`, `correlationId`, `userId`) travels on every command, query, and event via the `metadata` field, so the freshly-shipped `modules/tenancy/` can scope CQRS flows without the buses needing to know about multi-tenancy at all.

## Structure

```text
modules/cqrs/
├── domain/
│   ├── command.mjs             # createCommand — pure validation
│   ├── query.mjs               # createQuery — pure validation
│   ├── event.mjs               # createEvent — pure validation
│   └── aggregate.mjs           # createAggregate + replayAggregate
├── ports/
│   ├── command-bus-port.mjs    # CommandBusPort + assertCommandBusPort
│   ├── query-bus-port.mjs      # QueryBusPort + assertQueryBusPort
│   └── event-store-port.mjs    # EventStorePort + assertEventStorePort
├── adapters/
│   ├── memory-command-bus.mjs  # Map-backed command bus with id/createdAt stamping
│   ├── memory-query-bus.mjs    # Map-backed query bus
│   └── memory-event-store.mjs  # Stream-per-aggregate + optimistic concurrency + subscribers
├── public-api.mjs              # Cross-module entry point
├── messages.mjs                # i18n keys
├── manifest.json               # Module metadata + capability surface
└── README.md
```

## Hexagonal layers

| Layer        | Folder           | Rule                                                                     |
| ------------ | ---------------- | ------------------------------------------------------------------------ |
| **Domain**   | `domain/`        | Pure functions, no I/O, no framework imports.                            |
| **Ports**    | `ports/`         | Three port contracts: CommandBus, QueryBus, EventStore.                  |
| **Adapters** | `adapters/`      | In-memory CommandBus + QueryBus + EventStore.                            |
| **Public**   | `public-api.mjs` | The only file other modules may import.                                  |

## Usage

### Register a write handler that appends to the event store

```javascript
import {
  createMemoryCommandBus,
  createMemoryEventStore,
  createEvent,
  assertCommandBusPort,
  assertEventStorePort,
} from './modules/cqrs/public-api.mjs';

const eventStore = createMemoryEventStore();
const commandBus = createMemoryCommandBus({ eventStore });
assertEventStorePort(eventStore);
assertCommandBusPort(commandBus);

commandBus.register('Order.Place', async (command, { eventStore }) => {
  const { orderId, amount } = command.payload;
  await eventStore.append(orderId, 0, [
    createEvent({
      type: 'Order.Placed',
      aggregateId: orderId,
      payload: { amount },
    }),
  ]);
  return { orderId };
});

const result = await commandBus.dispatch({
  type: 'Order.Place',
  payload: { orderId: 'ord-1', amount: 1999 },
  metadata: { tenantId: 'acme', userId: 'alice' },
});
// → { orderId: 'ord-1' }
```

### Register a read handler that replays events

```javascript
import {
  createMemoryQueryBus,
  replayAggregate,
  assertQueryBusPort,
} from './modules/cqrs/public-api.mjs';

const queryBus = createMemoryQueryBus();
assertQueryBusPort(queryBus);

const orderReducer = (state, event) => {
  if (event.type === 'Order.Placed') {
    return { ...state, placed: true, amount: event.payload.amount };
  }
  return state;
};

queryBus.register('Order.Get', async (query) => {
  const events = await eventStore.load(query.payload.orderId);
  const agg = replayAggregate(query.payload.orderId, { placed: false }, orderReducer, events);
  return agg.state;
});

const state = await queryBus.ask({
  type: 'Order.Get',
  payload: { orderId: 'ord-1' },
});
// → { placed: true, amount: 1999 }
```

### Optimistic concurrency with the event store

```javascript
// Append the first event with expectedVersion=0
await eventStore.append('ord-1', 0, [
  createEvent({ type: 'Order.Placed', aggregateId: 'ord-1', payload: {} }),
]);

// A concurrent writer still thinks the stream is empty — their append fails
await eventStore.append('ord-1', 0, [
  createEvent({ type: 'Order.Shipped', aggregateId: 'ord-1', payload: {} }),
]);
// → throws: cqrs event store version conflict for aggregate "ord-1": expected 0, actual 1.
```

### Event-sourced aggregate replay

```javascript
import { replayAggregate } from './modules/cqrs/public-api.mjs';

const counterReducer = (state, event) => {
  if (event.type === 'Counter.Incremented') {
    return { total: state.total + event.payload.by };
  }
  return state;
};

const events = await eventStore.load('counter');
const { state, version } = replayAggregate('counter', { total: 0 }, counterReducer, events);
// state === { total: <sum of all Counter.Incremented 'by' values> }
// version === events.length
```

## Rules

- Domain is pure. No I/O, no framework imports, no timers.
- `createCommand`, `createQuery`, and `createEvent` return shape-validated records. The adapters stamp `id`, `createdAt`, `sequence`, and `recordedAt`.
- Command handlers receive `(command, { now, eventStore? })`. Query handlers receive `(query, { now })` — no event store, by convention.
- The memory event store rejects `append` with a mismatched `expectedVersion` — this is the optimistic-concurrency seam for real adapters.
- Listener exceptions in `subscribe(...)` are swallowed so a broken subscriber cannot corrupt the append path.
- Cross-module consumers import from `public-api.mjs` only. Deep imports are forbidden.
- All user-facing copy uses i18n keys via `messages.mjs`.

## Tests

- `tests/unit/cqrs.test.mjs` — proves command/query/event validation, aggregate replay, port assertions, memory command bus + query bus + event store lifecycles, optimistic concurrency, subscribers, and the full CQRS round-trip (register command handler → append event → ask query → replay state).
- `tests/contract/cqrs-hex-contract.test.mjs` — proves the hex folder structure and public-api surface.
