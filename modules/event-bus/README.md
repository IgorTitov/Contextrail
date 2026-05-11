<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the event-bus hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx event-bus
@public false
@edit careful -->

<!--
SpecRefs: TPL-043
-->

# event-bus

Typed, synchronous, in-process event bus following hexagonal architecture.

## Port contract

| Method            | Signature                                    | Description                        |
| ----------------- | -------------------------------------------- | ---------------------------------- |
| `on`              | `(event: string, handler: Function) => void` | Subscribe to an event              |
| `off`             | `(event: string, handler: Function) => void` | Unsubscribe from an event          |
| `emit`            | `(event: string, ...args: any[]) => void`    | Emit an event to all handlers      |
| `listenerCount`   | `(event: string) => number`                  | Count listeners for an event       |
| `clear`           | `() => void`                                 | Remove all listeners               |

## Adapters

| Adapter                | Module                                   | Description                                                 |
| ---------------------- | ---------------------------------------- | ----------------------------------------------------------- |
| `createMemoryEventBus` | `adapters/memory-event-bus.mjs`          | Default in-memory pub/sub                                   |
| `createNodeEventBus`   | `adapters/node-eventemitter-adapter.mjs` | Server-side Node.js EventEmitter adapter (isomorphic proof) |

## Usage

```js
import { createMemoryEventBus, assertEventBusPort } from './public-api.mjs';

const bus = createMemoryEventBus();
assertEventBusPort(bus); // runtime contract check

bus.on('user:login', (user) => console.log('logged in:', user.name));
bus.emit('user:login', { name: 'Alice' });
bus.off('user:login', handler);
```

## Type support

Every `.mjs` has a companion `.d.ts` sidecar for IDE autocompletion without a build step.

## Tests

- Unit: `tests/unit/event-bus.test.mjs` (19 tests)
- Contract: `tests/contract/event-bus-hex-contract.test.mjs` (4 tests)
