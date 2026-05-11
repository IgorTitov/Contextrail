<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for starter/greeter-wiring/.
@sidecar README.md.header.md
@layer app | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# Greeter wiring example

Demonstrates how the **application layer** imports from and wires a bounded-context module.

## What this shows

1. Import from `public-api.mjs` only — never deep-import `domain/`, `ports/`, or `adapters/`.
2. Validate the adapter against the port contract at startup.
3. Return a simple function that the UI or CLI layer can call.

## Usage

```javascript
import { createGreeter } from './greeter-app.mjs';

const greetUser = createGreeter();          // uses the default adapter
console.log(greetUser('World'));            // → "Hello, World!"

// With a custom adapter:
const custom = createGreeter({ getTemplate: () => 'Hi, {name}.' });
console.log(custom('Alice'));               // → "Hi, Alice."
```

## Layer diagram

```
apps/starter/examples/greeter-wiring/
  └── greeter-app.mjs          ← application layer (this example)
        │
        └── imports from ───→ modules/example-greeter/public-api.mjs
                                  ├── domain/greeter.mjs       (pure logic)
                                  ├── ports/greeting-port.mjs  (contract)
                                  └── adapters/default-adapter.mjs
```

## Tests

- [tests/unit/greeter-wiring.test.mjs](../../../../tests/unit/greeter-wiring.test.mjs)
