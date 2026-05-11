/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proof for the cqrs bounded module — commands, queries, events, aggregates, ports, memory adapters, and the full round-trip.
 * @sidecar cqrs.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCommand,
  createQuery,
  createEvent,
  createAggregate,
  replayAggregate,
  assertCommandBusPort,
  assertQueryBusPort,
  assertEventStorePort,
  createMemoryCommandBus,
  createMemoryQueryBus,
  createMemoryEventStore,
} from '../../modules/cqrs/public-api.mjs';

describe('cqrs domain — command validation', () => {
  test('createCommand accepts a valid dot-separated type', () => {
    const cmd = createCommand({ type: 'order.place', payload: { amount: 100 } });
    assert.equal(cmd.type, 'order.place');
    assert.deepEqual(cmd.payload, { amount: 100 });
    assert.deepEqual(cmd.metadata, {});
  });

  test('createCommand accepts PascalCase.PascalCase types', () => {
    const cmd = createCommand({ type: 'Order.Place', payload: {} });
    assert.equal(cmd.type, 'Order.Place');
  });

  test('createCommand accepts metadata as a flat string map', () => {
    const cmd = createCommand({
      type: 'Order.Place',
      payload: { x: 1 },
      metadata: { tenantId: 'acme', userId: 'alice' },
    });
    assert.deepEqual(cmd.metadata, { tenantId: 'acme', userId: 'alice' });
  });

  test('createCommand rejects null/non-object input', () => {
    assert.throws(() => createCommand(null), TypeError);
    assert.throws(() => createCommand('nope'), TypeError);
    assert.throws(() => createCommand(42), TypeError);
  });

  test('createCommand rejects missing or malformed type', () => {
    assert.throws(() => createCommand({ payload: {} }), TypeError);
    assert.throws(() => createCommand({ type: '', payload: {} }), TypeError);
    assert.throws(() => createCommand({ type: 'noDot', payload: {} }), TypeError);
    assert.throws(() => createCommand({ type: '.leading', payload: {} }), TypeError);
    assert.throws(() => createCommand({ type: 'trailing.', payload: {} }), TypeError);
  });

  test('createCommand rejects non-object payload', () => {
    assert.throws(() => createCommand({ type: 'Order.Place', payload: null }), TypeError);
    assert.throws(() => createCommand({ type: 'Order.Place', payload: [] }), TypeError);
    assert.throws(() => createCommand({ type: 'Order.Place', payload: 'nope' }), TypeError);
  });

  test('createCommand rejects non-string metadata values', () => {
    assert.throws(
      () => createCommand({ type: 'Order.Place', payload: {}, metadata: { ok: 42 } }),
      TypeError,
    );
    assert.throws(
      () => createCommand({ type: 'Order.Place', payload: {}, metadata: ['nope'] }),
      TypeError,
    );
  });
});

describe('cqrs domain — query validation', () => {
  test('createQuery accepts a valid type and payload', () => {
    const q = createQuery({ type: 'order.get', payload: { id: 'ord-1' } });
    assert.equal(q.type, 'order.get');
    assert.deepEqual(q.payload, { id: 'ord-1' });
  });

  test('createQuery rejects null input', () => {
    assert.throws(() => createQuery(null), TypeError);
  });

  test('createQuery rejects malformed type', () => {
    assert.throws(() => createQuery({ type: 'noDot', payload: {} }), TypeError);
  });

  test('createQuery rejects non-object payload', () => {
    assert.throws(() => createQuery({ type: 'Order.Get', payload: null }), TypeError);
    assert.throws(() => createQuery({ type: 'Order.Get', payload: [] }), TypeError);
  });

  test('createQuery rejects non-string metadata values', () => {
    assert.throws(
      () => createQuery({ type: 'Order.Get', payload: {}, metadata: { ok: 1 } }),
      TypeError,
    );
  });
});

describe('cqrs domain — event validation', () => {
  test('createEvent accepts a valid Aggregate.Verbed type', () => {
    const ev = createEvent({
      type: 'Order.Placed',
      aggregateId: 'ord-1',
      payload: { amount: 100 },
    });
    assert.equal(ev.type, 'Order.Placed');
    assert.equal(ev.aggregateId, 'ord-1');
    assert.deepEqual(ev.payload, { amount: 100 });
  });

  test('createEvent rejects lowercase type parts', () => {
    assert.throws(
      () => createEvent({ type: 'order.placed', aggregateId: 'ord-1', payload: {} }),
      TypeError,
    );
  });

  test('createEvent rejects missing aggregateId', () => {
    assert.throws(
      () => createEvent({ type: 'Order.Placed', aggregateId: '', payload: {} }),
      TypeError,
    );
    assert.throws(() => createEvent({ type: 'Order.Placed', payload: {} }), TypeError);
  });

  test('createEvent rejects non-object payload', () => {
    assert.throws(
      () => createEvent({ type: 'Order.Placed', aggregateId: 'ord-1', payload: null }),
      TypeError,
    );
    assert.throws(
      () => createEvent({ type: 'Order.Placed', aggregateId: 'ord-1', payload: [] }),
      TypeError,
    );
  });

  test('createEvent rejects non-string metadata values', () => {
    assert.throws(
      () =>
        createEvent({
          type: 'Order.Placed',
          aggregateId: 'ord-1',
          payload: {},
          metadata: { ok: 42 },
        }),
      TypeError,
    );
  });
});

describe('cqrs domain — aggregate helpers', () => {
  const counterReducer = (state, event) => {
    if (event.type === 'Counter.Incremented') {
      return { total: state.total + event.payload.by };
    }
    return state;
  };

  test('createAggregate folds events and tracks pending', () => {
    const agg = createAggregate({
      id: 'counter',
      initialState: { total: 0 },
      reducer: counterReducer,
    });
    agg.apply(
      createEvent({ type: 'Counter.Incremented', aggregateId: 'counter', payload: { by: 3 } }),
    );
    agg.apply(
      createEvent({ type: 'Counter.Incremented', aggregateId: 'counter', payload: { by: 5 } }),
    );
    assert.deepEqual(agg.state, { total: 8 });
    assert.equal(agg.version, 2);
    assert.equal(agg.pending.length, 2);
  });

  test('createAggregate rejects missing id', () => {
    assert.throws(() => createAggregate({ initialState: {}, reducer: counterReducer }), TypeError);
  });

  test('createAggregate rejects non-function reducer', () => {
    assert.throws(() => createAggregate({ id: 'x', initialState: {}, reducer: 42 }), TypeError);
  });

  test('replayAggregate folds a sequence of events', () => {
    const events = [
      createEvent({ type: 'Counter.Incremented', aggregateId: 'counter', payload: { by: 1 } }),
      createEvent({ type: 'Counter.Incremented', aggregateId: 'counter', payload: { by: 2 } }),
      createEvent({ type: 'Counter.Incremented', aggregateId: 'counter', payload: { by: 4 } }),
    ];
    const result = replayAggregate('counter', { total: 0 }, counterReducer, events);
    assert.deepEqual(result.state, { total: 7 });
    assert.equal(result.version, 3);
    assert.equal(result.id, 'counter');
  });

  test('replayAggregate rejects non-array events', () => {
    assert.throws(() => replayAggregate('counter', { total: 0 }, counterReducer, null), TypeError);
  });
});

describe('cqrs port — assertCommandBusPort', () => {
  test('accepts the memory command bus', () => {
    assert.doesNotThrow(() => assertCommandBusPort(createMemoryCommandBus()));
  });

  test('rejects non-objects', () => {
    assert.throws(() => assertCommandBusPort(null), TypeError);
    assert.throws(() => assertCommandBusPort(42), TypeError);
  });

  test('rejects adapters missing methods', () => {
    assert.throws(
      () => assertCommandBusPort({ register: () => {}, dispatch: () => {} }),
      TypeError,
    );
    assert.throws(() => assertCommandBusPort({ dispatch: () => {}, clear: () => {} }), TypeError);
  });
});

describe('cqrs port — assertQueryBusPort', () => {
  test('accepts the memory query bus', () => {
    assert.doesNotThrow(() => assertQueryBusPort(createMemoryQueryBus()));
  });

  test('rejects non-objects', () => {
    assert.throws(() => assertQueryBusPort(null), TypeError);
  });

  test('rejects adapters missing methods', () => {
    assert.throws(() => assertQueryBusPort({ register: () => {}, ask: () => {} }), TypeError);
    assert.throws(() => assertQueryBusPort({ ask: () => {}, clear: () => {} }), TypeError);
  });
});

describe('cqrs port — assertEventStorePort', () => {
  test('accepts the memory event store', () => {
    assert.doesNotThrow(() => assertEventStorePort(createMemoryEventStore()));
  });

  test('rejects non-objects', () => {
    assert.throws(() => assertEventStorePort(null), TypeError);
  });

  test('rejects adapters missing methods', () => {
    assert.throws(
      () =>
        assertEventStorePort({
          append: () => {},
          load: () => {},
          loadAll: () => {},
          subscribe: () => {},
          // missing clear
        }),
      TypeError,
    );
  });
});

describe('cqrs adapter — memory command bus', () => {
  test('register + dispatch round-trips a handler', async () => {
    const bus = createMemoryCommandBus({ now: () => 1000 });
    bus.register('Order.Place', async (cmd) => ({ ok: true, type: cmd.type }));
    const result = await bus.dispatch({ type: 'Order.Place', payload: { amount: 100 } });
    assert.deepEqual(result, { ok: true, type: 'Order.Place' });
  });

  test('duplicate register throws', () => {
    const bus = createMemoryCommandBus();
    bus.register('Order.Place', async () => {});
    assert.throws(() => bus.register('Order.Place', async () => {}), TypeError);
  });

  test('dispatch throws when no handler is registered', async () => {
    const bus = createMemoryCommandBus();
    await assert.rejects(() => bus.dispatch({ type: 'Order.Missing', payload: {} }), TypeError);
  });

  test('handler receives stamped command with id + createdAt and the context', async () => {
    const bus = createMemoryCommandBus({ now: () => 1700000000 });
    let received = null;
    let ctx = null;
    bus.register('Order.Place', async (cmd, context) => {
      received = cmd;
      ctx = context;
      return cmd.id;
    });
    const result = await bus.dispatch({ type: 'Order.Place', payload: { amount: 100 } });
    assert.equal(result, 'cmd_1');
    assert.equal(received.id, 'cmd_1');
    assert.equal(received.createdAt, 1700000000);
    assert.equal(typeof ctx.now, 'function');
  });

  test('handler receives the configured event store in context', async () => {
    const eventStore = createMemoryEventStore();
    const bus = createMemoryCommandBus({ eventStore });
    let seen = null;
    bus.register('Order.Place', async (_cmd, context) => {
      seen = context.eventStore;
    });
    await bus.dispatch({ type: 'Order.Place', payload: {} });
    assert.equal(seen, eventStore);
  });

  test('clear empties the registry', async () => {
    const bus = createMemoryCommandBus();
    bus.register('Order.Place', async () => {});
    bus.clear();
    await assert.rejects(() => bus.dispatch({ type: 'Order.Place', payload: {} }), TypeError);
  });
});

describe('cqrs adapter — memory query bus', () => {
  test('register + ask round-trips a handler', async () => {
    const bus = createMemoryQueryBus();
    bus.register('Order.Get', async (q) => ({ id: q.payload.id, found: true }));
    const result = await bus.ask({ type: 'Order.Get', payload: { id: 'ord-1' } });
    assert.deepEqual(result, { id: 'ord-1', found: true });
  });

  test('duplicate register throws', () => {
    const bus = createMemoryQueryBus();
    bus.register('Order.Get', async () => {});
    assert.throws(() => bus.register('Order.Get', async () => {}), TypeError);
  });

  test('ask throws with no handler', async () => {
    const bus = createMemoryQueryBus();
    await assert.rejects(() => bus.ask({ type: 'Order.Missing', payload: {} }), TypeError);
  });

  test('handler receives stamped query', async () => {
    const bus = createMemoryQueryBus({ now: () => 42 });
    let received = null;
    bus.register('Order.Get', async (q) => {
      received = q;
    });
    await bus.ask({ type: 'Order.Get', payload: {} });
    assert.equal(received.id, 'qry_1');
    assert.equal(received.createdAt, 42);
  });

  test('clear empties the registry', async () => {
    const bus = createMemoryQueryBus();
    bus.register('Order.Get', async () => {});
    bus.clear();
    await assert.rejects(() => bus.ask({ type: 'Order.Get', payload: {} }), TypeError);
  });
});

describe('cqrs adapter — memory event store', () => {
  test('append stamps id, sequence, recordedAt', async () => {
    const store = createMemoryEventStore({ now: () => 1700000000 });
    const stamped = await store.append('ord-1', 0, [
      createEvent({ type: 'Order.Placed', aggregateId: 'ord-1', payload: { amount: 100 } }),
    ]);
    assert.equal(stamped.length, 1);
    assert.equal(stamped[0].id, 'evt_1');
    assert.equal(stamped[0].sequence, 1);
    assert.equal(stamped[0].recordedAt, 1700000000);
  });

  test('load returns the stream in order', async () => {
    const store = createMemoryEventStore();
    await store.append('ord-1', 0, [
      createEvent({ type: 'Order.Placed', aggregateId: 'ord-1', payload: {} }),
    ]);
    await store.append('ord-1', 1, [
      createEvent({ type: 'Order.Shipped', aggregateId: 'ord-1', payload: {} }),
    ]);
    const events = await store.load('ord-1');
    assert.equal(events.length, 2);
    assert.equal(events[0].type, 'Order.Placed');
    assert.equal(events[1].type, 'Order.Shipped');
  });

  test('loadAll returns a flat sequence filterable by aggregateId', async () => {
    const store = createMemoryEventStore();
    await store.append('a', 0, [
      createEvent({ type: 'Order.Placed', aggregateId: 'a', payload: {} }),
    ]);
    await store.append('b', 0, [
      createEvent({ type: 'Order.Placed', aggregateId: 'b', payload: {} }),
    ]);
    assert.equal(store.loadAll().length, 2);
    assert.equal(store.loadAll({ aggregateId: 'a' }).length, 1);
    assert.equal(store.loadAll({ type: 'Order.Placed' }).length, 2);
    assert.equal(store.loadAll({ type: 'Order.Missing' }).length, 0);
  });

  test('append with wrong expectedVersion throws a version conflict', async () => {
    const store = createMemoryEventStore();
    await store.append('ord-1', 0, [
      createEvent({ type: 'Order.Placed', aggregateId: 'ord-1', payload: {} }),
    ]);
    await assert.rejects(
      () =>
        store.append('ord-1', 0, [
          createEvent({ type: 'Order.Shipped', aggregateId: 'ord-1', payload: {} }),
        ]),
      /version conflict/i,
    );
  });

  test('subscribe receives events after a successful append', async () => {
    const store = createMemoryEventStore();
    const seen = [];
    const unsubscribe = store.subscribe((event) => seen.push(event.type));
    await store.append('ord-1', 0, [
      createEvent({ type: 'Order.Placed', aggregateId: 'ord-1', payload: {} }),
    ]);
    assert.deepEqual(seen, ['Order.Placed']);
    unsubscribe();
    await store.append('ord-1', 1, [
      createEvent({ type: 'Order.Shipped', aggregateId: 'ord-1', payload: {} }),
    ]);
    assert.deepEqual(seen, ['Order.Placed']); // unsubscribed — no new notification
  });

  test('listener exceptions are swallowed without breaking append', async () => {
    const store = createMemoryEventStore();
    store.subscribe(() => {
      throw new Error('broken listener');
    });
    const stamped = await store.append('ord-1', 0, [
      createEvent({ type: 'Order.Placed', aggregateId: 'ord-1', payload: {} }),
    ]);
    assert.equal(stamped.length, 1);
  });

  test('clear resets streams and sequence counter', async () => {
    const store = createMemoryEventStore();
    await store.append('ord-1', 0, [
      createEvent({ type: 'Order.Placed', aggregateId: 'ord-1', payload: {} }),
    ]);
    store.clear();
    assert.equal(store.loadAll().length, 0);
    const stamped = await store.append('ord-1', 0, [
      createEvent({ type: 'Order.Placed', aggregateId: 'ord-1', payload: {} }),
    ]);
    assert.equal(stamped[0].sequence, 1);
  });

  test('append rejects empty aggregateId', async () => {
    const store = createMemoryEventStore();
    await assert.rejects(() => store.append('', 0, []), TypeError);
  });
});

describe('cqrs integration — full Order round-trip', () => {
  test('command appends event, query replays aggregate state', async () => {
    const eventStore = createMemoryEventStore({ now: () => 1000 });
    const commandBus = createMemoryCommandBus({ eventStore });
    const queryBus = createMemoryQueryBus();

    const orderReducer = (state, event) => {
      if (event.type === 'Order.Placed') {
        return { ...state, placed: true, amount: event.payload.amount };
      }
      return state;
    };

    commandBus.register('Order.Place', async (command, { eventStore }) => {
      const { orderId, amount } = command.payload;
      await eventStore.append(orderId, 0, [
        createEvent({ type: 'Order.Placed', aggregateId: orderId, payload: { amount } }),
      ]);
      return { orderId };
    });

    queryBus.register('Order.Get', async (query) => {
      const events = await eventStore.load(query.payload.orderId);
      const agg = replayAggregate(
        query.payload.orderId,
        { placed: false, amount: 0 },
        orderReducer,
        events,
      );
      return agg.state;
    });

    const placed = await commandBus.dispatch({
      type: 'Order.Place',
      payload: { orderId: 'ord-1', amount: 1999 },
      metadata: { tenantId: 'acme' },
    });
    assert.deepEqual(placed, { orderId: 'ord-1' });

    const state = await queryBus.ask({
      type: 'Order.Get',
      payload: { orderId: 'ord-1' },
    });
    assert.deepEqual(state, { placed: true, amount: 1999 });

    const allEvents = eventStore.loadAll();
    assert.equal(allEvents.length, 1);
    assert.equal(allEvents[0].type, 'Order.Placed');
  });
});
