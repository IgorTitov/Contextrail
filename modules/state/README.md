<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the state hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx state
@public false
@edit careful -->

<!--
SpecRefs: TPL-043
-->

# state

Observable state management following hexagonal architecture.

## Port contract

| Method            | Signature                                          | Description                          |
| ----------------- | -------------------------------------------------- | ------------------------------------ |
| `getState`        | `() => T`                                          | Get current state (shallow copy)     |
| `setState`        | `(updater: T \| ((prev: T) => T)) => void`        | Set state directly or via function   |
| `subscribe`       | `(listener: (state: T) => void) => () => void`     | Subscribe; returns unsubscribe fn    |
| `subscriberCount` | `() => number`                                     | Count active subscribers             |

## Adapters

| Adapter                        | Module                                  | Description                                                  |
| ------------------------------ | --------------------------------------- | ------------------------------------------------------------ |
| `createMemoryStateAdapter`     | `adapters/memory-state-adapter.mjs`     | Default in-memory store                                      |
| `createPersistentStateAdapter` | `adapters/persistent-state-adapter.mjs` | Persists via StoragePort on change                           |
| `createSqliteStateAdapter`     | `adapters/sqlite-adapter.mjs`           | Server-side SQLite with driver injection (isomorphic proof)  |

## Usage

```js
import { createMemoryStateAdapter, assertStatePort } from './public-api.mjs';

const store = createMemoryStateAdapter({ count: 0 });
assertStatePort(store); // runtime contract check

const unsub = store.subscribe(state => console.log('count:', state.count));
store.setState(prev => ({ ...prev, count: prev.count + 1 }));
unsub();
```

### Persistent adapter

```js
import { createPersistentStateAdapter } from './public-api.mjs';
import { createMemoryAdapter } from '../user-preferences/public-api.mjs';

const storage = createMemoryAdapter();
const store = createPersistentStateAdapter({ count: 0 }, storage);
store.setState({ count: 10 }); // auto-saved to storage
```

## Type support

Every `.mjs` has a companion `.d.ts` sidecar for IDE autocompletion without a build step.

## Tests

- Unit: `tests/unit/state.test.mjs` (21 tests)
- Contract: `tests/contract/state-hex-contract.test.mjs` (4 tests)
