/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit-test every public behavior of the event-bus module: port assertion, memory adapter (on, off, emit, listenerCount, clear), handler isolation, and error cases.
 * @sidecar event-bus.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the event-bus module.
 *
 * SpecRefs: TPL-044; TPL-045; TPL-046; TPL-047
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertEventBusPort,
  createMemoryEventBus,
  createNodeEventBus,
} from '../../modules/event-bus/public-api.mjs';

/* -- EventBusPort contract assertion (TPL-046) -- */

describe('event-bus port -- assertEventBusPort()', () => {
  test('accepts a conforming adapter', () => {
    const bus = createMemoryEventBus();
    assert.doesNotThrow(() => assertEventBusPort(bus));
  });

  test('throws for null', () => {
    assert.throws(() => assertEventBusPort(null), TypeError);
  });

  test('throws for missing on()', () => {
    assert.throws(
      () =>
        assertEventBusPort({
          off: () => {},
          emit: () => {},
          listenerCount: () => 0,
          clear: () => {},
        }),
      TypeError,
    );
  });

  test('throws for missing emit()', () => {
    assert.throws(
      () =>
        assertEventBusPort({
          on: () => {},
          off: () => {},
          listenerCount: () => 0,
          clear: () => {},
        }),
      TypeError,
    );
  });

  test('throws for missing clear()', () => {
    assert.throws(
      () =>
        assertEventBusPort({
          on: () => {},
          off: () => {},
          emit: () => {},
          listenerCount: () => 0,
        }),
      TypeError,
    );
  });
});

/* -- Memory event bus adapter (TPL-045) -- */

describe('event-bus adapter -- memoryEventBus', () => {
  let bus;

  beforeEach(() => {
    bus = createMemoryEventBus();
  });

  test('satisfies the port contract', () => {
    assert.doesNotThrow(() => assertEventBusPort(bus));
  });

  test('listenerCount returns 0 for unknown event', () => {
    assert.equal(bus.listenerCount('unknown'), 0);
  });

  test('on + emit delivers event to handler', () => {
    let received = null;
    bus.on('test', (data) => {
      received = data;
    });
    bus.emit('test', 'hello');
    assert.equal(received, 'hello');
  });

  test('emit delivers to multiple handlers', () => {
    const calls = [];
    bus.on('multi', (v) => calls.push(`a:${v}`));
    bus.on('multi', (v) => calls.push(`b:${v}`));
    bus.emit('multi', 1);
    assert.deepEqual(calls, ['a:1', 'b:1']);
  });

  test('emit with multiple args', () => {
    let args = [];
    bus.on('args', (...a) => {
      args = a;
    });
    bus.emit('args', 1, 2, 3);
    assert.deepEqual(args, [1, 2, 3]);
  });

  test('off removes a handler', () => {
    let count = 0;
    const handler = () => {
      count++;
    };
    bus.on('evt', handler);
    bus.emit('evt');
    assert.equal(count, 1);
    bus.off('evt', handler);
    bus.emit('evt');
    assert.equal(count, 1);
  });

  test('off is silent for unknown event', () => {
    assert.doesNotThrow(() => bus.off('nope', () => {}));
  });

  test('off is silent for unregistered handler', () => {
    bus.on('evt', () => {});
    assert.doesNotThrow(() => bus.off('evt', () => {}));
  });

  test('listenerCount tracks handlers', () => {
    const h1 = () => {};
    const h2 = () => {};
    bus.on('count', h1);
    assert.equal(bus.listenerCount('count'), 1);
    bus.on('count', h2);
    assert.equal(bus.listenerCount('count'), 2);
    bus.off('count', h1);
    assert.equal(bus.listenerCount('count'), 1);
  });

  test('same handler registered twice is only added once', () => {
    const handler = () => {};
    bus.on('dup', handler);
    bus.on('dup', handler);
    assert.equal(bus.listenerCount('dup'), 1);
  });

  test('clear removes all listeners', () => {
    bus.on('a', () => {});
    bus.on('b', () => {});
    bus.clear();
    assert.equal(bus.listenerCount('a'), 0);
    assert.equal(bus.listenerCount('b'), 0);
  });

  test('emit for event with no listeners is silent', () => {
    assert.doesNotThrow(() => bus.emit('nobody'));
  });

  test('on throws for non-function handler', () => {
    assert.throws(() => bus.on('evt', 'not-a-function'), TypeError);
  });

  test('events are isolated between names', () => {
    let aCount = 0;
    let bCount = 0;
    bus.on('a', () => {
      aCount++;
    });
    bus.on('b', () => {
      bCount++;
    });
    bus.emit('a');
    assert.equal(aCount, 1);
    assert.equal(bCount, 0);
  });
});

/* -- Node EventEmitter adapter (server-side) -- */

describe('event-bus adapter -- nodeEventBus', () => {
  let bus;

  beforeEach(() => {
    bus = createNodeEventBus();
  });

  test('satisfies the port contract', () => {
    assert.doesNotThrow(() => assertEventBusPort(bus));
  });

  test('listenerCount returns 0 for unknown event', () => {
    assert.equal(bus.listenerCount('unknown'), 0);
  });

  test('on + emit delivers event to handler', () => {
    let received = null;
    bus.on('test', (data) => {
      received = data;
    });
    bus.emit('test', 'hello');
    assert.equal(received, 'hello');
  });

  test('emit delivers to multiple handlers', () => {
    const calls = [];
    bus.on('multi', (v) => calls.push(`a:${v}`));
    bus.on('multi', (v) => calls.push(`b:${v}`));
    bus.emit('multi', 1);
    assert.deepEqual(calls, ['a:1', 'b:1']);
  });

  test('emit with multiple args', () => {
    let args = [];
    bus.on('args', (...a) => {
      args = a;
    });
    bus.emit('args', 1, 2, 3);
    assert.deepEqual(args, [1, 2, 3]);
  });

  test('off removes a handler', () => {
    let count = 0;
    const handler = () => {
      count++;
    };
    bus.on('evt', handler);
    bus.emit('evt');
    assert.equal(count, 1);
    bus.off('evt', handler);
    bus.emit('evt');
    assert.equal(count, 1);
  });

  test('off is silent for unknown event', () => {
    assert.doesNotThrow(() => bus.off('nope', () => {}));
  });

  test('listenerCount tracks handlers', () => {
    const h1 = () => {};
    const h2 = () => {};
    bus.on('count', h1);
    assert.equal(bus.listenerCount('count'), 1);
    bus.on('count', h2);
    assert.equal(bus.listenerCount('count'), 2);
    bus.off('count', h1);
    assert.equal(bus.listenerCount('count'), 1);
  });

  test('clear removes all listeners', () => {
    bus.on('a', () => {});
    bus.on('b', () => {});
    bus.clear();
    assert.equal(bus.listenerCount('a'), 0);
    assert.equal(bus.listenerCount('b'), 0);
  });

  test('emit for event with no listeners is silent', () => {
    assert.doesNotThrow(() => bus.emit('nobody'));
  });

  test('on throws for non-function handler', () => {
    assert.throws(() => bus.on('evt', 'not-a-function'), TypeError);
  });

  test('events are isolated between names', () => {
    let aCount = 0;
    let bCount = 0;
    bus.on('a', () => {
      aCount++;
    });
    bus.on('b', () => {
      bCount++;
    });
    bus.emit('a');
    assert.equal(aCount, 1);
    assert.equal(bCount, 0);
  });
});
