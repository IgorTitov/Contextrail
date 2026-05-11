<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the example-greeter hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx example-greeter
@public false
@edit careful -->

# example-greeter

A minimal bounded-context module demonstrating hexagonal architecture.

## Purpose

This module exists as a **teaching example** for the template. It shows the canonical folder structure, layer separation, and import rules that every real bounded context should follow.

Replace it with real domain logic when starting a project from this template.

## Structure

```
modules/example-greeter/
├── domain/
│   └── greeter.mjs        # Pure domain logic (no deps)
├── ports/
│   └── greeting-port.mjs  # Port contract + validator
├── adapters/
│   └── default-adapter.mjs # Concrete adapter
├── public-api.mjs          # Single cross-module entry point
└── README.md
```

## Hexagonal layers

| Layer | Folder | Rule |
|---|---|---|
| **Domain** | `domain/` | Pure functions, no imports from adapters or infrastructure |
| **Ports** | `ports/` | Contracts that adapters must satisfy — no implementations |
| **Adapters** | `adapters/` | Concrete implementations of port contracts |
| **Public API** | `public-api.mjs` | The only file other modules may import |

## Import rules

- **Cross-module** consumers import from `public-api.mjs` only.
- **Deep imports** into `domain/`, `ports/`, or `adapters/` from outside this module are forbidden.
- **Domain** never imports from adapters or infrastructure.
- **Ports** define what the domain needs, not how it is provided.

## Usage

```javascript
import { greet, assertGreetingPort, defaultGreetingAdapter } from './modules/example-greeter/public-api.mjs';

// Validate the adapter at startup
assertGreetingPort(defaultGreetingAdapter);

// Use the domain function with the adapter's template
const message = greet('World', defaultGreetingAdapter.getTemplate());
// → 'Hello, World!'
```

## Tests

- `tests/unit/example-greeter.test.mjs` — proves domain logic, port validation, and adapter compliance.
