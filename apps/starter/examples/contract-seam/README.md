<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Document the optional contract-first browser module seam pattern with usage guidance.
@sidecar README.md.header.md
@layer app | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# Contract-first browser module seam

This folder contains an **optional advanced pattern** for browser modules where the adapter implementation is likely to churn.

## The pattern

A contract file owns the stable public API. The real implementation is injected at runtime via `_setImpl()`. Callers bind to the contract, never directly to an implementation.

```
notifications_contract.mjs    <-- stable facade (callers import this)
        |
        +-- _setImpl(domNotifier)      <-- app init wires real impl
        +-- _setImpl(memoryNotifier)   <-- tests wire a test double
```

### Contract file

```js
// notifications_contract.mjs
let _impl = null;

export function _setImpl(impl) { _impl = impl; }
export function _resetImpl()   { _impl = null; }

export function notify(message, level = 'info') {
  if (!_impl) throw new Error('not wired');
  return _impl.notify(message, level);
}
```

### App init

```js
// app.js — wires the real implementation once
import { _setImpl } from './notifications_contract.mjs';
import { domNotifier } from './notifications-dom.mjs';

_setImpl(domNotifier);
```

### Test code

```js
// test — wires a test double
import { _setImpl, _resetImpl, notify } from './notifications_contract.mjs';

const log = [];
_setImpl({ notify(msg, lvl) { log.push({ msg, lvl }); } });

notify('hello', 'info');
assert.equal(log.length, 1);

_resetImpl(); // teardown
```

## When to use

- Browser modules with volatile adapter code (DOM manipulation, third-party API wrappers).
- Modules that need isolated testing without DOM, network, or real browser APIs.

## When NOT to use

- Simple, stable modules where direct imports are already clear.
- One-off helpers that will never need implementation swaps.
- Everywhere by default — the indirection is only justified when implementation churn is real.

## Files

- `notifications_contract.mjs` — the example contract facade.
- Unit proof: `tests/unit/contract-seam-example.test.mjs`.
